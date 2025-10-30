from __future__ import annotations

import sqlite3
import uuid
from typing import Any, Dict, List, Optional, Tuple
from .db import now_iso, row_to_dict


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ===== Users & Profiles =====

def get_user_by_username(conn: sqlite3.Connection, username: str) -> Optional[Dict[str, Any]]:
    cur = conn.execute("SELECT * FROM users WHERE username = ?", (username,))
    return row_to_dict(cur.fetchone())


def get_user_by_id(conn: sqlite3.Connection, user_id: str) -> Optional[Dict[str, Any]]:
    cur = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    return row_to_dict(cur.fetchone())


def create_user(conn: sqlite3.Connection, username: str, email: Optional[str]) -> Dict[str, Any]:
    user_id = _uid("usr")
    conn.execute(
        "INSERT INTO users (id, username, email, created_at) VALUES (?,?,?,?)",
        (user_id, username, email, now_iso()),
    )
    return {"id": user_id, "username": username, "email": email}


def upsert_profile(conn: sqlite3.Connection, user_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    # Load existing
    cur = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    row = row_to_dict(cur.fetchone())
    if row is None:
        base = {"name": None, "description": None, "email": None, "phone": None}
        new = {**base, **patch}
        conn.execute(
            "INSERT INTO profiles(user_id, name, description, email, phone) VALUES (?,?,?,?,?)",
            (user_id, new.get("name"), new.get("description"), new.get("email"), new.get("phone")),
        )
        return new
    else:
        merged = {**row, **patch}
        conn.execute(
            "UPDATE profiles SET name=?, description=?, email=?, phone=? WHERE user_id=?",
            (merged.get("name"), merged.get("description"), merged.get("email"), merged.get("phone"), user_id),
        )
        return {k: merged.get(k) for k in ["name", "description", "email", "phone"]}


def get_profile(conn: sqlite3.Connection, user_id: str) -> Dict[str, Any]:
    cur = conn.execute("SELECT * FROM profiles WHERE user_id=?", (user_id,))
    row = row_to_dict(cur.fetchone())
    if not row:
        return {}
    return {k: row.get(k) for k in ["name", "description", "email", "phone"]}


# ===== Forms & Constraints =====

MIME_TO_CATEGORY_PREFIX = {
    "video/": "video",
    "image/": "image",
    "audio/": "audio",
}


def infer_category(constraints: Dict[str, Any]) -> str:
    # Prefer explicit nested constraint blocks
    if constraints.get("video"):
        return "video"
    if constraints.get("image"):
        return "image"
    if constraints.get("audio"):
        return "audio"
    # Infer from allowedTypes
    types = constraints.get("allowedTypes") or []
    for t in types:
        for prefix, cat in MIME_TO_CATEGORY_PREFIX.items():
            if isinstance(t, str) and t.startswith(prefix):
                return cat
    return "other"


def ensure_formats(conn: sqlite3.Connection, category: str, mime_types: List[str]) -> List[int]:
    ids: List[int] = []
    for mt in mime_types:
        cur = conn.execute(
            "SELECT id FROM file_formats WHERE category=? AND COALESCE(mime_type,'') = ? AND COALESCE(extension,'') = ''",
            (category, mt or ""),
        )
        row = cur.fetchone()
        if row:
            ids.append(int(row[0]))
        else:
            cur2 = conn.execute(
                "INSERT INTO file_formats(category, extension, mime_type, description) VALUES (?,?,?,?)",
                (category, None, mt or None, None),
            )
            ids.append(cur2.lastrowid)
    return ids


def store_constraints(conn: sqlite3.Connection, form_id: str, category: str, constraints: Dict[str, Any]) -> None:
    # Sizes
    min_size = constraints.get("minSizeBytes")
    max_size = constraints.get("maxSizeBytes")
    if min_size is not None or max_size is not None:
        conn.execute(
            "UPDATE forms SET min_size_bytes=?, max_size_bytes=? WHERE id=?",
            (min_size, max_size, form_id),
        )

    # Allowed types via file_formats join
    allow_all = constraints.get("allowAllTypes")
    if not allow_all:
        allowed_types = constraints.get("allowedTypes") or []
        if allowed_types:
            for fid in ensure_formats(conn, category, allowed_types):
                conn.execute(
                    "INSERT OR IGNORE INTO form_allowed_formats(form_id, format_id) VALUES (?,?)",
                    (form_id, fid),
                )
        # Allowed extensions
        allowed_exts = constraints.get("allowedExtensions") or []
        for ext in allowed_exts:
            extn = ext.lower() if ext.startswith(".") else f".{ext.lower()}"
            conn.execute(
                "INSERT OR IGNORE INTO form_allowed_extensions(form_id, extension) VALUES (?,?)",
                (form_id, extn),
            )

    # Image constraints
    img = constraints.get("image")
    if img:
        conn.execute(
            "INSERT OR REPLACE INTO image_constraints(form_id, min_width, min_height, max_width, max_height) VALUES (?,?,?,?,?)",
            (form_id, img.get("minWidth"), img.get("minHeight"), img.get("maxWidth"), img.get("maxHeight")),
        )

    # Video constraints
    vid = constraints.get("video")
    if vid:
        conn.execute(
            "INSERT OR REPLACE INTO video_constraints(form_id, min_fps, max_fps, min_width, min_height, max_width, max_height, min_bitrate_kbps, max_bitrate_kbps, length_mode, min_duration_sec, max_duration_sec, min_frames, max_frames) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                form_id,
                vid.get("minFrameRate"),
                vid.get("maxFrameRate"),
                vid.get("minWidth"),
                vid.get("minHeight"),
                vid.get("maxWidth"),
                vid.get("maxHeight"),
                vid.get("minBitrateKbps"),
                vid.get("maxBitrateKbps"),
                # Choose length mode if durations present else frames
                "duration" if (vid.get("minDurationSec") is not None or vid.get("maxDurationSec") is not None) else ("frames" if (vid.get("minFrames") is not None or vid.get("maxFrames") is not None) else None),
                vid.get("minDurationSec"),
                vid.get("maxDurationSec"),
                vid.get("minFrames"),
                vid.get("maxFrames"),
            ),
        )
        # allowed codecs
        for codec in (vid.get("allowedCodecs") or []):
            conn.execute(
                "INSERT OR IGNORE INTO video_allowed_codecs(form_id, codec) VALUES (?,?)",
                (form_id, codec),
            )
        # aspect ratios
        for ar in (vid.get("allowedAspectRatios") or []):
            conn.execute(
                "INSERT OR IGNORE INTO video_allowed_aspect_ratios(form_id, aspect_ratio) VALUES (?,?)",
                (form_id, ar),
            )
        # audio sub-constraints
        aud = vid.get("audio") or {}
        for codec in (aud.get("allowedCodecs") or []):
            conn.execute(
                "INSERT OR IGNORE INTO audio_allowed_codecs(form_id, codec) VALUES (?,?)",
                (form_id, codec),
            )
        for ch in (aud.get("allowedChannels") or []):
            conn.execute(
                "INSERT OR IGNORE INTO audio_allowed_channels(form_id, channels) VALUES (?,?)",
                (form_id, ch),
            )
        if any(k in aud for k in ("minSampleRateHz","maxSampleRateHz","minBitrateKbps","maxBitrateKbps")):
            conn.execute(
                "INSERT OR REPLACE INTO audio_constraints(form_id, min_duration_sec, max_duration_sec, min_bitrate_kbps, max_bitrate_kbps, min_sample_rate_hz, max_sample_rate_hz) VALUES (?,?,?,?,?,?,?)",
                (
                    form_id,
                    None,
                    None,
                    aud.get("minBitrateKbps"),
                    aud.get("maxBitrateKbps"),
                    aud.get("minSampleRateHz"),
                    aud.get("maxSampleRateHz"),
                ),
            )

    # Audio constraints (top-level, when category is audio)
    aud = constraints.get("audio")
    if aud:
        conn.execute(
            "INSERT OR REPLACE INTO audio_constraints(form_id, min_duration_sec, max_duration_sec, min_bitrate_kbps, max_bitrate_kbps, min_sample_rate_hz, max_sample_rate_hz) VALUES (?,?,?,?,?,?,?)",
            (
                form_id,
                aud.get("minDurationSec"),
                aud.get("maxDurationSec"),
                aud.get("minBitrateKbps"),
                aud.get("maxBitrateKbps"),
                aud.get("minSampleRateHz"),
                aud.get("maxSampleRateHz"),
            ),
        )
        for codec in (aud.get("allowedCodecs") or []):
            conn.execute(
                "INSERT OR IGNORE INTO audio_allowed_codecs(form_id, codec) VALUES (?,?)",
                (form_id, codec),
            )
        for ch in (aud.get("allowedChannels") or []):
            conn.execute(
                "INSERT OR IGNORE INTO audio_allowed_channels(form_id, channels) VALUES (?,?)",
                (form_id, ch),
            )


