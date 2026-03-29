import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import "../styles/TransportDealerPayments.css";

export default function TransportDealerPayments() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const dealerId = user?.id || user?._id;
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setApiError("");
        const data = await apiGet(`dealer/payments/${dealerId}`);

        if (data.success) {
          setPayments(Array.isArray(data.payments) ? data.payments : []);
        }
      } catch (error) {
        console.error("❌ Error fetching payments:", error);
        setApiError(error?.message || "Unable to fetch payment details from server");
      } finally {
        setLoading(false);
      }
    };

    if (dealerId) {
      fetchPayments();
      // Refresh every 30 seconds
      const interval = setInterval(fetchPayments, 30000);
      return () => clearInterval(interval);
    }
  }, [dealerId]);

  const searchParams = new URLSearchParams(location.search);
  const orderIdFilter = searchParams.get("orderId") || "";
  const customerFilter = searchParams.get("customer") || "";

  const scopedPayments = orderIdFilter
    ? payments.filter((payment) => String(payment.transactionId || "") === String(orderIdFilter))
    : payments;

  const totalEarnings = scopedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalBonus = scopedPayments.reduce((sum, p) => sum + (Number(p.dealerBonus) || 0), 0);
  const totalPayout = totalEarnings + totalBonus;

  return (
    <div className="transport-dealer-payments">
      {/* Header */}
      <div className="payments-header">
        <div className="header-content">
          <h2>💰 Payment Details</h2>
          <p className="subtitle">
            {orderIdFilter
              ? `Showing payment for ${customerFilter ? `${decodeURIComponent(customerFilter)} - ` : ""}${orderIdFilter}`
              : "View your earnings and payment history"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {orderIdFilter ? (
            <button className="back-btn" onClick={() => navigate("/transport-dealer/payments")}>All Payments</button>
          ) : null}
          <button className="back-btn" onClick={() => navigate("/transport-dealer/account")}>
            ← Back to Account
          </button>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="earnings-summary">
        <div className="earnings-card primary">
          <div className="earnings-icon">💵</div>
          <div className="earnings-info">
            <div className="earnings-label">Total Earnings</div>
            <div className="earnings-value">₹{totalEarnings.toLocaleString()}</div>
          </div>
        </div>

        <div className="earnings-card success">
          <div className="earnings-icon">🎁</div>
          <div className="earnings-info">
            <div className="earnings-label">Total Bonus</div>
            <div className="earnings-value">₹{totalBonus.toLocaleString()}</div>
          </div>
        </div>

        <div className="earnings-card secondary">
          <div className="earnings-icon">🧾</div>
          <div className="earnings-info">
            <div className="earnings-label">Total Payout</div>
            <div className="earnings-value">₹{totalPayout.toLocaleString()}</div>
          </div>
        </div>

        <div className="earnings-card tertiary">
          <div className="earnings-icon">📦</div>
          <div className="earnings-info">
            <div className="earnings-label">Total Orders</div>
            <div className="earnings-value">{scopedPayments.length}</div>
          </div>
        </div>
      </div>

      {/* Payment Records */}
      <div className="payments-container">
        {apiError && (
          <div className="empty-state">
            <p>Unable to load payments: {apiError}</p>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <p>Loading payment details...</p>
          </div>
        ) : scopedPayments.length > 0 ? (
          scopedPayments.map((payment, idx) => (
            <div key={idx} className="payment-card">
              {/* Header */}
              <div className="payment-header">
                <div className="payment-info-left">
                  <div className="order-number">Transaction #{payment.transactionId}</div>
                  <div className="item-name">From {payment.customerName}</div>
                </div>
                <div className="payment-status">
                  <span className="status-badge completed">✅ {payment.status}</span>
                </div>
              </div>

              {/* Amount Section */}
              <div className="amount-section">
                <div className="amount-box">
                  <span className="amount-label">Amount Received</span>
                    <span className="amount-value">₹{Number(payment.totalPayout || payment.amount || 0).toLocaleString()}</span>
                </div>
                <div className="date-box">
                  <span className="date-label">Date</span>
                  <span className="date-value">{new Date(payment.date).toLocaleDateString()}</span>
                </div>
              </div>
                {Number(payment.dealerBonus || 0) > 0 && (
                  <div className="amount-section">
                    <div className="amount-box">
                      <span className="amount-label">Admin Bonus</span>
                      <span className="amount-value" style={{ color: "#2e7d32" }}>₹{Number(payment.dealerBonus).toLocaleString()}</span>
                    </div>
                  </div>
                )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💼</div>
            <p>No payment records found</p>
            <small>Payment records will appear here once you complete deliveries</small>
          </div>
        )}
      </div>

      <TransportDealerBottomNav />
    </div>
  );
}
