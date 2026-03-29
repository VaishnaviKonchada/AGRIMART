import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/BottomNav.css";

export default function FarmerBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("registeredUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("dealerProfile");
    localStorage.removeItem("farmerProfile");
    localStorage.removeItem("adminProfile");
    alert("Logged out successfully. You can now login with a different role.");
    navigate("/login");
  };

  return (
    <div className="bottom-nav">
      <Link to="/farmer-dashboard" className={`nav-item${location.pathname === "/farmer-dashboard" ? " active" : ""}`}>
        🏠
        <span>Home</span>
      </Link>
      <Link to="/farmer/add-crop" className={`nav-item${location.pathname === "/farmer/add-crop" ? " active" : ""}`}>
        ➕
        <span>Add Crop</span>
      </Link>
      <Link to="/farmer/orders" className={`nav-item${location.pathname === "/farmer/orders" ? " active" : ""}`}>
        📦
        <span>Orders</span>
      </Link>
      <Link to="/farmer/chatbot" className={`nav-item${location.pathname === "/farmer/chatbot" ? " active" : ""}`}>
        🤖
        <span>Chatbot</span>
      </Link>
      <Link to="/farmer/account" className={`nav-item${location.pathname === "/farmer/account" ? " active" : ""}`}>
        👤
        <span>Account</span>
      </Link>
      <button className="nav-item logout-btn" onClick={handleLogout}>
        🚪
        <span>Logout</span>
      </button>
    </div>
  );
}