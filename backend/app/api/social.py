from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import current_user
from app.models.social import Connection, Moment
from app.models.user import User
from app.schemas import ConnectionCategoryUpdate, ConnectionCreate, MomentCreate, MomentResponse
from app.services.usage import require_active

router = APIRouter(prefix="/social", tags=["social"])

CATEGORIES = {"family", "friend", "close_friend", "colleague", "acquaintance", "other"}
VALID_AUDIENCES = {"person", "people", "group", "connections"}


async def require_active_session(db: AsyncSession, user: User) -> None:
    try:
        await require_active(db, user)
    except PermissionError as exc:
        if str(exc) == "usage_limit_reached":
            raise HTTPException(403, "Limite de utilização atingido.")
        raise HTTPException(403, "Sessão de utilização não está ativa. Inicie uma sessão.")


def person(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "bio": user.bio,
        "city": user.city,
        "interests": user.interests.split("\n") if user.interests else [],
    }


def connection_view(connection: Connection, user: User, other: User) -> dict:
    category = connection.requester_category if connection.requester_id == user.id else connection.addressee_category
    return {
        "id": connection.id,
        "status": connection.status,
        "created_at": connection.created_at,
        "person": person(other),
        "category": category,
    }


async def find_connection(connection_id: str, user: User, db: AsyncSession) -> Connection:
    connection = await db.scalar(select(Connection).where(
        Connection.id == connection_id,
        or_(Connection.requester_id == user.id, Connection.addressee_id == user.id),
    ))
    if not connection:
        raise HTTPException(404, "Relação não encontrada")
    return connection


async def accepted_connection_ids_for(user: User, db: AsyncSession, target_ids: list[str] | None = None) -> list[str]:
    query = select(Connection).where(
        Connection.status == "accepted",
        or_(
            Connection.requester_id == user.id,
            Connection.addressee_id == user.id,
        ),
    )
    connections = (await db.scalars(query)).all()
    ids = []
    for connection in connections:
        other_id = connection.addressee_id if connection.requester_id == user.id else connection.requester_id
        ids.append(other_id)
    if target_ids is None:
        return ids
    invalid = [target_id for target_id in target_ids if target_id not in set(ids)]
    return invalid


async def validate_moment_targets(data: MomentCreate, user: User, db: AsyncSession) -> tuple[str, str | None, list[str], str | None]:
    if data.audience not in VALID_AUDIENCES:
        raise HTTPException(422, "Público inválido")

    if data.audience == "group":
        if not data.group_id:
            raise HTTPException(400, "Grupo deve ser informado quando o público for 'group'.")
        return data.audience, data.group_id, [], data.group_id

    recipients = []
    if data.shared_with_id:
        recipients = [data.shared_with_id]
    elif data.shared_with_ids:
        recipients = list(dict.fromkeys(data.shared_with_ids))

    if data.audience == "person":
        if len(recipients) != 1:
            raise HTTPException(400, "Público 'person' exige exatamente um destinatário.")
        if recipients[0] == user.id:
            raise HTTPException(400, "Não é possível compartilhar consigo mesmo.")
        connection = await db.scalar(select(Connection).where(
            Connection.status == "accepted",
            or_(
                and_(Connection.requester_id == user.id, Connection.addressee_id == recipients[0]),
                and_(Connection.requester_id == recipients[0], Connection.addressee_id == user.id),
            ),
        ))
        if not connection:
            raise HTTPException(403, "Momento só pode ser compartilhado com uma conexão aceita")
        return data.audience, None, recipients, None

    if data.audience == "people":
        if not recipients:
            raise HTTPException(400, "Público 'people' exige pelo menos um destinatário.")
        invalid = []
        for recipient_id in recipients:
            if recipient_id == user.id:
                invalid.append(recipient_id)
                continue
            connection = await db.scalar(select(Connection).where(
                Connection.status == "accepted",
                or_(
                    and_(Connection.requester_id == user.id, Connection.addressee_id == recipient_id),
                    and_(Connection.requester_id == recipient_id, Connection.addressee_id == user.id),
                ),
            ))
            if not connection:
                invalid.append(recipient_id)
        if invalid:
            raise HTTPException(403, "Alguns destinatários não são conexões aceitas")
        return data.audience, None, recipients, None

    if data.audience == "connections":
        accepted_ids = await accepted_connection_ids_for(user, db)
        if recipients:
            invalid = [recipient_id for recipient_id in recipients if recipient_id not in set(accepted_ids)]
            if invalid:
                raise HTTPException(403, "Alguns destinatários não são conexões aceitas")
            return data.audience, None, recipients, None
        return data.audience, None, accepted_ids, None

    raise HTTPException(422, "Público inválido")


