from __future__ import annotations

import os
from typing import List, Tuple
import sqlite3


def _get_constraints(conn: sqlite3.Connection, form_id: str):
    # Minimal subset for fast validation
    c = conn.execute("SELECT min_size_bytes, max_size_bytes FROM forms WHERE id=?", (form_id,)).fetchone()
    min_size = c[0] if c else None
    max_size = c[1] if c else None
    # Allowed MIME types
    cur = conn.execute(
        "SELECT ff.mime_type FROM form_allowed_formats f JOIN file_formats ff ON ff.id=f.format_id WHERE f.form_id=?",
        (form_id,),
    )
    allowed_types = [r[0] for r in cur.fetchall() if r[0]]
    # Allowed extensions
    cur = conn.execute("SELECT extension FROM form_allowed_extensions WHERE form_id=?", (form_id,))
    allowed_exts = [r[0].lower() for r in cur.fetchall()]
    return min_size, max_size, allowed_types, allowed_exts


def basic_validate(conn: sqlite3.Connection, form_id: str, filename: str, size_bytes: int, mime_type: str) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    min_size, max_size, allowed_types, allowed_exts = _get_constraints(conn, form_id)

    if min_size is not None and size_bytes < int(min_size):
        errors.append(f"File smaller than minimum {min_size} bytes")
    if max_size is not None and size_bytes > int(max_size):
        errors.append(f"File larger than maximum {max_size} bytes")

    # If no explicit rules, treat as allow-all
    if allowed_types or allowed_exts:
        ok = False
        if mime_type and allowed_types and mime_type in allowed_types:
            ok = True
        if not ok and allowed_exts:
            ext = os.path.splitext(filename)[1].lower()
            if ext in allowed_exts:
                ok = True
        if not ok:
            errors.append(f"File type {mime_type or 'unknown'} not allowed")

    return (len(errors) == 0), errors
