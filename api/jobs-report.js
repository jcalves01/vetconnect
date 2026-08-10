/* ============================================================================
   api/jobs-report.js — POST /api/jobs-report
   ----------------------------------------------------------------------------
   Secure server-side replacement for the old in-browser Anthropic call that
   generated the "Relatório Diário de Vagas" in the Marketplace/Emprego section.

   Request body:
     {
       "vagas": [                       // the currently-filtered job list
         { "titulo","empresa","tipo","local","salario","urgente","match" }
       ],
       "filtros": { "texto":"Cirurgia", "local":"Lisboa" },  // active filters (optional)
       "data":    "2026-08-10",         // report date (optional; caller supplies it)
       "lang":    "pt"
     }

   Response:
     { "relatorio": "…texto do relatório pronto a mostrar/copiar/descarregar…" }

   NOTE: the browser passes the date in `data` because serverless functions
   should not assume the user's timezone. Send `new Date().toISOString()` or a
   localized string from the client.
   ============================================================================ */

import { callAnthropic, readPostBody } from "./_anthropic.js";

export default async function handler(req, res) {
  const body = readPostBody(req, res);
  if (!body) return;

  const { vagas = [], filtros = {}, data = "", lang = "pt" } = body;

  if (!Array.isArray(vagas) || vagas.length === 0) {
    res
      .status(400)
      .json({ error: "Não há vagas para analisar. Envia a lista filtrada em `vagas`." });
    return;
  }

  const vagasTxt = vagas
    .map((v, i) => {
      const parts = [
        `${i + 1}. ${v.titulo || "(sem título)"} — ${v.empresa || "?"}`,
        v.tipo ? `tipo: ${v.tipo}` : "",
        v.local ? `local: ${v.local}` : "",
        v.salario ? `salário: ${v.salario}` : "",
        v.urgente ? "URGENTE" : "",
        v.match != null ? `match: ${v.match}%` : "",
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .join("\n");

  const filtroTxt =
    [
      filtros.texto ? `pesquisa: "${filtros.texto}"` : "",
      filtros.local ? `localização: "${filtros.local}"` : "",
    ]
      .filter(Boolean)
      .join(", ") || "sem filtros (todas as vagas)";

  const system =
    "És um analista do mercado de emprego veterinário. Produzes relatórios claros e accionáveis em texto simples (sem markdown pesado). " +
    `Escreve na língua com o código ISO "${lang}".`;

  const userPrompt = [
    `Gera o RELATÓRIO DIÁRIO DE VAGAS${data ? ` (${data})` : ""} com base nestas vagas.`,
    `Filtros activos: ${filtroTxt}.`,
    "",
    "Vagas:",
    vagasTxt,
    "",
    "Estrutura o relatório com estas secções:",
    "1) Resumo executivo do mercado (2-3 frases)",
    "2) Destaques do dia (vagas urgentes, melhor match, mais relevantes)",
    "3) Análise por tipo de contrato e por localização",
    "4) Tendências salariais observadas",
    "5) Recomendação de acção personalizada",
    "Termina com uma nota de rodapé com a data e os critérios usados.",
  ].join("\n");

  try {
    const relatorio = await callAnthropic({
      system,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 2000,
    });
    res.status(200).json({ relatorio });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Erro ao gerar o relatório de vagas." });
  }
}
