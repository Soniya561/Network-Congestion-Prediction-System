import { useState, useEffect, useRef } from "react";

interface LoginPageProps {
  onLogin: () => void;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  pulse: number;
}

interface Packet {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const packetsRef = useRef<Packet[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = window.innerWidth || 800;
    const H = canvas.height = window.innerHeight || 600;

    const colors = ["#38bdf8", "#818cf8", "#22d3ee", "#34d399", "#a78bfa"];
    const nodes: Node[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2.5 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI * 2,
    }));
    nodesRef.current = nodes;

    const packets: Packet[] = [];
    packetsRef.current = packets;

    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Starfield
      ctx.fillStyle = "#020817";
      ctx.fillRect(0, 0, W, H);

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.25;
            ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Spawn packets occasionally
      if (frame % 30 === 0 && packets.length < 20) {
        const i = Math.floor(Math.random() * nodes.length);
        let j = Math.floor(Math.random() * nodes.length);
        while (j === i) j = Math.floor(Math.random() * nodes.length);
        packets.push({ fromIdx: i, toIdx: j, progress: 0, speed: Math.random() * 0.01 + 0.005, color: colors[Math.floor(Math.random() * colors.length)] });
      }

      // Draw & update packets
      for (let p = packets.length - 1; p >= 0; p--) {
        const pk = packets[p];
        pk.progress += pk.speed;
        if (pk.progress >= 1) { packets.splice(p, 1); continue; }
        const fn = nodes[pk.fromIdx];
        const tn = nodes[pk.toIdx];
        const px = fn.x + (tn.x - fn.x) * pk.progress;
        const py = fn.y + (tn.y - fn.y) * pk.progress;
        ctx.fillStyle = pk.color;
        ctx.shadowColor = pk.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += 0.03;
        const pulseR = n.r + Math.sin(n.pulse) * 1.5;

        ctx.shadowColor = n.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Scan line effect
      if (H <= 0) { frame++; animRef.current = requestAnimationFrame(draw); return; }
      const scanY = ((frame * 0.5) % H);
      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.5, "rgba(56,189,248,0.06)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 30, W, 60);

      frame++;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let v = 0;
    const id = setInterval(() => {
      v += 3;
      setScanLine(v);
      if (v >= 100) {
        clearInterval(id);
        setTimeout(() => onLogin(), 300);
      }
    }, 20);
    return () => clearInterval(id);
  }, [scanning, onLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScanning(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(56,189,248,0.04) 0%, rgba(2,8,23,0.6) 70%)",
        }}
      />

      {/* Login card */}
      <div
        className="relative z-10 glass-strong rounded-2xl p-8 w-full max-w-md animate-slide-up"
        style={{
          boxShadow: "0 0 80px rgba(56,189,248,0.15), 0 40px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Security shield */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-ring"
              style={{
                background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)",
                border: "1px solid rgba(56,189,248,0.3)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.2))",
                  border: "1px solid rgba(56,189,248,0.5)",
                  fontSize: "24px",
                }}
              >
                🛡
              </div>
            </div>
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center animate-blink"
              style={{ background: "#34d399", boxShadow: "0 0 10px #34d399", fontSize: "10px" }}
            >
              ✓
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="font-display font-black text-3xl mb-2 text-glow-blue"
            style={{ color: "#38bdf8", letterSpacing: "0.2em" }}
          >
            NETSENSE AI
          </h1>
          <p className="text-sm" style={{ color: "#64748b", lineHeight: 1.6 }}>
            Predict. Prevent. Optimize.<br />
            <span style={{ color: "#94a3b8" }}>Your Network Before Congestion Happens.</span>
          </p>
        </div>

        {/* Scan overlay when authenticating */}
        {scanning && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-20">
            <div
              className="absolute left-0 right-0 h-0.5 transition-all"
              style={{
                top: `${scanLine}%`,
                background: "linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)",
                boxShadow: "0 0 20px rgba(56,189,248,0.8)",
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(2,8,23,0.4)" }}
            >
              <div className="text-center">
                <div
                  className="font-display text-sm text-glow-blue mb-2"
                  style={{ color: "#38bdf8", letterSpacing: "0.15em" }}
                >
                  AUTHENTICATING...
                </div>
                <div className="font-mono text-xs" style={{ color: "#64748b" }}>
                  AI SECURITY SCAN {scanLine}%
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="font-mono text-xs mb-1.5 block"
              style={{ color: "#64748b", letterSpacing: "0.1em" }}
            >
              OPERATOR EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@netsense.ai"
              className="w-full px-4 py-3 rounded-lg font-body text-sm outline-none transition-all"
              style={{
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(56,189,248,0.2)",
                color: "#e2e8f0",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(56,189,248,0.6)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(56,189,248,0.2)")}
            />
          </div>
          <div>
            <label
              className="font-mono text-xs mb-1.5 block"
              style={{ color: "#64748b", letterSpacing: "0.1em" }}
            >
              ACCESS KEY
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 rounded-lg font-body text-sm outline-none transition-all"
              style={{
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(56,189,248,0.2)",
                color: "#e2e8f0",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(56,189,248,0.6)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(56,189,248,0.2)")}
            />
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              className="btn-primary w-full py-3 rounded-lg text-sm"
              disabled={scanning}
            >
              Access Dashboard
            </button>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="btn-secondary w-full py-3 rounded-lg text-sm"
            >
              Enterprise SSO Login
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: "#34d399" }} />
            <span className="font-mono text-xs" style={{ color: "#34d399" }}>SECURE CONNECTION</span>
          </div>
          <span className="font-mono text-xs" style={{ color: "#475569" }}>TLS 1.3 / AES-256</span>
        </div>
      </div>

      {/* Corner decorations */}
      {[
        "top-4 left-4",
        "top-4 right-4 rotate-90",
        "bottom-4 left-4 -rotate-90",
        "bottom-4 right-4 rotate-180",
      ].map((pos, i) => (
        <div key={i} className={`absolute ${pos} opacity-30`} style={{ color: "#38bdf8", fontSize: "20px" }}>
          ⌐
        </div>
      ))}
    </div>
  );
}
