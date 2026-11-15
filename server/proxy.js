/**
 * proxy.js — BEYOND MED Local OpenAI Proxy Server
 *
 * Pure Node.js (no npm dependencies). Runs on port 3001.
 * Vite forwards /api/openai → this server via vite.config.js proxy.
 * Browser calls POST /api/openai/chat → server forwards to api.openai.com
 * using the VITE_OPENAI_API_KEY from .env (key stays server-side only).
 */

import http from "http";
import https from "https";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
function loadEnv() {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.warn("Could not load .env:", e.message);
  }
}
loadEnv();

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || "";
const PORT = 3001;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === "/api/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", keyPresent: !!OPENAI_API_KEY }));
    return;
  }

  // OpenAI chat proxy
  if (req.url === "/api/openai/chat" && req.method === "POST") {
    if (!OPENAI_API_KEY) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "VITE_OPENAI_API_KEY not configured in .env" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }

      const { messages, model = "gpt-4o-mini", temperature = 0.1, max_tokens = 1200 } = parsed;

      if (!messages || !Array.isArray(messages)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "messages array is required" }));
        return;
      }

      const payload = JSON.stringify({ model, messages, temperature, max_tokens });

      const options = {
        hostname: "api.openai.com",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => { data += chunk; });
        proxyRes.on("end", () => {
          res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
          res.end(data);
        });
      });

      proxyReq.on("error", (err) => {
        console.error("OpenAI proxy request error:", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Proxy upstream error: ${err.message}` }));
      });

      proxyReq.write(payload);
      proxyReq.end();
    });
    return;
  }

  // 404 for anything else
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`✅ BEYOND MED OpenAI Proxy → http://localhost:${PORT}`);
  console.log(`   OpenAI key present: ${!!OPENAI_API_KEY}`);
  console.log(`   Endpoint: POST http://localhost:${PORT}/api/openai/chat`);
});
