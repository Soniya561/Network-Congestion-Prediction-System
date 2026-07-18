from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

# Create FastAPI app
app = FastAPI(
    title="Network Congestion Prediction System",
    description="Predict Network Congestion using Random Forest",
    version="1.0"
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

    prediction = model.predict(input_df)

    congestion_level = encoder.inverse_transform(prediction)[0]

    return {
        "prediction": congestion_level
    }