import torch
import torch.nn as nn
import torchvision.models as models

class PillEmbeddingNet(nn.Module):
    """
    Siamese Network for Hierarchical Pharmaceutical Recognition.
    In the MedGuardian pipeline, this model focuses on the "Sub-Object DNA"—extracting 
    high-entropy features from pills, strips, or blister packs that containers (bottles/boxes) 
    cannot provide alone. It provides the final Stage-4 verification layer.
    """
    def __init__(self, embedding_dim=128):
        super(PillEmbeddingNet, self).__init__()
        
        # Load pre-trained ResNet50
        self.resnet = models.resnet50(pretrained=True)
        
        # Replace the final fully connected layer
        # ResNet50's last layer has 2048 input features
        in_features = self.resnet.fc.in_features
        self.resnet.fc = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, embedding_dim),
            nn.LayerNorm(embedding_dim) # Ensures stable embeddings
        )
        
    def forward(self, x):
        return self.resnet(x)

def get_siamese_model(embedding_dim=128):
    return PillEmbeddingNet(embedding_dim)

if __name__ == "__main__":
    # Test Architecture
    model = get_siamese_model()
    dummy_input = torch.randn(1, 3, 224, 224)
    output = model(dummy_input)
    print(f"✅ Siamese Model Initialized.")
    print(f"✅ Output Embedding Shape: {output.shape}")
