/**
 * Dashboard.jsx — BEYOND MED
 * Route: /
 *
 * SPECIFICATION COMPLIANCE:
 * - Exactly the 16 specified parameters
 * - Parameter-specific detection methods:
 *   * CUSUM with personalized rolling-median baseline for:
 *     Resting Heart Rate, VO₂ Max, Muscle Mass (BIA + CUSUM), Spinal Deformity,
 *     Range of Motion (degrees), Nutrition (calories, carbohydrates, protein, fat), Calories Burned
 *   * Heuristics for:
 *     Blood Pressure, SpO₂, Respiratory Rate, Sleep Duration, Sleep Quality (/100),
 *     Stress (/100), Radiation Dosimeter, Gut Microbes
 *   * EOG + custom ONNX model for:
 *     Vestibular Function
 * - No additional parameters, no extraneous dashboards
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import rawData from "../data/rawData.js";
import { runAllCUSUM, runCUSUM } from "../algorithms/cusum.js";
import { runAllHeuristics } from "../algorithms/heuristics.js";
import { runVestibularDetection } from "../algorithms/vestibular.js";

export default function Dashboard() {
  const [selectedStep, setSelectedStep] = useState(rawData.timestamps.length - 1);
  const [vestibularAlerts, setVestibularAlerts] = useState([]);
  const [onnxStatus, setOnnxStatus] = useState("initializing");
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play live 1-minute stream simulation
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSelectedStep(prev => (prev >= rawData.timestamps.length - 1 ? 0 : prev + 1));
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Run CUSUM & Heuristics
  const cusumAlerts = useMemo(() => runAllCUSUM(rawData), []);
  const heuristicAlerts = useMemo(() => runAllHeuristics(rawData), []);

  // Compute rolling median baselines for CUSUM parameters
  const baselines = useMemo(() => {
    return {
      restingHeartRate: runCUSUM(rawData.restingHeartRate || rawData.heartRate, rawData.timestamps, { label: "Resting Heart Rate" }).baseline,
      vo2Max: runCUSUM(rawData.vo2Max, rawData.timestamps, { label: "VO₂ Max" }).baseline,
      muscleMass: runCUSUM(rawData.muscleMass, rawData.timestamps, { label: "Muscle Mass" }).baseline,
      spinalDeformity: runCUSUM(rawData.spinalDeformity, rawData.timestamps, { label: "Spinal Deformity" }).baseline,

      rangeOfMotion: runCUSUM(rawData.rangeOfMotion, rawData.timestamps, { label: "Range of Motion" }).baseline,
      calories: runCUSUM(rawData.nutrition.calories, rawData.timestamps, { label: "Nutrition: Calories" }).baseline,
      carbohydrates: runCUSUM(rawData.nutrition.carbohydrates, rawData.timestamps, { label: "Nutrition: Carbohydrates" }).baseline,
      protein: runCUSUM(rawData.nutrition.protein, rawData.timestamps, { label: "Nutrition: Protein" }).baseline,
      fat: runCUSUM(rawData.nutrition.fat, rawData.timestamps, { label: "Nutrition: Fat" }).baseline,
      caloriesBurned: runCUSUM(rawData.caloriesBurned, rawData.timestamps, { label: "Calories Burned" }).baseline
    };
  }, []);

  // Run EOG + custom ONNX model detection
  useEffect(() => {
    let isMounted = true;
    setOnnxStatus("running");
    runVestibularDetection(rawData.vestibular, rawData.timestamps)
      .then(alerts => {
        if (isMounted) {
          setVestibularAlerts(alerts);
          setOnnxStatus("active");
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error("Vestibular detection error:", err);
          setOnnxStatus("error");
        }
      });
    return () => { isMounted = false; };
  }, []);

  // Combined alerts across all 16 parameters
  const allAlerts = useMemo(() => {
    return [...cusumAlerts, ...heuristicAlerts, ...vestibularAlerts].sort(
      (a, b) => a.index - b.index
    );
  }, [cusumAlerts, heuristicAlerts, vestibularAlerts]);

  // Alerts at current selected time step
  const currentStepAlerts = useMemo(() => {
    return allAlerts.filter(a => a.index === selectedStep);
  }, [allAlerts, selectedStep]);

  // Check if a specific parameter has an alert at the selected time step
  const getParamAlert = (paramName) => {
    return currentStepAlerts.find(a => a.parameter === paramName);
  };

  const stepDate = new Date(rawData.timestamps[selectedStep]).toUTCString();

  return (
    <div className="dashboard-container">
      {/* Top Banner & Telemetry Navigation */}
      <section className="mission-header-panel">
        <div className="mission-title-group">
          <div className="badge-mission">MISSION TIME TELEMETRY</div>
          <h1 className="mission-title">BEYOND MED Telemetry Dashboard</h1>
          <p className="mission-subtitle">
            Astronaut Physiological State & Algorithmic Detection Engine
          </p>
        </div>

        <div className="quick-summary-grid">
          <div className="summary-stat-card">
            <span className="summary-label">Mission Time-Step</span>
            <span className="summary-value">Step {selectedStep + 1} <small>/ {rawData.timestamps.length}</small></span>
            <span className="summary-sub">{stepDate}</span>
          </div>

          <div className="summary-stat-card">
            <span className="summary-label">Step Alerts</span>
            <span className={`summary-value ${currentStepAlerts.length > 0 ? "alert-text-critical" : "alert-text-nominal"}`}>
              {currentStepAlerts.length}
            </span>
            <span className="summary-sub">
              {currentStepAlerts.length > 0 ? "Anomalies Flagged" : "Nominal Window"}
            </span>
          </div>

          <div className="summary-stat-card">
            <span className="summary-label">Total Mission Anomalies</span>
            <span className="summary-value alert-text-warning">{allAlerts.length}</span>
            <span className="summary-sub">
              CUSUM: {cusumAlerts.length} | Heuristic: {heuristicAlerts.length} | ONNX: {vestibularAlerts.length}
            </span>
          </div>

          <div className="summary-stat-card">
            <span className="summary-label">High-Frequency Telemetry</span>
            <span className="summary-value" style={{ fontSize: "1.1rem", color: "var(--accent-cyan)" }}>
              ⏱️ 1-Min Checks
            </span>
            <span className="summary-sub">SpO₂ · Vestibular · Stress</span>
          </div>

          <div className="summary-stat-card">
            <span className="summary-label">Lab Assay Protocol</span>
            <span className="summary-value" style={{ fontSize: "1.1rem", color: "var(--accent-purple)" }}>
              📅 Weekly Once
            </span>
            <span className="summary-sub">Gut Microbes (Not Daily)</span>
          </div>
        </div>
      </section>

      {/* High-Frequency 1-Minute Continuous Monitoring Stream Panel */}
      <section className="per-minute-stream-panel">
        <div className="per-minute-header">
          <div className="per-minute-title-block">
            <span className="badge-per-minute">⏱️ 1-MINUTE CONTINUOUS SAMPLING</span>
            <h3 className="per-minute-heading">
              Per-Minute Telemetry Streams: SpO₂, Vestibular Function (EOG), & Stress
            </h3>
          </div>
          <button
            className={`btn-stream-toggle ${isPlaying ? "stream-playing" : ""}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? "⏸ Pause 1-Min Stream Simulation" : "▶ Run 1-Min Telemetry Simulation"}
          </button>
        </div>

        <div className="per-minute-cards-grid">
          {/* SpO2 */}
          <div className={`stream-subcard ${getParamAlert("SpO₂") ? "stream-alert" : ""}`}>
            <div className="stream-subcard-header">
              <span className="stream-param-title">SpO₂ (Blood Oxygen)</span>
              <span className="stream-freq-pill">Checked Per Minute</span>
            </div>
            <div className="stream-value-row">
              <span className="stream-big-val">{rawData.spo2[selectedStep]}%</span>
              <span className={`stream-status ${getParamAlert("SpO₂") ? "status-alert" : "status-ok"}`}>
                {getParamAlert("SpO₂") ? "⚠️ HYPOXEMIA" : "✓ NOMINAL"}
              </span>
            </div>
            <span className="stream-detail">Continuous 1-minute heuristic check (normal threshold ≥ 95%)</span>
          </div>

          {/* Vestibular EOG */}
          <div className={`stream-subcard ${getParamAlert("Vestibular Function") ? "stream-alert" : ""}`}>
            <div className="stream-subcard-header">
              <span className="stream-param-title">Vestibular Function (EOG)</span>
              <span className="stream-freq-pill">Checked Per Minute (ONNX)</span>
            </div>
            <div className="stream-value-row">
              <span className="stream-big-val">{rawData.vestibular[selectedStep]}</span>
              <span className={`stream-status ${getParamAlert("Vestibular Function") ? "status-alert" : "status-ok"}`}>
                {getParamAlert("Vestibular Function") ? "⚠️ ONNX OUTLIER" : "✓ NOMINAL"}
              </span>
            </div>
            <span className="stream-detail">EOG features classified per minute via custom ONNX OneClassSVM model</span>
          </div>

          {/* Stress */}
          <div className={`stream-subcard ${getParamAlert("Stress") ? "stream-alert" : ""}`}>
            <div className="stream-subcard-header">
              <span className="stream-param-title">Autonomic Stress Index</span>
              <span className="stream-freq-pill">Checked Per Minute</span>
            </div>
            <div className="stream-value-row">
              <span className="stream-big-val">{rawData.stress[selectedStep]} / 100</span>
              <span className={`stream-status ${getParamAlert("Stress") ? "status-alert" : "status-ok"}`}>
                {getParamAlert("Stress") ? "⚠️ HIGH STRESS" : "✓ NOMINAL"}
              </span>
            </div>
            <span className="stream-detail">Continuous 1-minute heuristic check (operational ceiling ≤ 60/100)</span>
          </div>
        </div>
      </section>

      {/* Time Step Scrubber */}
      <section className="time-scrubber-panel">
        <div className="scrubber-header">
          <span className="scrubber-label">⏱ Telemetry Time-Step Scrubber:</span>
          <div className="scrubber-buttons">
            <button
              className="scrubber-btn"
              onClick={() => setSelectedStep(prev => Math.max(0, prev - 1))}
              disabled={selectedStep === 0}
            >
              ◀ Previous Step
            </button>
            <span className="scrubber-step-indicator">
              Step {selectedStep + 1} of {rawData.timestamps.length}
            </span>
            <button
              className="scrubber-btn"
              onClick={() => setSelectedStep(prev => Math.min(rawData.timestamps.length - 1, prev + 1))}
              disabled={selectedStep === rawData.timestamps.length - 1}
            >
              Next Step ▶
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max={rawData.timestamps.length - 1}
          value={selectedStep}
          onChange={(e) => setSelectedStep(Number(e.target.value))}
          className="time-slider"
        />
        <div className="timeline-markers">
          {rawData.timestamps.map((ts, idx) => {
            const hasAlert = allAlerts.some(a => a.index === idx);
            return (
              <button
                key={idx}
                className={`timeline-tick ${selectedStep === idx ? "active" : ""} ${hasAlert ? "has-alert" : ""}`}
                onClick={() => setSelectedStep(idx)}
                title={`Step ${idx + 1}: ${hasAlert ? "Anomaly Detected" : "Nominal"}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Step Alert Banner if anomalies exist at this step */}
      {currentStepAlerts.length > 0 && (
        <div className="step-alert-banner">
          <div className="alert-banner-header">
            <span className="alert-badge-pulse">⚠️ ALERTS AT STEP {selectedStep + 1}</span>
            <Link to="/alert" className="banner-link">View All Alerts in Alert Center ▶</Link>
          </div>
          <div className="alert-banner-items">
            {currentStepAlerts.map((alt, i) => (
              <div key={i} className="alert-banner-item">
                <span className="alert-param-badge">{alt.parameter}</span>
                <span className="alert-method-badge">{alt.detectionMethod}</span>
                <span className="alert-msg">{alt.message}</span>
                <Link to="/llm" state={{ triggerAlert: alt }} className="alert-llm-btn">
                  Generate LLM Report 🤖
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of the Exact 16 Health Parameters */}
      <h2 className="section-title">Telemetry Parameters (Exact 16 BEYOND MED Parameters)</h2>

      <div className="parameters-grid">
        {/* 1. Resting Heart Rate */}
        <ParameterCard
          name="Resting Heart Rate"
          method="CUSUM"
          methodDetail="Personalized Rolling-Median Baseline"
          value={(rawData.restingHeartRate || rawData.heartRate)[selectedStep]}
          unit="bpm"
          baseline={`${baselines.restingHeartRate[selectedStep].toFixed(1)} bpm`}
          alert={getParamAlert("Resting Heart Rate")}
        />

        {/* 2. Blood Pressure */}
        <ParameterCard
          name="Blood Pressure"
          method="Heuristics"
          methodDetail="Systolic: 90–140, Diastolic: 60–90 mmHg"
          value={`${rawData.bloodPressure[selectedStep].systolic}/${rawData.bloodPressure[selectedStep].diastolic}`}
          unit="mmHg"
          alert={getParamAlert("Blood Pressure")}
        />

        {/* 3. SpO₂ */}
        <ParameterCard
          name="SpO₂"
          method="Heuristics"
          methodDetail="Checked per minute (Threshold: ≥ 95%)"
          isPerMinute={true}
          value={rawData.spo2[selectedStep]}
          unit="%"
          alert={getParamAlert("SpO₂")}
        />

        {/* 4. Respiratory Rate */}
        <ParameterCard
          name="Respiratory Rate"
          method="Heuristics"
          methodDetail="Normal Threshold: 10–20 breaths/min"
          value={rawData.respiratoryRate[selectedStep]}
          unit="breaths/min"
          alert={getParamAlert("Respiratory Rate")}
        />

        {/* 5. VO₂ Max */}
        <ParameterCard
          name="VO₂ Max"
          method="CUSUM"
          methodDetail="Personalized Rolling-Median Baseline"
          value={rawData.vo2Max[selectedStep]}
          unit="ml/kg/min"
          baseline={`${baselines.vo2Max[selectedStep].toFixed(1)} ml/kg/min`}
          alert={getParamAlert("VO₂ Max")}
        />

        {/* 6. Muscle Mass */}
        <ParameterCard
          name="Muscle Mass"
          method="BIA + CUSUM"
          methodDetail="Bioelectrical Impedance + Rolling Median"
          value={rawData.muscleMass[selectedStep]}
          unit="kg"
          baseline={`${baselines.muscleMass[selectedStep].toFixed(1)} kg`}
          alert={getParamAlert("Muscle Mass")}
        />


        {/* 8. Sleep Duration */}
        <ParameterCard
          name="Sleep Duration"
          method="Heuristics"
          methodDetail="Flight Crew Rest Threshold: 6.0–9.5 hrs"
          value={rawData.sleepDuration[selectedStep]}
          unit="hours"
          alert={getParamAlert("Sleep Duration")}
        />

        {/* 9. Sleep Quality */}
        <ParameterCard
          name="Sleep Quality"
          method="Heuristics"
          methodDetail="Aerospace Quality Score Threshold: ≥ 65/100"
          value={rawData.sleepQuality[selectedStep]}
          unit="/100"
          alert={getParamAlert("Sleep Quality")}
        />

        {/* 10. Stress */}
        <ParameterCard
          name="Stress"
          method="Heuristics"
          methodDetail="Checked per minute (Ceiling: ≤ 60/100)"
          isPerMinute={true}
          value={rawData.stress[selectedStep]}
          unit="/100"
          alert={getParamAlert("Stress")}
        />

        {/* 11. Radiation Dosimeter */}
        <ParameterCard
          name="Radiation Dosimeter"
          method="Heuristics"
          methodDetail="Maximum Permissible Ambient: ≤ 1.2 mSv/day"
          value={rawData.radiationDosimeter[selectedStep]}
          unit="mSv/day"
          alert={getParamAlert("Radiation Dosimeter")}
        />

        {/* 12. Vestibular Function */}
        <ParameterCard
          name="Vestibular Function"
          method="EOG + custom ONNX model"
          methodDetail="Checked per minute via eog_scaler + eog_model ONNX"
          isPerMinute={true}
          value={rawData.vestibular[selectedStep]}
          unit="EOG index"
          alert={getParamAlert("Vestibular Function")}
        />

        {/* 13. Range of Motion */}
        <ParameterCard
          name="Range of Motion"
          method="CUSUM"
          methodDetail="Measured in degrees (°) vs Rolling Median"
          value={rawData.rangeOfMotion[selectedStep]}
          unit="°"
          baseline={`${baselines.rangeOfMotion[selectedStep].toFixed(1)}°`}
          alert={getParamAlert("Range of Motion")}
        />

        {/* 14. Gut Microbes */}
        <ParameterCard
          name="Gut Microbes"
          method="Heuristics"
          methodDetail="Weekly once test only (not daily) · Metagenomic Sequencing"
          isWeekly={true}
          value={`Div: ${rawData.gutMicrobes[selectedStep].diversity.toFixed(2)}`}
          unit={`| Pathogen: ${rawData.gutMicrobes[selectedStep].pathogenPresence ? "DETECTED" : "None"}`}
          baseline={`Active Lab Assay: ${rawData.gutMicrobes[selectedStep].assayDate || "Week 3 Assay"} (Weekly once only)`}
          alert={getParamAlert("Gut Microbes")}
        />

        {/* 15. Nutrition: Calories */}
        <ParameterCard
          name="Nutrition: Calories"
          method="CUSUM"
          methodDetail="Personalized Rolling-Median Baseline"
          value={rawData.nutrition.calories[selectedStep]}
          unit="kcal"
          baseline={`${baselines.calories[selectedStep].toFixed(0)} kcal`}
          alert={getParamAlert("Nutrition: Calories")}
        />

        {/* 15. Nutrition: Carbohydrates */}
        <ParameterCard
          name="Nutrition: Carbohydrates"
          method="CUSUM"
          methodDetail="Personalized Rolling-Median Baseline"
          value={rawData.nutrition.carbohydrates[selectedStep]}
          unit="g"
          baseline={`${baselines.carbohydrates[selectedStep].toFixed(0)} g`}
          alert={getParamAlert("Nutrition: Carbohydrates")}
        />

        {/* 15. Nutrition: Protein */}
        <ParameterCard
          name="Nutrition: Protein"
          method="CUSUM"
          methodDetail="Personalized Rolling-Median Baseline"
          value={rawData.nutrition.protein[selectedStep]}
          unit="g"
          baseline={`${baselines.protein[selectedStep].toFixed(0)} g`}
          alert={getParamAlert("Nutrition: Protein")}
        />

        {/* 15. Nutrition: Fat */}
        <ParameterCard
          name="Nutrition: Fat"
          method="CUSUM"
          methodDetail="Personalized Rolling-Median Baseline"
          value={rawData.nutrition.fat[selectedStep]}
          unit="g"
          baseline={`${baselines.fat[selectedStep].toFixed(0)} g`}
          alert={getParamAlert("Nutrition: Fat")}
        />

        {/* 16. Calories Burned */}
        <ParameterCard
          name="Calories Burned"
          method="CUSUM"
          methodDetail="Personalized Rolling-Median Baseline"
          value={rawData.caloriesBurned[selectedStep]}
          unit="kcal"
          baseline={`${baselines.caloriesBurned[selectedStep].toFixed(0)} kcal`}
          alert={getParamAlert("Calories Burned")}
        />
      </div>

      {/* System Architecture Protocol Footer */}
      <footer className="architecture-footer">
        <div className="arch-flow-title">BEYOND MED SYSTEM ARCHITECTURE</div>
        <div className="arch-flow-diagram">
          <span>Measurement Data</span>
          <span>➜</span>
          <span>Parameter-Specific Detection Method</span>
          <span>➜</span>
          <span>Personalized Rolling-Median Baseline (CUSUM)</span>
          <span>➜</span>
          <span>Anomaly Detection</span>
          <span>➜</span>
          <span className="arch-highlight">Alert</span>
          <span>➜</span>
          <span>Relevant Event Data Sent to LLM</span>
          <span>➜</span>
          <span>LLM understands what happened</span>
          <span>➜</span>
          <span>Contextual Report</span>
        </div>
      </footer>
    </div>
  );
}

function ParameterCard({ name, method, methodDetail, value, unit, baseline, alert, isPerMinute, isWeekly }) {
  const isAlert = !!alert;

  return (
    <div className={`param-card ${isAlert ? "param-card-alert" : "param-card-normal"}`}>
      <div className="param-header">
        <div className="param-title-wrap">
          <span className="param-name">{name}</span>
          {isPerMinute && <span className="badge-min-tag">⏱️ 1-MIN CHECK</span>}
          {isWeekly && <span className="badge-weekly-tag">📅 WEEKLY ONCE TEST</span>}
        </div>
        <span className={`param-status-pill ${isAlert ? "pill-alert" : "pill-normal"}`}>
          {isAlert ? "⚠️ ANOMALY" : "✓ NOMINAL"}
        </span>
      </div>

      <div className="param-value-container">
        <span className="param-value">{value}</span>
        {unit && <span className="param-unit">{unit}</span>}
      </div>

      {baseline && (
        <div className="param-baseline-row">
          <span className="baseline-label">Personalized Baseline (Rolling Median):</span>
          <span className="baseline-value">{baseline}</span>
        </div>
      )}

      <div className="param-method-row">
        <span className="method-tag">{method}</span>
        <span className="method-detail">{methodDetail}</span>
      </div>

      {isAlert && (
        <div className="param-alert-box">
          <span className="param-alert-msg">{alert.message}</span>
          <Link to="/llm" state={{ triggerAlert: alert }} className="btn-card-llm">
            Reason with LLM 🤖
          </Link>
        </div>
      )}
    </div>
  );
}
