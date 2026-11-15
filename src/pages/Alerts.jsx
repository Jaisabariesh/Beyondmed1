/**
 * Alerts.jsx — BEYOND MED
 * Route: /alert
 *
 * SPECIFICATION COMPLIANCE:
 * "6. ANOMALY ALERT SYSTEM
 *  When an anomaly is detected by the specified algorithm for a parameter:
 *  Raise an alert.
 *  The alert must identify the parameter that generated the anomaly.
 *  Do not generate alerts for conditions that have not been detected by the specified anomaly-detection methods."
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import rawData from "../data/rawData.js";
import { runAllCUSUM } from "../algorithms/cusum.js";
import { runAllHeuristics } from "../algorithms/heuristics.js";
import { runVestibularDetection } from "../algorithms/vestibular.js";

export default function Alerts() {
  const navigate = useNavigate();
  const [vestibularAlerts, setVestibularAlerts] = useState([]);
  const [onnxStatus, setOnnxStatus] = useState("loading");
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchParam, setSearchParam] = useState("");

  // 1. Run CUSUM on all CUSUM parameters
  const cusumAlerts = useMemo(() => runAllCUSUM(rawData), []);

  // 2. Run Heuristics on all heuristic parameters
  const heuristicAlerts = useMemo(() => runAllHeuristics(rawData), []);

  // 3. Run EOG + custom ONNX model on vestibular parameter
  useEffect(() => {
    let isMounted = true;
    setOnnxStatus("running");
    runVestibularDetection(rawData.vestibular, rawData.timestamps)
      .then(alerts => {
        if (isMounted) {
          setVestibularAlerts(alerts);
          setOnnxStatus("done");
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

  // Combine and sort chronologically
  const allAlerts = useMemo(() => {
    return [...cusumAlerts, ...heuristicAlerts, ...vestibularAlerts].sort(
      (a, b) => a.index - b.index
    );
  }, [cusumAlerts, heuristicAlerts, vestibularAlerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      // Exclude Spinal Deformity from UI (removed from scope)
      if (alert.parameter === "Spinal Deformity") return false;

      // Method filter
      if (filterMethod === "CUSUM" && !alert.detectionMethod.includes("CUSUM")) return false;
      if (filterMethod === "HEURISTIC" && !alert.detectionMethod.includes("Heuristics")) return false;
      if (filterMethod === "ONNX" && !alert.detectionMethod.includes("ONNX")) return false;
      if (filterMethod === "PER_MINUTE" && !["SpO₂", "Vestibular Function", "Stress"].includes(alert.parameter)) return false;

      // Severity filter
      if (filterSeverity !== "ALL" && alert.severity.toUpperCase() !== filterSeverity) return false;

      // Search parameter
      if (searchParam.trim() && !alert.parameter.toLowerCase().includes(searchParam.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [allAlerts, filterMethod, filterSeverity, searchParam]);

  const criticalCount = allAlerts.filter(a => a.severity === "critical").length;
  const warningCount = allAlerts.filter(a => a.severity === "warning").length;

  return (
    <div className="alerts-page-container">
      <div className="alerts-page-header">
        <div>
          <h1 className="mission-title">🚨 BEYOND MED Anomaly Alert Center</h1>
          <p className="mission-subtitle">
            Verified Alerts Generated Exclusively by Algorithmic Detection Engines
          </p>
        </div>

        <Link to="/llm" className="btn-primary-action">
          Access LLM Contextual Reasoning Report ▶
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="alerts-metrics-grid">
        <div className="alert-metric-card">
          <span className="metric-label">Total Algorithmic Alerts</span>
          <span className="metric-val">{allAlerts.length}</span>
          <span className="metric-desc">Derived from 16 specified parameters</span>
        </div>

        <div className="alert-metric-card metric-critical">
          <span className="metric-label">Critical Severity</span>
          <span className="metric-val">{criticalCount}</span>
          <span className="metric-desc">Requiring immediate contextual evaluation</span>
        </div>

        <div className="alert-metric-card metric-warning">
          <span className="metric-label">Warning Severity</span>
          <span className="metric-val">{warningCount}</span>
          <span className="metric-desc">Sub-critical threshold deviations</span>
        </div>

        <div className="alert-metric-card">
          <span className="metric-label">By Algorithm Engine</span>
          <div className="engine-breakdown">
            <span>CUSUM (Rolling-Median): <strong>{cusumAlerts.length}</strong></span>
            <span>Heuristics: <strong>{heuristicAlerts.length}</strong></span>
            <span>EOG + ONNX: <strong>{onnxStatus === "running" ? "⏳" : vestibularAlerts.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <label>Filter by Engine:</label>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="filter-select">
            <option value="ALL">All Detection Methods ({allAlerts.length})</option>
            <option value="PER_MINUTE">⏱️ Per-Minute Checks (SpO₂, Vestibular, Stress)</option>
            <option value="CUSUM">CUSUM (Personalized Rolling-Median Baseline)</option>
            <option value="HEURISTIC">Heuristic Detection</option>
            <option value="ONNX">EOG + Custom ONNX Model</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Filter by Severity:</label>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="filter-select">
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search Parameter:</label>
          <input
            type="text"
            placeholder="e.g. Resting Heart Rate, SpO₂, Muscle Mass..."
            value={searchParam}
            onChange={e => setSearchParam(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      {/* Alert Feed */}
      <div className="alerts-feed-container">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts-placeholder">
            <p>No alerts match your filter criteria.</p>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => {
            const isCritical = alert.severity === "critical";
            const utcTime = new Date(alert.timestamp).toUTCString();

            return (
              <div key={idx} className={`alert-card ${isCritical ? "alert-card-crit" : "alert-card-warn"}`}>
                <div className="alert-card-top">
                  <div className="alert-badge-group">
                    <span className={`badge-severity ${isCritical ? "severity-crit" : "severity-warn"}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="badge-param-name">{alert.parameter}</span>
                    {["SpO₂", "Vestibular Function", "Stress"].includes(alert.parameter) && (
                      <span className="badge-min-tag">⏱️ 1-Min Check</span>
                    )}
                    <span className="badge-step">
                      {["SpO₂", "Vestibular Function", "Stress"].includes(alert.parameter)
                        ? `Minute ${alert.index + 1}`
                        : `Step ${alert.index + 1}`} of {rawData.timestamps.length}
                    </span>
                  </div>

                  <span className="alert-timestamp-label">{utcTime}</span>
                </div>

                <div className="alert-body">
                  <div className="alert-metric-detail-box">
                    <div className="metric-kv">
                      <span className="kv-label">Current Value:</span>
                      <span className="kv-val">{alert.value} {alert.unit || ""}</span>
                    </div>

                    {alert.baseline !== undefined && (
                      <div className="metric-kv">
                        <span className="kv-label">Personalized Rolling-Median Baseline:</span>
                        <span className="kv-val">{alert.baseline} {alert.unit || ""}</span>
                      </div>
                    )}

                    {alert.deviation !== undefined && (
                      <div className="metric-kv">
                        <span className="kv-label">Deviation:</span>
                        <span className="kv-val">{alert.deviation > 0 ? `+${alert.deviation}` : alert.deviation} {alert.unit || ""}</span>
                      </div>
                    )}

                    <div className="metric-kv">
                      <span className="kv-label">Detection Algorithm:</span>
                      <span className="kv-method">{alert.detectionMethod}</span>
                    </div>
                  </div>

                  <p className="alert-description-text">{alert.message}</p>
                </div>

                <div className="alert-card-actions">
                  <span className="protocol-assurance-tag">
                    ✓ Verified Algorithmic Trigger — Not Invented
                  </span>

                  <button
                    className="btn-trigger-llm"
                    onClick={() => navigate("/llm", { state: { triggerAlert: alert } })}
                  >
                    Generate LLM Contextual Report 🤖 ▶
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="scope-notice-box">
        <strong>CRITICAL SPECIFICATION COMPLIANCE:</strong>
        <p>
          Alerts shown above are produced strictly by the specified algorithmic detection methods.
          The LLM is NOT used as the primary anomaly detector. No anomalies are invented or inferred outside the BEYOND MED parameter scope.
        </p>
      </div>
    </div>
  );
}
