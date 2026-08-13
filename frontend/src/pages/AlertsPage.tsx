import { useEffect, useRef, useState } from "react";
import api from "../api/api.ts";

interface Alert {
  id: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  location: string;
  reasons: string[];
  recommendations: string[];
  time: string;
  status: "active" | "investigating" | "resolved" | "stable" | "escalated";
  createdAt: number;
  resolvedAt?: number | null;
}

interface TimelineEvent {
  timestamp: number;
  time: string;
  event_type: string;
  description: string;
  color: string;
}

interface IncidentSummary {
  active_alerts: number;
  under_investigation: number;
  resolved_today: number;
  mttr: number | null;
  ai_accuracy: number;
  escalation_count: number;
}

interface AlertAnalysis {
  prediction: string;
  confidence: number;
  latency_ms: number;
  packet_loss_percent: number;
  network_health: number;
  connected_devices: number;
  risk_summary: string;
  root_cause: string;
  expected_impact: string;
  recommendations: string[];
}

interface AlertNetwork {
  network_health: number;
  current_congestion: string;
  confidence: number;
  prediction_next: string;
  connected_devices: number;
  status: string;
  metrics: {
    total_bandwidth: string;
    avg_latency: string;
    packet_loss: string;
    uptime: string;
  };
}

interface AlertsResponse {
  alert: Alert;
  timeline: TimelineEvent[];
  summary: IncidentSummary;
  network: AlertNetwork;
  analysis: AlertAnalysis;
  message?: string;
}

const priorityConfig = {
  HIGH: { color: "#f87171", glow: "glow-red", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)", pulse: true },
  MEDIUM: { color: "#fbbf24", glow: "glow-yellow", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.25)", pulse: false },
  LOW: { color: "#34d399", glow: "glow-green", bg: "rgba(52,211,153,0.05)", border: "rgba(52,211,153,0.2)", pulse: false },
};

const statusLabel: Record<Alert["status"], { label: string; color: string }> = {
  active: { label: "ACTIVE", color: "#f87171" },
  investigating: { label: "INVESTIGATING", color: "#fbbf24" },
  resolved: { label: "RESOLVED", color: "#34d399" },
  stable: { label: "STABLE", color: "#34d399" },
  escalated: { label: "ESCALATED", color: "#fbbf24" },
};

