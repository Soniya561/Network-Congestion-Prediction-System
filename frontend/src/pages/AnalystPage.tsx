import { useState } from "react";

const features = [
  { label: "Bandwidth Usage", value: 45, color: "#f87171" },
  { label: "Packet Loss", value: 30, color: "#fbbf24" },
  { label: "Latency", value: 20, color: "#a78bfa" },
  { label: "Jitter", value: 5, color: "#38bdf8" },
];

const actions = [
  "Increase bandwidth allocation on MPLS trunk links",
  "Balance traffic load across secondary routing paths",
  "Optimize BGP routing policy for Chennai corridor",
  "Schedule off-peak traffic shaping for non-critical flows",
];

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

export default function AnalystPage() {
  const [animating] = useState(true);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-glow-purple" style={{ color: "#a78bfa" }}>
          AI NETWORK ANALYST
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Explainable AI — understanding why congestion was predicted
        </p>
      </div>

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
              HIGH CONGESTION
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="text-xs font-mono" style={{ color: "#64748b" }}>Confidence</div>
              <div className="font-display text-lg font-bold" style={{ color: "#f87171" }}>97.5%</div>
              <div className="w-2 h-2 rounded-full animate-blink ml-auto" style={{ background: "#f87171" }} />
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
              {features.map((f, i) => (
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
                {features.map((f) => (
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
              <span style={{ color: "#38bdf8", fontWeight: 600 }}>The system predicts high congestion</span>{" "}
              because bandwidth utilization is near maximum capacity at{" "}
              <span style={{ color: "#f87171" }}>94.2%</span> utilization, while packet loss has increased
              by <span style={{ color: "#fbbf24" }}>0.8% over the past 5 minutes</span>. Latency has spiked
              from a baseline of 8ms to <span style={{ color: "#a78bfa" }}>92ms</span>, indicating severe
              queuing at the Chennai DC-02 ingress point. Jitter variance suggests{" "}
              <span style={{ color: "#38bdf8" }}>bursty traffic patterns</span> consistent with a DDoS
              amplification event or unscheduled backup job.
            </div>

            <div className="mt-4 space-y-2">
              <div className="font-mono text-xs" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
                CONFIDENCE BREAKDOWN
              </div>
              {[
                { label: "Model certainty", v: 97 },
                { label: "Data quality", v: 94 },
                { label: "Historical match", v: 89 },
              ].map((item) => (
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
              {actions.map((action, i) => (
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
            <button className="btn-primary w-full py-2.5 rounded-lg text-xs mt-4">
              Apply All Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
