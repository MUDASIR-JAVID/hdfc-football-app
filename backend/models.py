from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    passcode_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(160))
    position: Mapped[str | None] = mapped_column(String(80), nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    profile_image_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    attendance: Mapped[list["Attendance"]] = relationship(back_populates="player", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("player_id", "date", name="uq_attendance_player_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20))
    player: Mapped[Player] = relationship(back_populates="attendance")
