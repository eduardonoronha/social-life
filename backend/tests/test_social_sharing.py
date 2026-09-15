import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base, get_db
from app.main import app
from app.models.social import Connection
from app.models.usage import UsageSession
from app.models.user import User
from app.deps import current_user


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    async with sessionmaker() as session:
        user_a = User(
            id="user-a",
            email="a@example.com",
            name="User A",
            password_hash="hash",
            profile_visible=True,
        )
        user_b = User(
            id="user-b",
            email="b@example.com",
            name="User B",
            password_hash="hash",
            profile_visible=True,
        )
        user_c = User(
            id="user-c",
            email="c@example.com",
            name="User C",
            password_hash="hash",
            profile_visible=True,
        )
        session.add_all([user_a, user_b, user_c])
        await session.commit()

        session.add_all(
            [
                Connection(requester_id=user_a.id, addressee_id=user_b.id, status="accepted"),
                Connection(requester_id=user_a.id, addressee_id=user_c.id, status="accepted"),
            ]
        )
        now = datetime.now(timezone.utc)
        session.add(
            UsageSession(
                user_id=user_a.id,
                started_at=now,
                hard_stop_at=now + timedelta(hours=1),
            )
        )
        session.add(
            UsageSession(
                user_id=user_b.id,
                started_at=now,
                hard_stop_at=now + timedelta(hours=1),
            )
        )
        await session.commit()

        yield session


@pytest.fixture
def client_override(db_session):
    async def override_get_db():
        yield db_session

    async def override_current_user():
        return await db_session.get(User, "user-a")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[current_user] = override_current_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_create_moment_with_explicit_people_audience(client_override):
    response = client_override.post(
        "/social/moments",
        json={
            "content": "Compartilhando um momento com duas pessoas.",
            "audience": "people",
            "shared_with_ids": ["user-b", "user-c"],
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["audience"] == "people"
    assert payload["shared_with_ids"] == ["user-b", "user-c"]


def test_list_shared_moments_inbox_for_recipient(client_override, db_session):
    client_override.post(
        "/social/moments",
        json={
            "content": "Mensagem privada para o usuário B.",
            "audience": "person",
            "shared_with_id": "user-b",
        },
    )

    async def override_current_user_b():
        return await db_session.get(User, "user-b")

    app.dependency_overrides[current_user] = override_current_user_b

    response = client_override.get("/social/moments/inbox")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["content"] == "Mensagem privada para o usuário B."
    assert payload[0]["owner_id"] == "user-a"
