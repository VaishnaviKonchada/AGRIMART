import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/TransportDealerBottomNav.css";

export default function TransportDealerBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

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
        <span>Dashboard</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/requests") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/requests")}
      >
        📬
        <span>Requests</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/earnings") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/earnings")}
      >
        💰
        <span>Earnings</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/vehicles") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/vehicles")}
      >
        🚙
        <span>Vehicles</span>
      </div>

      <div
        className={`nav-item ${isActive("/transport-dealer/account") ? "active" : ""}`}
        onClick={() => navigate("/transport-dealer/account")}
      >
        👤
        <span>Account</span>
      </div>

      <button className="nav-item logout-btn" onClick={handleLogout} style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}>
        🚪
        <span>Logout</span>
      </button>
    </div>
  );
}
