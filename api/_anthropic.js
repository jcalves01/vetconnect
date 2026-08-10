/* ============================================================================
   api/_anthropic.js — SHARED SERVER-SIDE HELPER (not a route)
   ----------------------------------------------------------------------------
   Files whose name starts with "_" are NOT exposed as HTTP endpoints by Vercel,
   so this module is safe to import from the real routes (diagnosis, jobs-report)
   without becoming a public URL itself.

   The Anthropic API key is read from process.env.ANTHROPIC_API_KEY and NEVER
   sent to the browser. This is the whole point of the frontend/backend split:
   the key lives only here, on the server.
   ============================================================================ */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Call the Anthropic Messages API and return the concatenated text content.
 * @param {object} opts
 * @param {string} opts.system      System prompt.
 * @param {Array}  opts.messages    [{ role, content }] message array.
 * @param {number} [opts.maxTokens] Max output tokens (default 4000).
 * @param {string} [opts.model]     Override model.
 * @returns {Promise<string>} The model's text output.
 */
export async function callAnthropic({ system, messages, maxTokens = 4000, model }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "ANTHROPIC_API_KEY não está configurada no servidor. Define-a nas Environment Variables da Vercel."
    );
    err.statusCode = 500;
    throw err;
  }

  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  if (!resp.ok) {
    let detail = "";
    try {
      detail = await resp.text();
    } catch {
      /* ignore */
    }
    const err = new Error(
      `Erro da API Anthropic (HTTP ${resp.status}): ${detail.slice(0, 500)}`
    );
    err.statusCode = resp.status === 401 ? 500 : 502; // hide key problems as 500
    throw err;
  }

  const data = await resp.json();
  const text = Array.isArray(data.content)
    ? data.content.map((b) => (b.type === "text" ? b.text : "")).join("")
    : "";
  return text;
}

/**
 * Robustly extract a JSON object from a model's text response.
 * Handles ```json fences and leading/trailing prose by locating the first
 * "{" and the last "}". Throws with a snippet of the raw text if it fails,
 * so the caller can surface a useful error.
 * @param {string} text
 * @returns {object}
 */
export function extractJson(text) {
  let cleaned = String(text || "").trim();
  // Strip markdown code fences if present.
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    const err = new Error(
      "Não foi possível interpretar JSON da resposta do modelo. Resposta: " +
        cleaned.slice(0, 300)
    );
    err.statusCode = 502;
    throw err;
  }
  const slice = cleaned.slice(first, last + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    const err = new Error(
      "JSON inválido na resposta do modelo (possível truncagem). Início: " +
        slice.slice(0, 300)
    );
    err.statusCode = 502;
    throw err;
  }
}

/**
 * Minimal shared request guard for the POST-only JSON routes.
 * Returns the parsed body, or sends an error response and returns null.
 */
export function readPostBody(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido. Usa POST." });
    return null;
  }
  // Vercel Node functions auto-parse JSON bodies when content-type is set,
  // but guard for the string case just in case.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body || {};
}
