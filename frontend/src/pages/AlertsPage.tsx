import { useState } from "react";

interface Alert {
  id: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  location: string;
  reasons: string[];
  recommendations: string[];
  time: string;
  status: "active" | "investigating" | "resolved";
}

const alerts: Alert[] = [
  {
    id: 1,
    priority: "HIGH",
    title: "Network Congestion Detected",
    location: "Data Center Chennai — DC-02",
    reasons: ["Bandwidth utilization reached 95%", "Packet loss increasing rapidly (+0.8% in 5min)", "Jitter spike detected: 45ms avg"],
    recommendations: ["Increase bandwidth allocation on MPLS-07", "Optimize traffic routing via BGP policy", "Activate backup link failover"],
    time: "2 min ago",
    status: "active",
  },
  {
    id: 2,
    priority: "HIGH",
    title: "Latency Anomaly — Asia Pacific",
    location: "Transit Router Edge-05 — Mumbai",
    reasons: ["RTT increased from 8ms to 92ms", "BGP route flapping detected", "CPU utilization at 88%"],
    recommendations: ["Flush BGP route table", "Redistribute load across secondary paths", "Escalate to NOC team immediately"],
    time: "8 min ago",
    status: "investigating",
  },
  {
    id: 3,
    priority: "MEDIUM",
    title: "CDN Node Degradation",
    location: "CDN-Node Hyderabad — POP-12",
    reasons: ["Cache hit ratio dropped to 61%", "Origin pull latency elevated", "SSL handshake timeouts 3%"],
    recommendations: ["Purge and warm CDN cache", "Scale origin servers horizontally", "Review SSL session cache config"],
    time: "23 min ago",
    status: "investigating",
  },
  {
    id: 4,
    priority: "LOW",
    title: "IoT Cluster Bandwidth Spike",
    location: "IoT-Cluster Bangalore — Zone-B",
    reasons: ["Unexpected device reconnect storm", "MQTT broker queue depth > 100K"],
    recommendations: ["Enable exponential backoff on device clients", "Scale MQTT broker pods"],
    time: "41 min ago",
    status: "resolved",
  },
];

const timelineEvents = [
  { time: "14:32", event: "HIGH alert triggered — Chennai DC", color: "#f87171" },
  { time: "14:28", event: "AI predicted congestion 10min ahead", color: "#38bdf8" },
  { time: "14:15", event: "Bandwidth threshold crossed 80%", color: "#fbbf24" },
  { time: "13:55", event: "Anomaly detection: latency spike Mumbai", color: "#f87171" },
  { time: "13:40", event: "CDN degradation detected — HYD", color: "#fbbf24" },
  { time: "13:22", event: "System health check passed", color: "#34d399" },
  { time: "13:00", event: "Scheduled maintenance completed", color: "#34d399" },
];

const priorityConfig = {
  HIGH: { color: "#f87171", glow: "glow-red", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)", pulse: true },
  MEDIUM: { color: "#fbbf24", glow: "glow-yellow", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.25)", pulse: false },
  LOW: { color: "#34d399", glow: "glow-green", bg: "rgba(52,211,153,0.05)", border: "rgba(52,211,153,0.2)", pulse: false },
};

const statusLabel: Record<string, { label: string; color: string }> = {
  active: { label: "ACTIVE", color: "#f87171" },
  investigating: { label: "INVESTIGATING", color: "#fbbf24" },
  resolved: { label: "RESOLVED", color: "#34d399" },
};

