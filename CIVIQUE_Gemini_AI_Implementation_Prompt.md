# Superseded Planning Prompt

> **Superseded on 2026-08-30.** Do not use this prompt for implementation. Civique will use Groq `qwen/qwen3.8-27b`, not Gemini. The authoritative correction-first roadmap is [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md). This file is preserved temporarily as historical user material and should only be removed with explicit permission.

# CIVIQUE — GEMINI AI CIVIC EVIDENCE VERIFICATION

## MASTER IMPLEMENTATION PROMPT

### IMPORTANT

We are replacing the current MobileNetV2 + ImageNet + hardcoded label-mapping approach with a genuine multimodal AI analysis system using the Gemini API.

The Gemini API key will be provided through the server-side environment:

```env
GEMINI_API_KEY=...
```

The key MUST NEVER be exposed to:
- Next.js client code
- browser JavaScript
- `NEXT_PUBLIC_*`
- HTML
- API responses
- frontend environment variables
- logs

The Gemini integration must exist only on the server side.

---

# 1. PRIMARY OBJECTIVE

Transform the current Civique report submission system from:

```text
Image
 ↓
MobileNetV2
 ↓
ImageNet label
 ↓
Hardcoded mapping
 ↓
Civique category
```

into:

```text
Citizen
 ↓
Image
 ↓
Civique Backend
 ↓
Gemini Vision Analysis
 ↓
Civique Taxonomy
 ↓
Semantic Civic Classification
 ↓
Evidence Verification
 ↓
Structured AI Result
 ↓
CIVIQUE AI VERIFICATION UI
```

Do NOT add more ImageNet mappings.

Do NOT add rules such as:
- `"puddle" → POTHOLE`
- `"car" → ILLEGAL_PARKING`
- `"dog" → STRAY_ANIMAL`

Do not use hardcoded visual classification rules.

---

# 2. FIRST AUDIT THE EXISTING SYSTEM

Before modifying anything, inspect the existing implementation.

Find:
- report submission page
- image upload component
- image preview
- existing `/api/v1/reports/classify-draft`
- Express report routes
- `ml.ts`
- FastAPI ML service
- `classifier.py`
- MobileNetV2 implementation
- report database model
- image storage
- category taxonomy
- department mapping
- authentication
- existing AI UI
- existing tests

Document the current flow.

Create:

```text
docs/ai/gemini-migration.md
```

Do not delete the existing classifier yet.

---

# 3. NEW ARCHITECTURE

Implement:

```text
Next.js
    │
    ▼
Express
    │
    ▼
FastAPI AI Service
    │
    ▼
CivicVisionAnalyzer
    │
    ▼
GeminiProvider
    │
    ▼
Gemini API
```

The frontend must NEVER call Gemini directly.

---

# 4. GEMINI API KEY

Add:

```env
GEMINI_API_KEY=...
```

to the FastAPI/AI service environment.

If the Express backend directly invokes Gemini instead of FastAPI, the key may exist there instead.

Prefer keeping Gemini credentials inside the dedicated AI service.

Never expose:

```env
NEXT_PUBLIC_GEMINI_API_KEY=...
```

This is prohibited.

---

# 5. IMAGE FLOW — VERY IMPORTANT

The image flow must be:

```text
Citizen selects image
        │
        ▼
Next.js
        │
        │ multipart/form-data
        ▼
Express
        │
        │ authenticated server-to-server request
        ▼
FastAPI
        │
        ▼
Image validation
        │
        ▼
GeminiProvider
        │
        │ HTTPS + API key
        ▼
Gemini API
        │
        ▼
Structured AI result
        │
        ▼
FastAPI
        │
        ▼
Express
        │
        ▼
Next.js
```

The image is NOT authenticated by Gemini.

The Gemini API key authenticates Civique's request to Gemini.

Civique must independently authenticate:
- the user
- the report session
- the uploaded image
- the analysis request

---

# 6. IMAGE SECURITY BEFORE GEMINI

Before sending an image to Gemini:

Validate:
- MIME type
- file extension
- actual image format
- file size
- image dimensions
- image decoding
- malformed images

Reject invalid uploads before AI processing.

Never execute uploaded files.

Do not trust the browser-provided MIME type alone.

Inspect actual image content server-side.

---

# 7. IMAGE IDENTIFICATION

When the backend receives the image:

Generate:

```text
image_hash = SHA-256(image_bytes)
```

Use this to associate the analysis with the exact uploaded image.

Do not use the hash to classify the image.

The hash is only for:
- integrity
- duplicate detection
- audit
- linking analysis to the uploaded evidence

---

