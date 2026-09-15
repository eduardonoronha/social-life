from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy import select

from app.core.security import decode_token
from app.db import SessionLocal
from app.models.user import User
from app.services.realtime import manager

router = APIRouter(tags=["realtime"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    try:
        user_id = decode_token(token)
    except JWTError:
        await websocket.close(code=4401)
        return

    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        await websocket.close(code=4401)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
    except Exception:
        manager.disconnect(user.id, websocket)
