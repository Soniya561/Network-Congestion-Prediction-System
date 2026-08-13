import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import api from "../api/api";

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

type LoginStage = "email" | "otp";
type NoticeState = "idle" | "success" | "invalid" | "expired";

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 300;

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [stage, setStage] = useState<LoginStage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeRemaining, setTimeRemaining] = useState(OTP_TTL_SECONDS);
  const [notice, setNotice] = useState<NoticeState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const packetsRef = useRef<Packet[]>([]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#38bdf8", "#818cf8", "#22d3ee", "#34d399", "#a78bfa"];
    let width = 0;
    let height = 0;
    let frame = 0;

    const resizeCanvas = () => {
      width = canvas.width = window.innerWidth || 800;
      height = canvas.height = window.innerHeight || 600;
      nodesRef.current = Array.from({ length: 56 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 2.2 + 1.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      }));
      packetsRef.current = [];
    };

    const draw = () => {
      const nodes = nodesRef.current;
      const packets = packetsRef.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#020817";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 170) {
            const alpha = (1 - dist / 170) * 0.22;
            ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      if (frame % 34 === 0 && packets.length < 18) {
        const fromIdx = Math.floor(Math.random() * nodes.length);
        let toIdx = Math.floor(Math.random() * nodes.length);
        while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * nodes.length);
        packets.push({
          fromIdx,
          toIdx,
          progress: 0,
          speed: Math.random() * 0.012 + 0.006,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const packet = packets[i];
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packets.splice(i, 1);
          continue;
        }
        const fromNode = nodes[packet.fromIdx];
        const toNode = nodes[packet.toIdx];
        const x = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * packet.progress;
        ctx.fillStyle = packet.color;
        ctx.shadowColor = packet.color;
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.pulse += 0.025;

        ctx.shadowColor = node.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + Math.sin(node.pulse) * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      const scanY = (frame * 0.45) % Math.max(height, 1);
      const grad = ctx.createLinearGradient(0, scanY - 28, 0, scanY + 28);
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.5, "rgba(56,189,248,0.055)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 28, width, 56);

      frame++;
      animRef.current = requestAnimationFrame(draw);
    };

    resizeCanvas();
    draw();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (stage !== "otp" || timeRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
          setNotice("expired");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [stage, timeRemaining]);

  const resetOtpEntry = () => {
    setOtp(Array(OTP_LENGTH).fill(""));
  };

  const clearOtpStatus = () => {
    setNotice("idle");
    setStatusMessage("");
  };

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail) {
      setEmailError("Enter your registered operator email.");
      return;
    }

    setEmailError("");
    setSending(true);
    clearOtpStatus();
    try {
      await api.post("/auth/request-otp", { email: nextEmail });
      setStage("otp");
      setTimeRemaining(OTP_TTL_SECONDS);
      setNotice("success");
      setStatusMessage("OTP sent to your email.");
      resetOtpEntry();
      window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (error) {
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setEmailError(message || "Unable to send OTP. Check SMTP settings and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    setNotice("idle");
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pastedDigits) return;

    const nextOtp = Array(OTP_LENGTH).fill("");
    pastedDigits.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });
    setOtp(nextOtp);
    otpRefs.current[Math.min(pastedDigits.length, OTP_LENGTH) - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (otp.some((digit) => !digit)) {
      setNotice("invalid");
      setStatusMessage("Enter the full 6-digit OTP.");
      return;
    }

    setVerifying(true);
    try {
      await api.post("/auth/verify-otp", { email: email.trim(), otp: otp.join("") });
      onLogin();
    } catch (error) {
      const status = typeof error === "object" && error && "response" in error
        ? (error as { response?: { status?: number; data?: { detail?: string } } }).response
        : undefined;
      if (status?.status === 410 || status?.data?.detail?.toLowerCase().includes("expired")) {
        setNotice("expired");
        setStatusMessage(status.data?.detail || "OTP expired. Request a new code.");
      } else {
        setNotice("invalid");
        setStatusMessage(status?.data?.detail || "Invalid OTP.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    clearOtpStatus();
    try {
      await api.post("/auth/request-otp", { email: email.trim() });
      setTimeRemaining(OTP_TTL_SECONDS);
      resetOtpEntry();
      setNotice("success");
      setStatusMessage("A new OTP was sent.");
      otpRefs.current[0]?.focus();
    } catch (error) {
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setNotice("invalid");
      setStatusMessage(message || "Unable to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    setStage("email");
    setTimeRemaining(OTP_TTL_SECONDS);
    resetOtpEntry();
    clearOtpStatus();
    setEmailError("");
  };

  const showOtpNotice = notice !== "idle" || Boolean(statusMessage);

  return (
    <div className="relative min-h-screen w-screen overflow-hidden flex items-center justify-center px-4 py-8">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(56,189,248,0.08) 0%, rgba(2,8,23,0.62) 58%, rgba(2,8,23,0.92) 100%)",
        }}
      />

      <main
        className="relative z-10 glass-strong rounded-2xl w-full max-w-md animate-slide-up"
        style={{
          boxShadow: "0 0 80px rgba(56,189,248,0.16), 0 40px 80px rgba(0,0,0,0.52)",
          border: "1px solid rgba(56,189,248,0.22)",
        }}
      >
        <div className="p-7 sm:p-8">
          <div className="flex justify-center mb-6">
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center animate-pulse-ring"
              style={{
                background: "radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)",
                border: "1px solid rgba(56,189,248,0.32)",
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(52,211,153,0.12))",
                  border: "1px solid rgba(56,189,248,0.48)",
                  boxShadow: "inset 0 0 24px rgba(56,189,248,0.08)",
                }}
                aria-hidden="true"
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L5.5 5.5V11C5.5 15.2 8.2 18.9 12 20.2C15.8 18.9 18.5 15.2 18.5 11V5.5L12 3Z"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M9.5 12.2L11.2 13.9L14.8 10.1" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div
                className="absolute -right-1 top-2 h-3 w-3 rounded-full animate-blink"
                style={{ background: "#34d399", boxShadow: "0 0 12px #34d399" }}
              />
            </div>
          </div>

          <header className="text-center mb-7">
            <p className="font-mono text-[11px] mb-2" style={{ color: "#34d399", letterSpacing: "0.18em" }}>
              SECURE OPERATOR GATEWAY
            </p>
            <h1
              className="font-display font-black text-3xl mb-3 text-glow-blue"
              style={{ color: "#38bdf8", letterSpacing: "0.18em" }}
            >
              NETSENSE AI
            </h1>
            <h2 className="font-display text-xl font-semibold" style={{ color: "#e2e8f0" }}>
              {stage === "email" ? "Secure Operator Access" : "Verify Your Email"}
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "#94a3b8" }}>
              {stage === "email"
                ? "Use your registered email to request a one-time verification code."
                : "We sent a 6-digit verification code to:"}
            </p>
            {stage === "otp" && (
              <p className="mt-1 font-mono text-sm break-all" style={{ color: "#e2e8f0" }}>
                {email.trim()}
              </p>
            )}
          </header>

          {stage === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="font-mono text-xs mb-1.5 block" style={{ color: "#64748b", letterSpacing: "0.1em" }}>
                  OPERATOR EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError("");
                  }}
                  placeholder="Enter your registered email"
                  className="w-full px-4 py-3 rounded-lg font-body text-sm outline-none transition-all"
                  style={{
                    background: "rgba(15,23,42,0.82)",
                    border: `1px solid ${emailError ? "rgba(248,113,113,0.7)" : "rgba(56,189,248,0.24)"}`,
                    color: "#e2e8f0",
                  }}
                  disabled={sending}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="mt-2 font-mono text-xs" style={{ color: "#f87171" }}>
                    {emailError}
                  </p>
                )}
              </div>

              <button type="submit" className="btn-primary w-full py-3 rounded-lg text-sm" disabled={sending}>
                {sending ? "SENDING OTP..." : "SEND OTP"}
              </button>
            </form>
          ) : (
            <section className="space-y-5" aria-label="Email verification">
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(15,23,42,0.58)", border: "1px solid rgba(56,189,248,0.18)" }}>
                <div>
                  <p className="font-mono text-[10px]" style={{ color: "#64748b", letterSpacing: "0.12em" }}>
                    OTP EXPIRES IN
                  </p>
                  <p className="font-mono text-lg" style={{ color: timeRemaining === 0 ? "#f87171" : "#38bdf8" }}>
                    {formatCountdown(timeRemaining)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="font-mono text-xs transition-colors"
                  style={{ color: "#94a3b8" }}
                >
                  CHANGE EMAIL
                </button>
              </div>

              <div>
                <label className="sr-only">6-digit verification code</label>
                <div className="grid grid-cols-6 gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      className="h-12 rounded-lg text-center font-mono text-lg outline-none transition-all"
                      style={{
                        background: "rgba(15,23,42,0.86)",
                        border: "1px solid rgba(56,189,248,0.28)",
                        color: "#e2e8f0",
                      }}
                      aria-label={`OTP digit ${index + 1}`}
                      disabled={verifying || resending}
                    />
                  ))}
                </div>
              </div>

              {showOtpNotice && (
                <div
                  className="rounded-lg px-3 py-3 font-mono text-xs leading-5"
                  role="status"
                  style={{
                    color: notice === "expired" || notice === "invalid" ? "#fecaca" : "#bfdbfe",
                    background:
                      notice === "expired" || notice === "invalid"
                        ? "rgba(127,29,29,0.22)"
                        : "rgba(14,116,144,0.18)",
                    border:
                      notice === "expired" || notice === "invalid"
                        ? "1px solid rgba(248,113,113,0.35)"
                        : "1px solid rgba(56,189,248,0.28)",
                  }}
                >
                  {statusMessage || (notice === "success" ? "OTP sent." : "")}
                </div>
              )}

              {(sending || verifying || resending) && (
                <div className="flex items-center gap-2 font-mono text-xs" style={{ color: "#38bdf8" }} role="status">
                  <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  {sending
                    ? "Sending OTP..."
                    : verifying
                      ? "Verifying OTP..."
                      : "Resending OTP..."}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="btn-primary w-full py-3 rounded-lg text-sm"
                  disabled={verifying || resending}
                >
                  {verifying ? "VERIFYING..." : "VERIFY OTP"}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="btn-secondary w-full py-3 rounded-lg text-sm"
                  disabled={verifying || resending}
                >
                  {resending ? "RESENDING..." : "RESEND OTP"}
                </button>
              </div>

            </section>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: "#34d399" }} />
              <span className="font-mono text-xs" style={{ color: "#34d399" }}>
                SECURE CONNECTION
              </span>
            </div>
            <span className="font-mono text-xs text-right" style={{ color: "#475569" }}>
              OTP PROTOTYPE
            </span>
          </div>
        </div>
      </main>

      {["top-4 left-4", "top-4 right-4 rotate-90", "bottom-4 left-4 -rotate-90", "bottom-4 right-4 rotate-180"].map(
        (position, index) => (
          <div key={index} className={`absolute ${position} opacity-30`} style={{ color: "#38bdf8", fontSize: "20px" }}>
            +
          </div>
        ),
      )}
    </div>
  );
}
