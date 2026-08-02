import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import api from "../api/api";

const initialLatency = Array.from({ length: 20 }, (_, i) => ({ t: `T-${20 - i}`, latency: 20 + i, p99: 40 + i }));
const initialDrift = Array.from({ length: 14 }, (_, i) => ({ day: `D-${14 - i}`, drift: 0.01, threshold: 0.05 }));


export default function MLOpsPage() {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [latencyData, setLatencyData] = useState<any[]>(initialLatency);
  const [driftData, setDriftData] = useState<any[]>(initialDrift);
  const [containers, setContainers] = useState<any[]>([]);
  const [cluster, setCluster] = useState<any>({ pods: 0, nodes: 0, restarts: 0, status: "UNKNOWN" });
  const [kpis, setKpis] = useState<any>({ model_version: "-", deployment: "-", pred_latency_ms: "-", data_drift: "-", model_health: "-" });

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get("/mlops");
        const d = r.data;
        setPipeline(d.pipeline || []);
        setLatencyData(d.latency_data || initialLatency);
        setDriftData(d.drift_data || initialDrift);
        setContainers(d.containers || []);
        setCluster(d.cluster || { pods: 0, nodes: 0, restarts: 0, status: "UNKNOWN" });
        setKpis({ model_version: d.model_version, deployment: d.deployment, pred_latency_ms: d.pred_latency_ms, data_drift: d.data_drift, model_health: "-" });
      } catch (e) {
        console.error("Unable to load mlops data", e);
      }
    };

    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

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
          { label: "MODEL VERSION", value: kpis.model_version, color: "#a78bfa", icon: "🤖" },
          { label: "DEPLOYMENT", value: kpis.deployment, color: "#34d399", icon: "🚀" },
          { label: "PRED LATENCY", value: `${kpis.pred_latency_ms} ms`, color: "#38bdf8", icon: "⚡" },
          { label: "DATA DRIFT", value: kpis.data_drift, color: "#34d399", icon: "📊" },
          { label: "MODEL HEALTH", value: kpis.model_health, color: "#34d399", icon: "❤️" },
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
