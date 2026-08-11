# VetConnect — Frontend (Vite/React) + Backend (Vercel Functions)

Este projeto separa a tua app VetConnect em duas partes, prontas para alojar na
**Vercel**:

- **Frontend** — app React (Vite), servida como site estático, com
  autenticação e dados persistidos no Supabase.
- **Backend** — duas funções serverless (`/api/diagnosis` e `/api/jobs-report`)
  que fazem de _proxy seguro_ para a API da Anthropic.

## Porquê separar?

Na versão do artefacto, a app chamava a API da Anthropic **directamente do
browser** com o header `anthropic-dangerous-direct-browser-access`. Isso obriga
a expor a chave da API no código do cliente — qualquer utilizador consegue
extraí-la e usar a tua conta. Com esta separação, a chave passa a viver **apenas
no servidor** (variável de ambiente na Vercel) e o browser nunca lhe toca.

---

## Estrutura

```
vetconnect/
├── supabase/
│   └── migrations/       # SQL: tabelas + RLS + triggers (correr no Supabase)
├── api/
│   ├── _anthropic.js     # helper partilhado (não é rota — o "_" esconde-o)
│   ├── diagnosis.js      # POST /api/diagnosis      → diagnóstico diferencial IA
│   └── jobs-report.js    # POST /api/jobs-report     → relatório diário de vagas
├── src/
│   ├── App.jsx           # shell: AuthProvider + separadores (feed/mensagens/vagas/soap/perfil)
│   ├── main.jsx          # ponto de entrada React
│   ├── index.css         # resets mínimos
│   ├── styles.js         # primitivas de estilo inline partilhadas
│   ├── context/
│   │   └── AuthContext.jsx  # sessão Supabase + linha `profiles`
│   ├── components/
│   │   ├── auth/          # AuthScreen, LoginForm, SignupForm, GoogleButton
│   │   ├── layout/        # TabNav
│   │   ├── feed/          # posts, likes, comentários
│   │   ├── messages/      # conversas (grupo) + mensagens
│   │   ├── jobs/          # vagas + candidaturas
│   │   └── soap/          # casos SOAP + comentários em casos partilhados
│   └── lib/
│       ├── api.js         # callDiagnosis() / callJobsReport() — proxy Anthropic
│       ├── supabase.js    # cliente Supabase (chave anon, para o browser)
│       └── db.js          # funções de acesso a dados (Supabase + RLS)
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
└── .gitignore
```

---

## Passo 1 — Instalar

```bash
cd vetconnect
npm install
```

## Passo 2 — UI já implementada

`src/App.jsx` já não é um placeholder para colar código: é o shell real da
app (login/registo + 5 separadores — feed, mensagens, vagas, casos SOAP,
perfil), ligado ao Supabase via `src/lib/db.js`. Não há nada para colar aqui;
segue para o Passo 3 para ligar as chaves de API.

`recharts` está instalado mas não é usado por nenhum componente actual —
ficou disponível para se um dia se quiser adicionar gráficos (ex.: estatísticas
no Perfil).

## Passo 3 — Configurar a chave

```bash
cp .env.example .env.local
```

Edita `.env.local` e coloca a tua chave real em `ANTHROPIC_API_KEY`.
**Nunca faças commit deste ficheiro** (já está no `.gitignore`).

## Passo 4 — Ligar o frontend ao backend (referência)

> Esta secção descreve como ligar `callDiagnosis()`/`callJobsReport()` a um
> componente de diagnóstico/relatório de vagas — nenhum dos dois existe ainda
> na UI actual (que cobre auth, feed, mensagens, vagas e casos SOAP, mas não
> IA). Fica aqui como referência para quando esse componente for adicionado.

No topo do teu componente, adiciona o import:

```js
import { callDiagnosis, callJobsReport } from "./lib/api.js";
```

### 4a) Diagnóstico diferencial por IA

Localiza a função `run()` dentro de `AIDiagnosis`. **Apaga** o bloco antigo que
chamava a Anthropic directamente — algo como:

```js
// ❌ ANTES — remove tudo isto
const r = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": /* chave exposta */,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  }),
});
const data = await r.json();
const text = data.content.map(b => b.type === "text" ? b.text : "").join("");
// ... parse manual do JSON ...
const parsed = JSON.parse(/* ... */);
setResult(parsed);
```

E substitui por:

```js
// ✅ DEPOIS — chama o backend seguro; já vem parseado
const result = await callDiagnosis({
  especie,          // as tuas variáveis de estado do formulário
  raca,
  idade,
  sexo,
  sinais,           // array de sinais seleccionados
  sintomasLivres,   // caixa de texto livre
  sangue,           // perfil sanguíneo (texto) ou ""
  urina,            // análise de urina (texto) ou ""
  fezes,            // análise de fezes (texto) ou ""
  lang,             // código de idioma actual, ex: "pt"
});
setResult(result);   // { resumo, diagnosticos: [...] }
```

> Ajusta os nomes das variáveis (`especie`, `sinais`, …) aos que já usas no teu
> estado. O backend aceita qualquer subconjunto — só `especie` + um sinal são
> obrigatórios. A estrutura devolvida (`resumo`, `diagnosticos[]` com
> `nome/probabilidade/justificacao/testes/tratamento/urgencia`) é a mesma que a
> tua UI já renderiza.

