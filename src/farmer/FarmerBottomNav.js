
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/FarmerBottomNav.css";


export default function FarmerBottomNav() {
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
    alert(t("logoutSuccess", "Logged out successfully. You can now login with a different role."));
    navigate("/login", { replace: true });
  };

  return (
    <div className="farmer-bottom-nav">
      <div
        className={`nav-item ${isActive("/farmer-dashboard") ? "active" : ""}`}
        onClick={() => navigate("/farmer-dashboard")}
      >
        🏠
        <span>{t("farmerDashboard.dashboard", "Home")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/farmer/add-crop") ? "active" : ""}`}
        onClick={() => navigate("/farmer/add-crop")}
      >
        🌱
        <span>{t("farmerAccount.addCrop", "Add Crop")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/farmer/orders") ? "active" : ""}`}
        onClick={() => navigate("/farmer/orders")}
      >
        📦
        <span>{t("farmerAccount.orders", "Orders")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/farmer/chatbot") ? "active" : ""}`}
        onClick={() => navigate("/farmer/chatbot")}
      >
        🤖
        <span>{t("chatbot", "Chatbot")}</span>
      </div>

      <div
        className={`nav-item ${isActive("/farmer/account") ? "active" : ""}`}
        onClick={() => navigate("/farmer/account")}
      >
        👤
        <span>{t("farmerAccount.title", "Account")}</span>
      </div>

      <button className="nav-item logout-btn" onClick={handleLogout} style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}>
        🚪
        <span>{t("logout", "Logout")}</span>
      </button>
    </div>
  );
}
