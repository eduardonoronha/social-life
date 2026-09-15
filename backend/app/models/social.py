import json
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Connection(Base):
    __tablename__ = "connections"
    __table_args__ = (UniqueConstraint("requester_id", "addressee_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requester_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    addressee_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    blocked_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    requester_category: Mapped[str | None] = mapped_column(String(30), nullable=True)
    addressee_category: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    recipient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    reply_to_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("messages.id"), nullable=True)
    attachment_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    reactions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    @property
    def reaction_map(self) -> dict[str, str]:
        if not self.reactions:
            return {}
        try:
            payload = json.loads(self.reactions)
        except (TypeError, ValueError):
            return {}
        return payload if isinstance(payload, dict) else {}

    @reaction_map.setter
    def reaction_map(self, values: dict[str, str]) -> None:
        self.reactions = json.dumps(values, ensure_ascii=False)

    @property
    def attachment_id_list(self) -> list[str]:
        if not self.attachment_ids:
            return []
        try:
            payload = json.loads(self.attachment_ids)
        except (TypeError, ValueError):
            return []
        return [str(item) for item in payload] if isinstance(payload, list) else []

    @attachment_id_list.setter
    def attachment_id_list(self, values: list[str]) -> None:
        self.attachment_ids = json.dumps(list(dict.fromkeys(values)), ensure_ascii=False)


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    object_key: Mapped[str] = mapped_column(String(500), unique=True)
    original_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(150))
    size_bytes: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

class Moment(Base):
    __tablename__ = "moments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    audience: Mapped[str] = mapped_column(String(30), default="person", index=True)
    shared_with_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    shared_with_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    group_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    @property
    def recipient_ids(self) -> list[str]:
        if not self.shared_with_ids:
            return []
        try:
            payload = json.loads(self.shared_with_ids)
        except (TypeError, ValueError):
            return []
        if isinstance(payload, str):
            return [payload]
        if isinstance(payload, list):
            return [str(item) for item in payload]
        return []

    @recipient_ids.setter
    def recipient_ids(self, values: list[str]) -> None:
        self.shared_with_ids = json.dumps(list(dict.fromkeys(values)), ensure_ascii=False)