# 8. EXACT ANSWER: HOW THE IMAGE IS SENT TO GEMINI

The browser does NOT send the image directly to Gemini.

The browser sends the image to Civique:

```text
Browser
  │
  │ HTTPS multipart/form-data
  │ Authorization: Civique user/session token
  ▼
Express
  │
  │ authenticated internal request
  ▼
FastAPI
```

FastAPI receives the image bytes.

Then FastAPI sends those image bytes to Gemini using the server-side `GEMINI_API_KEY`.

Conceptually:

```text
Citizen image
      │
      ▼
Express receives multipart file
      │
      ▼
FastAPI receives validated image bytes
      │
      ├── SHA-256 hash
      ├── MIME validation
      ├── size validation
      └── image decoding
      │
      ▼
GeminiProvider
      │
      │ image bytes/file + prompt
      │ Authorization using GEMINI_API_KEY
      ▼
Gemini API
      │
      ▼
AI analysis
```

The API key authenticates the API request to Gemini.

It does NOT prove that the image is authentic.

Image authenticity must be evaluated separately.

The Gemini request should be made from the backend, never from the browser.

---

# 9. IMAGE SENT TO GEMINI

The backend should send the image as multimodal input to Gemini.

Do NOT convert the image into a textual description before sending it.

Gemini should receive:

```text
IMAGE
+
SYSTEM INSTRUCTIONS
+
CIVIQUE CATEGORY TAXONOMY
+
OPTIONAL CITIZEN DESCRIPTION
+
OPTIONAL USER-SELECTED CATEGORY
```

Use the current official Google Gen AI SDK and current Gemini documentation for the selected model.

Prefer supported SDK/file or inline-image mechanisms rather than inventing a custom undocumented protocol.

---

# 10. DO NOT SEND THE GEMINI KEY TO THE CLIENT

The frontend should only call:

```text
POST /api/v1/reports/classify-draft
```

The frontend must never know:

```text
GEMINI_API_KEY
```

The sequence is:

```text
Browser
   │
   │ image
   ▼
Civique API
   │
   │ Gemini API key is server-side
   ▼
Gemini
```

---

# 11. PROVIDER ABSTRACTION

Create:

```text
ml-service/
├── providers/
│   ├── base.py
│   └── gemini.py
│
├── services/
│   └── civic_vision.py
│
├── taxonomy/
│   └── civic_categories.json
│
├── schemas/
│   └── vision.py
│
└── routes/
    └── vision.py
```

Create a provider interface:

```python
class VisionModelProvider:
    async def analyze_image(
        self,
        image_bytes,
        categories,
        description=None,
        selected_category=None
    ):
        raise NotImplementedError
```

Implement:

```text
GeminiProvider
```

behind this interface.

Do not put Gemini-specific logic throughout the application.

---

# 12. CIVIC TAXONOMY

Create one canonical taxonomy.

Example:

```json
[
  {
    "id": "ROAD_POTHOLE",
    "name": "Roads & Potholes",
    "description": "Potholes and significant road-surface damage.",
    "visual_criteria": "Visible holes, depressions, broken asphalt, damaged pavement."
  },
  {
    "id": "GARBAGE",
    "name": "Garbage & Waste",
    "description": "Accumulated garbage or illegal dumping.",
    "visual_criteria": "Visible accumulation of waste in a public area."
  }
]
```

Use the actual Civique categories already present in the application.

Do not invent categories that conflict with the existing system.

The taxonomy should be the single source of truth.

---

# 13. GEMINI PROMPT

Construct the Gemini instruction dynamically from the taxonomy.

Use a system instruction conceptually similar to:

```text
You are CIVIQUE AI, a civic evidence analysis system.

Analyze the supplied image as visual evidence.

Your task is to determine whether the image visually supports
one of the supplied Civique civic issue categories.

Use the complete visual context.

Do not classify based merely on individual objects.

Do not infer facts that are not visually observable.

For example:

A car does not automatically mean illegal parking.

A dog does not automatically mean a stray animal.

A puddle does not automatically mean a pothole.

A road does not automatically mean road damage.

A streetlight does not automatically mean a broken streetlight.

Select OTHER only when none of the supplied civic categories
are sufficiently supported.

Explain the visual evidence supporting your result.

If the evidence is ambiguous, explicitly report uncertainty.

Do not claim certainty where the image does not support it.

Return only the requested structured output.
```

---

# 14. GEMINI OUTPUT

Return structured JSON.

Use the current Gemini structured-output capability supported by the selected model.

Expected structure:

