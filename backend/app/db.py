from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator, Optional, Any, Dict
from pathlib import Path
from .settings import settings
import datetime as dt

# Derived path from DATABASE_URL (supports sqlite only)
# Expect forms like: sqlite:///./data.db or sqlite:///c:/path/to/db.sqlite

def _sqlite_path_from_url(url: str) -> str:
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        raise ValueError("Only sqlite URLs are supported, e.g., sqlite:///./data.db")
    return url[len(prefix):]

DB_PATH = _sqlite_path_from_url(settings.database_url)
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc).isoformat()


SCHEMA_SQL = r"""
PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TEXT NOT NULL
);

-- Profiles (separate from users for 3NF)
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  email TEXT,
  phone TEXT
);

-- Credentials (separate table; do not store plaintext passwords)
CREATE TABLE IF NOT EXISTS auth_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL
);

-- Forms (one per set of constraints)
CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  opens_at TEXT,
  closes_at TEXT,
  file_category TEXT NOT NULL CHECK (file_category IN ('video','image','audio','other')),
  min_size_bytes INTEGER,
  max_size_bytes INTEGER CHECK (max_size_bytes <= 104857600), -- 100MB cap
  allow_multiple_submissions_per_user INTEGER NOT NULL DEFAULT 0,
  max_submissions_per_user INTEGER
);

-- Master list of known formats (optional seed data)
CREATE TABLE IF NOT EXISTS file_formats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('video','image','audio','other')),
  extension TEXT,
  mime_type TEXT,
  description TEXT,
  UNIQUE (category, COALESCE(extension,''), COALESCE(mime_type,''))
);

-- Which formats are allowed for a form (by reference to master formats)
CREATE TABLE IF NOT EXISTS form_allowed_formats (
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  format_id INTEGER NOT NULL REFERENCES file_formats(id) ON DELETE CASCADE,
  PRIMARY KEY (form_id, format_id)
);

-- Custom allowed extensions per form (useful for 'other' category)
CREATE TABLE IF NOT EXISTS form_allowed_extensions (
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  extension TEXT NOT NULL,
  PRIMARY KEY (form_id, extension)
);

-- Image constraints (applies when file_category = 'image')
CREATE TABLE IF NOT EXISTS image_constraints (
  form_id TEXT PRIMARY KEY REFERENCES forms(id) ON DELETE CASCADE,
  min_width INTEGER,
  min_height INTEGER,
  max_width INTEGER,
  max_height INTEGER
);

-- Video constraints (applies when file_category = 'video')
CREATE TABLE IF NOT EXISTS video_constraints (
  form_id TEXT PRIMARY KEY REFERENCES forms(id) ON DELETE CASCADE,
  min_fps REAL,
  max_fps REAL,
  min_width INTEGER,
  min_height INTEGER,
  max_width INTEGER,
  max_height INTEGER,
  min_bitrate_kbps INTEGER,
  max_bitrate_kbps INTEGER,
  length_mode TEXT CHECK (length_mode IN ('duration','frames')),
  min_duration_sec REAL,
  max_duration_sec REAL,
  min_frames INTEGER,
  max_frames INTEGER
);

CREATE TABLE IF NOT EXISTS video_allowed_codecs (
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  codec TEXT NOT NULL,
  PRIMARY KEY (form_id, codec)
);

CREATE TABLE IF NOT EXISTS video_allowed_aspect_ratios (
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  aspect_ratio TEXT NOT NULL,
  PRIMARY KEY (form_id, aspect_ratio)
);

-- Audio constraints (applies when file_category = 'audio')
CREATE TABLE IF NOT EXISTS audio_constraints (
  form_id TEXT PRIMARY KEY REFERENCES forms(id) ON DELETE CASCADE,
  min_duration_sec REAL,
  max_duration_sec REAL,
  min_bitrate_kbps INTEGER,
  max_bitrate_kbps INTEGER,
  min_sample_rate_hz INTEGER,
  max_sample_rate_hz INTEGER
);

CREATE TABLE IF NOT EXISTS audio_allowed_codecs (
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  codec TEXT NOT NULL,
  PRIMARY KEY (form_id, codec)
);

CREATE TABLE IF NOT EXISTS audio_allowed_channels (
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  channels TEXT NOT NULL,
  PRIMARY KEY (form_id, channels)
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing','accepted','rejected')),
  created_at TEXT NOT NULL
);

-- Per-type metadata extracted (nullable columns set per file type)
CREATE TABLE IF NOT EXISTS video_metadata (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  width INTEGER,
  height INTEGER,
  fps REAL,
  frames INTEGER,
  duration_sec REAL,
  bitrate_kbps INTEGER,
  codec_name TEXT,
  aspect_ratio TEXT,
  audio_codec TEXT,
  audio_sample_rate_hz INTEGER,
  audio_bitrate_kbps INTEGER,
  audio_channels INTEGER
);

CREATE TABLE IF NOT EXISTS image_metadata (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  width INTEGER,
  height INTEGER,
  color_profile TEXT
);

CREATE TABLE IF NOT EXISTS audio_metadata (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  duration_sec REAL,
  sample_rate_hz INTEGER,
  bitrate_kbps INTEGER,
  channels INTEGER,
  codec_name TEXT
);

-- Validation results/messages per submission
CREATE TABLE IF NOT EXISTS submission_validation_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  passed INTEGER NOT NULL CHECK (passed IN (0,1)),
  message TEXT,
  created_at TEXT NOT NULL
);
"""


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(SCHEMA_SQL)


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}
