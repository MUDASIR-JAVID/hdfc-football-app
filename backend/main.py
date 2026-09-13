from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Attendance, Player
from .schemas import AttendanceCreate, AttendanceResponse, LoginRequest, PlayerCreate, PlayerResponse, TokenResponse
from .security import create_access_token, get_current_user, hash_password, require_admin, verify_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("CREATE_TABLES_ON_STARTUP", "false").lower() == "true":
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="SDFC Football API", version="1.0.0", lifespan=lifespan)
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_hash = os.getenv("ADMIN_PASSCODE_HASH")
    if payload.username == admin_username and admin_hash and verify_password(payload.passcode, admin_hash):
        return TokenResponse(access_token=create_access_token(admin_username, "admin"), role="admin")
    player = db.scalar(select(Player).where(Player.player_id == payload.username, Player.active.is_(True)))
    if not player or not verify_password(payload.passcode, player.passcode_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(player.player_id, "player", player.player_id), role="player", player_id=player.player_id)


@app.get("/api/players", response_model=list[PlayerResponse])
def list_players(_: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Player]:
    return list(db.scalars(select(Player).where(Player.active.is_(True)).order_by(Player.name)))


@app.post("/api/players", response_model=PlayerResponse, status_code=201)
def create_player(payload: PlayerCreate, _: dict = Depends(require_admin), db: Session = Depends(get_db)) -> Player:
    player = Player(**payload.model_dump(exclude={"passcode"}), passcode_hash=hash_password(payload.passcode))
    db.add(player)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Player ID already exists") from None
    db.refresh(player)
    return player


@app.delete("/api/players/{player_id}", status_code=204)
def delete_player(player_id: str, _: dict = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    player = db.scalar(select(Player).where(Player.player_id == player_id))
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    player.active = False
    db.commit()


@app.post("/api/attendance", response_model=AttendanceResponse)
def record_attendance(payload: AttendanceCreate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> Attendance:
    if user["role"] != "admin" and user.get("player_id") != payload.player_id:
        raise HTTPException(status_code=403, detail="Players may only update their own attendance")
    player = db.scalar(select(Player).where(Player.player_id == payload.player_id, Player.active.is_(True)))
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    attendance = db.scalar(select(Attendance).where(Attendance.player_id == player.id, Attendance.date == payload.date))
    if attendance:
        attendance.status = payload.status
    else:
        attendance = Attendance(player_id=player.id, date=payload.date, status=payload.status)
        db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return AttendanceResponse(date=attendance.date, status=attendance.status, player_id=player.player_id)


@app.get("/api/attendance", response_model=list[AttendanceResponse])
def list_attendance(
    player_id: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AttendanceResponse]:
    requested = player_id or (user.get("player_id") if user["role"] == "player" else None)
    if user["role"] == "player" and requested != user.get("player_id"):
        raise HTTPException(status_code=403, detail="Players may only view their own attendance")
    query = select(Attendance, Player.player_id).join(Player).order_by(Attendance.date.desc())
    if requested:
        query = query.where(Player.player_id == requested)
    return [AttendanceResponse(date=row.date, status=row.status, player_id=player_id) for row, player_id in db.execute(query)]
