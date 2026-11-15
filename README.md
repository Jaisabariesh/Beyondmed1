# BEYOND MED — Astronaut Health-Monitoring Software

BEYOND MED is an astronaut health-monitoring system designed strictly according to the mission specification.

---

## 1. System Architecture

```text
Measurement Data
       ↓
Parameter-Specific Detection Method
       ↓
Personalized Rolling-Median Baseline where CUSUM is used
       ↓
Anomaly Detection
       ↓
Alert
       ↓
Relevant Event Data Sent to LLM
       ↓
LLM understands what happened at that particular time
       ↓
Contextual Report
```

---

## 2. Health Parameters and Detection Methods (Exact 16 Parameters)

| # | Parameter | Detection / Analysis Method | Unit | Baseline Method |
|---|---|---|---|---|
| 1 | **Resting Heart Rate** | CUSUM | bpm | Personalized Rolling Median |
| 2 | **Blood Pressure** | Heuristics | mmHg | Threshold (Systolic ≥ 140 / Diastolic ≥ 90) |
| 3 | **SpO₂** | Heuristics (Checked Per Minute) | % | Threshold (< 95%) |
| 4 | **Respiratory Rate** | Heuristics | breaths/min | Threshold (> 20 or < 10 breaths/min) |
| 5 | **VO₂ Max** | CUSUM | ml/kg/min | Personalized Rolling Median |
| 6 | **Muscle Mass** | Bioelectrical Impedance Analysis + CUSUM | kg | Personalized Rolling Median |
| 7 | **Spinal Deformity** | CUSUM | ° | Personalized Rolling Median |
| 8 | **Sleep Duration** | Heuristics | hours | Threshold (< 6.0 or > 10.0 hrs) |
| 9 | **Sleep Quality** | Heuristics — score out of 100 | /100 | Threshold (< 65/100) |
| 10 | **Stress** | Heuristics (Checked Per Minute) | /100 | Threshold (> 60/100) |
| 11 | **Radiation Dosimeter** | Heuristics | mSv/day | Threshold (> 1.2 mSv/day) |
| 12 | **Vestibular Function** | EOG + custom ONNX model (Checked Per Minute) | EOG index | Custom ONNX Model (`eog_scaler.onnx` + `eog_model.onnx`) |
| 13 | **Range of Motion** | CUSUM | degrees (°) | Personalized Rolling Median |
| 14 | **Gut Microbes** | Heuristics | Diversity / Pathogen | Diversity < 0.60 or Pathogen detected |
| 15 | **Nutrition** | CUSUM for calories, carbs, protein, fat | kcal, g, g, g | Personalized Rolling Median |
| 16 | **Calories Burned** | CUSUM | kcal | Personalized Rolling Median |

---

## 3. Routes

- **`/` — Dashboard**: Real-time telemetry monitoring for all 16 parameters, interactive time-step scrubber, parameter cards with status indicators, rolling-median baseline displays, and active anomaly banners.
- **`/alert` — Alert Center**: Full list of alerts generated strictly by the algorithmic detection layer (CUSUM, Heuristics, and EOG + ONNX). Includes severity filters and direct links to trigger contextual LLM reports.
- **`/llm` — LLM Contextual Reasoning**: Contextual report generation engine. Implements strict restriction protocols, displaying only relevant event data (the alert, surrounding ±2 telemetry window, and prior alerts) to answer: *"What happened at that particular time?"*

---

## 4. LLM Restriction Protocols (Section 12 Compliance)

- **Use only data supplied by BEYOND MED.**
- **Distinguish clearly between**:
  1. *Detected Abnormality*: Algorithmic signal produced by CUSUM / Heuristics / EOG+ONNX.
  2. *Possible Interpretation*: Aerospace operational hypotheses based on concurrent telemetry.
  3. *Confirmed Diagnosis*: Explicitly acknowledges clinical diagnosis requires physician verification outside telemetry.
- **Never invent measurements or symptoms.**
- **Never invent missing patient/astronaut information.**
- **Never override algorithmic anomaly detection.**
- **Never create an anomaly that was not detected.**
- **Never add health parameters outside the 16 BEYOND MED parameters.**
- **Never claim a diagnosis without sufficient evidence.**
- **Never create treatment or exercise prescriptions for abnormalities.**
- **Raw measurements are not continuously force-fed to the LLM.**
# spaceapp
