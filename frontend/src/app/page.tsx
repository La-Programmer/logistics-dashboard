"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Metrics = {
  on_time_delivery_rate: number;
  avg_delivery_time: number;
  perfect_order_rate: number;
  orders_per_hour: number;
  order_accuracy: number;
  stockout_rate: number;
  pick_pack_cycle_time: number;
  truck_utilization: number;
  avg_dwell_time: number;
  cost_per_order: number;
  operating_ratio: number;
  hours_driven: number;
  incident_rate: number;
  timestamp: string;
};

type CardConfig = {
  key: Exclude<keyof Metrics, "truck_utilization" | "timestamp">;
  title: string;
  description: string;
  unit?: string;
  prefix?: string;
  decimals?: number;
  alertWhen?: (value: number) => boolean;
  alertSeverity?: "low" | "high";
};

type ThroughputPoint = {
  time: string;
  orders: number;
  accuracy: number;
};

type CostPoint = {
  time: string;
  cost: number;
  operatingRatio: number;
};

type DwellPoint = {
  time: string;
  dwell: number;
  incidentRate: number;
};

type GaugeStyle = CSSProperties & { "--gauge-angle"?: string; "--gauge-color"?: string };

const HTTP_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const WS_BASE = (process.env.NEXT_PUBLIC_WS_BASE_URL ?? HTTP_BASE.replace(/^http/, "ws")).replace(/\/$/, "");
const METRICS_ENDPOINT = `${HTTP_BASE}/api/metrics`;
const WS_ENDPOINT = `${WS_BASE}/ws/metrics`;

