"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

interface Metrics {
  on_time_delivery_rate: number;
  avg_delivery_time: number;
  perfect_order_rate: number;
  orders_per_hour: number;
  truck_utilization: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ordersData, setOrdersData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    // Initial fetch
    fetch("http://localhost:8000/api/metrics")
      .then((res) => res.json())
      .then((data) => setMetrics(data));

    // WebSocket
    const ws = new WebSocket("ws://localhost:8000/ws/metrics");
    ws.onmessage = (event) => {
      const updated: Metrics = JSON.parse(event.data);
      setMetrics(updated);
      setOrdersData((prev) => [
        ...prev.slice(-9),
        { name: new Date().toLocaleTimeString(), value: updated.orders_per_hour },
      ]);
    };

    return () => ws.close();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Logistics Dashboard MVP</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-gray-500 text-sm">On-Time Delivery</h2>
          <p className="text-3xl font-semibold">{metrics?.on_time_delivery_rate ?? "--"}%</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-gray-500 text-sm">Orders/Hour</h2>
          <p className="text-3xl font-semibold">{metrics?.orders_per_hour ?? "--"}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-gray-500 text-sm">Truck Utilization</h2>
          <p className="text-3xl font-semibold">{metrics?.truck_utilization ?? "--"}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-gray-500 text-sm mb-2">Orders per Hour Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ordersData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}
