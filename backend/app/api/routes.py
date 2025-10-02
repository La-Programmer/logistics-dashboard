from fastapi import APIRouter

from ..application.dto.metrics import LogisticsMetricsDTO
from ..application.services.metrics_service import MetricsService


def create_metrics_router(service: MetricsService) -> APIRouter:
    router = APIRouter(prefix="/api", tags=["metrics"])

    @router.get("/metrics", response_model=LogisticsMetricsDTO)
    async def get_metrics() -> LogisticsMetricsDTO:
        metrics = await service.get_current_metrics()
        return LogisticsMetricsDTO.from_domain(metrics)

    return router
