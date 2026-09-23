import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';
import { IncidentStatus, Prisma, UserRole } from '@prisma/client';
import { createSignedMediaUrl, supabase } from '../utils/supabase';
import { uploadMiddleware } from '../middleware/upload';
import { resolveLocationToWard } from '../utils/geofence';
import { AuthenticatedRequest, authenticateJWT } from '../middleware/auth';
import { findDuplicateIncident } from '../utils/duplicate';
import { broadcastIncident } from '../utils/socket';
import { logIncidentChange } from '../utils/audit';
import { classifyReportImage } from '../utils/ml';
import { AI_INTAKE_SCHEMA_VERSION, buildAdaptiveQuestions, evaluateModelCanary, getActiveAiModel, normalizeAiQuestions, privacyReview } from '../services/aiIntakePolicy';
import crypto from 'crypto';
import { normalizeImageBuffer, validateImageBuffer } from '../middleware/upload';
import { previewRouting, recordRoutingDecision } from '../services/routing';
import { enqueueJob } from '../jobs/queue';
import { incidentScope } from '../utils/scope';
import { assertTriageAccess, loadPolicyActor } from '../services/policies';
import { duplicateDistanceMeters, scoreDuplicateCandidate } from '../services/duplicateIntelligence';
import { assignLeastLoadedWardOfficer } from '../services/triageAssignment';
import { emitLifecycle } from '../services/workflowEvents';
import { isWorkflowSchemaCompatible } from '../services/schemaCompatibility';
import { CIVIQUE_TAXONOMY, ensureTaxonomyCategory } from '../services/taxonomy';

const router = Router();

