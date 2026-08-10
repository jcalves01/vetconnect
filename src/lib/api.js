/* ============================================================================
   src/lib/api.js — FRONTEND API HELPERS
   ----------------------------------------------------------------------------
   These call your own backend (/api/*) instead of Anthropic directly.
   No API key is ever present in the browser.

   Usage inside your VetConnect component:

     import { callDiagnosis, callJobsReport } from "./lib/api.js";

     // AI differential diagnosis:
     const result = await callDiagnosis({
       especie, raca, idade, sexo,
       sinais,          // array of selected signs
       sintomasLivres,  // free-text box
       sangue, urina, fezes,
       lang,            // current UI language code, e.g. "pt"
     });
     // result => { resumo, diagnosticos: [...] }

     // Daily jobs report:
     const { relatorio } = await callJobsReport({
       vagas: filteredJobs,               // the filtered job array
       filtros: { texto, local },         // active search filters
       data: new Date().toLocaleDateString(lang), // pass the date from the client
       lang,
     });
   ============================================================================ */

async function postJson(path, payload) {
  const resp = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  let data = null;
  try {
    data = await resp.json();
  } catch {
    /* non-JSON response */
  }

  if (!resp.ok) {
    const msg =
      (data && data.error) ||
      `Erro ${resp.status} ao contactar o servidor.`;
    throw new Error(msg);
  }
  return data;
}

/** AI differential diagnosis. Returns { resumo, diagnosticos: [...] }. */
export function callDiagnosis(payload) {
  return postJson("/api/diagnosis", payload);
}

/** Daily jobs report. Returns { relatorio: "…" }. */
export function callJobsReport(payload) {
  return postJson("/api/jobs-report", payload);
}
