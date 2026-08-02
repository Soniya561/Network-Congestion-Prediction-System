export interface TopologyNode {
  id: string;
  x: number;
  y: number;
  type: "datacenter" | "router" | "cloud" | "device";
  status: "healthy" | "warning" | "congested" | "predicted";
  label: string;
}

export interface TrafficPoint {
  time: string;
  traffic: number;
  predicted: number;
  threshold: number;
}

export interface LiveMetrics {
  total_bandwidth: string;
  avg_latency: string;
  packet_loss: string;
  uptime: string;
}

export interface DashboardData {
  network_health: number;
  current_congestion: string;
  confidence: number;
  prediction_next: string;
  connected_devices: number;
  status: string;
  topology_nodes: TopologyNode[];
  edges: string[][];
  traffic_data: TrafficPoint[];
  metrics: LiveMetrics;
}

const NETWORK_NODES: Array<Omit<TopologyNode, "status">> = [
  { id: "dc1", x: 200, y: 150, type: "datacenter", label: "DC Mumbai" },
  { id: "dc2", x: 550, y: 100, type: "datacenter", label: "DC Chennai" },
  { id: "dc3", x: 380, y: 280, type: "cloud", label: "AWS Asia" },
  { id: "r1", x: 140, y: 250, type: "router", label: "Edge-01" },
  { id: "r2", x: 460, y: 200, type: "router", label: "Core-07" },
  { id: "r3", x: 300, y: 160, type: "router", label: "Transit-03" },
  { id: "c1", x: 620, y: 240, type: "cloud", label: "Azure East" },
  { id: "d1", x: 80, y: 320, type: "device", label: "IoT-Cluster" },
  { id: "d2", x: 540, y: 320, type: "device", label: "CDN-Node" },
];

const EDGES = [
  ["dc1", "r3"], ["dc2", "r2"], ["r3", "r2"], ["r3", "dc3"], ["r2", "dc3"],
  ["r1", "dc1"], ["d1", "r1"], ["dc3", "r2"], ["r2", "c1"], ["c1", "d2"],
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function classifyMetric(value: number, warn: number, congest: number) {
  if (value >= congest) return "congested";
  if (value >= warn) return "warning";
  return "healthy";
}

function normalizePrediction(prediction: string) {
  const normalized = prediction?.toLowerCase() ?? "low";
  if (normalized.includes("high")) return "High";
  if (normalized.includes("medium")) return "Medium";
  return "Low";
}

function buildTopologyNodes(telemetry: Record<string, number>, congestionLevel: string): TopologyNode[] {
  const bandwidth = telemetry.Bandwidth_Utilization_Percent ?? 0;
  const latency = telemetry.Latency_ms ?? 0;
  const packetLoss = telemetry.Packet_Loss_Percent ?? 0;
  const cpu = telemetry.CPU_Utilization_Percent ?? 0;
  const memory = telemetry.Memory_Utilization_Percent ?? 0;
  const jitter = telemetry.Jitter_ms ?? 0;
  const queue = telemetry.Queue_Length ?? 0;
  const throughput = telemetry.Throughput_Mbps ?? 0;
  const linkCap = telemetry.Link_Capacity_Mbps ?? 0;
  const throughputRatio = linkCap ? (throughput / linkCap) * 100 : 0;

  const statusMap: Record<string, TopologyNode["status"]> = {
    dc1: classifyMetric(bandwidth, 60, 80),
    dc2: classifyMetric(throughputRatio, 60, 80),
    dc3: classifyMetric(cpu, 60, 80),
    r1: classifyMetric(latency, 25, 50),
    r2: classifyMetric(queue, 250, 500),
    r3: congestionLevel.toLowerCase() === "high" || congestionLevel.toLowerCase() === "medium" ? "predicted" : "healthy",
    c1: classifyMetric(memory, 60, 80),
    d1: classifyMetric(packetLoss, 1, 5),
    d2: classifyMetric(jitter, 5, 10),
  };

  return NETWORK_NODES.map((node) => ({ ...node, status: statusMap[node.id] ?? "healthy" }));
}

function buildTrafficData(telemetry: Record<string, number>, congestionLevel: string): TrafficPoint[] {
  const bandwidth = telemetry.Bandwidth_Utilization_Percent ?? 0;
  const hours = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
  const pattern = [0.50, 0.45, 0.40, 0.55, 0.75, 0.90, 0.95, 0.85, 1.00, 0.80, 0.65, 0.55];
  const label = congestionLevel.toLowerCase();
  const offset = label === "high" ? 5 : label === "medium" ? 3 : 1;

  return hours.map((hour, index) => {
    const actual = clamp(bandwidth * pattern[index], 0, 100);
    const predicted = clamp(actual + offset, 0, 100);
    return { time: hour, traffic: Number(actual.toFixed(1)), predicted: Number(predicted.toFixed(1)), threshold: 80 };
  });
}

function buildMetrics(telemetry: Record<string, number>, congestionLevel: string): LiveMetrics {
  const throughput = telemetry.Throughput_Mbps ?? 0;
  const latency = telemetry.Latency_ms ?? 0;
  const packetLoss = telemetry.Packet_Loss_Percent ?? 0;
  const bandwidthGbps = Number((throughput / 1000).toFixed(1));

  const label = congestionLevel.toLowerCase();
  const uptime = label === "high" ? 97.5 : label === "medium" ? 99.2 : 99.97;

  return {
    total_bandwidth: `${bandwidthGbps} Gbps`,
    avg_latency: `${Number(latency.toFixed(1))} ms`,
    packet_loss: `${Number(packetLoss.toFixed(2))}%`,
    uptime: `${uptime}%`,
  };
}

export function buildDashboardSnapshot(
  telemetry: Record<string, number>,
  prediction: string,
  confidence: number,
): DashboardData {
  const congestionLevel = normalizePrediction(prediction);
  const network_health = congestionLevel === "High"
    ? 48
    : congestionLevel === "Medium"
      ? 72
      : 94;
  const prediction_next = congestionLevel === "High"
    ? "Congestion imminent"
    : congestionLevel === "Medium"
      ? "Monitor traffic in 5 min"
      : "Possible congestion in 10 min";
  const connected_devices = congestionLevel === "High"
    ? 1980000
    : congestionLevel === "Medium"
      ? 2150000
      : 2400000;
  const status = congestionLevel === "High" ? "Critical" : congestionLevel === "Medium" ? "At Risk" : "Stable";

  return {
    network_health,
    current_congestion: congestionLevel,
    confidence,
    prediction_next,
    connected_devices,
    status,
    topology_nodes: buildTopologyNodes(telemetry, congestionLevel),
    edges: EDGES,
    traffic_data: buildTrafficData(telemetry, congestionLevel),
    metrics: buildMetrics(telemetry, congestionLevel),
  };
}
