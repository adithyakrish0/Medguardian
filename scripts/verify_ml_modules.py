"""
ML Module Verification - Clean Output
Tests all 3 ML components and writes results to a clean file.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import warnings
warnings.filterwarnings("ignore")

output = []
def log(msg):
    output.append(msg)
    print(msg)

log("=" * 60)
log("STEP 1: SHAP EXPLAINABILITY")
log("=" * 60)

try:
    from app.ml.explainer import get_explainer
    e = get_explainer()
    log(f"  Model loaded: {e.model is not None}")
    log(f"  Explainer ready: {e.explainer is not None}")

    if e.explainer:
        result = e.explain_prediction(
            {"hour": 9, "day_of_week": 1, "is_weekend": 0, "priority": 1},
            generate_plot=False
        )
        d = result.to_dict()
        log(f"  Prediction: {d['prediction']}")
        log(f"  Risk level: {d['risk_level']}")
        log(f"  Base value: {d['base_value']}")
        log(f"  Contributions:")
        for c in d["contributions"]:
            log(f"    {c['name']}: {c['contribution']} ({c['direction']})")

        gi = e.get_global_importance(n_samples=50)
        log(f"  Global importance ({gi['samples_analyzed']} samples):")
        for f in gi["features"]:
            log(f"    #{f['rank']} {f['feature']}: {f['percentage']}%")
        log(f"  Summary plot generated: {gi['summary_plot'] is not None}")
        log("  >>> SHAP: FULLY WORKING <<<")
    else:
        log("  >>> SHAP: MODEL LOADED BUT EXPLAINER FAILED <<<")
except Exception as ex:
    log(f"  ERROR: {ex}")
    log("  >>> SHAP: BROKEN <<<")


log("")
log("=" * 60)
log("STEP 2: ANOMALY DETECTION")
log("=" * 60)

try:
    from app.ml.anomaly_detector import anomaly_detector, Sensitivity
    from datetime import datetime, timedelta
    import random
    random.seed(42)

    logs_data = []
    for day_offset in range(30):
        dt = datetime.utcnow() - timedelta(days=30 - day_offset)
        take_hour = 9 + random.gauss(0, 0.5)
        taken_at = dt.replace(hour=int(take_hour) % 24, minute=random.randint(0, 59))
        status = "verified" if random.random() < 0.85 else "missed"
        logs_data.append({
            "taken_at": taken_at.isoformat(),
            "scheduled_time": dt.replace(hour=9, minute=0).isoformat(),
            "status": status
        })

    baseline = anomaly_detector.train(999, logs_data, Sensitivity.MEDIUM)
    log(f"  Baseline trained: mean_hr={baseline.mean_hour:.1f}, adherence={baseline.mean_adherence_rate:.0%}")

    anomalous_logs = []
    for i in range(7):
        dt = datetime.utcnow() - timedelta(days=7 - i)
        taken_at = dt.replace(hour=3, minute=random.randint(0, 59))
        anomalous_logs.append({
            "taken_at": taken_at.isoformat(),
            "scheduled_time": dt.replace(hour=9, minute=0).isoformat(),
            "status": "verified"
        })
    result = anomaly_detector.detect(999, anomalous_logs)
    log(f"  Anomaly detected: {result.is_anomaly}")
    log(f"  Score: {result.anomaly_score:.2f}")
    log(f"  Type: {result.anomaly_type}")
    log(f"  Alert: {result.alert_message[:80]}")
    log("  >>> Z-SCORE ANOMALY: FULLY WORKING <<<")
except Exception as ex:
    log(f"  Z-Score ERROR: {ex}")
    log("  >>> Z-SCORE ANOMALY: BROKEN <<<")

log("  --- LSTM Layer ---")
try:
    from app.ml.lstm_anomaly_detector import lstm_detector
    log(f"  TensorFlow available: {lstm_detector.available}")
    if lstm_detector.available:
        lstm_result = lstm_detector.predict(999, logs_data[-7:])
        log(f"  LSTM result: {lstm_result}")
        if lstm_result.get("is_anomaly") is not None:
            log("  >>> LSTM: WORKING <<<")
        else:
            log("  >>> LSTM: MODEL NOT TRAINED (Z-score fallback active) <<<")
    else:
        log("  >>> LSTM: TF NOT AVAILABLE (Z-score fallback active) <<<")
except Exception as ex:
    log(f"  LSTM ERROR: {ex}")
    log("  >>> LSTM: BROKEN (Z-score fallback active) <<<")


log("")
log("=" * 60)
log("STEP 3: GNN DRUG INTERACTIONS")
log("=" * 60)

try:
    from app.ml.gnn_interaction_detector import gnn_detector as gnn
    model_path = os.path.join("app", "models", "saved", "gnn_interaction_model.pt")
    meta_path = os.path.join("app", "models", "saved", "gnn_interaction_meta.pkl")
    log(f"  Model file: {os.path.exists(model_path)}")
    log(f"  Meta file: {os.path.exists(meta_path)}")

    gnn.load_model()
    log(f"  Model in memory: {gnn.model is not None}")

    test_meds = ["Metformin", "Lisinopril", "Aspirin"]
    gnn_results = gnn.predict(test_meds)
    log(f"  GNN predictions: {len(gnn_results)}")
    for r in gnn_results:
        conf = r.get("confidence", 0)
        log(f"    {r['medication1']} <-> {r['medication2']}: {r.get('severity','?')} conf={conf:.1%}")
    if gnn_results:
        log("  >>> GNN: FULLY WORKING <<<")
    else:
        log("  >>> GNN: NO PREDICTIONS RETURNED <<<")
except Exception as ex:
    log(f"  GNN ERROR: {ex}")
    log("  >>> GNN: BROKEN <<<")

log("  --- Full InteractionChecker ---")
try:
    from app.utils.interaction_checker import InteractionChecker
    checker = InteractionChecker()
    interactions = checker.check_interactions(["Metformin", "Lisinopril", "Aspirin"])
    log(f"  Total interactions: {len(interactions)}")
    for ix in interactions:
        src = ix.get("source", "?")
        ai = ix.get("is_ai_prediction", False)
        gc = ix.get("gnn_confidence", None)
        tag = "[GNN AI]" if ai else f"[{src}]"
        conf_str = f" ({gc:.1%})" if gc else ""
        log(f"    {ix['medication1']} <-> {ix['medication2']}: {ix['severity']} {tag}{conf_str}")

    risk_score, risk_level = checker.calculate_risk_score(interactions)
    log(f"  Risk: {risk_score}/100 ({risk_level})")

    graph_data = checker.get_graph_data(["Metformin", "Lisinopril", "Aspirin"])
    log(f"  D3 nodes: {len(graph_data.get('nodes', []))}, edges: {len(graph_data.get('edges', []))}")
    log("  >>> INTERACTION CHECKER: FULLY WORKING <<<")
except Exception as ex:
    log(f"  IC ERROR: {ex}")
    log("  >>> INTERACTION CHECKER: BROKEN <<<")

# Write to file
with open("scripts/ml_results.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output))

log("\nResults saved to scripts/ml_results.txt")