def load_constraints(conn: sqlite3.Connection, form_id: str) -> Dict[str, Any]:
    # Base
    cur = conn.execute("SELECT min_size_bytes, max_size_bytes FROM forms WHERE id=?", (form_id,))
    row = row_to_dict(cur.fetchone()) or {}
    out: Dict[str, Any] = {
        "minSizeBytes": row.get("min_size_bytes"),
        "maxSizeBytes": row.get("max_size_bytes"),
        "allowAllTypes": False,
    }
    # Allowed types
    cur = conn.execute(
        "SELECT ff.mime_type FROM form_allowed_formats f JOIN file_formats ff ON ff.id=f.format_id WHERE f.form_id=?",
        (form_id,),
    )
    out["allowedTypes"] = [r[0] for r in cur.fetchall() if r[0]]
    # Allowed extensions
    cur = conn.execute("SELECT extension FROM form_allowed_extensions WHERE form_id=?", (form_id,))
    out["allowedExtensions"] = [r[0] for r in cur.fetchall()]

    # Image
    cur = conn.execute("SELECT * FROM image_constraints WHERE form_id=?", (form_id,))
    img = row_to_dict(cur.fetchone())
    if img:
        out["image"] = {
            "minWidth": img.get("min_width"),
            "minHeight": img.get("min_height"),
            "maxWidth": img.get("max_width"),
            "maxHeight": img.get("max_height"),
        }
    # Video
    cur = conn.execute("SELECT * FROM video_constraints WHERE form_id=?", (form_id,))
    vid = row_to_dict(cur.fetchone())
    if vid:
        out["video"] = {
            "minFrameRate": vid.get("min_fps"),
            "maxFrameRate": vid.get("max_fps"),
            "minWidth": vid.get("min_width"),
            "minHeight": vid.get("min_height"),
            "maxWidth": vid.get("max_width"),
            "maxHeight": vid.get("max_height"),
            "minBitrateKbps": vid.get("min_bitrate_kbps"),
            "maxBitrateKbps": vid.get("max_bitrate_kbps"),
            "minFrames": vid.get("min_frames"),
            "maxFrames": vid.get("max_frames"),
            "minDurationSec": vid.get("min_duration_sec"),
            "maxDurationSec": vid.get("max_duration_sec"),
        }
        # codecs
        cur = conn.execute("SELECT codec FROM video_allowed_codecs WHERE form_id=?", (form_id,))
        codecs = [r[0] for r in cur.fetchall()]
        if codecs:
            out["video"]["allowedCodecs"] = codecs
        # aspect ratios
        cur = conn.execute("SELECT aspect_ratio FROM video_allowed_aspect_ratios WHERE form_id=?", (form_id,))
        ars = [r[0] for r in cur.fetchall()]
        if ars:
            out["video"]["allowedAspectRatios"] = ars
        # audio sub
        a_cur = conn.execute("SELECT * FROM audio_constraints WHERE form_id=?", (form_id,))
        arow = row_to_dict(a_cur.fetchone())
        if arow:
            out.setdefault("video", {})["audio"] = {
                "minSampleRateHz": arow.get("min_sample_rate_hz"),
                "maxSampleRateHz": arow.get("max_sample_rate_hz"),
                "minBitrateKbps": arow.get("min_bitrate_kbps"),
                "maxBitrateKbps": arow.get("max_bitrate_kbps"),
            }
            # codecs
            cur = conn.execute("SELECT codec FROM audio_allowed_codecs WHERE form_id=?", (form_id,))
            ac = [r[0] for r in cur.fetchall()]
            if ac:
                out["video"]["audio"]["allowedCodecs"] = ac
            cur = conn.execute("SELECT channels FROM audio_allowed_channels WHERE form_id=?", (form_id,))
            ch = [r[0] for r in cur.fetchall()]
            if ch:
                out["video"]["audio"]["allowedChannels"] = ch

    # Audio (top-level)
    cur = conn.execute("SELECT * FROM audio_constraints WHERE form_id=?", (form_id,))
    aud = row_to_dict(cur.fetchone())
    if aud and "video" not in out:
        out["audio"] = {
            "minDurationSec": aud.get("min_duration_sec"),
            "maxDurationSec": aud.get("max_duration_sec"),
            "minSampleRateHz": aud.get("min_sample_rate_hz"),
            "maxSampleRateHz": aud.get("max_sample_rate_hz"),
            "minBitrateKbps": aud.get("min_bitrate_kbps"),
            "maxBitrateKbps": aud.get("max_bitrate_kbps"),
        }
        cur = conn.execute("SELECT codec FROM audio_allowed_codecs WHERE form_id=?", (form_id,))
        ac = [r[0] for r in cur.fetchall()]
        if ac:
            out["audio"]["allowedCodecs"] = ac
        cur = conn.execute("SELECT channels FROM audio_allowed_channels WHERE form_id=?", (form_id,))
        ch = [r[0] for r in cur.fetchall()]
        if ch:
            out["audio"]["allowedChannels"] = ch

    return out


