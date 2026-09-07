import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { resolveLocationToWard } from '../utils/geofence';

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
    const cities = await prisma.city.findMany({
      where: { active: true },
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

export default router;
