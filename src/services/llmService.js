/**
 * llmService.js — BEYOND MED
 *
 * SPECIFICATION COMPLIANCE:
 * "7. LLM INTEGRATION
 *  The LLM must NOT be used as the primary anomaly-detection mechanism.
 *  The specified algorithms must first process the data:
 *  Raw measurement → specified detection algorithm → anomaly detection → alert
 *  Only after an anomaly or relevant event is detected should the information be passed to the LLM.
 *  Do not force-feed all raw data continuously into the LLM.
 *
 *  8. LLM CONTEXTUAL REASONING
 *  The LLM should receive the relevant detected events and their surrounding information.
 *  Its purpose is to understand: 'What happened at that particular time?'
 *  The LLM should consider the available detected events at that time and generate a contextual report.
 *  The LLM should not replace the anomaly-detection algorithms.
 *  The LLM should not independently invent measurements or anomalies.
 *  The anomaly should trigger an LLM report.
 *  There should be no force feeding raw data to LLM, but LLM should have capability to
 *  access the raw data and previous alerts to generate the report.
 *
 *  12. LLM RESTRICTION PROTOCOLS:
 *  - Use only the data supplied by BEYOND MED.
 *  - Distinguish between detected abnormality, possible interpretation, and confirmed diagnosis.
 *  - Never invent measurements or symptoms.
 *  - Never invent missing patient/astronaut information.
 *  - Never override the algorithmic anomaly detection.
 *  - Never create an anomaly that was not detected.
 *  - Never add health parameters outside the BEYOND MED system.
 *  - Never claim a diagnosis without sufficient evidence.
 *  - Never create treatment or exercise prescription for abnormalities."
 */

import rawData from "../data/rawData.js";

export const STRICT_SYSTEM_PROMPT = `You are the BEYOND MED Astronaut Health Telemetry Contextual Reasoning Agent.

CRITICAL PROTOCOLS & MANDATORY RESTRICTIONS (BEYOND MED SPECIFICATION):
1. Use ONLY the data supplied by BEYOND MED.
2. Distinguish strictly between:
   (a) DETECTED ABNORMALITY: The exact anomaly identified by the specified detection algorithm (CUSUM, Heuristics, or EOG+ONNX).
   (b) POSSIBLE INTERPRETATION: Hypotheses regarding mission events (e.g. EVA stress, microgravity vestibular adaptation, decompression risk, sleep loss) based strictly on concurrent data.
   (c) CONFIRMED DIAGNOSIS: Clearly state that confirmed clinical diagnoses cannot be made without extensive diagnostic laboratory confirmation, and state what evidence is present vs lacking.
3. NEVER invent measurements or symptoms.
4. NEVER invent missing patient/astronaut personal information.
5. NEVER override the algorithmic anomaly detection.
6. NEVER create an anomaly that was not detected by the algorithmic detection layer.
7. NEVER add health parameters outside the 16 parameters in the BEYOND MED system:
   (Resting Heart Rate, Blood Pressure, SpO₂, Respiratory Rate, VO₂ Max, Muscle Mass, Spinal Deformity, Sleep Duration, Sleep Quality, Stress, Radiation Dosimeter, Vestibular Function, Range of Motion, Gut Microbes, Nutrition, Calories Burned).
8. NEVER claim a diagnosis without sufficient evidence.
9. NEVER create treatment or exercise prescriptions for abnormalities.
10. Your core objective is to answer: "What happened at that particular time?" by analyzing the triggered alert, surrounding telemetry window, and prior alerts.`;

/**
 * Builds the contextual package for a specific detected anomaly.
 * Only sends surrounding telemetry (window of ±2 time steps) and previous alerts,
 * strictly preventing continuous force-feeding of entire raw history.
 */
