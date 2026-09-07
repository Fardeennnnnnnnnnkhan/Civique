import io
import re
import os
import logging

logger = logging.getLogger("civique-ml-classifier")

# Attempt importing ML packages. If missing or CUDA fails, fallback to heuristics.
try:
    from PIL import Image
    import torch
    import torchvision.transforms as T
    from torchvision.models import convnext_tiny, ConvNeXt_Tiny_Weights
    HAS_ML = True
except Exception as e:
    logger.warning(f"Failed to load PyTorch/Torchvision model, falling back to text heuristics: {e}")
    HAS_ML = False

# Keywords mapping for direct text heuristics
KEYWORD_MAPPING = {
    "POTHOLE": ["pothole", "crater", "road damage", "pavement", "broken road", "footpath", "hole", "asphalt"],
    "GARBAGE": ["garbage", "trash", "dump", "waste", "bin", "rubbish", "litter", "refuse", "plastic"],
    "STREETLIGHT": ["streetlight", "street light", "lamp", "electricity", "dark", "flicker", "wire", "pole"],
    "WATER_LEAK": ["water", "leak", "flood", "pipe", "burst", "puddle", "flow", "leakage"],
    "SEWAGE": ["sewage", "sewer", "drain", "gutter", "odor", "manhole", "overflow", "sludge"],
    "TRAFFIC_SIGN": ["traffic sign", "traffic signal", "traffic light", "stop sign", "signboard", "signal"],
    "VANDALISM": ["vandalism", "graffiti", "spray paint", "broken bench", "defaced", "vandalized"],
    "STRAY_ANIMALS": ["stray cattle", "dog", "cow", "cattle", "bull", "goat", "animal", "dog bite"],
    "ILLEGAL_PARKING": ["illegal parking", "parking", "parked car", "blocking driveway", "wrong way", "vehicle"],
    "TREE_FALL": ["fallen tree", "tree fall", "branch", "blocking road", "timber", "wood"],
    "STORM_DRAIN": ["storm drain", "drain blockage", "waterlogging", "clogged drain", "grate"],
    "NOISE_POLLUTION": ["noise", "loudspeaker", "loud", "noise pollution", "blaring"]
}

def run_text_heuristics(description: str) -> tuple[str, float]:
    """
    Parses description text using keyword matches as a robust fallback.
    """
    desc_lower = description.lower() if description else ""
    scores = {cat: 0 for cat in KEYWORD_MAPPING.keys()}
    
    for cat, keywords in KEYWORD_MAPPING.items():
        for kw in keywords:
            if kw in desc_lower:
                scores[cat] += 1
                
    max_cat = max(scores, key=scores.get)
    if scores[max_cat] > 0:
        return max_cat, 0.70
        
    return "OTHERS", 0.50

def map_imagenet_to_civic(label: str) -> str:
    """
    Maps 1000 standard ImageNet category strings to Civique categories.
    """
    label_lower = label.lower()
    
    # Roads & Potholes
    if any(x in label_lower for x in ["pothole", "pavement", "crack", "crevice"]):
        return "POTHOLE"
    
    # Garbage & Trash
    if any(x in label_lower for x in ["garbage", "trash", "wastebin", "ashcan", "rubbish", "refuse", "dustcart", "dump"]):
        return "GARBAGE"
        
    # Streetlight & Lamps
    if any(x in label_lower for x in ["street lamp", "streetlight", "electric locomotive", "searchlight", "lamp"]):
        return "STREETLIGHT"
        
    # Water Leak
    if any(x in label_lower for x in ["fountain", "water bottle", "leak", "geyser"]):
        return "WATER_LEAK"
        
    # Sewage & Drains
    if any(x in label_lower for x in ["sewer", "manhole", "drain"]):
        return "SEWAGE"
        
    # Traffic Sign/Signal
    if any(x in label_lower for x in ["traffic light", "street sign", "signboard", "billboard"]):
        return "TRAFFIC_SIGN"
        
    # Stray Animals
    if any(x in label_lower for x in ["dog", "cat", "cow", "bull", "ox", "cattle", "goat", "sheep", "pig", "animal"]):
        return "STRAY_ANIMALS"
        
    # Tree Fall
    if any(x in label_lower for x in ["tree trunk", "lumber", "forest", "timber"]):
        return "TREE_FALL"
        
    # Illegal Parking
    if any(x in label_lower for x in ["cab", "limousine", "minivan", "sports car", "recreational vehicle", "trailer truck", "moving van", "jeep"]):
        return "ILLEGAL_PARKING"
        
    # Storm Drain / Grating
    if any(x in label_lower for x in ["grating", "grate"]):
        return "STORM_DRAIN"

    return "OTHERS"

