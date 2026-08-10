import { useEffect, useMemo, useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import api from "../api/api.ts";

interface AnalyticsMetrics {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  classes: string[];
  confusion_matrix: Array<{ label: string; value: number; color: string; desc: string }>;
  radar_metrics: Array<{ metric: string; value: number }>;
}

const initialAnalytics: AnalyticsMetrics = {
  model_name: "Random Forest",
  accuracy: 96.8,
  precision: 95.2,
  recall: 97.1,
  f1_score: 96.1,
  classes: ["Low", "Medium", "High"],
  confusion_matrix: [
    { label: "Low", value: 1842, color: "#34d399", desc: "Correctly predicted Low" },
    { label: "Medium", value: 2103, color: "#38bdf8", desc: "Correctly predicted Medium" },
    { label: "High", value: 2001, color: "#a78bfa", desc: "Correctly predicted High" },
  ],
  radar_metrics: [
    { metric: "Accuracy", value: 96.8 },
    { metric: "Precision", value: 95.2 },
    { metric: "Recall", value: 97.1 },
    { metric: "F1", value: 96.1 },
    { metric: "Stability", value: 97.9 },
  ],
};

export default function MLModelsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>(initialAnalytics);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoadError(null);
      setLoading(true);

      try {
        const response = await api.get<AnalyticsMetrics>("/analytics");
        setAnalytics(response.data);
      } catch (error) {
        console.error("Unable to load analytics data", error);
        setLoadError("Unable to load the trained model performance metrics right now.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
    const intervalId = setInterval(loadAnalytics, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const staticModels = [
    {
      name: "LightGBM",
      accuracy: 97.9,
      precision: 97.4,
      recall: 98.2,
      f1: 97.8,
      trainTime: "0.9s",
      color: "#34d399",
      best: false,
    },
    {
      name: "XGBoost",
      accuracy: 98.4,
      precision: 98.1,
      recall: 98.7,
      f1: 98.4,
      trainTime: "1.8s",
      color: "#a78bfa",
      best: false,
    },
  ];

  const modelCards = useMemo(
    () => [
      {
        name: analytics.model_name,
        accuracy: analytics.accuracy,
        precision: analytics.precision,
        recall: analytics.recall,
        f1: analytics.f1_score,
        trainTime: "Live",
        color: "#38bdf8",
        best: true,
      },
      ...staticModels,
    ],
    [analytics],
  );

  const radarData = useMemo(() => analytics.radar_metrics, [analytics.radar_metrics]);
  const barData = useMemo(
    () => modelCards.map((m) => ({ name: m.name.replace(" ", "\n"), Accuracy: m.accuracy, F1: m.f1 })),
    [modelCards],
  );

  const confusionData = analytics.confusion_matrix;
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-purple" style={{ color: "#a78bfa" }}>
          ML MODEL PERFORMANCE
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Live metrics from your trained network congestion model and dataset
        </p>
      </div>

      {loading && (
        <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/10 text-blue-100">
          Loading live analytics from the backend...
        </div>
      )}

      {loadError && (
        <div className="rounded-xl p-4 border border-red-500/20 bg-red-500/10 text-red-100">
          {loadError}
        </div>
      )}

      {/* Model cards */}
      <div className="grid grid-cols-3 gap-5">
        {modelCards.map((m) => (
          <div
            key={m.name}
            className="glass rounded-xl p-5 card-hover relative overflow-hidden"
            style={{
              border: `1px solid ${m.color}${m.best ? "50" : "25"}`,
              boxShadow: m.best ? `0 0 40px ${m.color}20` : undefined,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-base font-bold mb-0.5" style={{ color: m.color }}>
                  {m.name}
                </div>
                <div className="font-mono text-xs" style={{ color: "#475569" }}>
                  Training time: {m.trainTime}
                </div>
              </div>
              {m.best && (
                <div
                  className="px-2 py-1 rounded-lg text-xs font-mono font-bold flex-shrink-0 text-center"
                  style={{ background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}50`, lineHeight: 1.4 }}
                >
                  ⭐<br />BEST
                </div>
              )}
            </div>

            <div
              className="text-center py-4 mb-4 rounded-lg"
              style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}
            >
              <div className="font-mono text-xs mb-1" style={{ color: "#64748b" }}>ACCURACY</div>
              <div
                className="font-display text-4xl font-black"
                style={{ color: m.color, textShadow: `0 0 20px ${m.color}60` }}
              >
                {m.accuracy}%
              </div>
            </div>

            <div className="space-y-2">
              {[
                { label: "Precision", value: m.precision },
                { label: "Recall", value: m.recall },
                { label: "F1 Score", value: m.f1 },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span style={{ color: "#64748b" }}>{s.label}</span>
                    <span style={{ color: m.color }}>{s.value}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${s.value}%`, background: m.color, boxShadow: `0 0 8px ${m.color}50` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Radar comparison */}
        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            LIVE MODEL METRICS
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(56,189,248,0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <Radar name={analytics.model_name} dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.1} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            ACCURACY vs F1 SCORE
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barCategoryGap="30%">
              <CartesianGrid stroke="rgba(56,189,248,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <YAxis domain={[94, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
              <Bar dataKey="Accuracy" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={(modelCards[i] && modelCards[i].color) || "#38bdf8"} opacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="F1" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={(modelCards[i] && modelCards[i].color) || "#a78bfa"} opacity={0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Confusion matrix */}
        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            CONFUSION MATRIX — {analytics.model_name.toUpperCase()}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {confusionData.map((c) => (
              <div
                key={c.label}
                className="rounded-lg p-4 text-center"
                style={{ background: `${c.color}10`, border: `1px solid ${c.color}30` }}
              >
                <div className="font-display text-2xl font-black" style={{ color: c.color }}>
                  {c.value.toLocaleString()}
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: "#64748b" }}>{c.label}</div>
                <div className="text-xs" style={{ color: "#475569" }}>{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "#64748b" }}>Accuracy</span>
              <span style={{ color: "#34d399" }}>{analytics.accuracy.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "#64748b" }}>Precision</span>
              <span style={{ color: "#38bdf8" }}>{analytics.precision.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "#64748b" }}>F1 Score</span>
              <span style={{ color: "#a78bfa" }}>{analytics.f1_score.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
