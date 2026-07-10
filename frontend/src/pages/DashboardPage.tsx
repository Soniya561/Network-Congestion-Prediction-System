import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const trafficData = [
  { time: "00:00", traffic: 42, predicted: 45, threshold: 80 },
  { time: "02:00", traffic: 38, predicted: 40, threshold: 80 },
  { time: "04:00", traffic: 31, predicted: 33, threshold: 80 },
  { time: "06:00", traffic: 55, predicted: 58, threshold: 80 },
  { time: "08:00", traffic: 72, predicted: 75, threshold: 80 },
  { time: "10:00", traffic: 68, predicted: 70, threshold: 80 },
  { time: "12:00", traffic: 85, predicted: 88, threshold: 80 },
  { time: "14:00", traffic: 78, predicted: 82, threshold: 80 },
  { time: "16:00", traffic: 92, predicted: 95, threshold: 80 },
  { time: "18:00", traffic: 88, predicted: 91, threshold: 80 },
  { time: "20:00", traffic: 65, predicted: 68, threshold: 80 },
  { time: "22:00", traffic: 52, predicted: 55, threshold: 80 },
];

interface NodeDef {
  id: string;
  x: number;
  y: number;
  type: "datacenter" | "router" | "cloud" | "device";
  status: "healthy" | "warning" | "congested" | "predicted";
  label: string;
}

const networkNodes: NodeDef[] = [
  { id: "dc1", x: 200, y: 150, type: "datacenter", status: "healthy", label: "DC Mumbai" },
  { id: "dc2", x: 550, y: 100, type: "datacenter", status: "congested", label: "DC Chennai" },
  { id: "dc3", x: 380, y: 280, type: "cloud", status: "healthy", label: "AWS Asia" },
  { id: "r1", x: 140, y: 250, type: "router", status: "warning", label: "Edge-01" },
  { id: "r2", x: 460, y: 200, type: "router", status: "healthy", label: "Core-07" },
  { id: "r3", x: 300, y: 160, type: "router", status: "predicted", label: "Transit-03" },
  { id: "c1", x: 620, y: 240, type: "cloud", status: "healthy", label: "Azure East" },
  { id: "d1", x: 80, y: 320, type: "device", status: "healthy", label: "IoT-Cluster" },
  { id: "d2", x: 540, y: 320, type: "device", status: "warning", label: "CDN-Node" },
];

const edges = [
  ["dc1", "r3"], ["dc2", "r2"], ["r3", "r2"], ["r3", "dc3"], ["r2", "dc3"],
  ["r1", "dc1"], ["d1", "r1"], ["dc3", "r2"], ["r2", "c1"], ["c1", "d2"],
];

const statusColor: Record<string, string> = {
  healthy: "#34d399",
  warning: "#fbbf24",
  congested: "#f87171",
  predicted: "#38bdf8",
};