def create_form(conn: sqlite3.Connection, creator_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    code = (data.get("code") or uuid.uuid4().hex[:6]).lower()
    form_id = _uid("frm")
    constraints = data["constraints"]
    category = infer_category(constraints)

    conn.execute(
        "INSERT INTO forms(id, code, title, description, created_by, created_at, file_category, min_size_bytes, max_size_bytes, allow_multiple_submissions_per_user, max_submissions_per_user, opens_at, closes_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            form_id,
            code,
            data.get("title"),
            data.get("description"),
            creator_id,
            now_iso(),
            category,
            constraints.get("minSizeBytes"),
            constraints.get("maxSizeBytes"),
            1 if data.get("allowMultipleSubmissionsPerUser") else 0,
            data.get("maxSubmissionsPerUser"),
            data.get("opensAt"),
            data.get("closesAt"),
        ),
    )
    store_constraints(conn, form_id, category, constraints)

    return get_form_by_id(conn, form_id)


def get_form_by_id(conn: sqlite3.Connection, form_id: str) -> Optional[Dict[str, Any]]:
    cur = conn.execute("SELECT * FROM forms WHERE id=?", (form_id,))
    row = row_to_dict(cur.fetchone())
    if not row:
        return None
    c = load_constraints(conn, form_id)
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row.get("description"),
        "code": row["code"],
        "constraints": c,
        "allowMultipleSubmissionsPerUser": bool(row.get("allow_multiple_submissions_per_user")),
        "maxSubmissionsPerUser": row.get("max_submissions_per_user"),
        "opensAt": row.get("opens_at"),
        "closesAt": row.get("closes_at"),
        "createdAt": row.get("created_at"),
        "createdBy": row.get("created_by"),
    }


