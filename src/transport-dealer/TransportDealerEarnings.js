import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import "../styles/TransportDealerEarnings.css";


export default function TransportDealerEarnings() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const [earnings, setEarnings] = useState({
    totalReceived: 0,
    totalBonus: 0,
    totalPayout: 0,
    thisMonth: 0,
    thisWeek: 0,
    bonusThisMonth: 0,
    bonusThisWeek: 0,
    completedDeliveries: 0,
    recentOrder: null
  });
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const data = await apiGet(`dealer/earnings/${user?.id}`);
        if (data.success) {
          setEarnings(data.earnings);
        }
      } catch (error) {
        console.error("❌ Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    };
    const fetchOrders = async () => {
      try {
        const data = await apiGet(`dealer/orders/${user?.id}`);
        if (data.success) setOrders(data.orders || []);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
      }
    };
    if (user?.id) {
      fetchEarnings();
      fetchOrders();
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchEarnings();
        fetchOrders();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  return (
    <div className="transport-dealer-earnings">
      {/* Header */}
      <div className="earnings-header">
        <h2>💰 Earnings</h2>
        <button
          className="back-btn"
          onClick={() => navigate("/transport-dealer-dashboard")}
        >
          ← Back
        </button>
      </div>

      {/* Summary Cards */}
      <div className="earnings-summary">
        <div className="summary-card primary">
          <div className="card-icon">💵</div>
          <div className="card-content">
            <p className="card-label">Base Earnings</p>
            <p className="card-value">₹{earnings.totalReceived.toLocaleString()}</p>
            <p className="card-subtext">All time credited</p>
          </div>
        </div>

        <div className="summary-card success">
          <div className="card-icon">🎁</div>
          <div className="card-content">
            <p className="card-label">Admin Bonus</p>
            <p className="card-value">₹{(earnings.totalBonus || 0).toLocaleString()}</p>
            <p className="card-subtext">Performance incentives</p>
          </div>
        </div>

        <div className="summary-card payout">
          <div className="card-icon">🧾</div>
          <div className="card-content">
            <p className="card-label">Total Payout</p>
            <p className="card-value">₹{(earnings.totalPayout || (earnings.totalReceived + (earnings.totalBonus || 0))).toLocaleString()}</p>
            <p className="card-subtext">Base earnings + bonus</p>
          </div>
        </div>

        <div className="summary-card accent">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <p className="card-label">This Month</p>
            <p className="card-value">₹{(earnings.thisMonth + (earnings.bonusThisMonth || 0)).toLocaleString()}</p>
            <p className="card-subtext">Bonus: ₹{(earnings.bonusThisMonth || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="summary-card tertiary">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <p className="card-label">This Week</p>
            <p className="card-value">₹{(earnings.thisWeek + (earnings.bonusThisWeek || 0)).toLocaleString()}</p>
            <p className="card-subtext">Bonus: ₹{(earnings.bonusThisWeek || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Recent Order */}
      <div className="transactions-section">
        <div className="section-header">
          <h3>📋 Most Recent Delivery</h3>
        </div>

        <div className="transactions-list">
          {loading ? (
            <div className="empty-state">
              <p>Loading earnings data...</p>
            </div>
          ) : earnings.recentOrder ? (
            <div className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-title">
                  Order #{earnings.recentOrder.orderId}
                </div>
                <div className="transaction-date">
                  {new Date(earnings.recentOrder.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="transaction-amount">
                <span className="amount-value">+ ₹{(earnings.recentOrder.totalPayout || earnings.recentOrder.amount || 0).toLocaleString()}</span>
                <span className="amount-status">Completed</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No delivery transactions yet</p>
              <small>Complete deliveries to earn money</small>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Order Earnings Breakdown */}
      <div className="earnings-orders-breakdown">
        <h3 style={{marginTop: 24}}>📝 All Order Earnings</h3>
        {orders.length === 0 ? (
          <div className="empty-state"><p>No completed orders yet.</p></div>
        ) : (
          orders.map(order => {
            const isExpanded = expandedOrderId === order.orderId;
            return (
              <div key={order.orderId} className="order-earnings-horizontal" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                marginBottom: 14,
                padding: 14,
                border: '1px solid #eee',
                borderRadius: 8,
                background: isExpanded ? '#f8fafc' : '#fff',
                boxShadow: isExpanded ? '0 2px 8px #e0e7ef33' : 'none'
              }}>
                <div style={{flex: 2, minWidth: 0}}>
                  <b>Order #{order.orderId}</b> <span style={{color: '#888'}}>({order.status})</span>
                  <div style={{fontSize: 13, color: '#666'}}>Date: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div style={{flex: 1, minWidth: 0, textAlign: 'center'}}>
                  <div style={{fontWeight: 600}}>₹{order.dealerPayout}</div>
                  <div style={{fontSize: 12, color: '#888'}}>Base</div>
                </div>
                <div style={{flex: 1, minWidth: 0, textAlign: 'center'}}>
                  <div style={{fontWeight: 600}}>₹{order.totalPayout}</div>
                  <div style={{fontSize: 12, color: '#888'}}>Total</div>
                </div>
                <div style={{flex: 1, minWidth: 0, textAlign: 'center'}}>
                  <button
                    style={{
                      padding: '6px 18px',
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      background: isExpanded ? '#e0e7ef' : '#f1f5f9',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                  >
                    {isExpanded ? 'Hide' : 'View'}
                  </button>
                </div>
                {isExpanded && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '100%',
                    marginTop: 8,
                    background: '#f8fafc',
                    border: '1px solid #e0e7ef',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px #e0e7ef33',
                    zIndex: 2,
                    padding: 16,
                    minWidth: 320
                  }}>
                    <div>Admin Bonus: <b>₹{order.dealerBonus}</b></div>
                    <div>Platform Adds: <b>₹{order.platformContribution}</b></div>
                    <div>Total Payout: <b>₹{order.totalPayout}</b></div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <TransportDealerBottomNav />
    </div>
  );
}
