import sys, os
sys.path.insert(0, '.')
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch_geometric.data import Data
import numpy as np
import pickle
import datetime

# Import the actual classes from the project
from app.ml.gnn_interaction_detector import DrugInteractionGNN

print("🧬 Training GNN Drug Interaction Model...")

# Use CPU for training to avoid any device mismatch issues in this environment
device = torch.device('cpu') 
print(f"   Device: {device}")

# Drug interaction training data
drug_pairs = [
    ("Aspirin", "Warfarin", 3),
    ("Aspirin", "Lisinopril", 2),
    ("Aspirin", "Amlodipine", 1),
    ("Metformin", "Omeprazole", 1),
    ("Atorvastatin", "Amlodipine", 1),
    ("Lisinopril", "Amlodipine", 0),
    ("Metformin", "Lisinopril", 0),
    ("Warfarin", "Omeprazole", 2),
    ("Warfarin", "Atorvastatin", 2),
    ("Aspirin", "Metformin", 0),
    ("Lisinopril", "Atorvastatin", 0),
    ("Omeprazole", "Amlodipine", 0),
    ("Vitamin D3", "Calcium", 0),
    ("Warfarin", "Aspirin", 3),
    ("Digoxin", "Amiodarone", 4),
    ("Simvastatin", "Amiodarone", 3),
    ("Metoprolol", "Verapamil", 3),
    ("Clopidogrel", "Omeprazole", 2),
    ("Fluoxetine", "Tramadol", 2),
    ("Ciprofloxacin", "Warfarin", 2),
    ("Calcium", "Lisinopril", 0),
    ("Vitamin D3", "Amlodipine", 0),
    ("Aspirin", "Omeprazole", 0),
    ("Metformin", "Amlodipine", 0),
    ("Atorvastatin", "Omeprazole", 0),
]

all_drugs = list(set([p[0].lower() for p in drug_pairs] + [p[1].lower() for p in drug_pairs]))
drug_to_idx = {d: i for i, d in enumerate(all_drugs)}
n_drugs = len(all_drugs)

drug_features_map = {
    "aspirin": [1,0,0,0,0,0,0,0],
    "warfarin": [1,0,0,0,0,0,0,0],
    "metformin": [0,1,0,0,0,0,0,0],
    "lisinopril": [0,0,1,0,0,0,0,0],
    "amlodipine": [0,0,1,0,0,0,0,0],
    "atorvastatin": [0,0,0,1,0,0,0,0],
    "omeprazole": [0,0,0,0,1,0,0,0],
    "vitamin d3": [0,0,0,0,0,1,0,0],
    "calcium": [0,0,0,0,0,1,0,0],
    "digoxin": [0,0,0,0,0,0,0,1],
    "amiodarone": [0,0,0,0,0,0,0,1],
    "simvastatin": [0,0,0,1,0,0,0,0],
    "metoprolol": [0,0,1,0,0,0,0,0],
    "verapamil": [0,0,1,0,0,0,0,0],
    "clopidogrel": [1,0,0,0,0,0,0,0],
    "fluoxetine": [0,0,0,0,0,0,0,0],
    "tramadol": [0,0,0,0,0,0,0,0],
    "ciprofloxacin": [0,0,0,0,0,0,1,0],
}

in_features = 8
x = torch.zeros(n_drugs, in_features, dtype=torch.float)
for drug, idx in drug_to_idx.items():
    feats = drug_features_map.get(drug, [0]*in_features)
    x[idx] = torch.tensor(feats, dtype=torch.float)

edge_list = []
edge_labels_list = []
for drug1, drug2, severity in drug_pairs:
    i, j = drug_to_idx[drug1.lower()], drug_to_idx[drug2.lower()]
    edge_list.append([i, j])
    edge_labels_list.append(severity)
    edge_list.append([j, i])
    edge_labels_list.append(severity)

edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
edge_labels = torch.tensor(edge_labels_list, dtype=torch.long)

# Create model on CPU
model = DrugInteractionGNN(in_features=in_features).to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

print(f"   Drugs: {n_drugs}, Interactions: {len(drug_pairs)}")
print(f"   Training for 300 epochs...")

model.train()
for epoch in range(300):
    optimizer.zero_grad()
    embeddings = model(x, edge_index)
    
    node_i = edge_index[0]
    node_j = edge_index[1]
    
    logits = model.edge_predictor(embeddings[node_i], embeddings[node_j])
    loss = F.cross_entropy(logits, edge_labels)
    
    loss.backward()
    optimizer.step()
    
    if (epoch + 1) % 50 == 0:
        print(f"   Epoch {epoch+1}/300  Loss: {loss.item():.4f}")

os.makedirs('app/models/saved', exist_ok=True)
save_path = 'app/models/saved/gnn_interaction_model.pt'

torch.save({
    'model_state_dict': model.state_dict(),
    'drug_to_idx': drug_to_idx,
    'drug_features_map': drug_features_map,
    'in_features': in_features,
    'trained_at': datetime.datetime.utcnow().isoformat()
}, save_path)

print(f"\n✅ GNN model saved to {save_path}")
