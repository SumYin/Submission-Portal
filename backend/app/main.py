from __future__ import annotations

from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from .settings import settings
from .db import get_db, init_db
from .auth import router as auth_router, require_user_id
from . import crud
import sqlite3
from .schemas import (
    User, Profile, CreateFormIn, UpdateFormIn, Form as FormOut, Paginated, Submission as SubmissionOut, UploadJsonIn, UploadResult
)
from .validation import basic_validate
from datetime import datetime

app = FastAPI(title=settings.app_name)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Routers
app.include_router(auth_router)


@app.on_event("startup")
async def _startup() -> None:
    init_db()


# ===== Me / Users =====
@app.get("/me", response_model=Optional[User])
async def get_me(user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    u = crud.get_user_by_id(db, user_id)
    if not u:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"id": u["id"], "username": u["username"], "email": u.get("email")}


@app.get("/me/profile", response_model=Profile)
async def get_my_profile(user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    return crud.get_profile(db, user_id)


@app.patch("/me/profile", response_model=Profile)
async def patch_my_profile(patch: Profile, user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    return crud.upsert_profile(db, user_id, patch.dict(exclude_unset=True))


@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, db: sqlite3.Connection = Depends(get_db)):
    u = crud.get_user_by_id(db, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Not found")
    return {"id": u["id"], "username": u["username"], "email": u.get("email")}


@app.get("/users/{user_id}/profile", response_model=Profile)
async def get_user_profile(user_id: str, db: sqlite3.Connection = Depends(get_db)):
    return crud.get_profile(db, user_id)


# ===== Forms =====
@app.post("/forms", response_model=FormOut)
async def create_form(body: CreateFormIn, user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    form = crud.create_form(db, user_id, body.dict(exclude_unset=True))
    return form


@app.get("/forms/mine", response_model=List[FormOut])
async def list_my_forms(user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    return crud.list_forms_by_user(db, user_id)


@app.get("/forms/{form_id}", response_model=FormOut)
async def get_form(form_id: str, db: sqlite3.Connection = Depends(get_db)):
    form = crud.get_form_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Not found")
    return form


@app.get("/forms/code/{code}", response_model=FormOut)
async def get_form_by_code(code: str, db: sqlite3.Connection = Depends(get_db)):
    form = crud.get_form_by_code(db, code)
    if not form:
        raise HTTPException(status_code=404, detail="Not found")
    return form


@app.patch("/forms/{form_id}", response_model=FormOut)
async def patch_form(form_id: str, body: UpdateFormIn, user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    # verify owner
    form = crud.get_form_by_id(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Not found")
    if form["createdBy"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    updated = crud.update_form(db, form_id, body.dict(exclude_unset=True))
    return updated


@app.delete("/forms/{form_id}")
async def delete_form(form_id: str, user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    form = crud.get_form_by_id(db, form_id)
    if not form:
        return Response(status_code=204)
    if form["createdBy"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    crud.delete_form(db, form_id)
    return Response(status_code=204)


@app.get("/forms/{form_id}/submissions")
async def get_form_submissions(form_id: str, user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    # owner can list; otherwise deny
    if not crud.is_form_owner(db, form_id, user_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    items = crud.list_form_submissions(db, form_id)
    return {"items": items, "total": len(items), "page": 1, "pageSize": len(items) or 1}


# ===== Submit flow =====
@app.get("/submit/{code}/validate")
async def validate_form_code(code: str, db: sqlite3.Connection = Depends(get_db)):
    form = crud.get_form_by_code(db, code)
    if not form:
        return {"ok": False, "form": None, "reason": "Code not found"}
    # Check open/close windows
    now = datetime.utcnow()
    try:
        if form.get("opensAt"):
            opens = datetime.fromisoformat(form["opensAt"].replace("Z","+00:00")).replace(tzinfo=None)
            if now < opens:
                return {"ok": False, "form": form, "reason": "Submissions not open yet"}
        if form.get("closesAt"):
            closes = datetime.fromisoformat(form["closesAt"].replace("Z","+00:00")).replace(tzinfo=None)
            if now > closes:
                return {"ok": False, "form": form, "reason": "Submissions closed"}
    except Exception:
        pass
    return {"ok": True, "form": form}


@app.post("/submit/{code}", response_model=UploadResult)
async def submit_to_code(
    code: str,
    request: Request,
    file: UploadFile | None = File(default=None),
    user_id: str = Depends(require_user_id),
    db: sqlite3.Connection = Depends(get_db),
):
    form = crud.get_form_by_code(db, code)
    if not form:
        raise HTTPException(status_code=404, detail="Invalid code")

    # If multipart upload
    if file is not None:
        contents = await file.read()
        size = len(contents)
        if size > settings.max_upload_bytes:
            return UploadResult(ok=False, errors=["File exceeds max upload size"])
        ok, errors = basic_validate(db, form_id=form["id"], filename=file.filename, size_bytes=size, mime_type=file.content_type or "")
        status_val = "accepted" if ok else "rejected"
        sub = crud.create_submission(db, form_id=form["id"], submitted_by=user_id, filename=file.filename, size_bytes=size, mime_type=file.content_type or "", status=status_val)
        # Save file if accepted or even for auditing; here we save regardless
        import os
        dir_path = os.path.join(settings.storage_dir, form["id"], sub["id"])
        os.makedirs(dir_path, exist_ok=True)
        target = os.path.join(dir_path, file.filename)
        with open(target, "wb") as f:
            f.write(contents)
        if ok:
            return UploadResult(ok=True, submission=sub)
        else:
            return UploadResult(ok=False, errors=errors)

    # JSON metadata upload
    ctype = request.headers.get("content-type", "")
    if "application/json" in ctype:
        data = await request.json()
        try:
            payload = UploadJsonIn(**data)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")
        # Basic validation
        ok, errors = basic_validate(db, form_id=form["id"], filename=payload.filename, size_bytes=payload.sizeBytes, mime_type=payload.mimeType or "")
        status_val = "accepted" if ok else "rejected"
        sub = crud.create_submission(db, form_id=form["id"], submitted_by=user_id, filename=payload.filename, size_bytes=payload.sizeBytes, mime_type=payload.mimeType or "", status=status_val)
        if ok:
            return UploadResult(ok=True, submission=sub)
        else:
            return UploadResult(ok=False, errors=errors)

    raise HTTPException(status_code=400, detail="Unsupported content-type; send JSON or multipart/form-data")


# ===== My submissions & deletion =====
@app.get("/me/submissions", response_model=List[SubmissionOut])
async def list_my_submissions(user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    return crud.list_my_submissions(db, user_id)


@app.delete("/submissions/{submission_id}")
async def delete_submission(submission_id: str, user_id: str = Depends(require_user_id), db: sqlite3.Connection = Depends(get_db)):
    sub = crud.get_submission(db, submission_id)
    if not sub:
        return Response(status_code=204)
    # allow submitter or form owner
    if sub.get("submittedBy") == user_id:
        crud.delete_submission(db, submission_id)
        return Response(status_code=204)
    form_id = crud.get_form_id_by_submission(db, submission_id)
    if form_id and crud.is_form_owner(db, form_id, user_id):
        crud.delete_submission(db, submission_id)
        return Response(status_code=204)
    raise HTTPException(status_code=403, detail="Forbidden")
