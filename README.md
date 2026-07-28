# Network-Congestion-Prediction-System
# Network Congestion Prediction System

An AI-powered Network Congestion Prediction System built using React, FastAPI, and a Random Forest Machine Learning model.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Axios
- Papa Parse
- Recharts
- Tailwind CSS

### Backend
- FastAPI
- Python
- Scikit-learn
- Pandas
- Joblib

## Project Structure

```
Network-Congestion-Prediction-System/
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env
│
├── backend/
│   ├── app.py
│   ├── network_congestion_model.pkl
│   ├── label_encoder.pkl
│   ├── requirements.txt
│   └── .env
│
└── README.md
```

---

# Backend Setup

## Step 1

```bash
cd backend
```

## Step 2

Install dependencies

```bash
pip install -r requirements.txt
```

If requirements.txt is unavailable:

```bash
pip install fastapi uvicorn pandas scikit-learn joblib python-dotenv
```

## Step 3

Run the backend

```bash
uvicorn app:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

Swagger API Documentation:

```
http://127.0.0.1:8000/docs
```

---

# Frontend Setup

## Step 1

```bash
cd frontend
```

## Step 2

Install dependencies

```bash
npm install
```

## Step 3

Run the frontend

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:8443
```

---

# Environment Variables

## frontend/.env

```env
VITE_API_URL=http://127.0.0.1:8000
```

## backend/.env

```env
HOST=127.0.0.1
PORT=8000

MODEL_PATH=network_congestion_model.pkl
LABEL_ENCODER_PATH=label_encoder.pkl

ALLOWED_ORIGIN_1=http://localhost:5173
ALLOWED_ORIGIN_2=http://localhost:8443
```

---

# How to Use

1. Start the backend.
2. Start the frontend.
3. Open the frontend URL in your browser.
4. Upload a network telemetry CSV file.
5. Click **Run AI Prediction**.
6. View the predicted congestion level and confidence score.

---

# Model

- Algorithm: Random Forest Classifier
- Classes:
  - Low
  - Medium
  - High

The backend predicts the congestion level using the trained Random Forest model and returns the prediction and confidence score to the frontend.
## Run MLflow

```bash
mlflow ui --backend-store-uri sqlite:///mlflow.db