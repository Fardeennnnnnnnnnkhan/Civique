import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { IncidentStatus, UserRole } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT, requireRole } from '../middleware/auth';
import { incidentScope } from '../utils/scope';
import { logIncidentChange } from '../utils/audit';

const router = Router();
const managers = [UserRole.CITY_ADMIN, UserRole.COMMISSIONER, UserRole.SUPER_ADMIN];
const rowSchema = (row: any) => ({ externalId: typeof row.externalId === 'string' ? row.externalId.trim() : '', type: typeof row.type === 'string' ? row.type.trim().toUpperCase() : '', name: typeof row.name === 'string' ? row.name.trim() : '', latitude: Number(row.latitude), longitude: Number(row.longitude), condition: typeof row.condition === 'string' ? row.condition.toUpperCase() : 'UNKNOWN' });
function validateRows(rows: any[]) { return rows.map((raw, index) => { const row = rowSchema(raw); const errors: string[] = []; if (!row.externalId) errors.push('externalId is required'); if (!row.type) errors.push('type is required'); if (!row.name) errors.push('name is required'); if (!Number.isFinite(row.latitude) || row.latitude < -90 || row.latitude > 90) errors.push('latitude is invalid'); if (!Number.isFinite(row.longitude) || row.longitude < -180 || row.longitude > 180) errors.push('longitude is invalid'); return { index, row, errors }; }); }

router.get('/assets', async (req: Request, res: Response) => {
  try {
    const cityId = typeof req.query.cityId === 'string' ? req.query.cityId : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : undefined;
    const rows = await prisma.$queryRawUnsafe<any[]>('SELECT a.id,a.external_id "externalId",a.name,a.latitude,a.longitude,a.condition,a.lifecycle_state "lifecycleState",a.public,t.key "type",t.label "typeLabel" FROM civic_assets a JOIN asset_types t ON t.id=a.asset_type_id WHERE a.lifecycle_state<>\'RETIRED\' AND ($1::uuid IS NULL OR a.city_id=$1::uuid) AND ($2::text IS NULL OR t.key=$2) ORDER BY a.updated_at DESC LIMIT 500', cityId || null, type || null);
    return res.json({ success: true, data: { assets: rows.map((row) => row.public ? row : { ...row, latitude: null, longitude: null }) } });
  } catch { return res.status(503).json({ success: false, error: { code: 'ASSET_REGISTRY_UNAVAILABLE', message: 'Asset registry is temporarily unavailable.' } }); }
});

router.get('/assets/:id', async (req: Request, res: Response) => {
  const rows = await prisma.$queryRawUnsafe<any[]>('SELECT a.id,a.city_id "cityId",a.external_id "externalId",a.name,a.latitude,a.longitude,a.geometry,a.condition,a.lifecycle_state "lifecycleState",a.version,a.public,t.key "type",t.label "typeLabel" FROM civic_assets a JOIN asset_types t ON t.id=a.asset_type_id WHERE a.id=$1::uuid', req.params.id);
  if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found.' } });
  const links = await prisma.$queryRawUnsafe<any[]>('SELECT l.id,l.incident_id "incidentId",l.confidence,l.method,l.confirmed,l.created_at "createdAt" FROM asset_incident_links l WHERE l.asset_id=$1::uuid AND l.unlinked_at IS NULL ORDER BY l.created_at DESC', req.params.id);
  const maintenance = await prisma.$queryRawUnsafe<any[]>('SELECT id,event_type "eventType",notes,condition_after "conditionAfter",occurred_at "occurredAt" FROM asset_maintenance_events WHERE asset_id=$1::uuid ORDER BY occurred_at DESC LIMIT 100', req.params.id);
  const asset = rows[0]; if (!asset.public) { asset.latitude = null; asset.longitude = null; asset.geometry = null; }
  return res.json({ success: true, data: { asset, links, maintenance } });
});

router.get('/assets/:id/qr', authenticateJWT, requireRole(managers), async (req: AuthenticatedRequest, res: Response) => {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; externalId: string; name: string }>>('SELECT id,external_id "externalId",name FROM civic_assets WHERE id=$1::uuid', req.params.id);
  if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found.' } });
  return res.json({ success: true, data: { assetId: rows[0].id, externalId: rows[0].externalId, label: rows[0].name, payload: `civique://asset/${rows[0].id}` } });
});

