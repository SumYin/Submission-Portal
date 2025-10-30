from __future__ import annotations

import os
import hmac
import hashlib
import base64
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Header, APIRouter, Response
from .settings import settings
from .db import get_db
from . import crud
import sqlite3

ALGORITHM = "HS256"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def generate_salt() -> str:
    return os.urandom(16).hex()


def hash_password(password: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return dk.hex()


def verify_password(password: str, salt_hex: str, stored_hash_hex: str) -> bool:
    calc = hash_password(password, salt_hex)
    return hmac.compare_digest(calc, stored_hash_hex)


def create_access_token(user_id: str, expires_delta_minutes: Optional[int] = None) -> str:
    expire_minutes = expires_delta_minutes or settings.access_token_expire_minutes
    to_encode = {"sub": user_id, "exp": _now() + timedelta(minutes=expire_minutes)}
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return str(sub) if sub else None
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization:
        return None
    try:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        user_id = decode_token(token)
        return user_id
    except Exception:
        return None


async def require_user_id(user_id: Optional[str] = Depends(get_current_user_id)) -> str:
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user_id


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
async def sign_up(payload: Dict[str, Any], response: Response, db: sqlite3.Connection = Depends(get_db)):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    email = (payload.get("email") or None)
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")
    if crud.get_user_by_username(db, username):
        raise HTTPException(status_code=400, detail="Username already exists")
    user = crud.create_user(db, username, email)
    # store credentials
    salt = generate_salt()
    pwd_hash = hash_password(password, salt)
    db.execute(
        "INSERT INTO auth_credentials(user_id, password_hash, password_salt) VALUES (?,?,?)",
        (user["id"], pwd_hash, salt),
    )
    token = create_access_token(user["id"]) 
    response.headers["X-Auth-Token"] = token
    return user


@router.post("/signin")
async def sign_in(payload: Dict[str, Any], response: Response, db: sqlite3.Connection = Depends(get_db)):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    cur = db.execute("SELECT password_hash, password_salt FROM auth_credentials WHERE user_id=?", (user["id"],))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(password, row["password_salt"], row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"]) 
    response.headers["X-Auth-Token"] = token
    return {"id": user["id"], "username": user["username"], "email": user.get("email")}


@router.post("/signout")
async def sign_out():
    # Stateless JWT: nothing to do server-side; client should drop token
    return {"ok": True}
