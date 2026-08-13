import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/api.ts";

interface AnalyticsData {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

interface MLOpsData {
  latency_history: Array<{ time: number; latency_ms: number }>;
}

interface ReportsData {
  summary: {
    total_events_30d: number | null;
    avg_resolution_minutes: number | null;
    prevented_outages: number | null;
  };
  traffic_history: Array<{
    created_at_utc: string;
    bandwidth_utilization_percent: number;
    predicted_congestion_level: string;
  }>;
  incident_history: Array<{
    id: number;
    created_at_utc: string;
    resolved_at_utc: string | null;
    congestion_level: string;
    confidence_percent: number;
    status: string;
    escalation_count: number;
    duration_minutes: number | null;
  }>;
}

type CongestionLevel = "Low" | "Medium" | "High" | "Critical" | "Unavailable";

interface TelemetryPoint {
  createdAtUtc: string;
  timestamp: string;
  timeLabel: string;
  bandwidth: number;
  congestion: CongestionLevel;
  severity: number;
}

interface IncidentPoint {
  id: number;
  timestamp: string;
  createdAtUtc: string;
  congestion: CongestionLevel;
  confidence: number;
  status: string;
  duration: number | null;
}

interface LatencyPoint {
  time: string;
  latency: number;
}

const unavailable = "Unavailable";
const initialIncidentCount = 8;
const severityScale: CongestionLevel[] = ["Unavailable", "Low", "Medium", "High", "Critical"];

const severityMeta: Record<CongestionLevel, { label: string; color: string; soft: string; border: string }> = {
  Low: { label: "LOW", color: "#34d399", soft: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.36)" },
  Medium: { label: "MEDIUM", color: "#fbbf24", soft: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.38)" },
  High: { label: "HIGH", color: "#fb923c", soft: "rgba(251,146,60,0.13)", border: "rgba(251,146,60,0.4)" },
  Critical: { label: "CRITICAL", color: "#fb7185", soft: "rgba(251,113,133,0.14)", border: "rgba(251,113,133,0.44)" },
  Unavailable: { label: "UNAVAILABLE", color: "#94a3b8", soft: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.24)" },
};

function normalizeCongestion(value?: string | null): CongestionLevel {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "low") return "Low";
  if (normalized === "medium") return "Medium";
  if (normalized === "high") return "High";
  if (normalized === "critical") return "Critical";
  return "Unavailable";
}

function severityValue(level: CongestionLevel) {
  return severityScale.indexOf(level);
}

function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return unavailable;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return unavailable;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return unavailable;
  return minutes < 1 ? "<1 min" : `${minutes.toFixed(1)} min`;
}

function formatPercent(value?: number | null, digits = 2) {
  return value === null || value === undefined ? unavailable : `${value.toFixed(digits)}%`;
}

