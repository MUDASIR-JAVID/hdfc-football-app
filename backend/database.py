"""SQLAlchemy engine and session configuration for Azure SQL."""

from __future__ import annotations

import os
from collections.abc import Generator
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()


def build_database_url() -> str:
    """Return a SQLAlchemy URL from DATABASE_URL or a raw Azure ADO string."""
    configured = os.getenv("DATABASE_URL") or os.getenv("AZURE_SQL_CONNECTION_STRING")
    if not configured:
        raise RuntimeError("Set DATABASE_URL or AZURE_SQL_CONNECTION_STRING before starting the API")
    if configured.startswith(("mssql+pyodbc://", "mssql://")):
        return configured
    if "driver=" not in configured.lower():
        configured = "Driver={ODBC Driver 18 for SQL Server};" + configured
    return f"mssql+pyodbc:///?odbc_connect={quote_plus(configured)}"


class Base(DeclarativeBase):
    pass


engine = create_engine(
    build_database_url(),
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
    pool_recycle=1800,
    connect_args={"timeout": 30},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