// Rate limiter: Max 30 reports per hour from a single IP
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many report submissions from this IP. Please try again after an hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const draftLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// POST /api/v1/reports
// Handles new report submission (Image buffer is uploaded to Supabase Bucket Storage)
router.post(
  '/',
  reportLimiter,
  authenticateJWT,
  requireCitizen,
  async (_req, res, next) => (await isWorkflowSchemaCompatible().catch(() => false)) ? next() : res.status(503).json({ success: false, error: { code: 'SCHEMA_MIGRATION_REQUIRED', message: 'Civique reporting is temporarily unavailable because required database migrations are missing.' } }),
  (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err.message === 'LIMIT_UNSUPPORTED_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Invalid file format. Only JPEG, PNG and WEBP images are allowed.',
            },
          });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Image size exceeds the 5MB limit.',
            },
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'Error parsing multipart request',
          },
        });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'].trim() : undefined;
    const { title, description, category, citizenName, citizenPhone, landmark, severity, duplicateIncidentId, consentVersion } = req.body;
    const lat = parseFloat(req.body.latitude);
    const lng = parseFloat(req.body.longitude);

    // 1. Inputs validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'An issue photograph is required to submit a report.',
        },
      });
    }
    if (idempotencyKey) {
      const prior = await prisma.report.findUnique({ where: { idempotencyKey }, include: { incident: { select: { id: true, publicTrackingId: true, status: true } } } });
      if (prior && prior.submitterRef !== req.user!.id) return res.status(409).json({ success: false, error: { code: 'IDEMPOTENCY_KEY_CONFLICT', message: 'This idempotency key belongs to another submission.' } });
      if (prior) return res.status(200).json({ success: true, data: { reportId: prior.id, incidentId: prior.incident?.id, trackingId: prior.incident?.publicTrackingId, state: prior.incident?.status, idempotentReplay: true } });
    }

    let validatedImage: Awaited<ReturnType<typeof normalizeImageBuffer>>;
    try { validatedImage = await normalizeImageBuffer(req.file.buffer, req.file.mimetype); }
    catch { return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE_CONTENT', message: 'The image is corrupt, unsupported, animated, too small, or exceeds safe pixel limits.' } }); }

    if (isNaN(lat) || isNaN(lng) || typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 120 || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 2000 || typeof category !== 'string' || !category.trim() || typeof consentVersion !== 'string' || !consentVersion.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A 5-120 character title, 10-2000 character description, taxonomy category, consent version, latitude, and longitude are required.',
        },
      });
    }
    if (consentVersion !== 'civique-report-consent-v1') return res.status(400).json({ success: false, error: { code: 'CONSENT_VERSION_INVALID', message: 'The current report evidence consent must be accepted.' } });
    const taxonomyCategory = category.trim().toUpperCase() === 'OTHERS' ? 'OTHER' : category.trim().toUpperCase();
    const taxonomy = CIVIQUE_TAXONOMY[taxonomyCategory] ? await ensureTaxonomyCategory(prisma, taxonomyCategory) : null;
    if (!taxonomy?.active) return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Select an active Civique taxonomy category.' } });
    for (const value of [req.body.deviceTimestamp, req.body.gpsTimestamp].filter(Boolean)) {
      const timestamp = new Date(String(value));
      if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > Date.now() + 5 * 60_000 || timestamp.getTime() < Date.now() - 30 * 86400000) return res.status(400).json({ success: false, error: { code: 'INVALID_CAPTURE_TIME', message: 'Capture metadata is outside the accepted time window.' } });
    }

    // Citizen input is persisted first. Final M13 classification runs durably after commit.
    const suggestedCategory = taxonomyCategory;
    const confirmedCategory = taxonomyCategory;
    const categoryConfidence: number | null = null;

    const uploadedPaths: string[] = [];
    let uploadedPath = '';

    try {
      // 2. Upload photo buffer to Supabase Storage Bucket ("report-images")
      const originalExt = validatedImage.original.mimeType === 'image/png' ? 'png' : validatedImage.original.mimeType === 'image/webp' ? 'webp' : 'jpg';
      const objectStem = crypto.randomBytes(24).toString('hex');
      const originalPath = `reports/original/${objectStem}.${originalExt}`;
      uploadedPath = `reports/normalized/${objectStem}.webp`;

      const [originalUpload, derivativeUpload] = await Promise.all([
        supabase.storage.from('report-images').upload(originalPath, req.file.buffer, {
          contentType: validatedImage.original.mimeType,
          upsert: false,
        }),
        supabase.storage.from('report-images').upload(uploadedPath, validatedImage.buffer, {
          contentType: validatedImage.mimeType,
          upsert: false,
        }),
      ]);
      const { error: originalUploadError } = originalUpload;
      if (!originalUploadError) uploadedPaths.push(originalPath);
      if (!derivativeUpload.error) uploadedPaths.push(uploadedPath);
      if (originalUploadError) throw new Error(`Supabase Storage original upload failed: ${originalUploadError.message}`);
      const { error: derivativeUploadError } = derivativeUpload;
      if (derivativeUploadError) throw new Error(`Supabase Storage derivative upload failed: ${derivativeUploadError.message}`);
      uploadedPaths.push(uploadedPath);

      // Keep originals private. Protected consumers must request a signed URL.
      const photoUrl = uploadedPath;

      // Resolve coordinates against Indore geofence boundaries (outside transaction to avoid timeout)
      const resolvedGeo = await resolveLocationToWard(lat, lng);
      if (!resolvedGeo) {
        throw new Error('GEOGRAPHY_NOT_FOUND');
      }

      // 3. Database operations inside transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Proximity duplicate check: Find active incidents of the same category in the database
        let matchedIncident = await findDuplicateIncident(tx, confirmedCategory, lat, lng, 100);
        if (duplicateIncidentId) {
          const requested = await tx.incident.findUnique({ where: { id: String(duplicateIncidentId) } });
          if (!requested || [ 'RESOLVED', 'REJECTED', 'DUPLICATE' ].includes(requested.status)) throw new Error('INVALID_DUPLICATE_SELECTION');
          matchedIncident = requested;
        }

        let incidentId: string;
        let trackingId: string;
        let triageAssignment: { officerId: string | null; reason: string } | null = null;

        if (matchedIncident) {
          // Link report to existing incident, incrementing report count and appending photo reference
          incidentId = matchedIncident.id;
          trackingId = matchedIncident.publicTrackingId;

          await tx.incident.update({
            where: { id: incidentId },
            data: {
              reportCount: { increment: 1 },
              beforePhotoUrls: {
                push: photoUrl,
              },
            },
          });
        } else {
          // Create a new Incident record
          const cityPrefix = resolvedGeo.cityName.substring(0, 3).toUpperCase();
          const randomCode = Math.floor(1000 + Math.random() * 9000);
          trackingId = `CIV-${cityPrefix}-${Date.now().toString().slice(-6)}-${randomCode}`;

          // Citizen-controlled severity is evidence input only and cannot directly set final priority.
          const priority = 'MEDIUM' as const;

          // Resolve an active, versioned routing rule. Legacy category arrays are fallback only.
          const routing = await previewRouting(tx, { category: confirmedCategory, cityId: resolvedGeo.cityId, wardId: resolvedGeo.wardId });
          let department = routing.department;
          if (!department) department = await tx.department.findFirst({ where: { cityId: resolvedGeo.cityId, name: 'General Administration' } });

          // Calculate SLA deadline if department matches
          let slaDeadline: Date | null = null;
          if (department) {
            const now = new Date();
            slaDeadline = new Date(now.getTime() + department.defaultSlaHours * 60 * 60 * 1000);
          }

          const newIncident = await tx.incident.create({
            data: {
              publicTrackingId: trackingId,
              category: confirmedCategory,
              status: IncidentStatus.AI_REVIEW,
              priority,
              latitude: lat,
              longitude: lng,
              cityId: resolvedGeo.cityId,
              zoneId: resolvedGeo.zoneId,
              wardId: resolvedGeo.wardId,
              departmentId: department ? department.id : null,
              slaDeadline,
              reportCount: 1,
              beforePhotoUrls: [photoUrl],
            },
          });
          incidentId = newIncident.id;
          await recordRoutingDecision(tx, { incidentId, category: confirmedCategory, cityId: resolvedGeo.cityId, wardId: resolvedGeo.wardId, previousDepartmentId: null }, routing);
          const triage = await assignLeastLoadedWardOfficer(tx, { incidentId, wardId: resolvedGeo.wardId, assignedById: req.user!.id });
          triageAssignment = triage;
          await emitLifecycle(tx, { incidentId, eventType: triage.officerId ? 'WARD_OWNER_ASSIGNED' : 'WARD_OWNER_UNASSIGNED', state: IncidentStatus.AI_REVIEW, actorRole: UserRole.CITIZEN, actorLabel: 'Civique routing', metadata: { officerId: triage.officerId, reason: triage.reason }, correlationId: `triage-owner:${incidentId}` });

          // Log incident creation in the audit trail
          await logIncidentChange(
            tx,
            incidentId,
            'INCIDENT_CREATED',
            req.user?.email || 'ANONYMOUS',
            {
              category: confirmedCategory,
              priority,
              wardId: resolvedGeo.wardId,
              departmentId: department ? department.id : null,
              aiStatus: 'PENDING',
              citizenCategory: category,
            }
          );
        }

        // Create Report record linked to incident
        const report = await tx.report.create({
          data: {
            incidentId,
            submitterRef: req.user!.id,
            photoUrl,
            title: title.trim(),
            description: description.trim(),
            categorySuggested: suggestedCategory,
            categoryConfirmed: confirmedCategory,
            categoryConfidence: categoryConfidence !== null ? categoryConfidence : null,
            latitude: lat,
            longitude: lng,
            captureMethod: req.body.captureMethod === 'CAMERA_LIVE' ? 'CAMERA_LIVE' : 'UPLOAD',
            deviceTimestamp: req.body.deviceTimestamp ? new Date(req.body.deviceTimestamp) : null,
            gpsTimestamp: req.body.gpsTimestamp ? new Date(req.body.gpsTimestamp) : null,
            citizenName: citizenName || null,
            citizenPhone: citizenPhone || null,
            landmark: landmark || null,
            severity: severity || 'MEDIUM',
            consentVersion: consentVersion.trim(),
            consentedAt: new Date(),
            idempotencyKey,
            submissionStatus: 'RECEIVED',
          },
        });
        await (tx as any).aiAnalysis.create({ data: { reportId: report.id, provider: 'pending', model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b', promptVersion: 'm13-v2', schemaVersion: 'm13-v2', category: null, confidence: null, result: { citizenCategory: category }, status: 'PENDING' } });
        const originalAsset = await tx.mediaAsset.create({ data: { reportId: report.id, storagePath: originalPath, sha256: validatedImage.original.sha256, mimeType: validatedImage.original.mimeType, byteSize: req.file!.size, width: validatedImage.original.width, height: validatedImage.original.height, isPrivate: true, retentionUntil: new Date(Date.now() + 365 * 86400000) } });
        await tx.$executeRaw`INSERT INTO media_assets (report_id,storage_path,sha256,mime_type,byte_size,width,height,kind,source_asset_id,normalized_at,is_private,retention_until) VALUES (${report.id}::uuid,${uploadedPath},${validatedImage.sha256},${validatedImage.mimeType},${validatedImage.buffer.length},${validatedImage.width ?? null},${validatedImage.height ?? null},'NORMALIZED'::"MediaAssetKind",${originalAsset.id}::uuid,NOW(),true,${new Date(Date.now() + 365 * 86400000)})`;
        await enqueueJob(tx, { type: 'REPORT_CLASSIFICATION', payload: { reportId: report.id }, idempotencyKey: `report-classification:${report.id}`, maxAttempts: 6 });
        await emitLifecycle(tx, { incidentId, reportId: report.id, eventType: 'REPORT_RECEIVED', state: IncidentStatus.AI_REVIEW, actorRole: UserRole.CITIZEN, actorLabel: 'Citizen', metadata: { trackingId, wardId: resolvedGeo.wardId }, correlationId: `report-received:${report.id}` });

        return { report, trackingId, matched: !!matchedIncident, triageAssignment };
      }, {
        // Report persistence is intentionally synchronous, but all expensive
        // media/AI work happens before or after this block. Keep enough room
        // for a cold Supabase/Postgres connection without allowing an
        // interactive transaction to die while its final job upsert runs.
        maxWait: 10000,
        timeout: 45000,
      });

      // Fetch full incident details for socket broadcasting
      try {
        if (result.report.incidentId) {
          const fullIncident = await prisma.incident.findUnique({
            where: { id: result.report.incidentId },
            include: {
              ward: true,
              reports: true,
            },
          });
          if (fullIncident) {
            if (result.matched) {
              broadcastIncident('incident:updated', fullIncident);
            } else {
              broadcastIncident('incident:created', fullIncident);
            }
          }
        }
      } catch (broadcastErr) {
        console.error('Failed to broadcast incident socket event:', broadcastErr);
      }

      return res.status(201).json({
        success: true,
        data: {
          trackingId: result.trackingId,
          reportId: result.report.id,
          incidentId: result.report.incidentId,
          state: IncidentStatus.AI_REVIEW,
          ward: { id: resolvedGeo.wardId, name: resolvedGeo.wardName },
          assignmentStatus: result.matched ? 'EXISTING_INCIDENT' : result.triageAssignment?.officerId ? 'WARD_OWNER_ASSIGNED' : 'WARD_OWNER_UNASSIGNED',
          isLinkedToDuplicate: result.matched,
        },
      });
    } catch (error: any) {
      console.error('Report submission failed:', error);

      // Clean up storage artifact if DB write or resolution fails
      if (uploadedPaths.length) {
        try {
          await supabase.storage.from('report-images').remove(uploadedPaths);
        } catch (cleanupErr) {
          console.error('Failed to cleanup uploaded file from Supabase:', cleanupErr);
        }
      }

      if (error.message === 'GEOGRAPHY_NOT_FOUND') {
        return res.status(422).json({
          success: false,
          error: {
            code: 'GEOGRAPHY_OUT_OF_BOUNDS',
            message: 'Report coordinate boundaries are outside our serviced municipal limits.',
          },
        });
      }
      if (error.message === 'INVALID_DUPLICATE_SELECTION') return res.status(400).json({ success: false, error: { code: 'INVALID_DUPLICATE_SELECTION', message: 'The selected duplicate incident is unavailable.' } });

      // Never send Prisma's transaction internals to the citizen. A timeout
      // is retryable and the caller can safely retry with the same
      // Idempotency-Key.
      if (error?.code === 'P2028' || /Transaction API error|Transaction not found/i.test(String(error?.message || ''))) {
        return res.status(503).json({ success: false, error: { code: 'REPORT_PERSISTENCE_TIMEOUT', message: 'The report could not be saved in time. Please retry with the same submission.' } });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'An unexpected error occurred during report submission.',
        },
      });
    }
  }
);

