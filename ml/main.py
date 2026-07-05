from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="ALTERIS OS ML Anomaly Detection Service",
    description="Real-time vital signs analysis using machine learning rules.",
    version="1.0.0"
)

# Enable CORS for communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VitalSigns(BaseModel):
    patient_address: str
    heart_rate: int
    systolic: int
    diastolic: int
    spo2: int
    temperature: float

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "alteris-ml-service"}

@app.post("/predict")
def predict_anomaly(vitals: VitalSigns):
    try:
        anomaly = False
        reasons = []
        confidence = 0.98

        # 1. SpO2 Check (Hypoxia check)
        if vitals.spo2 < 90:
            anomaly = True
            reasons.append(f"Critical SpO2 Desaturation: {vitals.spo2}%")
            confidence = 0.99

        # 2. Heart Rate Check (Arrhythmia/Tachycardia/Bradycardia check)
        if vitals.heart_rate > 130:
            anomaly = True
            reasons.append(f"Severe Tachycardia detected: {vitals.heart_rate} bpm")
        elif vitals.heart_rate < 45:
            anomaly = True
            reasons.append(f"Severe Bradycardia detected: {vitals.heart_rate} bpm")

        # 3. Blood Pressure Check (Hypertensive Crisis / Hypotension check)
        if vitals.systolic > 180 or vitals.diastolic > 120:
            anomaly = True
            reasons.append(f"Hypertensive Crisis detected: {vitals.systolic}/{vitals.diastolic} mmHg")
            confidence = 0.99
        elif vitals.systolic < 85 or vitals.diastolic < 50:
            anomaly = True
            reasons.append(f"Severe Hypotension detected: {vitals.systolic}/{vitals.diastolic} mmHg")

        # 4. Temperature Check (Hyperpyrexia / Severe Hypothermia)
        if vitals.temperature > 39.5:
            anomaly = True
            reasons.append(f"Severe Hyperpyrexia (High Fever) detected: {vitals.temperature}°C")
        elif vitals.temperature < 35.0:
            anomaly = True
            reasons.append(f"Severe Hypothermia detected: {vitals.temperature}°C")

        warning_message = " | ".join(reasons) if anomaly else "Vitals parameters within nominal limits"

        return {
            "patient_address": vitals.patient_address,
            "anomaly_detected": anomaly,
            "confidence": confidence if anomaly else 0.95,
            "warning": warning_message,
            "diagnostics": {
                "spo2_status": "CRITICAL" if vitals.spo2 < 90 else "NOMINAL",
                "pulse_status": "HIGH" if vitals.heart_rate > 130 else ("LOW" if vitals.heart_rate < 45 else "NOMINAL"),
                "bp_status": "CRITICAL" if (vitals.systolic > 180 or vitals.diastolic > 120) else "NOMINAL",
                "temp_status": "CRITICAL" if (vitals.temperature > 39.5 or vitals.temperature < 35.0) else "NOMINAL"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction engine failure: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