@router.get("/people")
async def search_people(
    query: str = Query(min_length=1, max_length=120),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_active_session(db, user)
    users = await db.scalars(select(User).where(
        User.id != user.id,
        User.profile_visible.is_(True),
        User.name.ilike(f"%{query.strip()}%"),
    ).order_by(User.name).limit(20))
    return [person(candidate) for candidate in users]


@router.post("/connections", status_code=201)
async def request_connection(data: ConnectionCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    if data.addressee_id == user.id:
        raise HTTPException(400, "Não é possível conectar consigo mesmo")
    target = await db.scalar(select(User).where(User.id == data.addressee_id))
    if not target or not target.profile_visible:
        raise HTTPException(404, "Pessoa não encontrada")
    existing = await db.scalar(select(Connection).where(or_(
        and_(Connection.requester_id == user.id, Connection.addressee_id == target.id),
        and_(Connection.requester_id == target.id, Connection.addressee_id == user.id),
    )))
    if existing:
        if existing.status == "blocked":
            raise HTTPException(403, "Não é possível solicitar conexão a esta pessoa")
        raise HTTPException(409, "Já existe uma relação ou solicitação")
    connection = Connection(requester_id=user.id, addressee_id=target.id, status="pending")
    db.add(connection)
    await db.commit()
    await db.refresh(connection)
    return {"id": connection.id, "status": connection.status}


@router.get("/connections")
async def list_connections(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    connections = await db.scalars(select(Connection).where(
        or_(Connection.requester_id == user.id, Connection.addressee_id == user.id),
        Connection.status == "accepted",
    ).order_by(Connection.created_at.desc()))
    result = []
    for connection in connections:
        other_id = connection.addressee_id if connection.requester_id == user.id else connection.requester_id
        other = await db.get(User, other_id)
        if other:
            result.append(connection_view(connection, user, other))
    return result


@router.get("/connections/requests")
async def list_connection_requests(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    connections = await db.scalars(select(Connection).where(
        Connection.addressee_id == user.id, Connection.status == "pending",
    ).order_by(Connection.created_at.desc()))
    result = []
    for connection in connections:
        requester = await db.get(User, connection.requester_id)
        if requester:
            result.append(connection_view(connection, user, requester))
    return result


@router.post("/connections/{connection_id}/accept")
async def accept_connection(connection_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    connection = await db.scalar(select(Connection).where(
        Connection.id == connection_id, Connection.addressee_id == user.id, Connection.status == "pending",
    ))
    if not connection:
        raise HTTPException(404, "Solicitação não encontrada")
    connection.status = "accepted"
    await db.commit()
    return {"status": "accepted"}


@router.post("/connections/{connection_id}/decline")
async def decline_connection(connection_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    connection = await db.scalar(select(Connection).where(
        Connection.id == connection_id, Connection.addressee_id == user.id, Connection.status == "pending",
    ))
    if not connection:
        raise HTTPException(404, "Solicitação não encontrada")
    await db.delete(connection)
    await db.commit()
    return {"status": "declined"}


@router.delete("/connections/{connection_id}")
async def remove_connection(connection_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    connection = await find_connection(connection_id, user, db)
    if connection.status == "blocked" and connection.blocked_by_id != user.id:
        raise HTTPException(403, "Não é possível alterar esta relação")
    await db.delete(connection)
    await db.commit()
    return {"status": "removed"}


@router.post("/connections/{connection_id}/block")
async def block_connection(connection_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    connection = await find_connection(connection_id, user, db)
    connection.status = "blocked"
    connection.blocked_by_id = user.id
    await db.commit()
    return {"status": "blocked"}


@router.put("/connections/{connection_id}/category")
async def set_connection_category(connection_id: str, data: ConnectionCategoryUpdate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    connection = await find_connection(connection_id, user, db)
    if connection.status != "accepted":
        raise HTTPException(409, "Categorias exigem uma conexão aceita")
    if data.category is not None and data.category not in CATEGORIES:
        raise HTTPException(422, "Categoria inválida")
    if connection.requester_id == user.id:
        connection.requester_category = data.category
    else:
        connection.addressee_category = data.category
    await db.commit()
    return {"category": data.category}


@router.get("/moments")
async def list_moments(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    moments = await db.scalars(select(Moment).where(Moment.owner_id == user.id).order_by(Moment.created_at.desc()))
    result = []
    for moment in moments:
        result.append({
            "id": moment.id,
            "owner_id": moment.owner_id,
            "content": moment.content,
            "audience": moment.audience,
            "shared_with_id": moment.shared_with_id,
            "shared_with_ids": moment.recipient_ids,
            "group_id": moment.group_id,
            "created_at": moment.created_at,
        })
    return result


@router.get("/moments/inbox")
async def list_incoming_moments(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)

    moments = await db.scalars(select(Moment).where(
        Moment.owner_id != user.id,
        or_(
            Moment.shared_with_id == user.id,
            Moment.shared_with_ids.like(f'%"{user.id}"%'),
        ),
    ).order_by(Moment.created_at.desc()))

    result = []
    for moment in moments:
        owner = await db.get(User, moment.owner_id)
        result.append({
            "id": moment.id,
            "owner_id": moment.owner_id,
            "owner_name": owner.name if owner else None,
            "content": moment.content,
            "audience": moment.audience,
            "shared_with_id": moment.shared_with_id,
            "shared_with_ids": moment.recipient_ids,
            "group_id": moment.group_id,
            "created_at": moment.created_at,
        })
    return result


@router.post("/moments")
async def create_moment(data: MomentCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_active_session(db, user)
    audience, group_id, recipient_ids, _ = await validate_moment_targets(data, user, db)
    moment = Moment(
        owner_id=user.id,
        content=data.content,
        audience=audience,
        shared_with_id=recipient_ids[0] if audience == "person" and recipient_ids else None,
        group_id=group_id,
    )
    moment.recipient_ids = recipient_ids if audience in {"people", "connections"} else []
    db.add(moment)
    await db.commit()
    await db.refresh(moment)
    return {
        "id": moment.id,
        "owner_id": moment.owner_id,
        "content": moment.content,
        "audience": moment.audience,
        "shared_with_id": moment.shared_with_id,
        "shared_with_ids": moment.recipient_ids,
        "group_id": moment.group_id,
        "created_at": moment.created_at,
    }
