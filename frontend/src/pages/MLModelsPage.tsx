import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const models = [
  {
    name: "Random Forest",
    accuracy: 96.8,
    precision: 95.2,
    recall: 97.1,
    f1: 96.1,
    trainTime: "2.4s",
    color: "#38bdf8",
    best: false,
  },
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
    best: true,
  },
];

const confusionData = [
  { label: "TP", value: 1842, color: "#34d399", desc: "True Positive" },
  { label: "TN", value: 2103, color: "#38bdf8", desc: "True Negative" },
  { label: "FP", value: 29, color: "#fbbf24", desc: "False Positive" },
  { label: "FN", value: 26, color: "#f87171", desc: "False Negative" },
];

const radarData = [
  { metric: "Accuracy", RF: 96.8, XGB: 98.4, LGBM: 97.9 },
  { metric: "Precision", RF: 95.2, XGB: 98.1, LGBM: 97.4 },
  { metric: "Recall", RF: 97.1, XGB: 98.7, LGBM: 98.2 },
  { metric: "F1", RF: 96.1, XGB: 98.4, LGBM: 97.8 },
  { metric: "Speed", RF: 70, XGB: 85, LGBM: 95 },
];

const barData = models.map((m) => ({
  name: m.name.replace(" ", "\n"),
  Accuracy: m.accuracy,
  F1: m.f1,
}));

export default function MLModelsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-purple" style={{ color: "#a78bfa" }}>
          ML MODEL PERFORMANCE
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          AI model comparison — accuracy, precision, recall, and deployment metrics
        </p>
      </div>

      {/* Model cards */}
      <div className="grid grid-cols-3 gap-5">
        {models.map((m) => (
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
            MULTI-METRIC COMPARISON
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(56,189,248,0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <Radar name="Random Forest" dataKey="RF" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.1} strokeWidth={2} />
              <Radar name="XGBoost" dataKey="XGB" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="LightGBM" dataKey="LGBM" stroke="#34d399" fill="#34d399" fillOpacity={0.1} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {[["#38bdf8", "RF"], ["#a78bfa", "XGB"], ["#34d399", "LGBM"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="font-mono text-xs" style={{ color: "#64748b" }}>{l}</span>
              </div>
            ))}
          </div>
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
                {barData.map((_, i) => <Cell key={i} fill={models[i].color} opacity={0.85} />)}
              </Bar>
              <Bar dataKey="F1" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={models[i].color} opacity={0.4} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Confusion matrix */}
        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            CONFUSION MATRIX — XGBoost
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
              <span style={{ color: "#64748b" }}>Specificity</span>
              <span style={{ color: "#34d399" }}>98.6%</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "#64748b" }}>Matthews CC</span>
              <span style={{ color: "#38bdf8" }}>0.968</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "#64748b" }}>AUC-ROC</span>
              <span style={{ color: "#a78bfa" }}>0.994</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
