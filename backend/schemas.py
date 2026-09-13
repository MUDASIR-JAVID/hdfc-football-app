from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=160)
    passcode: str = Field(min_length=1, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    role: Literal["admin", "player"]
    player_id: str | None = None


class PlayerCreate(BaseModel):
    player_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    passcode: str = Field(min_length=8, max_length=256)
    name: str = Field(min_length=1, max_length=160)
    position: str | None = Field(default=None, max_length=80)
    profile_image_url: str | None = Field(default=None, max_length=2048)


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    player_id: str
    name: str
    position: str | None
    profile_image_url: str | None
    active: bool


class AttendanceCreate(BaseModel):
    player_id: str = Field(min_length=1, max_length=64)
    date: date
    status: Literal["present", "absent", "late", "excused"]


class AttendanceResponse(BaseModel):
    date: date
    status: str
    player_id: str