export default function AlertsPage() {
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");

  const filtered = filter === "ALL" ? alerts : alerts.filter((a) => a.priority === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-glow-red" style={{ color: "#f87171" }}>
            INTELLIGENT THREAT &amp; CONGESTION MONITORING
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Real-time AI-powered alert center — proactive incident response
          </p>
        </div>
        <div className="flex gap-2">
          {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
              style={{
                background: filter === f ? "rgba(56,189,248,0.15)" : "transparent",
                border: `1px solid ${filter === f ? "rgba(56,189,248,0.5)" : "rgba(56,189,248,0.15)"}`,
                color: filter === f ? "#38bdf8" : "#64748b",
                letterSpacing: "0.08em",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Alert cards */}
        <div className="col-span-2 space-y-4">
          {filtered.map((alert) => {
            const cfg = priorityConfig[alert.priority];
            const isExpanded = expandedId === alert.id;
            return (
              <div
                key={alert.id}
                className={`rounded-xl p-5 cursor-pointer transition-all ${cfg.glow}`}
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Priority badge */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`px-2 py-1 rounded font-mono text-xs font-bold ${cfg.pulse ? "animate-pulse-ring" : ""}`}
                        style={{
                          background: `${cfg.color}20`,
                          border: `1px solid ${cfg.color}`,
                          color: cfg.color,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {alert.priority}
                      </div>
                      {cfg.pulse && (
                        <div className="w-2 h-2 rounded-full animate-blink" style={{ background: cfg.color }} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-sm font-bold" style={{ color: cfg.color }}>
                          {alert.title}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-mono"
                          style={{
                            background: `${statusLabel[alert.status].color}15`,
                            color: statusLabel[alert.status].color,
                            border: `1px solid ${statusLabel[alert.status].color}30`,
                          }}
                        >
                          {statusLabel[alert.status].label}
                        </span>
                      </div>
                      <div className="text-xs font-mono mb-3" style={{ color: "#94a3b8" }}>
                        📍 {alert.location}
                      </div>

                      <div className="space-y-1">
                        {alert.reasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "#94a3b8" }}>
                            <span style={{ color: cfg.color }}>▸</span>
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs mb-2" style={{ color: "#475569" }}>{alert.time}</div>
                    <div className="text-lg" style={{ color: cfg.color }}>{isExpanded ? "▲" : "▼"}</div>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="mt-5 pt-4"
                    style={{ borderTop: `1px solid ${cfg.border}` }}
                  >
                    <div className="mb-3">
                      <div className="font-mono text-xs font-bold mb-2" style={{ color: "#38bdf8", letterSpacing: "0.1em" }}>
                        AI RECOMMENDATIONS
                      </div>
                      <div className="space-y-2">
                        {alert.recommendations.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "#e2e8f0" }}>
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)" }}
                            >
                              ✓
                            </div>
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button className="btn-primary px-5 py-2 rounded-lg text-xs">
                        Analyze with AI
                      </button>
                      <button className="btn-secondary px-5 py-2 rounded-lg text-xs">
                        Resolve
                      </button>
                      <button
                        className="px-4 py-2 rounded-lg text-xs font-mono transition-all"
                        style={{
                          background: "rgba(251,191,36,0.1)",
                          border: "1px solid rgba(251,191,36,0.3)",
                          color: "#fbbf24",
                        }}
                      >
                        Escalate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.12em" }}>
              ALERT TIMELINE
            </h3>
            <div className="space-y-3">
              {timelineEvents.map((ev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: ev.color, boxShadow: `0 0 8px ${ev.color}` }}
                    />
                    {i < timelineEvents.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ background: "rgba(56,189,248,0.1)", minHeight: "16px" }} />
                    )}
                  </div>
                  <div>
                    <div className="font-mono text-xs" style={{ color: "#64748b" }}>{ev.time}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{ev.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div className="glass rounded-xl p-4">
            <h3 className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.12em" }}>
              INCIDENT SUMMARY
            </h3>
            {[
              { label: "Active Alerts", value: "2", color: "#f87171" },
              { label: "Under Investigation", value: "2", color: "#fbbf24" },
              { label: "Resolved Today", value: "7", color: "#34d399" },
              { label: "MTTR", value: "4.2 min", color: "#38bdf8" },
              { label: "AI Accuracy", value: "97.8%", color: "#a78bfa" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
                <span className="text-xs" style={{ color: "#64748b" }}>{s.label}</span>
                <span className="font-display text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