// POST /api/v1/reports/classify-draft
// Proxy route to classify report images on the fly during upload
router.post(
  '/classify-draft',
  draftLimiter,
  authenticateJWT,
  requireCitizen,
  (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err.message === 'LIMIT_UNSUPPORTED_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Invalid file format. Only JPEG, PNG and WEBP images are allowed.',
            },
          });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Image size exceeds the 5MB limit.',
            },
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message || 'Error parsing multipart request',
          },
        });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'An issue photograph is required to run classification.',
        },
      });
    }

    let draftImage: ReturnType<typeof validateImageBuffer>;
    try { draftImage = validateImageBuffer(req.file.buffer, req.file.mimetype); }
    catch { return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE_CONTENT', message: 'Image content does not match its declared type.' } }); }

    const { description } = req.body;
    let citizenAnswers: Record<string, string> = {};
    if (typeof req.body.citizenAnswers === 'string') {
      try {
        const parsed = JSON.parse(req.body.citizenAnswers);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          citizenAnswers = Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string').slice(0, 10)) as Record<string, string>;
        }
      } catch {
        return res.status(400).json({ success: false, error: { code: 'INVALID_AI_ANSWERS', message: 'The AI follow-up answers are invalid. Please answer the questions again.' } });
      }
    }

    try {
      const mlResult = await classifyReportImage(
        req.file.buffer,
        req.file.originalname || 'report.jpg',
        draftImage.mimeType,
        description || '',
        citizenAnswers
      );

      return res.json({
        success: true,
        data: {
          categorySuggested: mlResult.category,
          confidence: mlResult.confidence,
          label: mlResult.label || null,
          modelVersion: mlResult.modelVersion || 'civique-civic-v1',
          topPredictions: mlResult.topPredictions || [],
          summary: mlResult.summary || null,
          issue: mlResult.issue || null,
          authenticity: mlResult.authenticity || { verdict: 'INCONCLUSIVE', confidence: 0, signals: [], limitations: ['No Groq authenticity result was available.'] },
          decision: mlResult.decision || (mlResult.category === 'NOT_A_CIVIC_ISSUE' ? 'REJECT' : 'REVIEW_REQUIRED'),
          civicRelevance: mlResult.civicRelevance || { status: 'AMBIGUOUS', confidence: 0, issue_present: false, affected_domain: 'UNKNOWN', reason: 'No civic relevance result was available.' },
          review: mlResult.review || 'HUMAN_REVIEW',
          aiStatus: mlResult.aiStatus || (mlResult.success ? 'COMPLETED' : 'PENDING'),
          providerError: mlResult.providerError || null,
          model: getActiveAiModel(),
          schemaVersion: AI_INTAKE_SCHEMA_VERSION,
          advisoryOnly: true,
          adaptiveQuestions: normalizeAiQuestions(mlResult.followUpQuestions, mlResult.decision || 'REVIEW_REQUIRED').length > 0
            ? normalizeAiQuestions(mlResult.followUpQuestions, mlResult.decision || 'REVIEW_REQUIRED')
            : buildAdaptiveQuestions({
            category: mlResult.category,
            severity: typeof mlResult.issue?.severity === 'string' ? mlResult.issue.severity : null,
            evidenceQuality: typeof mlResult.issue?.evidence_quality === 'string' ? mlResult.issue.evidence_quality : null,
            authenticityVerdict: mlResult.authenticity?.verdict || null,
            decision: mlResult.decision || null,
          }),
          privacyReview: privacyReview([
            ...(mlResult.authenticity?.signals || []),
            ...(Array.isArray(mlResult.issue?.visual_observations) ? mlResult.issue.visual_observations.filter((value): value is string => typeof value === 'string') : []),
          ]),
        }
      });
    } catch (error: any) {
      console.error('[Reports Route] Draft classification failed:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Failed to auto-classify image.',
        }
      });
    }
  }
);


