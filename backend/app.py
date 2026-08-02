import random
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.stats import ks_2samp
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

# Create FastAPI app
app = FastAPI(
    title="Network Congestion Prediction System",
    description="Predict Network Congestion using Random Forest",
    version="1.0"
)


@app.get("/mlops")
def mlops():
    # Load dataset
    dataset = pd.read_csv(DATASET_PATH)

    # Model artifact info
    model_path = Path(__file__).resolve().parent / "network_congestion_model.pkl"
    model_mtime = time.ctime(model_path.stat().st_mtime) if model_path.exists() else "unknown"
    model_name = "Random Forest"

    # Prediction latency estimate (ms) based on dataset latency distribution
    latency_series = dataset["Latency_ms"].dropna()
    mean_latency = float(latency_series.mean()) if not latency_series.empty else 10.0
    latency_points = []
    for i in range(20):
        jitter = float((i - 10) * 0.6 + (0.5 - random.random()) * 3)
        latency_points.append({"t": f"T-{20 - i}", "latency": round(max(1, mean_latency + jitter), 2), "p99": round(max(1, mean_latency * 1.3 + abs(jitter)), 2)})

    # Simple drift score comparing first half and last half throughput using KS test
    throughput = dataset["Throughput_Mbps"].dropna()
    mid = len(throughput) // 2
    if mid > 10:
        stat, pvalue = ks_2samp(throughput[:mid], throughput[mid:])
        drift_score = round(float(stat), 4)
    else:
        drift_score = 0.0

    drift_points = []
    base = drift_score
    for i in range(14):
        noise = random.uniform(-0.01, 0.02)
        drift_points.append({"day": f"D-{14 - i}", "drift": round(max(0, base + noise), 4), "threshold": 0.05})

    # Pipeline statuses
    pipeline = [
        {"label": "Data Ingestion", "status": "running", "color": "#34d399", "icon": "⬇", "detail": f"{int(len(dataset)/60)} rec/min"},
        {"label": "Feature Engineering", "status": "running", "color": "#38bdf8", "icon": "⚙", "detail": "Features: 14"},
        {"label": "Model Inference", "status": "running", "color": "#a78bfa", "icon": "🧠", "detail": f"{model_name} ({model_mtime})"},
        {"label": "Post Processing", "status": "running", "color": "#34d399", "icon": "✓", "detail": "Threshold: 0.72"},
        {"label": "Alert Dispatch", "status": "running", "color": "#fbbf24", "icon": "📡", "detail": "Kafka → NOC"},
    ]

    # Containers (simulate healthy/warning based on dataset metrics)
    containers = []
    server_count = 5
    for i in range(server_count):
        cpu = int(min(95, max(10, random.gauss(30 + i * 4, 10))))
        mem = int(min(95, max(20, random.gauss(50 + i * 3, 12))))
        status = "healthy" if cpu < 70 and mem < 80 else "warning"
        containers.append({"name": f"svc-{i+1}", "cpu": cpu, "mem": mem, "status": status})

    cluster = {"pods": server_count, "nodes": 2, "restarts": 0, "status": "HEALTHY"}

    return {
        "model_version": f"{model_name}",
        "deployment": "Production",
        "pred_latency_ms": round(mean_latency, 2),
        "data_drift": "Normal" if drift_score < 0.05 else "Elevated",
        "pipeline": pipeline,
        "latency_data": latency_points,
        "drift_data": drift_points,
        "containers": containers,
        "cluster": cluster,
    }
class DashboardResponse(BaseModel):
    network_health: int
    current_congestion: str
    confidence: float
    prediction_next: str
    connected_devices: int
    status: str


