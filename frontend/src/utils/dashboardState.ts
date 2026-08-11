export interface TopologyNode {
  id: string;
  x: number;
  y: number;
  type: "datacenter" | "router" | "cloud" | "device";
  label: string;
}

export interface LiveMetrics {
  total_bandwidth: string;
  avg_latency: string;
  packet_loss: string;
}

export interface DashboardData {
  current_congestion: string;
  confidence: number;
  active_users: number;
  topology_nodes: TopologyNode[];
  edges: string[][];
  metrics: LiveMetrics;
}

/** Retained for the existing Prediction page event contract without synthetic history. */
export function buildDashboardSnapshot(
  telemetry: Record<string, number>,
  prediction: string,
  confidence: number,
): DashboardData {
  return {
    current_congestion: prediction,
    confidence,
    active_users: telemetry.Active_Users ?? 0,
    topology_nodes: [],
    edges: [],
    metrics: {
      total_bandwidth: `${Number(((telemetry.Throughput_Mbps ?? 0) / 1000).toFixed(1))} Gbps`,
      avg_latency: `${Number((telemetry.Latency_ms ?? 0).toFixed(1))} ms`,
      packet_loss: `${Number((telemetry.Packet_Loss_Percent ?? 0).toFixed(2))}%`,
    },
  };
}