function formatMetric(value?: number | null) {
  return value === null || value === undefined ? unavailable : value.toLocaleString("en-IN");
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function getLatestTimestamp(reports: ReportsData | null, latencyHistory: LatencyPoint[]) {
  const reportDates = [
    ...(reports?.traffic_history ?? []).map((point) => point.created_at_utc),
    ...(reports?.incident_history ?? []).map((incident) => incident.created_at_utc),
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (reportDates.length > 0) {
    return formatDateTime(new Date(Math.max(...reportDates.map((date) => date.getTime()))));
  }

  return latencyHistory.at(-1)?.time ?? unavailable;
}

function buildInsight(telemetry: TelemetryPoint[], incidents: IncidentPoint[]) {
  if (telemetry.length < 2 && incidents.length === 0) {
    return "Historical telemetry and incident records are not available yet, so AI report insight is unavailable.";
  }

  const latest = telemetry.at(-1);
  const firstWindow = telemetry.slice(0, Math.max(1, Math.ceil(telemetry.length / 3)));
  const lastWindow = telemetry.slice(Math.max(0, telemetry.length - firstWindow.length));
  const firstAvg = average(firstWindow.map((point) => point.bandwidth));
  const lastAvg = average(lastWindow.map((point) => point.bandwidth));
  const direction =
    firstAvg === null || lastAvg === null
      ? "mixed"
      : lastAvg - firstAvg > 4
        ? "increasing"
        : firstAvg - lastAvg > 4
          ? "decreasing"
          : "stable";

  const counts = incidents.reduce<Record<CongestionLevel, number>>(
    (acc, incident) => {
      acc[incident.congestion] += 1;
      return acc;
    },
    { Low: 0, Medium: 0, High: 0, Critical: 0, Unavailable: 0 },
  );
  const dominant = (["Critical", "High", "Medium", "Low"] as CongestionLevel[]).reduce(
    (best, level) => (counts[level] > counts[best] ? level : best),
    "Low" as CongestionLevel,
  );

  const trendText = {
    increasing: "bandwidth utilization is increasing across the available report window",
    decreasing: "bandwidth utilization is decreasing across the available report window",
    stable: "bandwidth utilization is stable across the available report window",
    mixed: "bandwidth movement is mixed because the available window is limited",
  }[direction];

  const eventText =
    incidents.length > 0
      ? `${incidents.length} incidents are recorded, with ${severityMeta[dominant].label} appearing most often.`
      : "No congestion incidents are recorded in the available report data.";

  const latestText = latest
    ? `Latest telemetry shows ${latest.bandwidth.toFixed(1)}% utilization and ${severityMeta[latest.congestion].label} congestion.`
    : "Latest telemetry is unavailable.";

  return `${latestText} Over the observed history, ${trendText}. ${eventText}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[150px] items-center justify-center rounded-lg border border-dashed border-slate-800/80 bg-slate-950/35 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function SectionHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: "#64748b" }}>
          {eyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-100 sm:text-xl">{title}</h2>
      </div>
      {meta && <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{meta}</div>}
    </div>
  );
}

function CongestionBadge({ level }: { level: CongestionLevel }) {
  const meta = severityMeta[level];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.14em]"
      style={{ color: meta.color, background: meta.soft, border: `1px solid ${meta.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
      {meta.label}
    </span>
  );
}

function MetricTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-[190px] flex-1 border-r border-slate-800/70 px-4 py-4 last:border-r-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-normal" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function ReportTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: TelemetryPoint }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-sky-400/30 bg-slate-950/95 px-4 py-3 text-xs shadow-2xl shadow-sky-950/50">
      <div className="font-mono uppercase tracking-[0.16em] text-slate-500">{point?.timestamp ?? label}</div>
      <div className="mt-2 space-y-1 text-slate-200">
        <div>
          Utilization: <span className="font-semibold text-sky-300">{point?.bandwidth.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          Congestion: {point && <CongestionBadge level={point.congestion} />}
        </div>
      </div>
    </div>
  );
}

function SimpleTooltip({ active, payload, label, suffix = "" }: { active?: boolean; payload?: Array<{ value?: number; name?: string }>; label?: string; suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-sky-400/30 bg-slate-950/95 px-4 py-3 text-xs shadow-2xl">
      <div className="font-mono uppercase tracking-[0.16em] text-slate-500">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="mt-1 text-slate-200">
          {item.name}: <span className="font-semibold text-sky-300">{item.value?.toFixed(2)}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  useEffect(() => {
    let active = true;

    const loadReportsData = async () => {
      const [analyticsResult, mlopsResult, reportsResult] = await Promise.allSettled([
        api.get<AnalyticsData>("/analytics"),
        api.get<MLOpsData>("/mlops/status"),
        api.get<ReportsData>("/reports"),
      ]);

      if (!active) return;

      setAnalytics(analyticsResult.status === "fulfilled" ? analyticsResult.value.data : null);
      setReports(reportsResult.status === "fulfilled" ? reportsResult.value.data : null);
      setLatencyHistory(
        mlopsResult.status === "fulfilled"
          ? mlopsResult.value.data.latency_history.map((point) => ({
              time: new Date(point.time * 1000).toLocaleTimeString("en-IN", { hour12: false }),
              latency: point.latency_ms,
            }))
          : [],
      );
      setLoading(false);
      setError(
        analyticsResult.status === "rejected" && mlopsResult.status === "rejected" && reportsResult.status === "rejected"
          ? "Report services are currently unavailable."
          : null,
      );
    };

    void loadReportsData();
    const id = window.setInterval(() => void loadReportsData(), 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const telemetry = useMemo<TelemetryPoint[]>(() => {
    return (reports?.traffic_history ?? [])
      .slice()
      .sort((a, b) => new Date(a.created_at_utc).getTime() - new Date(b.created_at_utc).getTime())
      .map((point) => {
        const congestion = normalizeCongestion(point.predicted_congestion_level);
        return {
          createdAtUtc: point.created_at_utc,
          timestamp: formatDateTime(point.created_at_utc),
          timeLabel: formatTime(point.created_at_utc),
          bandwidth: point.bandwidth_utilization_percent,
          congestion,
          severity: severityValue(congestion),
        };
      });
  }, [reports]);

  const incidents = useMemo<IncidentPoint[]>(() => {
    return (reports?.incident_history ?? [])
      .slice()
      .sort((a, b) => new Date(b.created_at_utc).getTime() - new Date(a.created_at_utc).getTime())
      .map((incident) => ({
        id: incident.id,
        timestamp: formatDateTime(incident.created_at_utc),
        createdAtUtc: incident.created_at_utc,
        congestion: normalizeCongestion(incident.congestion_level),
        confidence: incident.confidence_percent,
        status: incident.status,
        duration: incident.duration_minutes,
      }));
  }, [reports]);

  const latencyStats = useMemo(() => {
    const values = latencyHistory.map((point) => point.latency);
    return {
      latest: values.at(-1) ?? null,
      avg: average(values),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
  }, [latencyHistory]);

  const distribution = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    incidents.forEach((incident) => {
      if (incident.congestion !== "Unavailable") counts[incident.congestion] += 1;
    });
    return (Object.keys(counts) as Array<keyof typeof counts>).map((level) => ({
      level,
      count: counts[level],
      fill: severityMeta[level].color,
    }));
  }, [incidents]);

  const dominantCongestion = useMemo<CongestionLevel>(() => {
    if (!incidents.length) return "Unavailable";
    return distribution.reduce(
      (best, item) => (item.count > (distribution.find((candidate) => candidate.level === best)?.count ?? 0) ? item.level : best),
      "Low" as CongestionLevel,
    );
  }, [distribution, incidents.length]);

  const latestIncident = incidents.at(0);
  const visibleIncidents = showAllIncidents ? incidents : incidents.slice(0, initialIncidentCount);
  const latestTimestamp = getLatestTimestamp(reports, latencyHistory);
  const insight = buildInsight(telemetry, incidents);
  const accuracyRing = analytics ? [{ name: "Accuracy", value: Math.max(0, Math.min(100, analytics.accuracy)), fill: "#38bdf8" }] : [];
  const modelBars = analytics
    ? [
        { label: "Precision", value: analytics.precision, fill: "#22d3ee" },
        { label: "Recall", value: analytics.recall, fill: "#34d399" },
        { label: "F1", value: analytics.f1_score, fill: "#a78bfa" },
      ]
    : [];

  const kpis = [
    { label: "TOTAL EVENTS", value: formatMetric(reports?.summary.total_events_30d), tone: "#38bdf8" },
    { label: "MODEL ACCURACY", value: formatPercent(analytics?.accuracy), tone: "#a78bfa" },
    {
      label: "AVG RESOLUTION TIME",
      value:
        reports?.summary.avg_resolution_minutes === null || reports?.summary.avg_resolution_minutes === undefined
          ? unavailable
          : `${reports.summary.avg_resolution_minutes.toFixed(1)} min`,
      tone: "#34d399",
    },
    { label: "PREVENTED OUTAGES", value: formatMetric(reports?.summary.prevented_outages), tone: "#22d3ee" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.98) 0%, rgba(2,8,23,0.94) 46%, rgba(3,7,18,0.98) 100%), radial-gradient(circle at 18% 8%, rgba(34,211,238,0.12), transparent 28%), radial-gradient(circle at 80% 18%, rgba(167,139,250,0.10), transparent 24%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.45) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1620px] flex-col gap-6">
        <header className="border-b border-slate-800/80 pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: "#38bdf8" }}>
                NETSENSE AI / REPORTS
              </p>
              <h1 className="mt-2 font-display text-3xl font-black tracking-normal text-slate-100 sm:text-4xl">
                AI NETWORK ANALYTICS
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                Historical network performance, model evaluation and congestion intelligence
              </p>
            </div>

            <div className="w-full max-w-md border border-sky-400/20 bg-slate-950/55 px-4 py-3 shadow-[0_0_28px_rgba(56,189,248,0.08)] lg:text-right">
              <div className="flex items-center justify-between gap-4 lg:justify-end">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Report status</span>
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  <span className="h-2 w-2 animate-blink rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                  Live data
                </span>
              </div>
              <div className="mt-2 font-mono text-xs text-slate-300">Latest available timestamp: {latestTimestamp}</div>
            </div>
          </div>
        </header>

        {error && (
          <div className="border border-rose-400/25 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className="flex flex-wrap overflow-hidden border border-slate-800/80 bg-slate-950/50 shadow-[0_24px_80px_rgba(2,6,23,0.42)]">
          {kpis.map((kpi) => (
            <MetricTile key={kpi.label} label={kpi.label} value={kpi.value} tone={kpi.tone} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(330px,0.86fr)]">
          <div className="border border-slate-800/80 bg-slate-950/45 p-4 sm:p-5">
            <SectionHeader
              eyebrow="Recorded Network Telemetry"
              title="Network telemetry history"
              meta={telemetry.length ? `${telemetry.length} samples` : "Awaiting samples"}
            />
            <div className="mt-5 h-[340px]">
              {telemetry.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={telemetry} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="reportBandwidthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.42} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(56,189,248,0.08)" strokeDasharray="3 8" />
                    <XAxis dataKey="timeLabel" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "rgba(71,85,105,0.45)" }} minTickGap={24} />
                    <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "rgba(71,85,105,0.45)" }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 4]}
                      ticks={[0, 1, 2, 3, 4]}
                      tickFormatter={(value) => (value === 1 ? "Low" : value === 2 ? "Med" : value === 3 ? "High" : value === 4 ? "Crit" : "")}
                      tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(71,85,105,0.45)" }}
                    />
                    <Tooltip content={<ReportTooltip />} />
                    <Area yAxisId="left" type="monotone" dataKey="bandwidth" name="Bandwidth utilization" stroke="#38bdf8" strokeWidth={2.5} fill="url(#reportBandwidthFill)" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="severity" name="Congestion severity" stroke="#a78bfa" strokeWidth={2} dot={false} strokeLinecap="round" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message={loading ? "Loading recorded network telemetry..." : "No recorded network telemetry is available."} />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-5 bg-sky-400" /> Bandwidth utilization</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-5 bg-violet-400" /> Congestion severity</span>
            </div>
          </div>

          <aside className="border border-slate-800/80 bg-slate-950/55 p-5">
            <SectionHeader eyebrow="Model Evaluation" title="Model performance" meta="Active model" />
            {analytics ? (
              <>
                <div className="mt-6 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="72%" outerRadius="100%" data={accuracyRing} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "rgba(30,41,59,0.7)" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="-mt-[118px] mb-12 text-center">
                  <div className="font-display text-4xl font-black text-sky-300">{analytics.accuracy.toFixed(2)}%</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Accuracy</div>
                </div>
                <div className="border-y border-slate-800/75 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Active model</div>
                  <div className="mt-1 text-base font-semibold text-slate-100">{analytics.model_name}</div>
                </div>
                <div className="mt-4 space-y-4">
                  {modelBars.map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
                        <span className="text-slate-500">{metric.label}</span>
                        <span style={{ color: metric.fill }}>{metric.value.toFixed(2)}%</span>
                      </div>
                      <div className="mt-2 h-2 bg-slate-800/80">
                        <div className="h-full" style={{ width: `${Math.max(4, Math.min(100, metric.value))}%`, background: metric.fill, boxShadow: `0 0 16px ${metric.fill}55` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 h-[320px]">
                <EmptyState message={loading ? "Loading model evaluation..." : "Model evaluation unavailable."} />
              </div>
            )}
          </aside>
        </section>

        <section className="border border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
          <SectionHeader eyebrow="Prediction Latency History" title="Prediction performance" meta={latencyHistory.length ? `${latencyHistory.length} latency points` : "Unavailable"} />
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="h-[210px]">
              {latencyHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyHistory} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="rgba(56,189,248,0.08)" strokeDasharray="3 8" />
                    <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "rgba(71,85,105,0.45)" }} minTickGap={20} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "rgba(71,85,105,0.45)" }} unit="ms" />
                    <Tooltip content={<SimpleTooltip suffix=" ms" />} />
                    <Line type="monotone" dataKey="latency" name="Inference latency" stroke="#22d3ee" strokeWidth={2.25} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message={loading ? "Loading prediction latency history..." : "Prediction latency history unavailable."} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-slate-800/80 bg-slate-800/80">
              {[
                ["Latest", latencyStats.latest],
                ["Average", latencyStats.avg],
                ["Minimum", latencyStats.min],
                ["Maximum", latencyStats.max],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-950/85 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label as string}</div>
                  <div className="mt-2 text-xl font-bold text-slate-100">{typeof value === "number" ? `${value.toFixed(1)} ms` : unavailable}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="border border-slate-800/80 bg-slate-950/45 p-5">
            <SectionHeader eyebrow="Congestion Event Analysis" title="Incident distribution" meta={`${incidents.length} events`} />
            <div className="mt-5 h-[230px]">
              {incidents.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} layout="vertical" margin={{ top: 8, right: 20, left: 16, bottom: 4 }}>
                    <CartesianGrid stroke="rgba(56,189,248,0.08)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "rgba(71,85,105,0.45)" }} />
                    <YAxis type="category" dataKey="level" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} width={70} />
                    <Tooltip content={<SimpleTooltip />} />
                    <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>
                      {distribution.map((entry) => <Cell key={entry.level} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message={loading ? "Loading congestion incidents..." : "No congestion incidents are available."} />
              )}
            </div>
          </div>

          <div className="grid gap-px overflow-hidden border border-slate-800/80 bg-slate-800/80 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Dominant level", dominantCongestion],
              ["Latest event", latestIncident?.timestamp ?? unavailable],
              ["Latest confidence", latestIncident ? `${latestIncident.confidence.toFixed(2)}%` : unavailable],
              ["Event count", incidents.length ? incidents.length.toLocaleString("en-IN") : unavailable],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-950/82 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
                <div className="mt-3 text-xl font-semibold text-slate-100">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden border border-slate-800/80 bg-slate-950/45">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 px-5 py-4">
            <SectionHeader eyebrow="Congestion Event Timeline" title="Event history" meta={incidents.length ? `Showing ${visibleIncidents.length} of ${incidents.length}` : undefined} />
            {incidents.length > initialIncidentCount && (
              <button
                type="button"
                onClick={() => setShowAllIncidents((value) => !value)}
                className="rounded-md border border-sky-400/30 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300 transition hover:border-sky-300/70 hover:bg-sky-400/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
              >
                {showAllIncidents ? "Show less" : "Show more"}
              </button>
            )}
          </div>
          {incidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/35">
                    {["TIMESTAMP", "CONGESTION", "CONFIDENCE", "DURATION", "STATUS"].map((header) => (
                      <th key={header} className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-slate-800/45 last:border-b-0 hover:bg-sky-400/[0.035]">
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-400">{incident.timestamp}</td>
                      <td className="px-5 py-4"><CongestionBadge level={incident.congestion} /></td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-300">{incident.confidence.toFixed(2)}%</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">{formatDuration(incident.duration)}</td>
                      <td className="px-5 py-4 font-mono text-xs uppercase tracking-[0.14em] text-slate-300">{incident.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10">
              <EmptyState message={loading ? "Loading congestion event timeline..." : "No congestion event timeline records are available."} />
            </div>
          )}
        </section>

        <section className="border border-cyan-400/20 bg-cyan-950/10 px-5 py-5 shadow-[0_0_32px_rgba(34,211,238,0.06)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">AI Report Insight</p>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">{insight}</p>
        </section>
      </div>
    </div>
  );
}
