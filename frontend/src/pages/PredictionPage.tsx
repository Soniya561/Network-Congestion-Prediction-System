import { useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const radarData = [
  { subject: "Latency", A: 85, fullMark: 100 },
  { subject: "Bandwidth", A: 92, fullMark: 100 },
  { subject: "Packet Loss", A: 78, fullMark: 100 },
  { subject: "Jitter", A: 65, fullMark: 100 },
  { subject: "Throughput", A: 70, fullMark: 100 },
];

const predTimeline = [
  { t: "-30m", risk: 35 }, { t: "-20m", risk: 42 }, { t: "-10m", risk: 58 },
  { t: "Now", risk: 72 }, { t: "+10m", risk: 88 }, { t: "+20m", risk: 95 },
  { t: "+30m", risk: 91 },
];

const parameters = ["Latency", "Bandwidth", "Packet Loss", "Jitter", "Throughput"];

export default function PredictionPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f.name);
  };

  const handleRun = () => {
    if (!file) return;
    setRunning(true);
    setProgress(0);
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 8 + 2;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => { setRunning(false); setDone(true); }, 400);
      }
    }, 120);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-purple" style={{ color: "#a78bfa" }}>
          AI PREDICTION WORKSPACE
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Upload network telemetry data and let the AI predict congestion levels
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload panel */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-6">
            <h2 className="font-display text-sm font-bold mb-4" style={{ color: "#e2e8f0", letterSpacing: "0.1em" }}>
              DATA UPLOAD
            </h2>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              className="rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? "#a78bfa" : "rgba(167,139,250,0.3)"}`,
                background: dragging ? "rgba(167,139,250,0.08)" : "rgba(15,23,42,0.4)",
                boxShadow: dragging ? "0 0 30px rgba(167,139,250,0.2)" : "none",
              }}
              onClick={() => document.getElementById("csv-input")?.click()}
            >
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
              />
              {/* 3D upload animation */}
              <div className="flex justify-center mb-4">
                <div className="relative w-20 h-20">
                  <div
                    className="absolute inset-0 rounded-full animate-spin-medium"
                    style={{
                      background: "conic-gradient(from 0deg, transparent 0%, #a78bfa 50%, transparent 100%)",
                      opacity: 0.4,
                    }}
                  />
                  <div
                    className="absolute inset-2 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(167,139,250,0.4)" }}
                  >
                    {file ? "✓" : "↑"}
                  </div>
                </div>
              </div>

              {file ? (
                <div>
                  <div className="font-mono text-sm mb-1" style={{ color: "#a78bfa" }}>{file}</div>
                  <div className="text-xs" style={{ color: "#64748b" }}>File ready for analysis</div>
                </div>
              ) : (
                <div>
                  <div className="font-body text-sm mb-1" style={{ color: "#94a3b8" }}>
                    Drag &amp; drop CSV or click to browse
                  </div>
                  <div className="text-xs" style={{ color: "#475569" }}>Supported: .csv, .json, .parquet</div>
                </div>
              )}
            </div>

            {/* Supported parameters */}
            <div className="mt-4">
              <div className="font-mono text-xs mb-3" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
                SUPPORTED PARAMETERS
              </div>
              <div className="grid grid-cols-2 gap-2">
                {parameters.map((p) => (
                  <div
                    key={p}
                    className="px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-2"
                    style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#a78bfa" }} />
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            {running && (
              <div className="mt-4">
                <div className="flex justify-between text-xs font-mono mb-2" style={{ color: "#64748b" }}>
                  <span>RUNNING AI INFERENCE...</span>
                  <span style={{ color: "#a78bfa" }}>{Math.round(progress)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%`, background: "linear-gradient(90deg, #a78bfa, #38bdf8)" }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleRun}
              disabled={!file || running}
              className="btn-primary w-full py-3 rounded-lg text-sm mt-4"
              style={{
                background: !file ? "rgba(30,41,59,0.5)" : undefined,
                color: !file ? "#475569" : undefined,
                boxShadow: !file ? "none" : undefined,
                opacity: running ? 0.7 : 1,
              }}
            >
              {running ? "Processing..." : "Run AI Prediction"}
            </button>
          </div>

          {/* Radar chart */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
              TELEMETRY PROFILE
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(56,189,248,0.15)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <PolarRadiusAxis tick={{ fill: "#475569", fontSize: 8 }} />
                <Radar name="Current" dataKey="A" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prediction result */}
        <div className="space-y-4">
          {done ? (
            <>
              {/* Result card */}
              <div
                className="glass rounded-xl p-6 glow-red"
                style={{ border: "1px solid rgba(248,113,113,0.4)" }}
              >
                <div className="font-mono text-xs mb-4" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
                  AI PREDICTION RESULT
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div>
                    <div className="font-mono text-xs mb-1" style={{ color: "#64748b" }}>CONGESTION LEVEL</div>
                    <div className="font-display text-4xl font-black text-glow-red" style={{ color: "#f87171" }}>
                      HIGH 🔴
                    </div>
                  </div>
                  <div
                    className="ml-auto text-center px-6 py-4 rounded-xl"
                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}
                  >
                    <div className="font-mono text-xs mb-1" style={{ color: "#64748b" }}>CONFIDENCE</div>
                    <div className="font-display text-2xl font-bold" style={{ color: "#f87171" }}>97.5%</div>
                  </div>
                </div>

                {/* Risk meter */}
                <div>
                  <div className="flex justify-between font-mono text-xs mb-2" style={{ color: "#64748b" }}>
                    <span>RISK METER</span>
                    <span style={{ color: "#f87171" }}>EXTREME</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.8)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: "94%",
                        background: "linear-gradient(90deg, #34d399 0%, #fbbf24 40%, #f87171 75%, #ef4444 100%)",
                        boxShadow: "0 0 12px rgba(248,113,113,0.6)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-xs mt-1" style={{ color: "#475569" }}>
                    <span>LOW</span><span>MEDIUM</span><span>HIGH</span><span>EXTREME</span>
                  </div>
                </div>
              </div>

              {/* Prediction timeline */}
              <div className="glass rounded-xl p-5">
                <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
                  RISK FORECAST TIMELINE
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={predTimeline}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(56,189,248,0.06)" />
                    <XAxis dataKey="t" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="risk" stroke="#f87171" strokeWidth={2} fill="url(#riskGrad)" name="Risk %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Key factors */}
              <div className="glass rounded-xl p-5">
                <div className="font-display text-xs font-bold mb-3" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>
                  KEY CONTRIBUTING FACTORS
                </div>
                {[
                  { label: "Bandwidth Saturation", value: 94, color: "#f87171" },
                  { label: "Packet Loss Rate", value: 78, color: "#fbbf24" },
                  { label: "Latency Spike", value: 65, color: "#fbbf24" },
                  { label: "Jitter Variance", value: 42, color: "#38bdf8" },
                ].map((f) => (
                  <div key={f.label} className="mb-3">
                    <div className="flex justify-between text-xs font-mono mb-1" style={{ color: "#64748b" }}>
                      <span>{f.label}</span>
                      <span style={{ color: f.color }}>{f.value}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${f.value}%`, background: f.color, boxShadow: `0 0 8px ${f.color}60` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="glass rounded-xl p-8 flex flex-col items-center justify-center h-full" style={{ minHeight: "400px" }}>
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-4 animate-pulse-ring"
                style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}
              >
                <span className="text-4xl">🧠</span>
              </div>
              <div className="font-display text-sm font-bold text-center mb-2" style={{ color: "#64748b" }}>
                AWAITING DATA INPUT
              </div>
              <p className="text-xs text-center" style={{ color: "#475569" }}>
                Upload your network telemetry CSV<br />and run the AI prediction engine
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