// GET /api/v1/reports
// Fetches reports (Scoped to CITIZEN to view their own, and official roles to view all)
router.get('/duplicate-candidates/:reportId', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await loadPolicyActor(prisma, req.user!.id);
    if (actor.role === UserRole.CITIZEN) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Duplicate review is restricted to municipal operators.' } });
    const report = await prisma.report.findFirst({ where: { id: req.params.reportId, incident: { is: incidentScope(actor) } }, include: { incident: true } });
    if (!report?.incident) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report was not found in your operational scope.' } });
    const candidates = await prisma.incident.findMany({ where: { id: { not: report.incident.id }, cityId: report.incident.cityId, category: report.incident.category, status: { notIn: ['RESOLVED', 'REJECTED', 'DUPLICATE'] } }, take: 100, orderBy: { createdAt: 'desc' } });
    const scored = candidates.map((candidate) => {
      const distanceMeters = duplicateDistanceMeters(report.incident!, candidate);
      return { candidate, ...scoreDuplicateCandidate({ categoryMatch: report.incident!.category === candidate.category, distanceMeters, temporalDays: Math.abs(candidate.createdAt.getTime() - report.createdAt.getTime()) / 86400000 }) };
    }).filter((candidate) => candidate.score >= 0.35).sort((a, b) => b.score - a.score).slice(0, 25);
    await prisma.$transaction(async (tx) => {
      for (const item of scored) {
        await tx.$executeRaw`INSERT INTO duplicate_candidates (report_id,incident_id,score,band,signals,status) VALUES (${report.id}::uuid,${item.candidate.id}::uuid,${item.score}::decimal,${item.band},${JSON.stringify(item.signals)}::jsonb,'PENDING') ON CONFLICT (report_id,incident_id) DO UPDATE SET score=EXCLUDED.score,band=EXCLUDED.band,signals=EXCLUDED.signals`;
      }
    });
    return res.json({ success: true, data: { reportId: report.id, candidates: scored.map(({ candidate, score, band, signals }) => ({ incidentId: candidate.id, trackingId: candidate.publicTrackingId, category: candidate.category, status: candidate.status, distanceMeters: Math.round(duplicateDistanceMeters(report.incident!, candidate)), score, band, signals })) } });
  } catch (error: any) { return res.status(500).json({ success: false, error: { code: 'DUPLICATE_REVIEW_UNAVAILABLE', message: error.message || 'Unable to retrieve duplicate candidates.' } }); }
});

