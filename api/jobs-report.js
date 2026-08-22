/**
 * POST /api/jobs-report
 * Gera relatório diário de vagas de emprego via Anthropic API
 */
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key não configurada no servidor' })
  }

  const { criteria, jobCount, jobList } = req.body

  if (!jobList) {
    return res.status(400).json({ error: 'Lista de vagas é obrigatória' })
  }

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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
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
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('') || ''

    return res.status(200).json({ report: text || 'Sem conteúdo.' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
