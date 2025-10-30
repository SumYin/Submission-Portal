# Submission Portal Backend (FastAPI + SQLite)

A minimal Python API to support the Next.js front-end. Uses SQLite for storage, no media server and no file validation beyond metadata.

## Run locally (Windows PowerShell)

```powershell
# 1) Create and activate a virtual environment (optional but recommended)
python -m venv .venv
. .venv\Scripts\Activate.ps1

# 2) Install dependencies
pip install -r backend/requirements.txt

# 3) Start the API server (default http://127.0.0.1:8000)
python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Optional environment variables:
- `SP_DB_PATH`: Path to the SQLite file (defaults to `backend/data.db`).

The OpenAPI docs are available at http://127.0.0.1:8000/docs.

## Frontend integration

Set the frontend to use this backend by defining `NEXT_PUBLIC_API_BASE_URL` to the API base URL (e.g., `http://127.0.0.1:8000`). The front-end `api.ts` will send/receive an `Authorization: Bearer <token>` header. Tokens are returned by the API via the `X-Auth-Token` response header on sign up and sign in.

Endpoints implemented (subset aligned with frontend contract):
- `POST /auth/signup` → returns `User` (token in `X-Auth-Token` header)
- `POST /auth/signin` → returns `User` (token in `X-Auth-Token` header)
- `POST /auth/signout` → invalidates the token
- `GET /me` → returns current `User` (requires `Authorization`)
- `GET /me/profile`, `PATCH /me/profile`
- `POST /forms`, `GET /forms/mine`, `GET /forms/{id}`, `GET /forms/code/{code}`, `PATCH /forms/{id}`
- `GET /forms/{id}/submissions`
- `GET /submit/{code}/validate`
- `POST /submit/{code}` (accepts JSON with filename, sizeBytes, mimeType; no file upload)
- `GET /me/submissions`

Notes:
- CORS is open for local development; restrict origins in production.
- Passwords are hashed with SHA-256 for demo purposes only; do not use in production.
