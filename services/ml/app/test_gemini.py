import io
import asyncio
from PIL import Image
from app.providers.gemini import GeminiProvider

async def verify_gemini_connection():
    print("--- STARTING GEMINI PROVIDER VERIFICATION ---")
    
    # 1. Initialize GeminiProvider
    try:
        provider = GeminiProvider()
    except ValueError as ve:
        print(f"FAIL: Initialization failed. {ve}")
        print("Please configure GEMINI_API_KEY inside your .env file first.")
        return
        
    # 2. Build mock image bytes
    img = Image.new("RGB", (100, 100), color="black")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    image_bytes = buf.getvalue()

    # 3. Dummy taxonomy
    taxonomy = [
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

    # 4. Query image analysis
    print("Querying Gemini API...")
    try:
        result = await provider.analyze_image(
            image_bytes=image_bytes,
            categories=taxonomy,
            description="A dark paved surface.",
            selected_category="ROAD_POTHOLE"
        )
        print("\nSUCCESS: Received structured analysis response from Gemini:")
        import pprint
        pprint.pprint(result)
        
        # Verify structure keys
        assert "category" in result
        assert "id" in result["category"]
        assert "match_strength" in result["category"]
        assert "visual_observations" in result
        assert "evidence_relevance" in result
        print("\n--- ALL GEMINI PROVIDER TESTS PASSED ---")
        
    except Exception as e:
        print(f"\nFAIL: Gemini API request query failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_gemini_connection())
