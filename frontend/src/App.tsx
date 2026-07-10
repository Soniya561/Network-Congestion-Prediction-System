import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AlertsPage from "./pages/AlertsPage";
import PredictionPage from "./pages/PredictionPage";
import AnalystPage from "./pages/AnalystPage";
import MLModelsPage from "./pages/MLModelsPage";
import MLOpsPage from "./pages/MLOpsPage";
import HistoryPage from "./pages/HistoryPage";
import Navbar from "./components/Navbar";

export type Page = "dashboard" | "prediction" | "analyst" | "analytics" | "mlops" | "alerts" | "profile";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <DashboardPage />;
      case "prediction": return <PredictionPage />;
      case "analyst": return <AnalystPage />;
      case "analytics": return <MLModelsPage />;
      case "mlops": return <MLOpsPage />;
      case "alerts": return <AlertsPage />;
      case "profile": return <HistoryPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="pt-16">
        {renderPage()}
      </main>
    </div>
  );
}
