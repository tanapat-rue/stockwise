# StockFlows (Inventory + POS)

## Prereqs

- Go `>= 1.23`
- Node `>= 18` (only if running the web app on your host; Vite 6 requires this)
- Docker (for MongoDB + MinIO)

## Run (Dev)

### Option A: Run everything with Docker (recommended)

- `docker compose up -d --build`
- Web: `http://localhost:3000`
- API: `http://localhost:8080/api/healthz`

### Option B: Run API locally (Go) + dependencies in Docker

1. Start dependencies:
   - `docker compose up -d mongo minio minio-init`

2. Start API:
   - `cd server`
   - `go run .`
   - API: `http://localhost:8080/api/healthz`

3. Start Web (requires Node `>= 18`):
   - `cd www`
   - `npm install`
   - `npm run dev`
   - Web: `http://localhost:3000`

## First Use

- Go to `http://localhost:3000`
- Login with the seeded admin (Docker default): `admin@stockflows.local` / `admin1234`
  - Seed runs only when the database has no users yet (`server/config.docker.json` → `seed.enabled`)
  - Or create a new organization via “Create Organization” (signup)
- Add products, adjust stock, run POS checkout

## Config

- API reads JSON config from `STOCKFLOWS_CONFIG` (default `server/config.local.json`)
- Docker config: `server/config.docker.json`

## Storage

- MongoDB stores all app data
- MinIO stores product images (private bucket) via `POST /api/products/:id/image` (multipart field: `file`)
- Images are served through the API (org-protected): `GET /api/products/:id/image`
- MinIO console: `http://localhost:9001` (minioadmin / minioadmin)

## Billing (Omise scaffold)

- `GET /api/billing/omise/public-key`
- `POST /api/billing/omise/customer` (requires Org Admin; stores `subscription.omiseCustomerId`)
- `POST /api/billing/omise/test-charge` (optional sanity check)
