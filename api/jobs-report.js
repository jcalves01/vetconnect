/**
 * POST /api/jobs-report
 * Gera relatório diário de vagas de emprego via Anthropic, Gemini, OpenAI ou DeepSeek.
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
      max_tokens: 1200,
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
      generationConfig: { maxOutputTokens: 1200 },
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
      max_tokens: 1200,
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
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { criteria, jobCount, jobList, provider } = req.body

  if (!jobList) {
    return res.status(400).json({ error: 'Lista de vagas é obrigatória' })
  }

  const providerKey = PROVIDERS[provider] ? provider : 'anthropic'
  const callProvider = PROVIDERS[providerKey]

  const today = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const prompt = `És um assistente especializado em recrutamento veterinário. Gera um relatório diário de vagas de emprego em Português de Portugal, profissional, bem estruturado e fácil de ler.

Data: ${today}
Critérios de pesquisa: ${criteria || 'Todas as áreas e localizações'}
Total de vagas encontradas: ${jobCount || 0}

Lista de vagas:
${jobList}

Cria um relatório com:
1. Resumo executivo (2-3 frases sobre o mercado)
2. Destaques do dia (vagas mais relevantes)
3. Análise por tipo de contrato e localização
4. Tendências salariais
5. Recomendação de acção
6. Nota de rodapé com data e critérios

Tom: profissional, directo, útil. Usa emojis com moderação.`

  try {
    const text = await callProvider(prompt)
    return res.status(200).json({ report: text || 'Sem conteúdo.', provider: providerKey })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Erro interno' })
  }
}