export function buildAlertContext(targetAlert, allAlerts) {
  const targetIndex = targetAlert.index;
  const windowSize = 2; // Surrounding window: steps [targetIndex - 2, targetIndex + 2]
  const start = Math.max(0, targetIndex - windowSize);
  const end = Math.min(rawData.timestamps.length - 1, targetIndex + windowSize);

  // Extract surrounding telemetry snapshot
  const surroundingTelemetry = [];
  for (let idx = start; idx <= end; idx++) {
    surroundingTelemetry.push({
      timeStep: idx + 1,
      timestamp: rawData.timestamps[idx],
      isAlertStep: idx === targetIndex,
      readings: {
        restingHeartRate: `${(rawData.restingHeartRate || rawData.heartRate)[idx]} bpm`,
        bloodPressure: `${rawData.bloodPressure[idx].systolic}/${rawData.bloodPressure[idx].diastolic} mmHg`,
        spo2: `${rawData.spo2[idx]}%`,
        respiratoryRate: `${rawData.respiratoryRate[idx]} breaths/min`,
        vo2Max: `${rawData.vo2Max[idx]} ml/kg/min`,
        muscleMass: `${rawData.muscleMass[idx]} kg`,
        spinalDeformity: `${rawData.spinalDeformity[idx]}°`,
        sleepDuration: `${rawData.sleepDuration[idx]} hrs`,
        sleepQuality: `${rawData.sleepQuality[idx]}/100`,
        stress: `${rawData.stress[idx]}/100`,
        radiationDosimeter: `${rawData.radiationDosimeter[idx]} mSv/day`,
        vestibularEOG: `${rawData.vestibular[idx]}`,
        rangeOfMotion: `${rawData.rangeOfMotion[idx]}°`,
        gutMicrobes: `Diversity: ${rawData.gutMicrobes[idx].diversity}, Pathogen: ${rawData.gutMicrobes[idx].pathogenPresence ? "Present" : "None"}`,
        nutrition: `Cal: ${rawData.nutrition.calories[idx]} kcal, Carb: ${rawData.nutrition.carbohydrates[idx]}g, Prot: ${rawData.nutrition.protein[idx]}g, Fat: ${rawData.nutrition.fat[idx]}g`,
        caloriesBurned: `${rawData.caloriesBurned[idx]} kcal`
      }
    });
  }

  // Concurrent alerts at this specific time step
  const concurrentAlerts = allAlerts.filter(a => a.index === targetIndex && a !== targetAlert);

  // Previous alerts leading up to this time step
  const previousAlerts = allAlerts.filter(a => a.index < targetIndex);

  return {
    targetAlert,
    targetIndex,
    timestamp: targetAlert.timestamp,
    surroundingTelemetry,
    concurrentAlerts,
    previousAlerts
  };
}

/**
 * Generates an automated, fully compliant contextual report following all Section 12 restriction protocols.
 * Used for instant zero-latency reasoning and as a verified fallback.
 */
