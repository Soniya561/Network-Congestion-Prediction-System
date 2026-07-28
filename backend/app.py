from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib

# Create FastAPI app
app = FastAPI(
    title="Network Congestion Prediction System",
    description="Predict Network Congestion using Random Forest",
    version="1.0"
)


class DashboardResponse(BaseModel):
    network_health: int
    current_congestion: str
    confidence: float
    prediction_next: str
    connected_devices: int
    status: str


latest_dashboard_state = DashboardResponse(
    network_health=94,
    current_congestion="Low",
    confidence=98.6,
    prediction_next="Possible congestion in 10 min",
    connected_devices=2400000,
    status="Stable",
)


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
model = joblib.load("network_congestion_model.pkl")
encoder = joblib.load("label_encoder.pkl")


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


# Dashboard API
@app.get("/dashboard")
def dashboard():
    return latest_dashboard_state


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

    global latest_dashboard_state
    latest_dashboard_state = build_dashboard_state(congestion_level, confidence)

    # Return response
    return {
        "prediction": congestion_level,
        "confidence": confidence
    }
