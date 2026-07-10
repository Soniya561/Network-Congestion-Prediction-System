import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const trafficTrend = [
  { date: "Jul 1", traffic: 68, congestion: 2 },
  { date: "Jul 2", traffic: 74, congestion: 5 },
  { date: "Jul 3", traffic: 71, congestion: 3 },
  { date: "Jul 4", traffic: 85, congestion: 12 },
  { date: "Jul 5", traffic: 92, congestion: 18 },
  { date: "Jul 6", traffic: 78, congestion: 7 },
  { date: "Jul 7", traffic: 88, congestion: 14 },
  { date: "Jul 8", traffic: 82, congestion: 9 },
  { date: "Jul 9", traffic: 94, congestion: 21 },
];

const latencyTrend = trafficTrend.map((d, i) => ({
  ...d,
  latency: 10 + i * 2.5 + Math.sin(i) * 4,
  baseline: 12,
}));

const predAccuracy = [
  { model: "XGBoost", accuracy: 98.4 },
  { model: "LightGBM", accuracy: 97.9 },
  { model: "Random Forest", accuracy: 96.8 },
];

const events = [
  { id: 1, time: "2026-07-09 14:32", title: "Network Congestion — Chennai DC", severity: "HIGH", location: "DC-02 Chennai", resolution: "Pending", duration: "—" },
  { id: 2, time: "2026-07-08 22:14", title: "Latency Spike — Mumbai Edge", severity: "HIGH", location: "Edge-05 Mumbai", resolution: "Resolved", duration: "18 min" },
  { id: 3, time: "2026-07-08 16:40", title: "CDN Degradation — Hyderabad", severity: "MEDIUM", location: "POP-12 HYD", resolution: "Resolved", duration: "42 min" },
  { id: 4, time: "2026-07-07 09:22", title: "BGP Route Flap", severity: "HIGH", location: "Core-07", resolution: "Resolved", duration: "7 min" },
  { id: 5, time: "2026-07-06 03:11", title: "IoT Reconnect Storm", severity: "MEDIUM", location: "Zone-B BLR", resolution: "Resolved", duration: "28 min" },
  { id: 6, time: "2026-07-05 18:55", title: "Bandwidth Saturation", severity: "HIGH", location: "DC-01 Mumbai", resolution: "Resolved", duration: "55 min" },
  { id: 7, time: "2026-07-04 11:30", title: "Packet Loss Anomaly", severity: "LOW", location: "Transit-03", resolution: "Resolved", duration: "12 min" },
];

const severityConfig: Record<string, { color: string; bg: string }> = {
  HIGH: { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  MEDIUM: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  LOW: { color: "#34d399", bg: "rgba(52,211,153,0.1)" },
};

export default function HistoryPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-cyan" style={{ color: "#22d3ee" }}>
          ALERT HISTORY &amp; ANALYTICS
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Past congestion events, trend analysis, and prediction performance reports
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Events (30d)", value: "47", color: "#38bdf8" },
          { label: "Avg Resolution Time", value: "23 min", color: "#34d399" },
          { label: "AI Prediction Accuracy", value: "97.8%", color: "#a78bfa" },
          { label: "Prevented Outages", value: "12", color: "#22d3ee" },
        ].map((k) => (
          <div key={k.label} className="glass rounded-xl p-4 card-hover" style={{ border: `1px solid ${k.color}20` }}>
            <div className="font-mono text-xs mb-2" style={{ color: "#64748b", letterSpacing: "0.08em" }}>{k.label}</div>
            <div className="font-display text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            NETWORK TRAFFIC &amp; CONGESTION TREND (9 days)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trafficTrend}>
              <defs>
                <linearGradient id="trafficH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="congH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(56,189,248,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
              <Area type="monotone" dataKey="traffic" stroke="#38bdf8" strokeWidth={2} fill="url(#trafficH)" name="Traffic %" />
              <Area type="monotone" dataKey="congestion" stroke="#f87171" strokeWidth={2} fill="url(#congH)" name="Congestion Events" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            MODEL ACCURACY COMPARISON
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={predAccuracy} layout="vertical" barCategoryGap="25%">
              <CartesianGrid stroke="rgba(56,189,248,0.06)" horizontal={false} />
              <XAxis type="number" domain={[94, 100]} tick={{ fill: "#475569", fontSize: 8 }} />
              <YAxis type="category" dataKey="model" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} width={85} />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
              <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} name="Accuracy %">
                {predAccuracy.map((_, i) => (
                  <Cell key={i} fill={["#a78bfa", "#34d399", "#38bdf8"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency trend */}
      <div className="glass rounded-xl p-5">
        <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
          LATENCY VARIATION TREND
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={latencyTrend}>
            <CartesianGrid stroke="rgba(56,189,248,0.06)" />
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} unit="ms" />
            <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
            <Line type="monotone" dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot={false} name="Latency (ms)" />
            <Line type="monotone" dataKey="baseline" stroke="#475569" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Baseline" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Event timeline table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
          <div className="font-display text-xs font-bold" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            CONGESTION EVENT TIMELINE
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
              {["Timestamp", "Event", "Severity", "Location", "Duration", "Status"].map((h) => (
                <th key={h} className="px-5 py-3 text-left font-mono text-xs" style={{ color: "#475569", letterSpacing: "0.08em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => {
              const sc = severityConfig[ev.severity];
              return (
                <tr
                  key={ev.id}
                  className="transition-all hover:bg-white/5 cursor-pointer"
                  style={{ borderBottom: "1px solid rgba(56,189,248,0.05)", animationDelay: `${i * 0.05}s` }}
                >
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748b" }}>{ev.time}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: "#94a3b8" }}>{ev.title}</td>
                  <td className="px-5 py-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748b" }}>{ev.location}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748b" }}>{ev.duration}</td>
                  <td className="px-5 py-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        color: ev.resolution === "Resolved" ? "#34d399" : "#f87171",
                        background: ev.resolution === "Resolved" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                      }}
                    >
                      {ev.resolution}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