router.post('/duplicate-candidates/:candidateId/decision', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const decision = typeof req.body.decision === 'string' ? req.body.decision.toUpperCase() : '';
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!['LINK', 'NOT_DUPLICATE'].includes(decision) || reason.length < 5) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Decision and an audit reason of at least five characters are required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const actor = await loadPolicyActor(tx, req.user!.id);
      const rows = await tx.$queryRaw<Array<{ id: string; report_id: string; incident_id: string; status: string }>>`SELECT id,report_id,incident_id,status FROM duplicate_candidates WHERE id=${req.params.candidateId}::uuid FOR UPDATE`;
      const candidate = rows[0];
      if (!candidate) throw Object.assign(new Error('Duplicate candidate not found'), { code: 'NOT_FOUND' });
      const report = await tx.report.findUnique({ where: { id: candidate.report_id }, include: { incident: true } });
      const target = await tx.incident.findUnique({ where: { id: candidate.incident_id } });
      if (!report?.incident || !target) throw Object.assign(new Error('Duplicate candidate resources are unavailable'), { code: 'NOT_FOUND' });
      assertTriageAccess(actor, report.incident);
      if (candidate.status !== 'PENDING') throw Object.assign(new Error('Duplicate candidate has already been decided'), { code: 'INVALID_STATE' });
      if (decision === 'LINK') {
        await tx.report.update({ where: { id: report.id }, data: { incidentId: target.id } });
        await tx.incident.update({ where: { id: target.id }, data: { reportCount: { increment: 1 } } });
        await tx.incident.update({ where: { id: report.incident.id }, data: { reportCount: { decrement: 1 } } });
      }
      await tx.$executeRaw`UPDATE duplicate_candidates SET status=${decision === 'LINK' ? 'ACCEPTED' : 'REJECTED'},reviewed_by=${actor.id}::uuid,review_reason=${reason},reviewed_at=NOW() WHERE id=${candidate.id}::uuid`;
      await tx.$executeRaw`INSERT INTO duplicate_decisions (report_id,source_incident_id,incident_id,decision,reason,actor_id) VALUES (${report.id}::uuid,${report.incident.id}::uuid,${target.id}::uuid,${decision},${reason},${actor.id}::uuid)`;
      await logIncidentChange(tx, report.incident.id, decision === 'LINK' ? 'REPORT_LINKED_AS_DUPLICATE' : 'DUPLICATE_REJECTED', actor.id, { reportId: report.id, targetIncidentId: target.id, reason });
      return { decision, reportId: report.id, incidentId: target.id };
    });
    return res.json({ success: true, data: result });
  } catch (error: any) { return res.status(error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_STATE' ? 409 : 500).json({ success: false, error: { code: error.code || 'DUPLICATE_DECISION_FAILED', message: error.message } }); }
});

