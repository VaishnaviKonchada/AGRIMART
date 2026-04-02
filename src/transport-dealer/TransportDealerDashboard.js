import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/TransportDealerDashboard.css';
import TransportDealerBottomNav from './TransportDealerBottomNav';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SessionManager from '../utils/SessionManager';

const TransportDealerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0
  });
  useEffect(() => {
    // Session check logic
    const session = SessionManager.getSession();
    const userData = session?.user;
    const userRole = (session?.role || "").toLowerCase().trim();
    const isDealer = userRole === 'dealer' || userRole === 'transport dealer';

    if (!userData || !isDealer) {
      navigate('/login');
      return;
    }
    
    setUser(userData);
    fetchStats(userData.id || userData._id);
  }, [navigate]);

  const fetchStats = async (dealerId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/transport-dealer/stats/${dealerId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="dashboard-content">
      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card primary">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{t("Total Orders")}</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">{t("Pending")}</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">🚗</div>
          <div className="stat-info">
            <div className="stat-value">{stats.inTransit}</div>
            <div className="stat-label">{t("In Transit")}</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.delivered}</div>
            <div className="stat-label">{t("Delivered")}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions" style={{ marginTop: '20px' }}>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/requests")}>{t("📬 Transport Requests")}</button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/active-trips")}>{t("🚗 Active Trips")}</button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/vehicles")}>{t("🚙 My Vehicles")}</button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/service-area")}>{t("📍 Service Areas")}</button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/notifications")}>{t("🔔 Notifications")}</button>
        <button className="action-btn" onClick={() => navigate("/transport-dealer/messages")}>{t("💬 Messages")}</button>
      </div>
    </div>
  );
};

export default TransportDealerDashboard;