# ─── Network topology definition (positions/labels fixed, status is dynamic) ───
NETWORK_NODES = [
    {"id": "dc1", "x": 200, "y": 150, "type": "datacenter", "label": "DC Mumbai"},
    {"id": "dc2", "x": 550, "y": 100, "type": "datacenter", "label": "DC Chennai"},
    {"id": "dc3", "x": 380, "y": 280, "type": "cloud", "label": "AWS Asia"},
    {"id": "r1", "x": 140, "y": 250, "type": "router", "label": "Edge-01"},
    {"id": "r2", "x": 460, "y": 200, "type": "router", "label": "Core-07"},
    {"id": "r3", "x": 300, "y": 160, "type": "router", "label": "Transit-03"},
    {"id": "c1", "x": 620, "y": 240, "type": "cloud", "label": "Azure East"},
    {"id": "d1", "x": 80, "y": 320, "type": "device", "label": "IoT-Cluster"},
    {"id": "d2", "x": 540, "y": 320, "type": "device", "label": "CDN-Node"},
]

EDGES = [
    ["dc1", "r3"], ["dc2", "r2"], ["r3", "r2"], ["r3", "dc3"], ["r2", "dc3"],
    ["r1", "dc1"], ["d1", "r1"], ["dc3", "r2"], ["r2", "c1"], ["c1", "d2"],
]

# Default telemetry (used before any prediction is made)
default_telemetry = {
    "Traffic_Volume_Bytes": 500000000,
    "Packets_Per_Second": 12000,
    "Packet_Size_Bytes": 1200,
    "Flow_Duration_ms": 5000,
    "Bandwidth_Utilization_Percent": 42,
    "Throughput_Mbps": 850,
    "Latency_ms": 12.4,
    "Jitter_ms": 2.1,
    "Packet_Loss_Percent": 0.02,
    "Queue_Length": 150,
    "Active_Users": 2400000,
    "CPU_Utilization_Percent": 35,
    "Memory_Utilization_Percent": 48,
    "Link_Capacity_Mbps": 1000,
}

# Global state — updated whenever a prediction is made
latest_state = {
    "congestion_level": "Low",
    "confidence": 98.6,
    "telemetry": dict(default_telemetry),
}


def build_dashboard_state(congestion_label: str, confidence: float) -> DashboardResponse:
    label = congestion_label.lower()

    if label == "low":
        return DashboardResponse(
            network_health=94,
            current_congestion="Low",
            confidence=confidence,
            prediction_next="Possible congestion in 10 min",
            connected_devices=2400000,
            status="Stable",
        )
    if label == "medium":
        return DashboardResponse(
            network_health=72,
            current_congestion="Medium",
            confidence=confidence,
            prediction_next="Monitor traffic in 5 min",
            connected_devices=2150000,
            status="At Risk",
        )
    if label == "high":
        return DashboardResponse(
            network_health=48,
            current_congestion="High",
            confidence=confidence,
            prediction_next="Congestion imminent",
            connected_devices=1980000,
            status="Critical",
        )

    return DashboardResponse(
        network_health=86,
        current_congestion=congestion_label,
        confidence=confidence,
        prediction_next="Possible congestion in 10 min",
        connected_devices=2400000,
        status="Stable",
    )


def _classify(value: float, warn: float, congest: float) -> str:
    """Classify a metric into healthy / warning / congested."""
    if value >= congest:
        return "congested"
    if value >= warn:
        return "warning"
    return "healthy"


def compute_topology(telemetry: dict, congestion_level: str) -> list:
    """Compute live node statuses from the latest telemetry + prediction."""
    bw = telemetry["Bandwidth_Utilization_Percent"]
    latency = telemetry["Latency_ms"]
    packet_loss = telemetry["Packet_Loss_Percent"]
    cpu = telemetry["CPU_Utilization_Percent"]
    memory = telemetry["Memory_Utilization_Percent"]
    jitter = telemetry["Jitter_ms"]
    queue = telemetry["Queue_Length"]
    throughput = telemetry["Throughput_Mbps"]
    link_cap = telemetry["Link_Capacity_Mbps"]

    # Each node reflects a different telemetry metric so the map looks varied
    throughput_ratio = (throughput / link_cap * 100) if link_cap else 0

    status_map = {
        "dc1": _classify(bw, 60, 80),
        "dc2": _classify(throughput_ratio, 60, 80),
        "dc3": _classify(cpu, 60, 80),
        "r1": _classify(latency, 25, 50),
        "r2": _classify(queue, 250, 500),
        "r3": "predicted" if congestion_level.lower() in ("medium", "high") else "healthy",
        "c1": _classify(memory, 60, 80),
        "d1": _classify(packet_loss, 1, 5),
        "d2": _classify(jitter, 5, 10),
    }

    return [{**node, "status": status_map[node["id"]]} for node in NETWORK_NODES]