const cardConfigs: CardConfig[] = [
  {
    key: "on_time_delivery_rate",
    title: "On-Time Delivery Rate",
    description: "Goal ≥ 95%",
    unit: "%",
    decimals: 1,
    alertWhen: (value) => value < 92,
    alertSeverity: "low",
  },
  {
    key: "avg_delivery_time",
    title: "Average Lead Time",
    description: "Target ≤ 36 hrs",
    unit: "hrs",
    decimals: 1,
    alertWhen: (value) => value > 40,
    alertSeverity: "high",
  },
  {
    key: "perfect_order_rate",
    title: "Perfect Order Rate",
    description: "Goal ≥ 93%",
    unit: "%",
    decimals: 1,
    alertWhen: (value) => value < 90,
    alertSeverity: "low",
  },
  {
    key: "orders_per_hour",
    title: "Orders per Hour",
    description: "Target ≥ 110",
    decimals: 0,
    alertWhen: (value) => value < 90,
    alertSeverity: "low",
  },
  {
    key: "order_accuracy",
    title: "Order Accuracy",
    description: "Goal ≥ 98%",
    unit: "%",
    decimals: 1,
    alertWhen: (value) => value < 96.5,
    alertSeverity: "low",
  },
  {
    key: "stockout_rate",
    title: "Stockout Rate",
    description: "Keep ≤ 3%",
    unit: "%",
    decimals: 2,
    alertWhen: (value) => value > 5,
    alertSeverity: "low",
  },
  {
    key: "pick_pack_cycle_time",
    title: "Pick & Pack Cycle",
    description: "Target ≤ 28 min",
    unit: "min",
    decimals: 1,
    alertWhen: (value) => value > 32,
    alertSeverity: "high",
  },
  {
    key: "cost_per_order",
    title: "Cost per Order",
    description: "Goal ≤ $9.50",
    prefix: "$",
    decimals: 2,
    alertWhen: (value) => value > 10.5,
    alertSeverity: "high",
  },
  {
    key: "operating_ratio",
    title: "Operating Ratio",
    description: "Goal ≤ 90%",
    unit: "%",
    decimals: 1,
    alertWhen: (value) => value > 92,
    alertSeverity: "high",
  },
  {
    key: "avg_dwell_time",
    title: "Average Dwell Time",
    description: "Target ≤ 55 min",
    unit: "min",
    decimals: 1,
    alertWhen: (value) => value > 65,
    alertSeverity: "high",
  },
  {
    key: "hours_driven",
    title: "Hours Driven (24h)",
    description: "Monitor fatigue risk",
    unit: "hrs",
    decimals: 0,
    alertWhen: (value) => value > 1050,
    alertSeverity: "high",
  },
  {
    key: "incident_rate",
    title: "Incident Rate",
    description: "Goal ≤ 3 per 10k",
    decimals: 2,
    alertWhen: (value) => value > 3,
    alertSeverity: "low",
  },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ordersHistory, setOrdersHistory] = useState<ThroughputPoint[]>([]);
  const [costHistory, setCostHistory] = useState<CostPoint[]>([]);
  const [dwellHistory, setDwellHistory] = useState<DwellPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "open" | "closed">("connecting");

  const ingestMetrics = useCallback((snapshot: Metrics) => {
    setMetrics(snapshot);
    const timeLabel = new Date(snapshot.timestamp).toLocaleTimeString();

    setOrdersHistory((prev) => [
      ...prev.slice(-19),
      {
        time: timeLabel,
        orders: Math.round(snapshot.orders_per_hour),
        accuracy: Number(snapshot.order_accuracy.toFixed(1)),
      },
    ]);

    setCostHistory((prev) => [
      ...prev.slice(-19),
      {
        time: timeLabel,
        cost: Number(snapshot.cost_per_order.toFixed(2)),
        operatingRatio: Number(snapshot.operating_ratio.toFixed(1)),
      },
    ]);

    setDwellHistory((prev) => [
      ...prev.slice(-19),
      {
        time: timeLabel,
        dwell: Number(snapshot.avg_dwell_time.toFixed(1)),
        incidentRate: Number(snapshot.incident_rate.toFixed(2)),
      },
    ]);
  }, []);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        const response = await fetch(METRICS_ENDPOINT);
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }
        const payload = (await response.json()) as Metrics;
        ingestMetrics(payload);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [ingestMetrics]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectHandle: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const connect = () => {
      setConnectionStatus("connecting");
      socket = new WebSocket(WS_ENDPOINT);

      socket.onopen = () => {
        if (!isMounted) {
          return;
        }
        setConnectionStatus("open");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as Metrics;
          ingestMetrics(payload);
        } catch (err) {
          console.error("Unable to parse metrics payload", err);
        }
      };

      socket.onerror = () => {
        if (!isMounted) {
          return;
        }
        setConnectionStatus("closed");
      };

      socket.onclose = () => {
        if (!isMounted) {
          return;
        }
        setConnectionStatus("closed");
        if (!reconnectHandle) {
          reconnectHandle = setTimeout(() => {
            reconnectHandle = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectHandle) {
        clearTimeout(reconnectHandle);
        reconnectHandle = null;
      }
      if (socket) {
        socket.close();
        socket = null;
      }
    };
  }, [ingestMetrics]);

  const alerts = useMemo(() => {
    if (!metrics) return [] as string[];
    const list: string[] = [];
    if (metrics.on_time_delivery_rate < 92) {
      list.push("On-time delivery has dipped below 92%. Expedite root-cause review.");
    }
    if (metrics.stockout_rate > 5) {
      list.push("Stockout rate is above 5%. Coordinate with supply planning.");
    }
    if (metrics.incident_rate > 3) {
      list.push("Safety incidents exceed threshold. Alert safety managers.");
    }
    if (metrics.avg_dwell_time > 65) {
      list.push("Average dwell time is trending high. Check yard congestion.");
    }
    if (metrics.cost_per_order > 10.5) {
      list.push("Cost per order is above the target ceiling. Review labor & carrier mix.");
    }
    return list;
  }, [metrics]);

  const lastUpdated = metrics
    ? new Date(metrics.timestamp).toLocaleTimeString()
    : null;

  const formatCardValue = useCallback((value: number | undefined, config: CardConfig) => {
    if (value === undefined || value === null) {
      return "--";
    }

    if (config.prefix === "$") {
      return `${config.prefix}${value.toFixed(config.decimals ?? 2)}`;
    }

    if (config.decimals !== undefined) {
      const formatted = value.toFixed(config.decimals);
      if (config.unit) {
        return config.unit === "%" ? `${formatted}${config.unit}` : `${formatted} ${config.unit}`;
      }
      return formatted;
    }

    const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return config.unit ? `${formatted} ${config.unit}` : formatted;
  }, []);

  const gaugeValue = metrics?.truck_utilization ?? 0;
  const gaugeAngle = Math.min(Math.max((gaugeValue - 55) / (95 - 55), 0), 1) * 360;
  const gaugeColor = gaugeValue < 65 ? "#dc3545" : gaugeValue > 88 ? "#198754" : "#0d6efd";
  const gaugeStyle: GaugeStyle = {
    "--gauge-angle": `${gaugeAngle}deg`,
    "--gauge-color": gaugeColor,
  };

  const statusBadgeClass =
    connectionStatus === "open"
      ? "bg-success"
      : connectionStatus === "connecting"
      ? "bg-warning text-dark"
      : "bg-secondary";

  return (
    <main className="py-4">
      <div className="container-fluid px-4 px-lg-5">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-lg-between gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-semibold mb-0">Cross-Team Logistics Dashboard</h1>
            <p className="text-muted mb-0">
              Monitor fulfillment, transportation, inventory, and safety performance in real time.
            </p>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className={`badge ${statusBadgeClass} fs-6 text-capitalize`}>
              {connectionStatus === "open" ? "live" : connectionStatus}
            </span>
            {lastUpdated && (
              <span className="text-muted small">Last update: {lastUpdated}</span>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {alerts.length > 0 && (
          <div className="alert alert-danger alert-banner" role="alert">
            <h5 className="mb-2">Attention Required</h5>
            <ul className="mb-0 ps-3">
              {alerts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {loading && !metrics ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            <section className="row g-4">
              {cardConfigs.map((config) => {
                const value = metrics?.[config.key];
                const alertActive =
                  value !== undefined && value !== null && config.alertWhen ? config.alertWhen(value) : false;
                const alertClass = alertActive
                  ? config.alertSeverity === "high"
                    ? "alert-high"
                    : "alert-low"
                  : "";
                return (
                  <div key={config.key} className="col-xxl-3 col-lg-4 col-sm-6">
                    <div className={`card shadow-sm h-100 metric-card ${alertClass}`}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="text-uppercase text-muted fw-semibold mb-2">
                              {config.title}
                            </h6>
                            <div className="display-6 fw-semibold">
                              {formatCardValue(value, config)}
                            </div>
                          </div>
                        </div>
                        <p className="metric-subtext mt-2 mb-0">{config.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="row g-4 mt-1">
              <div className="col-xxl-7">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <h5 className="card-title mb-0">Order Throughput & Accuracy</h5>
                    <span className="metric-subtext">Rolling 10 samples from live feed</span>
                  </div>
                  <div className="card-body">
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ordersHistory} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="time" interval={Math.max(0, Math.floor(ordersHistory.length / 6))} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, "auto"]} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[90, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="orders"
                            stroke="#0d6efd"
                            strokeWidth={2}
                            dot={false}
                            name="Orders per Hour"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#198754"
                            strokeWidth={2}
                            dot={false}
                            name="Order Accuracy %"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xxl-5">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <h5 className="card-title mb-0">Fleet Utilization</h5>
                    <span className="metric-subtext">Target 70% - 90%</span>
                  </div>
                  <div className="card-body d-flex flex-column justify-content-center align-items-center">
                    <div className="gauge" style={gaugeStyle}>
                      <span className="gauge-value">{gaugeValue.toFixed(1)}%</span>
                      <span className="gauge-label">Truck Utilization</span>
                    </div>
                    <p className="metric-subtext mt-3 mb-0 text-center">
                      Keep utilization healthy to balance asset ROI with driver hours.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="row g-4 mt-1">
              <div className="col-xxl-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <h5 className="card-title mb-0">Cost Efficiency</h5>
                    <span className="metric-subtext">Cost per order with operating ratio overlay</span>
                  </div>
                  <div className="card-body">
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={costHistory} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="time" interval={Math.max(0, Math.floor(costHistory.length / 6))} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, "auto"]} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[80, 100]} />
                          <Tooltip />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="cost"
                            fill="#0d6efd20"
                            stroke="#0d6efd"
                            name="Cost per Order"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="operatingRatio"
                            stroke="#fd7e14"
                            strokeWidth={2}
                            dot={false}
                            name="Operating Ratio %"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xxl-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white border-0 pb-0">
                    <h5 className="card-title mb-0">Yard & Safety Pulse</h5>
                    <span className="metric-subtext">Dwell time vs. incident rate</span>
                  </div>
                  <div className="card-body">
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dwellHistory} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="time" interval={Math.max(0, Math.floor(dwellHistory.length / 6))} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, "auto"]} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 6]} />
                          <Tooltip />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="dwell"
                            fill="#6610f220"
                            stroke="#6610f2"
                            name="Avg Dwell (min)"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="incidentRate"
                            stroke="#dc3545"
                            strokeWidth={2}
                            dot={false}
                            name="Incident Rate"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
