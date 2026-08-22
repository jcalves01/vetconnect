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
│   └── App.jsx                 ← App completa (~4000 linhas)
├── public/                     ← Ficheiros estáticos
├── index.html                  ← HTML template
├── package.json
├── vite.config.js
├── vercel.json                 ← Configuração Vercel
└── .env.example                ← Variáveis de ambiente (modelo)
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

⚠️ **NUNCA** coloque a API key no código ou no repositório Git.

### 4. Re-deploy

Após adicionar a variável de ambiente, clique em **Redeploy** no Vercel.

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Criar ficheiro de ambiente local
cp .env.example .env.local
# Editar .env.local e preencher ANTHROPIC_API_KEY

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

1. **Base de dados real** — substituir dados mock por Supabase/PlanetScale
2. **Autenticação** — integrar Supabase Auth ou Clerk
3. **Storage** — fotos e vídeos em Supabase Storage ou Cloudflare R2
4. **Rate limiting** — proteger `/api/diagnosis` contra abuso (ex: Upstash)
5. **Analytics** — Vercel Analytics (incluído) ou Plausible

---

## Suporte

📧 beta@vetconnect.pt  
🌐 vetconnect.pt
# vetconnect