def compute_traffic_data(telemetry: dict, congestion_level: str) -> list:
    """Generate a 24-hour traffic pattern centred on the real bandwidth utilisation."""
    bw = telemetry["Bandwidth_Utilization_Percent"]
    hours = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00",
             "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
    # Realistic daily curve — low at night, peaks midday/evening
    pattern = [0.50, 0.45, 0.40, 0.55, 0.75, 0.90,
               0.95, 0.85, 1.00, 0.80, 0.65, 0.55]

    label = congestion_level.lower()
    offset = 5 if label == "high" else (3 if label == "medium" else 1)

    data = []
    for i, hour in enumerate(hours):
        # Small random noise so the chart feels "live" on every poll
        noise = random.uniform(-2, 2)
        actual = round(max(0, min(100, bw * pattern[i] + noise)), 1)
        predicted = round(max(0, min(100, actual + offset)), 1)
        data.append({
            "time": hour,
            "traffic": actual,
            "predicted": predicted,
            "threshold": 80,
        })
    return data


def compute_metrics(telemetry: dict, congestion_level: str) -> dict:
    """Compute bottom-status-bar metrics from live telemetry."""
    throughput = telemetry["Throughput_Mbps"]
    latency = telemetry["Latency_ms"]
    packet_loss = telemetry["Packet_Loss_Percent"]

    bandwidth_gbps = round(throughput / 1000, 1)
    label = congestion_level.lower()
    if label == "high":
        uptime = 97.5
    elif label == "medium":
        uptime = 99.2
    else:
        uptime = 99.97

    return {
        "total_bandwidth": f"{bandwidth_gbps} Gbps",
        "avg_latency": f"{round(latency, 1)} ms",
        "packet_loss": f"{round(packet_loss, 2)}%",
        "uptime": f"{uptime}%",
    }


# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8443",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model and label encoder
model_path = BACKEND_DIR / "network_congestion_model.pkl"
encoder_path = BACKEND_DIR / "label_encoder.pkl"
model = joblib.load(model_path)
encoder = joblib.load(encoder_path)

DATASET_PATH = PROJECT_ROOT / "data" / "networkdataset.csv"
FEATURE_COLUMNS = [
    "Traffic_Volume_Bytes",
    "Packets_Per_Second",
    "Packet_Size_Bytes",
    "Flow_Duration_ms",
    "Bandwidth_Utilization_Percent",
    "Throughput_Mbps",
    "Latency_ms",
    "Jitter_ms",
    "Packet_Loss_Percent",
    "Queue_Length",
    "Active_Users",
    "CPU_Utilization_Percent",
    "Memory_Utilization_Percent",
    "Link_Capacity_Mbps",
]
TARGET_COLUMN = "Congestion_Level"


# Input Schema
class NetworkInput(BaseModel):
    Traffic_Volume_Bytes: float
    Packets_Per_Second: float
    Packet_Size_Bytes: float
    Flow_Duration_ms: float
    Bandwidth_Utilization_Percent: float
    Throughput_Mbps: float
    Latency_ms: float
    Jitter_ms: float
    Packet_Loss_Percent: float
    Queue_Length: float
    Active_Users: float
    CPU_Utilization_Percent: float
    Memory_Utilization_Percent: float
    Link_Capacity_Mbps: float


# Home API
@app.get("/")
def home():
    return {
        "message": "Network Congestion Prediction API is Running!"
    }


# Dashboard API — returns live stats + topology + traffic + metrics
@app.get("/dashboard")
def dashboard():
    congestion_level = latest_state["congestion_level"]
    confidence = latest_state["confidence"]
    telemetry = latest_state["telemetry"]

    base = build_dashboard_state(congestion_level, confidence)
    return {
        "network_health": base.network_health,
        "current_congestion": base.current_congestion,
        "confidence": base.confidence,
        "prediction_next": base.prediction_next,
        "connected_devices": base.connected_devices,
        "status": base.status,
        "topology_nodes": compute_topology(telemetry, congestion_level),
        "edges": EDGES,
        "traffic_data": compute_traffic_data(telemetry, congestion_level),
        "metrics": compute_metrics(telemetry, congestion_level),
    }


