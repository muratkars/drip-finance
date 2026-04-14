# Drip Finance

> Know your daily drip.

Personal finance tracker that normalizes all income and expenses to a **daily cost of living**. See exactly how much you earn and spend per day, so you think twice before that next big purchase.

## Features

- **CSV Statement Import** — Upload bank/credit card statements, auto-detect format
- **Auto-Categorization** — Transactions are automatically categorized with customizable rules
- **Daily Drip Normalization** — Every expense is spread over its useful life (mortgage/30, car registration/365, milk/7 days)
- **Dashboard** — At-a-glance daily income vs. spend with category breakdowns
- **Adjustable Assumptions** — Fine-tune how long items last, how expenses spread
- **Multi-User** — Family budgeting with shared household expenses

## Tech Stack

- **Monorepo:** Turborepo + pnpm
- **Web App:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js
- **Charts:** Recharts

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET

# Set up database
pnpm db:generate
pnpm db:push
pnpm db:seed

# Start development
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
drip-finance/
├── apps/
│   └── web/              # Next.js web application
├── packages/
│   ├── db/               # Prisma schema + client
│   └── drip-engine/      # Core normalization & categorization logic
├── turbo.json
└── package.json
```

## License

MIT