function NetworkMap() {
  const [packets, setPackets] = useState<{ id: number; fromNode: string; toNode: string; t: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const edge = edges[Math.floor(Math.random() * edges.length)];
      const reverse = Math.random() > 0.5;
      setPackets((prev) => [
        ...prev.filter((p) => p.t < 1),
        { id: idRef.current++, fromNode: reverse ? edge[1] : edge[0], toNode: reverse ? edge[0] : edge[1], t: 0 },
      ]);
    }, 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(function step() {
      setPackets((prev) =>
        prev.map((p) => ({ ...p, t: p.t + 0.015 })).filter((p) => p.t <= 1)
      );
      requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const nodeById = Object.fromEntries(networkNodes.map((n) => [n.id, n]));

  return (
    <svg width="700" height="400" className="w-full h-full" viewBox="0 0 700 400">
      <defs>
        {networkNodes.map((n) => (
          <radialGradient key={n.id} id={`glow-${n.id}`}>
            <stop offset="0%" stopColor={statusColor[n.status]} stopOpacity="0.4" />
            <stop offset="100%" stopColor={statusColor[n.status]} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {/* Grid lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 40} x2="700" y2={i * 40} stroke="rgba(56,189,248,0.05)" strokeWidth="1" />
      ))}
      {Array.from({ length: 18 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="400" stroke="rgba(56,189,248,0.05)" strokeWidth="1" />
      ))}

      {/* Edges */}
      {edges.map(([fromId, toId], i) => {
        const from = nodeById[fromId];
        const to = nodeById[toId];
        if (!from || !to) return null;
        return (
          <line
            key={i}
            x1={from.x} y1={from.y}
            x2={to.x} y2={to.y}
            stroke="rgba(56,189,248,0.2)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        );
      })}

      {/* Packets */}
      {packets.map((p) => {
        const from = nodeById[p.fromNode];
        const to = nodeById[p.toNode];
        if (!from || !to) return null;
        const x = from.x + (to.x - from.x) * p.t;
        const y = from.y + (to.y - from.y) * p.t;
        return (
          <circle key={p.id} cx={x} cy={y} r="3" fill="#38bdf8" opacity={1 - p.t * 0.5}>
            <animate attributeName="r" values="2;4;2" dur="0.5s" repeatCount="indefinite" />
          </circle>
        );
      })}

      {/* Nodes */}
      {networkNodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r="20" fill={`url(#glow-${n.id})`} />
          <circle
            cx={n.x} cy={n.y} r="12"
            fill="rgba(15,23,42,0.9)"
            stroke={statusColor[n.status]}
            strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 6px ${statusColor[n.status]})` }}
          />
          <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" fill={statusColor[n.status]} fontSize="10">
            {n.type === "datacenter" ? "⬡" : n.type === "cloud" ? "☁" : n.type === "router" ? "◈" : "◉"}
          </text>
          <text x={n.x} y={n.y + 22} textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="8" fontFamily="JetBrains Mono">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const statsCards = [
  {
    title: "NETWORK HEALTH",
    value: "94%",
    sub: "Stable",
    color: "#34d399",
    icon: "◎",
    ring: true,
    extra: "↑ 2.3% from yesterday",
  },
  {
    title: "CURRENT CONGESTION",
    value: "LOW",
    sub: "Confidence: 98.6%",
    color: "#38bdf8",
    icon: "◈",
    ring: false,
    extra: "All corridors nominal",
  },
  {
    title: "AI PREDICTION",
    value: "10 min",
    sub: "Possible congestion",
    color: "#fbbf24",
    icon: "⚡",
    ring: false,
    extra: "Confidence: 96.8%",
  },
  {
    title: "CONNECTED DEVICES",
    value: "2.4M",
    sub: "Active endpoints",
    color: "#a78bfa",
    icon: "⬡",
    ring: false,
    extra: "↑ 12K in last hour",
  },
];

function CircularGauge({ value, color }: { value: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width="88" height="88" className="animate-spin-slow" style={{ animationDirection: "reverse" }}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(56,189,248,0.1)" strokeWidth="6" />
      <circle
        cx="44" cy="44" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, animation: "none" }}
      />
      <text x="44" y="49" textAnchor="middle" fill={color} fontSize="16" fontFamily="Orbitron" fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-glow-blue" style={{ color: "#38bdf8" }}>
            AI NETWORK COMMAND CENTER
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Real-time network intelligence — predictive congestion management
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg" style={{ color: "#38bdf8" }}>
            {time.toLocaleTimeString("en-IN", { hour12: false })}
          </div>
          <div className="font-mono text-xs" style={{ color: "#475569" }}>
            {time.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <div
            key={i}
            className="glass rounded-xl p-5 card-hover"
            style={{ border: `1px solid ${card.color}20` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-mono text-xs mb-3" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
                  {card.title}
                </div>
                {card.ring ? (
                  <CircularGauge value={parseInt(card.value)} color={card.color} />
                ) : (
                  <div
                    className="font-display text-3xl font-black"
                    style={{ color: card.color, textShadow: `0 0 20px ${card.color}60` }}
                  >
                    {card.value}
                  </div>
                )}
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: `${card.color}15`,
                  border: `1px solid ${card.color}30`,
                  color: card.color,
                }}
              >
                {card.icon}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium" style={{ color: card.color }}>
                {card.sub}
              </div>
              <div className="text-xs" style={{ color: "#475569" }}>
                {card.extra}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Network map + chart */}
      <div className="grid grid-cols-5 gap-4">
        {/* Network map */}
        <div className="col-span-3 glass rounded-xl p-4" style={{ height: "420px" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-sm font-bold" style={{ color: "#e2e8f0" }}>
                LIVE NETWORK TOPOLOGY
              </h2>
              <p className="text-xs" style={{ color: "#64748b" }}>Holographic infrastructure map</p>
            </div>
            <div className="flex gap-3 text-xs font-mono">
              {[["#34d399", "Healthy"], ["#fbbf24", "Warning"], ["#f87171", "Congested"], ["#38bdf8", "Predicted"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                  <span style={{ color: "#64748b" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-full">
            <NetworkMap />
          </div>
        </div>

        {/* Traffic chart */}
        <div className="col-span-2 glass rounded-xl p-4">
          <div className="mb-3">
            <h2 className="font-display text-sm font-bold" style={{ color: "#e2e8f0" }}>
              TRAFFIC ANALYSIS
            </h2>
            <p className="text-xs" style={{ color: "#64748b" }}>24-hour bandwidth utilization vs AI prediction</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predictGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(56,189,248,0.06)" />
              <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <YAxis tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <Tooltip
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "JetBrains Mono", color: "#64748b" }} />
              <Area type="monotone" dataKey="threshold" stroke="#f87171" strokeDasharray="4 4" strokeWidth={1} fill="none" name="Threshold" />
              <Area type="monotone" dataKey="traffic" stroke="#38bdf8" strokeWidth={2} fill="url(#trafficGrad)" name="Actual" />
              <Area type="monotone" dataKey="predicted" stroke="#818cf8" strokeWidth={2} strokeDasharray="6 2" fill="url(#predictGrad)" name="Predicted" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="glass rounded-xl p-4 flex items-center justify-between">
        <div className="flex gap-8">
          {[
            { label: "TOTAL BANDWIDTH", value: "847 Gbps", color: "#38bdf8" },
            { label: "AVG LATENCY", value: "12.4 ms", color: "#34d399" },
            { label: "PACKET LOSS", value: "0.02%", color: "#34d399" },
            { label: "UPTIME", value: "99.97%", color: "#a78bfa" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-xs mb-0.5" style={{ color: "#475569", letterSpacing: "0.08em" }}>{s.label}</div>
              <div className="font-display text-base font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-blink" style={{ background: "#34d399" }} />
          <span className="font-mono text-xs" style={{ color: "#34d399" }}>ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>
    </div>
  );
}
