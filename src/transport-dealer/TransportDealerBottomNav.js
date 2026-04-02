import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/TransportDealerBottomNav.css";

export default function TransportDealerBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // Set flag to prevent auto-redirect during logout
    sessionStorage.setItem("logoutInProgress", "true");
    
    // Clear all localStorage data
    console.log("🧹 Clearing all localStorage on logout...");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("registeredUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("dealerProfile");
    localStorage.removeItem("farmerProfile");
    localStorage.removeItem("adminProfile");
    localStorage.removeItem("customerProfile");
    localStorage.removeItem("selectedCrop");
    
    console.log("✅ Logged out successfully");
    alert("Logged out successfully. You can now login with a different role.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="transport-dealer-bottom-nav">
      <div
        className={`nav-item ${isActive("/transport-dealer-dashboard") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer-dashboard")}
      >
        🏠
        <span>{t("Dashboard")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/requests") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/requests")}
      >
        📬
        <span>{t("Requests")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/earnings") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/earnings")}
      >
        💰
        <span>{t("Earnings")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/vehicles") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/vehicles")}
      >
        🚙
        <span>{t("Vehicles")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/account") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/account")}
      >
        👤
        <span>{t("Account")}</span>
      </div>

      <button className="nav-item logout-btn" onClick={handleLogout} style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}>
        🚪
        <span>{t("Logout")}</span>
      </button>
    </div>
  );
}
