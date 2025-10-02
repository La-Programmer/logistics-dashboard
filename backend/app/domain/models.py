from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class LogisticsMetrics:
    """Domain entity that captures the primary logistics KPIs."""

    on_time_delivery_rate: float
    avg_delivery_time: float
    perfect_order_rate: float
    orders_per_hour: float
    order_accuracy: float
    stockout_rate: float
    pick_pack_cycle_time: float
    truck_utilization: float
    avg_dwell_time: float
    cost_per_order: float
    operating_ratio: float
    hours_driven: float
    incident_rate: float
    timestamp: datetime
