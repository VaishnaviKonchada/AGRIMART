import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FarmerBottomNav from "./FarmerBottomNav";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function FarmerLayout({ children }) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("registeredUser") || "{}")
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t("farmerDashboard.greeting", { greeting: t("goodMorning", "Good Morning"), name: user?.name || t("farmer") });
    if (hour < 18) return t("farmerDashboard.greeting", { greeting: t("goodAfternoon", "Good Afternoon"), name: user?.name || t("farmer") });
    return t("farmerDashboard.greeting", { greeting: t("goodEvening", "Good Evening"), name: user?.name || t("farmer") });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f9fbe7" }}>
      {/* GLOBAL HEADER */}
      <header style={{
        background: "#ffffff",
        padding: "16px 20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <span style={{ fontSize: "24px" }}>🌾</span>
            <h1 style={{ 
              margin: 0, 
              fontSize: "20px", 
              fontWeight: 800, 
              color: "#1e8e3e",
              fontFamily: "'Poppins', sans-serif"
            }}>
              Agri<span style={{ color: "#2c3e50" }}>Mart</span> <span style={{fontSize: "12px", color: "#66BB6A", background: "#E8F5E9", padding: "2px 6px", borderRadius: "10px", marginLeft: "4px"}}>Farmer</span>
            </h1>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#666", fontWeight: 500 }}>
            {getGreeting()}
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSwitcher />
        </div>
      </header>

      {/* RENDER PAGES HERE */}
      <div style={{ flex: 1, paddingBottom: "70px", overflowY: "auto" }}>
        {children}
      </div>

      {/* GLOBAL FOOTER */}
      <FarmerBottomNav />
    </div>
  );
}
