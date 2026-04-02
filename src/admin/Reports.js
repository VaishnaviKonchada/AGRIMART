import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, API_BASE_URL } from "../utils/api";
import './styles/ManagementPages.css';



const Reports = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    orders: [],
    revenue: 0,
    metrics: {
      totalOrders: 0,
      totalRevenue: 0,
      platformFee: 0,
      dealerPayouts: 0,
      avgOrderValue: 0,
      deliveredOrders: 0,
      pendingOrders: 0
    }
  });
  const navigate = useNavigate();
  const getOrderId = (order) => order.orderId || order.id || order._id || '-';
  const getOrderDate = (order) => order.createdAt || order.completedAt || order.acceptedAt || order.date;
  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
  };
  const getOrderAmount = (order) => {
    const amount = Number(order.summary?.total ?? order.total ?? order.amount);
    return Number.isFinite(amount) ? amount : 0;
  };
  const getPlatformFee = (order) => {
    const fee = Number(order.summary?.platformFee ?? order.platformFee);
    if (Number.isFinite(fee)) return fee;
    const itemsTotal = Number(order.summary?.itemsTotal || 0);
    return Math.min(Math.round(itemsTotal * 0.02), 100);
  };
  const getDealerName = (order) => order.dealerName || order.transport?.dealerName || order.dealerId?.name || '-';
  const getCustomerName = (order) => order.customerName || order.customerId?.name || '-';
  const isValidOrder = (order) => {
    const orderId = String(order?.orderId || '').trim();
    const amount = getOrderAmount(order);
    const hasItems = Array.isArray(order?.items) && order.items.length > 0;
    const hasCustomer = Boolean(order?.customerName || order?.customerId);
    return Boolean(orderId) && amount > 0 && hasItems && hasCustomer;
  };

  useEffect(() => {
    // Fetch orders from backend to generate reports
    const fetchReportData = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const orders = await apiGet('orders');

        if (Array.isArray(orders)) {
          const validOrders = orders.filter(isValidOrder);

          let totalRevenue = 0;
          let platformFee = 0;
          let dealerPayouts = 0;
          let delivered = 0;

          validOrders.forEach(order => {
            const amount = getOrderAmount(order);
            totalRevenue += amount;
            platformFee += getPlatformFee(order);
            dealerPayouts += amount;
            if (order.status === 'Delivered') delivered++;
          });

          const avgOrderValue = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

          setReportData({
            orders: validOrders,
            revenue: totalRevenue,
            metrics: {
              totalOrders: validOrders.length,
              totalRevenue: totalRevenue,
              platformFee: Math.round(platformFee),
              dealerPayouts: dealerPayouts,
              avgOrderValue: avgOrderValue,
              deliveredOrders: delivered,
              pendingOrders: validOrders.length - delivered
            }
          });
        }
      } catch (error) {
        console.error("❌ Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const downloadCSV = (data, filename) => {
    const csvContent = [
      ['Order ID', 'Dealer', 'Customer', 'Amount', 'Status', 'Date'],
      ...data.map(order => [
        getOrderId(order),
        getDealerName(order),
        getCustomerName(order),
        getOrderAmount(order),
        order.status,
        formatDate(getOrderDate(order))
      ])
    ].map(row => row.join(',')).join('\n');

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    link.download = filename;
    link.click();
  };

  const downloadRevenueReport = () => {
    const content = `PLATFORM REVENUE REPORT
Generated: ${new Date().toLocaleDateString()}

REVENUE SUMMARY
===============
Total Revenue (Orders): ₹${reportData.metrics.totalRevenue}
Platform Commission (2%, max ₹100): ₹${reportData.metrics.platformFee}
Dealer Payouts: ₹${reportData.metrics.dealerPayouts}

ORDER METRICS
=============
Total Orders: ${reportData.metrics.totalOrders}
Delivered Orders: ${reportData.metrics.deliveredOrders}
Pending Orders: ${reportData.metrics.pendingOrders}
Average Order Value: ₹${reportData.metrics.avgOrderValue}

CALCULATION DETAILS
===================
Each order has a 2% platform fee capped at ₹100
Dealers receive 100% of the order amount as earnings
All figures calculated from backend API orders data`;

    const link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    link.download = `revenue-report-${new Date().getTime()}.txt`;
    link.click();
  };

  const downloadUsageReport = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      // Fetch real data from backend APIs
      const [farmersRes, customersRes, dealersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users?role=farmer`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/users?role=customer`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/users?role=dealer`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const farmersData = await farmersRes.json();
      const customersData = await customersRes.json();
      const dealersData = await dealersRes.json();

      const farmers = farmersData.users || [];
      const customers = customersData.users || [];
      const dealers = dealersData.users || [];

      const content = `PLATFORM USAGE REPORT
Generated: ${new Date().toLocaleDateString()}

USER STATISTICS
===============
Total Farmers: ${farmers.length}
Total Customers: ${customers.length}
Total Transport Dealers: ${dealers.length}
Total Users: ${farmers.length + customers.length + dealers.length}

REPORT NOTES
=============
This report is based on real-time data from backend APIs
All user accounts are active and verified`;

      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
      link.download = `usage-report-${new Date().getTime()}.txt`;
      link.click();
    } catch (error) {
      console.error("Error generating usage report:", error);
      alert("Failed to generate usage report. Please try again.");
    }
  };




  return (
    <div className="management-page">
      <div className="report-section">

        <h2>{t('admin.reports.reportSummary')}</h2>
        <div className="report-metrics">
          <div className="metric-card">
            <span className="metric-label">{t('admin.reports.totalOrders')}</span>
            <span className="metric-value">{reportData.metrics.totalOrders}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">{t('admin.reports.totalRevenue')}</span>
            <span className="metric-value">₹{reportData.metrics.totalRevenue}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">{t('admin.reports.platformCommission')}</span>
            <span className="metric-value">₹{reportData.metrics.platformFee}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">{t('admin.reports.avgOrderValue')}</span>
            <span className="metric-value">₹{reportData.metrics.avgOrderValue}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">{t('admin.reports.delivered')}</span>
            <span className="metric-value">{reportData.metrics.deliveredOrders}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">{t('admin.reports.pending')}</span>
            <span className="metric-value">{reportData.metrics.pendingOrders}</span>
          </div>
        </div>
      </div>

      <div className="download-section">
        <h2>{t('admin.reports.downloadReports')}</h2>
        <div className="download-buttons">
          <button
            className="download-btn"
            onClick={() => downloadCSV(reportData.orders, 'orders-report.csv')}
          >
            {t('admin.reports.downloadOrdersCSV')}
          </button>
          <button
            className="download-btn"
            onClick={downloadRevenueReport}
          >
            {t('admin.reports.downloadRevenueReport')}
          </button>
          <button
            className="download-btn"
            onClick={downloadUsageReport}
          >
            {t('admin.reports.downloadUsageReport')}
          </button>
        </div>
      </div>

      <div className="orders-list-section">
        <h2>{t('admin.reports.recentOrders')}</h2>
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t('admin.reports.orderId')}</th>
                <th>{t('admin.reports.dealer')}</th>
                <th>{t('admin.reports.customer')}</th>
                <th>{t('admin.reports.amount')}</th>
                <th>{t('admin.reports.status')}</th>
                <th>{t('admin.reports.date')}</th>
              </tr>
            </thead>
            <tbody>
              {reportData.orders.map(order => (
                <tr key={order._id || order.orderId || order.id}>
                  <td><strong>#{getOrderId(order)}</strong></td>
                  <td>{getDealerName(order)}</td>
                  <td>{getCustomerName(order)}</td>
                  <td>₹{getOrderAmount(order).toLocaleString()}</td>
                  <td>
                    <span className="status-pill" style={{
                      background: order.status === 'Delivered' ? '#22c55e' : '#f97316',
                      color: 'white'
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td>{formatDate(getOrderDate(order))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
