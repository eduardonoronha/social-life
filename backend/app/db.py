from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        yield session


def _ensure_columns(sync_conn, table_columns: dict[str, list[tuple[str, str]]]) -> None:
    inspector = inspect(sync_conn)
    for table_name, columns in table_columns.items():
        if table_name not in inspector.get_table_names():
            continue
        existing = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name, ddl in columns:
            if column_name not in existing:
                sync_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


async def init_db():
    # Import models so SQLAlchemy knows all tables.
    from app.models.user import User
    from app.models.life import JournalEntry
    from app.models.social import Connection, Moment
    from app.models.usage import UsageSession
    from app.models.permissions import AIPermission

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        await conn.run_sync(lambda sync_conn: _ensure_columns(sync_conn, {
            "users": [
                ("timezone", "timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo'"),
                ("bio", "bio TEXT"),
                ("city", "city VARCHAR(120)"),
                ("interests", "interests TEXT"),
                ("profile_visible", "profile_visible BOOLEAN NOT NULL DEFAULT FALSE"),
            ],
            "connections": [
                ("blocked_by_id", "blocked_by_id VARCHAR(36)"),
                ("requester_category", "requester_category VARCHAR(30)"),
                ("addressee_category", "addressee_category VARCHAR(30)"),
            ],
            "moments": [
                ("audience", "audience VARCHAR(30) NOT NULL DEFAULT 'person'"),
                ("shared_with_ids", "shared_with_ids TEXT"),
                ("group_id", "group_id VARCHAR(36)"),
            ],
            "usage_sessions": [
                ("hard_stop_at", "hard_stop_at TIMESTAMPTZ"),
            ],
        }))

        # One active session per user, enforced by PostgreSQL when available.
        if "sqlite" not in str(engine.url).lower():
            await conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "uq_usage_one_active_per_user "
                "ON usage_sessions (user_id) "
                "WHERE ended_at IS NULL"
            ))
