from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.deps import current_user
from app.models.user import User
from app.schemas import LimitsUpdate

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/limits")
async def get_limits(user: User = Depends(current_user)):
    return {
        "daily_limit_minutes": user.daily_limit_minutes,
        "weekly_limit_minutes": user.weekly_limit_minutes,
        "daily_max_minutes": 60,
        "weekly_max_minutes": 360,
    }

@router.put("/limits")
async def update_limits(data: LimitsUpdate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    user.daily_limit_minutes = data.daily_limit_minutes
    user.weekly_limit_minutes = data.weekly_limit_minutes
    await db.commit()
    return {
        "daily_limit_minutes": user.daily_limit_minutes,
        "weekly_limit_minutes": user.weekly_limit_minutes,
    }
