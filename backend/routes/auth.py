import logging
import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()

_security = HTTPBearer(auto_error=False)
_bearer_optional = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

# Prefer JWT_SECRET; dev fallback is random-per-process so forged tokens
# minted against the old shared literal cannot be reused across restarts.
_SECRET_KEY = os.getenv("JWT_SECRET")
if not _SECRET_KEY or _SECRET_KEY == "change_me_before_production":
    import secrets
    _SECRET_KEY = secrets.token_urlsafe(48)
    logger.warning(
        "JWT_SECRET is not set — using an ephemeral random secret for THIS "
        "process only. All issued tokens become invalid on restart. "
        "Set JWT_SECRET in your environment for production."
    )


# ── Schemas ───────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class RegisterRequest(BaseModel):
    name:     str = Field(..., min_length=1, max_length=100)
    email:    str = Field(..., min_length=3, max_length=200)
    password: str = Field(..., min_length=6, max_length=200)


class LoginRequest(BaseModel):
    email:    str
    password: str


# ── Token helpers ─────────────────────────────────────────────────────────────

def _create_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire},
        _SECRET_KEY, algorithm=ALGORITHM,
    )


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> dict:
    """FastAPI dependency: enforce a valid bearer token; return the payload."""
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode_token(creds.credentials)


def optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_optional),
) -> Optional[int]:
    """Return the current user_id if a valid token is present, else None."""
    if not creds:
        return None
    try:
        payload = _decode_token(creds.credentials)
        return int(payload["sub"])
    except HTTPException:
        return None
    except (ValueError, KeyError):
        return None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/auth/register")
def register(req: RegisterRequest):
    from db.database import get_conn

    email = req.email.lower().strip()
    name  = req.name.strip()

    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email")

    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, pw_hash),
            )
            user_id = cur.lastrowid
            conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    except sqlite3.Error:
        logger.exception("Database error during registration")
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")

    token = _create_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "name": name, "email": email}}


@router.post("/auth/login")
def login(req: LoginRequest):
    from db.database import get_conn
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (req.email.lower().strip(),)
        ).fetchone()

    if not row or not bcrypt.checkpw(req.password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_token(row["id"], row["email"])
    return {"token": token, "user": {"id": row["id"], "name": row["name"], "email": row["email"]}}


@router.get("/auth/me")
def get_me(payload: dict = Depends(require_user)):
    from db.database import get_conn
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (payload["sub"],),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": dict(row)}