router.post('/duplicate-decisions/:decisionId/unlink', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'An audit reason of at least five characters is required.' } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const actor = await loadPolicyActor(tx, req.user!.id);
      const rows = await tx.$queryRaw<Array<{ id: string; report_id: string; source_incident_id: string; incident_id: string; decision: string }>>`SELECT id,report_id,source_incident_id,incident_id,decision FROM duplicate_decisions WHERE id=${req.params.decisionId}::uuid FOR UPDATE`;
      const decision = rows[0];
      if (!decision || decision.decision !== 'LINK') throw Object.assign(new Error('Only a linked duplicate can be unlinked'), { code: 'INVALID_STATE' });
      const source = await tx.incident.findUnique({ where: { id: decision.source_incident_id } });
      const target = await tx.incident.findUnique({ where: { id: decision.incident_id } });
      if (!source || !target) throw Object.assign(new Error('Duplicate incidents are unavailable'), { code: 'NOT_FOUND' });
      assertTriageAccess(actor, source);
      await tx.report.update({ where: { id: decision.report_id }, data: { incidentId: source.id } });
      await tx.incident.update({ where: { id: source.id }, data: { reportCount: { increment: 1 } } });
      await tx.incident.update({ where: { id: target.id }, data: { reportCount: { decrement: 1 } } });
      await tx.$executeRaw`UPDATE duplicate_decisions SET decision='UNLINK',reason=${reason} WHERE id=${decision.id}::uuid`;
      await logIncidentChange(tx, source.id, 'REPORT_DUPLICATE_UNLINKED', actor.id, { reportId: decision.report_id, targetIncidentId: target.id, reason });
      return { reportId: decision.report_id, incidentId: source.id, unlinkedFrom: target.id };
    });
    return res.json({ success: true, data: result });
  } catch (error: any) { return res.status(error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_STATE' ? 409 : 500).json({ success: false, error: { code: error.code || 'DUPLICATE_UNLINK_FAILED', message: error.message } }); }
});

