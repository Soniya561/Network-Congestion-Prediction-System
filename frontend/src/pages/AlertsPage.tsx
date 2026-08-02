import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import type { DashboardData } from "../utils/dashboardState";

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

interface TimelineEvent {
  time: string;
  event: string;
  color: string;
}

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

const initialDashboardData: DashboardData = {
  network_health: 94,
  current_congestion: "Low",
  confidence: 98.6,
  prediction_next: "Possible congestion in 10 min",
  connected_devices: 2400000,
  status: "Stable",
  topology_nodes: [
    { id: "dc1", x: 200, y: 150, type: "datacenter", status: "healthy", label: "DC Mumbai" },
    { id: "dc2", x: 550, y: 100, type: "datacenter", status: "healthy", label: "DC Chennai" },
    { id: "dc3", x: 380, y: 280, type: "cloud", status: "healthy", label: "AWS Asia" },
    { id: "r1", x: 140, y: 250, type: "router", status: "healthy", label: "Edge-01" },
    { id: "r2", x: 460, y: 200, type: "router", status: "healthy", label: "Core-07" },
    { id: "r3", x: 300, y: 160, type: "router", status: "healthy", label: "Transit-03" },
    { id: "c1", x: 620, y: 240, type: "cloud", status: "healthy", label: "Azure East" },
    { id: "d1", x: 80, y: 320, type: "device", status: "healthy", label: "IoT-Cluster" },
    { id: "d2", x: 540, y: 320, type: "device", status: "healthy", label: "CDN-Node" },
  ],
  edges: [
    ["dc1", "r3"], ["dc2", "r2"], ["r3", "r2"], ["r3", "dc3"], ["r2", "dc3"],
    ["r1", "dc1"], ["d1", "r1"], ["dc3", "r2"], ["r2", "c1"], ["c1", "d2"],
  ],
  traffic_data: [
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
  ],
  metrics: {
    total_bandwidth: "0.9 Gbps",
    avg_latency: "12.4 ms",
    packet_loss: "0.02%",
    uptime: "99.97%",
  },
};

function toPriority(congestion: string): Alert["priority"] {
  const level = congestion.toLowerCase();
  if (level.includes("high")) return "HIGH";
  if (level.includes("medium")) return "MEDIUM";
  return "LOW";
}

function statusFromPriority(priority: Alert["priority"]): Alert["status"] {
  if (priority === "HIGH") return "active";
  if (priority === "MEDIUM") return "investigating";
  return "resolved";
}

function buildAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = [];
  const congestionPriority = toPriority(data.current_congestion);
  const impactedNodes = data.topology_nodes.filter((node) => node.status !== "healthy").slice(0, 3);
  const latestTraffic = data.traffic_data[data.traffic_data.length - 1];
  const latestLatency = parseFloat(data.metrics.avg_latency.replace(" ms", ""));

  alerts.push({
    id: 1,
    priority: congestionPriority,
    title: `${data.current_congestion.toUpperCase()} CONGESTION SIGNAL`,
    location: `Network command center • ${data.status}`,
    reasons: [
      `Network health is ${data.network_health}% with ${data.confidence}% model confidence`,
      `Prediction window: ${data.prediction_next}`,
      `Connected devices are ${data.connected_devices.toLocaleString()}`,
    ],
    recommendations: [
      "Prioritize bandwidth redistribution for the most impacted corridors",
      "Enable failover route policies before the threshold window closes",
      "Escalate to the NOC if the forecast remains elevated",
    ],
    time: "Live",
    status: statusFromPriority(congestionPriority),
  });

  if (impactedNodes.length > 0) {
    impactedNodes.forEach((node, index) => {
      const priority = node.status === "congested" ? "HIGH" : node.status === "predicted" ? "MEDIUM" : "MEDIUM";
      alerts.push({
        id: 2 + index,
        priority,
        title: `${node.label} ${node.status === "congested" ? "degradation" : node.status === "predicted" ? "forecasted risk" : "watch alert"}`,
        location: `${node.type === "router" ? "Router" : node.type === "device" ? "Edge" : "Core"} telemetry • ${node.label}`,
        reasons: [
          `${node.label} is currently marked as ${node.status}`,
          `Latency and utilization are contributing to the current incident profile`,
          `This node is part of the active propagation path for the dashboard view`,
        ],
        recommendations: [
          `Inspect ${node.label} telemetry and route health`,
          node.status === "congested" ? "Throttle low-priority traffic and re-balance load" : "Add a monitoring checkpoint for the predicted hotspot",
          "Keep the incident playbook ready for follow-up action",
        ],
        time: `${index + 1} min ago`,
        status: priority === "HIGH" ? "active" : "investigating",
      });
    });
  }

  if (latestTraffic && latestTraffic.traffic >= latestTraffic.threshold) {
    alerts.push({
      id: 10,
      priority: "MEDIUM",
      title: "TRAFFIC THRESHOLD EXCEEDED",
      location: "Peak traffic window",
      reasons: [
        `Current traffic reached ${latestTraffic.traffic}% against the ${latestTraffic.threshold}% threshold`,
        `Predicted load is ${latestTraffic.predicted}% for the next interval`,
        `Latency is tracking at ${data.metrics.avg_latency}`,
      ],
      recommendations: [
        "Re-balance traffic across available paths",
        "Reduce burst volume on the busiest edge before it cascades",
        "Keep the AI mitigation workflow active",
      ],
      time: "Live",
      status: "investigating",
    });
  }

  if (latestLatency < 20) {
    alerts.push({
      id: 11,
      priority: "LOW",
      title: "STABILITY WATCH",
      location: "Baseline system health",
      reasons: [
        `Average latency remains ${data.metrics.avg_latency}`,
        `Packet loss is ${data.metrics.packet_loss}`,
        `Uptime is ${data.metrics.uptime}`,
      ],
      recommendations: [
        "Continue monitoring host-level utilization",
        "Preserve the current routing policy until the next update",
      ],
      time: "Live",
      status: "resolved",
    });
  }

  return alerts;
}

