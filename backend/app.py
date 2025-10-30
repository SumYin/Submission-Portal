from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ------------------------------------------------------------
# Simple SQLite + FastAPI backend to support the Next.js UI
# No file storage or media processing; just JSON+metadata.
# ------------------------------------------------------------

DB_PATH = os.environ.get("SP_DB_PATH", os.path.join(os.path.dirname(__file__), "data.db"))


def now_iso() -> str:
	return datetime.now(timezone.utc).isoformat()


@contextmanager
def db():
	conn = sqlite3.connect(DB_PATH)
	try:
		conn.row_factory = sqlite3.Row
		yield conn
		conn.commit()
	finally:
		conn.close()


def hash_password(pw: str) -> str:
	return hashlib.sha256(pw.encode("utf-8")).hexdigest()


def init_db() -> None:
	with db() as conn:
		cur = conn.cursor()
		cur.execute(
			"""
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				email TEXT
			)
			"""
		)
		cur.execute(
			"""
			CREATE TABLE IF NOT EXISTS tokens (
				token TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				created_at TEXT NOT NULL,
				FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
			)
			"""
		)
		cur.execute(
			"""
			CREATE TABLE IF NOT EXISTS profiles (
				user_id TEXT PRIMARY KEY,
				name TEXT,
				description TEXT,
				email TEXT,
				phone TEXT,
				FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
			)
			"""
		)
		cur.execute(
			"""
			CREATE TABLE IF NOT EXISTS forms (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT,
				code TEXT UNIQUE NOT NULL,
				constraints_json TEXT NOT NULL,
				allow_multiple INTEGER,
				max_per_user INTEGER,
				opens_at TEXT,
				closes_at TEXT,
				created_at TEXT NOT NULL,
				created_by TEXT NOT NULL,
				FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
			)
			"""
		)
		cur.execute(
			"""
			CREATE TABLE IF NOT EXISTS submissions (
				id TEXT PRIMARY KEY,
				form_id TEXT NOT NULL,
				submitted_by TEXT,
				status TEXT NOT NULL,
				filename TEXT NOT NULL,
				size_bytes INTEGER NOT NULL,
				mime_type TEXT NOT NULL,
				created_at TEXT NOT NULL,
				failure_reasons_json TEXT,
				FOREIGN KEY(form_id) REFERENCES forms(id) ON DELETE CASCADE,
				FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE SET NULL
			)
			"""
		)


# -----------------------
# Pydantic Models (I/O)
# -----------------------


class User(BaseModel):
	id: str
	username: str
	email: Optional[str] = None


class Profile(BaseModel):
	name: Optional[str] = None
	description: Optional[str] = None
	email: Optional[str] = None
	phone: Optional[str] = None


class FileConstraints(BaseModel):
	minSizeBytes: Optional[int] = None
	maxSizeBytes: Optional[int] = None
	allowedTypes: Optional[List[str]] = None
	image: Optional[Dict[str, Any]] = None
	video: Optional[Dict[str, Any]] = None


class FormSpecIn(BaseModel):
	title: str
	description: Optional[str] = None
	constraints: FileConstraints
	allowMultipleSubmissionsPerUser: Optional[bool] = None
	maxSubmissionsPerUser: Optional[int] = None
	opensAt: Optional[str] = None
	closesAt: Optional[str] = None
	code: Optional[str] = None  # optional override


class FormOut(BaseModel):
	id: str
	title: str
	description: Optional[str] = None
	code: str
	constraints: FileConstraints
	allowMultipleSubmissionsPerUser: Optional[bool] = None
	maxSubmissionsPerUser: Optional[int] = None
	opensAt: Optional[str] = None
	closesAt: Optional[str] = None
	createdAt: str
	createdBy: str


class Paginated(BaseModel):
	items: List[Any]
	total: int
	page: int
	pageSize: int


class SubmissionOut(BaseModel):
	id: str
	formId: str
	submittedBy: Optional[str] = None
	status: str
	filename: str
	sizeBytes: int
	mimeType: str
	createdAt: str
	failureReasons: Optional[List[str]] = None


class SignUpIn(BaseModel):
	username: str
	password: str
	email: Optional[str] = None


class SignInIn(BaseModel):
	username: str
	password: str


class UploadSubmissionIn(BaseModel):
	filename: str
	sizeBytes: int
	mimeType: str


