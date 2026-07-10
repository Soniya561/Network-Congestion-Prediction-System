import type { Page } from "../App";

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "prediction", label: "Prediction" },
  { id: "analyst", label: "AI Analyst" },
  { id: "analytics", label: "Analytics" },
  { id: "mlops", label: "MLOps" },
  { id: "alerts", label: "Alerts" },
  { id: "profile", label: "Reports" },
];

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
      style={{ borderBottom: "1px solid rgba(56,189,248,0.2)" }}
    >
      <div className="flex items-center justify-between px-6 h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <div
              className="absolute inset-0 rounded-full animate-spin-slow"
              style={{
                background: "conic-gradient(from 0deg, #38bdf8, #818cf8, #22d3ee, #38bdf8)",
                padding: "2px",
              }}
            >
              <div className="w-full h-full rounded-full" style={{ background: "var(--background)" }} />
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ fontSize: "14px" }}
            >
              ◈
            </div>
          </div>
          <div>
            <div
              className="font-display text-sm font-bold text-glow-blue"
              style={{ color: "#38bdf8", letterSpacing: "0.15em" }}
            >
              NETSENSE
            </div>
            <div
              className="font-mono"
              style={{ fontSize: "9px", color: "#64748b", letterSpacing: "0.2em" }}
            >
              AI PLATFORM
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-link ${currentPage === item.id ? "active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-blink"
              style={{ background: "#34d399", boxShadow: "0 0 8px #34d399" }}
            />
            <span className="font-mono text-xs" style={{ color: "#34d399" }}>LIVE</span>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center glass"
            style={{ border: "1px solid rgba(56,189,248,0.3)", fontSize: "12px" }}
          >
            AD
          </div>
        </div>
      </div>
    </nav>
  );
}
