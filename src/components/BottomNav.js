import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/BottomNav.css";
import { useTranslation } from "react-i18next";

export default function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Clear all localStorage data
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("registeredUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("dealerProfile");
    localStorage.removeItem("farmerProfile");
    localStorage.removeItem("adminProfile");
    
    console.log("✅ Logged out successfully");
    alert("Logged out successfully. You can now login with a different role.");
    navigate("/login");
  };

  return (
    <div className="bottom-nav">
      <Link to="/home" className={`nav-item${location.pathname === "/home" ? " active" : ""}`}>
        🏠
        <span>{t('Home', 'Home')}</span>
      </Link>

      <Link to="/cart" className={`nav-item${location.pathname === "/cart" ? " active" : ""}`}>
        🛒
        <span>{t('Cart', 'Cart')}</span>
      </Link>

      <Link to="/account" className={`nav-item${location.pathname === "/account" ? " active" : ""}`}>
        👤
        <span>{t('Account', 'Account')}</span>
      </Link>

      <button className="nav-item logout-btn" onClick={handleLogout}>
        🚪
        <span>{t('logout', 'Logout')}</span>
      </button>
    </div>
  );
}