class ValidateCodeOut(BaseModel):
	ok: bool
	form: Optional[FormOut] = None
	reason: Optional[str] = None


# -----------------------
# Auth helpers
# -----------------------


def issue_token(user_id: str) -> str:
	token = uuid.uuid4().hex
	with db() as conn:
		conn.execute(
			"INSERT INTO tokens(token, user_id, created_at) VALUES(?,?,?)",
			(token, user_id, now_iso()),
		)
	return token


def get_user_by_token(token: str) -> Optional[sqlite3.Row]:
	with db() as conn:
		cur = conn.execute(
			"SELECT u.* FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ?",
			(token,),
		)
		row = cur.fetchone()
		return row


def require_user(authorization: Optional[str] = Header(None)) -> sqlite3.Row:
	if not authorization or not authorization.lower().startswith("bearer "):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
	token = authorization.split(" ", 1)[1]
	user = get_user_by_token(token)
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
	return user


def optional_user(authorization: Optional[str] = Header(None)) -> Optional[sqlite3.Row]:
	if not authorization or not authorization.lower().startswith("bearer "):
		return None
	token = authorization.split(" ", 1)[1]
	return get_user_by_token(token)


# -----------------------
# App
# -----------------------

app = FastAPI(title="Submission Portal API", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],  # for local dev; restrict in production
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"]
)


@app.on_event("startup")
def _startup() -> None:
	init_db()


# -----------------------
# Auth endpoints
# -----------------------


@app.post("/auth/signup", response_model=User)
def sign_up(body: SignUpIn, response: Response) -> Any:
	with db() as conn:
		cur = conn.execute("SELECT 1 FROM users WHERE username = ?", (body.username,))
		if cur.fetchone():
			raise HTTPException(status_code=400, detail="Username already exists")
		user_id = f"usr_{uuid.uuid4().hex[:8]}"
		conn.execute(
			"INSERT INTO users(id, username, password_hash, email) VALUES(?,?,?,?)",
			(user_id, body.username, hash_password(body.password), body.email),
		)
	token = issue_token(user_id)
	response.headers["X-Auth-Token"] = token
	return User(id=user_id, username=body.username, email=body.email)


@app.post("/auth/signin", response_model=User)
def sign_in(body: SignInIn, response: Response) -> Any:
	with db() as conn:
		cur = conn.execute(
			"SELECT * FROM users WHERE username = ?",
			(body.username,),
		)
		row = cur.fetchone()
		if not row or row["password_hash"] != hash_password(body.password):
			raise HTTPException(status_code=401, detail="Invalid credentials")
		user = User(id=row["id"], username=row["username"], email=row["email"])
	token = issue_token(user.id)
	response.headers["X-Auth-Token"] = token
	return user


@app.get("/me", response_model=User)
def get_me(user: sqlite3.Row = Depends(require_user)) -> Any:
	return User(id=user["id"], username=user["username"], email=user["email"])


@app.post("/auth/signout")
def sign_out(authorization: Optional[str] = Header(None)) -> Any:
	if authorization and authorization.lower().startswith("bearer "):
		token = authorization.split(" ", 1)[1]
		with db() as conn:
			conn.execute("DELETE FROM tokens WHERE token = ?", (token,))
	return Response(status_code=204)


# -----------------------
# Profile
# -----------------------


@app.get("/me/profile", response_model=Profile)
def get_profile(user: sqlite3.Row = Depends(require_user)) -> Any:
	with db() as conn:
		cur = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user["id"],))
		row = cur.fetchone()
		if not row:
			return Profile()
		return Profile(name=row["name"], description=row["description"], email=row["email"], phone=row["phone"])


@app.patch("/me/profile", response_model=Profile)
def update_profile(patch: Profile, user: sqlite3.Row = Depends(require_user)) -> Any:
	with db() as conn:
		# Upsert profile
		existing = conn.execute("SELECT 1 FROM profiles WHERE user_id = ?", (user["id"],)).fetchone()
		if existing:
			conn.execute(
				"UPDATE profiles SET name=?, description=?, email=?, phone=? WHERE user_id=?",
				(patch.name, patch.description, patch.email, patch.phone, user["id"]),
			)
		else:
			conn.execute(
				"INSERT INTO profiles(user_id, name, description, email, phone) VALUES(?,?,?,?,?)",
				(user["id"], patch.name, patch.description, patch.email, patch.phone),
			)
	return patch