### 4b) Relatório diário de vagas

Localiza a função que gera o relatório (na secção Emprego/Marketplace). Remove o
`fetch(...)` directo à Anthropic e substitui por:

```js
const { relatorio } = await callJobsReport({
  vagas: filteredJobs,                  // a lista de vagas já filtrada
  filtros: { texto: jobQuery, local: jobLocQuery },  // filtros activos
  data: new Date().toLocaleDateString(lang),         // data vinda do cliente
  lang,
});
setReport(relatorio);   // string pronta a mostrar / copiar / descarregar
```

> **Importante:** passa sempre a data a partir do cliente (`new Date()...`). As
> funções serverless não conhecem o fuso horário do utilizador, e o teu ambiente
> de artefacto não permitia `Date.now()` — aqui já corres num browser normal, por
> isso `new Date()` funciona sem problemas.

Depois destas duas alterações, podes remover do teu componente qualquer
referência a chaves de API e ao header `anthropic-dangerous-direct-browser-access`.

---

## Passo 4.5 — Configurar Supabase (base de dados + auth)

A app usa [Supabase](https://supabase.com) como base de dados (Postgres) e
autenticação (email/password + Google OAuth). Ao contrário da chave da
Anthropic, a chave anon do Supabase **é para ir para o browser** — o controlo
de acesso é feito por Row Level Security (RLS) no Postgres, não por um proxy
server-side. Por isso não há `/api/*` para isto; `src/lib/supabase.js` e
`src/lib/db.js` falam directamente com o Supabase a partir do cliente.

1. Cria um projeto em [supabase.com](https://supabase.com). Em
   **Settings → API**, copia o **Project URL** e a **anon/public key**.
2. No **SQL Editor** do Supabase, corre os ficheiros de
   `supabase/migrations/` **por ordem** (`0001` → `0005`). Criam as tabelas
   (`profiles`, `posts`, `post_likes`, `post_comments`, `conversations`,
   `conversation_participants`, `messages`, `jobs`, `job_applications`,
   `soap_cases`, `soap_case_comments`), as políticas de RLS, e o trigger que
   cria automaticamente uma linha em `profiles` sempre que alguém cria conta
   (email/password ou Google).
3. Em **Authentication → Providers**: confirma que o **Email** está ligado;
   liga o **Google** (precisa de um Client ID/Secret do
   [Google Cloud Console](https://console.cloud.google.com) → APIs &
   Services → Credentials → OAuth 2.0 Client ID, com redirect URI
   `https://<project-ref>.supabase.co/auth/v1/callback`).
4. Em **Authentication → URL Configuration**: define o **Site URL** (o teu
   domínio de produção) e adiciona a `http://localhost:5173/**` e ao teu
   domínio Vercel na lista de **Redirect URLs**.
5. Copia `.env.example` para `.env.local` (se ainda não o fizeste) e
   preenche `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
6. Corre `npm install` para obter `@supabase/supabase-js` (foi adicionado ao
   `package.json`).

Depois disto, `npm run dev` já mostra o ecrã de login/registo, e criar conta
cria automaticamente o perfil correspondente.

## Passo 5 — Correr localmente

A forma mais simples é usar a CLI da Vercel, que corre o frontend **e** as
funções `/api` juntos:

```bash
npm i -g vercel      # uma vez
vercel dev           # serve tudo em http://localhost:3000
```

Alternativa sem a CLI (dois terminais): `vercel dev` para o backend e
`npm run dev` para o Vite (já configurado para encaminhar `/api` para o :3000).

---

## Passo 6 — Publicar na Vercel

1. Cria um repositório Git e faz push deste projeto (o `.env.local` fica de fora).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importa o repo.
3. A Vercel deteta o Vite automaticamente (build `vite build`, output `dist`).
4. Em **Settings → Environment Variables**, adiciona:
   - `ANTHROPIC_API_KEY` = a tua chave (para Production, Preview e Development)
   - opcional: `ANTHROPIC_MODEL`
5. **Deploy.** As rotas `/api/*` ficam disponíveis no mesmo domínio, sem CORS.

Cada `git push` passa a gerar um deploy automático.

---

## Notas para escalar (próximos passos)

Este split resolve a **segurança da chave** da Anthropic e prepara o
alojamento na Vercel; a base de dados + auth (Supabase) resolve a
persistência de posts/mensagens/vagas/casos SOAP/utilizadores. Para milhares
de utilizadores com dados reais, os passos seguintes ainda em falta são:

- **Storage** para fotos/vídeos dos posts e avatares — `posts.image_url` e
  `profiles.avatar_url` guardam só uma URL de texto; upload real de ficheiros
  (Supabase Storage) ainda não está ligado, a UI aceita só um link colado.
- **Realtime** nas mensagens — hoje é manual (botão "Atualizar" +
  refresh ao enviar); `supabase.channel()` pode ser adicionado a
  `MessageThread.jsx` sem reescrever a estrutura.
- **Rate limiting** nas funções `/api` para controlar custo da API por utilizador.

O backend aqui criado é o ponto de entrada natural para essas funções — basta
acrescentar rotas em `/api` (ex.: `/api/posts`, `/api/auth`) seguindo o mesmo
padrão.