```json
{
  "category": {
    "id": "ROAD_POTHOLE",
    "match_strength": "high"
  },
  "alternatives": [],
  "visual_observations": [
    "large depression in asphalt",
    "damaged road surface",
    "standing water within the depression"
  ],
  "evidence_relevance": "high",
  "uncertainties": [],
  "analysis_status": "completed"
}
```

Do not parse free-form prose using fragile string matching.

---

# 15. CONFIDENCE

Do NOT automatically represent Gemini's raw output as:

```text
94% probability
```

unless the underlying model output has actually been calibrated.

Prefer:

```text
match_strength:
high
medium
low
inconclusive
```

If numeric model scores are available, store them separately as model-specific metadata.

Do not call them calibrated probabilities unless validated.

---

# 16. TEST THE PROVIDED POTHOLE IMAGE

The current pothole image is a mandatory regression test.

Run the actual image through Gemini.

Do NOT:
- hardcode its filename
- hardcode its hash
- special-case it
- add a pothole mapping
- force its category

The model itself must analyze it.

The expected semantic result should be within the appropriate Civique road/pothole category.

If Gemini incorrectly returns OTHER, investigate:
- taxonomy
- prompt
- selected model
- image preprocessing
- model response
- category definitions

Do not patch the result with a hardcoded rule.

---

# 17. EXISTING CLASSIFY-DRAFT ENDPOINT

Keep:

```text
POST /api/v1/reports/classify-draft
```

Do not break the existing frontend.

Change the internal implementation from:

```text
MobileNetV2
```

to:

```text
CivicVisionAnalyzer
 → GeminiProvider
```

The endpoint should remain a stateless analysis operation.

It must NOT create a report in the database.

---

# 18. RESPONSE CONTRACT

Return:

```json
{
  "success": true,
  "data": {
    "analysisId": "...",
    "categorySuggested": "ROAD_POTHOLE",
    "categoryName": "Roads & Potholes",
    "matchStrength": "high",
    "visualObservations": [],
    "evidenceRelevance": "high",
    "analysisStatus": "completed",
    "model": {
      "provider": "gemini",
      "model": "...",
      "version": "..."
    }
  }
}
```

Do not expose:
- Gemini API key
- internal infrastructure
- provider secrets

---

# 19. ANALYSIS ID

Every AI analysis receives a unique:

```text
analysisId
```

The backend associates:

```text
analysisId
+
user/session
+
image_hash
+
report draft
```

This prevents a client from taking an AI result generated for one image and submitting it with another.

The backend must verify that the analysis belongs to the current authenticated user/session and corresponds to the exact image hash being submitted.

---

# 20. DO NOT TRUST CLIENT AI RESULTS

Never accept these as trusted values from the frontend:

```text
categorySuggested
confidence
matchStrength
riskScore
aiGeneratedProbability
evidenceRelevance
```

The backend must either:
- perform the analysis itself
- or verify the analysis ID against server-side records

before accepting it.

---

# 21. IMAGE + DESCRIPTION VERIFICATION

After basic classification works, extend the analyzer.

Inputs:

```text
IMAGE
DESCRIPTION
SELECTED CATEGORY
```

Ask Gemini:

```text
Determine whether the image provides visual evidence
supporting the citizen's description and selected category.

Identify:
- consistency
- contradictions
- evidence relevance
- uncertainty

Do not invent information.
```

Example:

Image:
pothole

Description:
"There is a large pothole near the school."

Result:

```json
{
  "consistent": true,
  "evidence_relevance": "high",
  "contradictions": []
}
```

---

# 22. IRRELEVANT IMAGE

Example:

Image:
laptop

Description:
"There is a large pothole on the road."

Expected:

```json
{
  "consistent": false,
  "evidence_relevance": "very_low",
  "contradictions": [
    "The image does not appear to visually show the reported road issue."
  ]
}
```

Do not simply return:

```text
OTHER: Laptop
```

The goal is evidence verification.

---

# 23. USER CATEGORY OVERRIDE

If AI suggests:

```text
ROAD_POTHOLE
```

but the citizen selects:

```text
GARBAGE
```

do NOT silently overwrite the citizen's choice.

Run consistency analysis.

Show:

```text
CIVIQUE AI VERIFICATION

AI suggestion:
Roads & Potholes

Selected issue:
Garbage & Waste

⚠ The image appears more consistent
with Roads & Potholes.

Please review your selection.
```

Allow the user to correct it.

---

# 24. IMAGE QUALITY

Before Gemini analysis, check:
- resolution
- blur
- darkness
- excessive compression
- corruption

Return:

```json
{
  "quality": {
    "status": "good"
  }
}
```

or:

```json
{
  "quality": {
    "status": "poor",
    "issues": ["image is too blurry"]
  }
}
```