export default function AlertsPage() {
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<IncidentSummary>({ active_alerts: 0, under_investigation: 0, resolved_today: 0, mttr: null, ai_accuracy: 0, escalation_count: 0 });
  const [network, setNetwork] = useState<AlertNetwork | null>(null);
  const [analysis, setAnalysis] = useState<AlertAnalysis | null>(null);
  const [operatorEmail, setOperatorEmail] = useState<string | null>(null);
  const [operatorMessage, setOperatorMessage] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const requestInFlight = useRef(false);

  const applyAlertsResponse = (data: AlertsResponse) => {
    setAlert(data.alert);
    setTimelineEvents(data.timeline);
    setSummary(data.summary);
    setNetwork(data.network);
    setAnalysis(data.analysis);
    setExpandedId(data.alert.id);
    if (data.message) {
      setOperatorMessage(data.message);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const response = await api.get<{ authenticated: boolean; email?: string | null }>("/auth/session");
        if (isMounted) {
          setOperatorEmail(response.data.authenticated ? response.data.email ?? null : null);
        }
      } catch (error) {
        console.error("Unable to load operator session", error);
        if (isMounted) {
          setOperatorEmail(null);
        }
      }
    };

    const fetchAlerts = async () => {
      if (requestInFlight.current) return;
      try {
        const response = await api.get<AlertsResponse>("/alerts");
        if (isMounted) {
          applyAlertsResponse(response.data);
        }
      } catch (error) {
        console.error("Unable to load alert data", error);
        if (isMounted) {
          setOperatorMessage("Unable to load NOC alerts from the backend.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSession();
    fetchAlerts();
    const id = window.setInterval(fetchAlerts, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!analysisOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAnalysisOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [analysisOpen]);

  const filtered = alert ? (filter === "ALL" ? [alert] : [alert].filter((item) => item.priority === filter)) : [];
  const mttrSummary = summary.mttr === null ? "--" : `${summary.mttr} min`;
  const analysisItems = network && analysis ? [
    { label: "Predicted Congestion", value: analysis.prediction },
    { label: "Confidence", value: `${analysis.confidence}%` },
    { label: "Network Health", value: `${analysis.network_health}%` },
    { label: "Prediction Window", value: network.prediction_next },
    { label: "Connected Devices", value: analysis.connected_devices.toLocaleString() },
    { label: "System Status", value: network.status },
    { label: "Average Latency", value: `${analysis.latency_ms} ms` },
    { label: "Packet Loss", value: `${analysis.packet_loss_percent}%` },
  ] : [];

  const postAlertAction = async (path: string, fallbackMessage: string) => {
    if (!alert) return;
    requestInFlight.current = true;
    try {
      const response = await api.post<AlertsResponse>(path, { alert_id: alert.id });
      applyAlertsResponse(response.data);
    } catch (error) {
      console.error(fallbackMessage, error);
      setOperatorMessage(fallbackMessage);
    } finally {
      requestInFlight.current = false;
    }
  };

  const alertActionError = (error: unknown, fallbackMessage: string) => {
    if (typeof error === "object" && error && "response" in error) {
      const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
      return response?.data?.detail || response?.data?.message || fallbackMessage;
    }
    return fallbackMessage;
  };

  const sendAlertEmail = async (item: Alert) => {
    if (!network || !analysis) return;

    if (item.priority !== "HIGH") {
      const message = "Email alerts are available for HIGH congestion only.";
      setEmailError(message);
      setOperatorMessage(message);
      return;
    }

    requestInFlight.current = true;
    setEmailSending(true);
    setEmailSent(false);
    setEmailError(null);
    setOperatorMessage(null);

    try {
      const response = await api.post<{ success: boolean; message?: string; recipient?: string }>("/alerts/send-email", {
        congestion_level: item.priority,
        confidence: analysis.confidence,
        network_health: analysis.network_health,
        connected_devices: analysis.connected_devices,
        alert_status: statusLabel[item.status].label,
        timestamp: new Date(item.createdAt).toISOString(),
      });
      setEmailSent(true);
      setOperatorMessage(response.data.message || "Email Sent");
    } catch (error) {
      const message = alertActionError(error, "Unable to send high congestion alert email.");
      console.error(message, error);
      setEmailError(message);
      setOperatorMessage(message);
    } finally {
      setEmailSending(false);
      requestInFlight.current = false;
    }
  };

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
          {["ALL", "HIGH", "MEDIUM", "LOW"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as "ALL" | "HIGH" | "MEDIUM" | "LOW")}
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

      {operatorMessage && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", whiteSpace: "pre-line" }}>
          {operatorMessage}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {loading && (
            <div className="rounded-xl p-5" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)" }}>
              <div className="text-sm" style={{ color: "#e2e8f0" }}>
                Syncing with the live network dashboard...
              </div>
            </div>
          )}

          {filtered.map((item) => {
            const cfg = priorityConfig[item.priority];
            const isExpanded = expandedId === item.id;
            const isResolved = item.status === "resolved";
            const canSendEmail = item.priority === "HIGH" && !isResolved;
            const emailDisabled = !canSendEmail || emailSending;
            const emailButtonLabel = !canSendEmail ? "Send Email" : emailSending ? "Sending..." : emailSent ? "Email Sent" : "Send Email";
            return (
              <div
                key={item.id}
                className={`rounded-xl p-5 cursor-pointer transition-all ${cfg.glow}`}
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
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
                        {item.priority}
                      </div>
                      {cfg.pulse && (
                        <div className="w-2 h-2 rounded-full animate-blink" style={{ background: cfg.color }} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-sm font-bold" style={{ color: cfg.color }}>
                          {item.title}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-mono"
                          style={{
                            background: `${statusLabel[item.status].color}15`,
                            color: statusLabel[item.status].color,
                            border: `1px solid ${statusLabel[item.status].color}30`,
                          }}
                        >
                          {statusLabel[item.status].label}
                        </span>
                      </div>
                      <div className="text-xs font-mono mb-3" style={{ color: "#94a3b8" }}>
                        {item.location}
                      </div>

                      <div className="space-y-1">
                        {item.reasons.map((reason, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm" style={{ color: "#94a3b8" }}>
                            <span style={{ color: cfg.color }}>{">"}</span>
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs mb-2" style={{ color: "#475569" }}>{item.time}</div>
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
                        {item.recommendations.map((recommendation, index) => (
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
                      <button onClick={() => setAnalysisOpen(true)} className="btn-primary px-5 py-2 rounded-lg text-xs">
                        Analyze with AI
                      </button>
                      <button
                        onClick={() => postAlertAction("/alerts/resolve", "Unable to contact backend for resolution check.")}
                        disabled={isResolved}
                        className="btn-secondary px-5 py-2 rounded-lg text-xs"
                        style={{ opacity: isResolved ? 0.5 : 1 }}
                      >
                        Resolve
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          sendAlertEmail(item);
                        }}
                        disabled={emailDisabled}
                        className="px-4 py-2 rounded-lg text-xs font-mono transition-all"
                        style={{
                          background: "rgba(251,191,36,0.1)",
                          border: "1px solid rgba(251,191,36,0.3)",
                          color: "#fbbf24",
                          opacity: emailDisabled ? 0.5 : 1,
                        }}
                      >
                        {emailButtonLabel}
                      </button>
                    </div>
                    {item.priority !== "HIGH" && (
                      <div className="mt-3 text-xs" style={{ color: "#94a3b8" }}>
                        Email alerts are available for HIGH congestion only.
                      </div>
                    )}
                    {emailError && (
                      <div className="mt-3 text-xs" style={{ color: "#f87171" }}>
                        {emailError}
                      </div>
                    )}
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
                <div key={`${event.timestamp}-${index}`} className="flex items-start gap-3">
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
                    <div className="text-xs mt-0.5" style={{ color: "#e2e8f0" }}>{event.event_type}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{event.description}</div>
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
              { label: "Active Alerts", value: summary.active_alerts.toString(), color: "#f87171" },
              { label: "Under Investigation", value: summary.under_investigation.toString(), color: "#fbbf24" },
              { label: "Resolved Today", value: summary.resolved_today.toString(), color: "#34d399" },
              { label: "MTTR", value: mttrSummary, color: "#38bdf8" },
              { label: "AI Confidence", value: `${summary.ai_accuracy.toFixed(1)}%`, color: "#a78bfa" },
              { label: "Escalations", value: summary.escalation_count.toString(), color: "#fbbf24" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
                <span className="text-xs" style={{ color: "#64748b" }}>{item.label}</span>
                <span className="font-display text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {analysisOpen && analysis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAnalysisOpen(false)}
        >
          <div
            className="glass rounded-3xl max-w-2xl w-full p-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setAnalysisOpen(false)}
              aria-label="Close AI analysis"
              className="absolute top-4 right-4 text-xl font-bold"
              style={{ color: "#94a3b8" }}
            >
              ×
            </button>
            <h2 className="font-display text-xl font-bold mb-4" style={{ color: "#f8fafc" }}>
              AI Analysis
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {analysisItems.map((item) => (
                <div key={item.label} className="rounded-2xl p-4" style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(56,189,248,0.12)" }}>
                  <div className="text-xs text-slate-400 mb-2">{item.label}</div>
                  <div className="font-display text-sm font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3 mb-6">
              {[
                { label: "Risk Summary", value: analysis.risk_summary },
                { label: "Root Cause", value: analysis.root_cause },
                { label: "Expected Impact", value: analysis.expected_impact },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl p-4" style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(56,189,248,0.12)" }}>
                  <div className="text-xs text-slate-400 mb-2">{item.label}</div>
                  <div className="text-sm" style={{ color: "#e2e8f0" }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-mono text-xs text-slate-400 uppercase mb-3">AI Recommendations</div>
              <div className="space-y-3">
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="rounded-2xl p-4" style={{ background: "rgba(30,41,59,0.85)", border: "1px solid rgba(56,189,248,0.12)" }}>
                    <div className="text-sm" style={{ color: "#e2e8f0" }}>{recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