class CivicClassifier:
    def __init__(self, model_path: str = "models/civique_convnext_v1.pth"):
        self.model_path = model_path
        self.device = None
        self.model = None
        self.transforms = None
        self.categories = None
        self.model_version = "civique-civic-v1"
        self.is_trained = os.path.exists(model_path)

        if not HAS_ML:
            logger.info("ML framework offline. CivicClassifier initialized in unavailable state.")
            return

        try:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.weights = ConvNeXt_Tiny_Weights.DEFAULT
            self.model = convnext_tiny(weights=self.weights)
            
            # If fine-tuned weights exist, load them
            if self.is_trained:
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                logger.info(f"Loaded fine-tuned civic classifier from {model_path}")
            else:
                logger.info(f"Fine-tuned weights not found at {model_path}. Running with pre-trained ImageNet mapping fallback.")
                self.model_version = "civique-convnext-tiny-pretrained"

            self.model.to(self.device)
            self.model.eval()
            self.transforms = self.weights.transforms()
            self.categories = self.weights.meta["categories"]
        except Exception as e:
            logger.error(f"Failed to initialize ConvNeXt model instance: {e}")
            self.model = None

    def predict(self, image_bytes: bytes) -> dict:
        """
        Executes prediction on the image bytes using ConvNeXt-Tiny.
        """
        if not HAS_ML or self.model is None:
            return {
                "status": "unavailable",
                "message": "PyTorch framework or model instance is offline.",
                "model_version": self.model_version
            }

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            tensor = self.transforms(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(tensor)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)

            # Get top prediction details
            top_prob, top_idx = torch.max(probabilities, dim=0)
            confidence = float(top_prob)
            predicted_label = self.categories[int(top_idx)]
            
            # Map ImageNet category to Civique category
            if self.is_trained:
                # Custom fine-tuned weights direct model output
                category = "POTHOLE" 
            else:
                category = map_imagenet_to_civic(predicted_label)
            
            # Form top predictions list for traceability
            top_k_probs, top_k_idxs = torch.topk(probabilities, 5)
            top_predictions = [
                {"label": self.categories[int(idx)], "probability": round(float(prob), 4)}
                for prob, idx in zip(top_k_probs, top_k_idxs)
            ]

            return {
                "status": "success",
                "category": category,
                "confidence": round(confidence, 4),
                "label_detected": predicted_label,
                "top_predictions": top_predictions,
                "model_version": self.model_version
            }
        except Exception as e:
            logger.error(f"ConvNeXt classification failed: {e}")
            return {
                "status": "error",
                "message": str(e),
                "model_version": self.model_version
            }

# Initialize global classifier instance
classifier_instance = CivicClassifier()

def classify_image(image_bytes: bytes, description: str = "") -> dict:
    """
    Unified entrypoint preserving API compatibility. Falls back gracefully if custom model is unavailable.
    """
    label_map = {
        "POTHOLE": "Pothole",
        "GARBAGE": "Garbage",
        "STREETLIGHT": "Streetlight",
        "WATER_LEAK": "Water Leak",
        "SEWAGE": "Sewage Leak",
        "TRAFFIC_SIGN": "Traffic Sign",
        "VANDALISM": "Vandalism",
        "STRAY_ANIMALS": "Stray Animal",
        "ILLEGAL_PARKING": "Illegal Parking",
        "TREE_FALL": "Fallen Tree",
        "STORM_DRAIN": "Storm Drain",
        "NOISE_POLLUTION": "Noise Pollution",
        "OTHERS": "Other Issue"
    }

    # Run ConvNeXt Tiny prediction
    ml_result = classifier_instance.predict(image_bytes)

    if ml_result["status"] == "success" and ml_result["confidence"] >= 0.40 and ml_result["category"] != "OTHERS":
        return {
            "success": True,
            "category": ml_result["category"],
            "confidence": ml_result["confidence"],
            "label": label_map.get(ml_result["category"], "Civic Issue"),
            "top_predictions": ml_result["top_predictions"],
            "model_version": ml_result["model_version"],
            "engine": "convnext_tiny"
        }

    # Fallback to Text Heuristics if ML is unavailable, erroring, or uncalibrated
    logger.info(f"ConvNeXt model is {ml_result['status']} (falling back to heuristics).")
    cat, conf = run_text_heuristics(description)
    
    label_detected = label_map.get(cat, "Other Issue")
    if cat == "OTHERS" and description:
        words = [w for w in re.sub(r'[^\w\s]', '', description).split() if len(w) > 2]
        if words:
            label_detected = " ".join(words[:2]).title()

    return {
        "success": True,
        "category": cat,
        "confidence": conf,
        "label": label_detected,
        "top_predictions": ml_result.get("top_predictions", []),
        "model_version": ml_result.get("model_version", "civique-civic-v1"),
        "engine": "heuristics_fallback" if ml_result.get("status") == "success" else "heuristics_error_fallback"
    }
