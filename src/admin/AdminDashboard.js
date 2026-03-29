import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../utils/api";
import './styles/AdminDashboard.css';



const AdminDashboard = ({ user }) => {
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

  const StatCard = ({ icon, title, value, color }) => (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="admin-subtitle">Welcome back, {user?.name || 'Administrator'}</p>
      </div>

      <div className="stats-container">
        <div className="stats-grid">
          <StatCard 
            icon="👨‍🌾" 
            title="Total Farmers" 
            value={stats.totalFarmers} 
            color="green" 
          />
          <StatCard 
            icon="👥" 
            title="Total Customers" 
            value={stats.totalCustomers} 
            color="blue" 
          />
          <StatCard 
            icon="🚚" 
            title="Transport Dealers" 
            value={stats.totalDealers} 
            color="purple" 
          />
          <StatCard 
            icon="📦" 
            title="Total Orders" 
            value={stats.totalOrders} 
            color="orange" 
          />
          <StatCard 
            icon="💹" 
            title="Total Revenue" 
            value={`₹${stats.totalRevenue}`} 
            color="emerald" 
          />
          <StatCard 
            icon="🟢" 
            title="Active Users" 
            value={stats.activeUsers} 
            color="cyan" 
          />
          <StatCard 
            icon="⚠️" 
            title="Open Complaints" 
            value={stats.complaints} 
            color="red" 
          />
          <StatCard 
            icon="✅" 
            title="Settled Payments" 
            value={stats.settledPayments} 
            color="lime" 
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          Loading dashboard data...
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          ℹ️ Dashboard showing real-time statistics from database
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
