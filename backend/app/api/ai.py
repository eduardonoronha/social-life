from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.deps import current_user
from app.models.permissions import AIPermission
from app.models.user import User
from app.schemas import AIPermissionUpdate

router = APIRouter(prefix="/ai", tags=["ai"])

ALLOWED_SOURCES = {"journal", "goals", "activities", "moments"}

@router.get("/permissions")
async def permissions(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(AIPermission).where(AIPermission.user_id == user.id))
    existing = {p.source: p.enabled for p in result.all()}
    return {source: existing.get(source, False) for source in sorted(ALLOWED_SOURCES)}

@router.put("/permissions/{source}")
async def update_permission(
    source: str,
    data: AIPermissionUpdate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if source not in ALLOWED_SOURCES:
        return {"error": "Fonte de dados não suportada"}

    permission = await db.scalar(
        select(AIPermission).where(
            AIPermission.user_id == user.id,
            AIPermission.source == source,
        )
    )
    if not permission:
        permission = AIPermission(user_id=user.id, source=source, enabled=data.enabled)
        db.add(permission)
    else:
        permission.enabled = data.enabled

    await db.commit()
    return {"source": source, "enabled": data.enabled}
