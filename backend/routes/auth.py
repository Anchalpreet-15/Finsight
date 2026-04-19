import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

router = APIRouter()
security = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("JWT_SECRET", "finsight-dev-secret-please-change-in-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _create_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM,
    )

def _verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/auth/register")
def register(req: RegisterRequest):
    from db.database import get_conn
    if not req.name.strip() or not req.email.strip() or not req.password:
        raise HTTPException(status_code=400, detail="All fields are required")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (req.name.strip(), req.email.lower().strip(), pw_hash),
            )
            user_id = cur.lastrowid
            conn.commit()
    except Exception:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    token = _create_token(user_id, req.email)
    return {"token": token, "user": {"id": user_id, "name": req.name.strip(), "email": req.email.lower().strip()}}


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
def get_me(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _verify_token(creds.credentials)
    from db.database import get_conn
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?", (payload["sub"],)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": dict(row)}
