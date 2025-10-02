import asyncio
import contextlib
from typing import Awaitable, Callable, List, Optional

from fastapi import WebSocket, WebSocketDisconnect

from app.core.helpers.dict_helper import serialize_message


class ConnectionManager:
    """Keeps track of active websocket connections and handles broadcasts."""

    def __init__(self) -> None:
        self._connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    @property
    def connection_count(self) -> int:
        return len(self._connections)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self._connections:
                self._connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket) -> None:
        await websocket.send_json(serialize_message(message))

    async def broadcast(self, message: dict) -> None:
        message = serialize_message(message)
        stale: List[WebSocket] = []
        for connection in list(self._connections):
            try:
                await connection.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                stale.append(connection)
        for connection in stale:
            await self.disconnect(connection)


class MetricsBroadcaster:
    """Background task that pushes metric updates to all listeners."""

    def __init__(
        self,
        manager: ConnectionManager,
        update_coro: Callable[[], Awaitable[dict]],
        interval: float,
    ) -> None:
        self._manager = manager
        self._update_coro = update_coro
        self._interval = interval
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        async with self._lock:
            if self._task is None or self._task.done():
                self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        async with self._lock:
            if self._task is not None:
                self._task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await self._task
                self._task = None

    async def _run(self) -> None:
        try:
            while True:
                payload = await self._update_coro()
                await self._manager.broadcast(payload)
                await asyncio.sleep(self._interval)
        except asyncio.CancelledError:
            return
