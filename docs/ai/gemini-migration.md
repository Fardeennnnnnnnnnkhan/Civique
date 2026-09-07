# Civique: Gemini AI Migration Audit Log (Module 0)

> **Superseded on 2026-08-30.** Gemini is no longer the selected Civique vision provider. The approved planning direction is Groq `qwen/qwen3.8-27b` through a provider-neutral FastAPI boundary. See [`docs/IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) and ADR-003 in [`docs/DECISIONS.md`](../DECISIONS.md). This file is retained only as historical architecture/audit context until the corrected M13 module removes Gemini code and dependencies.

This document maps the current AI/ML flow within the Civique codebase and outlines the transition blueprint to a genuine server-side Gemini Multimodal Vision analysis system.

---

## 1. Existing Flow Mapping

```text
Next.js UI (Image Select)
       │
       ▼ (multipart/form-data)
Express API (/classify-draft)
       │
       ▼ (HTTP request with timeout 2.5s)
FastAPI ML Service (/api/v1/classify/category)
       │
       ▼ (CivicClassifier)
ConvNeXt-Tiny (Pretrained ImageNet Fallback)
       │
       ├── Success: Map predicted categories via map_imagenet_to_civic
       └── Failure/Low Confidence: Fallback to keyword description heuristics
```

### Affected Code Files:
1. **Frontend Web client:** [page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/page.tsx)
   - Triggers `triggerAutoClassification` in Step 1 on upload.
   - Queries `POST /api/v1/reports/classify-draft`.
2. **Express REST API:**
   - Helper mapping: [ml.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/utils/ml.ts)
   - Router endpoints: [reports.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/reports.ts)
3. **FastAPI ML Microservice:**
   - Main router: [main.py](file:///home/fardeen/Documents/Projects/Civique/services/ml/app/main.py)
   - Classifier logic: [classifier.py](file:///home/fardeen/Documents/Projects/Civique/services/ml/app/classifier.py)

---

## 2. Gemini Migration Strategy

### Step 1: Install Official SDK
- Add `google-genai` package to the python microservice requirements.

### Step 2: Establish Provider Abstraction
- Create a base provider contract `VisionModelProvider`.
- Build the concrete `GeminiProvider` using server-side credentials (`GEMINI_API_KEY` and `GEMINI_MODEL`).

### Step 3: Implement Multimodal Vision Prompting
- Supply the model with the raw image bytes alongside structured Civique category taxonomies.
- Require Gemini to return structured, typed JSON (bypassing flaky string splits).
- Reject invalid, corrupted, or executable uploads before sending payloads to Gemini.
