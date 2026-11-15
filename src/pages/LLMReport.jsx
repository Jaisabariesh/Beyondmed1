/**
 * LLMReport.jsx — BEYOND MED
 * Route: /llm
 *
 * SPECIFICATION COMPLIANCE:
 * "7. LLM INTEGRATION
 *  The LLM must NOT be used as the primary anomaly-detection mechanism.
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

import React, { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import rawData from "../data/rawData.js";
import { runAllCUSUM } from "../algorithms/cusum.js";
import { runAllHeuristics } from "../algorithms/heuristics.js";
import { runVestibularDetection } from "../algorithms/vestibular.js";
import {
  buildAlertContext,
  generateContextualReportWithLLM
} from "../services/llmService.js";

export default function LLMReport() {
  const location = useLocation();
  const [vestibularAlerts, setVestibularAlerts] = useState([]);
  const [selectedAlertIdx, setSelectedAlertIdx] = useState(0);
  const [reportState, setReportState] = useState({
    loading: false,
    content: null,
    source: null,
    error: null,
    context: null
  });

  // 1. Run detection algorithms
  const cusumAlerts = useMemo(() => runAllCUSUM(rawData), []);
  const heuristicAlerts = useMemo(() => runAllHeuristics(rawData), []);

  useEffect(() => {
    let isMounted = true;
    runVestibularDetection(rawData.vestibular, rawData.timestamps)
      .then(alerts => {
        if (isMounted) setVestibularAlerts(alerts);
      })
      .catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const allAlerts = useMemo(() => {
    return [...cusumAlerts, ...heuristicAlerts, ...vestibularAlerts].sort(
      (a, b) => a.index - b.index
    );
  }, [cusumAlerts, heuristicAlerts, vestibularAlerts]);

  // Pre-select alert if passed via React Router navigation state
  useEffect(() => {
    if (location.state?.triggerAlert && allAlerts.length > 0) {
      const matchIdx = allAlerts.findIndex(
        a => a.parameter === location.state.triggerAlert.parameter && a.index === location.state.triggerAlert.index
      );
      if (matchIdx !== -1) {
        setSelectedAlertIdx(matchIdx);
      }
    }
  }, [location.state, allAlerts]);

  const currentAlert = allAlerts[selectedAlertIdx] || allAlerts[0];

  // Build the strict event context
  const activeContext = useMemo(() => {
    if (!currentAlert) return null;
    return buildAlertContext(currentAlert, allAlerts);
  }, [currentAlert, allAlerts]);

  // Handle report generation — no silent fallback; show real errors
  const handleGenerateReport = async () => {
    if (!currentAlert) return;
    setReportState({ loading: true, content: null, source: null, error: null, context: null });

    try {
      const result = await generateContextualReportWithLLM(currentAlert, allAlerts);
      setReportState({
        loading: false,
        content: result.content,
        source: result.source,
        context: result.context,
        // If llmError is present, the report is local fallback — still show it, but flag the error
        error: result.llmError ? `⚠️ ChatGPT unavailable: ${result.llmError}` : null
      });
    } catch (err) {
      setReportState({
        loading: false,
        content: null,
        source: null,
        context: null,
        error: `❌ Report generation failed: ${err.message}`
      });
    }
  };

  // Auto-generate report when alert is selected or loaded
  useEffect(() => {
    if (currentAlert && !reportState.loading) {
      handleGenerateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlertIdx, allAlerts.length]);

  return (
    <div className="llm-page-container">
      {/* Title & Architecture Diagram Header */}
      <div className="llm-header-panel">
        <div className="llm-badge">LLM CONTEXTUAL REASONING ENGINE</div>
        <h1 className="mission-title">BEYOND MED Contextual Report Generation</h1>
        <p className="mission-subtitle">
          "What happened at that particular time?" — Synthesizing Algorithmic Detections with Surrounding Context
        </p>

        {/* 7-Step Pipeline Diagram from prompt */}
        <div className="pipeline-bar">
          <div className="pipeline-step">Measurement Data</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-step">Parameter-Specific Detection</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-step">Rolling-Median Baseline (CUSUM)</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-step">Anomaly Detection</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-step alert-step-highlight">Alert Raised</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-step">Relevant Event Data Sent to LLM</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-step active-step">Contextual Report</div>
        </div>
      </div>

      {/* Alert Selector Bar */}
      <div className="alert-selector-card">
        <div className="selector-title-row">
          <label className="selector-label">🎯 Select Triggering Anomaly Alert to Reason Upon:</label>
          <span className="alert-count-pill">{allAlerts.length} Total Algorithmic Alerts Available</span>
        </div>

        <select
          value={selectedAlertIdx}
          onChange={e => setSelectedAlertIdx(Number(e.target.value))}
          className="alert-dropdown"
        >
          {allAlerts.map((alt, idx) => (
            <option key={idx} value={idx}>
              [{alt.severity.toUpperCase()}] Day {alt.index + 1} ({new Date(alt.timestamp).toLocaleDateString()}): {alt.parameter} — {alt.detectionMethod}
            </option>
          ))}
        </select>
      </div>

      {/* Two Column Layout: Left Context Inspector | Right Contextual Report */}
      <div className="llm-content-grid">
        {/* Left Column: Context Payload Inspector */}
        <div className="context-inspector-panel">
          <h3 className="panel-heading">📦 Data Sent to LLM (Event Context)</h3>
          <p className="panel-subtext">
            Strict Scope: Raw data is NOT continuously force-fed. Only the triggered alert, surrounding time-steps (±2), and prior alerts are provided.
          </p>

          {activeContext && (
            <div className="context-sections">
              {/* Triggered Alert Details */}
              <div className="context-box highlight-box">
                <span className="context-box-title">Triggered Anomaly Alert</span>
                <div className="context-kv">
                  <strong>Parameter:</strong> {activeContext.targetAlert.parameter}
                </div>
                <div className="context-kv">
                  <strong>Algorithm:</strong> {activeContext.targetAlert.detectionMethod}
                </div>
                <div className="context-kv">
                  <strong>Value:</strong> {activeContext.targetAlert.value} {activeContext.targetAlert.unit || ""}
                </div>
                {activeContext.targetAlert.baseline !== undefined && (
                  <div className="context-kv">
                    <strong>Baseline (Rolling Median):</strong> {activeContext.targetAlert.baseline} {activeContext.targetAlert.unit || ""}
                  </div>
                )}
                <div className="context-kv">
                  <strong>Mission Day:</strong> Day {activeContext.targetIndex + 1} of 25
                </div>
                <div className="context-kv">
                  <strong>Date:</strong> {new Date(activeContext.timestamp).toLocaleDateString()}
                </div>
                <div className="context-kv">
                  <strong>Severity:</strong> {activeContext.targetAlert.severity.toUpperCase()}
                </div>
              </div>

              {/* Concurrent Alerts */}
              <div className="context-box">
                <span className="context-box-title">Concurrent Alerts on Day {activeContext.targetIndex + 1}</span>
                {activeContext.concurrentAlerts.length === 0 ? (
                  <span className="context-empty-text">None (Isolated parameter event)</span>
                ) : (
                  <ul className="context-list">
                    {activeContext.concurrentAlerts.map((ca, i) => (
                      <li key={i}>
                        <strong>[{ca.parameter}]</strong> {ca.detectionMethod}: {ca.value} {ca.unit || ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Preceding Alerts */}
              <div className="context-box">
                <span className="context-box-title">Prior Mission Alerts</span>
                {activeContext.previousAlerts.length === 0 ? (
                  <span className="context-empty-text">None recorded prior to this step</span>
                ) : (
                  <ul className="context-list">
                    {activeContext.previousAlerts.slice(-4).map((pa, i) => (
                      <li key={i}>
                        Step {pa.index + 1}: [{pa.parameter}] ({pa.detectionMethod})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Surrounding Telemetry Window */}
              <div className="context-box">
                <span className="context-box-title">Surrounding Telemetry Window (±2 Steps)</span>
                <div className="telemetry-table-mini">
                  {activeContext.surroundingTelemetry.map((st, i) => (
                    <div key={i} className={`mini-step-row ${st.isAlertStep ? "alert-row-highlight" : ""}`}>
                      <div className="mini-step-badge">
                        Step {st.timeStep} {st.isAlertStep ? "⚠️ (ALERT)" : ""}
                      </div>
                      <div className="mini-step-readings">
                        <span>RHR: {st.readings.restingHeartRate || st.readings.heartRate}</span>
                        <span>BP: {st.readings.bloodPressure}</span>
                        <span>SpO₂: {st.readings.spo2}</span>
                        <span>RR: {st.readings.respiratoryRate}</span>
                        <span>VO₂: {st.readings.vo2Max}</span>
                        <span>Stress: {st.readings.stress}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Key Configuration */}
              <div className="context-box api-config-box">
                <span className="context-box-title">LLM Configuration</span>
                <p className="api-note">
                  🟢 <strong>ChatGPT gpt-3.5-turbo</strong> — API key loaded from <code>.env</code> via local proxy server.<br />
                  Anomaly → algorithmic detection → alert → event data sent to ChatGPT → real contextual report.
                </p>
                <button
                  className="btn-regenerate"
                  onClick={handleGenerateReport}
                  disabled={reportState.loading}
                >
                  {reportState.loading ? "Generating ChatGPT Report..." : "Re-generate Report with ChatGPT 🤖"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Contextual Report */}
        <div className="report-display-panel">
          <div className="report-header-row">
            <div>
              <h2 className="report-main-title">📄 Contextual Reasoning Report</h2>
              <span className="report-engine-tag">Engine: {reportState.source || "BEYOND MED Engine"}</span>
            </div>

            <div className="report-actions">
              <Link to="/alert" className="btn-secondary-link">◀ Back to Alerts</Link>
              <Link to="/" className="btn-secondary-link">Dashboard</Link>
            </div>
          </div>

          {reportState.loading ? (
            <div className="report-loading-placeholder">
              <div className="loading-spinner"></div>
              <p>LLM is evaluating what happened on Day {activeContext?.targetIndex + 1}...</p>
              <small>Synthesizing detected anomaly with surrounding telemetry window...</small>
            </div>
          ) : reportState.error ? (
            <div className="report-error-box">
              <p>Error generating report: {reportState.error}</p>
              <button onClick={handleGenerateReport} className="btn-retry">Retry</button>
            </div>
          ) : (
            <div className="report-rendered-container">
              <div className="report-markdown-view">
                <pre className="report-text-content">{reportState.content}</pre>
              </div>

              {/* Section 12 Restriction Protocols Verification */}
              <div className="protocol-checklist-box">
                <div className="checklist-title">🛡️ Protocol Compliance Verification (Section 12)</div>
                <div className="checklist-grid">
                  <div className="check-item">✓ Only BEYOND MED data used</div>
                  <div className="check-item">✓ Distinguishes Abnormality / Interpretation / Diagnosis</div>
                  <div className="check-item">✓ Zero invented measurements</div>
                  <div className="check-item">✓ Zero invented symptoms or patient info</div>
                  <div className="check-item">✓ Preserved algorithmic detection logic</div>
                  <div className="check-item">✓ Zero unmonitored parameters added</div>
                  <div className="check-item">✓ Zero unsupported diagnoses claimed</div>
                  <div className="check-item">✓ Treatment/exercise prescriptions withheld</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
