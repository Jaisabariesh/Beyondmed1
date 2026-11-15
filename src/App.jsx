import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Alerts from "./pages/Alerts.jsx";
import LLMReport from "./pages/LLMReport.jsx";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="beyond-med-app">
        {/* Aerospace Top Navigation Bar */}
        <header className="app-nav">
          <div className="nav-left">
            <span className="mission-logo">🛰️</span>
            <div className="nav-title-block">
              <span className="brand-title">BEYOND MED</span>
              <span className="brand-tagline">Astronaut Health-Monitoring System</span>
            </div>
          </div>

          <nav className="nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-item ${isActive ? "active-link" : ""}`}
            >
              <span className="nav-icon">📊</span>
              Dashboard
            </NavLink>

            <NavLink
              to="/alert"
              className={({ isActive }) => `nav-item ${isActive ? "active-link" : ""}`}
            >
              <span className="nav-icon">🚨</span>
              Alert Center
            </NavLink>

            <NavLink
              to="/llm"
              className={({ isActive }) => `nav-item ${isActive ? "active-link" : ""}`}
            >
              <span className="nav-icon">🤖</span>
              LLM Contextual Reasoning
            </NavLink>
          </nav>

          <div className="nav-right">
            <span className="telemetry-live-indicator">
              <span className="live-dot"></span>
              TELEMETRY NOMINAL
            </span>
          </div>
        </header>

        {/* Main Routed Content */}
        <main className="app-main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alert" element={<Alerts />} />
            <Route path="/llm" element={<LLMReport />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
