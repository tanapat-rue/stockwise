# Platform (Reusable Backend Building Blocks)

This folder contains reusable backend “platform” modules extracted from patterns in this repository (Gin HTTP server, MongoDB, sessions, common middleware, and DataTables helpers).

These packages are wired into the backend under `server/internal/application/application.go` and used by the API entrypoint in `server/main.go`.

## Package map

- `platform/app`: module interface + module registration helpers
- `platform/config`: small JSON config loader helpers
- `platform/httpserver`: Gin engine builder with safe CORS defaults
- `platform/middleware`: common Gin middleware (request ID, CSRF origin protection)
- `platform/db/mongodb`: MongoDB client wrapper + CRUD helpers (no domain indexes)
- `platform/session`: session store interface + in-memory and MongoDB implementations
- `platform/datatables`: DataTables request/response structs + MongoDB query helpers (+ optional Gin handler)
- `platform/storage/minio`: MinIO/S3-compatible client wrapper (presign/get/put/copy/remove)

## Intended usage (next step)

In a new project:

1. Copy `platform/` into the repo root.
2. Create your domain modules under `internal/modules/...` (or similar).
3. Use `platform/httpserver.New(...)` to build a Gin engine, then register your modules via `platform/app.RegisterModules(...)`.
