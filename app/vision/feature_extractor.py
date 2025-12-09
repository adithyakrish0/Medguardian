"""
Feature Extractor for Visual Similarity
Uses ResNet18 to extract feature embeddings and cosine similarity for comparison.
Supports multi-angle reference images for robust matching.
"""
import numpy as np
import cv2
import base64
import json
from typing import List, Optional, Tuple
import torch
import torchvision.transforms as transforms
from PIL import Image
import io

# Lazy load model to avoid startup delay
_feature_model = None
_transform = None

def get_feature_model():
    """Get or load the pretrained ResNet18 model for feature extraction"""
    global _feature_model, _transform
    
    if _feature_model is None:
        try:
            import torchvision.models as models
            
            # Use ResNet18 - lightweight but effective
            _feature_model = models.resnet18(pretrained=True)
            # Remove the final classification layer to get features
            _feature_model = torch.nn.Sequential(*list(_feature_model.children())[:-1])
            _feature_model.eval()
            
            # Standard ImageNet preprocessing
            _transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])
            
            print("✅ Feature extractor (ResNet18) loaded successfully")
        except Exception as e:
            print(f"⚠️ Feature extractor failed to load: {e}")
            return None, None
    
    return _feature_model, _transform


def extract_features(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Extract feature vector from an image using ResNet18.
    
    Args:
        image: OpenCV image (BGR format)
        
    Returns:
        512-dimensional feature vector as numpy array, or None on failure
    """
    model, transform = get_feature_model()
    if model is None:
        return None
    
    try:
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        pil_image = Image.fromarray(rgb_image)
        
        # Apply transforms
        tensor = transform(pil_image).unsqueeze(0)
        
        # Extract features
        with torch.no_grad():
            features = model(tensor)
        
        # Flatten and convert to numpy
        feature_vector = features.flatten().numpy()
        
        return feature_vector
        
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return None


def extract_features_from_base64(base64_image: str) -> Optional[np.ndarray]:
    """Extract features from a base64 encoded image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_image:
            base64_image = base64_image.split(',')[1]
        
        # Decode
        image_bytes = base64.b64decode(base64_image)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        return extract_features(image)
        
    except Exception as e:
        print(f"Base64 feature extraction error: {e}")
        return None


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Calculate cosine similarity between two feature vectors.
    
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if vec1 is None or vec2 is None:
        return 0.0
    
    # Normalize vectors
    vec1_norm = vec1 / (np.linalg.norm(vec1) + 1e-8)
    vec2_norm = vec2 / (np.linalg.norm(vec2) + 1e-8)
    
    # Dot product of normalized vectors = cosine similarity
    similarity = np.dot(vec1_norm, vec2_norm)
    
    # Clamp to [0, 1] range
    return float(max(0.0, min(1.0, similarity)))


def compare_to_references(
    live_image: np.ndarray,
    reference_images_json: str,
    background_image_base64: Optional[str] = None
) -> Tuple[float, int]:
    """
    Compare a live image to multiple reference images.
    Optionally uses background subtraction to focus on the actual object.
    
    Args:
        live_image: Current camera frame (OpenCV BGR)
        reference_images_json: JSON array of base64 reference images
        background_image_base64: Optional background-only image for subtraction
        
    Returns:
        Tuple of (best_similarity_score, best_angle_index)
    """
    try:
        # Parse reference images
        reference_images = json.loads(reference_images_json)
        
        if not reference_images:
            return 0.0, -1
        
        # Extract features from live image
        live_features = extract_features(live_image)
        if live_features is None:
            return 0.0, -1
        
        # If background image is provided, extract its features for subtraction
        background_features = None
        if background_image_base64:
            background_features = extract_features_from_base64(background_image_base64)
            if background_features is not None:
                print("🔍 Using background subtraction for comparison")
        
        best_score = 0.0
        best_index = -1
        
        # Compare to each reference angle
        for i, ref_base64 in enumerate(reference_images):
            ref_features = extract_features_from_base64(ref_base64)
            if ref_features is not None:
                if background_features is not None:
                    # Subtract background from both live and reference
                    # This emphasizes the differences (the medication)
                    live_diff = live_features - background_features
                    ref_diff = ref_features - background_features
                    score = cosine_similarity(live_diff, ref_diff)
                else:
                    # Traditional direct comparison
                    score = cosine_similarity(live_features, ref_features)
                    
                if score > best_score:
                    best_score = score
                    best_index = i
        
        print(f"Visual similarity: best={best_score:.2%} from angle {best_index}{' (bg-subtracted)' if background_features is not None else ''}")
        return best_score, best_index
        
    except Exception as e:
        print(f"Reference comparison error: {e}")
        return 0.0, -1


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate Levenshtein (edit) distance between two strings.
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]


def fuzzy_match(text: str, target: str, tolerance: int = 2) -> bool:
    """
    Check if text fuzzy-matches target within tolerance.
    
    Args:
        text: OCR detected text
        target: Expected medication name
        tolerance: Maximum edit distance allowed
        
    Returns:
        True if match within tolerance
    """
    text = text.lower().strip()
    target = target.lower().strip()
    
    # Direct substring match
    if target in text or text in target:
        return True
    
    # Levenshtein distance for short strings
    if len(target) >= 4:
        distance = levenshtein_distance(text, target)
        if distance <= tolerance:
            return True
    
    # Word-level matching
    text_words = set(text.split())
    target_words = set(target.split())
    
    # Check if any target word appears in text
    for tw in target_words:
        if len(tw) >= 3:
            for txtw in text_words:
                if tw in txtw or levenshtein_distance(tw, txtw) <= 1:
                    return True
    
    return False
