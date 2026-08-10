/* ============================================================================
   App.jsx — FRONTEND ENTRY POINT
   ============================================================================

   >>> DROP YOUR VETCONNECT COMPONENT HERE <<<

   1. Open your VetConnect artifact and copy the ENTIRE .jsx source.
   2. Delete everything in this file BELOW the import lines just under this
      comment block, and paste your component in its place.
   3. Make sure your top-level component is exported as the default export.
      If your file already ends with `export default function VetConnect(){...}`
      you're done. If it ends with just `function VetConnect(){...}` add:
          export default VetConnect;

   4. Replace the two direct Anthropic API calls with the secure helpers.
      See README.md ("Passo 4 — Ligar o frontend ao backend") for the exact
      before/after snippets. In short:

        - import { callDiagnosis, callJobsReport } from "./lib/api.js";
        - the AI-diagnosis `run()` function calls  callDiagnosis(payload)
        - the jobs-report generator calls          callJobsReport(payload)

      Delete the old `fetch("https://api.anthropic.com/...")` blocks and the
      `anthropic-dangerous-direct-browser-access` header entirely — the key
      now lives only on the server.

   `recharts` is already installed (used by your Profile → Estatísticas charts),
   so `import { ... } from "recharts"` works out of the box.
   ============================================================================ */

import React from "react";
// import { callDiagnosis, callJobsReport } from "./lib/api.js";

// ---------------------------------------------------------------------------
// PLACEHOLDER — remove this and paste your VetConnect component instead.
// This lets `npm run dev` run before you've integrated your code.
// ---------------------------------------------------------------------------
export default function App() {
  const box = {
    maxWidth: 560,
    margin: "10vh auto",
    padding: 32,
    fontFamily: "inherit",
    color: "#0F1923",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 30px rgba(15,25,35,0.08)",
    lineHeight: 1.6,
  };
  const code = {
    background: "#eef2f6",
    borderRadius: 6,
    padding: "2px 6px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
  };
  return (
    <div style={box}>
      <div style={{ fontSize: 34 }}>🐾</div>
      <h1 style={{ margin: "8px 0 4px" }}>VetConnect — scaffold pronto</h1>
      <p style={{ color: "#5a6b7b" }}>
        O projeto frontend + backend está montado. Falta apenas colar o teu
        componente.
      </p>
      <ol style={{ paddingLeft: 20 }}>
        <li>
          Cola o teu componente VetConnect em <span style={code}>src/App.jsx</span>{" "}
          (substitui este placeholder).
        </li>
        <li>
          Liga as chamadas de IA aos helpers em{" "}
          <span style={code}>src/lib/api.js</span>.
        </li>
        <li>
          Configura <span style={code}>ANTHROPIC_API_KEY</span> (ver{" "}
          <span style={code}>README.md</span>).
        </li>
      </ol>
      <p style={{ color: "#5a6b7b", marginBottom: 0 }}>
        Instruções passo-a-passo completas em <span style={code}>README.md</span>.
      </p>
    </div>
  );
}
