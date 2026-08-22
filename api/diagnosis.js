/**
 * POST /api/diagnosis
 * Gera diagnóstico diferencial veterinário via Anthropic API
 * A chave API fica segura no servidor — nunca exposta ao cliente
 */
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key não configurada no servidor' })
  }

  const { species, breed, age, sex, symptoms, extra, labText } = req.body

  if (!species || !symptoms) {
    return res.status(400).json({ error: 'Espécie e sinais clínicos são obrigatórios' })
  }

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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: err?.error?.message || `HTTP ${response.status}`,
      })
    }

    const data = await response.json()
    const rawText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('') || ''

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

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({
      error: err instanceof SyntaxError
        ? 'Erro ao interpretar JSON da API'
        : err.message || 'Erro interno',
    })
  }
}
