import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { apiGet } from "../utils/api";
import "../styles/FarmerDashboard.css";
import { useTranslation } from "react-i18next";

export default function FarmerDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("registeredUser") || "null"));
  const [farmerProfile, setFarmerProfile] = useState(JSON.parse(localStorage.getItem("farmerProfile") || "null"));
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [farmerOrders, setFarmerOrders] = useState([]);
  const deliveredOnly = useMemo(() => farmerOrders.filter((o) => o.status === "Delivered"), [farmerOrders]);
  const [farmerCrops, setFarmerCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const freshUser = JSON.parse(localStorage.getItem("registeredUser") || "null");
    if (freshUser?.name !== user?.name) {
      setUser(freshUser);
      setFarmerProfile(JSON.parse(localStorage.getItem("farmerProfile") || "null"));
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const freshUser = JSON.parse(localStorage.getItem("registeredUser") || "null");
      if (freshUser?.name !== user?.name) {
        setUser(freshUser);
        setFarmerProfile(JSON.parse(localStorage.getItem("farmerProfile") || "null"));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [user?.name]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const farmerId = user?.id || user?._id;
        if (!farmerId) return;
        const data = await apiGet(`orders/farmer/${farmerId}`);
        const safeOrders = Array.isArray(data) ? data : data?.orders || [];
        setFarmerOrders(safeOrders);
      } catch (error) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user?.id, user?._id]);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const data = await apiGet('crops/my-crops/list');
        const safeCrops = Array.isArray(data) ? data : [];
        setFarmerCrops(safeCrops);
      } catch (error) {
        setFarmerCrops([]);
      }
    };
    const refreshDashboardData = () => { fetchCrops(); };
    refreshDashboardData();
    const interval = setInterval(refreshDashboardData, 15000);
    window.addEventListener('focus', refreshDashboardData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshDashboardData);
    };
  }, []);

  const toNumber = (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const num = Number(val.replace(/[^\d.-]/g, ""));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const totalCropsCount = useMemo(() => farmerCrops.length, [farmerCrops]);
  const activeCropsCount = useMemo(() => {
    return farmerCrops.filter((crop) => {
      const isActive = crop?.isActive !== false;
      const status = String(crop?.status || '').toLowerCase();
      const availableQuantity = Number(crop?.availableQuantity || 0);
      return isActive && status !== 'sold' && status !== 'inactive' && availableQuantity > 0;
    }).length;
  }, [farmerCrops]);
  const cropStockMetrics = useMemo(() => {
    return farmerCrops.reduce(
      (acc, crop) => {
        const available = Number(crop?.availableQuantity || 0);
        const explicitTotal = Number(crop?.totalQuantity);
        const soldFromApi = Number(crop?.soldQuantity);
        const total = Number.isFinite(explicitTotal) && explicitTotal >= available
          ? explicitTotal
          : available + (Number.isFinite(soldFromApi) ? soldFromApi : 0);
        const sold = Number.isFinite(soldFromApi)
          ? soldFromApi
          : Math.max(total - available, 0);
        acc.total += total;
        acc.available += available;
        acc.sold += sold;
        return acc;
      },
      { total: 0, available: 0, sold: 0 }
    );
  }, [farmerCrops]);
  const pendingOrders = useMemo(
    () => farmerOrders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled").length,
    [farmerOrders]
  );
  const completedOrders = useMemo(
    () => farmerOrders.filter((o) => o.status === "Delivered").length,
    [farmerOrders]
  );
  const activeOrders = useMemo(
    () => farmerOrders.filter((o) => !["Cancelled", "Rejected"].includes(o.status)),
    [farmerOrders]
  );
  const totalRevenueNumber = useMemo(() => {
    return activeOrders.reduce((sum, o) => {
      const itemsTotal = o.summary?.itemsTotal || o.itemsTotal || 
        (o.items || []).reduce((s, it) => s + toNumber(it.pricePerKg) * toNumber(it.quantity), 0);
      return sum + toNumber(itemsTotal);
    }, 0);
  }, [activeOrders]);
  const monthlyGrowth = useMemo(() => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth();
    const curStart = new Date(curY, curM, 1).getTime();
    const prevStart = new Date(curY, curM - 1, 1).getTime();
    const prevEnd = curStart - 1;
    const curRevenue = deliveredOnly
      .filter((o) => {
        const timestamp = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        return timestamp >= curStart;
      })
      .reduce((s, o) => s + toNumber(o.summary?.itemsTotal || o.itemsTotal || 0), 0);
    const prevRevenue = deliveredOnly
      .filter((o) => {
        const timestamp = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        return timestamp >= prevStart && timestamp <= prevEnd;
      })
      .reduce((s, o) => s + toNumber(o.summary?.itemsTotal || o.itemsTotal || 0), 0);
    if (!prevRevenue) return 0;
    return ((curRevenue - prevRevenue) / prevRevenue) * 100;
  }, [deliveredOnly]);
  const stats = {
    totalCrops: totalCropsCount,
    activeCrops: activeCropsCount,
    pendingOrders,
    completedOrders,
    totalRevenue: `₹${totalRevenueNumber.toLocaleString()}`,
    monthlyGrowth: `${monthlyGrowth >= 0 ? "+" : ""}${monthlyGrowth.toFixed(1)}%`,
    totalStockKg: cropStockMetrics.total,
    availableStockKg: cropStockMetrics.available,
    soldStockKg: cropStockMetrics.sold,
  };
  const timeAgo = (timestamp) => {
    if (!timestamp) return "";
    const ts = new Date(timestamp).getTime();
    if (!ts || isNaN(ts)) return "";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t('farmerDashboard.minAgo', { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs === 1) return t('farmerDashboard.hourAgo', { count: hrs });
    if (hrs < 24) return t('farmerDashboard.hoursAgo', { count: hrs });
    const days = Math.floor(hrs / 24);
    if (days === 1) return t('farmerDashboard.dayAgo', { count: days });
    return t('farmerDashboard.daysAgo', { count: days });
  };
  const recentActivities = useMemo(() => {
    const mapStatus = (s) => {
      if (s === "Delivered") return { label: t('farmerDashboard.orderDelivered'), status: "success" };
      if (s === "In Transit") return { label: t('farmerDashboard.orderInTransit'), status: "pending" };
      if (s === "Confirmed") return { label: t('farmerDashboard.orderConfirmed'), status: "pending" };
      if (s === "Cancelled") return { label: t('farmerDashboard.orderCancelled'), status: "pending" };
      return { label: t('farmerDashboard.orderNew'), status: "pending" };
    };
    return farmerOrders
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 6)
      .map((o, idx) => {
        const firstItem = (o.items || [])[0] || {};
        const m = mapStatus(o.status);
        return {
          id: idx + 1,
          action: m.label,
          crop: firstItem.cropName || firstItem.name || "",
          time: timeAgo(o.createdAt),
          status: m.status,
        };
      });
  }, [farmerOrders]);
  const weatherData = {
    temp: "28°C",
    condition: t('farmerDashboard.weather.partlyCloudy'),
    humidity: "65%",
    rainfall: "Light",
    windSpeed: `12 ${t('farmerDashboard.wind')}`
  };
  const buildAnalytics = () => {
    const getTimestamp = (createdAt) => {
      if (!createdAt) return 0;
      return new Date(createdAt).getTime();
    };
    const getRevenue = (order) => {
      return toNumber(order.summary?.itemsTotal || order.itemsTotal || 0);
    };
    const daily = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
      const orders = farmerOrders.filter((o) => {
        const ts = getTimestamp(o.createdAt);
        return ts >= dayStart && ts <= dayEnd;
      });
      const revenue = orders.reduce((s, o) => s + getRevenue(o), 0);
      return { date: d.toLocaleDateString("en-IN", { weekday: "short" }), orders: orders.length, revenue };
    });
    const weekly = Array.from({ length: 4 }).map((_, i) => {
      const end = new Date();
      end.setDate(end.getDate() - 7 * (3 - i));
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();
      const orders = farmerOrders.filter((o) => {
        const ts = getTimestamp(o.createdAt);
        return ts >= s && ts <= e;
      });
      const revenue = orders.reduce((sum, o) => sum + getRevenue(o), 0);
      return { week: `Week ${i + 1}`, orders: orders.length, revenue };
    });
    const now = new Date();
    const y = now.getFullYear();
    const monthly = Array.from({ length: 12 }).map((_, m) => {
      const s = new Date(y, m, 1).getTime();
      const e = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();
      const orders = farmerOrders.filter((o) => {
        const ts = getTimestamp(o.createdAt);
        return ts >= s && ts <= e;
      });
      const revenue = orders.reduce((sum, o) => sum + getRevenue(o), 0);
      return { month: new Date(y, m, 1).toLocaleString("en-IN", { month: "short" }), orders: orders.length, revenue };
    });
    const yearsMap = new Map();
    farmerOrders.forEach((o) => {
      const ts = getTimestamp(o.createdAt);
      const yr = ts ? new Date(ts).getFullYear() : new Date().getFullYear();
      const cur = yearsMap.get(yr) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += getRevenue(o);
      yearsMap.set(yr, cur);
    });
    const yearly = Array.from(yearsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, v]) => ({ year: String(year), ...v }));
    const cropMap = new Map();
    farmerOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const key = it.cropName || it.name || "Unknown";
        const cur = cropMap.get(key) || { orders: 0 };
        cur.orders += 1;
        cropMap.set(key, cur);
      });
    });
    const cropsArr = Array.from(cropMap.entries())
      .map(([name, v]) => ({ name, orders: v.orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
    const maxOrders = cropsArr[0]?.orders || 1;
    const topCrops = cropsArr.map((c) => ({ ...c, percentage: Math.round((c.orders / maxOrders) * 100) }));
    return { daily, weekly, monthly, yearly, topCrops };
  };
  const analyticsData = useMemo(buildAnalytics, [farmerOrders]);
  const [analyticsView, setAnalyticsView] = useState("daily");
  const handleNavigate = (path) => { navigate(path); };
  const toggleAnalytics = () => { setShowAnalytics(!showAnalytics); };

  return (
    <div className="farmer-dashboard">
      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        
        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">🌾</div>
            <div className="stat-details">
              <h3 className="stat-value">{stats.totalCrops}</h3>
              <p className="stat-label">{t('farmerDashboard.totalCrops')}</p>
              <div className="stat-badges">
                <span className="stat-badge active">{t('farmerDashboard.activeCrops', { count: stats.activeCrops })}</span>
                <span className="stat-badge info">{t('farmerDashboard.availableStock', { count: stats.availableStockKg })}</span>
                <span className="stat-badge sold">{t('farmerDashboard.soldStock', { count: stats.soldStockKg })}</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-icon">📦</div>
            <div className="stat-details">
              <h3 className="stat-value">{stats.pendingOrders}</h3>
              <p className="stat-label">{t('farmerDashboard.pendingOrders')}</p>
              <span className="stat-badge pending">{t('farmerDashboard.pendingNeedsAction')}</span>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon">✅</div>
            <div className="stat-details">
              <h3 className="stat-value">{stats.completedOrders}</h3>
              <p className="stat-label">{t('farmerDashboard.completedOrders')}</p>
              <span className="stat-badge success">{t('farmerDashboard.completedAllTime')}</span>
            </div>
          </div>

          <div className="stat-card stat-revenue">
            <div className="stat-icon">💰</div>
            <div className="stat-details">
              <h3 className="stat-value">{stats.totalRevenue}</h3>
              <p className="stat-label">{t('farmerDashboard.totalRevenue')}</p>
              <span className="stat-badge growth">{t('farmerDashboard.monthlyGrowth', { growth: stats.monthlyGrowth })}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Weather */}
        <div className="dashboard-row">
          {/* Quick Actions */}
          <div className="quick-actions-card">
            <h2 className="section-title">
              <span className="title-icon">⚡</span>
              {t('farmerDashboard.quickActions')}
            </h2>
            <div className="action-buttons">
              <button className="action-btn action-primary" onClick={() => handleNavigate('/farmer/add-crop')}>
                <span className="action-icon">➕</span>
                <span className="action-text">{t('farmerDashboard.addNewCrop')}</span>
              </button>
              <button className="action-btn action-secondary" onClick={() => handleNavigate('/farmer/orders')}>
                <span className="action-icon">📋</span>
                <span className="action-text">{t('farmerDashboard.viewOrders')}</span>
              </button>
              <button className="action-btn action-tertiary" onClick={() => handleNavigate('/farmer/chatbot')}>
                <span className="action-icon">🤖</span>
                <span className="action-text">{t('farmerDashboard.aiAssistant')}</span>
              </button>
              <button className="action-btn action-info" onClick={toggleAnalytics}>
                <span className="action-icon">📊</span>
                <span className="action-text">{t('farmerDashboard.analytics')}</span>
              </button>
            </div>
          </div>

          {/* Weather Card */}
          <div className="weather-card">
            <h2 className="section-title">
              <span className="title-icon">🌤️</span>
              {t('farmerDashboard.weatherToday')}
            </h2>
            <div className="weather-content">
              <div className="weather-main">
                <div className="temp-display">{weatherData.temp}</div>
                <div className="weather-condition">{weatherData.condition}</div>
              </div>
              <div className="weather-details">
                <div className="weather-item">
                  <span className="weather-icon">💧</span>
                  <div className="weather-info">
                    <span className="weather-label">{t('farmerDashboard.humidity')}</span>
                    <span className="weather-value">{weatherData.humidity}</span>
                  </div>
                </div>
                <div className="weather-item">
                  <span className="weather-icon">🌧️</span>
                  <div className="weather-info">
                    <span className="weather-label">{t('farmerDashboard.rainfall')}</span>
                    <span className="weather-value">{weatherData.rainfall}</span>
                  </div>
                </div>
                <div className="weather-item">
                  <span className="weather-icon">💨</span>
                  <div className="weather-info">
                    <span className="weather-label">{t('farmerDashboard.wind')}</span>
                    <span className="weather-value">{weatherData.windSpeed}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="activities-card">
          <h2 className="section-title">
            <span className="title-icon">📈</span>
            {t('farmerDashboard.recentActivities')}
          </h2>
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className={`activity-item status-${activity.status}`}>
                <div className="activity-indicator"></div>
                <div className="activity-content">
                  <p className="activity-action">{activity.action}</p>
                  <p className="activity-crop">{activity.crop}</p>
                </div>
                <span className="activity-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips & Recommendations */}
        <div className="tips-card">
          <h2 className="section-title">
            <span className="title-icon">💡</span>
            {t('farmerDashboard.tipsTitle')}
          </h2>
          <div className="tips-content">
            <div className="tip-item">
              <span className="tip-icon">🌱</span>
              <p>{t('farmerDashboard.tip1')}</p>
            </div>
            <div className="tip-item">
              <span className="tip-icon">💧</span>
              <p>{t('farmerDashboard.tip2')}</p>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🔔</span>
              <p>{t('farmerDashboard.tip3', { count: 3 })}</p>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard Modal */}
        {showAnalytics && (
          <div className="analytics-modal">
            <div className="analytics-container">
              <div className="analytics-header">
                <h2 className="analytics-title">
                  <span className="title-icon">📊</span>
                  {t('farmerDashboard.cropAnalytics')}
                </h2>
                <button className="close-analytics" onClick={toggleAnalytics}>✕</button>
              </div>

              {/* Time Period Selector */}
              <div className="analytics-tabs">
                <button 
                  className={`analytics-tab ${analyticsView === 'daily' ? 'active' : ''}`}
                  onClick={() => setAnalyticsView('daily')}
                >
                  {t('farmerDashboard.daily')}
                </button>
                <button 
                  className={`analytics-tab ${analyticsView === 'weekly' ? 'active' : ''}`}
                  onClick={() => setAnalyticsView('weekly')}
                >
                  {t('farmerDashboard.weekly')}
                </button>
                <button 
                  className={`analytics-tab ${analyticsView === 'monthly' ? 'active' : ''}`}
                  onClick={() => setAnalyticsView('monthly')}
                >
                  {t('farmerDashboard.monthly')}
                </button>
                <button 
                  className={`analytics-tab ${analyticsView === 'yearly' ? 'active' : ''}`}
                  onClick={() => setAnalyticsView('yearly')}
                >
                  {t('farmerDashboard.yearly')}
                </button>
              </div>

              {/* Analytics Content */}
              <div className="analytics-content">
                
                {/* Chart Section */}
                <div className="analytics-chart-section">
                  <h3 className="chart-title">
                    {analyticsView === 'daily' && t('farmerDashboard.ordersThisWeek')}
                    {analyticsView === 'weekly' && t('farmerDashboard.ordersThisMonth')}
                    {analyticsView === 'monthly' && t('farmerDashboard.ordersThisYear')}
                    {analyticsView === 'yearly' && t('farmerDashboard.yearlyPerformance')}
                  </h3>
                  
                  <div className="chart-container">
                    {analyticsData[analyticsView].map((item, index) => {
                      const maxOrders = Math.max(...analyticsData[analyticsView].map(d => d.orders));
                      const height = (item.orders / maxOrders) * 100;
                      
                      return (
                        <div key={index} className="chart-bar-wrapper">
                          <div className="chart-bar" style={{ height: `${height}%` }}>
                            <span className="bar-value">{item.orders}</span>
                          </div>
                          <span className="chart-label">
                            {item.date || item.week || item.month || item.year}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="analytics-stats-grid">
                  <div className="analytics-stat-card">
                    <div className="stat-icon-small">📦</div>
                    <div className="stat-info">
                      <h4>{t('farmerDashboard.totalOrders')}</h4>
                      <p className="stat-number">
                        {analyticsData[analyticsView].reduce((sum, item) => sum + item.orders, 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="analytics-stat-card">
                    <div className="stat-icon-small">💰</div>
                    <div className="stat-info">
                      <h4>{t('farmerDashboard.totalRevenueStat')}</h4>
                      <p className="stat-number">
                        ₹{analyticsData[analyticsView].reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="analytics-stat-card">
                    <div className="stat-icon-small">📈</div>
                    <div className="stat-info">
                      <h4>{t('farmerDashboard.averageOrderValue')}</h4>
                      <p className="stat-number">
                        ₹{Math.round(
                          analyticsData[analyticsView].reduce((sum, item) => sum + item.revenue, 0) /
                          analyticsData[analyticsView].reduce((sum, item) => sum + item.orders, 0)
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top Crops */}
                <div className="top-crops-section">
                  <h3 className="chart-title">{t('farmerDashboard.topSellingCrops')}</h3>
                  <div className="crops-list">
                    {analyticsData.topCrops.map((crop, index) => (
                      <div key={index} className="crop-item">
                        <div className="crop-info">
                          <span className="crop-rank">#{index + 1}</span>
                          <span className="crop-name">{crop.name}</span>
                        </div>
                        <div className="crop-stats">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${crop.percentage}%` }}
                            ></div>
                          </div>
                          <span className="crop-orders">{crop.orders} {t('farmerDashboard.orders')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
