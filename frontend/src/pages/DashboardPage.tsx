import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import api from "../api/api";

interface TelemetryPoint {
  time: string;
  bandwidth: number;
  congestion: number;
}

interface DashboardData {
  congestion: string;
  confidence: number;
  active_users: number;
  bandwidth: number;
  latency: number;
  packet_loss: number;

  model: string;
  status: string;
  last_prediction: string;

  risk: number;
  risk_description: string;

  telemetry?: TelemetryPoint[];
}

/* -------------------------------------------------------
   DEFAULT DATA
------------------------------------------------------- */

const defaultTelemetry: TelemetryPoint[] = [
  { time: "19:12:16", bandwidth: 60, congestion: 50 },
  { time: "19:16:17", bandwidth: 15, congestion: 25 },
  { time: "19:30:48", bandwidth: 60, congestion: 25 },
  { time: "19:31:37", bandwidth: 82, congestion: 75 },
  { time: "20:05:46", bandwidth: 35, congestion: 25 },
  { time: "20:35:04", bandwidth: 60, congestion: 50 },
  { time: "20:38:12", bandwidth: 15, congestion: 25 },
  { time: "20:42:18", bandwidth: 60, congestion: 50 },
  { time: "21:00:05", bandwidth: 15, congestion: 25 },
  { time: "21:12:03", bandwidth: 35, congestion: 25 },
  { time: "21:23:20", bandwidth: 15, congestion: 25 },
  { time: "21:30:18", bandwidth: 60, congestion: 50 },
  { time: "21:45:22", bandwidth: 60, congestion: 50 },
  { time: "22:01:12", bandwidth: 25, congestion: 25 },
  { time: "22:15:43", bandwidth: 60, congestion: 50 },
  { time: "22:30:14", bandwidth: 60, congestion: 50 },
  { time: "22:45:17", bandwidth: 60, congestion: 50 },
  { time: "23:00:12", bandwidth: 25, congestion: 25 },
  { time: "23:15:10", bandwidth: 15, congestion: 25 },
  { time: "23:30:21", bandwidth: 60, congestion: 50 },
  { time: "23:45:32", bandwidth: 60, congestion: 50 },
  { time: "00:10:18", bandwidth: 25, congestion: 25 },
  { time: "00:30:25", bandwidth: 15, congestion: 25 },
  { time: "01:00:42", bandwidth: 60, congestion: 50 },
  { time: "02:15:31", bandwidth: 60, congestion: 50 },
  { time: "03:20:14", bandwidth: 25, congestion: 25 },
  { time: "04:10:27", bandwidth: 15, congestion: 25 },
  { time: "09:16:59", bandwidth: 60, congestion: 50 },
];

