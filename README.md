# Compass — your personal productivity assistant

A Next.js app powered by Claude that reads your schedule, tracks deadlines, and follows up with you. Conversations are stored in Supabase so nothing is ever lost.

---

## Setup (about 15 minutes)

### 1. Clone & install

```bash
git clone <your-repo> compass
cd compass
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Once it's running, go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy:
   - **Project URL**
   - **service_role key** (under "Project API keys" — not the anon key)

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:

```
ANTHROPIC_API_KEY=sk-ant-...         # console.anthropic.com
SUPABASE_URL=https://xxx.supabase.co  # from Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # from Supabase project settings → API
```

Get your Anthropic key at [console.anthropic.com](https://console.anthropic.com).

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/compass`.

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. In the Vercel project settings, go to **Environment Variables** and add the three variables from your `.env.local`
4. Deploy — done! You'll get a URL like `compass-yourname.vercel.app`

---

## How it works

| Feature | How |
|---|---|
| **Conversation memory** | Every message is saved to Supabase. On load, the last 40 messages are sent to Claude as context. |
| **Deadline detection** | After every exchange, a second (fast, cheap) Claude Haiku call scans the text for dates and saves them. |
| **Follow-up check-ins** | On app load, if any saved deadlines are due within 3 days, you see a banner with a "let's tackle these" button. |
| **Session identity** | A UUID is stored in your browser's localStorage. Since this is a personal app, that's enough — your data lives in Supabase tied to that ID. |

---

## Customizing

- **System prompt**: edit `src/lib/prompts.ts` — `COMPASS_SYSTEM` is the main personality, `DEADLINE_EXTRACT_SYSTEM` controls deadline parsing
- **Message history limit**: in `src/app/api/chat/route.ts`, change `.limit(40)` to send more/fewer messages as context
- **Deadline follow-up window**: in `src/components/CompassApp.tsx`, change `days <= 3` to a different number
- **Colors**: in `tailwind.config.ts` under `colors.compass`

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        ← Anthropic call + saves messages + extracts deadlines
│   │   ├── messages/route.ts    ← GET message history
│   │   └── deadlines/route.ts   ← GET / PATCH / DELETE deadlines
│   ├── compass/page.tsx         ← The main page
│   └── layout.tsx
├── components/
│   └── CompassApp.tsx           ← Full UI (sidebar, chat, input)
└── lib/
    ├── prompts.ts               ← System prompts
    ├── supabase.ts              ← Server-side Supabase client
    └── types.ts                 ← TypeScript interfaces
```
