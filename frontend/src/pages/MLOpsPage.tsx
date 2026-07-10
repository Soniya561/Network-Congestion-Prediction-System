import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const latencyData = Array.from({ length: 20 }, (_, i) => ({
  t: `T-${20 - i}`,
  latency: 40 + Math.sin(i * 0.7) * 8 + Math.random() * 4,
  p99: 55 + Math.sin(i * 0.5) * 6 + Math.random() * 3,
}));

const driftData = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${14 - i}`,
  drift: Math.max(0, 0.02 + Math.sin(i * 0.4) * 0.015 + Math.random() * 0.01),
  threshold: 0.05,
}));

const pipeline = [
  { label: "Data Ingestion", status: "running", color: "#34d399", icon: "⬇", detail: "2.4M records/min" },
  { label: "Feature Engineering", status: "running", color: "#38bdf8", icon: "⚙", detail: "12 features active" },
  { label: "Model Inference", status: "running", color: "#a78bfa", icon: "🧠", detail: "XGBoost v1.0" },
  { label: "Post Processing", status: "running", color: "#34d399", icon: "✓", detail: "Threshold: 0.72" },
  { label: "Alert Dispatch", status: "running", color: "#fbbf24", icon: "📡", detail: "Kafka → NOC" },
];

const containers = [
  { name: "model-server-01", cpu: 34, mem: 58, status: "healthy" },
  { name: "model-server-02", cpu: 28, mem: 52, status: "healthy" },
  { name: "feature-eng-01", cpu: 61, mem: 74, status: "warning" },
  { name: "data-ingest-01", cpu: 22, mem: 41, status: "healthy" },
  { name: "alert-dispatch-01", cpu: 15, mem: 33, status: "healthy" },
];

export default function MLOpsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-blue" style={{ color: "#38bdf8" }}>
          MLOPS MONITORING DASHBOARD
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          AI pipeline health, model deployment status, and infrastructure telemetry
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "MODEL VERSION", value: "XGBoost v1.0", color: "#a78bfa", icon: "🤖" },
          { label: "DEPLOYMENT", value: "Production", color: "#34d399", icon: "🚀" },
          { label: "PRED LATENCY", value: "45 ms", color: "#38bdf8", icon: "⚡" },
          { label: "DATA DRIFT", value: "Normal", color: "#34d399", icon: "📊" },
          { label: "MODEL HEALTH", value: "98%", color: "#34d399", icon: "❤️" },
        ].map((k) => (
          <div
            key={k.label}
            className="glass rounded-xl p-4 card-hover text-center"
            style={{ border: `1px solid ${k.color}20` }}
          >
            <div className="text-2xl mb-2">{k.icon}</div>
            <div className="font-mono text-xs mb-1" style={{ color: "#64748b", letterSpacing: "0.08em" }}>{k.label}</div>
            <div className="font-display text-sm font-bold" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* AI Pipeline */}
        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            AI PIPELINE FLOW
          </div>
          <div className="space-y-3">
            {pipeline.map((step, i) => (
              <div key={step.label}>
                <div
                  className="rounded-lg p-3 flex items-center gap-3"
                  style={{ background: `${step.color}08`, border: `1px solid ${step.color}25` }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `${step.color}15` }}
                  >
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-mono font-bold" style={{ color: step.color }}>{step.label}</div>
                    <div className="text-xs" style={{ color: "#475569" }}>{step.detail}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: step.color }} />
                    <span className="text-xs font-mono" style={{ color: step.color }}>LIVE</span>
                  </div>
                </div>
                {i < pipeline.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="w-px h-3" style={{ background: "rgba(56,189,248,0.2)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Latency chart */}
        <div className="space-y-5">
          <div className="glass rounded-xl p-5">
            <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
              PREDICTION LATENCY (ms)
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={latencyData}>
                <CartesianGrid stroke="rgba(56,189,248,0.06)" />
                <XAxis dataKey="t" tick={{ fill: "#475569", fontSize: 8, fontFamily: "JetBrains Mono" }} interval={4} />
                <YAxis tick={{ fill: "#475569", fontSize: 8 }} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "10px" }} />
                <Line type="monotone" dataKey="latency" stroke="#38bdf8" strokeWidth={2} dot={false} name="P50 (ms)" />
                <Line type="monotone" dataKey="p99" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="P99 (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
              DATA DRIFT MONITOR
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={driftData}>
                <defs>
                  <linearGradient id="driftGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(56,189,248,0.06)" />
                <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 8, fontFamily: "JetBrains Mono" }} interval={3} />
                <YAxis tick={{ fill: "#475569", fontSize: 8 }} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "10px" }} />
                <Area type="monotone" dataKey="drift" stroke="#34d399" strokeWidth={2} fill="url(#driftGrad)" name="Drift Score" />
                <Line type="monotone" dataKey="threshold" stroke="#f87171" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Threshold" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Container monitoring */}
        <div className="glass rounded-xl p-5">
          <div className="font-display text-xs font-bold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
            CONTAINER HEALTH
          </div>
          <div className="space-y-4">
            {containers.map((c) => {
              const statusColor = c.status === "healthy" ? "#34d399" : "#fbbf24";
              return (
                <div key={c.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs" style={{ color: "#94a3b8" }}>{c.name}</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                      <span className="font-mono text-xs" style={{ color: statusColor, textTransform: "uppercase" }}>{c.status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-0.5" style={{ color: "#475569" }}>
                        <span>CPU</span><span style={{ color: c.cpu > 55 ? "#fbbf24" : "#38bdf8" }}>{c.cpu}%</span>
                      </div>
                      <div className="progress-bar h-1.5">
                        <div className="progress-fill" style={{ width: `${c.cpu}%`, background: c.cpu > 55 ? "#fbbf24" : "#38bdf8" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-0.5" style={{ color: "#475569" }}>
                        <span>MEM</span><span style={{ color: c.mem > 70 ? "#fbbf24" : "#34d399" }}>{c.mem}%</span>
                      </div>
                      <div className="progress-bar h-1.5">
                        <div className="progress-fill" style={{ width: `${c.mem}%`, background: c.mem > 70 ? "#fbbf24" : "#34d399" }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs" style={{ color: "#64748b" }}>CLUSTER STATUS</span>
              <span className="font-mono text-xs" style={{ color: "#34d399" }}>HEALTHY</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["5", "Pods"], ["2", "Nodes"], ["0", "Restarts"]].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display text-base font-bold" style={{ color: "#38bdf8" }}>{v}</div>
                  <div className="font-mono text-xs" style={{ color: "#475569" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
