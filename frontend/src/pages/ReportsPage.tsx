import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import api from "../api/api.ts"

interface AnalyticsData {
  available?: boolean
  model_name: string | null
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1_score: number | null
}

interface MLOpsData {
  latency_history?: Array<{ time: number latency_ms: number }>
}

interface ReportsData {
  summary: {
    total_events_30d: number | null
    avg_resolution_minutes: number | null
    prevented_outages: number | null
  }
  traffic_history: Array<{
    created_at_utc: string
    bandwidth_utilization_percent: number
    predicted_congestion_level: string
  }>
  incident_history: Array<{
    id: number
    created_at_utc: string
    resolved_at_utc: string | null
    congestion_level: string
    confidence_percent: number
    status: string
    escalation_count: number
    duration_minutes: number | null
  }>
}

type CongestionLevel = "Low" | "Medium" | "High" | "Unavailable"
type IncidentStatus = "INVESTIGATING" | "RESOLVED" | "PREDICTED" | "UNAVAILABLE"

interface IncidentPoint {
  id: number
  createdAtUtc: string
  timestamp: string
  congestion: CongestionLevel
  confidence: number | null
  status: IncidentStatus
  duration: number | null
}

interface LatencyPoint {
  timestamp: string
  timeLabel: string
  latency: number
}

const unavailable = "UNAVAILABLE"
const initialIncidentCount = 8
const severityOrder: CongestionLevel[] = ["Low", "Medium", "High"]
const severityMeta: Record<CongestionLevel, {
  label: string
  color: string
  soft: string
  border: string
}> = {
  Low: {
    label: "LOW",
    color: "#34d399",
    soft: "rgba(52,211,153,0.11)",
    border: "rgba(52,211,153,0.34)",
  },
  Medium: {
    label: "MEDIUM",
    color: "#fbbf24",
    soft: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.36)",
  },
  High: {
    label: "HIGH",
    color: "#f87171",
    soft: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.38)",
  },
  Unavailable: {
    label: unavailable,
    color: "#94a3b8",
    soft: "rgba(148,163,184,0.09)",
    border: "rgba(148,163,184,0.22)",
  },
}

function normalizeCongestion(value?: string | null): CongestionLevel {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized.includes("high") || normalized.includes("critical"))
    return "High"
  if (normalized.includes("medium")) return "Medium"
  if (normalized.includes("low")) return "Low"
  return "Unavailable"
}

function normalizeStatus(value?: string | null): IncidentStatus {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized.includes("resolved") || normalized.includes("closed"))
    return "RESOLVED"
  if (
    normalized.includes("investigat") ||
    normalized.includes("open") ||
    normalized.includes("active")
  )
    return "INVESTIGATING"
  if (normalized.includes("predict")) return "PREDICTED"
  return "UNAVAILABLE"
}

