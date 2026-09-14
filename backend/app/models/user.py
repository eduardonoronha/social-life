import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    interests: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_visible: Mapped[bool] = mapped_column(default=False)
    daily_limit_minutes: Mapped[int] = mapped_column(default=60)
    weekly_limit_minutes: Mapped[int] = mapped_column(default=360)
    timezone: Mapped[str] = mapped_column(String(64), default="America/Sao_Paulo")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
