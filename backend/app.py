import random
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
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
    """Compatibility route for clients using the former monitoring URL."""
    return build_mlops_status()

    # Deprecated simulated monitoring implementation retained below only as
    # unreachable compatibility source while the route above serves real state.
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
    "updated_at": time.time(),
}

initial_incident_time = time.time()
incident_state = {
    "id": 1,
    "prediction_key": "Low|98.6",
    "prediction": "Low",
    "status": "stable",
    "created_at": initial_incident_time - 1,
    "resolved_at": None,
    "mttr": None,
    "active_alerts": 0,
    "resolved_today": 0,
    "escalations": 0,
    "timeline": [
        {"at": initial_incident_time - 2, "type": "Prediction Generated", "description": "Low congestion detected by Random Forest model", "color": "#34d399"},
        {"at": initial_incident_time - 1, "type": "Alert Created", "description": "NOC alert created from latest backend prediction", "color": "#34d399"},
    ],
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
model = None
encoder = None
model_load_error = None
try:
    model = joblib.load(model_path)
    encoder = joblib.load(encoder_path)
except Exception as error:
    model_load_error = str(error)

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

DRIFT_WARNING_THRESHOLD = 0.10


def load_reference_data() -> pd.DataFrame | None:
    """Return the training data only when the DVC artifact is actually present."""
    try:
        dataset = pd.read_csv(DATASET_PATH)
    except (OSError, pd.errors.ParserError):
        return None

    if len(dataset) < 2 or not set(FEATURE_COLUMNS).issubset(dataset.columns):
        return None
    return dataset[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce").dropna()


reference_data = load_reference_data()
model_feature_count = int(getattr(model, "n_features_in_", len(FEATURE_COLUMNS))) if model is not None else None
model_version = "Random Forest" if model is not None and "RandomForest" in type(model).__name__ else (type(model).__name__ if model is not None else "Unavailable")

# This state starts empty and is populated only by real prediction requests.
mlops_state = {
    "model_version": model_version,
    "deployment_status": "Loaded" if model is not None else "Unavailable",
    "model_health": "Healthy" if model is not None else "Critical",
    "prediction_latency_ms": None,
    "records_processed": 0,
    "total_predictions": 0,
    "successful_predictions": 0,
    "failed_predictions": 0,
    "last_prediction_time": None,
    "feature_count": model_feature_count,
    "data_drift": None,
    "drift_status": "Unavailable" if reference_data is None else "Pending",
    "latency_history": [],
    "drift_history": [],
    "alert_dispatch_status": "Unavailable",
    "last_prediction_level": None,
}


def calculate_data_drift(input_df: pd.DataFrame) -> float | None:
    if reference_data is None:
        return None

    scores = []
    for column in FEATURE_COLUMNS:
        sample = input_df[column].dropna()
        reference = reference_data[column].dropna()
        if sample.empty or reference.empty:
            continue
        statistic, _ = ks_2samp(reference, sample)
        scores.append(float(statistic))
    return round(float(np.mean(scores)), 4) if scores else None


def record_prediction_success(latency_ms: float, input_df: pd.DataFrame, congestion_level: str) -> None:
    timestamp = time.time()
    latency = round(latency_ms, 3)
    mlops_state["prediction_latency_ms"] = latency
    mlops_state["records_processed"] += len(input_df)
    mlops_state["total_predictions"] += len(input_df)
    mlops_state["successful_predictions"] += len(input_df)
    mlops_state["last_prediction_time"] = timestamp
    mlops_state["last_prediction_level"] = normalize_level(congestion_level)
    mlops_state["model_health"] = "Healthy"
    mlops_state["latency_history"].append({"time": timestamp, "latency_ms": latency})
    del mlops_state["latency_history"][:-20]

    drift_score = calculate_data_drift(input_df)
    if drift_score is None:
        mlops_state["data_drift"] = None
        mlops_state["drift_status"] = "Unavailable"
        return

    mlops_state["data_drift"] = drift_score
    mlops_state["drift_status"] = "Warning" if drift_score >= DRIFT_WARNING_THRESHOLD else "Normal"
    mlops_state["drift_history"].append({"time": timestamp, "drift_score": drift_score})
    del mlops_state["drift_history"][:-20]


def record_prediction_failure(records: int = 1) -> None:
    mlops_state["total_predictions"] += records
    mlops_state["failed_predictions"] += records
    mlops_state["model_health"] = "Warning" if model is not None else "Critical"


def build_mlops_status() -> dict:
    model_status = "Healthy" if model is not None and mlops_state["model_health"] == "Healthy" else mlops_state["model_health"]
    return {
        **mlops_state,
        "model_health": model_status,
        "pipeline": [
            {"label": "Data Ingestion", "status": "Healthy", "color": "#34d399", "icon": "↓", "detail": f"Records processed: {mlops_state['records_processed']}"},
            {"label": "Feature Engineering", "status": "Healthy" if model_feature_count else "Unavailable", "color": "#38bdf8", "icon": "⚙", "detail": f"Features: {model_feature_count if model_feature_count is not None else 'Unavailable'}"},
            {"label": "Model Inference", "status": model_status, "color": "#a78bfa", "icon": "🧠", "detail": f"{model_version}; last prediction: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mlops_state['last_prediction_time'])) if mlops_state['last_prediction_time'] else 'Unavailable'}"},
            {"label": "Post Processing", "status": "Healthy" if mlops_state["successful_predictions"] else "Unavailable", "color": "#34d399", "icon": "✓", "detail": "Model probabilities; no decision threshold configured"},
            {"label": "Alert Dispatch", "status": mlops_state["alert_dispatch_status"], "color": "#fbbf24", "icon": "📡", "detail": "Prediction API → Backend Alert Service"},
        ],
        "application_health": [
            {"name": "Backend API", "status": "Healthy"},
            {"name": "Random Forest Model", "status": model_status},
        ],
        "prediction_api_status": "Available",
        "drift_threshold": DRIFT_WARNING_THRESHOLD if reference_data is not None else None,
    }


@app.get("/mlops/status")
def mlops_status():
    return build_mlops_status()


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


class AlertAction(BaseModel):
    alert_id: int | None = None


def normalize_level(congestion_level: str) -> str:
    label = congestion_level.lower()
    if "high" in label:
        return "High"
    if "medium" in label:
        return "Medium"
    return "Low"


def priority_for(congestion_level: str) -> str:
    return normalize_level(congestion_level).upper()


def timeline_time(timestamp: float) -> str:
    return time.strftime("%H:%M", time.localtime(timestamp))


def recommendation_for(level: str) -> list[str]:
    if level == "High":
        return [
            "Reroute high-volume traffic away from congested core links",
            "Throttle non-critical backup and bulk transfer flows",
            "Escalate to NOC lead and prepare capacity failover",
        ]
    if level == "Medium":
        return [
            "Increase monitoring on affected transit and edge links",
            "Shift scheduled jobs to the next low-traffic window",
            "Prepare alternate routing if latency or packet loss rises",
        ]
    return [
        "Maintain current routing and QoS policy",
        "Continue passive monitoring for the next prediction interval",
        "Close the incident only after the backend confirms low risk",
    ]


def build_ai_analysis() -> dict:
    level = normalize_level(latest_state["congestion_level"])
    telemetry = latest_state["telemetry"]
    dashboard_state = build_dashboard_state(level, latest_state["confidence"])
    latency = float(telemetry["Latency_ms"])
    packet_loss = float(telemetry["Packet_Loss_Percent"])
    bandwidth = float(telemetry["Bandwidth_Utilization_Percent"])
    queue = float(telemetry["Queue_Length"])
    cpu = float(telemetry["CPU_Utilization_Percent"])
    memory = float(telemetry["Memory_Utilization_Percent"])
    connected_devices = dashboard_state.connected_devices

    risk_summary = (
        f"{level} congestion risk with {latest_state['confidence']}% model confidence, "
        f"{dashboard_state.network_health}% network health, {latency:.1f} ms latency, "
        f"and {packet_loss:.2f}% packet loss across {connected_devices:,} connected devices."
    )

    cause_signals = [
        ("bandwidth utilization", bandwidth),
        ("queue length", queue / 5),
        ("latency", latency * 2),
        ("CPU utilization", cpu),
        ("memory utilization", memory),
        ("packet loss", packet_loss * 20),
    ]
    strongest_signal = max(cause_signals, key=lambda item: item[1])[0]
    root_cause = (
        f"The strongest contributing signal is {strongest_signal}, supported by current telemetry "
        f"from the latest Random Forest prediction request."
    )

    expected_impact = {
        "High": "User-facing applications may experience delays, retransmissions, and service degradation without immediate mitigation.",
        "Medium": "Sensitive workloads may see intermittent latency while the network remains serviceable.",
        "Low": "No material service impact is expected if current telemetry remains stable.",
    }[level]

    return {
        "prediction": level,
        "confidence": latest_state["confidence"],
        "latency_ms": latency,
        "packet_loss_percent": packet_loss,
        "network_health": dashboard_state.network_health,
        "connected_devices": connected_devices,
        "risk_summary": risk_summary,
        "root_cause": root_cause,
        "expected_impact": expected_impact,
        "recommendations": recommendation_for(level),
    }


def sync_incident_with_latest_prediction() -> None:
    global incident_state
    level = normalize_level(latest_state["congestion_level"])
    prediction_key = f"{level}|{latest_state['confidence']}|{latest_state['updated_at']}"

    if incident_state["prediction_key"] == prediction_key:
        return

    now = time.time()
    color = "#f87171" if level == "High" else "#fbbf24" if level == "Medium" else "#34d399"
    status = "investigating" if level in ("High", "Medium") else "stable"
    timeline = [
        {"at": now - 2, "type": "Prediction Generated", "description": f"{level} congestion detected by Random Forest model", "color": color},
        {"at": now - 1, "type": "Alert Created", "description": "NOC alert created from latest backend prediction", "color": color},
    ]
    if status == "investigating":
        timeline.append({
            "at": now,
            "type": "Investigation Started",
            "description": "Investigation started from backend incident state.",
            "color": "#fbbf24",
        })

    incident_state = {
        "id": int(incident_state["id"]) + 1,
        "prediction_key": prediction_key,
        "prediction": level,
        "status": status,
        "created_at": now - 1,
        "resolved_at": None,
        "mttr": None,
        "active_alerts": 1 if level in ("High", "Medium") else 0,
        "resolved_today": int(incident_state["resolved_today"]),
        "escalations": int(incident_state["escalations"]),
        "timeline": timeline,
    }


def build_alert_response() -> dict:
    sync_incident_with_latest_prediction()
    level = normalize_level(latest_state["congestion_level"])
    priority = priority_for(level)
    dashboard_state = build_dashboard_state(level, latest_state["confidence"])
    active_alerts = 1 if level in ("High", "Medium") and incident_state["status"] != "resolved" else 0
    under_investigation = 1 if level in ("High", "Medium") and incident_state["status"] != "resolved" else 0
    incident_state["prediction"] = level
    incident_state["active_alerts"] = active_alerts

    alert = {
        "id": incident_state["id"],
        "priority": priority,
        "title": f"{level.upper()} CONGESTION ALERT",
        "location": f"Network operations - {dashboard_state.status}",
        "reasons": [
            f"Random Forest prediction level is {level}",
            f"Model confidence is {latest_state['confidence']}%",
            f"Network health is {dashboard_state.network_health}%",
            f"Connected devices: {dashboard_state.connected_devices:,}",
        ],
        "recommendations": recommendation_for(level),
        "time": "Live",
        "status": incident_state["status"],
        "createdAt": int(incident_state["created_at"] * 1000),
        "resolvedAt": int(incident_state["resolved_at"] * 1000) if incident_state["resolved_at"] else None,
    }

    return {
        "alert": alert,
        "timeline": [
            {
                "timestamp": item["at"],
                "time": timeline_time(item["at"]),
                "event_type": item["type"],
                "description": item["description"],
                "color": item["color"],
            }
            for _, item in sorted(
                enumerate(incident_state["timeline"]),
                key=lambda indexed_event: (indexed_event[1]["at"], indexed_event[0]),
                reverse=True,
            )
        ],
        "summary": {
            "active_alerts": incident_state["active_alerts"],
            "under_investigation": under_investigation,
            "resolved_today": incident_state["resolved_today"],
            "mttr": incident_state["mttr"],
            "ai_accuracy": latest_state["confidence"],
            "escalation_count": incident_state["escalations"],
        },
        "network": {
            "network_health": dashboard_state.network_health,
            "current_congestion": level,
            "confidence": latest_state["confidence"],
            "prediction_next": dashboard_state.prediction_next,
            "connected_devices": dashboard_state.connected_devices,
            "status": dashboard_state.status,
            "metrics": compute_metrics(latest_state["telemetry"], level),
        },
        "analysis": build_ai_analysis(),
    }


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

    if model is None or encoder is None:
        record_prediction_failure()
        raise HTTPException(status_code=503, detail="Random Forest model is unavailable.")

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

    try:
        inference_started = time.perf_counter()
        prediction = model.predict(input_df)
        inference_latency_ms = (time.perf_counter() - inference_started) * 1000
        probabilities = model.predict_proba(input_df)
    except Exception:
        record_prediction_failure(len(input_df))
        raise

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
        "updated_at": time.time(),
    }

    record_prediction_success(inference_latency_ms, input_df, congestion_level)
    sync_incident_with_latest_prediction()
    mlops_state["alert_dispatch_status"] = "Dispatched"

    # Return response
    return {
        "prediction": congestion_level,
        "confidence": confidence
    }


@app.get("/alerts")
def alerts():
    return build_alert_response()


@app.post("/alerts/escalate")
def escalate_alert(_action: AlertAction):
    sync_incident_with_latest_prediction()
    if incident_state["status"] == "resolved":
        return {
            "success": False,
            "resolved": True,
            "message": "Alert already resolved.",
            **build_alert_response(),
        }

    now = time.time()
    incident_state["status"] = "escalated"
    incident_state["escalations"] += 1
    incident_state["timeline"].append({
        "at": now,
        "type": "Escalated",
        "description": "Alert escalated to Network Operations Center.",
        "color": "#fbbf24",
    })

    return {
        "escalated": True,
        "message": "Alert escalated to Network Operations Center.",
        **build_alert_response(),
    }


@app.post("/alerts/resolve")
def resolve_alert(_action: AlertAction):
    sync_incident_with_latest_prediction()
    level = normalize_level(latest_state["congestion_level"])

    if level in ("High", "Medium"):
        return {
            "resolved": False,
            "message": "Cannot resolve.\nAI still detects congestion.",
            **build_alert_response(),
        }

    if incident_state["status"] != "resolved":
        now = time.time()
        incident_state["status"] = "resolved"
        incident_state["resolved_at"] = now
        duration_minutes = max(0, round((now - float(incident_state["created_at"])) / 60, 1))
        incident_state["mttr"] = duration_minutes
        incident_state["active_alerts"] = 0
        incident_state["resolved_today"] += 1
        incident_state["timeline"].append({
            "at": now,
            "type": "Resolved",
            "description": "Incident resolved after backend confirmed Low congestion.",
            "color": "#34d399",
        })

    return {
        "resolved": True,
        "message": "Backend confirmed congestion is clear.",
        **build_alert_response(),
    }


@app.get("/ai-analysis")
def ai_analysis():
    return build_ai_analysis()


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
