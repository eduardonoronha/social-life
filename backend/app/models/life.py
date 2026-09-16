import uuid
from datetime import date, datetime, timezone
import json

from sqlalchemy import String, Text, DateTime, Date, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    entry_type: Mapped[str] = mapped_column(String(40), default="note")
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text, default="")
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    intensity: Mapped[str | None] = mapped_column(String(40), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    structured_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    @property
    def structured_payload(self) -> dict:
        if not self.structured_data:
            return {}
        try:
            payload = json.loads(self.structured_data)
        except (TypeError, ValueError):
            return {}
        return payload if isinstance(payload, dict) else {}

    @structured_payload.setter
    def structured_payload(self, value: dict) -> None:
        self.structured_data = json.dumps(value, ensure_ascii=False, sort_keys=True)
