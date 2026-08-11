import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/api.ts";
import type { DashboardData, TopologyNode } from "../utils/dashboardState.ts";

interface ReportsData {
  traffic_history: Array<{ created_at_utc: string; bandwidth_utilization_percent: number }>;
}

function NetworkVisualization({ nodes, edges }: { nodes: TopologyNode[]; edges: string[][] }) {
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  return (
    <svg width="700" height="400" className="w-full h-full" viewBox="0 0 700 400">
      {Array.from({ length: 10 }).map((_, index) => <line key={`h${index}`} x1="0" y1={index * 40} x2="700" y2={index * 40} stroke="rgba(56,189,248,0.05)" strokeWidth="1" />)}
      {Array.from({ length: 18 }).map((_, index) => <line key={`v${index}`} x1={index * 40} y1="0" x2={index * 40} y2="400" stroke="rgba(56,189,248,0.05)" strokeWidth="1" />)}
      {edges.map(([fromId, toId], index) => {
        const from = nodeById[fromId];
        const to = nodeById[toId];
        if (!from || !to) return null;
        return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(56,189,248,0.2)" strokeWidth="1.5" strokeDasharray="4 4" />;
      })}
      {nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r="12" fill="rgba(15,23,42,0.9)" stroke="#38bdf8" strokeWidth="2" />
          <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" fill="#38bdf8" fontSize="10">{node.type === "datacenter" ? "◆" : node.type === "cloud" ? "☁" : node.type === "router" ? "◈" : "◉"}</text>
          <text x={node.x} y={node.y + 22} textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="8" fontFamily="JetBrains Mono">{node.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [telemetry, setTelemetry] = useState<ReportsData["traffic_history"]>([]);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      const [dashboardResult, reportsResult] = await Promise.allSettled([
        api.get<DashboardData>("/dashboard"),
        api.get<ReportsData>("/reports"),
      ]);
      if (!active) return;
      setDashboardData(dashboardResult.status === "fulfilled" ? dashboardResult.value.data : null);
      setTelemetry(reportsResult.status === "fulfilled" ? reportsResult.value.data.traffic_history : []);
    };
    void loadDashboard();
    const id = window.setInterval(() => void loadDashboard(), 5000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const chartData = telemetry.map((point) => ({
    timestamp: new Date(point.created_at_utc).toLocaleString("en-IN", { hour12: false }),
    bandwidth: point.bandwidth_utilization_percent,
  }));
  const metrics = dashboardData?.metrics;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-glow-blue" style={{ color: "#38bdf8" }}>AI NETWORK COMMAND CENTER</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Current model prediction and submitted network telemetry</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg" style={{ color: "#38bdf8" }}>{time.toLocaleTimeString("en-IN", { hour12: false })}</div>
          <div className="font-mono text-xs" style={{ color: "#475569" }}>{time.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5" style={{ border: "1px solid #38bdf820" }}>
          <div className="font-mono text-xs mb-3" style={{ color: "#64748b", letterSpacing: "0.1em" }}>CURRENT CONGESTION</div>
          <div className="font-display text-3xl font-black" style={{ color: "#38bdf8" }}>{dashboardData?.current_congestion?.toUpperCase() ?? "Unavailable"}</div>
          <div className="text-sm font-medium mt-2" style={{ color: "#38bdf8" }}>Model confidence: {dashboardData ? `${dashboardData.confidence.toFixed(2)}%` : "Unavailable"}</div>
        </div>
        <div className="glass rounded-xl p-5" style={{ border: "1px solid #a78bfa20" }}>
          <div className="font-mono text-xs mb-3" style={{ color: "#64748b", letterSpacing: "0.1em" }}>ACTIVE USERS</div>
          <div className="font-display text-3xl font-black" style={{ color: "#a78bfa" }}>{dashboardData ? dashboardData.active_users.toLocaleString() : "Unavailable"}</div>
          <div className="text-xs mt-2" style={{ color: "#475569" }}>Current submitted prediction telemetry</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 glass rounded-xl p-4" style={{ height: "420px" }}>
          <div className="mb-3"><h2 className="font-display text-sm font-bold" style={{ color: "#e2e8f0" }}>NETWORK VISUALIZATION</h2><p className="text-xs" style={{ color: "#64748b" }}>Illustrative infrastructure view</p></div>
          <div className="h-full"><NetworkVisualization nodes={dashboardData?.topology_nodes ?? []} edges={dashboardData?.edges ?? []} /></div>
        </div>
        <div className="col-span-3 glass rounded-xl p-4">
          <div className="mb-3"><h2 className="font-display text-sm font-bold" style={{ color: "#e2e8f0" }}>RECORDED NETWORK TELEMETRY</h2><p className="text-xs" style={{ color: "#64748b" }}>Persisted prediction records in chronological order</p></div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}><defs><linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} /><stop offset="95%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(56,189,248,0.06)" /><XAxis dataKey="timestamp" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} /><YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} unit="%" /><Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} /><Area type="monotone" dataKey="bandwidth" stroke="#38bdf8" strokeWidth={2} fill="url(#trafficGrad)" name="Bandwidth utilization" /></AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[320px] flex items-center justify-center text-xs font-mono" style={{ color: "#64748b" }}>No recorded prediction telemetry yet</div>}
        </div>
      </div>

      <div className="glass rounded-xl p-4 flex gap-8">
        {[
          { label: "TOTAL BANDWIDTH", value: metrics?.total_bandwidth ?? "Unavailable", color: "#38bdf8" },
          { label: "AVG LATENCY", value: metrics?.avg_latency ?? "Unavailable", color: "#34d399" },
          { label: "PACKET LOSS", value: metrics?.packet_loss ?? "Unavailable", color: "#34d399" },
        ].map((stat) => <div key={stat.label}><div className="font-mono text-xs mb-0.5" style={{ color: "#475569", letterSpacing: "0.08em" }}>{stat.label}</div><div className="font-display text-base font-bold" style={{ color: stat.color }}>{stat.value}</div></div>)}
      </div>
    </div>
  );
}
