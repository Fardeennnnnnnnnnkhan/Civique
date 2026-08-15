from fastapi import FastAPI
from datetime import datetime

app = FastAPI(
    title="Civique ML Microservice",
    description="Python FastAPI service handling image classification, duplicate detection, and before/after verification.",
    version="1.0.0"
)

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