router.get('/ai-status', authenticateJWT, async (_req: AuthenticatedRequest, res: Response) => {
  const model = getActiveAiModel();
  return res.json({ success: true, data: { model, canary: evaluateModelCanary(model), guarantees: ['advisory_only', 'human_override_required_for_uncertain_results', 'submission_never_blocked_by_ai'] } });
});

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const actor = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Active account required.' } });
    const where: Prisma.ReportWhereInput = {};

    // Citizens can only view their own reports
    if (user.role === UserRole.CITIZEN) {
      where.submitterRef = user.id;
    } else {
      where.incident = { is: incidentScope(actor) };
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        incident: {
          include: {
            ward: true,
            worker: {
              select: {
                id: true,
                email: true
              }
            },
            assignee: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        },
        aiAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, provider: true, model: true, promptVersion: true, schemaVersion: true, category: true, confidence: true, result: true, status: true, createdAt: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) as any[];

    if (reports.length) {
      const details = await prisma.$queryRaw<Array<{ id: string; title: string }>>`SELECT id,title FROM reports WHERE id=ANY(${reports.map((report) => report.id)}::uuid[])`;
      const titleMap = new Map(details.map((row) => [row.id, row.title]));
      reports.forEach((report) => { report.title = titleMap.get(report.id) || 'Civic issue report'; });
    }

    const deptIds = reports
      .map(r => r.incident?.departmentId)
      .filter(id => !!id) as string[];

    if (deptIds.length > 0) {
      const depts = await prisma.department.findMany({
        where: { id: { in: deptIds } }
      });
      const deptMap = new Map(depts.map(d => [d.id, d]));
      reports.forEach(r => {
        if (r.incident && r.incident.departmentId) {
          r.incident.department = deptMap.get(r.incident.departmentId);
        }
      });
    }

    return res.json({
      success: true,
      reports: reports.map(({ photoUrl: _privateStoragePath, ...report }) => report)
    });
  } catch (error: any) {
    console.error('Failed to query reports:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while fetching reports.',
      }
    });
  }
});

