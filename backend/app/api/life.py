from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import current_user
from app.models.life import JournalEntry
from app.models.user import User
from app.schemas import JournalCreate, JournalResponse
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
        content=data.content,
        entry_type=data.entry_type,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/entries", response_model=list[JournalResponse])
async def list_entries(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_usage(user, db)

    result = await db.scalars(
        select(JournalEntry)
        .where(JournalEntry.owner_id == user.id)
        .order_by(JournalEntry.created_at.desc())
        .limit(100)
    )
    return list(result.all())