function severityRank(level: CongestionLevel) {
  return level === "High" ? 3 : level === "Medium" ? 2 : level === "Low" ? 1 : 0
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return unavailable
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return unavailable
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function formatDateOnly(value: string | Date | null | undefined) {
  if (!value) return unavailable
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return unavailable
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(value: string | Date | null | undefined) {
  if (!value) return unavailable
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return unavailable
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function formatMetric(value: number | null | undefined) {
  return value === null || value === undefined
    ? unavailable
    : value.toLocaleString("en-IN")
}

function normalizeScore(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  return value <= 1 ? value * 100 : value
}

function formatPercent(value: number | null | undefined, digits = 2) {
  const score = normalizeScore(value)
  return score === null ? unavailable : `${score.toFixed(digits)}%`
}

function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return unavailable
  return minutes < 1 ? "<1 min" : `${minutes.toFixed(1)} min`
}

function csvCell(value: string | number | null | undefined) {
  const text =
    value === null || value === undefined ? unavailable : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

async function loadAnalyticsData() {
  try {
    return (await api.get<AnalyticsData>("/ml/analytics")).data
  } catch {
    return (await api.get<AnalyticsData>("/analytics")).data
  }
}

function getLatestTimestamp(
  reports: ReportsData | null,
  latencyHistory: LatencyPoint[],
) {
  const dates = [
    ...(reports?.traffic_history ?? []).map((point) => point.created_at_utc),
    ...(reports?.incident_history ?? []).map(
      (incident) => incident.created_at_utc,
    ),
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))

  if (dates.length > 0)
    return formatDateTime(
      new Date(Math.max(...dates.map((date) => date.getTime()))),
    )
  return latencyHistory.at(-1)?.timestamp ?? unavailable
}

function buildInsight(
  incidents: IncidentPoint[],
  accuracy: number | null | undefined,
) {
  if (incidents.length === 0)
    return "Insufficient historical data for a reliable trend conclusion."

  const counts = { Low: 0, Medium: 0, High: 0 }
  incidents.forEach((incident) => {
    if (incident.congestion !== "Unavailable") counts[incident.congestion] += 1
  })

  const dominant = severityOrder.reduce(
    (best, level) => (counts[level] > counts[best] ? level : best),
    "Low" as CongestionLevel,
  )
  const hasDistribution = counts[dominant] > 0
  const recent = incidents.slice(0, Math.min(5, incidents.length))
  const recurringRecent =
    recent.length >= 3 &&
    recent.every((incident) => incident.congestion === dominant)
  const insightParts = []

  if (hasDistribution)
    insightParts.push(
      `${severityMeta[dominant].label} congestion is the dominant recorded severity.`,
    )
  if (accuracy !== null && accuracy !== undefined)
    insightParts.push(
      `Model evaluation accuracy is ${formatPercent(accuracy)}.`,
    )
  if (recurringRecent)
    insightParts.push(
      `Recent telemetry indicates recurring ${severityMeta[dominant].label.toLowerCase()}-congestion events.`,
    )

  return insightParts.length
    ? insightParts.join(" ")
    : "Insufficient historical data for a reliable trend conclusion."
}

function EmptyState({ title, message }: { title?: string message: string }) {
  return (
    <div className="flex h-full min-h-[166px] flex-col items-center justify-center rounded-md border border-dashed border-slate-800/85 bg-slate-950/45 px-5 text-center">
      {title && (
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
          {title}
        </div>
      )}
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>
    </div>
  )
}

function SectionTitle({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow: string
  title: string
  description?: string
  meta?: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-100">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        )}
      </div>
      {meta && (
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {meta}
        </div>
      )}
    </div>
  )
}

function SeverityBadge({ level }: { level: CongestionLevel }) {
  const meta = severityMeta[level]
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.14em]"
      style={{
        color: meta.color,
        background: meta.soft,
        border: `1px solid ${meta.border}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
      />
      {meta.label}
    </span>
  )
}

function SummaryItem({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note: string
  tone: string
}) {
  const unavailableValue = value === unavailable
  return (
    <div className="min-w-[155px] flex-1 px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div
        className="mt-2 text-2xl font-black tracking-normal"
        style={{ color: unavailableValue ? "#94a3b8" : tone }}
      >
        {value}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {unavailableValue ? note : "From current report source"}
      </p>
    </div>
  )
}

function LatencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string value?: number payload?: LatencyPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-md border border-cyan-400/25 bg-slate-950/95 px-4 py-3 text-xs shadow-2xl">
      <div className="font-mono uppercase tracking-[0.15em] text-slate-500">
        {item.payload?.timestamp ?? label}
      </div>
      <div className="mt-2 text-slate-200">
        Latency:{" "}
        <span className="font-semibold text-cyan-300">
          {typeof item.value === "number"
            ? `${item.value.toFixed(2)} ms`
            : unavailable}
        </span>
      </div>
    </div>
  )
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number
    payload?: { level: CongestionLevel percent: number }
  }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-md border border-cyan-400/25 bg-slate-950/95 px-4 py-3 text-xs shadow-2xl">
      <div className="font-mono uppercase tracking-[0.15em] text-slate-500">
        {item.payload?.level ?? item.name}
      </div>
      <div className="mt-2 text-slate-200">
        Events:{" "}
        <span className="font-semibold text-cyan-300">{item.value ?? 0}</span>
      </div>
      <div className="mt-1 text-slate-400">
        {(item.payload?.percent ?? 0).toFixed(1)}% of recorded events
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [reports, setReports] = useState<ReportsData | null>(null)
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllIncidents, setShowAllIncidents] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    let active = true

    const loadReports = async () => {
      const [reportsResult, analyticsResult, mlopsResult] =
        await Promise.allSettled([
          api.get<ReportsData>("/reports"),
          loadAnalyticsData(),
          api.get<MLOpsData>("/mlops/status"),
        ])

      if (!active) return

      const mlopsLatency =
        mlopsResult.status === "fulfilled"
          ? (mlopsResult.value.data.latency_history ?? [])
          : []

      setReports(
        reportsResult.status === "fulfilled" ? reportsResult.value.data : null,
      )
      setAnalytics(
        analyticsResult.status === "fulfilled" ? analyticsResult.value : null,
      )
      setLatencyHistory(
        mlopsLatency
          .slice()
          .sort((a, b) => a.time - b.time)
          .map((point) => ({
            timestamp: formatDateTime(new Date(point.time * 1000)),
            timeLabel: formatTime(new Date(point.time * 1000)),
            latency: point.latency_ms,
          })),
      )
      setError(
        reportsResult.status === "rejected" &&
          analyticsResult.status === "rejected" &&
          mlopsResult.status === "rejected"
          ? "Report services are currently unavailable."
          : null,
      )
      setLoading(false)
    }

    void loadReports()
    const intervalId = window.setInterval(() => void loadReports(), 5000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  const trafficSamples = reports?.traffic_history ?? []
  const incidents = useMemo<IncidentPoint[]>(() => {
    return (reports?.incident_history ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at_utc).getTime() -
          new Date(a.created_at_utc).getTime(),
      )
      .map((incident) => ({
        id: incident.id,
        createdAtUtc: incident.created_at_utc,
        timestamp: formatDateTime(incident.created_at_utc),
        congestion: normalizeCongestion(incident.congestion_level),
        confidence: incident.confidence_percent ?? null,
        status: normalizeStatus(incident.status),
        duration: incident.duration_minutes,
      }))
  }, [reports])

  const distribution = useMemo(() => {
    const counts: Record<CongestionLevel, number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Unavailable: 0,
    }
    incidents.forEach((incident) => {
      counts[incident.congestion] += 1
    })

    const totalKnown = Math.max(1, counts.Low + counts.Medium + counts.High)
    return severityOrder.map((level) => ({
      level,
      name: severityMeta[level].label,
      count: counts[level],
      percent: (counts[level] / totalKnown) * 100,
      fill: severityMeta[level].color,
    }))
  }, [incidents])

  const knownEventCount = distribution.reduce(
    (sum, item) => sum + item.count,
    0,
  )
  const dominantSeverity =
    knownEventCount > 0
      ? distribution.reduce(
          (best, item) => (item.count > best.count ? item : best),
          distribution[0],
        ).level
      : "Unavailable" as CongestionLevel
  const dominantEventCount =
    knownEventCount > 0
      ? (distribution.find((item) => item.level === dominantSeverity)?.count ??
        0)
      : 0
  const highestSeverity = incidents.reduce(
    (highest, incident) =>
      severityRank(incident.congestion) > severityRank(highest)
        ? incident.congestion
        : highest,
    "Unavailable" as CongestionLevel,
  )
  const highShare =
    knownEventCount > 0
      ? (distribution.find((item) => item.level === "High")?.count ?? 0) /
        knownEventCount
      : 0
  const riskProfile =
    knownEventCount === 0
      ? unavailable
      : dominantSeverity === "High" || highShare >= 0.28
        ? "ELEVATED"
        : dominantSeverity === "Medium"
          ? "MODERATE"
          : "LOW"

  const reportDates = [
    ...trafficSamples.map((point) => point.created_at_utc),
    ...incidents.map((incident) => incident.createdAtUtc),
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  const reportPeriod =
    reportDates.length > 0
      ? `${formatDateOnly(reportDates[0])} - ${formatDateOnly(reportDates[reportDates.length - 1])}`
      : unavailable

  const latestTimestamp = getLatestTimestamp(reports, latencyHistory)
  const latestTraffic = trafficSamples
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at_utc).getTime() -
        new Date(b.created_at_utc).getTime(),
    )
    .at(-1)
  const activeCongestion = latestTraffic
    ? normalizeCongestion(latestTraffic.predicted_congestion_level)
    : "Unavailable"
  const latestIncident = incidents.at(0)
  const visibleIncidents = showAllIncidents
    ? incidents
    : incidents.slice(0, initialIncidentCount)
  const hasLatencyHistory = latencyHistory.length >= 2
  const insight = buildInsight(incidents, analytics?.accuracy)

  const performanceRows = [
    {
      metric: "ACCURACY",
      value: normalizeScore(analytics?.accuracy),
      rawValue: analytics?.accuracy,
      fill: "#38bdf8",
    },
    {
      metric: "PRECISION",
      value: normalizeScore(analytics?.precision),
      rawValue: analytics?.precision,
      fill: "#a78bfa",
    },
    {
      metric: "RECALL",
      value: normalizeScore(analytics?.recall),
      rawValue: analytics?.recall,
      fill: "#34d399",
    },
    {
      metric: "F1 SCORE",
      value: normalizeScore(analytics?.f1_score),
      rawValue: analytics?.f1_score,
      fill: "#22d3ee",
    },
  ]

  const summary = [
    {
      label: "Total Events",
      value: formatMetric(reports?.summary.total_events_30d),
      note: "No event summary returned",
      tone: "#38bdf8",
    },
    {
      label: "Model Accuracy",
      value: formatPercent(analytics?.accuracy),
      note: "No model analytics returned",
      tone: "#a78bfa",
    },
    {
      label: "Active Congestion Level",
      value: severityMeta[activeCongestion].label,
      note: "No latest telemetry returned",
      tone: severityMeta[activeCongestion].color,
    },
    {
      label: "Data Samples",
      value: trafficSamples.length
        ? trafficSamples.length.toLocaleString("en-IN")
        : unavailable,
      note: "No traffic samples returned",
      tone: "#22d3ee",
    },
  ]

  const downloadReport = () => {
    const generatedAt = new Date()
    const summaryRows = [
      ["NETSENSE AI Congestion Report", ""],
      ["Generated at", generatedAt.toISOString()],
      ["Report period", reportPeriod],
      ["Total events", formatMetric(reports?.summary.total_events_30d)],
      ["Dominant congestion level", severityMeta[dominantSeverity].label],
      ["Dominant classified events", dominantEventCount],
      ["Total classified", knownEventCount],
      ["Highest recorded severity", severityMeta[highestSeverity].label],
      ["Risk profile", riskProfile],
      ["Model", analytics?.model_name || "RandomForest_Model"],
      ["Model status", analytics?.available === false ? unavailable : "ACTIVE"],
      ["Model accuracy", formatPercent(analytics?.accuracy)],
      ["Model precision", formatPercent(analytics?.precision)],
      ["Model recall", formatPercent(analytics?.recall)],
      ["Model F1 score", formatPercent(analytics?.f1_score)],
      ["Latest event", latestIncident ? latestIncident.timestamp : unavailable],
      ["", ""],
      ["Severity distribution", ""],
      ...distribution.map((item) => [`${item.name} events`, item.count]),
      ["", ""],
      ["Incident timeline", ""],
      ["Timestamp", "Congestion", "Confidence", "Duration", "Status"],
      ...incidents.map((incident) => [
        incident.timestamp,
        severityMeta[incident.congestion].label,
        formatPercent(incident.confidence),
        formatDuration(incident.duration),
        incident.status,
      ]),
    ]

    const csv = summaryRows
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const filenameDate = generatedAt.toISOString().slice(0, 10)
    link.href = url
    link.download = `netsense-congestion-report-${filenameDate}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    window.setTimeout(() => setDownloaded(false), 2200)
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.98) 0%, rgba(3,7,18,0.97) 54%, rgba(2,6,23,0.99) 100%), radial-gradient(circle at 18% 0%, rgba(34,211,238,0.13), transparent 27%), radial-gradient(circle at 86% 14%, rgba(167,139,250,0.10), transparent 24%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1540px] flex-col gap-7">
        <header className="grid gap-6 border-b border-cyan-400/25 pb-6 pt-2 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300">
              NETSENSE AI / REPORTS
            </p>
            <h1 className="mt-3 font-display text-3xl font-black tracking-normal text-slate-100 sm:text-4xl">
              NETWORK PERFORMANCE REPORT
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 sm:text-base">
              Historical network behavior, congestion events, model performance
              and operational analysis
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/60 text-center font-mono shadow-[0_18px_60px_rgba(8,47,73,0.18)]">
            <div className="border-r border-slate-800/80 px-3 py-3">
              <div className="mx-auto mb-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                LIVE DATA
              </div>
            </div>
            <div className="border-r border-slate-800/80 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                LATEST
              </div>
              <div className="mt-2 text-[11px] leading-4 text-slate-200">
                {latestTimestamp}
              </div>
            </div>
            <div className="px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                REPORT
              </div>
              <div className="mt-2 text-[11px] tracking-[0.14em] text-slate-200">
                READY
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-rose-400/25 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className="grid overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/50 shadow-[0_24px_70px_rgba(2,6,23,0.36)] sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item, index) => (
            <div
              key={item.label}
              className={
                index === summary.length - 1
                  ? ""
                  : "border-b border-slate-800/70 sm:border-r xl:border-b-0"
              }
            >
              <SummaryItem
                label={item.label}
                value={item.value}
                note={item.note}
                tone={item.tone}
              />
            </div>
          ))}
        </section>

        <section className="rounded-md border border-slate-800/80 bg-slate-950/50 p-5 shadow-[0_30px_90px_rgba(2,6,23,0.38)] sm:p-6">
          <SectionTitle
            eyebrow="Congestion Analysis"
            title="Severity composition and model confidence"
            description="Classified event distribution and Random Forest evaluation from the live report sources."
            meta={
              knownEventCount
                ? `${knownEventCount} classified events`
                : "No classified events"
            }
          />
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(250px,0.3fr)_minmax(260px,0.3fr)_minmax(340px,0.4fr)] xl:items-center">
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-slate-800/65 bg-slate-900/15 p-4">
              <div className="relative h-[220px] w-full max-w-[260px]">
                {knownEventCount > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<DistributionTooltip />} />
                        <Pie
                          data={distribution}
                          dataKey="count"
                          nameKey="name"
                          innerRadius="61%"
                          outerRadius="86%"
                          paddingAngle={4}
                          stroke="rgba(2,6,23,0.95)"
                          strokeWidth={4}
                        >
                          {distribution.map((entry) => (
                            <Cell key={entry.level} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                        Dominant
                      </div>
                      <div
                        className="mt-1 text-xl font-black tracking-normal"
                        style={{ color: severityMeta[dominantSeverity].color }}
                      >
                        {severityMeta[dominantSeverity].label}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        {dominantEventCount} events
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    message={
                      loading
                        ? "Loading event distribution..."
                        : "No congestion events are available for distribution analysis."
                    }
                  />
                )}
              </div>
              <div className="mt-3 grid w-full gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-slate-500 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {distribution.map((item) => (
                  <div
                    key={item.level}
                    className="flex items-center justify-center gap-2 rounded-md border border-slate-800/60 bg-slate-950/45 px-2 py-2"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: item.fill,
                        boxShadow: `0 0 12px ${item.fill}`,
                      }}
                    />
                    <span className="text-slate-300">{item.name}</span>
                    <span>{item.count} events</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-md border border-slate-800/65 bg-slate-900/15 p-4">
              <div className="grid gap-3">
                {[
                  ["DOMINANT CONGESTION", severityMeta[dominantSeverity].label],
                  [
                    "TOTAL CLASSIFIED",
                    knownEventCount
                      ? knownEventCount.toLocaleString("en-IN")
                      : unavailable,
                  ],
                  ["HIGHEST SEVERITY", severityMeta[highestSeverity].label],
                  ["RISK PROFILE", riskProfile],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-slate-800/70 pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </span>
                    <span className="text-right text-sm font-semibold text-slate-100">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-800/75 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Distribution Indicator
                </div>
                <div className="mt-3 space-y-3">
                  {distribution.map((item) => (
                    <div key={item.level}>
                      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
                        <span style={{ color: item.fill }}>{item.name}</span>
                        <span className="text-slate-500">
                          {item.count} events
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percent}%`,
                            background: item.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(15,23,42,0.44)_50%,rgba(124,58,237,0.09))] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
                    MODEL PERFORMANCE
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-100">
                    {analytics?.model_name || "RandomForest_Model"}
                  </h3>
                </div>
                <span className="rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  {analytics?.available === false ? unavailable : "ACTIVE"}
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {performanceRows.map((row) => (
                  <div
                    key={row.metric}
                    className={
                      row.metric === "F1 SCORE"
                        ? "rounded-md border border-cyan-300/25 bg-cyan-300/5 p-3"
                        : ""
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.15em]">
                      <span
                        className={
                          row.metric === "F1 SCORE"
                            ? "text-cyan-200"
                            : "text-slate-400"
                        }
                      >
                        {row.metric}
                      </span>
                      <span className="text-slate-100">
                        {formatPercent(row.rawValue)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(row.value ?? 0, 100)}%`,
                          background: row.fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-2 border-t border-slate-800/80 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-2">
                <div>
                  MODEL{" "}
                  <span className="ml-2 text-slate-200">
                    {analytics?.model_name || "RandomForest_Model"}
                  </span>
                </div>
                <div>
                  STATUS{" "}
                  <span
                    className={
                      analytics?.available === false
                        ? "ml-2 text-slate-400"
                        : "ml-2 text-emerald-300"
                    }
                  >
                    {analytics?.available === false ? unavailable : "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.11),rgba(15,23,42,0.48)_42%,rgba(124,58,237,0.10))] p-5 shadow-[0_24px_80px_rgba(8,47,73,0.2)] sm:p-6">
          <SectionTitle
            eyebrow="Congestion Report"
            title="Downloadable analysis package"
            description="Generate a downloadable summary of recorded congestion events."
            meta="Frontend CSV export"
          />
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
            <div className="rounded-md border border-slate-700/70 bg-slate-950/60 p-4">
              {[
                ["Report period", reportPeriod],
                [
                  "Total events",
                  formatMetric(reports?.summary.total_events_30d),
                ],
                [
                  "Dominant congestion level",
                  severityMeta[dominantSeverity].label,
                ],
                [
                  "Highest recorded severity",
                  severityMeta[highestSeverity].label,
                ],
                ["Model accuracy", formatPercent(analytics?.accuracy)],
                [
                  "Latest event",
                  latestIncident ? latestIncident.timestamp : unavailable,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-slate-800/70 py-3 last:border-b-0"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </span>
                  <span className="text-right text-sm font-semibold text-slate-200">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {hasLatencyHistory && (
              <div className="rounded-md border border-slate-800/75 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Prediction Latency
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-200">
                      Runtime response history
                    </div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-300">
                    {latencyHistory.length} points
                  </div>
                </div>
                <div className="mt-4 h-[138px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={latencyHistory}
                      margin={{ top: 6, right: 8, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="latencyFillReports"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#22d3ee"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#22d3ee"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="rgba(148,163,184,0.09)"
                        strokeDasharray="3 8"
                      />
                      <XAxis dataKey="timeLabel" hide />
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Tooltip content={<LatencyTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="latency"
                        name="Prediction latency"
                        stroke="#22d3ee"
                        strokeWidth={2.3}
                        fill="url(#latencyFillReports)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={downloadReport}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-md border border-cyan-400/35 bg-cyan-400/10 px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-400/15 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <span className="relative inline-block h-4 w-4">
              <span className="absolute left-[7px] top-0 h-2.5 w-px bg-cyan-200" />
              <span className="absolute left-[4px] top-[6px] h-2 w-2 rotate-45 border-b border-r border-cyan-200" />
              <span className="absolute bottom-0 left-[2px] h-px w-3 bg-cyan-200" />
            </span>
            {downloaded ? "REPORT DOWNLOADED" : "DOWNLOAD CONGESTION REPORT"}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            CSV is generated in-browser from the currently loaded report,
            incident, distribution and model analytics data.
          </p>
        </section>

        <section className="overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/50">
          <div className="flex flex-col gap-4 border-b border-slate-800/80 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              eyebrow="Congestion Event History"
              title="Investigation timeline"
              description="Newest recorded congestion events, confidence, duration and investigation status."
              meta={
                incidents.length
                  ? `Showing ${visibleIncidents.length} of ${incidents.length}`
                  : "No events"
              }
            />
            {incidents.length > initialIncidentCount && (
              <button
                type="button"
                onClick={() => setShowAllIncidents((value) => !value)}
                className="w-fit rounded-md border border-cyan-400/30 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300 transition hover:border-cyan-300/70 hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                {showAllIncidents ? "SHOW LESS" : "SHOW MORE"}
              </button>
            )}
          </div>
          {incidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/30">
                    {[
                      "TIMESTAMP",
                      "CONGESTION",
                      "CONFIDENCE",
                      "DURATION",
                      "STATUS",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="border-b border-slate-800/50 transition last:border-b-0 hover:bg-cyan-400/[0.035]"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-400">
                        {incident.timestamp}
                      </td>
                      <td className="px-5 py-4">
                        <SeverityBadge level={incident.congestion} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-300">
                        {formatPercent(incident.confidence)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-400">
                        {formatDuration(incident.duration)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-900/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300">
                          <span
                            className={
                              incident.status === "RESOLVED"
                                ? "h-1.5 w-1.5 rounded-full bg-emerald-300"
                                : incident.status === "INVESTIGATING"
                                  ? "h-1.5 w-1.5 rounded-full bg-amber-300"
                                  : incident.status === "PREDICTED"
                                    ? "h-1.5 w-1.5 rounded-full bg-cyan-300"
                                    : "h-1.5 w-1.5 rounded-full bg-slate-500"
                            }
                          />
                          {incident.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10">
              <EmptyState
                message={
                  loading
                    ? "Loading congestion event history..."
                    : "No congestion event records are available."
                }
              />
            </div>
          )}
        </section>

        <section className="rounded-md border border-cyan-400/20 bg-slate-950/45 p-5 pb-6 sm:p-6">
          <SectionTitle
            eyebrow="Report Insights"
            title="Data-derived conclusion"
            meta="No fabricated telemetry"
          />
          <p className="mt-4 max-w-5xl text-sm leading-7 text-slate-300">
            {insight}
          </p>
          {latestIncident && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">
              Latest event: {latestIncident.timestamp} /{" "}
              {severityMeta[latestIncident.congestion].label}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
