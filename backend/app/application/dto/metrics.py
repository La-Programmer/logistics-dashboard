from dataclasses import asdict
from datetime import datetime
from pydantic import BaseModel, Field

from ...domain.models import LogisticsMetrics


class LogisticsMetricsDTO(BaseModel):
    """DTO exposed via HTTP/WebSocket responses."""

    on_time_delivery_rate: float = Field(..., description="Percentage of deliveries arriving on time")
    avg_delivery_time: float = Field(..., description="Average delivery lead time in hours")
    perfect_order_rate: float = Field(..., description="Share of orders that are perfect (no issues)")
    orders_per_hour: float = Field(..., description="Orders fulfilled per hour")
    order_accuracy: float = Field(..., description="Percentage of orders fulfilled accurately")
    stockout_rate: float = Field(..., description="Percentage of items out of stock")
    pick_pack_cycle_time: float = Field(..., description="Average pick/pack cycle time in minutes")
    truck_utilization: float = Field(..., description="Fleet utilization percentage")
    avg_dwell_time: float = Field(..., description="Average dwell time at docks in minutes")
    cost_per_order: float = Field(..., description="Cost to fulfill each order in USD")
    operating_ratio: float = Field(..., description="Operating ratio (cost vs. revenue)")
    hours_driven: float = Field(..., description="Total fleet driving hours (rolling 24h)")
    incident_rate: float = Field(..., description="Incidents per 10k orders")
    timestamp: datetime = Field(..., description="Timestamp for the metrics snapshot")

    class Config:
        from_attributes = True

    @classmethod
    def from_domain(cls, metrics: LogisticsMetrics) -> "LogisticsMetricsDTO":
        return cls(**asdict(metrics))
