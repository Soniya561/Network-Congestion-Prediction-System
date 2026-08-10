import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/api.ts";

type HealthStatus = "Healthy" | "Warning" | "Critical" | "Unavailable";

interface PipelineStep {
  label: string;
  status: string;
  color: string;
  icon: string;
  detail: string;
}

interface MLOpsStatus {
  model_version: string;
  deployment_status: string;
  model_health: HealthStatus;
  prediction_latency_ms: number | null;
  records_processed: number;
  total_predictions: number;
  successful_predictions: number;
  failed_predictions: number;
  last_prediction_time: number | null;
  feature_count: number | null;
  data_drift: number | null;
  drift_status: string;
  latency_history: Array<{ time: number; latency_ms: number }>;
  drift_history: Array<{ time: number; drift_score: number }>;
  alert_dispatch_status: string;
  last_prediction_level: string | null;
  pipeline: PipelineStep[];
  application_health: Array<{ name: string; status: HealthStatus }>;
  drift_threshold: number | null;
}

const unavailable = "Unavailable";
const healthColor = (status: string) => status === "Healthy" ? "#34d399" : status === "Warning" ? "#fbbf24" : "#f87171";
const formatTime = (value: number | null) => value === null ? unavailable : new Date(value * 1000).toLocaleString();
const formatChartTime = (value: number) => new Date(value * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function MLOpsPage() {
  const [status, setStatus] = useState<MLOpsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get<MLOpsStatus>("/mlops/status");
        if (mounted) {
          setStatus(response.data);
          setError(null);
        }
      } catch (requestError) {
        console.error("Unable to load MLOps status", requestError);
        if (mounted) setError("Monitoring data is unavailable because the backend could not be reached.");
      }
    };

    load();
    const intervalId = window.setInterval(load, 2000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const latencyData = status?.latency_history.map((point) => ({
    time: point.time,
    latency: point.latency_ms,
  })) ?? [];
  const driftData = status?.drift_history.map((point) => ({
    time: point.time,
    drift: point.drift_score,
    threshold: status.drift_threshold,
  })) ?? [];

  const kpis = [
    { label: "MODEL VERSION", value: status?.model_version ?? unavailable, color: "#a78bfa", icon: "🤖" },
    { label: "DEPLOYMENT", value: status?.deployment_status ?? unavailable, color: "#34d399", icon: "🚀" },
    { label: "PRED LATENCY", value: status?.prediction_latency_ms == null ? unavailable : `${status.prediction_latency_ms.toFixed(3)} ms`, color: "#38bdf8", icon: "⚡" },
    { label: "DATA DRIFT", value: status?.data_drift == null ? unavailable : `${status.data_drift.toFixed(4)} (${status.drift_status})`, color: "#34d399", icon: "📊" },
    { label: "MODEL HEALTH", value: status?.model_health ?? unavailable, color: healthColor(status?.model_health ?? unavailable), icon: "❤️" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-blue" style={{ color: "#38bdf8" }}>MLOPS MONITORING DASHBOARD</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Live Random Forest pipeline health and application activity</p>
      </div>

      {error && <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>{error}</div>}

      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => <div key={kpi.label} className="glass rounded-xl p-4 card-hover text-center" style={{ border: `1px solid ${kpi.color}20` }}>
          <div className="text-2xl mb-2">{kpi.icon}</div><div className="font-mono text-xs mb-1" style={{ color: "#64748b", letterSpacing: "0.08em" }}>{kpi.label}</div><div className="font-display text-sm font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
        </div>)}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="glass rounded-xl p-5"><div className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>AI PIPELINE FLOW</div><div className="space-y-3">
          {(status?.pipeline ?? []).map((step, index, steps) => <div key={step.label}><div className="rounded-lg p-3 flex items-center gap-3" style={{ background: `${step.color}08`, border: `1px solid ${step.color}25` }}><div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${step.color}15` }}>{step.icon}</div><div className="flex-1"><div className="text-xs font-mono font-bold" style={{ color: step.color }}>{step.label}</div><div className="text-xs" style={{ color: "#475569" }}>{step.detail}</div></div><span className="text-xs font-mono" style={{ color: healthColor(step.status) }}>{step.status.toUpperCase()}</span></div>{index < steps.length - 1 && <div className="flex justify-center my-1"><div className="w-px h-3" style={{ background: "rgba(56,189,248,0.2)" }} /></div>}</div>)}
          {!status && <div className="text-sm" style={{ color: "#64748b" }}>Unavailable</div>}
        </div></div>

        <div className="space-y-5">
          <div className="glass rounded-xl p-5">
            <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>PREDICTION LATENCY (ms)</div>
            {latencyData.length ? <ResponsiveContainer width="100%" height={175}>
              <LineChart data={latencyData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="rgba(56,189,248,0.10)" />
                <XAxis dataKey="time" tickFormatter={formatChartTime} minTickGap={32} tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis width={52} tickFormatter={(value) => `${Number(value).toFixed(1)}`} tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip labelFormatter={(value) => `Recorded: ${formatChartTime(Number(value))}`} formatter={(value) => [`${Number(value).toFixed(3)} ms`, "Inference latency"]} contentStyle={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(56,189,248,0.45)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} labelStyle={{ color: "#e2e8f0" }} itemStyle={{ color: "#38bdf8" }} />
                <Line type="monotone" dataKey="latency" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: "#38bdf8" }} activeDot={{ r: 5 }} name="Inference latency" />
              </LineChart>
            </ResponsiveContainer> : <div className="h-[175px] flex items-center justify-center text-xs" style={{ color: "#64748b" }}>No real inference measurements yet</div>}
          </div>
          <div className="glass rounded-xl p-5">
            <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>DATA DRIFT MONITOR</div>
            {driftData.length ? <ResponsiveContainer width="100%" height={175}>
              <AreaChart data={driftData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="rgba(56,189,248,0.10)" />
                <XAxis dataKey="time" tickFormatter={formatChartTime} minTickGap={32} tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis width={52} tickFormatter={(value) => Number(value).toFixed(3)} tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip labelFormatter={(value) => `Recorded: ${formatChartTime(Number(value))}`} formatter={(value, name) => [Number(value).toFixed(4), name === "threshold" ? "Warning threshold" : "Drift score"]} contentStyle={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(52,211,153,0.45)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} labelStyle={{ color: "#e2e8f0" }} />
                <Area type="monotone" dataKey="drift" stroke="#34d399" strokeWidth={2} fill="rgba(52,211,153,0.2)" name="drift" activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="threshold" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="threshold" />
              </AreaChart>
            </ResponsiveContainer> : <div className="h-[175px] flex items-center justify-center text-xs" style={{ color: "#64748b" }}>{status?.drift_status === "Unavailable" ? "Data Drift: Unavailable" : "No real drift measurements yet"}</div>}
          </div>
        </div>

        <div className="glass rounded-xl p-5"><div className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>APPLICATION HEALTH</div><div className="space-y-4">{(status?.application_health ?? []).map((check) => <div key={check.name} className="flex items-center justify-between rounded-lg p-3" style={{ background: "rgba(15,23,42,0.4)" }}><span className="font-mono text-xs" style={{ color: "#94a3b8" }}>{check.name}</span><span className="font-mono text-xs" style={{ color: healthColor(check.status) }}>{check.status.toUpperCase()}</span></div>)}{!status && <div className="text-sm" style={{ color: "#64748b" }}>Unavailable</div>}</div>
          <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}><div className="flex items-center justify-between mb-2"><span className="font-mono text-xs" style={{ color: "#64748b" }}>PREDICTION ACTIVITY</span><span className="font-mono text-xs" style={{ color: "#38bdf8" }}>{status?.last_prediction_level ?? unavailable}</span></div><div className="grid grid-cols-2 gap-2 text-center">{[[status?.total_predictions, "Total Predictions"], [status?.successful_predictions, "Successful"], [status?.failed_predictions, "Failed"], [status?.records_processed, "Records Processed"]].map(([value, label]) => <div key={String(label)}><div className="font-display text-base font-bold" style={{ color: "#38bdf8" }}>{value ?? unavailable}</div><div className="font-mono text-xs" style={{ color: "#475569" }}>{label}</div></div>)}</div><div className="mt-3 text-xs" style={{ color: "#64748b" }}>Last prediction: {formatTime(status?.last_prediction_time ?? null)}</div></div>
        </div>
      </div>
    </div>
  );
}
