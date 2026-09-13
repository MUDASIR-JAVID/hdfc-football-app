"""Password hashing and JWT bearer authentication helpers."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .database import get_db
from .models import Player

password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
JWT_ALGORITHM = "HS256"


def _secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret or len(secret) < 32:
        raise RuntimeError("JWT_SECRET_KEY must be set to at least 32 characters")
    return secret


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return password_hash.verify(plain, hashed)
    except (ValueError, TypeError):
        return False


def hash_password(plain: str) -> str:
    return password_hash.hash(plain)


def create_access_token(subject: str, role: str, player_id: str | None = None) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=int(os.getenv("JWT_EXPIRE_MINUTES", "60")))
    claims = {"sub": subject, "role": role, "exp": expires}
    if player_id:
        claims["player_id"] = player_id
    return jwt.encode(claims, _secret(), algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    try:
        payload = jwt.decode(credentials.credentials, _secret(), algorithms=[JWT_ALGORITHM])
        if not payload.get("sub") or payload.get("role") not in {"admin", "player"}:
            raise ValueError
    except (JWTError, ValueError, RuntimeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None
    if payload["role"] == "player":
        player = db.query(Player).filter(Player.player_id == payload.get("player_id"), Player.active.is_(True)).first()
        if not player:
            raise HTTPException(status_code=401, detail="Player is inactive or no longer exists")
    return payload


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user
