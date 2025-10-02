from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import asyncio
import random

app = FastAPI(title="Logistics Dashboard MVP")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory metrics
metrics = {
    "on_time_delivery_rate": 95,
    "avg_delivery_time": 32,
    "perfect_order_rate": 90,
    "orders_per_hour": 120,
    "truck_utilization": 75,
}

# Simple Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.get("/api/metrics")
async def get_metrics():
    return metrics

@app.websocket("/ws/metrics")
async def metrics_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Randomly update metrics
            metrics["on_time_delivery_rate"] = random.randint(85, 98)
            metrics["orders_per_hour"] = random.randint(80, 150)
            metrics["truck_utilization"] = random.randint(60, 90)
            await manager.broadcast(metrics)
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
