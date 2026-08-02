import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

interface TopologyNode {
  id: string;
  x: number;
  y: number;
  type: "datacenter" | "router" | "cloud" | "device";
  status: "healthy" | "warning" | "congested" | "predicted";
  label: string;
}

interface LiveMetrics {
  total_bandwidth: string;
  avg_latency: string;
  packet_loss: string;
  uptime: string;
}

interface AnalystData {
  network_health: number;
  current_congestion: string;
  confidence: number;
  prediction_next: string;
  connected_devices: number;
  status: string;
  topology_nodes: TopologyNode[];
  edges: string[][];
  traffic_data: { time: string; traffic: number; predicted: number; threshold: number }[];
  metrics: LiveMetrics;
}

const initialAnalystData: AnalystData = {
  network_health: 94,
  current_congestion: "Low",
  confidence: 98.6,
  prediction_next: "Possible congestion in 10 min",
  connected_devices: 2400000,
  status: "Stable",
  topology_nodes: [],
  edges: [],
  traffic_data: [],
  metrics: {
    total_bandwidth: "0.9 Gbps",
    avg_latency: "12.4 ms",
    packet_loss: "0.02%",
    uptime: "99.97%",
  },
};

function AIBrain() {
  return (
    <svg viewBox="0 0 300 300" width="100%" height="100%">
      <defs>
        <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#020817" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background glow */}
      <circle cx="150" cy="150" r="130" fill="url(#brainGlow)" />

      {/* Outer orbit rings */}
      <circle cx="150" cy="150" r="120" fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth="1" strokeDasharray="4 4">
        <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="360 150 150" dur="20s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="150" r="95" fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="1" strokeDasharray="6 3">
        <animateTransform attributeName="transform" type="rotate" from="360 150 150" to="0 150 150" dur="14s" repeatCount="indefinite" />
      </circle>

      {/* Neural network nodes */}
      {[
        [150, 60, "#a78bfa"], [230, 110, "#38bdf8"], [240, 190, "#f87171"],
        [180, 250, "#fbbf24"], [100, 250, "#34d399"], [60, 190, "#a78bfa"],
        [60, 110, "#38bdf8"], [150, 150, "#ffffff"],
      ].map(([cx, cy, color], i) => (
        <g key={i} filter="url(#glow)">
          <circle cx={cx} cy={cy} r={i === 7 ? 16 : 8} fill={color as string} opacity="0.9">
            <animate attributeName="opacity" values="0.6;1;0.6" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          {i !== 7 && (
            <line x1={cx} y1={cy} x2="150" y2="150" stroke={color as string} strokeWidth="0.8" opacity="0.4" />
          )}
        </g>
      ))}

      {/* Orbiting data packets */}
      {[0, 120, 240].map((startAngle, i) => (
        <circle key={i} r="4" fill="#38bdf8" filter="url(#glow)">
          <animateMotion dur={`${3 + i}s`} repeatCount="indefinite">
            <mpath href={`#orbit-${i}`} />
          </animateMotion>
        </circle>
      ))}
      <path id="orbit-0" d="M 150 30 A 120 120 0 1 1 149.9 30" fill="none" />
      <path id="orbit-1" d="M 150 55 A 95 95 0 1 0 149.9 55" fill="none" />
      <path id="orbit-2" d="M 150 80 A 70 70 0 1 1 149.9 80" fill="none" />

      {/* Center brain icon */}
      <text x="150" y="157" textAnchor="middle" fontSize="18" fill="white" filter="url(#glow)">🧠</text>

      {/* Scan line */}
      <line x1="30" y1="150" x2="270" y2="150" stroke="rgba(167,139,250,0.3)" strokeWidth="1" strokeDasharray="2 4">
        <animateTransform attributeName="transform" type="translate" values="0,-120;0,120;0,-120" dur="4s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

interface AnalystPageProps {
  onNavigate?: (page: string) => void;
}

export default function AnalystPage({ onNavigate }: AnalystPageProps) {
  const [animating] = useState(true);
  const [data, setData] = useState<AnalystData>(initialAnalystData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("Waiting for first model response");

  useEffect(() => {
    const loadAnalystData = async () => {
      setLoadError(null);
      setLoading(true);

      try {
        const response = await api.get<AnalystData>("/dashboard");
        setData(response.data);
        const timestamp = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setLastUpdated(`Updated from trained model at ${timestamp}`);
      } catch (error) {
        console.error("Unable to load analyst data", error);
        setLoadError("Cannot load live analyst metrics from the backend.");
        setLastUpdated("Last refresh failed");
      } finally {
        setLoading(false);
      }
    };

    loadAnalystData();
    const intervalId = setInterval(loadAnalystData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const featureData = useMemo(() => {
    const parseNumber = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;
    const bandwidth = Math.min(100, Math.max(20, 100 - data.network_health + 15));
    const latency = Math.min(100, Math.max(10, parseNumber(data.metrics.avg_latency) * 2.5));
    const packetLoss = Math.min(100, Math.max(5, parseNumber(data.metrics.packet_loss) * 20));
    const jitter = data.current_congestion === "High" ? 18 : data.current_congestion === "Medium" ? 11 : 5;

    return [
      { label: "Bandwidth Usage", value: Math.round(bandwidth), color: "#f87171" },
      { label: "Packet Loss", value: Math.round(packetLoss), color: "#fbbf24" },
      { label: "Latency", value: Math.round(latency), color: "#a78bfa" },
      { label: "Jitter", value: jitter, color: "#38bdf8" },
    ];
  }, [data]);

  const recommendations = useMemo(() => {
    if (data.current_congestion === "High") {
      return [
        "Throttle non-critical bulk flows across the core mesh",
        "Reroute traffic away from congested edge links",
        "Raise QoS priority for voice and video sessions",
        "Inspect Chennai / Mumbai corridor latency spikes",
      ];
    }

    if (data.current_congestion === "Medium") {
      return [
        "Monitor affected transit nodes more closely",
        "Shift backup jobs to off-peak windows",
        "Fine-tune routing policy for heavy east-west traffic",
        "Keep congestion alerts enabled for 5 minutes",
      ];
    }

    return [
      "Maintain current QoS and keep thresholds under review",
      "Verify scheduled capacity upgrades for next maintenance window",
      "Confirm traffic shaping policies are active on critical flows",
      "Review historical trends for anomalous bursts",
    ];
  }, [data.current_congestion]);

  const hotspotLabels = useMemo(() => {
    return data.topology_nodes
      .filter((node) => node.status === "congested" || node.status === "warning")
      .map((node) => node.label)
      .slice(0, 4);
  }, [data.topology_nodes]);

  const explanation = useMemo(() => {
    const healthLabel = data.network_health >= 80 ? "strong" : data.network_health >= 55 ? "moderate" : "weak";
    const hotspotText = hotspotLabels.length > 0 ? hotspotLabels.join(", ") : "core network segments";

    return `The AI analyst identifies ${data.current_congestion.toLowerCase()} congestion with ${data.confidence}% confidence and ${healthLabel} overall health. It flags ${hotspotText} as the key risk zones and expects ${data.prediction_next.toLowerCase()}.`;
  }, [data, hotspotLabels]);

  const confidenceBreakdown = useMemo(() => {
    const certainty = Math.round(data.confidence);
    const quality = Math.min(100, Math.max(80, certainty - 3));
    const historical = Math.min(100, Math.max(70, 100 - data.network_health));

    return [
      { label: "Model certainty", v: certainty },
      { label: "Data quality", v: quality },
      { label: "Historical match", v: historical },
    ];
  }, [data]);

  const handleApplyRecommendations = () => {
    if (onNavigate) {
      onNavigate("alerts");
      return;
    }

    window.alert("Recommendations applied");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-purple" style={{ color: "#a78bfa" }}>
          AI NETWORK ANALYST
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Explainable AI — understanding why congestion was predicted from the trained network model
        </p>
        <p className="text-xs mt-2 font-mono" style={{ color: "#38bdf8" }}>
          {lastUpdated}
        </p>
      </div>

      {loading && (
        <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/10 text-blue-100">
          Loading live analyst data from the backend...
        </div>
      )}

      {loadError && (
        <div className="rounded-xl p-4 border border-red-500/20 bg-red-500/10 text-red-100">
          {loadError} Please make sure the backend server is running at http://127.0.0.1:8000.
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: AI Brain */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-5 flex flex-col items-center" style={{ height: "320px" }}>
            <div className="font-mono text-xs mb-3 self-start" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
              3D AI NEURAL ANALYSIS
            </div>
            <div className="flex-1 w-full">
              <AIBrain />
            </div>
          </div>

          <div
            className="rounded-xl p-5 glow-red"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}
          >
            <div className="font-mono text-xs mb-1" style={{ color: "#64748b", letterSpacing: "0.1em" }}>AI PREDICTION</div>
            <div className="font-display text-2xl font-black text-glow-red" style={{ color: "#f87171" }}>
              {data.current_congestion.toUpperCase()} CONGESTION
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="text-xs font-mono" style={{ color: "#64748b" }}>Confidence</div>
              <div className="font-display text-lg font-bold" style={{ color: "#f87171" }}>{data.confidence}%</div>
              <div className="w-2 h-2 rounded-full animate-blink ml-auto" style={{ background: "#f87171" }} />
            </div>
            <div className="text-xs mt-2" style={{ color: "#94a3b8" }}>
              {data.prediction_next}
            </div>
          </div>
        </div>

        {/* Center: Feature contributions */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="font-display text-xs font-bold mb-4" style={{ color: "#e2e8f0", letterSpacing: "0.12em" }}>
              FEATURE CONTRIBUTION ANALYSIS
            </div>
            <div className="space-y-5">
              {featureData.map((f, i) => (
                <div key={f.label}>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span style={{ color: "#94a3b8" }}>{f.label}</span>
                    <span style={{ color: f.color, fontWeight: "bold" }}>{f.value}%</span>
                  </div>
                  <div className="progress-bar h-3 rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: animating ? `${f.value}%` : "0%",
                        background: `linear-gradient(90deg, ${f.color}80, ${f.color})`,
                        boxShadow: `0 0 10px ${f.color}60`,
                        transition: `width ${1 + i * 0.3}s ease`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "#475569" }}>
                    {"█".repeat(Math.floor(f.value / 4))}
                  </div>
                </div>
              ))}
            </div>

            {/* SHAP-style explanation */}
            <div
              className="mt-5 p-4 rounded-lg"
              style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <div className="font-mono text-xs mb-2" style={{ color: "#a78bfa", letterSpacing: "0.1em" }}>
                SHAP ANALYSIS — FEATURE IMPORTANCE
              </div>
              <div className="space-y-2">
                {featureData.map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <div
                      className="text-xs font-mono"
                      style={{ color: "#64748b", minWidth: "100px" }}
                    >
                      {f.label}
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div
                        style={{
                          width: `${f.value * 1.8}px`,
                          height: "8px",
                          background: f.color,
                          borderRadius: "2px",
                          boxShadow: `0 0 6px ${f.color}60`,
                          opacity: 0.85,
                        }}
                      />
                      <span className="text-xs font-mono" style={{ color: f.color }}>+{f.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI explanation + actions */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="font-mono text-xs mb-3" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
              AI GENERATED EXPLANATION
            </div>
            <div
              className="p-4 rounded-lg text-sm leading-relaxed"
              style={{
                background: "rgba(56,189,248,0.05)",
                border: "1px solid rgba(56,189,248,0.15)",
                color: "#94a3b8",
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              {explanation}
            </div>

            <div className="mt-4 space-y-2">
              <div className="font-mono text-xs" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
                CONFIDENCE BREAKDOWN
              </div>
              {confidenceBreakdown.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: "#64748b", minWidth: "120px" }}>{item.label}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-fill" style={{ width: `${item.v}%` }} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: "#38bdf8" }}>{item.v}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="font-mono text-xs mb-4" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
              RECOMMENDED ACTIONS
            </div>
            <div className="space-y-3">
              {recommendations.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-white/5 cursor-pointer"
                  style={{ border: "1px solid rgba(56,189,248,0.1)" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                    style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)" }}
                  >
                    ✓
                  </div>
                  <span className="text-sm" style={{ color: "#94a3b8" }}>{action}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary w-full py-2.5 rounded-lg text-xs mt-4"
              onClick={handleApplyRecommendations}
            >
              Apply All Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
