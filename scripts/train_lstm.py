"""
LSTM Autoencoder Training Script for MedGuardian Anomaly Detection

Generates synthetic medication adherence data and trains a reconstruction-based
LSTM autoencoder on PyTorch. Saves model weights, fitted scaler, and anomaly
threshold for use by the runtime detector.

Usage:
    $env:PYTHONPATH="."; python scripts/train_lstm.py

Requirements:
    pip install torch scikit-learn numpy
"""

import os
import json
import pickle
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import MinMaxScaler

# ── Paths ─────────────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'app', 'ml', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'lstm_anomaly_model.pth')
SCALER_PATH = os.path.join(MODEL_DIR, 'lstm_scaler.pkl')
THRESHOLD_PATH = os.path.join(MODEL_DIR, 'lstm_threshold.json')

# ── Hyperparameters ───────────────────────────────────────────────────────────
N_PATIENTS = 1000
SEQ_LEN = 30          # timesteps per sequence
N_FEATURES = 6        # features per timestep
ANOMALY_FRAC = 0.15   # fraction of sequences that are anomalous
EPOCHS = 50
BATCH_SIZE = 32
LR = 1e-3


# ── Synthetic Data Generation ─────────────────────────────────────────────────

def generate_normal_sequence() -> np.ndarray:
    """
    Generate a single normal 30-day medication adherence sequence.

    Features:
        0: hour_of_day (0-23)
        1: day_of_week (0-6)
        2: scheduled_vs_taken_delta (minutes, ±60 typical)
        3: dose_taken (0 or 1)
        4: consecutive_missed (0-7)
        5: rolling_7day_adherence (0.0-1.0)
    """
    seq = np.zeros((SEQ_LEN, N_FEATURES))

    # Consistent medication hour (± small jitter)
    base_hour = np.random.uniform(6, 22)  # typical schedule hour
    consecutive_missed = 0
    taken_history = []

    for t in range(SEQ_LEN):
        # Hour of day — slight daily variation around base
        hour = base_hour + np.random.normal(0, 0.5)
        hour = np.clip(hour, 0, 23)

        # Day of week (cyclic through 30 days)
        dow = t % 7

        # Dose taken — 85-95% compliance for normal patients
        taken = 1 if np.random.random() < np.random.uniform(0.85, 0.95) else 0
        taken_history.append(taken)

        # Delta (minutes early/late) — normal is within ±60 min
        if taken:
            delta = np.random.normal(0, 15)  # mostly on time
            delta = np.clip(delta, -60, 60)
            consecutive_missed = 0
        else:
            delta = 0
            consecutive_missed = min(consecutive_missed + 1, 7)

        # Rolling 7-day adherence
        window = taken_history[-7:]
        rolling_adherence = sum(window) / len(window)

        seq[t] = [hour, dow, delta, taken, consecutive_missed, rolling_adherence]

    return seq


