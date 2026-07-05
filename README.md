# SmartERP Monorepo

This repository contains:

- Frontend: Next.js app in `apps/web`
- Backend: Express.js API in `apps/api`

## Run With Docker (Recommended)

This project runs as a single container (frontend + backend) using one Dockerfile.

### 1. Prerequisites

1. Docker Desktop (or Docker Engine) is running.
2. Create root `.env` from `.env.example`.

### 2. Configure Environment

Copy `.env.example` to `.env` and update at least:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Common defaults in `.env.example`:

- `PORT=4000`
- `FRONTEND_URL=http://localhost:3000`
- `CORS_ORIGIN=http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`

### 3. Build and Run

Build image:

- `npm run docker:build`

Run container:

- `npm run docker:run`

### 4. Access Application

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/health
- API docs: http://localhost:4000/api-docs

## Build-Time API Base URL

`NEXT_PUBLIC_API_BASE_URL` is baked into the frontend at image build time.

Default build value:

- `http://localhost:4000/api/v1`

Override example:

- `docker build --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1 -t smarterp .`

## Local Demo Stability (Windows)

Use the root safe-restart command before demo recording to avoid stale Next.js assets:

- Check command wiring: `npm run dev:web:safe:check`
- Clean only (stop port 3000 listeners + clear `.next`): `npm run dev:web:clean`
- Full safe restart (clean + start web dev): `npm run dev:web:safe`