router.post('/assets/imports', authenticateJWT, requireRole(managers), async (req: AuthenticatedRequest, res: Response) => {
  let cityId = typeof req.body?.cityId === 'string' ? req.body.cityId : null; const source = typeof req.body?.source === 'string' ? req.body.source.trim() : 'manual'; const format = typeof req.body?.format === 'string' ? req.body.format.toUpperCase() : 'JSON'; const rows = Array.isArray(req.body?.rows) ? req.body.rows : format === 'GEOJSON' && Array.isArray(req.body?.geojson?.features) ? req.body.geojson.features.map((feature: any) => ({ ...(feature.properties || {}), latitude: feature.geometry?.coordinates?.[1], longitude: feature.geometry?.coordinates?.[0] })) : [];
  if (!cityId) cityId = (await prisma.user.findUnique({ where: { id: req.user!.id }, select: { cityId: true } }))?.cityId || null;
  if (!cityId || !rows.length || !['CSV', 'GEOJSON', 'JSON'].includes(format)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A city-scoped account, format, and rows are required.' } });
  const validated = validateRows(rows); const errors = validated.flatMap((item) => item.errors.map((message) => ({ row: item.index + 1, message })));
  const checksum = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const existing = await prisma.$queryRawUnsafe<any[]>('SELECT id,status FROM asset_import_runs WHERE city_id=$1::uuid AND checksum=$2', cityId, checksum); if (existing[0]) return res.json({ success: true, data: { importRunId: existing[0].id, status: existing[0].status, idempotent: true } });
  const run = await prisma.$queryRawUnsafe<any[]>('INSERT INTO asset_import_runs (city_id,source,format,checksum,status,row_count,error_count,errors,created_by) VALUES ($1::uuid,$2,$3,$4,\'PREVIEW\',$5,$6,$7::jsonb,$8::uuid) RETURNING id,status,row_count,error_count', cityId, source, format, checksum, rows.length, errors.length, JSON.stringify(errors), req.user!.id);
  return res.status(201).json({ success: true, data: { importRun: run[0], checksum, validRows: validated.filter((item) => !item.errors.length).map((item) => item.row), errors } });
});

router.post('/assets/imports/:id/apply', authenticateJWT, requireRole(managers), async (req: AuthenticatedRequest, res: Response) => {
  try { const result = await prisma.$transaction(async (tx) => {
    const run = await tx.$queryRawUnsafe<any[]>('SELECT id,city_id "cityId",status,errors,row_count FROM asset_import_runs WHERE id=$1::uuid FOR UPDATE', req.params.id); if (!run[0]) throw Object.assign(new Error('Import run not found.'), { code: 'NOT_FOUND' }); if (run[0].status !== 'PREVIEW') throw Object.assign(new Error('Only preview imports can be applied.'), { code: 'INVALID_STATE' }); if (Array.isArray(run[0].errors) && run[0].errors.length) throw Object.assign(new Error('Fix import errors before applying.'), { code: 'VALIDATION_ERROR' });
    const rows = Array.isArray(req.body?.rows) ? validateRows(req.body.rows).filter((item) => !item.errors.length).map((item) => item.row) : []; if (!rows.length) throw Object.assign(new Error('Validated rows are required to apply this import.'), { code: 'VALIDATION_ERROR' });
    const created: string[] = [];
    for (const row of rows) { const type = await tx.$queryRawUnsafe<any[]>('INSERT INTO asset_types (city_id,key,label) VALUES ($1::uuid,$2,$3) ON CONFLICT (city_id,key) DO UPDATE SET label=EXCLUDED.label RETURNING id', run[0].cityId, row.type, row.type.replaceAll('_', ' ')); const asset = await tx.$queryRawUnsafe<any[]>('INSERT INTO civic_assets (city_id,asset_type_id,external_id,name,latitude,longitude,condition,import_run_id) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::uuid) ON CONFLICT (city_id,asset_type_id,external_id) DO UPDATE SET name=EXCLUDED.name,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,condition=EXCLUDED.condition,version=civic_assets.version+1,updated_at=NOW() RETURNING id', run[0].cityId, type[0].id, row.externalId, row.name, row.latitude, row.longitude, row.condition, run[0].id); created.push(asset[0].id); }
    await tx.$executeRawUnsafe('UPDATE asset_import_runs SET status=\'APPLIED\',created_asset_ids=$1::jsonb,applied_at=NOW() WHERE id=$2::uuid', JSON.stringify(created), req.params.id); return { importRunId: req.params.id, created: created.length };
  }); return res.json({ success: true, data: result }); } catch (error: any) { return res.status(error.code === 'NOT_FOUND' ? 404 : error.code === 'VALIDATION_ERROR' || error.code === 'INVALID_STATE' ? 409 : 500).json({ success: false, error: { code: error.code || 'ASSET_IMPORT_FAILED', message: error.message } }); }
});

router.post('/assets/imports/:id/rollback', authenticateJWT, requireRole(managers), async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.$transaction(async (tx) => { const run = await tx.$queryRawUnsafe<any[]>('SELECT id,status FROM asset_import_runs WHERE id=$1::uuid FOR UPDATE', req.params.id); if (!run[0]) return null; if (run[0].status !== 'APPLIED') throw Object.assign(new Error('Only applied imports can be rolled back.'), { code: 'INVALID_STATE' }); await tx.$executeRaw`DELETE FROM civic_assets WHERE import_run_id=${req.params.id}::uuid AND version=1`; await tx.$executeRaw`UPDATE asset_import_runs SET status='ROLLED_BACK',rolled_back_at=NOW() WHERE id=${req.params.id}::uuid`; return run[0]; });
  if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Import run not found.' } }); return res.json({ success: true, data: { importRunId: req.params.id, status: 'ROLLED_BACK' } });
});