def generate_anomalous_sequence() -> np.ndarray:
    """
    Generate a single anomalous 30-day sequence with one or more of:
    - 3+ consecutive misses
    - Doses at wrong hours (e.g., 3 AM instead of 9 AM)
    - Sudden adherence drop
    """
    seq = np.zeros((SEQ_LEN, N_FEATURES))

    # Pick anomaly type(s)
    anomaly_type = np.random.choice(['consecutive_miss', 'wrong_hours', 'adherence_drop'])

    base_hour = np.random.uniform(6, 22)
    consecutive_missed = 0
    taken_history = []

    for t in range(SEQ_LEN):
        dow = t % 7

        if anomaly_type == 'consecutive_miss':
            # Normal first 15 days, then 5+ consecutive misses
            if t < 15:
                taken = 1 if np.random.random() < 0.9 else 0
                hour = base_hour + np.random.normal(0, 0.5)
            elif t < 20:
                taken = 0  # consecutive miss block
                hour = base_hour
            else:
                taken = 1 if np.random.random() < 0.6 else 0
                hour = base_hour + np.random.normal(0, 2)

        elif anomaly_type == 'wrong_hours':
            taken = 1 if np.random.random() < 0.8 else 0
            if t >= 10:
                # Shift to very different hours (e.g., 3 AM, or 6-hour swings)
                hour = (base_hour + np.random.choice([12, -12, 15])) % 24
                hour += np.random.normal(0, 1)
            else:
                hour = base_hour + np.random.normal(0, 0.5)

        elif anomaly_type == 'adherence_drop':
            if t < 12:
                taken = 1 if np.random.random() < 0.92 else 0
                hour = base_hour + np.random.normal(0, 0.5)
            else:
                taken = 1 if np.random.random() < 0.3 else 0  # sharp drop
                hour = base_hour + np.random.normal(0, 3)
        else:
            taken = 1
            hour = base_hour

        hour = np.clip(hour, 0, 23)
        taken_history.append(taken)

        if taken:
            delta = np.random.normal(0, 30)
            delta = np.clip(delta, -120, 120)
            consecutive_missed = 0
        else:
            delta = 0
            consecutive_missed = min(consecutive_missed + 1, 7)

        window = taken_history[-7:]
        rolling_adherence = sum(window) / len(window)

        seq[t] = [hour, dow, delta, taken, consecutive_missed, rolling_adherence]

    return seq


def generate_dataset(n_patients: int, anomaly_frac: float):
    """Generate a labeled dataset of normal and anomalous sequences."""
    n_anomalous = int(n_patients * anomaly_frac)
    n_normal = n_patients - n_anomalous

    sequences = []
    labels = []  # 0 = normal, 1 = anomalous

    for _ in range(n_normal):
        sequences.append(generate_normal_sequence())
        labels.append(0)

    for _ in range(n_anomalous):
        sequences.append(generate_anomalous_sequence())
        labels.append(1)

    sequences = np.array(sequences)
    labels = np.array(labels)

    # Shuffle
    idx = np.random.permutation(len(sequences))
    return sequences[idx], labels[idx]


# ── LSTM Autoencoder ──────────────────────────────────────────────────────────

class LSTMAutoencoder(nn.Module):
    """
    Encoder:  LSTM(64) → LSTM(32)
    Decoder:  RepeatVector(30) → LSTM(32, return_sequences) → LSTM(64, return_sequences) → Linear(n_features)
    """

    def __init__(self, n_features: int, seq_len: int):
        super().__init__()
        self.seq_len = seq_len
        self.n_features = n_features

        # Encoder
        self.encoder_lstm1 = nn.LSTM(n_features, 64, batch_first=True)
        self.encoder_lstm2 = nn.LSTM(64, 32, batch_first=True)

        # Decoder
        self.decoder_lstm1 = nn.LSTM(32, 32, batch_first=True)
        self.decoder_lstm2 = nn.LSTM(32, 64, batch_first=True)
        self.output_layer = nn.Linear(64, n_features)

    def forward(self, x):
        # Encode
        x, _ = self.encoder_lstm1(x)
        _, (hidden, cell) = self.encoder_lstm2(x)

        # Repeat the latent vector across seq_len
        latent = hidden.squeeze(0)                          # (batch, 32)
        repeated = latent.unsqueeze(1).repeat(1, self.seq_len, 1)  # (batch, seq_len, 32)

        # Decode
        x, _ = self.decoder_lstm1(repeated)
        x, _ = self.decoder_lstm2(x)
        x = self.output_layer(x)                            # (batch, seq_len, n_features)
        return x


# ── Training ──────────────────────────────────────────────────────────────────