Do not automatically reject a legitimate report merely because the image is imperfect.

---

# 25. AUTHENTICITY IS A SEPARATE LAYER

DO NOT assume:

```text
Gemini classification succeeded
=
image is authentic
```

These are completely different questions.

Gemini is initially being used for:
- visual understanding
- civic classification
- evidence relevance
- image/description consistency

Separate future modules should handle:
- AI-generated detection
- image manipulation
- duplicate detection
- C2PA/content credentials
- EXIF
- location

---

# 26. AI-GENERATED IMAGE DETECTION

Do NOT simply ask Gemini:

```text
"Is this image AI generated?"
```

and treat its answer as authoritative.

Create:

```text
AiGenerationDetector
```

as a separate provider/module.

Until a validated detector is available:

```json
{
  "status": "unavailable"
}
```

Do not fabricate a probability.

---

# 27. MANIPULATION DETECTION

Create separately:

```text
ManipulationDetector
```

Potential signals:
- splicing
- copy-move
- object insertion
- object removal
- inpainting

If unavailable:

```text
status = unavailable
```

---

# 28. DUPLICATE DETECTION

Implement independently.

First:

```text
SHA-256
```

Then:

```text
perceptual hash
```

Later:

```text
visual embeddings
```

A duplicate image is not automatically fraud.

Multiple citizens can photograph the same civic issue.

---

# 29. C2PA / PROVENANCE

If supported by the image, inspect content credentials.

Possible results:

```text
present + valid
present + invalid
not present
```

Missing C2PA metadata must NOT mean:

```text
fake
```

---

# 30. FINAL EVIDENCE VERIFICATION

Eventually combine:

```text
Civic classification
+
Image quality
+
Description consistency
+
Duplicate detection
+
AI-generation signals
+
Manipulation signals
+
Provenance
+
Location
```

into:

```text
Civique Evidence Verification
```

Do not create a meaningless single "fake probability".

Keep individual signals visible to administrators.

---

# 31. FRONTEND — CIVIQUE AI VERIFICATION

Redesign the existing AI area.

For a valid pothole image:

```text
┌──────────────────────────────────────┐
│ ✦ CIVIQUE AI VERIFICATION            │
│                                      │
│ ✓ Issue detected                     │
│                                      │
│ Roads & Potholes                     │
│ Strong visual match                  │
│                                      │
│ Evidence                             │
│ Large damaged road surface with      │
│ a significant pothole.               │
│                                      │
│ ✓ Evidence appears relevant          │
└──────────────────────────────────────┘
```

Do not display:

```text
AI Confidence: 50%
```

unless the value is scientifically meaningful.

---

# 32. REPORT UI

The report page should have:
1. Evidence
2. AI verification
3. Issue
4. Description
5. Location
6. Final review
7. Submit

Use progressive disclosure.

Do not overwhelm citizens with technical AI information.

---

# 33. ERROR HANDLING

If Gemini is unavailable:

Do NOT break the report system.

Return:

```text
AI analysis temporarily unavailable
```

The existing report workflow should continue according to policy.

Implement:
- timeout
- retry
- rate-limit handling
- graceful fallback
- logging
- request IDs

---

# 34. GEMINI RATE LIMIT HANDLING

Do not assume unlimited free-tier access.

Implement:
- timeout
- bounded retries
- exponential backoff where appropriate
- rate-limit handling
- graceful degradation

Do not retry indefinitely.

---

# 35. SECURITY

The Gemini key must only exist on the server.

Use:

```env
GEMINI_API_KEY=...
```

Do not:

```env
NEXT_PUBLIC_GEMINI_API_KEY=...
```

Never log the key.

Never return the key.

Never put it into the image request from the browser.

Never store it in the database.

---

# 36. PRIVACY

Before sending production citizen evidence to a third-party API, document:
- what image data is transmitted
- where it is transmitted
- provider
- retention/data-use considerations
- applicable privacy requirements

For development/testing, clearly mark the Gemini provider as a development provider if appropriate.

Do not assume free-tier API usage has the same data-handling terms as a production enterprise arrangement.

---

# 37. MODEL CONFIGURATION

Do not hardcode the model name throughout the application.

Use:

```env
GEMINI_MODEL=...
```

The provider should read it from configuration.

This allows the model to be changed without rewriting application code.

Use the current Google documentation to select a supported multimodal model.

---

# 38. PROVIDER CONFIGURATION

Support:

```env
AI_PROVIDER=gemini
```

Then:

```text
AI_PROVIDER=gemini
```

loads:

```text
GeminiProvider
```

Later:

```text
AI_PROVIDER=qwen
```

could load:

```text
QwenProvider
```

without changing the report flow.

---

# 39. OBSERVABILITY

Every analysis must include:

```text
request_id
analysis_id
provider
model
latency
status
error_code
```

Do not log raw citizen images unnecessarily.

Do not log sensitive descriptions unnecessarily.

---

# 40. TESTING

Create automated tests for:

### Valid civic images
- pothole
- garbage
- waterlogging
- broken streetlight
- traffic signal
- illegal parking
- vandalism
- storm drain
- tree fall

### Non-civic
- laptop
- indoor room
- random object
- landscape

### Evidence mismatch
Pothole image + garbage description.
Laptop image + pothole description.

### Quality
- blurry
- dark
- tiny
- corrupted

### Provider failure
- Gemini timeout
- invalid API key
- rate limit
- malformed response

---

# 41. EXACT POTHOLE REGRESSION TEST

The currently supplied pothole image must be part of the regression dataset.

The test must verify:

1. image successfully reaches FastAPI
2. FastAPI validates the image
3. Gemini receives the image
4. Gemini returns structured output
5. Civique parses the response
6. the result is semantically consistent with a road/pothole issue
7. frontend receives the result
8. existing report functionality remains operational

Do NOT make the test pass through hardcoded rules.

---

# 42. MODULE IMPLEMENTATION ORDER

Do not implement everything at once.

### MODULE 0
Existing architecture audit.

### MODULE 1
Gemini provider setup.

### MODULE 2
Standalone Gemini image analysis.

### MODULE 3
Civique taxonomy.

### MODULE 4
Structured civic classification.

### MODULE 5
Integration with `classify-draft`.

### MODULE 6
CIVIQUE AI VERIFICATION UI.

### MODULE 7
Image + description verification.

### MODULE 8
Image quality.

### MODULE 9
Duplicate detection.

### MODULE 10
C2PA/provenance.

### MODULE 11
AI-generation detection.

### MODULE 12
Manipulation detection.

### MODULE 13
Location/metadata verification.

### MODULE 14
Evidence risk engine.

### MODULE 15
Admin AI review.

---

# 43. STOP AFTER EACH MODULE

After completing a module, output:

```text
MODULE:
OBJECTIVE:
IMPLEMENTED:
FILES CHANGED:
APIS:
ENVIRONMENT VARIABLES:
DATABASE:
TESTS:
TEST RESULTS:
MANUAL VERIFICATION:
KNOWN LIMITATIONS:
NEXT MODULE:
```

Then STOP.

Do not automatically continue.

---

# 44. ABSOLUTE NO-HARDCODING RULE

Never implement:

```python
if label == "puddle":
    return "ROAD_POTHOLE"
```

Never implement:

```python
if label == "car":
    return "ILLEGAL_PARKING"
```

Never implement:

```python
if image_hash == ...
```

Never classify based on filename.

Never create special handling for the supplied pothole image.

The AI must genuinely analyze the image.

Configuration/taxonomy is allowed.

Hardcoded visual classification decisions are prohibited.

---

# 45. FINAL TARGET ARCHITECTURE

```text
                    CIVIQUE USER
                         │
                         ▼
                    REPORT FORM
                         │
                         ▼
                  IMAGE UPLOAD
                         │
                         ▼
                 EXPRESS BACKEND
                         │
                         ▼
                FASTAPI AI SERVICE
                         │
                         ▼
                IMAGE VALIDATION
                         │
                         ▼
               CIVIC VISION ANALYZER
                         │
                         ▼
                   GEMINI API
                         │
                         ▼
             STRUCTURED AI ANALYSIS
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Category    Evidence    Observations
             │        relevance       │
             └───────────┼───────────┘
                         ▼
              CIVIQUE AI VERIFICATION
                         │
                         ▼
                  USER CONFIRMATION
                         │
                         ▼
                EXISTING REPORT FLOW
                         │
                         ▼
                     DATABASE
```

The later verification architecture becomes:

```text
Gemini Vision
      +
Image Quality
      +
Duplicate Detection
      +
C2PA
      +
AI Generation Detector
      +
Manipulation Detector
      +
Location Verification
      +
Description Consistency
      ↓
CIVIQUE EVIDENCE VERIFICATION
```

---

# 46. START NOW

Do NOT implement Modules 2+ immediately.

Start with:

**MODULE 0 — Audit existing report + ML architecture.**

Then implement:

**MODULE 1 — Gemini provider setup only.**

Do not change the report submission behavior yet.

After the Gemini provider is successfully connected and a basic image-analysis request works, stop and report the results before proceeding.