def get_form_by_code(conn: sqlite3.Connection, code: str) -> Optional[Dict[str, Any]]:
    cur = conn.execute("SELECT id FROM forms WHERE code=?", (code,))
    r = cur.fetchone()
    if not r:
        return None
    return get_form_by_id(conn, r[0])


def list_forms_by_user(conn: sqlite3.Connection, user_id: str) -> List[Dict[str, Any]]:
    cur = conn.execute("SELECT id FROM forms WHERE created_by=? ORDER BY created_at DESC", (user_id,))
    ids = [r[0] for r in cur.fetchall()]
    return [get_form_by_id(conn, fid) for fid in ids if fid]


def update_form(conn: sqlite3.Connection, form_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Update top-level fields
    current = get_form_by_id(conn, form_id)
    if not current:
        return None
    new_title = patch.get("title", current["title"])
    new_desc = patch.get("description", current.get("description"))
    new_code = patch.get("code", current["code"])
    new_opens = patch.get("opensAt", current.get("opensAt"))
    new_closes = patch.get("closesAt", current.get("closesAt"))
    new_allow_multi = 1 if patch.get("allowMultipleSubmissionsPerUser", current.get("allowMultipleSubmissionsPerUser")) else 0
    new_max = patch.get("maxSubmissionsPerUser", current.get("maxSubmissionsPerUser"))

    conn.execute(
        "UPDATE forms SET title=?, description=?, code=?, updated_at=?, opens_at=?, closes_at=?, allow_multiple_submissions_per_user=?, max_submissions_per_user=? WHERE id=?",
        (new_title, new_desc, new_code, now_iso(), new_opens, new_closes, new_allow_multi, new_max, form_id),
    )

    cons = patch.get("constraints")
    if cons:
        # Clear existing specific tables before re-inserting
        conn.execute("DELETE FROM form_allowed_formats WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM form_allowed_extensions WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM image_constraints WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM video_constraints WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM video_allowed_codecs WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM video_allowed_aspect_ratios WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM audio_constraints WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM audio_allowed_codecs WHERE form_id=?", (form_id,))
        conn.execute("DELETE FROM audio_allowed_channels WHERE form_id=?", (form_id,))
        category = infer_category(cons)
        conn.execute("UPDATE forms SET file_category=? WHERE id=?", (category, form_id))
        store_constraints(conn, form_id, category, cons)

    return get_form_by_id(conn, form_id)


def delete_form(conn: sqlite3.Connection, form_id: str) -> None:
    conn.execute("DELETE FROM forms WHERE id=?", (form_id,))


# ===== Submissions =====

def create_submission(conn: sqlite3.Connection, form_id: str, submitted_by: Optional[str], filename: str, size_bytes: int, mime_type: str, status: str) -> Dict[str, Any]:
    sub_id = _uid("sub")
    conn.execute(
        "INSERT INTO submissions(id, form_id, submitted_by, filename, mime_type, size_bytes, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (sub_id, form_id, submitted_by, filename, mime_type, size_bytes, status, now_iso()),
    )
    cur = conn.execute("SELECT * FROM submissions WHERE id=?", (sub_id,))
    row = row_to_dict(cur.fetchone())
    return {
        "id": row["id"],
        "formId": row["form_id"],
        "submittedBy": row.get("submitted_by"),
        "status": row["status"],
        "filename": row["filename"],
        "sizeBytes": row["size_bytes"],
        "mimeType": row.get("mime_type") or "",
        "createdAt": row["created_at"],
    }


def list_form_submissions(conn: sqlite3.Connection, form_id: str) -> List[Dict[str, Any]]:
    cur = conn.execute("SELECT * FROM submissions WHERE form_id=? ORDER BY created_at DESC", (form_id,))
    items = []
    for row in cur.fetchall():
        r = row_to_dict(row)
        items.append({
            "id": r["id"],
            "formId": r["form_id"],
            "submittedBy": r.get("submitted_by"),
            "status": r["status"],
            "filename": r["filename"],
            "sizeBytes": r["size_bytes"],
            "mimeType": r.get("mime_type") or "",
            "createdAt": r["created_at"],
        })
    return items


def list_my_submissions(conn: sqlite3.Connection, user_id: str) -> List[Dict[str, Any]]:
    cur = conn.execute("SELECT * FROM submissions WHERE submitted_by=? ORDER BY created_at DESC", (user_id,))
    items = []
    for row in cur.fetchall():
        r = row_to_dict(row)
        items.append({
            "id": r["id"],
            "formId": r["form_id"],
            "submittedBy": r.get("submitted_by"),
            "status": r["status"],
            "filename": r["filename"],
            "sizeBytes": r["size_bytes"],
            "mimeType": r.get("mime_type") or "",
            "createdAt": r["created_at"],
        })
    return items


def delete_submission(conn: sqlite3.Connection, submission_id: str) -> None:
    conn.execute("DELETE FROM submissions WHERE id=?", (submission_id,))


def get_submission(conn: sqlite3.Connection, submission_id: str) -> Optional[Dict[str, Any]]:
    cur = conn.execute("SELECT * FROM submissions WHERE id=?", (submission_id,))
    r = row_to_dict(cur.fetchone())
    if not r:
        return None
    return {
        "id": r["id"],
        "formId": r["form_id"],
        "submittedBy": r.get("submitted_by"),
        "status": r["status"],
        "filename": r["filename"],
        "sizeBytes": r["size_bytes"],
        "mimeType": r.get("mime_type") or "",
        "createdAt": r["created_at"],
    }


def is_form_owner(conn: sqlite3.Connection, form_id: str, user_id: str) -> bool:
    cur = conn.execute("SELECT 1 FROM forms WHERE id=? AND created_by=?", (form_id, user_id))
    return cur.fetchone() is not None


def get_form_id_by_submission(conn: sqlite3.Connection, submission_id: str) -> Optional[str]:
    cur = conn.execute("SELECT form_id FROM submissions WHERE id=?", (submission_id,))
    r = cur.fetchone()
    return r[0] if r else None
