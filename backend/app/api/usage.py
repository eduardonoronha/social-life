from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import current_user
from app.models.user import User
from app.schemas import UsageStartResponse, UsageStatus
from app.services import usage

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/status", response_model=UsageStatus)
async def get_status(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await usage.status(db, user)


@router.post("/start", response_model=UsageStartResponse)
async def start_session(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await usage.start(db, user)

    if not session:
        raise HTTPException(
            status_code=403,
            detail="Limite diário ou semanal atingido.",
        )

    current = await usage.status(db, user)

    return {
        "session_id": session.id,
        "remaining_daily_seconds": current["daily_remaining_seconds"],
        "remaining_weekly_seconds": current["weekly_remaining_seconds"],
    }


@router.post("/heartbeat", response_model=UsageStatus)
async def heartbeat(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    # The server derives elapsed time from timestamps.
    # The client never supplies a duration.
    return await usage.status(db, user)


@router.post("/stop", response_model=UsageStatus)
async def stop_session(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await usage.stop(db, user)
    return await usage.status(db, user)
