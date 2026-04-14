# Drip Finance — MVP Specification

## Vision

A personal finance app that answers one question: **"How much does my life cost per day?"**

Every income and expense is normalized to a daily amount — your **daily drip**. Mortgage? Divided by 30. Car registration? Divided by 365. A latte? That day. Groceries? Spread over estimated shelf life. This gives users a single, clear metric to understand their finances.

## MVP Scope

### Core Features

#### 1. CSV Statement Import
- Upload bank/credit card CSV statements
- Auto-detect format (Chase, generic, debit/credit column styles)
- Preview parsed transactions before committing
- Duplicate detection on re-upload

#### 2. Auto-Categorization
- Three-layer system:
  1. **User rules** — Custom patterns the user defines (highest priority)
  2. **System rules** — Pre-seeded patterns for common merchants (e.g., STARBUCKS → Coffee)
  3. **Keyword fallback** — Generic keyword matching (e.g., "RESTAURANT" → Dining)
- Users can re-categorize any transaction manually
- 17 pre-seeded categories with icons and colors

#### 3. Daily Drip Normalization
- Every transaction gets a `spreadDays` value and `dailyAmount`
- Spread cascade:
  1. Recurring period (if marked recurring: monthly=30, yearly=365, etc.)
  2. Category-level assumption (user-defined override)
  3. Item-level assumption (e.g., milk=10 days shelf life)
  4. Category defaults (housing=30, groceries=7, coffee=1, etc.)
  5. Fallback: 1 day
- Stored denormalized for fast dashboard queries

#### 4. Dashboard
- **Hero metric:** "Your daily drip: $XX.XX" (daily expense total)
- **Income vs. Expense bars:** Daily income drip vs. expense drip
- **Category breakdown:** Donut/bar chart showing where the drip goes
- **Trend chart:** Daily/weekly/monthly trends over time
- **Recent transactions:** Quick-access list

#### 5. Transaction Management
- List all transactions with date, category, and amount filters
- Edit: re-categorize, adjust spread days, mark as recurring
- Manual entry for cash transactions
- Delete transactions

#### 6. Assumptions Editor
- View and edit all assumptions (shelf lives, lifespans, category spreads)
- Grouped by category for easy browsing
- Changes trigger recalculation of affected transactions
- Sensible defaults pre-loaded

#### 7. Authentication
- Email/password registration and login
- Google OAuth (optional)
- Session management via NextAuth.js
- Multi-user ready (each user has their own data)

### Out of MVP Scope
- Bank account linking (Plaid) — Phase 2
- Receipt OCR — Phase 2
- Mobile app — Phase 3
- Desktop app — Phase 3
- Family/shared budgeting — Phase 3
- Spending suggestions — Phase 2
- ML categorization — Phase 4

## Technical Architecture

### Monorepo Structure
```
drip-finance/
├── apps/web/          → Next.js 15 (App Router)
├── packages/db/       → Prisma schema + client
└── packages/drip-engine/ → Core logic (parser, categorizer, normalizer)
```

### Database Schema

**Core tables:**
- `User` — auth + profile
- `Category` — system + user-defined categories with icons/colors
- `CategoryRule` — pattern matching rules for auto-categorization
- `Transaction` — all financial transactions with denormalized daily amounts
- `Assumption` — user-adjustable parameters for drip calculations

**Key design decisions:**
- `dailyAmount` is denormalized on `Transaction` for fast aggregation
- `CategoryRule` is separate from `Category` for flexible rule management
- `Assumption` uses string keys for programmatic lookup (e.g., `milk_shelf_life`)

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/*` | * | NextAuth handlers |
| `/api/upload` | POST | CSV upload → parse → preview |
| `/api/upload/commit` | POST | Commit previewed transactions |
| `/api/transactions` | GET | List with filters + pagination |
| `/api/transactions` | POST | Manual transaction entry |
| `/api/transactions/[id]` | PATCH | Edit transaction |
| `/api/transactions/[id]` | DELETE | Delete transaction |
| `/api/categories` | GET | List all categories |
| `/api/categories` | POST | Create user category |
| `/api/assumptions` | GET | List user assumptions |
| `/api/assumptions` | PUT | Bulk update assumptions |
| `/api/drip` | GET | Aggregated daily drip summary |

### Tech Stack
- **Runtime:** Node.js + TypeScript
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (credentials + OAuth)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **CSV Parsing:** PapaParse
- **Monorepo:** Turborepo + pnpm

## UI Pages

1. **Login / Register** — Clean auth forms
2. **Dashboard** — Hero drip metric, charts, recent transactions
3. **Transactions** — Filterable table with inline editing
4. **Upload** — Drag-and-drop CSV with preview table
5. **Settings** — Assumptions editor, category management, profile

## Success Criteria

The MVP is complete when a user can:
1. Create an account and log in
2. Upload a bank CSV statement
3. See transactions auto-categorized
4. View their daily drip on the dashboard
5. Adjust assumptions and see the drip update
6. Manually add/edit/delete transactions