const defaultDashboard: DashboardData = {
  congestion: "MEDIUM",
  confidence: 89.33,
  active_users: 669,
  bandwidth: 0.6,
  latency: 58,
  packet_loss: 0.06,

  model: "RANDOM FOREST",
  status: "ACTIVE",
  last_prediction: "13 Aug, 09:16",

  risk: 1.7,
  risk_description:
    "Bandwidth utilization is rising quickly, with congestion classified as MEDIUM. Traffic is elevated, but the live pattern remains controllable.",

  telemetry: defaultTelemetry,
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function normalizeCongestion(value: unknown): string {
  const text = String(value ?? "MEDIUM").toUpperCase();

  if (text.includes("HIGH")) return "HIGH";
  if (text.includes("MEDIUM")) return "MEDIUM";
  if (text.includes("LOW")) return "LOW";

  return "MEDIUM";
}

function congestionColor(level: string) {
  switch (normalizeCongestion(level)) {
    case "HIGH":
      return "#f87171";

    case "LOW":
      return "#34d399";

    default:
      return "#fbbf24";
  }
}

function congestionNumber(level: string) {
  switch (normalizeCongestion(level)) {
    case "HIGH":
      return 80;

    case "MEDIUM":
      return 50;

    case "LOW":
      return 25;

    default:
      return 50;
  }
}

/* -------------------------------------------------------
   CUSTOM TOOLTIP
------------------------------------------------------- */

function TelemetryTooltip({
  active,
  payload,
  label,
}: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const bandwidth = payload.find(
    (p: any) => p.dataKey === "bandwidth"
  )?.value;

  const congestion = payload.find(
    (p: any) => p.dataKey === "congestion"
  )?.value;

  let level = "LOW";

  if (Number(congestion) >= 70) {
    level = "HIGH";
  } else if (Number(congestion) >= 40) {
    level = "MEDIUM";
  }

  return (
    <div
      style={{
        background: "rgba(3, 10, 25, 0.97)",
        border: "1px solid rgba(56,189,248,0.35)",
        borderRadius: "10px",
        padding: "14px",
        minWidth: "170px",
        boxShadow: "0 0 30px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="font-mono text-xs mb-2"
        style={{ color: "#64748b" }}
      >
        {label}
      </div>

      <div
        className="text-sm font-semibold"
        style={{ color: "#e2e8f0" }}
      >
        Bandwidth:{" "}
        <span style={{ color: "#38bdf8" }}>
          {Number(bandwidth ?? 0).toFixed(1)}%
        </span>
      </div>

      <div
        className="text-sm font-semibold mt-2"
        style={{ color: "#e2e8f0" }}
      >
        Congestion:{" "}
        <span
          style={{
            color: congestionColor(level),
          }}
        >
          {level}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

export default function DashboardPage() {
  const [dashboard, setDashboard] =
    useState<DashboardData>(defaultDashboard);

  const [time, setTime] = useState(new Date());

  /* -----------------------------------------------
     CLOCK
  ------------------------------------------------ */

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* -----------------------------------------------
     API
  ------------------------------------------------ */

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get("/dashboard");

        const data = response.data ?? {};

        console.log("Dashboard API:", data);

        /*
          This section supports both your old API names
          and your new dashboard names.
        */

        const congestion = normalizeCongestion(
          data.congestion ??
            data.current_congestion ??
            data.prediction ??
            data.severity ??
            "MEDIUM"
        );

        const confidence = Number(
          data.confidence ??
            data.model_confidence ??
            89.33
        );

        const activeUsers = Number(
          data.active_users ??
            data.connected_devices ??
            669
        );

        const bandwidth = Number(
          data.bandwidth ??
            data.bandwidth_utilization ??
            0.6
        );

        const latency = Number(
          data.latency ??
            data.avg_latency ??
            58
        );

        const packetLoss = Number(
          data.packet_loss ??
            0.06
        );

        const model =
          data.model ??
          data.model_name ??
          "RANDOM FOREST";

        const status =
          data.status ??
          "ACTIVE";

        const lastPrediction =
          data.last_prediction ??
          data.prediction_time ??
          "13 Aug, 09:16";

        const risk = Number(
          data.risk ??
            data.risk_score ??
            1.7
        );

        const riskDescription =
          data.risk_description ??
          `Bandwidth utilization is rising quickly, with congestion classified as ${congestion}. Traffic is elevated, but the live pattern remains controllable.`;

        setDashboard({
          congestion,
          confidence,
          active_users: activeUsers,
          bandwidth,
          latency,
          packet_loss: packetLoss,

          model: String(model).toUpperCase(),
          status: String(status).toUpperCase(),
          last_prediction: String(lastPrediction),

          risk,
          risk_description: riskDescription,

          telemetry:
            Array.isArray(data.telemetry) &&
            data.telemetry.length > 0
              ? data.telemetry
              : defaultTelemetry,
        });
      } catch (error) {
        console.error(
          "Dashboard API error:",
          error
        );

        /*
          If backend is unavailable, the dashboard
          still displays the original design.
        */
      }
    };

    loadDashboard();
  }, []);

  /* -----------------------------------------------
     TELEMETRY
  ------------------------------------------------ */

  const telemetry = useMemo(() => {
    return dashboard.telemetry?.length
      ? dashboard.telemetry
      : defaultTelemetry;
  }, [dashboard.telemetry]);

  const currentColor = congestionColor(
    dashboard.congestion
  );

  const currentCongestionNumber =
    congestionNumber(dashboard.congestion);

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(14,116,144,0.12), transparent 35%), #020817",
        color: "#e2e8f0",
      }}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between mb-8">
        <div>
          {/* System online */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{
              background: "rgba(52,211,153,0.08)",
              border:
                "1px solid rgba(52,211,153,0.25)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "#34d399",
                boxShadow:
                  "0 0 10px #34d399",
              }}
            />

            <span
              className="font-mono text-xs font-semibold"
              style={{
                color: "#34d399",
                letterSpacing: "0.12em",
              }}
            >
              SYSTEM ONLINE
            </span>
          </div>

          {/* Small brand */}
          <div
            className="font-mono text-xs mb-3"
            style={{
              color: "#38bdf8",
              letterSpacing: "0.25em",
            }}
          >
            NETSENSE AI
          </div>

          {/* Main title */}
          <h1
            className="font-display text-4xl font-black"
            style={{
              color: "#f1f5f9",
              textShadow:
                "0 0 30px rgba(56,189,248,0.15)",
            }}
          >
            AI NETWORK COMMAND CENTER
          </h1>

          <p
            className="mt-3 text-sm"
            style={{ color: "#64748b" }}
          >
            Real-time network intelligence,
            congestion prediction and
            infrastructure health
          </p>
        </div>

        {/* Right header */}
        <div className="flex items-center gap-4">
          <div
            className="px-5 py-4 rounded-full"
            style={{
              background:
                "rgba(8,47,73,0.25)",
              border:
                "1px solid rgba(14,116,144,0.45)",
            }}
          >
            <div
              className="font-mono text-[9px]"
              style={{
                color: "#64748b",
                letterSpacing: "0.2em",
              }}
            >
              LIVE SIGNAL
            </div>

            <div
              className="font-display text-sm font-bold mt-1"
              style={{ color: "#38bdf8" }}
            >
              SYSTEM ONLINE
            </div>
          </div>

          <div
            className="px-5 py-4 rounded-full"
            style={{
              border:
                "1px solid rgba(51,65,85,0.7)",
            }}
          >
            <div
              className="font-mono text-[9px]"
              style={{
                color: "#64748b",
                letterSpacing: "0.2em",
              }}
            >
              DATE
            </div>

            <div
              className="font-display text-sm font-bold mt-1"
              style={{ color: "#e2e8f0" }}
            >
              {time.toLocaleDateString(
                "en-IN",
                {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }
              )}
            </div>
          </div>

          <div
            className="px-5 py-4 rounded-full"
            style={{
              border:
                "1px solid rgba(51,65,85,0.7)",
            }}
          >
            <div
              className="font-mono text-[9px]"
              style={{
                color: "#64748b",
                letterSpacing: "0.2em",
              }}
            >
              TIME
            </div>

            <div
              className="font-mono text-sm font-bold mt-1"
              style={{ color: "#e2e8f0" }}
            >
              {time.toLocaleTimeString(
                "en-IN",
                { hour12: false }
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          TOP STATS
      ====================================================== */}

      <div
        className="grid grid-cols-6 rounded-3xl overflow-hidden mb-7"
        style={{
          background:
            "rgba(3,12,30,0.65)",
          border:
            "1px solid rgba(30,64,175,0.25)",
        }}
      >
        {/* Congestion */}
        <div className="p-5 border-r border-slate-800">
          <div
            className="font-mono text-[9px]"
            style={{
              color: "#64748b",
              letterSpacing: "0.2em",
            }}
          >
            CONGESTION
          </div>

          <div
            className="font-display text-lg font-bold mt-2"
            style={{
              color: currentColor,
            }}
          >
            {dashboard.congestion}
          </div>
        </div>

        {/* Confidence */}
        <div className="p-5 border-r border-slate-800">
          <div
            className="font-mono text-[9px]"
            style={{
              color: "#64748b",
              letterSpacing: "0.2em",
            }}
          >
            CONFIDENCE
          </div>

          <div
            className="font-display text-lg font-bold mt-2"
            style={{ color: "#38bdf8" }}
          >
            {dashboard.confidence.toFixed(2)}%
          </div>
        </div>

        {/* Users */}
        <div className="p-5 border-r border-slate-800">
          <div
            className="font-mono text-[9px]"
            style={{
              color: "#64748b",
              letterSpacing: "0.2em",
            }}
          >
            ACTIVE USERS
          </div>

          <div
            className="font-display text-lg font-bold mt-2"
            style={{ color: "#e2e8f0" }}
          >
            {dashboard.active_users.toLocaleString()}
          </div>
        </div>

        {/* Bandwidth */}
        <div className="p-5 border-r border-slate-800">
          <div
            className="font-mono text-[9px]"
            style={{
              color: "#64748b",
              letterSpacing: "0.2em",
            }}
          >
            BANDWIDTH
          </div>

          <div
            className="font-display text-lg font-bold mt-2"
            style={{ color: "#22d3ee" }}
          >
            {dashboard.bandwidth} Gbps
          </div>
        </div>

        {/* Latency */}
        <div className="p-5 border-r border-slate-800">
          <div
            className="font-mono text-[9px]"
            style={{
              color: "#64748b",
              letterSpacing: "0.2em",
            }}
          >
            LATENCY
          </div>

          <div
            className="font-display text-lg font-bold mt-2"
            style={{ color: "#fbbf24" }}
          >
            {dashboard.latency} ms
          </div>
        </div>

        {/* Packet loss */}
        <div className="p-5">
          <div
            className="font-mono text-[9px]"
            style={{
              color: "#64748b",
              letterSpacing: "0.2em",
            }}
          >
            PACKET LOSS
          </div>

          <div
            className="font-display text-lg font-bold mt-2"
            style={{ color: "#34d399" }}
          >
            {dashboard.packet_loss}%
          </div>
        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="grid grid-cols-3 gap-5">
        {/* =================================================
            LEFT CHART
        ================================================== */}

        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="font-mono text-[10px]"
                style={{
                  color: "#64748b",
                  letterSpacing: "0.25em",
                }}
              >
                LIVE NETWORK TELEMETRY
              </div>

              <h2
                className="font-display text-xl font-bold mt-3"
                style={{ color: "#e2e8f0" }}
              >
                Bandwidth utilization and congestion
                severity over time
              </h2>
            </div>

            {/* Current severity */}
            <div
              className="px-4 py-2 rounded-full"
              style={{
                background: `${currentColor}10`,
                border: `1px solid ${currentColor}50`,
              }}
            >
              <span
                className="font-mono text-xs font-bold"
                style={{ color: currentColor }}
              >
                ● {dashboard.congestion}
              </span>
            </div>
          </div>

          <div
            className="rounded-3xl p-5"
            style={{
              height: "470px",
              background:
                "linear-gradient(145deg, rgba(15,31,54,0.85), rgba(3,12,28,0.85))",
              border:
                "1px solid rgba(30,64,175,0.28)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex justify-between mb-4">
              <div
                className="font-mono text-[10px]"
                style={{
                  color: "#64748b",
                  letterSpacing: "0.2em",
                }}
              >
                TELEMETRY CHART
              </div>

              <div
                className="font-mono text-[10px]"
                style={{
                  color: "#38bdf8",
                  letterSpacing: "0.2em",
                }}
              >
                {telemetry.length} LIVE POINTS
              </div>
            </div>

            <ResponsiveContainer
              width="100%"
              height="88%"
            >
              <LineChart
                data={telemetry}
                margin={{
                  top: 10,
                  right: 20,
                  left: 5,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  stroke="rgba(56,189,248,0.07)"
                  strokeDasharray="3 6"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "#475569",
                    fontSize: 9,
                    fontFamily:
                      "JetBrains Mono",
                  }}
                  axisLine={{
                    stroke:
                      "rgba(71,85,105,0.3)",
                  }}
                />

                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) =>
                    `${v}%`
                  }
                  tick={{
                    fill: "#475569",
                    fontSize: 9,
                    fontFamily:
                      "JetBrains Mono",
                  }}
                  axisLine={{
                    stroke:
                      "rgba(71,85,105,0.3)",
                  }}
                />

                {/* LOW */}
                <ReferenceLine
                  y={25}
                  stroke="#34d399"
                  strokeDasharray="4 6"
                  strokeOpacity={0.2}
                  label={{
                    value: "Low",
                    fill: "#475569",
                    fontSize: 9,
                    position: "right",
                  }}
                />

                {/* MEDIUM */}
                <ReferenceLine
                  y={50}
                  stroke="#fbbf24"
                  strokeDasharray="4 6"
                  strokeOpacity={0.2}
                  label={{
                    value: "Med",
                    fill: "#475569",
                    fontSize: 9,
                    position: "right",
                  }}
                />

                {/* HIGH */}
                <ReferenceLine
                  y={75}
                  stroke="#f87171"
                  strokeDasharray="4 6"
                  strokeOpacity={0.2}
                  label={{
                    value: "High",
                    fill: "#475569",
                    fontSize: 9,
                    position: "right",
                  }}
                />

                <Tooltip
                  content={<TelemetryTooltip />}
                />

                <Line
                  type="monotone"
                  dataKey="bandwidth"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#38bdf8",
                    stroke: "#e0f2fe",
                    strokeWidth: 2,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="congestion"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#fbbf24",
                    stroke: "#fff7ed",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* LOW / MEDIUM / HIGH STORED LEVELS */}

          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#34d399",
                  boxShadow:
                    "0 0 8px #34d399",
                }}
              />

              <span
                className="font-mono text-xs"
                style={{ color: "#64748b" }}
              >
                LOW
              </span>

              <span
                className="font-mono text-[10px]"
                style={{ color: "#475569" }}
              >
                0–39
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#fbbf24",
                  boxShadow:
                    "0 0 8px #fbbf24",
                }}
              />

              <span
                className="font-mono text-xs"
                style={{ color: "#64748b" }}
              >
                MEDIUM
              </span>

              <span
                className="font-mono text-[10px]"
                style={{ color: "#475569" }}
              >
                40–69
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#f87171",
                  boxShadow:
                    "0 0 8px #f87171",
                }}
              />

              <span
                className="font-mono text-xs"
                style={{ color: "#64748b" }}
              >
                HIGH
              </span>

              <span
                className="font-mono text-[10px]"
                style={{ color: "#475569" }}
              >
                70–100
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            RIGHT AI PANEL
        ================================================== */}

        <div>
          <div
            className="rounded-3xl p-5"
            style={{
              minHeight: "520px",
              background:
                "linear-gradient(145deg, rgba(8,23,44,0.92), rgba(3,12,28,0.92))",
              border:
                "1px solid rgba(30,64,175,0.28)",
            }}
          >
            {/* Panel heading */}

            <div className="flex justify-between">
              <div>
                <div
                  className="font-mono text-[10px]"
                  style={{
                    color: "#64748b",
                    letterSpacing: "0.25em",
                  }}
                >
                  AI CONGESTION INTELLIGENCE
                </div>

                <h2
                  className="font-display text-lg font-bold mt-4"
                  style={{ color: "#e2e8f0" }}
                >
                  Model status and live condition
                </h2>
              </div>

              <div className="text-right">
                <div
                  className="font-mono text-[9px]"
                  style={{
                    color: "#64748b",
                    letterSpacing: "0.18em",
                  }}
                >
                  CURRENT CONDITION
                </div>

                <div
                  className="font-display text-sm font-bold mt-2"
                  style={{
                    color: currentColor,
                  }}
                >
                  {dashboard.congestion}
                </div>
              </div>
            </div>

            {/* Confidence */}

            <div
              className="rounded-2xl p-4 mt-6"
              style={{
                background:
                  "rgba(2,8,23,0.65)",
                border:
                  "1px solid rgba(30,41,59,0.8)",
              }}
            >
              <div className="flex justify-between">
                <span
                  className="font-mono text-[9px]"
                  style={{
                    color: "#64748b",
                    letterSpacing: "0.2em",
                  }}
                >
                  MODEL CONFIDENCE
                </span>

                <span
                  className="font-display font-bold"
                  style={{
                    color: "#38bdf8",
                  }}
                >
                  {dashboard.confidence.toFixed(
                    2
                  )}
                  %
                </span>
              </div>

              <div
                className="h-2 rounded-full mt-4 overflow-hidden"
                style={{
                  background:
                    "rgba(30,41,59,0.9)",
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(
                      dashboard.confidence,
                      100
                    )}%`,
                    background:
                      "linear-gradient(90deg,#22d3ee,#38bdf8)",
                    boxShadow:
                      "0 0 12px rgba(34,211,238,0.6)",
                  }}
                />
              </div>
            </div>

            {/* Model */}

            <div
              className="flex justify-between items-center rounded-2xl px-4 py-4 mt-4"
              style={{
                background:
                  "rgba(2,8,23,0.55)",
                border:
                  "1px solid rgba(30,41,59,0.8)",
              }}
            >
              <span
                className="font-mono text-[9px]"
                style={{
                  color: "#64748b",
                  letterSpacing: "0.2em",
                }}
              >
                MODEL
              </span>

              <span
                className="font-display text-sm font-bold"
                style={{
                  color: "#e2e8f0",
                }}
              >
                {dashboard.model}
              </span>
            </div>

            {/* Status */}

            <div
              className="flex justify-between items-center rounded-2xl px-4 py-4 mt-3"
              style={{
                background:
                  "rgba(2,8,23,0.55)",
                border:
                  "1px solid rgba(30,41,59,0.8)",
              }}
            >
              <span
                className="font-mono text-[9px]"
                style={{
                  color: "#64748b",
                  letterSpacing: "0.2em",
                }}
              >
                STATUS
              </span>

              <span
                className="font-display text-sm font-bold"
                style={{
                  color: "#e2e8f0",
                }}
              >
                {dashboard.status}
              </span>
            </div>

            {/* Last prediction */}

            <div
              className="flex justify-between items-center rounded-2xl px-4 py-4 mt-3"
              style={{
                background:
                  "rgba(2,8,23,0.55)",
                border:
                  "1px solid rgba(30,41,59,0.8)",
              }}
            >
              <span
                className="font-mono text-[9px]"
                style={{
                  color: "#64748b",
                  letterSpacing: "0.2em",
                }}
              >
                LAST PREDICTION
              </span>

              <span
                className="font-display text-sm font-bold"
                style={{
                  color: "#e2e8f0",
                }}
              >
                {dashboard.last_prediction}
              </span>
            </div>

            {/* Risk */}

            <div
              className="rounded-2xl p-4 mt-4"
              style={{
                background:
                  "rgba(2,8,23,0.65)",
                border:
                  "1px solid rgba(30,41,59,0.8)",
              }}
            >
              <div className="flex justify-between items-center">
                <span
                  className="font-mono text-[9px]"
                  style={{
                    color: "#64748b",
                    letterSpacing: "0.2em",
                  }}
                >
                  CURRENT RISK
                </span>

                <span
                  className="px-3 py-1 rounded-full font-mono text-[10px] font-bold"
                  style={{
                    color: currentColor,
                    background: `${currentColor}12`,
                    border: `1px solid ${currentColor}45`,
                  }}
                >
                  ● {dashboard.congestion}
                </span>
              </div>

              <div className="flex gap-5 items-center mt-5">
                <div
                  className="w-20 h-20 rounded-full flex flex-col items-center justify-center shrink-0"
                  style={{
                    border:
                      `1px solid ${currentColor}50`,
                    boxShadow:
                      `0 0 25px ${currentColor}15`,
                  }}
                >
                  <span
                    className="font-mono text-[8px]"
                    style={{
                      color: "#64748b",
                      letterSpacing: "0.15em",
                    }}
                  >
                    RISK
                  </span>

                  <span
                    className="font-display text-xl font-bold mt-1"
                    style={{
                      color: currentColor,
                    }}
                  >
                    {dashboard.risk}
                  </span>
                </div>

                <div>
                  <p
                    className="text-sm leading-6"
                    style={{
                      color: "#cbd5e1",
                    }}
                  >
                    {dashboard.risk_description}
                  </p>

                  <div
                    className="font-mono text-[9px] mt-4"
                    style={{
                      color: "#64748b",
                      letterSpacing: "0.18em",
                    }}
                  >
                    LATEST UPDATE:{" "}
                    {dashboard.last_prediction}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          BOTTOM STATUS
      ====================================================== */}

      <div
        className="mt-6 flex items-center justify-between px-5 py-4 rounded-2xl"
        style={{
          background:
            "rgba(3,12,28,0.65)",
          border:
            "1px solid rgba(30,64,175,0.2)",
        }}
      >
        <div className="flex items-center gap-6">
          <span
            className="font-mono text-[9px]"
            style={{
              color: "#475569",
              letterSpacing: "0.2em",
            }}
          >
            SEVERITY LEVELS
          </span>

          <span
            className="font-mono text-xs"
            style={{ color: "#34d399" }}
          >
            ● LOW
          </span>

          <span
            className="font-mono text-xs"
            style={{ color: "#fbbf24" }}
          >
            ● MEDIUM
          </span>

          <span
            className="font-mono text-xs"
            style={{ color: "#f87171" }}
          >
            ● HIGH
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: "#34d399",
              boxShadow:
                "0 0 8px #34d399",
            }}
          />

          <span
            className="font-mono text-xs"
            style={{ color: "#34d399" }}
          >
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>
      </div>
    </div>
  );
}