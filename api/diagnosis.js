/**
 * POST /api/diagnosis
 * Gera diagnóstico diferencial veterinário via Anthropic, Gemini, OpenAI ou DeepSeek.
 * As chaves de API ficam seguras no servidor — nunca expostas ao cliente.
 */

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

function providerError(providerName, status, message) {
  const err = new Error(`${providerName}: ${message}`)
  err.status = status
  return err
}

async function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw providerError('Anthropic', 500, 'ANTHROPIC_API_KEY não configurada no servidor')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw providerError('Anthropic', response.status, err?.error?.message || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw providerError('Gemini', 500, 'GEMINI_API_KEY não configurada no servidor')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4000 },
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw providerError('Gemini', response.status, err?.error?.message || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')
}

// OpenAI and DeepSeek both speak the same Chat Completions request/response shape.
async function callOpenAICompatible({ baseUrl, apiKey, model, providerName }, prompt) {
  if (!apiKey) throw providerError(providerName, 500, `${providerName.toUpperCase()}_API_KEY não configurada no servidor`)

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw providerError(providerName, response.status, err?.error?.message || `HTTP ${response.status}`)
  }
  const data = await response.json()
  return data?.choices?.[0]?.message?.content || ''
}

const callOpenAI = (prompt) => callOpenAICompatible({
  baseUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: process.env.OPENAI_API_KEY,
  model: OPENAI_MODEL,
  providerName: 'OpenAI',
}, prompt)

const callDeepSeek = (prompt) => callOpenAICompatible({
  baseUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: DEEPSEEK_MODEL,
  providerName: 'DeepSeek',
}, prompt)

const PROVIDERS = {
  anthropic: callAnthropic,
  gemini: callGemini,
  openai: callOpenAI,
  deepseek: callDeepSeek,
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { species, breed, age, sex, symptoms, extra, labText, provider } = req.body

  if (!species || !symptoms) {
    return res.status(400).json({ error: 'Espécie e sinais clínicos são obrigatórios' })
  }

  const providerKey = PROVIDERS[provider] ? provider : 'anthropic'
  const callProvider = PROVIDERS[providerKey]

  const prompt = [
    'Veterinário especialista. Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.',
    `Caso: Espécie=${species}, Raça=${breed || 'nd'}, Idade=${age || 'nd'}, Sexo=${sex || 'nd'}.`,
    `Sinais: ${symptoms}.`,
    extra ? `Anamnese: ${extra}.` : '',
    labText ? `Labs: ${labText}.` : '',
    '',
    'Formato JSON exacto (campos CURTOS, máx 2 frases cada):',
    '{"resumo":"...","urgencia":"Urgente|Semi-urgente|Eletivo","proximos_passos":"...","diagnosticos":[{"nome":"...","probabilidade":"Alta|Média|Baixa","justificacao":"...","testes":["..."],"tratamento_inicial":"..."}]}',
    '',
    'Devolva 4 diagnósticos. Respostas curtas e objectivas. Apenas JSON, nada mais.',
  ].filter(Boolean).join('\n')

  try {
    const rawText = await callProvider(prompt)

    if (!rawText.trim()) {
      return res.status(502).json({ error: 'Resposta vazia da API' })
    }

    // Extract JSON from response
    const start = rawText.indexOf('{')
    const end = rawText.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return res.status(502).json({
        error: 'Resposta não contém JSON',
        raw: rawText.slice(0, 300),
      })
    }

    const parsed = JSON.parse(rawText.slice(start, end + 1))

    if (!parsed.diagnosticos || !Array.isArray(parsed.diagnosticos)) {
      return res.status(502).json({
        error: 'JSON sem campo diagnosticos',
        fields: Object.keys(parsed),
      })
    }

    return res.status(200).json({ ...parsed, provider: providerKey })
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err instanceof SyntaxError
        ? 'Erro ao interpretar JSON da API'
        : err.message || 'Erro interno',
    })
  }
}
