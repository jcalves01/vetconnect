# 🐾 VetConnect — Deploy em Vercel

Rede profissional global para médicos veterinários.  
Stack: React + Vite (frontend) · Vercel Serverless Functions (backend)

---

## Estrutura do projecto

```
vetconnect/
├── api/                        ← Backend (Vercel Serverless Functions)
│   ├── diagnosis.js            ← POST /api/diagnosis (IA diagnóstico)
│   └── jobs-report.js          ← POST /api/jobs-report (relatório de vagas)
├── src/                        ← Frontend (React + Vite)
│   ├── main.jsx                ← Entry point
│   ├── App.jsx                 ← App completa (~4000 linhas)
│   └── lib/supabase.js         ← Cliente Supabase (autenticação + perfis)
├── supabase/migrations/        ← SQL da base de dados (correr manualmente no Supabase)
├── public/                     ← Ficheiros estáticos
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
- Conta em [console.anthropic.com](https://console.anthropic.com) para obter a API Key
- [Node.js](https://nodejs.org) 18+ instalado localmente (para desenvolvimento)

### 2. Fazer upload do projecto

**Opção A — Via GitHub (recomendado)**
```bash
# Inicializar repositório Git
git init
git add .
git commit -m "VetConnect beta inicial"

# Criar repositório no GitHub e fazer push
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

### 3. Configurar variável de ambiente

No dashboard do Vercel → **Settings → Environment Variables**:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production, Preview, Development |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |

⚠️ **NUNCA** coloque a API key da Anthropic no código ou no repositório Git. A `VITE_SUPABASE_ANON_KEY` é segura para expor no browser — o acesso aos dados é controlado por Row Level Security no Postgres, não pela chave.

### 3.1 Configurar a base de dados (Supabase)

1. Cria um projecto em [supabase.com](https://supabase.com) (gratuito).
2. Copia o **Project URL** e a **anon public key** de Settings → API para as variáveis acima.
3. Abre o SQL Editor do Supabase e corre o conteúdo de `supabase/migrations/0001_profiles.sql` — isto cria a tabela `profiles`, as políticas RLS e o trigger que cria automaticamente um perfil para cada novo utilizador.
4. (Opcional) Para permitir "Entrar com Google", activa o provider em Authentication → Providers.

### 4. Re-deploy

Após adicionar a variável de ambiente, clique em **Redeploy** no Vercel.

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Criar ficheiro de ambiente local
cp env.example .env.local
# Editar .env.local e preencher ANTHROPIC_API_KEY, VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Iniciar servidor de desenvolvimento (frontend + backend)
vercel dev
# ou apenas o frontend (sem as API routes):
npm run dev
```

---

## Arquitectura de segurança

```
Browser (utilizador)
        │
        │  POST /api/diagnosis  ← sem API key exposta
        ▼
Vercel Serverless Function
        │
        │  POST api.anthropic.com  ← API key segura no servidor
        ▼
   Anthropic API
        │
        ▼
Resposta processada → Browser
```

A chave Anthropic **nunca chega ao browser**. Fica exclusivamente nas  
Serverless Functions do Vercel, protegida pelas variáveis de ambiente.

---

## Escala e limites (plano gratuito Vercel)

| Recurso | Limite gratuito |
|---------|-----------------|
| Serverless Function invocações | 100.000/mês |
| Bandwidth | 100 GB/mês |
| Builds | Ilimitados |
| Domínio custom | Incluído |

Para 10.000 utilizadores activos/mês, o plano gratuito é suficiente.  
Para escala maior → Vercel Pro (~$20/mês).

---

## Domínio personalizado

No Vercel → **Settings → Domains** → adicionar `vetconnect.pt`  
O certificado SSL é gerado automaticamente.

---

## Próximos passos para produção

1. **Base de dados real** — ✅ autenticação e perfis já usam Supabase; posts, mensagens, vagas e casos SOAP continuam em dados mock no browser e ainda precisam de tabelas próprias
2. **Autenticação** — ✅ Supabase Auth (email/password + Google)
3. **Storage** — fotos e vídeos em Supabase Storage ou Cloudflare R2
4. **Rate limiting** — proteger `/api/diagnosis` contra abuso (ex: Upstash)
5. **Analytics** — Vercel Analytics (incluído) ou Plausible

---

## Suporte

📧 beta@vetconnect.pt  
🌐 vetconnect.pt
# vetconnect
