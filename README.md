# eFootball Competition Management Platform

A minimal, modern, production-ready web platform for managing eFootball competitions (Tournaments & Leagues). All brackets, fixtures, league tables, and statistics are 100% automatically generated and recalculated whenever match scores change.

## Project Structure

```
efootball-platform/
├── backend/                  # Express + TypeScript + Prisma ORM + JWT Auth
│   ├── prisma/
│   │   └── schema.prisma    # SQLite / PostgreSQL schema
│   ├── src/
│   │   ├── controllers/     # Auth, Competition, Team, Match controllers
│   │   ├── services/        # Fixture generators & Recalculation engine
│   │   └── index.ts         # Server entry point
│   └── package.json
└── frontend/                 # React + Vite + TypeScript + Tailwind CSS
    ├── src/
    │   ├── components/      # BracketView, LeagueTable, StatsCards, MatchList
    │   ├── pages/           # Home, Dashboard, CompetitionDetails, PublicView
    │   └── App.tsx
    └── package.json
```

## Running Locally

1. **Backend**:
   ```bash
   cd backend
   npm run dev
   ```
   Runs on `http://localhost:5000`.

2. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Runs on `http://localhost:3000`.

## Running Tests

To verify fixture generation (with BYE math) and recalculation engine:
```bash
cd backend
npx tsx src/test_generator.ts
npx tsx src/test_recalc.ts
npm run test:suite
```

### Export graphics (Playwright)

Graphic exports (PDF, PNG, JPEG) render HTML templates with Playwright Chromium. After installing backend dependencies, install the browser once:

```bash
cd backend
npx playwright install chromium
```
