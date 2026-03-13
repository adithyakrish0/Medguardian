import numpy as np
import os
import json
import logging
import pickle
from datetime import datetime, timedelta
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# ── Optional heavy imports ────────────────────────────────────────────────────

# PyTorch (preferred — global model)
try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("⚠️  PyTorch not available — PyTorch LSTM anomaly detection disabled")

# TensorFlow (legacy per-patient models)
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import LSTM as KerasLSTM, Dense, RepeatVector, TimeDistributed
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger.info("TensorFlow not available — legacy per-patient LSTM disabled (non-blocking)")


# ── PyTorch Model Definition (must match scripts/train_lstm.py) ───────────────

if TORCH_AVAILABLE:
    class LSTMAutoencoder(nn.Module):
        def __init__(self, n_features: int, seq_len: int):
            super().__init__()
            self.seq_len = seq_len
            self.n_features = n_features
            self.encoder_lstm1 = nn.LSTM(n_features, 64, batch_first=True)
            self.encoder_lstm2 = nn.LSTM(64, 32, batch_first=True)
            self.decoder_lstm1 = nn.LSTM(32, 32, batch_first=True)
            self.decoder_lstm2 = nn.LSTM(32, 64, batch_first=True)
            self.output_layer = nn.Linear(64, n_features)

        def forward(self, x):
            x, _ = self.encoder_lstm1(x)
            _, (hidden, _) = self.encoder_lstm2(x)
            latent = hidden.squeeze(0)
            repeated = latent.unsqueeze(1).repeat(1, self.seq_len, 1)
            x, _ = self.decoder_lstm1(repeated)
            x, _ = self.decoder_lstm2(x)
            x = self.output_layer(x)
            return x


# ── Detector ──────────────────────────────────────────────────────────────────

