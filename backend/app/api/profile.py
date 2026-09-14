from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.deps import current_user
from app.models.user import User
from app.schemas import LimitsUpdate, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("")
async def get_profile(user: User = Depends(current_user)):
    return {
        "id": user.id,
        "name": user.name,
        "bio": user.bio,
        "city": user.city,
        "interests": user.interests.split("\n") if user.interests else [],
        "profile_visible": user.profile_visible,
    }

@router.put("")
async def update_profile(data: ProfileUpdate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    user.name = data.name.strip()
    user.bio = data.bio.strip() if data.bio else None
    user.city = data.city.strip() if data.city else None
    user.interests = "\n".join(item.strip() for item in data.interests if item.strip()) or None
    user.profile_visible = data.profile_visible
    await db.commit()
    return await get_profile(user)

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
