# SmartERP Monorepo

This repository contains:

- Frontend: Next.js app in `apps/web`
- Backend: Express.js API in `apps/api`

## Quick Start

1. Install dependencies:
   - `npm install`
2. Run both apps:
   - `npm run dev`
3. Frontend:
   - http://localhost:3000
4. Backend:
   - http://localhost:4000/health
5. API Docs (Swagger UI):
   - http://localhost:4000/api-docs

## Environment

Create/update `.env` at the repository root:

- `DATABASE_URL=...`
- `PORT=4000`
- `JWT_SECRET=change_me`
- `FRONTEND_URL=http://localhost:3000`

The API loads the root `.env` file automatically.
