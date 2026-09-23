import { Router, Request, Response } from 'express';
import { Prisma, UserRole, GeographyImportStatus } from '@prisma/client';
import { prisma } from '../db';
import { resolveLocationToWard } from '../utils/geofence';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { canonicalChecksum, validateWardInputs } from '../services/geographyImport';

const router = Router();

// GET /api/v1/geography/states
// Lists states along with cities, zones, and wards
router.get('/states', async (req: Request, res: Response) => {
  try {
    const states = await prisma.state.findMany({
      include: {
        cities: {
          include: {
            zones: {
              include: {
                wards: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: { states },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Error retrieving states hierarchy',
      },
    });
  }
});

// GET /api/v1/geography/cities
// Lists all active cities along with zones and wards
router.get('/cities', async (req: Request, res: Response) => {
  try {
    const requestedCityId = typeof req.query.cityId === 'string' ? req.query.cityId : undefined;
    const cities = await prisma.city.findMany({
      where: { active: true, ...(requestedCityId ? { id: requestedCityId } : {}) },
      include: {
        state: true,
        zones: {
          include: {
            wards: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: { cities },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Error retrieving cities',
      },
    });
  }
});

// GET /api/v1/geography/datasets — authorized dataset history, scoped to the actor's city.
router.get('/datasets', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.COMMISSIONER, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true, cityId: true } });
  const requestedCityId = typeof req.query.cityId === 'string' ? req.query.cityId : undefined;
  if (actor?.role !== UserRole.SUPER_ADMIN && requestedCityId && requestedCityId !== actor?.cityId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Geography datasets are outside your city scope.' } });
  const datasets = await prisma.geographyDataset.findMany({
    where: actor?.role === UserRole.SUPER_ADMIN && requestedCityId ? { wards: { some: { zone: { cityId: requestedCityId } } } } : actor?.role === UserRole.SUPER_ADMIN ? undefined : { wards: { some: { zone: { cityId: actor?.cityId || '' } } } },
    select: { id: true, source: true, version: true, checksum: true, effectiveDate: true, status: true, importedAt: true, createdAt: true, _count: { select: { wards: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: { datasets } });
});

// POST /api/v1/geography/import — idempotent, checksum-verified ward boundary import.
router.post('/import', authenticateJWT, requireRole([UserRole.CITY_ADMIN, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as { cityId?: unknown; source?: unknown; version?: unknown; checksum?: unknown; effectiveDate?: unknown; wards?: unknown };
  if (typeof body.cityId !== 'string' || typeof body.source !== 'string' || typeof body.version !== 'string' || !Array.isArray(body.wards)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'cityId, source, version, and wards are required.' } });
  const cityId = body.cityId;
  const source = body.source;
  const version = body.version;
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true, cityId: true } });
  if (actor?.role !== UserRole.SUPER_ADMIN && actor?.cityId !== cityId) return res.status(403).json({ success: false, error: { code: 'OUT_OF_SCOPE', message: 'Boundary imports must remain within your city scope.' } });
  const city = await prisma.city.findUnique({ where: { id: cityId }, select: { id: true, active: true } });
  if (!city || !city.active) return res.status(404).json({ success: false, error: { code: 'CITY_NOT_FOUND', message: 'The target city is not active.' } });
  const wards = body.wards as Array<{ sourceCode: string; name: string; zoneName: string; boundary: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } }>;
  const errors = validateWardInputs(wards);
  if (errors.length) return res.status(400).json({ success: false, error: { code: 'INVALID_GEOGRAPHY', message: 'Boundary dataset validation failed.', details: errors } });
  const computedChecksum = canonicalChecksum({ cityId, source, version, effectiveDate: body.effectiveDate || null, wards });
  if (body.checksum !== undefined && body.checksum !== computedChecksum) return res.status(409).json({ success: false, error: { code: 'CHECKSUM_MISMATCH', message: 'The supplied checksum does not match the dataset payload.', computedChecksum } });
  const existing = await prisma.geographyDataset.findUnique({ where: { source_version: { source, version } }, select: { id: true, checksum: true, status: true, _count: { select: { wards: true } } } });
  if (existing) {
    if (existing.checksum !== computedChecksum) return res.status(409).json({ success: false, error: { code: 'DATASET_VERSION_CONFLICT', message: 'This source/version already exists with a different checksum.' } });
    return res.json({ success: true, data: { idempotent: true, dataset: existing } });
  }
  const dataset = await prisma.$transaction(async (tx) => {
    const created = await tx.geographyDataset.create({ data: { source, version, checksum: computedChecksum, effectiveDate: body.effectiveDate ? new Date(String(body.effectiveDate)) : null, status: GeographyImportStatus.VALIDATING } });
    for (const ward of wards) {
      const zone = await tx.zone.upsert({ where: { name_cityId: { name: ward.zoneName.trim(), cityId } }, update: {}, create: { name: ward.zoneName.trim(), cityId } });
      await tx.ward.upsert({ where: { idempotencyKey: `${created.id}:${ward.sourceCode.trim()}` }, update: { name: ward.name.trim(), zoneId: zone.id, boundary: ward.boundary as Prisma.InputJsonValue, sourceCode: ward.sourceCode.trim(), datasetId: created.id }, create: { name: ward.name.trim(), zoneId: zone.id, boundary: ward.boundary as Prisma.InputJsonValue, sourceCode: ward.sourceCode.trim(), datasetId: created.id, idempotencyKey: `${created.id}:${ward.sourceCode.trim()}` } });
    }
    return tx.geographyDataset.update({ where: { id: created.id }, data: { status: GeographyImportStatus.ACTIVE, importedAt: new Date() }, select: { id: true, source: true, version: true, checksum: true, status: true, importedAt: true, _count: { select: { wards: true } } } });
  });
  return res.status(201).json({ success: true, data: { idempotent: false, dataset } });
});

// GET /api/v1/geography/resolve
// Resolves query parameters lat/lng to a Ward, Zone, City, and State
router.get('/resolve', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Query parameters lat/lng must be finite coordinates (lat -90..90, lng -180..180).',
      },
    });
  }

  try {
    const matchedGeography = await resolveLocationToWard(lat, lng);

    if (!matchedGeography) {
      return res.status(404).json({
        success: false,
        error: {
        code: 'OUT_OF_SERVICE_AREA',
        message: 'Specified coordinates are outside Civique service boundaries.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: matchedGeography,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Error resolving location to geography',
      },
    });
  }
});

// GET /api/v1/geography/departments
// Lists all departments, optionally filtered by city
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const { cityId } = req.query;
    const where: any = {};
    if (cityId && typeof cityId === 'string') {
      where.cityId = cityId;
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: { departments },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Error retrieving departments',
      },
    });
  }
});

// GET /api/v1/geography/wards
// Lists all municipal wards
router.get('/wards', async (_req: Request, res: Response) => {
  try {
    const wards = await prisma.ward.findMany({
      select: {
        id: true,
        name: true,
        sourceCode: true,
        zoneId: true,
        zone: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: { wards },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Error retrieving wards list',
      },
    });
  }
});

export default router;