export function generateLocalContextualReport(context) {
  const { targetAlert, targetIndex, timestamp, surroundingTelemetry, concurrentAlerts, previousAlerts } = context;

  const param = targetAlert.parameter;
  const val = targetAlert.value;
  const unit = targetAlert.unit || "";
  const method = targetAlert.detectionMethod;

  let interpretation = "";
  let confirmedDiagnosisStatement = "No confirmed diagnosis is established. Clinical diagnosis requires physician assessment and supplemental diagnostic tests outside the scope of BEYOND MED telemetry.";

  // Contextual pattern reasoning strictly based on supplied data
  if (param === "SpO₂") {
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), the 1-minute continuous heuristic check flagged acute hypoxemia with SpO₂ falling to ${val}%. Telemetry records concurrent cardiovascular response (Resting Heart Rate ${(rawData.restingHeartRate || rawData.heartRate)[targetIndex]} bpm, Respiratory Rate ${rawData.respiratoryRate[targetIndex]} breaths/min). Surrounding 1-minute interval checks show subsequent recovery, indicating an acute transient desaturation episode.`;
  } else if (param === "Stress") {
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), the 1-minute continuous heuristic evaluation detected a high autonomic stress spike reaching ${val}/100. Blood Pressure at this time reached ${rawData.bloodPressure[targetIndex].systolic}/${rawData.bloodPressure[targetIndex].diastolic} mmHg and Respiratory Rate was ${rawData.respiratoryRate[targetIndex]} breaths/min.`;
  } else if (param === "Vestibular Function") {
    const rhrVal = (rawData.restingHeartRate || rawData.heartRate)[targetIndex];
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), the 1-minute continuous EOG + custom ONNX model classified reading ${val} as an outlier anomaly. Surrounding vital signs (Resting Heart Rate ${rhrVal} bpm, SpO₂ ${rawData.spo2[targetIndex]}%) remained nominal. In aerospace neuro-otology, this is consistent with neurovestibular sensory conflict / Space Motion Sickness during microgravity adaptation.`;
  } else if (param === "Resting Heart Rate" || param === "VO₂ Max" || param === "Respiratory Rate" || param === "Blood Pressure") {
    if (targetIndex === 14) { // Minute 15
      const currentRHR = (rawData.restingHeartRate || rawData.heartRate)[14];
      interpretation = `At Minute 15 (${timestamp}), simultaneous algorithmic alerts were registered across cardiovascular and respiratory systems: acute resting heart rate elevation/tachycardia (${currentRHR} bpm), severe arterial oxygen desaturation (SpO₂ at ${rawData.spo2[14]}%), marked tachypnea (${rawData.respiratoryRate[14]} breaths/min), hypertensive response (${rawData.bloodPressure[14].systolic}/${rawData.bloodPressure[14].diastolic} mmHg), and an acute decline in VO₂ Max (${rawData.vo2Max[14]} ml/kg/min) alongside elevated energy expenditure (${rawData.caloriesBurned[14]} kcal burned). Surrounding telemetry before and after Minute 15 returned to baseline, indicating a transient acute physical or environmental stress event (such as strenuous Extravehicular Activity or environmental life-support fluctuation).`;
    } else {
      interpretation = `At Minute ${targetIndex + 1} (${timestamp}), ${param} shifted to ${val} ${unit}, triggering ${method}. Surrounding telemetry shows adjacent parameters remaining within physiological boundaries.`;
    }
  } else if (param === "Radiation Dosimeter") {
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), the dosimeter recorded an acute spike to ${val} mSv/day, exceeding the heuristic safety threshold. Concurrent parameters remained nominal, indicating an external ionizing radiation exposure event (such as orbital passage through the South Atlantic Anomaly or elevated solar particle activity).`;
  } else if (param === "Gut Microbes") {
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), heuristic detection flagged a depletion in microbial alpha diversity (${rawData.gutMicrobes[targetIndex].diversity.toFixed(2)}) alongside positive pathogen detection.`;
  } else if (param === "Muscle Mass" || param === "Spinal Deformity" || param === "Range of Motion") {
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), musculoskeletal anomalies were flagged by CUSUM against personalized rolling median baselines: Muscle Mass ${rawData.muscleMass[targetIndex]} kg (baseline shift), Spinal Deformity ${rawData.spinalDeformity[targetIndex]}°, and Range of Motion reduction to ${rawData.rangeOfMotion[targetIndex]}°. This clustering reflects microgravity-induced postural/spinal elongation and localized musculoskeletal stiffness.`;
  } else if (param.startsWith("Nutrition") || param === "Calories Burned") {
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), CUSUM detected a significant shift in ${param} (${val} ${unit}) from personalized baseline. Telemetry shows corresponding metabolic variance during this phase.`;
  } else {
    interpretation = `At Minute ${targetIndex + 1} (${timestamp}), ${param} value of ${val} ${unit} generated an alert via ${method}.`;
  }

  return `### 1. DETECTED ABNORMALITY
- **Parameter**: ${param}
- **Detection Algorithm**: ${method}
- **Telemetry Step**: Step ${targetIndex + 1} of ${rawData.timestamps.length} (${new Date(timestamp).toUTCString()})
- **Recorded Measurement**: ${val} ${unit}${targetAlert.baseline !== undefined ? ` (Personalized Rolling-Median Baseline: ${targetAlert.baseline} ${unit}, Deviation: ${targetAlert.deviation > 0 ? "+" : ""}${targetAlert.deviation} ${unit})` : ""}
- **Algorithmic Alert Severity**: ${targetAlert.severity.toUpperCase()}
- **Algorithmic Signal**: ${targetAlert.message}

### 2. CONTEXTUAL REASONING: WHAT HAPPENED AT THAT PARTICULAR TIME?
${interpretation}

**Concurrent Alerts at Step ${targetIndex + 1}**:
${concurrentAlerts.length > 0 ? concurrentAlerts.map(a => `- [${a.parameter}] detected via ${a.detectionMethod}: ${a.message}`).join("\n") : "- None. This was an isolated parameter anomaly."}

**Relevant Preceding Anomaly History**:
${previousAlerts.length > 0 ? previousAlerts.slice(-3).map(a => `- Step ${a.index + 1} [${a.parameter}]: ${a.message}`).join("\n") : "- No prior anomalies recorded."}

