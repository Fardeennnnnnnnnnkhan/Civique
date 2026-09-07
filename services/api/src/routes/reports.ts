import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';
import { supabase } from '../utils/supabase';
import { uploadMiddleware } from '../middleware/upload';
import { resolveLocationToWard } from '../utils/geofence';
import { AuthenticatedRequest, authenticateJWT } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { findDuplicateIncident } from '../utils/duplicate';
import { broadcastIncident } from '../utils/socket';
import { logIncidentChange } from '../utils/audit';
import { classifyReportImage } from '../utils/ml';
import crypto from 'crypto';
import { validateImageBuffer } from '../middleware/upload';
import { previewRouting, recordRoutingDecision } from '../services/routing';

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

// Custom optional authentication middleware
// Allows reports to be anonymous or linked to authenticated citizens
function optionalAuthenticateJWT(req: AuthenticatedRequest, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return next();

  try {
    const decoded = jwt.verify(token, secret) as { id: string; email: string | null; role: UserRole };
    req.user = decoded;
  } catch (err) {
    // Proceed anonymously on invalid token
  }
  next();
}


// POST /api/v1/reports
// Handles new report submission (Image buffer is uploaded to Supabase Bucket Storage)
router.post(
  '/',
  reportLimiter,
  optionalAuthenticateJWT,
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
    const { description, category, citizenName, citizenPhone, landmark, severity, duplicateIncidentId } = req.body;
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
      const prior = await prisma.report.findUnique({ where: { idempotencyKey }, include: { incident: { select: { publicTrackingId: true } } } });
      if (prior) return res.status(200).json({ success: true, data: { reportId: prior.id, photoUrl: prior.photoUrl, trackingId: prior.incident?.publicTrackingId, isLinkedToDuplicate: true, idempotentReplay: true } });
    }

    let validatedImage: ReturnType<typeof validateImageBuffer>;
    try { validatedImage = validateImageBuffer(req.file.buffer, req.file.mimetype); }
    catch { return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE_CONTENT', message: 'Image content does not match its declared type.' } }); }

    if (isNaN(lat) || isNaN(lng) || !description || !category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Fields description, category, latitude, and longitude are required.',
        },
      });
    }

    // 1.5. Run image auto-classification via FastAPI service (outside Prisma transaction to avoid locks)
    let suggestedCategory = category;
    let categoryConfidence: number | null = null;
    let mlEngine = 'failed_fallback';
    let mlSuccess = false;

    try {
      const mlResult = await classifyReportImage(
        req.file.buffer,
        req.file.originalname || 'report.jpg',
        validatedImage.mimeType,
        description
      );
      if (mlResult.success) {
        suggestedCategory = mlResult.category;
        categoryConfidence = mlResult.confidence;
        mlEngine = mlResult.engine;
        mlSuccess = true;
      }
    } catch (mlErr) {
      console.warn('[Reports Route] ML classification call failed:', mlErr);
    }

    // Auto-classify: Use AI category if confidence is high (>= 0.40) and not OTHERS. Otherwise, use citizen's input.
    const confirmedCategory = (mlSuccess && categoryConfidence !== null && categoryConfidence >= 0.40 && suggestedCategory !== 'OTHERS')
      ? suggestedCategory
      : category;

    let uploadedPath = '';

    try {
      // 2. Upload photo buffer to Supabase Storage Bucket ("report-images")
      const fileExt = validatedImage.mimeType === 'image/png' ? 'png' : validatedImage.mimeType === 'image/webp' ? 'webp' : 'jpg';
      uploadedPath = `reports/${crypto.randomBytes(24).toString('hex')}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(uploadedPath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
      }

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

          // Map severity level to incident PriorityLevel
          const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
          const priority = (severity && validPriorities.includes(severity.toUpperCase())) 
            ? (severity.toUpperCase() as any) 
            : 'MEDIUM';

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

          // Incident status: OPEN if ML auto-classified, otherwise starts as REPORTED (pending ML sync)
          const incidentStatus = categoryConfidence !== null ? 'OPEN' : 'REPORTED';

          const newIncident = await tx.incident.create({
            data: {
              publicTrackingId: trackingId,
              category: confirmedCategory,
              status: incidentStatus as any,
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
          await recordRoutingDecision(tx, { incidentId, category: confirmedCategory, cityId: resolvedGeo.cityId, wardId: resolvedGeo.wardId, previousDepartmentId: null });

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
              mlClassified: categoryConfidence !== null,
              mlSuggestedCategory: suggestedCategory,
              mlConfidence: categoryConfidence,
              mlEngine
            }
          );
        }

        // Create Report record linked to incident
        const report = await tx.report.create({
          data: {
            incidentId,
            submitterRef: req.user?.id || null,
            photoUrl,
            description,
            categorySuggested: suggestedCategory,
            categoryConfirmed: confirmedCategory,
            categoryConfidence: categoryConfidence !== null ? categoryConfidence : null,
            latitude: lat,
            longitude: lng,
            captureMethod: req.body.captureMethod === 'CAMERA_LIVE' ? 'CAMERA_LIVE' : 'UPLOAD',
            citizenName: citizenName || null,
            citizenPhone: citizenPhone || null,
            landmark: landmark || null,
            severity: severity || 'MEDIUM',
            idempotencyKey,
          },
        });
        await (tx as any).aiAnalysis.create({ data: { reportId: report.id, provider: mlEngine?.startsWith('groq') ? 'groq' : 'fallback', model: mlEngine?.startsWith('groq') ? (process.env.GROQ_MODEL || 'qwen/qwen3.8-27b') : 'civique-fallback', promptVersion: 'm13-v1', schemaVersion: 'm13-v1', category: suggestedCategory || null, confidence: categoryConfidence, result: { suggestedCategory, confirmedCategory, categoryConfidence, mlEngine }, status: categoryConfidence !== null ? 'COMPLETED' : 'PENDING' } }).catch(() => undefined);
        await (tx as Prisma.TransactionClient).mediaAsset.create({ data: { reportId: report.id, storagePath: uploadedPath, sha256: validatedImage.sha256, mimeType: validatedImage.mimeType, byteSize: req.file!.size, isPrivate: true, retentionUntil: new Date(Date.now() + 365 * 86400000) } });

        return { report, trackingId, matched: !!matchedIncident };
      }, {
        timeout: 15000 // 15 seconds timeout limit
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

      // Notify Ward Officers of the new incident
      if (!result.matched && resolvedGeo?.wardId) {
        prisma.user.findMany({
          where: {
            role: 'WARD_OFFICER',
            wardId: resolvedGeo.wardId,
            active: true
          }
        }).then(officers => {
          const officerIds = officers.map(o => o.id);
          if (officerIds.length > 0) {
            const { notifyUsers } = require('../utils/notifications');
            notifyUsers(
              officerIds,
              `New Incident #${result.trackingId}`,
              `A new ${category} incident has been reported in your ward.`,
              'INCIDENT_CREATED',
              result.report.incidentId || undefined
            ).catch((err: any) => console.error('Failed to notify ward officers:', err));
          }
        }).catch((err: any) => console.error('Failed to query ward officers for notifications:', err));
      }

      return res.status(201).json({
        success: true,
        data: {
          trackingId: result.trackingId,
          reportId: result.report.id,
          photoUrl,
          isLinkedToDuplicate: result.matched,
        },
      });
    } catch (error: any) {
      console.error('Report submission failed:', error);

      // Clean up storage artifact if DB write or resolution fails
      if (uploadedPath) {
        try {
          await supabase.storage.from('report-images').remove([uploadedPath]);
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

    try {
      const mlResult = await classifyReportImage(
        req.file.buffer,
        req.file.originalname || 'report.jpg',
        draftImage.mimeType,
        description || ''
      );

      return res.json({
        success: true,
        data: {
          categorySuggested: mlResult.category,
          confidence: mlResult.confidence,
          label: mlResult.label || 'Other Issue',
          modelVersion: mlResult.modelVersion || 'civique-civic-v1',
          topPredictions: mlResult.topPredictions || []
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
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const where: any = {};

    // Citizens can only view their own reports
    if (user.role === UserRole.CITIZEN) {
      where.submitterRef = user.id;
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) as any[];

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
      reports
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

// GET /api/v1/reports/:id
// Fetches a single report by ID
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    let report = await prisma.report.findUnique({
      where: { id },
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
        }
      }
    }) as any;

    if (!report) {
      // If not found as a report ID, check if the ID belongs to an incident
      const incident = await prisma.incident.findUnique({
        where: { id },
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

    // Citizens can only view their own reports unless it's public (linked to an incident)
    if (user.role === UserRole.CITIZEN && report.submitterRef !== user.id) {
      // Redact private contact details for privacy protection
      report.citizenName = null;
      report.citizenPhone = null;

      if (!report.incidentId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view this report.',
          }
        });
      }
    }

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
