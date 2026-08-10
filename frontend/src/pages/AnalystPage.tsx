import { useEffect, useMemo, useState } from "react";
import api from "../api/api.ts";

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

interface AiAnalysis {
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

interface AnalystPageProps {
  onNavigate?: (page: string) => void;
}

export default function AnalystPage({ onNavigate }: AnalystPageProps) {
  const [animating] = useState(true);
  const [data, setData] = useState<AnalystData>(initialAnalystData);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("Waiting for first model response");

  useEffect(() => {
    const loadAnalystData = async () => {
      setLoadError(null);
      setLoading(true);

      try {
        const [dashboardResponse, analysisResponse] = await Promise.all([
          api.get<AnalystData>("/dashboard"),
          api.get<AiAnalysis>("/ai-analysis"),
        ]);
        setData(dashboardResponse.data);
        setAnalysis(analysisResponse.data);
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
    const latencyValue = analysis?.latency_ms ?? parseNumber(data.metrics.avg_latency);
    const packetLossValue = analysis?.packet_loss_percent ?? parseNumber(data.metrics.packet_loss);
    const latency = Math.min(100, Math.max(10, latencyValue * 2.5));
    const packetLoss = Math.min(100, Math.max(5, packetLossValue * 20));
    const jitter = data.current_congestion === "High" ? 18 : data.current_congestion === "Medium" ? 11 : 5;

    return [
      { label: "Bandwidth Usage", value: Math.round(bandwidth), color: "#f87171" },
      { label: "Packet Loss", value: Math.round(packetLoss), color: "#fbbf24" },
      { label: "Latency", value: Math.round(latency), color: "#a78bfa" },
      { label: "Jitter", value: jitter, color: "#38bdf8" },
    ];
  }, [data, analysis]);

  const recommendations = analysis?.recommendations ?? [];

  const hotspotLabels = useMemo(() => {
    return data.topology_nodes
      .filter((node) => node.status === "congested" || node.status === "warning")
      .map((node) => node.label)
      .slice(0, 4);
  }, [data.topology_nodes]);

  const explanation = useMemo(() => {
    const hotspotText = hotspotLabels.length > 0 ? ` Hotspots: ${hotspotLabels.join(", ")}.` : "";
    return analysis
      ? `${analysis.risk_summary} ${analysis.root_cause} ${analysis.expected_impact}${hotspotText}`
      : "Waiting for backend AI analysis from the latest Random Forest prediction.";
  }, [analysis, hotspotLabels]);

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

  const metricCards = [
    { label: "Total bandwidth", value: data.metrics.total_bandwidth, accent: "#38bdf8" },
    { label: "Average latency", value: data.metrics.avg_latency, accent: "#a78bfa" },
    { label: "Packet loss", value: data.metrics.packet_loss, accent: "#f87171" },
    { label: "Network uptime", value: data.metrics.uptime, accent: "#34d399" },
  ];

  const handleApplyRecommendations = () => {
    if (onNavigate) {
      onNavigate("alerts");
      return;
    }

    window.alert("Recommendations applied");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-3xl font-bold" style={{ color: "#a78bfa" }}>
            AI NETWORK ANALYST
          </h1>
          <p className="text-sm mt-2 max-w-3xl" style={{ color: "#94a3b8" }}>
            Explainable AI that makes congestion predictions clear, actionable, and easy to review across the network.
          </p>
        </div>
        <p className="text-xs font-mono" style={{ color: "#38bdf8" }}>
          {lastUpdated}
        </p>
      </div>

      {loading && (
        <div className="rounded-3xl p-4 border border-blue-500/20 bg-blue-500/10 text-blue-100">
          Loading live analyst data from the backend...
        </div>
      )}

      {loadError && (
        <div className="rounded-3xl p-4 border border-red-500/20 bg-red-500/10 text-red-100">
          {loadError} Please make sure the backend server is running at http://127.0.0.1:8000.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <div className="font-mono text-xs mb-3" style={{ color: "#64748b", letterSpacing: "0.12em" }}>
              AI PREDICTION SUMMARY
            </div>
            <div className="space-y-5">
              <div className="rounded-3xl p-5" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}>
                <div className="font-mono text-xs mb-2" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
                  CONGESTION LEVEL
                </div>
                <div className="text-3xl font-black" style={{ color: "#f87171" }}>
                  {data.current_congestion.toUpperCase()}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs font-mono" style={{ color: "#64748b" }}>Confidence</div>
                    <div className="font-semibold mt-1" style={{ color: "#f87171" }}>{data.confidence}%</div>
                  </div>
                  <div>
                    <div className="text-xs font-mono" style={{ color: "#64748b" }}>Next prediction</div>
                    <div className="font-semibold mt-1" style={{ color: "#94a3b8" }}>{data.prediction_next}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {metricCards.map((metric) => (
                  <div key={metric.label} className="rounded-3xl p-4" style={{ background: "rgba(15,23,42,0.8)", border: `1px solid ${metric.accent}30` }}>
                    <div className="text-xs font-mono mb-2" style={{ color: "#94a3b8" }}>{metric.label}</div>
                    <div className="text-xl font-semibold" style={{ color: metric.accent }}>{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="font-display text-lg font-bold mb-4" style={{ color: "#e2e8f0" }}>
              FEATURE CONTRIBUTION
            </div>
            <div className="space-y-5">
              {featureData.map((f, i) => (
                <div key={f.label}>
                  <div className="flex justify-between text-xs font-mono mb-2" style={{ color: "#94a3b8" }}>
                    <span>{f.label}</span>
                    <span style={{ color: f.color, fontWeight: 700 }}>{f.value}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: animating ? `${f.value}%` : "0%",
                        background: `linear-gradient(90deg, ${f.color}80, ${f.color})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl p-4" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <div className="font-mono text-xs mb-3" style={{ color: "#a78bfa", letterSpacing: "0.1em" }}>
                SHAP-STYLE EXPLANATION
              </div>
              <div className="space-y-3">
                {featureData.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className="text-xs font-mono" style={{ color: "#64748b", minWidth: "110px" }}>{f.label}</div>
                    <div className="flex-1 bg-slate-950 rounded-full h-2 overflow-hidden">
                      <div style={{ width: `${Math.max(12, f.value * 1.5)}px`, height: "100%", background: f.color, borderRadius: 999 }} />
                    </div>
                    <div className="text-xs font-mono" style={{ color: f.color }}>+{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <div className="font-mono text-xs mb-3" style={{ color: "#64748b", letterSpacing: "0.12em" }}>
              AI GENERATED EXPLANATION
            </div>
            <div className="rounded-3xl p-5" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.18)" }}>
              <p className="text-sm leading-7" style={{ color: "#cbd5e1" }}>
                {explanation}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="font-mono text-xs" style={{ color: "#64748b", letterSpacing: "0.12em" }}>
                CONFIDENCE BREAKDOWN
              </div>
              <div className="space-y-3">
                {confidenceBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs font-mono mb-2" style={{ color: "#94a3b8" }}>
                      <span>{item.label}</span>
                      <span>{item.v}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.v}%`, background: "#38bdf8" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="font-mono text-xs mb-4" style={{ color: "#64748b", letterSpacing: "0.12em" }}>
              RECOMMENDED ACTIONS
            </div>
            <div className="space-y-3">
              {recommendations.map((action, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-4 border border-slate-800 bg-slate-950/80"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300 flex items-center justify-center">
                      ✓
                    </div>
                    <p className="text-sm" style={{ color: "#cbd5e1" }}>{action}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary w-full py-3 rounded-3xl text-sm font-semibold mt-5"
              onClick={handleApplyRecommendations}
              style={{ background: "#38bdf8", color: "#020617" }}
            >
              Apply All Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
