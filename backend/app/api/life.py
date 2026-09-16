from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import current_user
from app.models.life import JournalEntry
from app.models.user import User
from app.schemas import JournalCreate, JournalResponse, JournalRetrospective, JournalUpdate
from app.services.usage import require_active

router = APIRouter(prefix="/life", tags=["life"])


async def require_usage(user: User, db: AsyncSession):
    try:
        return await require_active(db, user)
    except PermissionError as exc:
        if str(exc) == "usage_limit_reached":
            raise HTTPException(403, "Limite de utilização atingido.")
        raise HTTPException(
            403,
            "Sessão de utilização não está ativa. Inicie uma sessão.",
        )


@router.post("/entries", response_model=JournalResponse)
async def create_entry(
    data: JournalCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_usage(user, db)

    entry = JournalEntry(
        owner_id=user.id,
        entry_type=data.entry_type,
        title=data.title,
        content=data.content or "",
        date=data.date,
        duration_minutes=data.duration_minutes,
        intensity=data.intensity,
        location=data.location,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/entries", response_model=list[JournalResponse])
async def list_entries(
    entry_type: str | None = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_usage(user, db)

    query = select(JournalEntry).where(JournalEntry.owner_id == user.id)
    if entry_type:
        query = query.where(JournalEntry.entry_type == entry_type)

    result = await db.scalars(
        query.order_by(JournalEntry.created_at.desc()).limit(100)
    )
    return list(result.all())


@router.put("/entries/{entry_id}", response_model=JournalResponse)
async def update_entry(
    entry_id: str,
    data: JournalUpdate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_usage(user, db)

    entry = await db.scalar(
        select(JournalEntry).where(
            JournalEntry.id == entry_id,
            JournalEntry.owner_id == user.id,
        )
    )
    if not entry:
        raise HTTPException(404, "Registro não encontrado.")

    if data.title is not None:
        entry.title = data.title.strip() or None
    if data.content is not None:
        entry.content = data.content.strip() or ""
    if data.entry_type is not None:
        entry.entry_type = data.entry_type
    if data.date is not None:
        entry.date = data.date
    if data.duration_minutes is not None:
        entry.duration_minutes = data.duration_minutes
    if data.intensity is not None:
        entry.intensity = data.intensity.strip() or None
    if data.location is not None:
        entry.location = data.location.strip() or None

    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/retrospective", response_model=JournalRetrospective)
async def retrospective(
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_usage(user, db)

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.scalars(
        select(JournalEntry)
        .where(JournalEntry.owner_id == user.id)
        .where(JournalEntry.created_at >= since)
        .order_by(JournalEntry.created_at.desc())
    )
    entries = list(result.all())
    by_type: dict[str, int] = {}
    for entry in entries:
        by_type[entry.entry_type] = by_type.get(entry.entry_type, 0) + 1

    return {
        "days": days,
        "total_entries": len(entries),
        "by_type": by_type,
        "entries": entries,
    }