# -----------------------
# Forms
# -----------------------


def form_row_to_out(row: sqlite3.Row) -> FormOut:
	return FormOut(
		id=row["id"],
		title=row["title"],
		description=row["description"],
		code=row["code"],
		constraints=FileConstraints(**json.loads(row["constraints_json"])),
		allowMultipleSubmissionsPerUser=bool(row["allow_multiple"]) if row["allow_multiple"] is not None else None,
		maxSubmissionsPerUser=row["max_per_user"],
		opensAt=row["opens_at"],
		closesAt=row["closes_at"],
		createdAt=row["created_at"],
		createdBy=row["created_by"],
	)


@app.post("/forms", response_model=FormOut)
def create_form(body: FormSpecIn, user: sqlite3.Row = Depends(require_user)) -> Any:
	code = (body.code or uuid.uuid4().hex[:6]).lower()
	with db() as conn:
		exists = conn.execute("SELECT 1 FROM forms WHERE code = ?", (code,)).fetchone()
		if exists:
			# regenerate simple
			code = uuid.uuid4().hex[:6].lower()
		form_id = f"frm_{uuid.uuid4().hex[:8]}"
		conn.execute(
			"""
			INSERT INTO forms(id, title, description, code, constraints_json, allow_multiple, max_per_user, opens_at, closes_at, created_at, created_by)
			VALUES(?,?,?,?,?,?,?,?,?,?,?)
			""",
			(
				form_id,
				body.title,
				body.description,
				code,
				json.dumps(body.constraints.model_dump(exclude_none=True)),
				1 if body.allowMultipleSubmissionsPerUser else 0 if body.allowMultipleSubmissionsPerUser is not None else None,
				body.maxSubmissionsPerUser,
				body.opensAt,
				body.closesAt,
				now_iso(),
				user["id"],
			),
		)
		row = conn.execute("SELECT * FROM forms WHERE id = ?", (form_id,)).fetchone()
	return form_row_to_out(row)


