from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage import UsageSession
from app.models.user import User


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def day_start(user: User, moment: datetime) -> datetime:
    local = moment.astimezone(ZoneInfo(user.timezone))
    return local.replace(hour=0, minute=0, second=0, microsecond=0)


def week_start(user: User, moment: datetime) -> datetime:
    local = moment.astimezone(ZoneInfo(user.timezone))
    monday = local - timedelta(days=local.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def period_end(start: datetime, days: int) -> datetime:
    return start + timedelta(days=days)


def normalize_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def get_active(db: AsyncSession, user_id: str) -> UsageSession | None:
    return await db.scalar(
        select(UsageSession)
        .where(
            UsageSession.user_id == user_id,
            UsageSession.ended_at.is_(None),
        )
        .order_by(UsageSession.started_at.desc())
    )


async def completed_seconds(
    db: AsyncSession,
    user: User,
    moment: datetime,
) -> tuple[int, int]:
    ds = day_start(user, moment).astimezone(timezone.utc)
    ws = week_start(user, moment).astimezone(timezone.utc)

    daily = await db.scalar(
        select(func.coalesce(func.sum(UsageSession.duration_seconds), 0))
        .where(
            UsageSession.user_id == user.id,
            UsageSession.started_at >= ds,
            UsageSession.started_at < moment,
            UsageSession.ended_at.is_not(None),
        )
    )
    weekly = await db.scalar(
        select(func.coalesce(func.sum(UsageSession.duration_seconds), 0))
        .where(
            UsageSession.user_id == user.id,
            UsageSession.started_at >= ws,
            UsageSession.started_at < moment,
            UsageSession.ended_at.is_not(None),
        )
    )
    return int(daily or 0), int(weekly or 0)


async def finalize(
    db: AsyncSession,
    session: UsageSession,
    end: datetime,
) -> None:
    if session.ended_at is not None:
        return

    if session.hard_stop_at is not None:
        end = min(normalize_utc(end), normalize_utc(session.hard_stop_at))

    started_at = normalize_utc(session.started_at)
    end = max(normalize_utc(end), started_at)
    session.ended_at = end
    session.duration_seconds = max(
        0, int((end - started_at).total_seconds())
    )
    await db.commit()


async def reconcile(
    db: AsyncSession,
    user: User,
    session: UsageSession,
    moment: datetime,
) -> bool:
    """
    Returns True when the session was forcibly closed.

    A session can never run beyond:
      1. its daily allowance,
      2. its weekly allowance,
      3. the local midnight,
      4. the local Monday boundary.
    """
    if session.hard_stop_at is None:
        daily, weekly = await completed_seconds(db, user, moment)
        daily_remaining = max(0, user.daily_limit_minutes * 60 - daily)
        weekly_remaining = max(0, user.weekly_limit_minutes * 60 - weekly)

        day_end = period_end(day_start(user, moment), 1).astimezone(timezone.utc)
        week_end = period_end(week_start(user, moment), 7).astimezone(timezone.utc)

        session.hard_stop_at = min(
            session.started_at + timedelta(
                seconds=min(daily_remaining, weekly_remaining)
            ),
            day_end,
            week_end,
        )
        await db.commit()

    if normalize_utc(moment) >= normalize_utc(session.hard_stop_at):
        await finalize(db, session, normalize_utc(session.hard_stop_at))
        return True

    return False


async def start(db: AsyncSession, user: User) -> UsageSession | None:
    moment = now_utc()

    current = await get_active(db, user.id)
    if current:
        if not await reconcile(db, user, current, moment):
            return current

    daily, weekly = await completed_seconds(db, user, moment)

    daily_remaining = max(0, user.daily_limit_minutes * 60 - daily)
    weekly_remaining = max(0, user.weekly_limit_minutes * 60 - weekly)
    allowance = min(daily_remaining, weekly_remaining)

    if allowance <= 0:
        return None

    day_end = period_end(day_start(user, moment), 1).astimezone(timezone.utc)
    week_end = period_end(week_start(user, moment), 7).astimezone(timezone.utc)

    session = UsageSession(
        user_id=user.id,
        started_at=moment,
        hard_stop_at=min(
            moment + timedelta(seconds=allowance),
            day_end,
            week_end,
        ),
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def stop(db: AsyncSession, user: User) -> None:
    session = await get_active(db, user.id)
    if not session:
        return

    moment = now_utc()
    if not await reconcile(db, user, session, moment):
        await finalize(db, session, moment)


async def status(db: AsyncSession, user: User) -> dict:
    moment = now_utc()

    active = await get_active(db, user.id)
    if active and await reconcile(db, user, active, moment):
        active = None

    daily, weekly = await completed_seconds(db, user, moment)

    if active:
        effective_end = min(moment, active.hard_stop_at)
        elapsed = max(
            0,
            int((effective_end - active.started_at).total_seconds())
        )
        daily += elapsed
        weekly += elapsed

    daily_limit = user.daily_limit_minutes * 60
    weekly_limit = user.weekly_limit_minutes * 60

    return {
        "daily_used_seconds": min(daily, daily_limit),
        "weekly_used_seconds": min(weekly, weekly_limit),
        "daily_limit_seconds": daily_limit,
        "weekly_limit_seconds": weekly_limit,
        "daily_remaining_seconds": max(0, daily_limit - daily),
        "weekly_remaining_seconds": max(0, weekly_limit - weekly),
        "active_session_id": active.id if active else None,
        "active_hard_stop_at": active.hard_stop_at if active else None,
    }


async def require_active(
    db: AsyncSession,
    user: User,
) -> UsageSession:
    """
    Mandatory backend gate.

    Every feature that consumes platform time must call this.
    The client cannot bypass the limit by calling the API directly.
    """
    session = await get_active(db, user.id)

    if not session:
        raise PermissionError("usage_session_required")

    if await reconcile(db, user, session, now_utc()):
        raise PermissionError("usage_limit_reached")

    return session
