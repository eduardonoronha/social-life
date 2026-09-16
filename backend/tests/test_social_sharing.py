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


def test_private_messages_support_replies_and_reactions(client_override):
    first_response = client_override.post(
        "/social/messages",
        json={"recipient_id": "user-b", "content": "Como foi seu dia?"},
    )

    assert first_response.status_code == 201, first_response.text
    first_message = first_response.json()
    assert first_message["sender_id"] == "user-a"
    assert first_message["recipient_id"] == "user-b"

    reply_response = client_override.post(
        "/social/messages",
        json={
            "recipient_id": "user-b",
            "content": "Foi bom, obrigado por perguntar.",
            "reply_to_id": first_message["id"],
        },
    )
    assert reply_response.status_code == 201, reply_response.text
    assert reply_response.json()["reply_to_id"] == first_message["id"]

    reaction_response = client_override.post(
        f"/social/messages/{first_message['id']}/reaction",
        json={"reaction": "heart"},
    )
    assert reaction_response.status_code == 200, reaction_response.text
    assert reaction_response.json()["reactions"] == {"user-a": "heart"}

    conversation_response = client_override.get("/social/messages/user-b")
    assert conversation_response.status_code == 200, conversation_response.text
    assert len(conversation_response.json()) == 2


def test_received_message_inbox_lists_messages_for_recipient(client_override, db_session):
    response = client_override.post(
        "/social/messages",
        json={"recipient_id": "user-b", "content": "Mensagem recebida."},
    )
    assert response.status_code == 201, response.text
    assert response.json()["recipient_id"] == "user-b"

    async def override_current_user_b():
        return await db_session.get(User, "user-b")

    app.dependency_overrides[current_user] = override_current_user_b
    inbox_response = client_override.get("/social/messages/inbox")

    assert inbox_response.status_code == 200, inbox_response.text
    payload = inbox_response.json()
    assert len(payload) == 1
    assert payload[0]["content"] == "Mensagem recebida."
    assert payload[0]["sender_id"] == "user-a"


def test_create_structured_journal_entry(client_override):
    response = client_override.post(
        "/life/entries",
        json={
            "entry_type": "exercise",
            "title": "Corrida matinal",
            "content": "Caminhei 5km em ritmo moderado.",
            "date": "2026-09-15",
            "duration_minutes": 45,
            "intensity": "moderate",
            "location": "Parque Central",
            "structured_data": {
                "subtype": "corrida",
                "tags": ["saúde", "ar livre"],
                "mood": "animado",
            },
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["entry_type"] == "exercise"
    assert payload["title"] == "Corrida matinal"
    assert payload["duration_minutes"] == 45
    assert payload["location"] == "Parque Central"
    assert payload["content"] == "Caminhei 5km em ritmo moderado."
    assert payload["structured_data"]["type"] == "exercise"
    assert payload["structured_data"]["subtype"] == "corrida"
    assert payload["structured_data"]["intensity"] == "moderate"
    assert payload["structured_data"]["tags"][:2] == ["saúde", "ar livre"]
    assert "corrida" in payload["structured_data"]["tags"]
    assert payload["structured_data"]["mood"] == "animado"


def test_free_text_automatically_generates_searchable_tags(client_override):
    response = client_override.post(
        "/life/entries",
        json={
            "entry_type": "note",
            "title": "Manhã produtiva",
            "content": "Hoje fiz uma corrida no parque com um amigo e depois estudei espanhol.",
        },
    )

    assert response.status_code == 200, response.text
    tags = response.json()["structured_data"]["tags"]
    assert "corrida" in tags
    assert "amizade" in tags
    assert "estudo" in tags
    assert "espanhol" in tags


def test_journal_supports_filtering_editing_and_retrospective(client_override):
    first = client_override.post(
        "/life/entries",
        json={
            "entry_type": "exercise",
            "title": "Treino de força",
            "content": "Levantamento de peso por 40 minutos.",
            "date": "2026-09-15",
            "duration_minutes": 40,
        },
    )
    assert first.status_code == 200, first.text

    second = client_override.post(
        "/life/entries",
        json={
            "entry_type": "reading",
            "title": "Leitura focada",
            "content": "Leitura de um capítulo do livro de estratégia.",
            "date": "2026-09-16",
            "duration_minutes": 30,
        },
    )
    assert second.status_code == 200, second.text

    filtered = client_override.get("/life/entries?entry_type=exercise")
    assert filtered.status_code == 200, filtered.text
    assert len(filtered.json()) == 1
    assert filtered.json()[0]["entry_type"] == "exercise"

    entry_id = filtered.json()[0]["id"]
    update = client_override.put(
        f"/life/entries/{entry_id}",
        json={
            "title": "Treino de força revisado",
            "intensity": "high",
            "location": "Academia",
        },
    )
    assert update.status_code == 200, update.text
    assert update.json()["title"] == "Treino de força revisado"
    assert update.json()["intensity"] == "high"
    assert update.json()["location"] == "Academia"

    retrospective = client_override.get("/life/retrospective?days=30")
    assert retrospective.status_code == 200, retrospective.text
    payload = retrospective.json()
    assert payload["total_entries"] >= 2
    assert payload["by_type"]["exercise"] >= 1
    assert payload["entries"][0]["entry_type"] in {"reading", "exercise"}


def test_goals_and_habits_are_private_and_track_progress(client_override):
    goal_response = client_override.post(
        "/personal/goals",
        json={
            "title": "Aprender espanhol",
            "description": "Estudar com regularidade.",
            "progress": 20,
        },
    )
    assert goal_response.status_code == 201, goal_response.text
    goal = goal_response.json()
    assert goal["progress"] == 20

    update_response = client_override.put(
        f"/personal/goals/{goal['id']}",
        json={"progress": 50, "status": "active"},
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["progress"] == 50

    habit_response = client_override.post(
        "/personal/habits",
        json={"title": "Ler", "target_per_week": 4},
    )
    assert habit_response.status_code == 201, habit_response.text
    habit = habit_response.json()
    checkin_response = client_override.post(
        f"/personal/habits/{habit['id']}/checkins",
        json={},
    )
    assert checkin_response.status_code == 200, checkin_response.text
    assert len(checkin_response.json()["checkins"]) == 1

    listing = client_override.get("/personal/habits")
    assert listing.status_code == 200, listing.text
    assert listing.json()[0]["title"] == "Ler"
