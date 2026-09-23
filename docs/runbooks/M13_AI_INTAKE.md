# M13 AI Intake Runbook

## Local verification

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
cd services/api && npx ts-node --project tsconfig.json src/services/aiIntakePolicy.test.ts
PYTHONPATH=services/ml python3 services/ml/app/test_groq_provider.py
```

The API test suite also runs the deterministic labelled intake evaluation and model compatibility gate:

```bash
cd services/api && npx ts-node --project tsconfig.json src/services/aiEvaluation.test.ts
```

## Manual citizen flow

1. Start the API, ML service, and web app with a test citizen account.
2. Open `/report`, upload a valid civic image, and wait for the AI modal.
3. Confirm the modal labels the result as advisory, shows model/schema context, and never claims forensic certainty.
4. When adaptive questions appear, answer them, edit the suggested category/title/description/severity, and apply the result.
5. Submit the report. The report must persist even when the ML service is stopped or the provider is unconfigured; the analysis should remain pending/inconclusive and be retryable.

## Acceptance evidence still required

- Approved live startup canary and model compatibility check for the configured Groq model (the local registry/canary contract is implemented).
- Labelled Indore image set covering valid, irrelevant, blurry, screenshot, suspicious, sensitive-face/plate, and ambiguous evidence (offline fixture gate is implemented; live set remains required).
- Private-original/public-derivative redaction verification for faces, plates, documents, and house numbers (metadata stripping and sensitive-signal policy are implemented; live image fixture remains required).
- Restored-database tests for classification retries, human-review routing, authorized category override, and no-confidence-on-provider-failure.
- Browser accessibility and Hindi/English checks for the AI modal and adaptive questions.

## Safety notes

- Treat authenticity output as manipulation-risk signals, not proof that an image is genuine or fake.
- Do not expose private originals to public clients or place citizen identity in model prompts.
- Do not enable an AI-only rejection or closure path.
