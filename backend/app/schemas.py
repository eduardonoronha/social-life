from datetime import date as date_type, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

MomentAudience = Literal["person", "people", "group", "connections"]
JournalEntryType = Literal[
    "note",
    "activity",
    "exercise",
    "study",
    "reading",
    "work",
    "project",
    "meeting",
    "travel",
    "important_event",
    "habit",
    "goal_achieved",
    "goal_missed",
    "learning",
]


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class JournalCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = Field(default=None, max_length=10000)
    entry_type: JournalEntryType = "note"
    date: date_type | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    intensity: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=200)


class JournalUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = Field(default=None, max_length=10000)
    entry_type: JournalEntryType | None = None
    date: date_type | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    intensity: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=200)


class JournalResponse(BaseModel):
    id: str
    entry_type: str
    title: str | None = None
    content: str
    date: date_type | None = None
    duration_minutes: int | None = None
    intensity: str | None = None
    location: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JournalRetrospective(BaseModel):
    days: int
    total_entries: int
    by_type: dict[str, int]
    entries: list[JournalResponse]

    model_config = {"from_attributes": True}


class ConnectionCreate(BaseModel):
    addressee_id: str


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    bio: str | None = Field(default=None, max_length=1000)
    city: str | None = Field(default=None, max_length=120)
    interests: list[str] = Field(default_factory=list, max_length=20)
    profile_visible: bool = False


class ConnectionCategoryUpdate(BaseModel):
    category: str | None = Field(default=None, max_length=30)


class MessageCreate(BaseModel):
    recipient_id: str
    content: str = Field(min_length=1, max_length=10000)
    reply_to_id: str | None = None
    attachment_ids: list[str] = Field(default_factory=list, max_length=10)


class MessageReaction(BaseModel):
    reaction: str | None = Field(default=None, max_length=16)


class MomentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    audience: MomentAudience = "person"
    shared_with_id: str | None = None
    shared_with_ids: list[str] = Field(default_factory=list, max_length=50)
    group_id: str | None = Field(default=None, max_length=36)


class MomentResponse(BaseModel):
    id: str
    owner_id: str
    content: str
    audience: MomentAudience
    shared_with_id: str | None = None
    shared_with_ids: list[str] = Field(default_factory=list)
    group_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UsageStartResponse(BaseModel):
    session_id: str
    remaining_daily_seconds: int
    remaining_weekly_seconds: int


class UsageStatus(BaseModel):
    daily_used_seconds: int
    weekly_used_seconds: int
    daily_limit_seconds: int
    weekly_limit_seconds: int
    daily_remaining_seconds: int
    weekly_remaining_seconds: int
    active_session_id: str | None = None


class LimitsUpdate(BaseModel):
    daily_limit_minutes: int = Field(ge=1, le=60)
    weekly_limit_minutes: int = Field(ge=1, le=360)


class AIPermissionUpdate(BaseModel):
    enabled: bool
