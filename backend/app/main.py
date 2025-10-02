from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import create_metrics_router
from .application.dto.metrics import LogisticsMetricsDTO
from .application.services.metrics_service import MetricsService
from .infrastructure.simulation.metrics_simulator import MetricsSimulator
from .infrastructure.websocket.manager import ConnectionManager, MetricsBroadcaster

app = FastAPI(title="Cross-Team Logistics Dashboard MVP")

# CORS to allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = MetricsSimulator()
metrics_service = MetricsService(simulator)
connection_manager = ConnectionManager()


async def _generate_update_payload() -> dict:
    metrics = await metrics_service.generate_next_metrics()
    return LogisticsMetricsDTO.from_domain(metrics).model_dump(mode="json")


broadcaster = MetricsBroadcaster(
    connection_manager,
    update_coro=_generate_update_payload,
    interval=3.0,
)

app.include_router(create_metrics_router(metrics_service))


@app.websocket("/ws/metrics")
async def metrics_ws(websocket: WebSocket) -> None:
    await connection_manager.connect(websocket)
    try:
        current = await metrics_service.get_current_metrics()
        await connection_manager.send_personal_message(
            LogisticsMetricsDTO.from_domain(current).model_dump(mode="json"),
            websocket,
        )

        await broadcaster.start()

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
    finally:
        if connection_manager.connection_count == 0:
            await broadcaster.stop()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await broadcaster.stop()
