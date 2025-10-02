import math
import random
from datetime import datetime, timedelta
from typing import Optional

from ...domain.models import LogisticsMetrics


class MetricsSimulator:
    """Generates realistic looking logistics metrics using stochastic drift."""

    def __init__(self, seed: Optional[int] = None) -> None:
        self._random = random.Random(seed)
        self._tick = 0

    def initial_state(self) -> LogisticsMetrics:
        return LogisticsMetrics(
            on_time_delivery_rate=94.2,
            avg_delivery_time=31.5,
            perfect_order_rate=92.0,
            orders_per_hour=118.0,
            order_accuracy=97.1,
            stockout_rate=2.8,
            pick_pack_cycle_time=24.0,
            truck_utilization=76.0,
            avg_dwell_time=46.0,
            cost_per_order=8.7,
            operating_ratio=86.0,
            hours_driven=910.0,
            incident_rate=2.1,
            timestamp=datetime.utcnow(),
        )

    def generate_next(self, previous: LogisticsMetrics) -> LogisticsMetrics:
        self._tick += 1

        def bounded(value: float, *, minimum: float, maximum: float) -> float:
            return max(min(value, maximum), minimum)

        def jitter(amount: float) -> float:
            return self._random.uniform(-amount, amount)

        wave = math.sin(self._tick / 6)

        on_time = bounded(
            previous.on_time_delivery_rate + jitter(1.2) + wave * 0.6,
            minimum=85.0,
            maximum=99.0,
        )
        avg_time = bounded(
            previous.avg_delivery_time + jitter(1.5) - wave * 0.8,
            minimum=24.0,
            maximum=48.0,
        )
        perfect_order = bounded(
            previous.perfect_order_rate + jitter(1.0),
            minimum=85.0,
            maximum=98.0,
        )
        orders_hour = bounded(
            previous.orders_per_hour + jitter(12.0) + wave * 5,
            minimum=70.0,
            maximum=180.0,
        )
        accuracy = bounded(
            previous.order_accuracy + jitter(0.8),
            minimum=92.0,
            maximum=99.5,
        )
        stockout = bounded(
            previous.stockout_rate + jitter(0.4) - wave * 0.2,
            minimum=0.5,
            maximum=8.0,
        )
        pick_pack = bounded(
            previous.pick_pack_cycle_time + jitter(2.0) - wave * 0.5,
            minimum=15.0,
            maximum=40.0,
        )
        utilization = bounded(
            previous.truck_utilization + jitter(2.5) + wave * 1.2,
            minimum=55.0,
            maximum=95.0,
        )
        dwell = bounded(
            previous.avg_dwell_time + jitter(3.0) + wave,
            minimum=30.0,
            maximum=80.0,
        )
        cost = bounded(
            previous.cost_per_order + jitter(0.6) - wave * 0.3,
            minimum=6.5,
            maximum=12.0,
        )
        operating_ratio = bounded(
            previous.operating_ratio + jitter(1.5) - wave,
            minimum=78.0,
            maximum=95.0,
        )
        hours_driven = bounded(
            previous.hours_driven + jitter(25.0) + wave * 8,
            minimum=700.0,
            maximum=1100.0,
        )
        incident_rate = bounded(
            previous.incident_rate + jitter(0.4) + wave * 0.1,
            minimum=0.5,
            maximum=5.0,
        )

        timestamp = previous.timestamp + timedelta(minutes=5)

        return LogisticsMetrics(
            on_time_delivery_rate=round(on_time, 1),
            avg_delivery_time=round(avg_time, 1),
            perfect_order_rate=round(perfect_order, 1),
            orders_per_hour=round(orders_hour, 1),
            order_accuracy=round(accuracy, 1),
            stockout_rate=round(stockout, 2),
            pick_pack_cycle_time=round(pick_pack, 1),
            truck_utilization=round(utilization, 1),
            avg_dwell_time=round(dwell, 1),
            cost_per_order=round(cost, 2),
            operating_ratio=round(operating_ratio, 1),
            hours_driven=round(hours_driven, 1),
            incident_rate=round(incident_rate, 2),
            timestamp=timestamp,
        )
