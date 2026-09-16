from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import current_user
from app.models.personal import Goal, Habit, HabitCheckin
from app.models.user import User
from app.schemas import GoalCreate, GoalResponse, GoalUpdate, HabitCheckinCreate, HabitCreate, HabitResponse, HabitUpdate
from app.services.usage import require_active

router = APIRouter(prefix="/personal", tags=["personal"])


async def require_usage(user: User, db: AsyncSession) -> None:
    try:
        await require_active(db, user)
    except PermissionError as exc:
        detail = "Limite de utilização atingido." if str(exc) == "usage_limit_reached" else "Sessão de utilização não está ativa. Inicie uma sessão."
        raise HTTPException(403, detail) from exc


def goal_payload(goal: Goal) -> dict:
    return {key: getattr(goal, key) for key in ("id", "title", "description", "reason", "due_date", "metric", "progress", "status", "notes", "created_at", "updated_at")}


def habit_payload(habit: Habit, checkins: list[HabitCheckin]) -> dict:
    return {"id": habit.id, "title": habit.title, "description": habit.description, "target_per_week": habit.target_per_week, "active": habit.active, "created_at": habit.created_at, "checkins": [{"id": item.id, "checked_on": item.checked_on, "note": item.note} for item in checkins]}


@router.get("/goals", response_model=list[GoalResponse])
async def list_goals(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    goals = await db.scalars(select(Goal).where(Goal.owner_id == user.id).order_by(Goal.created_at.desc()))
    return [goal_payload(goal) for goal in goals]


@router.post("/goals", response_model=GoalResponse, status_code=201)
async def create_goal(data: GoalCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    goal = Goal(owner_id=user.id, **data.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal_payload(goal)


@router.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, data: GoalUpdate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    goal = await db.scalar(select(Goal).where(Goal.id == goal_id, Goal.owner_id == user.id))
    if not goal:
        raise HTTPException(404, "Objetivo não encontrado.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    await db.commit()
    await db.refresh(goal)
    return goal_payload(goal)


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    goal = await db.scalar(select(Goal).where(Goal.id == goal_id, Goal.owner_id == user.id))
    if not goal:
        raise HTTPException(404, "Objetivo não encontrado.")
    await db.delete(goal)
    await db.commit()


@router.get("/habits", response_model=list[HabitResponse])
async def list_habits(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    habits = list((await db.scalars(select(Habit).where(Habit.owner_id == user.id).order_by(Habit.created_at.desc()))).all())
    since = date.today() - timedelta(days=6)
    result = []
    for habit in habits:
        checkins = list((await db.scalars(select(HabitCheckin).where(HabitCheckin.habit_id == habit.id, HabitCheckin.owner_id == user.id, HabitCheckin.checked_on >= since).order_by(HabitCheckin.checked_on.desc()))).all())
        result.append(habit_payload(habit, checkins))
    return result


@router.post("/habits", response_model=HabitResponse, status_code=201)
async def create_habit(data: HabitCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    habit = Habit(owner_id=user.id, **data.model_dump())
    db.add(habit)
    await db.commit()
    await db.refresh(habit)
    return habit_payload(habit, [])


@router.put("/habits/{habit_id}", response_model=HabitResponse)
async def update_habit(habit_id: str, data: HabitUpdate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    habit = await db.scalar(select(Habit).where(Habit.id == habit_id, Habit.owner_id == user.id))
    if not habit:
        raise HTTPException(404, "Hábito não encontrado.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(habit, key, value)
    await db.commit()
    await db.refresh(habit)
    return habit_payload(habit, [])


@router.post("/habits/{habit_id}/checkins", response_model=HabitResponse)
async def checkin_habit(habit_id: str, data: HabitCheckinCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await require_usage(user, db)
    habit = await db.scalar(select(Habit).where(Habit.id == habit_id, Habit.owner_id == user.id))
    if not habit:
        raise HTTPException(404, "Hábito não encontrado.")
    existing = await db.scalar(select(HabitCheckin).where(and_(HabitCheckin.habit_id == habit.id, HabitCheckin.owner_id == user.id, HabitCheckin.checked_on == data.checked_on)))
    if not existing:
        db.add(HabitCheckin(habit_id=habit.id, owner_id=user.id, **data.model_dump()))
        await db.commit()
    checkins = list((await db.scalars(select(HabitCheckin).where(HabitCheckin.habit_id == habit.id, HabitCheckin.owner_id == user.id, HabitCheckin.checked_on >= date.today() - timedelta(days=6)).order_by(HabitCheckin.checked_on.desc()))).all())
    return habit_payload(habit, checkins)