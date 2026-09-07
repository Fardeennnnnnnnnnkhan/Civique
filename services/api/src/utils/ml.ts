import { Buffer } from 'buffer';

export interface MLClassificationResult {
  success: boolean;
  category: string;
  confidence: number | null;
  engine: string;
  label?: string;
  modelVersion?: string;
  topPredictions?: any[];
}

/**
 * Sends a report photograph to the FastAPI ML microservice for auto-classification.
 * Implements a strict timeout of 2.5 seconds to prevent blocking core reporting.
 */
export async function classifyReportImage(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string,
  description: string = ''
): Promise<MLClassificationResult> {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${mlServiceUrl}/api/v1/classify/category`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5 seconds timeout

  try {
    const formData = new FormData();
    // Convert Buffer to Blob for native fetch compatibility
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append('image', blob, fileName);
    formData.append('description', description);

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

    return {
      success: true,
      category: data.category,
      confidence: data.confidence !== undefined ? data.confidence : null,
      engine: data.engine || 'convnext_tiny',
      label: data.label || undefined,
      modelVersion: data.model_version || undefined,
      topPredictions: data.top_predictions || [],
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError';
    console.warn(
      `[ML Utility] Auto-classification ${isTimeout ? 'timed out after 2.5s' : 'failed/skipped'} (falling back):`,
      error.message || error
    );
    return {
      success: false,
      category: 'OTHERS',
      confidence: null,
      engine: isTimeout ? 'timeout_fallback' : 'failed_fallback',
      label: undefined,
      modelVersion: 'civique-civic-v1',
      topPredictions: [],
    };
  }
}


