import { Buffer } from 'buffer';

export interface MLClassificationResult {
  success: boolean;
  category: string | null;
  confidence: number | null;
  engine: string;
  label?: string;
  modelVersion?: string;
  topPredictions?: any[];
  summary?: string;
  issue?: Record<string, unknown>;
  authenticity?: { verdict: string; confidence: number; signals: string[]; limitations: string[] };
  review?: 'AUTO_ACCEPT' | 'HUMAN_REVIEW';
  decision?: 'ACCEPT' | 'REJECT' | 'REVIEW_REQUIRED';
  civicRelevance?: { status?: string; confidence?: number; issue_present?: boolean; affected_domain?: string; reason?: string };
  followUpQuestions?: unknown[];
  aiStatus?: string;
  providerError?: string;
}

/**
 * Sends a report photograph to the FastAPI ML microservice for auto-classification.
 * Implements a strict timeout of 2.5 seconds to prevent blocking core reporting.
 */
export async function classifyReportImage(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string,
  description: string = '',
  citizenAnswers: Record<string, string> = {}
): Promise<MLClassificationResult> {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${mlServiceUrl}/api/v1/classify/category`;

  const controller = new AbortController();
  // Multimodal requests can take longer than ordinary API calls. Keep a safe
  // lower bound so a local 1–2 second setting cannot abort valid Groq work.
  const mlTimeoutMs = Math.max(30000, Number(process.env.ML_TIMEOUT_MS || 30000));
  const timeoutId = setTimeout(() => controller.abort(), mlTimeoutMs);

  try {
    const formData = new FormData();
    // Convert Buffer to Blob for native fetch compatibility
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append('image', blob, fileName);
    formData.append('description', description);
    formData.append('citizen_answers', JSON.stringify(citizenAnswers));

    console.log(`[ML Utility] Sending classification request to ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ML Service responded with status ${response.status}`);
    }

    const data = (await response.json()) as any;
    
    // Check if FastAPI returned classification results
    if (data.success === false) {
      throw new Error(data.error || 'ML Classification execution error');
    }
    if (data.category !== null && data.category !== undefined && typeof data.category !== 'string') {
      throw new Error('ML_RESPONSE_INVALID');
    }
    if (data.confidence !== null && data.confidence !== undefined && (typeof data.confidence !== 'number' || !Number.isFinite(data.confidence))) throw new Error('ML_RESPONSE_INVALID');

    return {
      success: true,
      category: data.category ?? null,
      confidence: data.confidence !== undefined ? data.confidence : null,
      engine: data.engine || 'groq_unavailable',
      label: data.label || undefined,
      modelVersion: data.model_version || undefined,
      topPredictions: data.top_predictions || [],
      summary: typeof data.summary === 'string' ? data.summary : undefined,
      issue: data.issue && typeof data.issue === 'object' ? data.issue : undefined,
      authenticity: data.authenticity && typeof data.authenticity === 'object' ? data.authenticity : undefined,
      review: data.review === 'HUMAN_REVIEW' ? 'HUMAN_REVIEW' : 'AUTO_ACCEPT',
      decision: data.decision === 'REJECT' || data.decision === 'ACCEPT' || data.decision === 'REVIEW_REQUIRED' ? data.decision : undefined,
      civicRelevance: data.civic_relevance && typeof data.civic_relevance === 'object' ? data.civic_relevance : undefined,
      followUpQuestions: Array.isArray(data.follow_up_questions) ? data.follow_up_questions : [],
      aiStatus: typeof data.ai_status === 'string' ? data.ai_status : undefined,
      providerError: typeof data.provider_error === 'string' ? data.provider_error : undefined,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError';
    console.warn(
      `[ML Utility] Auto-classification ${isTimeout ? 'timed out' : 'failed/skipped'} (falling back):`,
      error.message || error
    );
    return {
      success: false,
      category: null,
      confidence: null,
      engine: isTimeout ? 'timeout_pending' : 'failed_pending',
      label: undefined,
      modelVersion: 'groq-unavailable',
      aiStatus: 'PENDING',
      providerError: isTimeout ? 'TIMEOUT' : 'ML_UNAVAILABLE',
      authenticity: { verdict: 'INCONCLUSIVE', confidence: 0, signals: [], limitations: ['AI verification is unavailable; no authenticity decision was made.'] },
      review: 'HUMAN_REVIEW',
      topPredictions: [],
    };
  }
}