function buildTimeline(data: DashboardData): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const lastTraffic = data.traffic_data[data.traffic_data.length - 1];

  events.push({
    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    event: `${data.current_congestion.toUpperCase()} congestion signal confirmed by the AI model`,
    color: data.current_congestion.toLowerCase().includes("high") ? "#f87171" : data.current_congestion.toLowerCase().includes("medium") ? "#fbbf24" : "#34d399",
  });

  if (lastTraffic && lastTraffic.traffic >= lastTraffic.threshold) {
    events.push({
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
      event: `Traffic threshold crossed at ${lastTraffic.traffic}%`,
      color: "#38bdf8",
    });
  }

  data.topology_nodes
    .filter((node) => node.status !== "healthy")
    .slice(0, 3)
    .forEach((node) => {
      events.push({
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
        event: `${node.label} reported ${node.status} status`,
        color: node.status === "congested" ? "#f87171" : node.status === "predicted" ? "#38bdf8" : "#fbbf24",
      });
    });

  return events.slice(0, 6);
}

export default function AlertsPage() {
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        const response = await api.get<DashboardData>("/dashboard");
        if (isMounted) {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error("Unable to load alert data", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();
    const id = window.setInterval(fetchDashboard, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, []);

  const alerts = useMemo(() => buildAlerts(dashboardData), [dashboardData]);
  const timelineEvents = useMemo(() => buildTimeline(dashboardData), [dashboardData]);
  const filtered = filter === "ALL" ? alerts : alerts.filter((alert) => alert.priority === filter);

  useEffect(() => {
    if (filtered.length > 0) {
      setExpandedId(filtered[0].id);
    }
  }, [filtered]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-glow-red" style={{ color: "#f87171" }}>
            INTELLIGENT THREAT &amp; CONGESTION MONITORING
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Live alerts generated from your network telemetry and AI predictions
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
        <div className="col-span-2 space-y-4">
          {loading && (
            <div className="rounded-xl p-5" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)" }}>
              <div className="text-sm" style={{ color: "#e2e8f0" }}>
                Syncing with the live network dashboard…
              </div>
            </div>
          )}

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
                        {alert.reasons.map((reason, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm" style={{ color: "#94a3b8" }}>
                            <span style={{ color: cfg.color }}>▸</span>
                            {reason}
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
                  <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${cfg.border}` }}>
                    <div className="mb-3">
                      <div className="font-mono text-xs font-bold mb-2" style={{ color: "#38bdf8", letterSpacing: "0.1em" }}>
                        AI RECOMMENDATIONS
                      </div>
                      <div className="space-y-2">
                        {alert.recommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm" style={{ color: "#e2e8f0" }}>
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)" }}
                            >
                              ✓
                            </div>
                            {recommendation}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button className="btn-primary px-5 py-2 rounded-lg text-xs">Analyze with AI</button>
                      <button className="btn-secondary px-5 py-2 rounded-lg text-xs">Resolve</button>
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

        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.12em" }}>
              ALERT TIMELINE
            </h3>
            <div className="space-y-3">
              {timelineEvents.map((event, index) => (
                <div key={`${event.time}-${index}`} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: event.color, boxShadow: `0 0 8px ${event.color}` }}
                    />
                    {index < timelineEvents.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ background: "rgba(56,189,248,0.1)", minHeight: "16px" }} />
                    )}
                  </div>
                  <div>
                    <div className="font-mono text-xs" style={{ color: "#64748b" }}>{event.time}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{event.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.12em" }}>
              INCIDENT SUMMARY
            </h3>
            {[
              { label: "Active Alerts", value: alerts.filter((alert) => alert.status === "active").length.toString(), color: "#f87171" },
              { label: "Under Investigation", value: alerts.filter((alert) => alert.status === "investigating").length.toString(), color: "#fbbf24" },
              { label: "Resolved Today", value: alerts.filter((alert) => alert.status === "resolved").length.toString(), color: "#34d399" },
              { label: "MTTR", value: `${Math.max(2, Math.round(parseFloat(dashboardData.metrics.avg_latency.replace(" ms", "")) / 8))}.0 min`, color: "#38bdf8" },
              { label: "AI Accuracy", value: `${Math.max(90, Math.min(99.9, dashboardData.confidence - 0.2)).toFixed(1)}%`, color: "#a78bfa" },
            ].map((summary) => (
              <div key={summary.label} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
                <span className="text-xs" style={{ color: "#64748b" }}>{summary.label}</span>
                <span className="font-display text-sm font-bold" style={{ color: summary.color }}>{summary.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
