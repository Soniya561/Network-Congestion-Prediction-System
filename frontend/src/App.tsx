import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AlertsPage from "./pages/AlertsPage";
import PredictionPage from "./pages/PredictionPage";
import AnalystPage from "./pages/AnalystPage";
import MLModelsPage from "./pages/MLModelsPage";
import MLOpsPage from "./pages/MLOpsPage";
import ReportsPage from "./pages/ReportsPage";
import Navbar from "./components/Navbar";
import api from "./api/api";

export type Page = "dashboard" | "prediction" | "analyst" | "analytics" | "mlops" | "alerts" | "profile";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  useEffect(() => {
    api.get("/auth/session")
      .then(({ data }) => setLoggedIn(data.authenticated === true))
      .catch(() => setLoggedIn(false))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center font-mono" style={{ background: "#020817", color: "#38bdf8" }}>RESTORING SECURE SESSION...</div>;
  }

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <DashboardPage />;
      case "prediction": return <PredictionPage />;
      case "analyst": return <AnalystPage onNavigate={setCurrentPage} />;
      case "analytics": return <MLModelsPage />;
      case "mlops": return <MLOpsPage />;
      case "alerts": return <AlertsPage />;
      case "profile": return <ReportsPage />;
      default: return <DashboardPage />;
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setLoggedIn(false);
      setCurrentPage("dashboard");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} onLogout={handleLogout} />
      <main className="pt-16">
        {renderPage()}
      </main>
    </div>
  );
}