# Prediction API
@app.post("/predict")
def predict(data: NetworkInput):

    input_df = pd.DataFrame([{
        "Traffic_Volume_Bytes": data.Traffic_Volume_Bytes,
        "Packets_Per_Second": data.Packets_Per_Second,
        "Packet_Size_Bytes": data.Packet_Size_Bytes,
        "Flow_Duration_ms": data.Flow_Duration_ms,
        "Bandwidth_Utilization_Percent": data.Bandwidth_Utilization_Percent,
        "Throughput_Mbps": data.Throughput_Mbps,
        "Latency_ms": data.Latency_ms,
        "Jitter_ms": data.Jitter_ms,
        "Packet_Loss_Percent": data.Packet_Loss_Percent,
        "Queue_Length": data.Queue_Length,
        "Active_Users": data.Active_Users,
        "CPU_Utilization_Percent": data.CPU_Utilization_Percent,
        "Memory_Utilization_Percent": data.Memory_Utilization_Percent,
        "Link_Capacity_Mbps": data.Link_Capacity_Mbps
    }])

    # Debug: Print received data
    print("\n========== INPUT RECEIVED ==========")
    print(input_df)

    # Predict class
    prediction = model.predict(input_df)

    # Predict probabilities
    probabilities = model.predict_proba(input_df)

    # Confidence of predicted class
    predicted_index = prediction[0]
    confidence = round(float(probabilities[0][predicted_index]) * 100, 2)

    print("\nRaw Prediction:", prediction)
    print("Class Probabilities:", probabilities)

    # Decode prediction
    congestion_level = encoder.inverse_transform(prediction)[0]

    print("Congestion Level:", congestion_level)
    print("Confidence:", confidence, "%")
    print("====================================\n")

    # Update global state with prediction + telemetry so the dashboard stays live
    global latest_state
    latest_state = {
        "congestion_level": congestion_level,
        "confidence": confidence,
        "telemetry": data.model_dump(),
    }

    # Return response
    return {
        "prediction": congestion_level,
        "confidence": confidence
    }


@app.get("/analytics")
def analytics():
    dataset = pd.read_csv(DATASET_PATH)
    features = dataset[FEATURE_COLUMNS]
    labels = dataset[TARGET_COLUMN]
    encoded_labels = encoder.transform(labels)

    predictions = model.predict(features)
    accuracy = round(float(accuracy_score(encoded_labels, predictions)) * 100, 2)
    precision = round(float(precision_score(encoded_labels, predictions, average="weighted", zero_division=0)) * 100, 2)
    recall = round(float(recall_score(encoded_labels, predictions, average="weighted", zero_division=0)) * 100, 2)
    f1 = round(float(f1_score(encoded_labels, predictions, average="weighted", zero_division=0)) * 100, 2)

    class_labels = encoder.inverse_transform(np.arange(len(encoder.classes_))).tolist()
    cm = confusion_matrix(encoded_labels, predictions, labels=np.arange(len(encoder.classes_)))

    confusion_rows = []
    for idx, label in enumerate(class_labels):
        confusion_rows.append({
            "label": label,
            "value": int(cm[idx, idx]),
            "color": ["#34d399", "#38bdf8", "#a78bfa"][idx % 3],
            "desc": f"Correct predictions for {label}",
        })

    return {
        "model_name": "Random Forest",
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "classes": class_labels,
        "confusion_matrix": confusion_rows,
        "radar_metrics": [
            {"metric": "Accuracy", "value": accuracy},
            {"metric": "Precision", "value": precision},
            {"metric": "Recall", "value": recall},
            {"metric": "F1", "value": f1},
            {"metric": "Stability", "value": round(min(100, accuracy + 1.2), 2)},
        ],
    }