class LSTMAnomalyDetector:
    """
    LSTM Autoencoder for time-series anomaly detection in medication adherence.

    Two modes:
    1. Global PyTorch model (preferred) — trained by scripts/train_lstm.py
       Architecture: Input (30, 6) -> LSTM(64) -> LSTM(32) ->
                     RepeatVector(30) -> LSTM(32) -> LSTM(64) -> Dense(6)
    2. Per-patient TensorFlow model (legacy fallback)
       Architecture: Input (7, 11) -> ...
    """

    # Global model config
    GLOBAL_SEQ_LEN = 30
    GLOBAL_N_FEATURES = 6

    # Legacy per-patient config
    LEGACY_FEATURE_DIM = 11
    LEGACY_WINDOW_SIZE = 7

    def __init__(self, model_dir: str = None):
        if model_dir is None:
            model_dir = os.path.join(
                os.path.dirname(__file__), 'models'
            )
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

        # Legacy TF compat — also check old path
        self.legacy_model_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'models', 'saved'
        )

        # ── Load global PyTorch model ─────────────────────────────────────
        self._global_model = None
        self._global_scaler = None
        self._global_threshold = None
        self._global_device = None
        self._load_global_model()

    # ── Global model loading ──────────────────────────────────────────────

    def _load_global_model(self):
        """Attempt to load the trained PyTorch global model, scaler, and threshold."""
        if not TORCH_AVAILABLE:
            logger.info("PyTorch unavailable — skipping global model load")
            return

        model_path = os.path.join(self.model_dir, 'lstm_anomaly_model.pth')
        scaler_path = os.path.join(self.model_dir, 'lstm_scaler.pkl')
        threshold_path = os.path.join(self.model_dir, 'lstm_threshold.json')

        if not all(os.path.exists(p) for p in [model_path, scaler_path, threshold_path]):
            logger.info("Global LSTM model files not found — run scripts/train_lstm.py first")
            return

        try:
            self._global_device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

            # Load model
            model = LSTMAutoencoder(self.GLOBAL_N_FEATURES, self.GLOBAL_SEQ_LEN)
            model.load_state_dict(torch.load(model_path, map_location=self._global_device))
            model.to(self._global_device)
            model.eval()
            self._global_model = model

            # Load scaler
            with open(scaler_path, 'rb') as f:
                self._global_scaler = pickle.load(f)

            # Load threshold
            with open(threshold_path, 'r') as f:
                data = json.load(f)
                self._global_threshold = data['threshold']

            logger.info(f"✅ Global PyTorch LSTM loaded (threshold={self._global_threshold:.6f}, device={self._global_device})")

        except Exception as e:
            logger.error(f"Failed to load global LSTM model: {e}")
            self._global_model = None

    @property
    def available(self) -> bool:
        return self._global_model is not None or TENSORFLOW_AVAILABLE

    @property
    def global_available(self) -> bool:
        return self._global_model is not None

    # ── Preprocessing for global model ────────────────────────────────────

    def _preprocess_for_global(self, logs: List[Dict]) -> Optional[np.ndarray]:
        """
        Convert raw logs into a (1, 30, 6) array for the global model.

        Features (must match scripts/train_lstm.py):
            0: hour_of_day (0-23)
            1: day_of_week (0-6)
            2: scheduled_vs_taken_delta (minutes)
            3: dose_taken (0 or 1)
            4: consecutive_missed (0-7)
            5: rolling_7day_adherence (0.0-1.0)
        """
        if len(logs) < self.GLOBAL_SEQ_LEN:
            return None

        sorted_logs = sorted(logs, key=lambda x: x.get('scheduled_time', x.get('taken_at', '')))
        # Take last 30 entries
        recent = sorted_logs[-self.GLOBAL_SEQ_LEN:]

        features = []
        consecutive_missed = 0
        taken_history: List[int] = []

        for log in recent:
            # Parse times
            sched = log.get('scheduled_time')
            taken_at = log.get('taken_at')
            if isinstance(sched, str):
                sched = datetime.fromisoformat(sched.replace('Z', '+00:00'))
            if isinstance(taken_at, str):
                taken_at = datetime.fromisoformat(taken_at.replace('Z', '+00:00'))

            # Hour of day
            ref_time = taken_at or sched
            hour = ref_time.hour + ref_time.minute / 60 if ref_time else 12.0

            # Day of week
            dow = ref_time.weekday() if ref_time else 0

            # Dose taken
            status = log.get('status', '')
            taken = 1 if status == 'verified' else 0
            taken_history.append(taken)

            # Delta (minutes)
            if taken and sched and taken_at:
                delta = (taken_at - sched).total_seconds() / 60
                delta = max(-120, min(120, delta))
                consecutive_missed = 0
            else:
                delta = 0
                if not taken:
                    consecutive_missed = min(consecutive_missed + 1, 7)

            # Rolling 7-day adherence
            window = taken_history[-7:]
            rolling = sum(window) / len(window)

            features.append([hour, dow, delta, taken, consecutive_missed, rolling])

        return np.array(features).reshape(1, self.GLOBAL_SEQ_LEN, self.GLOBAL_N_FEATURES)

    # ── Legacy preprocessing (TF per-patient) ─────────────────────────────

    def preprocess_logs(self, logs):
        """Legacy: Convert raw logs into 7-day sliding windows of 11 features."""
        if len(logs) < self.LEGACY_WINDOW_SIZE:
            return None

        sorted_logs = sorted(logs, key=lambda x: x.get('scheduled_time', x.get('taken_at', '')))
        features = []
        streak = 0

        for i, log in enumerate(sorted_logs):
            sched_time = log.get('scheduled_time')
            if isinstance(sched_time, str):
                sched_time = datetime.fromisoformat(sched_time.replace('Z', '+00:00'))
            hour_norm = sched_time.hour / 23.5 if sched_time else 0.5

            dow = [0] * 7
            if sched_time:
                dow[sched_time.weekday()] = 1

            if i > 0:
                prev_time = sorted_logs[i - 1].get('scheduled_time')
                if isinstance(prev_time, str):
                    prev_time = datetime.fromisoformat(prev_time.replace('Z', '+00:00'))
                days_since = (sched_time - prev_time).total_seconds() / (86400 * 30) if sched_time and prev_time else 0
            else:
                days_since = 0

            if log.get('status') == 'verified':
                streak += 1
            else:
                streak = 0
            streak_norm = min(streak, 30) / 30.0

            recent_statuses = [1 if l.get('status') == 'verified' else 0 for l in sorted_logs[max(0, i - 6):i + 1]]
            compliance = sum(recent_statuses) / len(recent_statuses)

            features.append([hour_norm] + dow + [days_since, streak_norm, compliance])

        X = []
        for i in range(len(features) - self.LEGACY_WINDOW_SIZE + 1):
            X.append(features[i:i + self.LEGACY_WINDOW_SIZE])

        return np.array(X) if X else None

    # ── Legacy TF per-patient training ────────────────────────────────────

    def train_for_patient(self, patient_id, logs, epochs=50):
        """Train and save a TF model for a specific patient (legacy)."""
        if not TENSORFLOW_AVAILABLE:
            logger.warning("TensorFlow not available — cannot train per-patient model")
            return False

        X = self.preprocess_logs(logs)
        if X is None:
            return False

        model = Sequential([
            KerasLSTM(64, activation='relu', input_shape=(self.LEGACY_WINDOW_SIZE, self.LEGACY_FEATURE_DIM), return_sequences=True),
            KerasLSTM(32, activation='relu', return_sequences=False),
            RepeatVector(self.LEGACY_WINDOW_SIZE),
            KerasLSTM(32, activation='relu', return_sequences=True),
            KerasLSTM(64, activation='relu', return_sequences=True),
            TimeDistributed(Dense(self.LEGACY_FEATURE_DIM))
        ])
        model.compile(optimizer='adam', loss='mse')
        model.fit(X, X, epochs=epochs, batch_size=16, validation_split=0.1, verbose=0)

        save_dir = self.legacy_model_dir
        os.makedirs(save_dir, exist_ok=True)
        model_path = os.path.join(save_dir, f'lstm_anomaly_patient_{patient_id}.h5')
        model.save(model_path)

        reconstruction = model.predict(X)
        mse = np.mean(np.power(X - reconstruction, 2), axis=(1, 2))
        threshold = float(np.percentile(mse, 95))

        meta_path = os.path.join(save_dir, f'lstm_meta_patient_{patient_id}.pkl')
        with open(meta_path, 'wb') as f:
            pickle.dump({'threshold': threshold, 'trained_at': datetime.utcnow()}, f)

        logger.info(f"LSTM model trained for patient {patient_id}. Threshold: {threshold:.6f}")
        return True

    # ── Prediction ────────────────────────────────────────────────────────

    def predict(self, patient_id: int, recent_logs: List[Dict]) -> Dict:
        """
        Predict anomaly using the best available model:
        1. Global PyTorch model (preferred)
        2. Per-patient TF model (fallback)
        """
        # ── Try global PyTorch model first ────────────────────────────────
        if self._global_model is not None:
            result = self._predict_global(recent_logs)
            if result is not None:
                return result

        # ── Fallback to per-patient TF model ──────────────────────────────
        return self._predict_legacy(patient_id, recent_logs)

    def _predict_global(self, recent_logs: List[Dict]) -> Optional[Dict]:
        """Run prediction through the global PyTorch model."""
        X = self._preprocess_for_global(recent_logs)
        if X is None:
            return None  # not enough data, fall through to legacy

        # Scale with saved scaler
        flat = X.reshape(-1, self.GLOBAL_N_FEATURES)
        scaled = self._global_scaler.transform(flat).reshape(X.shape)

        tensor = torch.FloatTensor(scaled).to(self._global_device)

        with torch.no_grad():
            reconstructed = self._global_model(tensor)
            error = torch.mean((tensor - reconstructed) ** 2).item()

        is_anomaly = error > self._global_threshold

        return {
            'is_anomaly': bool(is_anomaly),
            'score': float(error),
            'threshold': float(self._global_threshold),
            'confidence': float(min(error / self._global_threshold, 2.0)),
            'model': 'pytorch_global'
        }

    def _predict_legacy(self, patient_id: int, recent_logs: List[Dict]) -> Dict:
        """Run prediction through the per-patient TF model (legacy)."""
        if not TENSORFLOW_AVAILABLE:
            return {'is_anomaly': False, 'score': 0, 'error': 'No model available', 'model': 'none'}

        model_path = os.path.join(self.legacy_model_dir, f'lstm_anomaly_patient_{patient_id}.h5')
        meta_path = os.path.join(self.legacy_model_dir, f'lstm_meta_patient_{patient_id}.pkl')

        if not os.path.exists(model_path) or not os.path.exists(meta_path):
            return {'is_anomaly': False, 'score': 0, 'error': 'Model not trained', 'model': 'none'}

        X = self.preprocess_logs(recent_logs)
        if X is None:
            return {'is_anomaly': False, 'score': 0, 'error': 'Insufficient data', 'model': 'none'}

        model = load_model(model_path)
        with open(meta_path, 'rb') as f:
            meta = pickle.load(f)

        latest_X = X[-1:]
        reconstruction = model.predict(latest_X)
        mse = float(np.mean(np.power(latest_X - reconstruction, 2)))

        return {
            'is_anomaly': bool(mse > meta['threshold']),
            'score': mse,
            'threshold': float(meta['threshold']),
            'confidence': float(min(mse / meta['threshold'], 2.0)),
            'model': 'tensorflow_per_patient'
        }


# Singleton
lstm_detector = LSTMAnomalyDetector()

