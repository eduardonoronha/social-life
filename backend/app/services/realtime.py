from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        sockets = self.connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        sockets = list(self.connections.get(user_id, set()))
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(user_id, websocket)


manager = ConnectionManager()