def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'🔧 Device: {device}')
    if device.type == 'cuda':
        print(f'   GPU: {torch.cuda.get_device_name(0)}')

    # ── 1. Generate data ──────────────────────────────────────────────────
    print('\n📊 Generating synthetic data...')
    sequences, labels = generate_dataset(N_PATIENTS, ANOMALY_FRAC)
    print(f'   Total: {len(sequences)} sequences ({SEQ_LEN} steps × {N_FEATURES} features)')
    print(f'   Normal: {(labels == 0).sum()}, Anomalous: {(labels == 1).sum()}')

    # ── 2. Fit scaler on NORMAL data only ─────────────────────────────────
    normal_mask = labels == 0
    normal_seqs = sequences[normal_mask]

    # Reshape to 2D for scaler: (n_samples * seq_len, n_features)
    flat_normal = normal_seqs.reshape(-1, N_FEATURES)
    scaler = MinMaxScaler()
    scaler.fit(flat_normal)

    # Transform all sequences
    flat_all = sequences.reshape(-1, N_FEATURES)
    scaled_all = scaler.transform(flat_all).reshape(sequences.shape)

    # Split: train on normal only, validate on mix
    scaled_normal = scaled_all[normal_mask]
    n_train = int(len(scaled_normal) * 0.85)
    train_data = scaled_normal[:n_train]
    val_data = scaled_all[n_train:]  # includes some anomalous for threshold calibration
    val_labels = np.concatenate([
        np.zeros(len(scaled_normal) - n_train),
        labels[~normal_mask]
    ])[:len(val_data)]

    print(f'   Train: {len(train_data)} (normal only)')
    print(f'   Validation: {len(val_data)} (mixed)')

    # ── 3. DataLoaders ────────────────────────────────────────────────────
    train_tensor = torch.FloatTensor(train_data).to(device)
    train_ds = TensorDataset(train_tensor, train_tensor)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)

    # ── 4. Model ──────────────────────────────────────────────────────────
    model = LSTMAutoencoder(N_FEATURES, SEQ_LEN).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.MSELoss()

    print(f'\n🏗️  Model architecture:')
    total_params = sum(p.numel() for p in model.parameters())
    print(f'   Parameters: {total_params:,}')
    print(f'   Encoder: LSTM({N_FEATURES}→64) → LSTM(64→32)')
    print(f'   Decoder: Repeat({SEQ_LEN}) → LSTM(32→32) → LSTM(32→64) → Dense(64→{N_FEATURES})')

    # ── 5. Train ──────────────────────────────────────────────────────────
    print(f'\n🚀 Training for {EPOCHS} epochs...')
    for epoch in range(1, EPOCHS + 1):
        model.train()
        epoch_loss = 0.0
        n_batches = 0

        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            output = model(batch_x)
            loss = criterion(output, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            n_batches += 1

        avg_loss = epoch_loss / n_batches

        if epoch % 10 == 0 or epoch == 1:
            print(f'   Epoch {epoch:3d}/{EPOCHS}  Loss: {avg_loss:.6f}')

    # ── 6. Compute threshold on validation set ────────────────────────────
    print('\n📏 Computing anomaly threshold...')
    model.eval()
    val_tensor = torch.FloatTensor(val_data).to(device)

    with torch.no_grad():
        reconstructed = model(val_tensor)
        errors = torch.mean((val_tensor - reconstructed) ** 2, dim=(1, 2)).cpu().numpy()

    threshold = float(np.percentile(errors, 95))
    print(f'   95th percentile threshold: {threshold:.6f}')
    print(f'   Error range: [{errors.min():.6f}, {errors.max():.6f}]')
    print(f'   Mean error (normal): {errors[:len(scaled_normal) - n_train].mean():.6f}')

    # ── 7. Save artifacts ─────────────────────────────────────────────────
    print('\n💾 Saving artifacts...')

    # Model weights
    torch.save(model.state_dict(), MODEL_PATH)
    print(f'   Model: {MODEL_PATH}')

    # Scaler
    with open(SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)
    print(f'   Scaler: {SCALER_PATH}')

    # Threshold
    with open(THRESHOLD_PATH, 'w') as f:
        json.dump({'threshold': threshold}, f, indent=2)
    print(f'   Threshold: {THRESHOLD_PATH}')

    print(f'\n✅ Done! Threshold = {threshold:.6f}')
    print(f'   To use: the LSTM detector in anomaly_detector.py will auto-load these files.')


if __name__ == '__main__':
    main()
