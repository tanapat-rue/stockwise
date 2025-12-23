# StockFlows Web (Vite + React)

Runs at `http://localhost:3000` and talks to the backend via `/api` (Vite proxy).

## Run (recommended)

From repo root:

- `docker compose up -d --build`
- Open `http://localhost:3000`

## Run (host Node)

Prereq: Node `>= 18`

1. Start backend deps + API (repo root): `docker compose up -d --build mongo minio minio-init api`
2. Start web:
   - `cd www`
   - `npm install`
   - `npm run dev`

## Environment

- `GEMINI_API_KEY` in `www/.env.local` (optional; used by the product description generator)
- `VITE_API_TARGET` (optional; Vite proxy target, defaults to `http://localhost:8080`)
