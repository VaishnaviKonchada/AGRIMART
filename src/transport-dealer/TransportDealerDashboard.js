import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import { API_BASE_URL } from "../utils/api";
import "../styles/TransportDealerDashboard.css";

export default function TransportDealerDashboard() {
  const navigate = useNavigate();
  
  // ✅ FIXED: Read user from localStorage dynamically, not just on mount
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("registeredUser") || "null"));
  const [dealerProfile, setDealerProfile] = useState(JSON.parse(localStorage.getItem("dealerProfile") || "null"));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false); // ✅ Track if we've loaded data

  // ✅ NEW: Read fresh user data immediately on mount
  useEffect(() => {
    const freshUser = JSON.parse(localStorage.getItem("registeredUser") || "null");
    console.log("📍 TransportDealerDashboard mounted. Fresh user from localStorage:", freshUser?.name, "Role:", freshUser?.role);
    
    if (freshUser?.name !== user?.name) {
      setUser(freshUser);
      setDealerProfile(JSON.parse(localStorage.getItem("dealerProfile") || "null"));
    }
    
    setInitialized(true); // Mark initialization as complete
    
    // Start clock timer
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []); // Only run once on mount

  // ✅ Monitor localStorage changes for user updates
  useEffect(() => {
    const interval = setInterval(() => {
      const freshUser = JSON.parse(localStorage.getItem("registeredUser") || "null");
      if (freshUser?.name !== user?.name) {
        console.log("🔄 User changed in localStorage:", freshUser?.name);
        setUser(freshUser);
        setDealerProfile(JSON.parse(localStorage.getItem("dealerProfile") || "null"));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [user?.name]);

  // Fetch orders when initialized
  useEffect(() => {
    if (initialized && user?.id) {
      fetchOrders();
    }
  }, [initialized, user?.id]);

  // Fetch transport dealer orders from API
  const fetchOrders = async () => {
    try {
      if (!user?.id) return;
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/orders/transport-dealer/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
        console.log('✅ Fetched transport dealer orders:', orders.length);
      }
    } catch (error) {
      console.error("❌ Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Compute stats from transport dealer orders
  const toNumber = (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const num = Number(val.replace(/[^\d.-]/g, ""));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const stats = useMemo(() => {
    const norm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
    const pending = orders.filter((o) => norm(o.status) === "pending").length;
    const inTransit = orders.filter((o) => norm(o.status) === "in transit").length;
    const delivered = orders.filter((o) => norm(o.status) === "delivered").length;
    const earnings = orders.reduce((sum, d) => sum + toNumber(d.summary?.transportFee || d.transportFee || 0), 0);
    return {
      total: orders.length,
      pending,
      inTransit,
      delivered,
      earnings,
    };
  }, [orders]);

  return (
    <div className="transport-dealer-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="greeting-section">
          <h1>{getGreeting()} 🚚</h1>
          <p className="dealer-name">{user?.name || "Transport Dealer"}</p>
          <p className="time-display">{currentTime.toLocaleTimeString()}</p>
        </div>
        <div className="header-actions">
          <button 
            className="account-icon-btn"
            onClick={() => navigate("/transport-dealer/account")}
            title="Account Settings"
          >
            👤
          </button>
          <button 
            className="profile-btn"
            onClick={() => navigate("/transport-dealer/account")}
          >
            ⚙️ Profile
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card primary">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">🚗</div>
          <div className="stat-info">
            <div className="stat-value">{stats.inTransit}</div>
            <div className="stat-label">In Transit</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.delivered}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-btn" onClick={() => navigate("/transport-dealer/requests")}>
          📬 Transport Requests
        </button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/active-trips")}>
          🚗 Active Trips
        </button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/vehicles")}>
          🚙 My Vehicles
        </button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/service-area")}>
          📍 Service Areas
        </button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/notifications")}>
          🔔 Notifications
        </button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/messages")}>
          💬 Messages
        </button>
      </div>

      {/* Bottom Navigation */}
      <TransportDealerBottomNav />
    </div>
  );
}
