# Drip Finance — Progress Tracker

## Phase 1: MVP Foundation

### Completed
- [x] Monorepo scaffold (Turborepo + pnpm workspaces)
- [x] Root config (tsconfig, turbo.json, .gitignore, .env.example)
- [x] Database package (`@drip/db`) with Prisma schema
  - User, Account, Session (NextAuth)
  - Category, CategoryRule
  - Transaction (with spreadDays + dailyAmount)
  - Assumption
  - Seed script with 17 system categories + categorization rules
- [x] Drip Engine package (`@drip/engine`)
  - CSV parser with auto-format detection (Generic, Chase, Debit/Credit)
  - Auto-categorization engine (rules + keyword fallback)
  - Daily drip normalization (spread cascade logic)

- [x] Next.js web app (`apps/web`)
  - [x] NextAuth setup (credentials provider, JWT sessions)
  - [x] Login / Register pages
  - [x] Dashboard layout with sidebar navigation
  - [x] API routes: upload, upload/commit, transactions CRUD, categories, assumptions, drip summary
  - [x] Dashboard UI: drip summary cards, category breakdown bars, trend area chart, recent transactions
  - [x] CSV upload page with drag-and-drop, preview table, inline category editing
  - [x] Transaction list with type/category filters, pagination, manual add, delete
  - [x] Settings page: assumptions editor grouped by type, add custom assumptions
- [x] Dependencies installed, TypeScript compiles clean

- [x] Transaction line items (TransactionItem model)
  - Split transactions into individual items with per-item spread days
  - Expandable transaction rows — click to view/edit items, receipts, spread
- [x] Receipt upload and viewing
  - Upload receipt images (JPEG, PNG, WebP, PDF) per transaction
  - View receipts in lightbox, delete receipts
  - Stored in DB (MVP), move to S3 later
- [x] Duplicate detection on CSV upload
  - Hash-based dedup (date + description + amount)
  - Detects duplicates against existing DB records AND within same file
  - Duplicates shown with amber warning badges, auto-skipped on import

- [x] Reports page (Monarch-inspired)
  - 4 tabs: Spending, Income, Cash Flow (Sankey), Net Worth
  - Spending/Income: pie chart + bar chart, total vs over-time views, group by category or merchant
  - Cash Flow: SVG Sankey diagram showing income → expense flow with proportional bands
  - Net Worth: cumulative area chart + income vs expense bar chart by period
  - Time period selector (monthly/quarterly/yearly) + date range filter
- [x] Recurring auto-detection + calendar view
  - Pattern detection engine: groups by merchant, checks regular intervals + similar amounts
  - Detects WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY with confidence scores
  - Review flow: confirm or dismiss detected recurring items
  - Calendar view showing bills on their expected days
  - List view with confirmed recurring items and monthly/daily totals
- [x] Transaction rules UI (Settings page)
  - Create rules: "when description [contains/starts with/matches regex] X → set category to Y"
  - Apply retroactively to existing transactions
  - Delete rules, view all custom rules
- [x] Updated sidebar with Reports and Recurring nav items

### Not Started
- [ ] Unit tests for drip-engine
- [ ] End-to-end testing
- [ ] Error handling polish
- [ ] Mobile responsive pass

## Phase 2: Enhanced Features (Post-MVP)
- [ ] Plaid bank/card linking
- [ ] Receipt OCR (auto-parse items from receipt image)
- [x] ~~Item-level grocery tracking with shelf-life~~ (done in MVP)
- [ ] Recurring transaction auto-detection
- [ ] Spending suggestions engine
- [ ] Assumption review reminders

## Phase 3: Multi-Platform
- [ ] Multi-user / family budgeting
- [ ] Desktop app (Tauri)
- [ ] Mobile app (React Native)
- [ ] SaaS subscription tiers

## Phase 4: Intelligence
- [ ] ML-based categorization improvement
- [ ] Spending anomaly detection
- [ ] Budget goal setting + tracking
- [ ] Bill negotiation suggestions
