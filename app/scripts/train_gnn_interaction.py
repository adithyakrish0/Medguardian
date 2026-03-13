import torch
import torch.nn.functional as F
from torch_geometric.data import Data
import numpy as np
import sys
import os
import pickle
import logging

# Add app to path
sys.path.append(os.getcwd())
from app.utils.interaction_checker import DRUG_INTERACTIONS
from app.ml.gnn_interaction_detector import DrugInteractionGNN, EdgePredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Feature mappings for ~200 drugs (Simplified representation)
# In production, this would come from a medical database or LLM extraction
DRUG_METADATA = {
    'warfarin': {'class': 'anticoagulant', 'target': 'vitamin_k', 'mw': 308.3},
    'aspirin': {'class': 'nsaid', 'target': 'cox', 'mw': 180.1},
    'ibuprofen': {'class': 'nsaid', 'target': 'cox', 'mw': 206.3},
    'omeprazole': {'class': 'ppi', 'target': 'proton_pump', 'mw': 345.4},
    'rivaroxaban': {'class': 'anticoagulant', 'target': 'factor_xa', 'mw': 435.9},
    'metoprolol': {'class': 'beta_blocker', 'target': 'beta_adrenergic', 'mw': 267.4},
    'lisinopril': {'class': 'ace_inhibitor', 'target': 'ace', 'mw': 405.5},
    'sildenafil': {'class': 'pde5_inhibitor', 'target': 'pde5', 'mw': 474.6},
    'nitroglycerin': {'class': 'nitrate', 'target': 'gc', 'mw': 227.1},
    'simvastatin': {'class': 'statin', 'target': 'hmg_coa', 'mw': 418.6},
    'amlodipine': {'class': 'ccb', 'target': 'calcium_channel', 'mw': 408.9},
    'metformin': {'class': 'biguanide', 'target': 'ampk', 'mw': 129.2},
    'insulins': {'class': 'insulin', 'target': 'insulin_receptor', 'mw': 5808.0},
    'sertraline': {'class': 'ssri', 'target': 'ser_transporter', 'mw': 306.2},
}

def get_feature_vector(drug_name):
    meta = DRUG_METADATA.get(drug_name.lower(), {'class': 'unknown', 'target': 'unknown', 'mw': 300.0})
    
    # 1. One-hot encode class (approx 20 classes)
    classes = sorted(list(set([m['class'] for m in DRUG_METADATA.values()] + ['unknown'])))
    class_idx = classes.index(meta['class'])
    class_onehot = [0] * len(classes)
    class_onehot[class_idx] = 1
    
    # 2. One-hot encode targets
    targets = sorted(list(set([m['target'] for m in DRUG_METADATA.values()] + ['unknown'])))
    target_idx = targets.index(meta['target'])
    target_onehot = [0] * len(targets)
    target_onehot[target_idx] = 1
    
    # 3. Normalized Molecular Weight
    mw_norm = [min(meta['mw'] / 1000.0, 1.0)]
    
    return class_onehot + target_onehot + mw_norm

def train_gnn():
    # 1. Identify all drugs in our 60 pairs
    drugs = set()
    for interaction in DRUG_INTERACTIONS:
        drugs.add(interaction['medication1'].lower())
        drugs.add(interaction['medication2'].lower())
    
    drug_list = sorted(list(drugs))
    drug_to_idx = {d: i for i, d in enumerate(drug_list)}
    
    # 2. Build feature matrix
    X = []
    for drug in drug_list:
        X.append(get_feature_vector(drug))
    X = torch.tensor(X, dtype=torch.float)
    in_features = X.shape[1]
    
    # 3. Build edge index and target labels
    edge_index = []
    edge_attr = [] # Severity
    
    severity_map = {'critical': 4, 'major': 3, 'moderate': 2, 'minor': 1}
    
    for interaction in DRUG_INTERACTIONS:
        u = drug_to_idx[interaction['medication1'].lower()]
        v = drug_to_idx[interaction['medication2'].lower()]
        sev = severity_map.get(interaction['severity'], 1)
        
        # Undirected graph
        edge_index.append([u, v])
        edge_index.append([v, u])
        edge_attr.append(sev)
        edge_attr.append(sev)
        
    edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()
    edge_attr = torch.tensor(edge_attr, dtype=torch.float)
    
    data = Data(x=X, edge_index=edge_index, y=edge_attr)
    
    # 4. Train
    model = DrugInteractionGNN(in_features)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    model.train()
    for epoch in range(200):
        optimizer.zero_grad()
        out_embeddings = model(data.x, data.edge_index)
        
        # Predict severity for EACH edge
        u_idx = data.edge_index[0]
        v_idx = data.edge_index[1]
        
        preds = model.edge_predictor(out_embeddings[u_idx], out_embeddings[v_idx])
        
        # Use cross entropy for the severity classes (0-4)
        targets = data.y.long() # severity scores
        loss = F.cross_entropy(preds, targets)
        
        loss.backward()
        optimizer.step()
        
        if epoch % 20 == 0:
            logger.info(f"Epoch {epoch}, Loss: {loss.item():.4f}")
            
    # 5. Save
    model_dir = 'app/models/saved'
    os.makedirs(model_dir, exist_ok=True)
    torch.save(model.state_dict(), os.path.join(model_dir, 'gnn_interaction_model.pt'))
    
    from datetime import datetime
    meta = {
        'drug_to_idx': drug_to_idx,
        'drug_features_map': {d: get_feature_vector(d) for d in drug_list},
        'in_features': in_features,
        'trained_at': str(datetime.now())
    }
    with open(os.path.join(model_dir, 'gnn_interaction_meta.pkl'), 'wb') as f:
        pickle.dump(meta, f)
        
    logger.info("GNN Training complete and saved.")

if __name__ == "__main__":
    train_gnn()
