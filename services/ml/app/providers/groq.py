import os, json, base64, urllib.request, urllib.error, asyncio
from .base import VisionModelProvider

MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

class GroqVisionProvider(VisionModelProvider):
    """Provider-neutral Groq multimodal adapter. Failures are raised for API fallback handling."""
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model_name = MODEL

    async def analyze_image(self, image_bytes: bytes, categories: list, description: str = None, selected_category: str = None) -> dict:
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")
        taxonomy = ", ".join(str(c.get("id", c)) for c in categories)
        prompt = {"categories": taxonomy, "description": description or "", "selected_category": selected_category or "", "required": {"category": "one taxonomy ID", "confidence": "0..1", "confidence_band": "LOW|MEDIUM|HIGH", "evidence_relevance": "HIGH|MEDIUM|LOW|VERY_LOW", "visual_observations": ["observable facts"], "uncertainties": ["uncertainties"], "quality_flags": ["blur|dark|occluded|none"], "alternatives": ["taxonomy IDs"]}}
        body = json.dumps({"model": self.model_name, "temperature": 0.1, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": "You are Civique's evidence classifier. Do not infer unobservable facts. Return JSON only."}, {"role": "user", "content": [{"type": "text", "text": json.dumps(prompt)}, {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode()}}]}]}).encode()
        request = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=body, headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}, method="POST")
        def call():
            with urllib.request.urlopen(request, timeout=float(os.getenv("GROQ_TIMEOUT_SECONDS", "8"))) as response:
                return json.loads(response.read().decode())
        result = await asyncio.to_thread(call)
        content = result["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        category = str(parsed.get("category", "OTHERS")).upper()
        confidence = max(0.0, min(1.0, float(parsed.get("confidence", 0.0))))
        parsed.update({"category": category, "confidence": confidence, "model_version": self.model_name, "engine": "groq", "analysis_status": "completed"})
        return parsed
