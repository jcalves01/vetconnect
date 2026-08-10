/* ============================================================================
   api/diagnosis.js — POST /api/diagnosis
   ----------------------------------------------------------------------------
   Secure server-side replacement for the old in-browser Anthropic call in the
   AIDiagnosis section. The prompt lives here (server-side), so the browser only
   sends the clinical inputs and receives clean, parsed JSON back.

   Request body (all optional except species + at least one clinical sign):
     {
       "especie":       "Canídeo",
       "raca":          "Golden Retriever",
       "idade":         "6 anos",
       "sexo":          "Macho",
       "sinais":        ["vómito", "diarreia", "icterícia"],   // array of strings
       "sintomasLivres":"prostração desde ontem",              // free text
       "sangue":        "ALT 320, FA 210",                     // free text / null
       "urina":         "bilirrubinúria",                      // free text / null
       "fezes":         "sem alterações"                       // free text / null
     }

   Response:
     {
       "resumo": "…",
       "diagnosticos": [
         { "nome","probabilidade","justificacao","testes","tratamento","urgencia" }
       ]
     }
   ============================================================================ */

import { callAnthropic, extractJson, readPostBody } from "./_anthropic.js";

export default async function handler(req, res) {
  const body = readPostBody(req, res);
  if (!body) return;

  const {
    especie = "",
    raca = "",
    idade = "",
    sexo = "",
    sinais = [],
    sintomasLivres = "",
    sangue = "",
    urina = "",
    fezes = "",
    lang = "pt",
  } = body;

  const signList = [
    Array.isArray(sinais) ? sinais.filter(Boolean).join(", ") : String(sinais || ""),
    sintomasLivres,
  ]
    .filter(Boolean)
    .join("; ");

  if (!especie && !signList) {
    res
      .status(400)
      .json({ error: "Faltam dados clínicos: indica pelo menos a espécie e um sinal clínico." });
    return;
  }

  const system =
    "És um assistente de diagnóstico diferencial veterinário. Respondes SEMPRE e APENAS com JSON válido, sem texto antes ou depois, sem markdown. " +
    `Escreve o conteúdo textual na língua com o código ISO "${lang}".`;

  const userPrompt = [
    "Gera um diagnóstico diferencial veterinário para o seguinte caso.",
    "",
    `Espécie: ${especie || "não indicada"}`,
    `Raça: ${raca || "não indicada"}`,
    `Idade: ${idade || "não indicada"}`,
    `Sexo: ${sexo || "não indicado"}`,
    `Sinais clínicos: ${signList || "não indicados"}`,
    sangue ? `Análise sanguínea: ${sangue}` : "",
    urina ? `Análise de urina: ${urina}` : "",
    fezes ? `Análise de fezes: ${fezes}` : "",
    "",
    "Responde com este esquema JSON exacto (máximo 4 diagnósticos, ordenados por probabilidade decrescente):",
    `{
  "resumo": "síntese de 1-2 frases do quadro clínico",
  "diagnosticos": [
    {
      "nome": "nome do diagnóstico",
      "probabilidade": "Alta | Média | Baixa",
      "justificacao": "porquê, com base nos sinais e análises",
      "testes": "exames recomendados para confirmar",
      "tratamento": "tratamento inicial sugerido",
      "urgencia": "Emergência | Urgente | Não urgente"
    }
  ]
}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const text = await callAnthropic({
      system,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 4000,
    });
    const json = extractJson(text);
    if (!Array.isArray(json.diagnosticos)) {
      res.status(502).json({
        error:
          "A resposta do modelo não continha a lista de diagnósticos esperada. Campos recebidos: " +
          Object.keys(json).join(", "),
      });
      return;
    }
    res.status(200).json(json);
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Erro ao gerar diagnóstico." });
  }
}
