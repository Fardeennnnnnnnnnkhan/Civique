import io
from app.classifier import classify_image

def generate_mock_image_bytes() -> bytes:
    """Generates mock image bytes. Falls back to dummy bytes if Pillow is missing."""
    try:
        from PIL import Image
        img = Image.new("RGB", (1, 1), color="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        return b"dummy_image_bytes"


def run_tests():
    print("--- STARTING PYTHON CLASSIFIER TESTS ---")
    
    mock_bytes = generate_mock_image_bytes()
    
    # Test 1: Pothole heuristic match
    print("Test 1: Testing text heuristics for POTHOLE...")
    result1 = classify_image(mock_bytes, description="I saw a massive pothole on the main street.")
    print("Result:", result1)
    assert result1["success"] is True
    assert result1["category"] == "POTHOLE"
    assert result1["confidence"] >= 0.5
    print("Test 1 passed!\n")
    
    # Test 2: Garbage heuristic match
    print("Test 2: Testing text heuristics for GARBAGE...")
    result2 = classify_image(mock_bytes, description="A large pile of trash is overflowing the bin.")
    print("Result:", result2)
    assert result2["success"] is True
    assert result2["category"] == "GARBAGE"
    assert result2["confidence"] >= 0.5
    print("Test 2 passed!\n")
    
    # Test 3: Sewage heuristic match
    print("Test 3: Testing text heuristics for SEWAGE...")
    result3 = classify_image(mock_bytes, description="The sewer is blocked and overflowing onto the street.")
    print("Result:", result3)
    assert result3["success"] is True
    assert result3["category"] == "SEWAGE"
    assert result3["confidence"] >= 0.5
    print("Test 3 passed!\n")
    
    # Test 4: Default category match
    print("Test 4: Testing default OTHERS category...")
    result4 = classify_image(mock_bytes, description="Unrelated description text with no keywords.")
    print("Result:", result4)
    assert result4["success"] is True
    assert result4["category"] == "OTHERS"
    assert result4["confidence"] >= 0.4
    print("Test 4 passed!\n")
    
    print("--- ALL PYTHON CLASSIFIER TESTS PASSED ---")

if __name__ == "__main__":
    run_tests()
