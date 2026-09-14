from sqlalchemy import text
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


async def init_db():
    # Import models so SQLAlchemy knows all tables.
    from app.models.user import User
    from app.models.life import JournalEntry
    from app.models.social import Connection, Moment
    from app.models.usage import UsageSession
    from app.models.permissions import AIPermission

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Compatibility migration from the first MVP.
        await conn.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) "
            "NOT NULL DEFAULT 'America/Sao_Paulo'"
        ))

        await conn.execute(text(
            "ALTER TABLE usage_sessions "
            "ADD COLUMN IF NOT EXISTS hard_stop_at TIMESTAMPTZ"
        ))

        # One active session per user, enforced by PostgreSQL.
        await conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS "
            "uq_usage_one_active_per_user "
            "ON usage_sessions (user_id) "
            "WHERE ended_at IS NULL"
        ))
