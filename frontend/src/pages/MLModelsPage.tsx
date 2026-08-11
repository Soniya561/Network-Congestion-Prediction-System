import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/api.ts";

interface AnalyticsMetrics {
  available: boolean;
  message: string | null;
  model_name: string | null;
  registered_model_name: string | null;
  model_version: string | null;
  run_id: string | null;
  evaluation_timestamp_utc: string | null;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  n_estimators: string | null;
  random_state: string | null;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}

function formatTimestamp(value: string | null) {
  return value === null ? "—" : new Date(value).toLocaleString("en-IN", { hour12: false });
}

export default function MLModelsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadAnalytics = async () => {
      try {
        const response = await api.get<AnalyticsMetrics>("/analytics");
        if (!active) return;
        setAnalytics(response.data);
        setLoadError(response.data.available ? null : "MLflow evaluation could not be loaded");
      } catch (error) {
        console.error("Unable to load MLflow analytics data", error);
        if (active) {
          setAnalytics(null);
          setLoadError("MLflow evaluation could not be loaded");
        }
      }
    };

    void loadAnalytics();
    const intervalId = window.setInterval(() => void loadAnalytics(), 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const radarData = useMemo(() => {
    if (!analytics?.available) return [];
    return [
      { metric: "Accuracy", value: analytics.accuracy },
      { metric: "Precision", value: analytics.precision },
      { metric: "Recall", value: analytics.recall },
      { metric: "F1", value: analytics.f1_score },
    ];
  }, [analytics]);
  const chartData = useMemo(
    () => analytics?.available && analytics.accuracy !== null && analytics.f1_score !== null
      ? [{ name: analytics.model_name || "Random Forest", Accuracy: analytics.accuracy, F1: analytics.f1_score }]
      : [],
    [analytics],
  );

  const modelName = analytics?.model_name || "Random Forest";
  const metricRows = [
    { label: "Accuracy", value: analytics?.accuracy ?? null },
    { label: "Precision", value: analytics?.precision ?? null },
    { label: "Recall", value: analytics?.recall ?? null },
    { label: "F1 Score", value: analytics?.f1_score ?? null },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-purple" style={{ color: "#a78bfa" }}>ML MODEL PERFORMANCE</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>MLflow Evaluation Metrics</p>
        <p className="text-xs mt-1" style={{ color: "#475569" }}>Latest recorded evaluation for the Random Forest model.</p>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 border border-red-500/20 bg-red-500/10 text-red-100">{loadError}</div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <div className="glass rounded-xl p-5 card-hover relative overflow-hidden" style={{ border: "1px solid #38bdf850", boxShadow: "0 0 40px #38bdf820" }}>
          <div className="font-display text-base font-bold mb-1" style={{ color: "#38bdf8" }}>{modelName}</div>
          <div className="text-center py-4 mb-4 rounded-lg" style={{ background: "#38bdf810", border: "1px solid #38bdf825" }}>
            <div className="font-mono text-xs mb-1" style={{ color: "#64748b" }}>ACCURACY</div>
            <div className="font-display text-4xl font-black" style={{ color: "#38bdf8", textShadow: "0 0 20px #38bdf860" }}>{formatPercent(analytics?.accuracy ?? null)}</div>
          </div>
          <div className="space-y-2">
            {metricRows.slice(1).map((metric) => (
              <div key={metric.label} className="flex justify-between text-xs font-mono">
                <span style={{ color: "#64748b" }}>{metric.label}</span>
                <span style={{ color: "#38bdf8" }}>{formatPercent(metric.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>EVALUATION DETAILS</div>
          <div className="space-y-3 font-mono text-xs">
            <div><span style={{ color: "#64748b" }}>MLflow Run ID</span><div className="mt-1 break-all" style={{ color: "#e2e8f0" }}>{analytics?.run_id || "—"}</div></div>
            <div><span style={{ color: "#64748b" }}>Evaluation timestamp</span><div className="mt-1" style={{ color: "#e2e8f0" }}>{formatTimestamp(analytics?.evaluation_timestamp_utc ?? null)}</div></div>
            <div><span style={{ color: "#64748b" }}>Registered model</span><div className="mt-1" style={{ color: "#e2e8f0" }}>{analytics?.registered_model_name ? `${analytics.registered_model_name} v${analytics.model_version || "—"}` : "—"}</div></div>
            <div><span style={{ color: "#64748b" }}>n_estimators / random_state</span><div className="mt-1" style={{ color: "#e2e8f0" }}>{analytics?.n_estimators && analytics?.random_state ? `${analytics.n_estimators} / ${analytics.random_state}` : "—"}</div></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>MLFLOW EVALUATION METRICS</div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}><PolarGrid stroke="rgba(56,189,248,0.1)" /><PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} /><Radar name={modelName} dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.1} strokeWidth={2} /></RadarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-xs font-mono" style={{ color: "#64748b" }}>—</div>}
        </div>

        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>ACCURACY vs F1 SCORE</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%"><CartesianGrid stroke="rgba(56,189,248,0.06)" /><XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} /><YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} /><Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} /><Bar dataKey="Accuracy" radius={[4, 4, 0, 0]}><Cell fill="#38bdf8" opacity={0.85} /></Bar><Bar dataKey="F1" radius={[4, 4, 0, 0]}><Cell fill="#a78bfa" opacity={0.65} /></Bar></BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-xs font-mono" style={{ color: "#64748b" }}>—</div>}
        </div>
      </div>
    </div>
  );
}