@app.get("/forms/mine", response_model=List[FormOut])
def list_my_forms(user: sqlite3.Row = Depends(require_user)) -> Any:
	with db() as conn:
		rows = conn.execute("SELECT * FROM forms WHERE created_by = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
	return [form_row_to_out(r) for r in rows]


@app.get("/forms/{form_id}", response_model=FormOut)
def get_form(form_id: str, user: sqlite3.Row = Depends(require_user)) -> Any:
	with db() as conn:
		row = conn.execute("SELECT * FROM forms WHERE id = ?", (form_id,)).fetchone()
		if not row:
			raise HTTPException(status_code=404, detail="Form not found")
	return form_row_to_out(row)


@app.get("/forms/code/{code}", response_model=FormOut)
def get_form_by_code(code: str) -> Any:
	with db() as conn:
		row = conn.execute("SELECT * FROM forms WHERE code = ?", (code.lower(),)).fetchone()
		if not row:
			raise HTTPException(status_code=404, detail="Form not found")
	return form_row_to_out(row)


@app.patch("/forms/{form_id}", response_model=FormOut)
def update_form(form_id: str, patch: FormSpecIn, user: sqlite3.Row = Depends(require_user)) -> Any:
	with db() as conn:
		current = conn.execute("SELECT * FROM forms WHERE id = ?", (form_id,)).fetchone()
		if not current:
			raise HTTPException(status_code=404, detail="Form not found")
		if current["created_by"] != user["id"]:
			raise HTTPException(status_code=403, detail="Forbidden")
		# Only update provided fields
		conn.execute(
			"""
			UPDATE forms SET title=?, description=?, constraints_json=?, allow_multiple=?, max_per_user=?, opens_at=?, closes_at=?
			WHERE id=?
			""",
			(
				patch.title or current["title"],
				patch.description if patch.description is not None else current["description"],
				json.dumps((patch.constraints or FileConstraints()).model_dump(exclude_none=True))
				if patch.constraints is not None
				else current["constraints_json"],
				1 if patch.allowMultipleSubmissionsPerUser else 0 if patch.allowMultipleSubmissionsPerUser is not None else current["allow_multiple"],
				patch.maxSubmissionsPerUser if patch.maxSubmissionsPerUser is not None else current["max_per_user"],
				patch.opensAt if patch.opensAt is not None else current["opens_at"],
				patch.closesAt if patch.closesAt is not None else current["closes_at"],
				form_id,
			),
		)
		row = conn.execute("SELECT * FROM forms WHERE id = ?", (form_id,)).fetchone()
	return form_row_to_out(row)


@app.get("/forms/{form_id}/submissions", response_model=Paginated)
def get_form_submissions(form_id: str, user: sqlite3.Row = Depends(require_user)) -> Any:
	with db() as conn:
		# Ensure ownership
		owner = conn.execute("SELECT created_by FROM forms WHERE id = ?", (form_id,)).fetchone()
		if not owner:
			raise HTTPException(status_code=404, detail="Form not found")
		if owner["created_by"] != user["id"]:
			raise HTTPException(status_code=403, detail="Forbidden")
		rows = conn.execute(
			"SELECT * FROM submissions WHERE form_id = ? ORDER BY created_at DESC",
			(form_id,),
		).fetchall()
	items = [
		SubmissionOut(
			id=r["id"],
			formId=r["form_id"],
			submittedBy=r["submitted_by"],
			status=r["status"],
			filename=r["filename"],
			sizeBytes=r["size_bytes"],
			mimeType=r["mime_type"],
			createdAt=r["created_at"],
			failureReasons=json.loads(r["failure_reasons_json"]) if r["failure_reasons_json"] else None,
		)
		for r in rows
	]
	return Paginated(items=items, total=len(items), page=1, pageSize=len(items) or 1)


# -----------------------
# Submissions
# -----------------------


@app.get("/submit/{code}/validate", response_model=ValidateCodeOut)
def validate_code(code: str) -> Any:
	with db() as conn:
		row = conn.execute("SELECT * FROM forms WHERE code = ?", (code.lower(),)).fetchone()
		if not row:
			return ValidateCodeOut(ok=False, form=None, reason="Code not found")
		# For now, don't enforce open/close windows
	return ValidateCodeOut(ok=True, form=form_row_to_out(row))


@app.post("/submit/{code}", response_model=Dict[str, Any])
def upload_submission(code: str, body: UploadSubmissionIn, user: Optional[sqlite3.Row] = Depends(optional_user)) -> Any:
	with db() as conn:
		form = conn.execute("SELECT * FROM forms WHERE code = ?", (code.lower(),)).fetchone()
		if not form:
			raise HTTPException(status_code=404, detail="Invalid code")
		sub_id = f"sub_{uuid.uuid4().hex[:8]}"
		conn.execute(
			"""
			INSERT INTO submissions(id, form_id, submitted_by, status, filename, size_bytes, mime_type, created_at, failure_reasons_json)
			VALUES(?,?,?,?,?,?,?,?,?)
			""",
			(
				sub_id,
				form["id"],
				user["id"] if user is not None else None,
				"accepted",  # no processing for now
				body.filename,
				body.sizeBytes,
				body.mimeType,
				now_iso(),
				None,
			),
		)
		submission = {
			"id": sub_id,
			"formId": form["id"],
			"submittedBy": user["id"] if user is not None else None,
			"status": "accepted",
			"filename": body.filename,
			"sizeBytes": body.sizeBytes,
			"mimeType": body.mimeType,
			"createdAt": now_iso(),
		}
	return {"ok": True, "submission": submission}


@app.get("/me/submissions", response_model=List[SubmissionOut])
def list_my_submissions(user: Optional[sqlite3.Row] = Depends(optional_user)) -> Any:
	with db() as conn:
		if user is None:
			rows = conn.execute("SELECT * FROM submissions ORDER BY created_at DESC").fetchall()
		else:
			rows = conn.execute(
				"SELECT * FROM submissions WHERE submitted_by = ? ORDER BY created_at DESC",
				(user["id"],),
			).fetchall()
	return [
		SubmissionOut(
			id=r["id"],
			formId=r["form_id"],
			submittedBy=r["submitted_by"],
			status=r["status"],
			filename=r["filename"],
			sizeBytes=r["size_bytes"],
			mimeType=r["mime_type"],
			createdAt=r["created_at"],
			failureReasons=json.loads(r["failure_reasons_json"]) if r["failure_reasons_json"] else None,
		)
		for r in rows
	]


# Health check
@app.get("/health")
def health() -> Dict[str, str]:
	return {"status": "ok"}
