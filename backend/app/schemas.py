from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

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
    content: str = Field(min_length=1, max_length=10000)
    entry_type: str = Field(default="note", max_length=40)

class JournalResponse(BaseModel):
    id: str
    entry_type: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}

class ConnectionCreate(BaseModel):
    addressee_id: str

class MomentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    shared_with_id: str | None = None

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
