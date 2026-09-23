import os
import json
from pathlib import Path


def load_local_env() -> None:
    """Load repo-local .env for standalone Uvicorn runs without overriding shell env."""
    candidates = [Path(__file__).resolve().parents[1] / ".env", Path(__file__).resolve().parents[3] / ".env", Path.cwd() / ".env"]
    for path in candidates:
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.removeprefix("export ").strip()
            value = value.strip().strip("\"'")
            if key and value and key not in os.environ:
                os.environ[key] = value
        break


load_local_env()

from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form
from app.classifier import classify_image
from app.providers.groq import GroqProviderError, GroqVisionProvider

app = FastAPI(
    title="Civique ML Microservice",
    description="Python FastAPI service handling image classification, duplicate detection, and before/after verification.",
    version="1.0.0"
)

TAXONOMY = ["POTHOLE", "GARBAGE", "STREETLIGHT", "WATER_LEAK", "SEWAGE", "TRAFFIC_SIGN", "VANDALISM", "STRAY_ANIMALS", "ILLEGAL_PARKING", "TREE_FALL", "STORM_DRAIN", "NOISE_POLLUTION", "OTHERS"]


def pending_result(provider_error: str, retryable: bool = False) -> dict:
    """Return an honest pending result; never turn an unavailable provider into fake classification data."""
    return {
        "success": True,
        "category": None,
        "confidence": None,
        "label": None,
        "top_predictions": [],
        "model_version": os.getenv("GROQ_MODEL", "groq-unavailable"),
        "engine": "groq_unavailable",
        "ai_status": "PENDING",
        "provider_error": provider_error,
        "provider_retryable": retryable,
        "summary": None,
        "issue": None,
        "civic_relevance": {"status": "AMBIGUOUS", "confidence": 0.0, "issue_present": False, "affected_domain": "UNKNOWN", "reason": "AI verification is unavailable."},
        "decision": "REVIEW_REQUIRED",
        "follow_up_questions": [],
        "authenticity": {"verdict": "INCONCLUSIVE", "confidence": 0.0, "signals": [], "limitations": ["AI verification is unavailable; no authenticity decision was made."]},
        "review": "HUMAN_REVIEW",
    }

@app.post("/api/v1/classify/category")
async def classify_category(
    image: UploadFile = File(...),
    description: str = Form(""),
    citizen_answers: str = Form("{}")
):
    try:
        contents = await image.read()
        if os.getenv("GROQ_API_KEY"):
            try:
                print(f"[ML] Groq request started model={os.getenv('GROQ_MODEL', 'qwen/qwen3.8-27b')} bytes={len(contents)}", flush=True)
                try:
                    parsed_answers = json.loads(citizen_answers or "{}")
                    if not isinstance(parsed_answers, dict):
                        parsed_answers = {}
                except json.JSONDecodeError:
                    parsed_answers = {}
                result = await GroqVisionProvider().analyze_image(contents, [{"id": c} for c in TAXONOMY], description, mime_type=image.content_type or "image/jpeg", citizen_answers=parsed_answers)
                result["success"] = True
                print("[ML] Groq request completed", flush=True)
            except GroqProviderError as provider_error:
                print(f"[ML] Groq request failed code={provider_error.code} retryable={provider_error.retryable} detail={provider_error}", flush=True)
                # Keep the provider code for machine handling, while exposing
                # the sanitized upstream reason for local diagnostics.
                result = pending_result(f"{provider_error.code}: {provider_error}", provider_error.retryable)
        else:
            print("[ML] GROQ_API_KEY is not configured; using local fallback", flush=True)
            result = pending_result("NOT_CONFIGURED")
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/health")
async def health_check():
    return {
        "success": True,
        "status": "HEALTHY",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ml-inference-engine",
        "models_loaded": [],
        "groq": {"configured": bool(os.getenv("GROQ_API_KEY")), "model": os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")}
    }

@app.post("/api/v1/verify/resolution")
async def verify_resolution(
    before: UploadFile = File(...), after: UploadFile = File(...),
    category: str = Form(...), notes: str = Form("")
):
    try:
        if not os.getenv("GROQ_API_KEY"):
            return {"success": False, "retryable": True, "error": "NOT_CONFIGURED"}
        result = await GroqVisionProvider().verify_resolution(
            await before.read(), await after.read(), category, notes,
            before.content_type or "image/jpeg", after.content_type or "image/jpeg"
        )
        return {"success": True, **result, "model_version": os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")}
    except GroqProviderError as error:
        return {"success": False, "retryable": error.retryable, "error": error.code}

@app.get("/")
async def root():
    return {
        "message": "Welcome to Civique ML Service API. Access /docs for API documentation."
    }
