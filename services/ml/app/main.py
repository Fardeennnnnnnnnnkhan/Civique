from fastapi import FastAPI, File, UploadFile, Form
from datetime import datetime
from app.classifier import classify_image
from app.providers.groq import GroqVisionProvider
import os

app = FastAPI(
    title="Civique ML Microservice",
    description="Python FastAPI service handling image classification, duplicate detection, and before/after verification.",
    version="1.0.0"
)

@app.post("/api/v1/classify/category")
async def classify_category(
    image: UploadFile = File(...),
    description: str = Form("")
):
    try:
        contents = await image.read()
        if os.getenv("GROQ_API_KEY"):
            try:
                result = await GroqVisionProvider().analyze_image(contents, [{"id": c} for c in ["POTHOLE", "GARBAGE", "STREETLIGHT", "WATER_LEAK", "SEWAGE", "OTHER"]], description)
                result["success"] = True
            except Exception as provider_error:
                result = classify_image(contents, description)
                result["ai_status"] = "PENDING"
                result["provider_error"] = type(provider_error).__name__
        else:
            result = classify_image(contents, description)
            result["ai_status"] = "PENDING"
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
        "models_loaded": []
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to Civique ML Service API. Access /docs for API documentation."
    }
