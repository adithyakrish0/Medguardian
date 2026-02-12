import torch
import torchvision.transforms as transforms
from PIL import Image
import io
import base64
import numpy as np
import logging
import os

# Import our research model
from research.training.pill_embedding_model import PillEmbeddingNet

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    SOTA Deep Metric Learning Service.
    Uses the ResNet50 Siamese Network trained on the 125k NIH Pill Dataset.
    """
    
    def __init__(self, model_path='app/services/models/pill_metric_model.pth'):
        self.available = False
        try:
            # Initialize our custom Siamese Architecture
            self.model = PillEmbeddingNet(embedding_dim=128)
            
            # Load weights if available
            if os.path.exists(model_path):
                # Using weights_only=False carefully for our own .pth
                self.model.load_state_dict(torch.load(model_path, map_location='cpu'))
                logger.info(f"Siamese Metric Model loaded from {model_path}")
            else:
                logger.warning(f"Siamese weights not found at {model_path}. Using pre-trained ResNet-50 features.")
                
            self.model.eval()
            
            # Standard ImageNet normalization matching training
            self.preprocess = transforms.Compose([
                transforms.Resize(224),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            self.available = True
            logger.info("Deep Metric Learning Service (ResNet50-Siamese) Initialized.")
        except Exception as e:
            logger.error(f"Failed to init Embedding Service: {e}")

    def extract_embedding(self, image_base64: str) -> list:
        """Extract a 128-d metric embedding from a base64 image."""
        if not self.available:
            return None
            
        try:
            # Decode base64 to PIL Image
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            image_data = base64.b64decode(image_base64)
            img = Image.open(io.BytesIO(image_data)).convert('RGB')
            
            # Preprocess and Forward Pass
            input_tensor = self.preprocess(img).unsqueeze(0)
            with torch.no_grad():
                features = self.model(input_tensor)
            
            # Flatten to list (128 dimensions)
            embedding = features.squeeze().numpy().tolist()
            return embedding
        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            return None

    @staticmethod
    def cosine_similarity(v1, v2):
        """Calculate cosine similarity between two feature vectors."""
        if v1 is None or v2 is None:
            return 0.0
        vec1 = np.array(v1)
        vec2 = np.array(v2)
        
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 < 1e-6 or norm2 < 1e-6:
            return 0.0
            
        sim = np.dot(vec1, vec2) / (norm1 * norm2)
        return float(sim)

# Singleton
embedding_service = EmbeddingService()