// GET /api/v1/reports/:id/timeline — append-only, citizen-safe lifecycle history.
router.get('/:id/timeline', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Active account required.' } });
    let report = await prisma.report.findFirst({ where: { id: req.params.id, ...(actor.role === UserRole.CITIZEN ? { submitterRef: actor.id } : { incident: { is: incidentScope(actor) } }) }, select: { id: true, incidentId: true } });
    // Notification links historically contain the Incident ID. Resolve that
    // form as well as the canonical Report ID so official and citizen links
    // both open the same timeline safely.
    if (!report) {
      const incident = await prisma.incident.findFirst({
        where: actor.role === UserRole.CITIZEN
          ? { id: req.params.id, reports: { some: { submitterRef: actor.id } } }
          : { id: req.params.id, ...incidentScope(actor) },
        select: { id: true, reports: { where: actor.role === UserRole.CITIZEN ? { submitterRef: actor.id } : undefined, orderBy: { createdAt: 'asc' }, take: 1, select: { id: true } } },
      });
      if (incident?.reports[0]) report = { id: incident.reports[0].id, incidentId: incident.id };
    }
    if (!report?.incidentId) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report was not found.' } });
    const events = await prisma.$queryRawUnsafe<Array<{ id: string; sequence: bigint; eventType: string; lifecycleState: string | null; actorRole: string | null; actorLabel: string | null; metadata: unknown; createdAt: Date }>>(`SELECT id,sequence,event_type "eventType",lifecycle_state "lifecycleState",actor_role "actorRole",actor_label "actorLabel",metadata,created_at "createdAt" FROM incident_timeline_events WHERE incident_id=$1::uuid ${actor.role === UserRole.CITIZEN ? "AND visibility='CITIZEN'" : ''} ORDER BY sequence`, report.incidentId);
    return res.json({ success: true, data: { events: events.map((event) => ({ ...event, sequence: event.sequence.toString() })) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Unable to load timeline.' } });
  }
});

// POST /api/v1/reports/:id/retry-analysis
router.post('/:id/retry-analysis', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Active account required.' } });
    const report = await prisma.report.findFirst({ where: { id: req.params.id, ...(actor.role === UserRole.CITIZEN ? { submitterRef: actor.id } : { incident: { is: incidentScope(actor) } }) }, include: { aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report was not found.' } });
    const latest = report.aiAnalyses[0];
    if (latest && !['PENDING', 'FAILED', 'RETRY_WAIT', 'REVIEW_REQUIRED'].includes(latest.status)) return res.status(409).json({ success: false, error: { code: 'ANALYSIS_NOT_RETRYABLE', message: 'The latest analysis is not retryable.' } });
    const job = await prisma.job.findUnique({ where: { idempotencyKey: `report-classification:${report.id}` } });
    if (job?.status === 'RUNNING') return res.status(202).json({ success: true, data: { status: 'RUNNING' } });
    await prisma.job.upsert({ where: { idempotencyKey: `report-classification:${report.id}` }, create: { type: 'REPORT_CLASSIFICATION', payload: { reportId: report.id }, idempotencyKey: `report-classification:${report.id}`, maxAttempts: 6 }, update: { status: 'QUEUED', availableAt: new Date(), attempts: 0, lastError: null, completedAt: null } });
    if (latest) await prisma.$executeRaw`UPDATE ai_analyses SET status='PENDING',failure_code=NULL WHERE id=${latest.id}::uuid`;
    return res.status(202).json({ success: true, data: { status: 'QUEUED' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Unable to retry analysis.' } });
  }
});

// GET /api/v1/reports/:id
// Fetches a single report by ID
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const actor = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, cityId: true, zoneId: true, wardId: true, departmentId: true } });
    if (!actor) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Active account required.' } });
    const accessWhere: Prisma.ReportWhereInput = user.role === UserRole.CITIZEN ? { submitterRef: user.id } : { incident: { is: incidentScope(actor) } };

    let report = await prisma.report.findFirst({
      where: { id, ...accessWhere },
      include: {
        aiAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, provider: true, model: true, promptVersion: true, schemaVersion: true, category: true, confidence: true, result: true, status: true, createdAt: true }
        },
        incident: {
          include: {
            ward: true,
            worker: {
              select: {
                id: true,
                email: true
              }
            },
            assignee: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    }) as any;

    if (!report) {
      // If not found as a report ID, check if the ID belongs to an incident
      const incident = await prisma.incident.findFirst({
        where: user.role === UserRole.CITIZEN
          ? { id, reports: { some: { submitterRef: user.id } } }
          : { id, ...incidentScope(actor) },
        include: {
          ward: true,
          worker: {
            select: {
              id: true,
              email: true
            }
          },
          assignee: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          reports: {
            ...(user.role === UserRole.CITIZEN ? { where: { submitterRef: user.id } } : {}),
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      }) as any;

      if (incident && incident.reports.length > 0) {
        const firstReport = incident.reports[0];
        report = {
          ...firstReport,
          incident: {
            id: incident.id,
            publicTrackingId: incident.publicTrackingId,
            category: incident.category,
            status: incident.status,
            priority: incident.priority,
            latitude: incident.latitude,
            longitude: incident.longitude,
            createdAt: incident.createdAt,
            resolvedAt: incident.resolvedAt,
            resolvedNotes: incident.resolvedNotes,
            ward: incident.ward,
            worker: incident.worker,
            assignee: incident.assignee,
            departmentId: incident.departmentId
          }
        };
      }
    }

    // Populate department details manually
    if (report && report.incident && report.incident.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: report.incident.departmentId }
      });
      report.incident.department = dept;
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Report with ID ${id} was not found.`,
        }
      });
    }

    report.photoUrl = await createSignedMediaUrl(report.photoUrl).catch(() => null);
    const workflow = await prisma.$queryRaw<Array<{ title: string; triageOwnerId: string | null; triageOwnerEmail: string | null }>>`
      SELECT r.title,i.triage_owner_id "triageOwnerId",u.email "triageOwnerEmail"
      FROM reports r LEFT JOIN incidents i ON i.id=r.incident_id LEFT JOIN users u ON u.id=i.triage_owner_id WHERE r.id=${report.id}::uuid`;
    report.title = workflow[0]?.title || 'Civic issue report';
    if (report.incident) report.incident.triageOwner = workflow[0]?.triageOwnerId ? { id: workflow[0].triageOwnerId, email: workflow[0].triageOwnerEmail, role: 'WARD_OFFICER' } : null;

    return res.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('Failed to fetch report detail:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while fetching report details.',
      }
    });
  }
});

export default router;

function requireCitizen(req: AuthenticatedRequest, res: Response, next: () => void) {
  if (req.user?.role !== UserRole.CITIZEN) return res.status(403).json({ success: false, error: { code: 'CITIZEN_REQUIRED', message: 'An active citizen account is required.' } });
  next();
}
