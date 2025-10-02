import asyncio
from typing import AsyncGenerator

from ...domain.models import LogisticsMetrics
from ...infrastructure.simulation.metrics_simulator import MetricsSimulator


class MetricsService:
    """Application service orchestrating the simulator and providing snapshots."""

    def __init__(self, simulator: MetricsSimulator, *, update_interval_seconds: float = 3.0) -> None:
        self._simulator = simulator
        self._lock = asyncio.Lock()
        self._current_metrics = simulator.initial_state()
        self._interval = update_interval_seconds

    async def get_current_metrics(self) -> LogisticsMetrics:
        async with self._lock:
            return self._current_metrics

    async def generate_next_metrics(self) -> LogisticsMetrics:
        async with self._lock:
            self._current_metrics = self._simulator.generate_next(self._current_metrics)
            return self._current_metrics

    async def stream_metrics(self) -> AsyncGenerator[LogisticsMetrics, None]:
        while True:
            yield await self.generate_next_metrics()
            await asyncio.sleep(self._interval)
