# Compass 🧭
### Your personal productivity assistant

Compass is a full-stack AI-powered productivity app built with Next.js, Claude, and MySQL. It reads your schedule, tracks deadlines automatically, and follows up with you when something is due soon — like a highly organized friend who actually keeps tabs on your week.

Built by [Paris Dunmire](https://github.com/pdunmire-pcd) as a personal tool for managing the chaos of balancing college coursework, freelance web development, a part-time job, and internship searching all at once.

---

## Features

- **Persistent memory** — every conversation is saved to MySQL so Compass remembers everything across sessions
- **Automatic deadline detection** — mention a due date in conversation and Compass extracts and tracks it automatically
- **Follow-up check-ins** — on every visit, if something is due within 3 days Compass surfaces it and asks if you want help
- **Context panel** — paste in your calendar, Canvas assignments, or to-do list and Compass uses it as context for the whole conversation
- **Deadline sidebar** — all tracked deadlines sorted by urgency, color-coded by how soon they are, with check-off and delete

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| AI | Anthropic Claude (Sonnet for chat, Haiku for deadline extraction) |
| Database | MySQL 8 via mysql2 |
| Deployment | Digital Ocean VM + PM2 + Nginx |
| Fonts | Lora + DM Sans |

---

## Getting Started

### Prerequisites
- Node.js v18+
- MySQL 8
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Clone and install
```bash
git clone https://github.com/pdunmire-pcd/compass.git
cd compass
npm install
```

### 2. Set up your database
Run the schema file against your MySQL instance:
```bash
mysql -u your_user -p your_database < mysql/schema.sql
```

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=compass
```

### 4. Run locally
```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) — it redirects to `/compass`.

---

## Deployment

This app is deployed on a Digital Ocean Ubuntu droplet using PM2 and Nginx.

```bash
# On your VM
git clone https://github.com/pdunmire-pcd/compass.git
cd compass
npm install
cp .env.local.example .env.local
# fill in .env.local with your credentials
npm run build
pm2 start npm --name "compass" -- start
pm2 save
```

Then proxy port 3000 through Nginx with a server block pointing to your domain.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        ← Anthropic call + saves messages + extracts deadlines
│   │   ├── messages/route.ts    ← GET message history
│   │   └── deadlines/route.ts   ← GET / PATCH / DELETE deadlines
│   ├── compass/page.tsx
│   └── layout.tsx
├── components/
│   └── CompassApp.tsx           ← Full UI: sidebar, chat, context panel, input
└── lib/
    ├── prompts.ts               ← Compass system prompt + deadline extraction prompt
    ├── db.ts                    ← MySQL connection pool
    └── types.ts                 ← TypeScript interfaces
```

---

## How deadline detection works

After every message exchange, a secondary Claude Haiku call scans both the user message and Compass's reply for any tasks with specific due dates. If it finds new ones, they're saved to MySQL and appear in the sidebar immediately — no manual entry required.

---

## Why I built this

I'm a software development student at Green River College juggling coursework, freelance client work for [The Prepared Birth](https://thepreparedbirth.com), a part-time job at Nordstrom, and actively searching for a software engineering internship. The thing that slows me down most isn't a lack of ability — it's the mental overhead of looking at a pile of responsibilities and figuring out where to even start. Compass solves that for me personally.

---

*Built with Next.js · Powered by Claude · Deployed on Digital Ocean*