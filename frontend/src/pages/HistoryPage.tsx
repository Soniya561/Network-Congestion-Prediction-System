import { useEffect, useState } from "react";
import { Area, AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import api from "../api/api.ts";

interface AnalyticsData {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

interface MLOpsData {
  latency_history: Array<{ time: number; latency_ms: number }>;
}

interface LatencyPoint {
  time: string;
  latency: number;
}

interface ReportsData {
  summary: {
    total_events_30d: number | null;
    avg_resolution_minutes: number | null;
    prevented_outages: number | null;
  };
  traffic_history: Array<{
    created_at_utc: string;
    bandwidth_utilization_percent: number;
    predicted_congestion_level: string;
  }>;
  incident_history: Array<{
    id: number;
    created_at_utc: string;
    resolved_at_utc: string | null;
    congestion_level: string;
    confidence_percent: number;
    status: string;
    escalation_count: number;
    duration_minutes: number | null;
  }>;
}

const unavailable = "Unavailable";

function formatDuration(minutes: number | null) {
  if (minutes === null) return unavailable;
  return minutes < 1 ? "<1 min" : `${minutes.toFixed(1)} min`;
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-xs font-mono" style={{ color: "#64748b" }}>
      {message}
    </div>
  );
}

export default function HistoryPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);

  useEffect(() => {
    let active = true;

    const loadReportsData = async () => {
      const [analyticsResult, mlopsResult, reportsResult] = await Promise.allSettled([
        api.get<AnalyticsData>("/analytics"),
        api.get<MLOpsData>("/mlops/status"),
        api.get<ReportsData>("/reports"),
      ]);

      if (!active) return;

      setAnalytics(analyticsResult.status === "fulfilled" ? analyticsResult.value.data : null);
      setReports(reportsResult.status === "fulfilled" ? reportsResult.value.data : null);
      setLatencyHistory(
        mlopsResult.status === "fulfilled"
          ? mlopsResult.value.data.latency_history.map((point) => ({
              time: new Date(point.time * 1000).toLocaleTimeString("en-IN", { hour12: false }),
              latency: point.latency_ms,
            }))
          : [],
      );
    };

    void loadReportsData();
    const id = window.setInterval(() => void loadReportsData(), 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const modelEvaluation = analytics
    ? [{ model: analytics.model_name, accuracy: analytics.accuracy }]
    : [];
  const evaluationDetails = analytics
    ? `Precision ${analytics.precision.toFixed(2)}% · Recall ${analytics.recall.toFixed(2)}% · F1 ${analytics.f1_score.toFixed(2)}%`
    : unavailable;
  const kpis = [
    { label: "Total Events (30d)", value: reports?.summary.total_events_30d?.toString() ?? unavailable, color: "#38bdf8" },
    { label: "Avg Resolution Time", value: reports?.summary.avg_resolution_minutes !== null && reports?.summary.avg_resolution_minutes !== undefined ? `${reports.summary.avg_resolution_minutes.toFixed(1)} min` : unavailable, color: "#34d399" },
    { label: "Random Forest Evaluation Accuracy", value: analytics ? `${analytics.accuracy.toFixed(2)}%` : unavailable, color: "#a78bfa" },
    { label: "Prevented Outages", value: unavailable, color: "#22d3ee" },
  ];
  const recordedTelemetry = reports?.traffic_history.map((point) => ({
    ...point,
    time: new Date(point.created_at_utc).toLocaleString("en-IN", { hour12: false }),
  })) ?? [];
  const incidents = reports?.incident_history ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-cyan" style={{ color: "#22d3ee" }}>
          ALERT HISTORY &amp; ANALYTICS
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Dataset evaluation metrics and available runtime history
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-xl p-4 card-hover" style={{ border: `1px solid ${k.color}20` }}>
            <div className="font-mono text-xs mb-2" style={{ color: "#64748b", letterSpacing: "0.08em" }}>{k.label}</div>
            <div className="font-display text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            RECORDED NETWORK TELEMETRY
          </div>
          <div style={{ height: 200 }}>
            {recordedTelemetry.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recordedTelemetry}>
                  <defs>
                    <linearGradient id="recordedTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(56,189,248,0.06)" />
                  <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} unit="%" />
                  <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="bandwidth_utilization_percent" stroke="#38bdf8" strokeWidth={2} fill="url(#recordedTrafficGrad)" name="Bandwidth utilization %" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={reports ? "No recorded prediction telemetry yet" : "Historical traffic data unavailable"} />
            )}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-1" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            MODEL EVALUATION
          </div>
          <div className="text-xs font-mono mb-3" style={{ color: "#64748b" }}>Dataset / model evaluation</div>
          <div style={{ height: 200 }}>
            {modelEvaluation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelEvaluation} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid stroke="rgba(56,189,248,0.06)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 8 }} />
                  <YAxis type="category" dataKey="model" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} width={95} />
                  <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} name="Evaluation accuracy %">
                    {modelEvaluation.map((_, index) => <Cell key={index} fill="#38bdf8" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message="Model evaluation unavailable" />
            )}
          </div>
          <div className="text-xs font-mono mt-2" style={{ color: "#64748b" }}>{evaluationDetails}</div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
          PREDICTION LATENCY HISTORY
        </div>
        <div style={{ height: 140 }}>
          {latencyHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyHistory}>
                <CartesianGrid stroke="rgba(56,189,248,0.06)" />
                <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} />
                <YAxis tick={{ fill: "#475569", fontSize: 9 }} unit="ms" />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
                <Line type="monotone" dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot={false} name="Inference latency (ms)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState message="Latency history unavailable" />
          )}
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
          <div className="font-display text-xs font-bold" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            CONGESTION EVENT TIMELINE
          </div>
        </div>
        {incidents.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
                {["Timestamp", "Congestion Level", "Confidence", "Duration", "Status"].map((header) => (
                  <th key={header} className="px-5 py-3 text-left font-mono text-xs" style={{ color: "#475569", letterSpacing: "0.08em" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id} style={{ borderBottom: "1px solid rgba(56,189,248,0.05)" }}>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748b" }}>{new Date(incident.created_at_utc).toLocaleString("en-IN", { hour12: false })}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: "#94a3b8" }}>{incident.congestion_level}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748b" }}>{incident.confidence_percent.toFixed(2)}%</td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748b" }}>{formatDuration(incident.duration_minutes)}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#94a3b8" }}>{incident.status.toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-10 text-center text-xs font-mono" style={{ color: "#64748b" }}>
            {reports ? "No recorded congestion incidents yet" : "Historical congestion events unavailable"}
          </div>
        )}
      </div>
    </div>
  );
}