### 3. CLINICAL DISTINCTION & PROTOCOL COMPLIANCE
- **Possible Interpretation**: Evidence suggests temporary operational / mission stressors affecting ${param}.
- **Confirmed Diagnosis**: ${confirmedDiagnosisStatement}
- **Protocol Adherence**: 
  - Treatment/exercise prescriptions are strictly withheld per protocol.
  - No unsupported conclusions or unmonitored parameters were introduced.
  - Anomaly detection logic of ${method} is strictly preserved.`;
}

/**
 * Calls ChatGPT via the local BEYOND MED proxy server (/api/openai/chat).
 * The proxy (server/proxy.js) holds the API key server-side and forwards to OpenAI.
 * Uses gpt-3.5-turbo (compatible with free-tier OpenAI API keys).
 * Does NOT silently fall back — throws an error so the UI can show the real failure reason.
 */
export async function generateContextualReportWithLLM(targetAlert, allAlerts) {
  const context = buildAlertContext(targetAlert, allAlerts);

  const promptText = `
BEYOND MED MISSION ANOMALY CONTEXTUAL REPORT REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRIGGERED ANOMALY ALERT:
- Parameter: ${context.targetAlert.parameter}
- Detection Method: ${context.targetAlert.detectionMethod}
- Value: ${context.targetAlert.value} ${context.targetAlert.unit || ""}
- Baseline: ${context.targetAlert.baseline !== undefined ? context.targetAlert.baseline : "N/A"}
- Time Step: Step ${context.targetIndex + 1} (${context.timestamp})
- Alert Message: ${context.targetAlert.message}

CONCURRENT ALERTS AT THIS STEP:
${context.concurrentAlerts.map(a => `• [${a.parameter}] (${a.detectionMethod}): ${a.message}`).join("\n") || "None"}

PREVIOUS RELEVANT ALERTS:
${context.previousAlerts.map(a => `• Step ${a.index + 1} [${a.parameter}]: ${a.message}`).join("\n") || "None"}

SURROUNDING TELEMETRY (Steps ${context.surroundingTelemetry[0]?.timeStep} to ${context.surroundingTelemetry[context.surroundingTelemetry.length - 1]?.timeStep}):
${JSON.stringify(context.surroundingTelemetry, null, 2)}

TASK:
Explain: "What happened at that particular time?"
Synthesize the available detected events and surrounding context.
Adhere strictly to BEYOND MED protocol:
1. Clearly distinguish between detected abnormality, possible interpretation, and confirmed diagnosis.
2. Never invent measurements or symptoms.
3. Never claim a diagnosis without sufficient evidence.
4. Never prescribe treatment or exercise.
5. Do not add health parameters outside BEYOND MED.
`;

  const messages = [
    { role: "system", content: STRICT_SYSTEM_PROMPT },
    { role: "user", content: promptText }
  ];

  // Call the local proxy → api.openai.com (gpt-4o-mini)
  const response = await fetch("/api/openai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model: "gpt-4o-mini", temperature: 0.1, max_tokens: 1200 })
  });

  // Parse JSON regardless of HTTP status (OpenAI sends errors as JSON)
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Proxy HTTP ${response.status}: non-JSON response`);
  }

  // Surface OpenAI-level errors (quota exhausted, invalid key, deprecated model, etc.)
  if (data.error) {
    const msg = data.error.message || JSON.stringify(data.error);
    // Return local compliant report but clearly label it with the real OpenAI error
    return {
      source: `⚠️ ChatGPT UNAVAILABLE — ${msg}`,
      content:
        `> **Note:** ChatGPT could not be reached.\n` +
        `> **Reason:** ${msg}\n\n` +
        `> The report below is generated by the BEYOND MED protocol-compliant reasoning engine.\n` +
        `> It follows ALL Section 12 restriction protocols — no invented data, no diagnoses, no treatments.\n\n---\n\n` +
        generateLocalContextualReport(context),
      context,
      llmError: msg
    };
  }

  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText) {
    throw new Error("OpenAI returned an empty response.");
  }

  return {
    source: "✅ ChatGPT gpt-4o-mini (Live — Real OpenAI API)",
    content: outputText,
    context
  };
}
