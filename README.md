# VetConnect — Frontend (Vite/React) + Backend (Vercel Functions)

Este projeto separa a tua app VetConnect em duas partes, prontas para alojar na
**Vercel**:

- **Frontend** — a tua app React (single-file), servida como site estático.
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
├── api/
│   ├── _anthropic.js     # helper partilhado (não é rota — o "_" esconde-o)
│   ├── diagnosis.js      # POST /api/diagnosis      → diagnóstico diferencial IA
│   └── jobs-report.js    # POST /api/jobs-report     → relatório diário de vagas
├── src/
│   ├── App.jsx           # << COLA AQUI o teu componente VetConnect >>
│   ├── main.jsx          # ponto de entrada React
│   ├── index.css         # resets mínimos
│   └── lib/
│       └── api.js        # callDiagnosis() / callJobsReport()
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

## Passo 2 — Colar o teu componente

1. Abre o artefacto VetConnect e copia **todo** o código `.jsx`.
2. Substitui o conteúdo de `src/App.jsx` (abaixo dos imports) pelo teu componente.
3. Garante que o componente de topo é o **export por defeito**:
   ```js
   export default function VetConnect() { /* ... */ }
   ```
   Se terminar apenas com `function VetConnect(){...}`, adiciona no fim:
   ```js
   export default VetConnect;
   ```

`recharts` já está instalado (usado nos gráficos do Perfil), portanto os teus
`import { ... } from "recharts"` funcionam sem alterações.

## Passo 3 — Configurar a chave

```bash
cp .env.example .env.local
```

Edita `.env.local` e coloca a tua chave real em `ANTHROPIC_API_KEY`.
**Nunca faças commit deste ficheiro** (já está no `.gitignore`).

## Passo 4 — Ligar o frontend ao backend

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

Este split resolve a **segurança da chave** e prepara o alojamento na Vercel.
Para milhares de utilizadores com dados reais, os passos seguintes (como já
discutido) são:

- **Base de dados + Auth** (ex.: Supabase) para posts, mensagens, casos SOAP,
  vagas e utilizadores reais — hoje ainda vivem em estado/`storage` local.
- **Storage** para fotos/vídeos dos posts (as `blob:` URLs actuais não persistem).
- **Rate limiting** nas funções `/api` para controlar custo da API por utilizador.

O backend aqui criado é o ponto de entrada natural para essas funções — basta
acrescentar rotas em `/api` (ex.: `/api/posts`, `/api/auth`) seguindo o mesmo
padrão.
