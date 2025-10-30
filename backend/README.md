# Submission Portal Backend (FastAPI + SQLite)

This is a Python backend for the Submission Portal frontend.

- Framework: FastAPI (typed, async, auto OpenAPI docs, first-class file upload)
- Database: SQLite (3NF schema with type-specific constraints tables)
- Validation: ffprobe for audio/video, Pillow for images (optional, graceful fallback)

## Quick start

1) Install Python 3.11+

2) Create and activate a virtual environment (optional but recommended)

```powershell
python -m venv .venv
. .venv\Scripts\Activate.ps1
```

3) Install dependencies

```powershell
pip install -r requirements.txt
```

4) Configure environment

Copy `.env.example` to `.env` and adjust as needed. Defaults should work out of the box.

5) Run the server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

6) Point the frontend to the backend

In the `web` app, set:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000"
$env:NEXT_PUBLIC_AUTH_MODE = "token"
```

Or create a `.env.local` in `web/` with:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_MODE=token
```

7) Open API docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Notes

- File uploads are accepted at `POST /submit/{code}`. You can send JSON metadata (filename/sizeBytes/mimeType) or use multipart form-data with a file.
- The backend maps the frontend's `constraints` object into normalized tables (image/video/audio specific tables).
- If `ffprobe` (from FFmpeg) or Pillow are not installed, media validation will still perform basic checks (size, mime/ext) and skip deep inspection.
- Authentication uses stateless JWT (HS256). Tokens are returned via `X-Auth-Token` header on sign in/up when `NEXT_PUBLIC_AUTH_MODE=token` is used on the frontend.

## Project layout

- `app/main.py` — FastAPI app and routes
- `app/settings.py` — configuration
- `app/db.py` — SQLite connection + schema init (runs on startup)
- `app/schemas.py` — Pydantic models (API contract)
- `app/auth.py` — auth helpers (password hashing, JWT), auth routes
- `app/crud.py` — DB helpers for users/forms/submissions
- `app/validation.py` — file/media validation helpers
- `storage/` — uploaded files (if multipart uploads used)

MIT (c) 2025
