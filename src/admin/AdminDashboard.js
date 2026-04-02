import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../utils/api";
import './styles/AdminDashboard.css';
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const AdminDashboard = ({ user }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalFarmers: 0,
    totalCustomers: 0,
    totalDealers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    complaints: 0,
    settledPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch admin dashboard stats from backend
    const fetchStats = async () => {
      try {
        const data = await apiGet("admin/dashboard");
        if (data) {
          setStats({
            totalFarmers: data.statistics?.farmers || 0,
            totalCustomers: data.statistics?.customers || 0,
            totalDealers: data.statistics?.dealers || 0,
            totalOrders: 0, // Will add later
            totalRevenue: 0, // Will add later
            activeUsers: data.statistics?.activeUsers || 0,
            complaints: 0, // Will add later
            settledPayments: 0
          });
        }
      } catch (error) {
        console.error("❌ Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const navigate = useNavigate();

  const StatCard = ({ icon, title, value, color, onClick }) => (
    <div className={`stat-card stat-${color}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-content">
      <div className="stats-container">
        <div className="stats-grid">
          <StatCard 
            icon="👨‍🌾" 
            title={t('admin.dashboard.totalFarmers', 'Total Farmers')} 
            value={stats.totalFarmers} 
            color="green" 
            onClick={() => navigate('/admin/farmers')}
          />
          <StatCard 
            icon="👥" 
            title={t('admin.dashboard.totalCustomers', 'Total Customers')} 
            value={stats.totalCustomers} 
            color="blue" 
            onClick={() => navigate('/admin/customers')}
          />
          <StatCard 
            icon="🚚" 
            title={t('admin.dashboard.transportDealers', 'Transport Dealers')} 
            value={stats.totalDealers} 
            color="purple" 
            onClick={() => navigate('/admin/dealers')}
          />
          <StatCard 
            icon="📦" 
            title={t('admin.dashboard.totalOrders', 'Total Orders')} 
            value={stats.totalOrders} 
            color="orange" 
            onClick={() => navigate('/admin/orders')}
          />
          <StatCard 
            icon="💹" 
            title={t('admin.dashboard.totalRevenue', 'Total Revenue')} 
            value={`₹${stats.totalRevenue}`} 
            color="emerald" 
            onClick={() => navigate('/admin/payments')}
          />
          <StatCard 
            icon="🟢" 
            title={t('admin.dashboard.activeUsers', 'Active Users')} 
            value={stats.activeUsers} 
            color="cyan" 
          />
          <StatCard 
            icon="⚠️" 
            title={t('admin.dashboard.openComplaints', 'Open Complaints')} 
            value={stats.complaints} 
            color="red" 
            onClick={() => navigate('/admin/complaints')}
          />
          <StatCard 
            icon="✅" 
            title={t('admin.dashboard.settledPayments', 'Settled Payments')} 
            value={stats.settledPayments} 
            color="lime" 
            onClick={() => navigate('/admin/payments')}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          {t('admin.dashboard.loading', 'Loading dashboard data...')}
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          ℹ️ {t('admin.dashboard.realtimeStats', 'Dashboard showing real-time statistics from database')}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
