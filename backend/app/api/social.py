from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.deps import current_user
from app.models.user import User
from app.models.social import Connection, Moment
from app.schemas import ConnectionCreate, MomentCreate
from app.services.usage import enforce

router = APIRouter(prefix="/social", tags=["social"])

@router.post("/connections")
async def request_connection(data: ConnectionCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if await enforce(db, user):
        raise HTTPException(403, "Limite de utilização atingido")
    if data.addressee_id == user.id:
        raise HTTPException(400, "Não é possível conectar consigo mesmo")
    target = await db.scalar(select(User).where(User.id == data.addressee_id))
    if not target:
        raise HTTPException(404, "Pessoa não encontrada")

    existing = await db.scalar(
        select(Connection).where(
            or_(
                and_(Connection.requester_id == user.id, Connection.addressee_id == target.id),
                and_(Connection.requester_id == target.id, Connection.addressee_id == user.id),
            )
        )
    )
    if existing:
        raise HTTPException(409, "Já existe uma relação ou solicitação")

    db.add(Connection(requester_id=user.id, addressee_id=target.id))
    await db.commit()
    return {"status": "pending"}

@router.post("/connections/{connection_id}/accept")
async def accept_connection(connection_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if await enforce(db, user):
        raise HTTPException(403, "Limite de utilização atingido")
    connection = await db.scalar(
        select(Connection).where(Connection.id == connection_id, Connection.addressee_id == user.id)
    )
    if not connection:
        raise HTTPException(404, "Solicitação não encontrada")
    connection.status = "accepted"
    await db.commit()
    return {"status": "accepted"}

@router.get("/connections")
async def list_connections(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if await enforce(db, user):
        raise HTTPException(403, "Limite de utilização atingido")
    result = await db.scalars(
        select(Connection).where(
            or_(Connection.requester_id == user.id, Connection.addressee_id == user.id),
            Connection.status == "accepted",
        )
    )
    return list(result.all())

@router.post("/moments")
async def create_moment(data: MomentCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if await enforce(db, user):
        raise HTTPException(403, "Limite de utilização atingido")

    if data.shared_with_id:
        connection = await db.scalar(
            select(Connection).where(
                Connection.status == "accepted",
                or_(
                    and_(Connection.requester_id == user.id, Connection.addressee_id == data.shared_with_id),
                    and_(Connection.requester_id == data.shared_with_id, Connection.addressee_id == user.id),
                )
            )
        )
        if not connection:
            raise HTTPException(403, "Momento só pode ser compartilhado com uma conexão aceita")

    moment = Moment(
        owner_id=user.id,
        content=data.content,
        shared_with_id=data.shared_with_id,
    )
    db.add(moment)
    await db.commit()
    await db.refresh(moment)
    return moment