router.post('/assets/:id/maintenance-events', authenticateJWT, requireRole(managers), async (req: AuthenticatedRequest, res: Response) => {
  const eventType = typeof req.body?.eventType === 'string' ? req.body.eventType.trim().toUpperCase() : ''; const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : ''; if (!eventType || notes.length < 5) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Event type and notes are required.' } });
  const rows = await prisma.$queryRawUnsafe<any[]>('INSERT INTO asset_maintenance_events (asset_id,event_type,notes,condition_after,performed_by,occurred_at) VALUES ($1::uuid,$2,$3,$4,$5::uuid,COALESCE($6::timestamp,NOW())) RETURNING id', req.params.id, eventType, notes, req.body.conditionAfter || null, req.user!.id, req.body.occurredAt || null); if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found.' } }); await prisma.$executeRawUnsafe('UPDATE civic_assets SET condition=COALESCE($1,condition),version=version+1,updated_at=NOW() WHERE id=$2::uuid', req.body.conditionAfter || null, req.params.id); return res.status(201).json({ success: true, data: { eventId: rows[0].id } });
});

router.post('/incidents/:id/asset-links', authenticateJWT, requireRole(managers), async (req: AuthenticatedRequest, res: Response) => {
  const assetId = typeof req.body?.assetId === 'string' ? req.body.assetId : ''; if (!assetId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Asset ID is required.' } });
  const incident = await prisma.incident.findFirst({ where: { id: req.params.id, ...incidentScope(await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } })) }, select: { id: true } }); if (!incident) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident is outside your scope.' } });
  const rows = await prisma.$queryRawUnsafe<any[]>('INSERT INTO asset_incident_links (asset_id,incident_id,confidence,method,confirmed,created_by) VALUES ($1::uuid,$2::uuid,$3,$4,true,$5::uuid) ON CONFLICT (asset_id,incident_id) WHERE unlinked_at IS NULL DO UPDATE SET confirmed=true,confidence=EXCLUDED.confidence RETURNING id', assetId, incident.id, Number(req.body.confidence || 1), req.body.method || 'HUMAN_CONFIRMED', req.user!.id); if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found.' } }); await prisma.$transaction(async (tx) => { await logIncidentChange(tx, incident.id, 'ASSET_LINK_CONFIRMED', req.user!.id, { assetId, method: req.body.method || 'HUMAN_CONFIRMED' }); }); return res.status(201).json({ success: true, data: { linkId: rows[0].id } });
});

export default router;
