# 🐾 VetConnect — Deploy em Vercel

Rede profissional global para médicos veterinários.  
Stack: React + Vite (frontend) · Vercel Serverless Functions (backend) · Supabase (autenticação e base de dados)

---

## Estrutura do projecto

```
vetconnect/
├── api/                        ← Backend (Vercel Serverless Functions)
│   ├── diagnosis.js            ← POST /api/diagnosis (diagnóstico diferencial por IA)
│   └── jobs-report.js          ← POST /api/jobs-report (relatório de vagas por IA)
├── src/                        ← Frontend (React + Vite)
│   ├── main.jsx                ← Entry point
│   ├── App.jsx                 ← App completa (~5300 linhas)
│   └── lib/supabase.js         ← Cliente Supabase
├── supabase/migrations/        ← SQL da base de dados 0001–0014 (correr por ordem no Supabase)
├── index.html                  ← HTML template
├── package.json
├── vite.config.js
├── vercel.json                 ← Configuração Vercel
└── env.example                 ← Variáveis de ambiente (modelo)
```

---

## Deploy em 5 minutos

### 1. Pré-requisitos
- Conta em [vercel.com](https://vercel.com) (gratuita)
- Conta em [supabase.com](https://supabase.com) (gratuita)
- Pelo menos uma API key de IA: [console.anthropic.com](https://console.anthropic.com) (padrão), ou Gemini, OpenAI ou DeepSeek
- [Node.js](https://nodejs.org) 18+ instalado localmente (para desenvolvimento)

### 2. Fazer upload do projecto

**Opção A — Via GitHub (recomendado)**
```bash
# Criar repositório no GitHub e fazer push da branch principal
git remote add origin https://github.com/SEU_USER/vetconnect.git
git push -u origin main
```
Depois no Vercel: **New Project → Import Git Repository**

**Opção B — Deploy directo sem Git**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Dentro da pasta do projecto
vercel
```

### 3. Configurar variáveis de ambiente

No dashboard do Vercel → **Settings → Environment Variables**:

| Nome | Valor | Obrigatória |
|------|-------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Sim (provider padrão) |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` | chave do provider | Não — só para os modelos que quiser disponibilizar |
| `ANTHROPIC_MODEL` / `GEMINI_MODEL` / `OPENAI_MODEL` / `DEEPSEEK_MODEL` | nome do modelo | Não — há valores por omissão |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Sim |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Sim |

Marque cada variável para Production, Preview e Development.

⚠️ **NUNCA** coloque chaves de API no código ou no repositório Git. A `VITE_SUPABASE_ANON_KEY` é segura para expor no browser — o acesso aos dados é controlado por Row Level Security no Postgres, não pela chave.

### 3.1 Configurar a base de dados (Supabase)

1. Cria um projecto em [supabase.com](https://supabase.com).
2. Copia o **Project URL** e a **anon public key** de Settings → API para as variáveis acima.
3. Abre o SQL Editor do Supabase e corre **todos** os ficheiros de `supabase/migrations/` por ordem, de `0001_profiles.sql` até `0014_user_settings.sql`. Cada ficheiro depende dos anteriores, e a aplicação não funciona corretamente sem eles.
4. (Opcional) Para permitir "Entrar com Google", activa o provider em Authentication → Providers.

### 4. Re-deploy

Após adicionar ou alterar variáveis de ambiente, clique em **Redeploy** no Vercel.

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Criar ficheiro de ambiente local
cp env.example .env.local
# Editar .env.local com as chaves de IA e as variáveis do Supabase

# Iniciar servidor de desenvolvimento (frontend + API routes)
vercel dev

# Ou apenas o frontend (as funcionalidades de IA ficam indisponíveis)
npm run dev
```

---

## Arquitectura de segurança

```
Browser (utilizador)
        │
        │  POST /api/diagnosis | /api/jobs-report  ← sem chaves de API
        ▼
Vercel Serverless Function
        │
        │  POST ao provider escolhido  ← chaves seguras no servidor
        ▼
Anthropic · Gemini · OpenAI · DeepSeek
        │
        ▼
Resposta processada → Browser
```

As chaves dos providers de IA **nunca chegam ao browser**. Ficam exclusivamente nas Serverless Functions do Vercel, protegidas pelas variáveis de ambiente.

Os dados do utilizador vão diretamente do browser para o Supabase com a anon key, e o acesso é limitado pelas políticas RLS de cada tabela.

⚠️ **Estado atual:** as rotas `/api/*` ainda não exigem autenticação nem têm limite de pedidos. Qualquer pessoa que conheça o URL pode consumir as chaves de IA. Ver "Próximos passos".

---

## Escala e limites (plano gratuito Vercel)

| Recurso | Limite gratuito |
|---------|-----------------|
| Serverless Function invocações | 100.000/mês |
| Bandwidth | 100 GB/mês |
| Builds | Ilimitados |
| Domínio custom | Incluído |

Para escala maior → Vercel Pro (~$20/mês). Os limites do Supabase e dos providers de IA aplicam-se separadamente.

---

## Domínio personalizado

No Vercel → **Settings → Domains** → adicionar `vetconnect.pt`.  
O certificado SSL é gerado automaticamente.

---

## Próximos passos para produção

1. **Proteger as rotas de IA** — exigir sessão Supabase válida em `/api/diagnosis` e `/api/jobs-report`, restringir o CORS com `ALLOWED_ORIGIN` e limitar o tamanho dos campos de entrada
2. **Rate limiting** — limitar pedidos por utilizador nas rotas de IA (ex: Upstash)
3. **Corrigir a RLS de `conversation_participants`** — impedir que um utilizador se insira numa conversa alheia (ver `CLAUDE.md`)
4. **Eliminação de contas** — processar os pedidos de `account_deletion_requests` com uma função server-side com service role
5. **Storage** — fotos e vídeos já estão em Supabase Storage (bucket `post-media`); avaliar URLs assinados e limites de tamanho
6. **Analytics** — Vercel Analytics (incluído) ou Plausible

---

## Suporte

📧 beta@vetconnect.pt  
🌐 vetconnect.pt
