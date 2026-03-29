import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import { API_BASE_URL } from "../utils/api";
import "../styles/TransportDealerNotifications.css";



export default function TransportDealerNotifications() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({});
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    // Fetch notifications from backend (pending orders for dealer)
    const fetchNotifications = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch pending orders as notifications for dealer
        const response = await fetch(`${API_BASE_URL}/orders?status=Pending`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const orders = await response.json();
          // Convert orders to notification format
          const notifs = orders.map(order => ({
            id: order._id,
            orderId: order._id,
            type: "REQUEST",
            status: "Pending",
            customerName: order.customerId?.name || "Customer",
            pickup: order.delivery?.pickup || "",
            drop: order.delivery?.drop || "",
            amount: order.summary?.total || 0,
            createdAt: order.createdAt,
          }));
          setNotifications(notifs);

          // Initialize timers for new requests
          const initialTimers = {};
          notifs.forEach((notif) => {
            if (notif.type === "REQUEST" && !initialTimers[notif.id]) {
              initialTimers[notif.id] = 300; // 5 minutes
            }
          });
          setTimers(initialTimers);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  // Timer countdown effect
  useEffect(() => {
    if (Object.keys(timers).length === 0) return;

    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        const updated = { ...prevTimers };
        Object.keys(updated).forEach((id) => {
          updated[id] = Math.max(0, updated[id] - 1);
          if (updated[id] === 0) {
            handleNotificationExpire(id);
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timers]);

  const handleAcceptNotification = async (notifId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      // Update order status to accepted
      const response = await fetch(`${API_BASE_URL}/orders/${notifId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "Accepted" }),
      });

      if (response.ok) {
        setNotifications(notifications.filter((n) => n.id !== notifId));
        delete timers[notifId];
        alert("Request accepted! ✅ Chat started with customer");
        navigate("/transport-dealer/messages");
      }
    } catch (error) {
      console.error("Error accepting notification:", error);
    }
  };

  const handleRejectNotification = async (notifId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      // Update order status to rejected
      const response = await fetch(`${API_BASE_URL}/orders/${notifId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "Cancelled" }),
      });

      if (response.ok) {
        setNotifications(notifications.filter((n) => n.id !== notifId));
        delete timers[notifId];
        alert("Notification rejected ✓");
      }
    } catch (error) {
      console.error("Error rejecting notification:", error);
    }
  };

  const handleNotificationExpire = (notifId) => {
    const allNotifications = JSON.parse(
      localStorage.getItem("dealerNotifications") || "[]"
    );
    const updated = allNotifications.map((n) =>
      n.id === notifId
        ? { ...n, status: "Expired", expiredAt: new Date().toISOString() }
        : n
    );
    localStorage.setItem("dealerNotifications", JSON.stringify(updated));
    setNotifications(notifications.filter((n) => n.id !== notifId));
  };

  const filteredNotifications = useMemo(() => {
    if (filterType === "All") return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const notifCounts = useMemo(() => {
    return {
      all: notifications.length,
      request: notifications.filter((n) => n.type === "REQUEST").length,
      message: notifications.filter((n) => n.type === "MESSAGE").length,
      order: notifications.filter((n) => n.type === "ORDER").length,
    };
  }, [notifications]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "REQUEST":
        return "📬";
      case "MESSAGE":
        return "💬";
      case "ORDER":
        return "📦";
      default:
        return "🔔";
    }
  };

  return (
    <div className="transport-dealer-notifications">
      {/* Header */}
      <div className="notifications-header">
        <h2>🔔 Notifications</h2>
        <button
          className="back-btn"
          onClick={() => navigate("/transport-dealer-dashboard")}
        >
          ← Back
        </button>
      </div>

      {/* Notification Info Banner */}
      <div className="notification-info-banner">
        <div className="banner-icon">ℹ️</div>
        <div className="banner-text">
          <p>Accept or reject transport requests within <strong>5 minutes</strong>. Notifications that expire will be sent to other dealers.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {[
          { label: "All", type: "All", count: notifCounts.all },
          { label: "Requests", type: "REQUEST", count: notifCounts.request },
          { label: "Messages", type: "MESSAGE", count: notifCounts.message },
          { label: "Orders", type: "ORDER", count: notifCounts.order },
        ].map(({ label, type, count }) => (
          <button
            key={type}
            className={`filter-btn ${filterType === type ? "active" : ""}`}
            onClick={() => setFilterType(type)}
          >
            {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif, idx) => (
            <div key={idx} className={`notification-card notification-${notif.type?.toLowerCase()}`}>
              {/* Timer Badge (only for REQUEST type) */}
              {notif.type === "REQUEST" && (
                <div
                  className={`timer-badge ${
                    timers[notif.id] <= 60 ? "warning" : ""
                  } ${timers[notif.id] === 0 ? "expired" : ""}`}
                >
                  ⏱️ {formatTime(timers[notif.id] || 0)}
                </div>
              )}

              {/* Notification Header */}
              <div className="notif-header">
                <div className="notif-title-section">
                  <span className="notif-icon">{getNotificationIcon(notif.type)}</span>
                  <div className="notif-title">
                    <h3>{notif.title || "Notification"}</h3>
                    <p className="notif-time">
                      {notif.timestamp
                        ? new Date(notif.timestamp).toLocaleString()
                        : new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`notif-badge notif-${notif.type?.toLowerCase()}`}>
                  {notif.type || "NOTIFICATION"}
                </span>
              </div>

              {/* Notification Content */}
              <div className="notif-content">
                <p>{notif.message || "No message provided"}</p>
              </div>

              {/* Notification Details */}
              {notif.type === "REQUEST" && (
                <div className="notif-details">
                  <div className="detail-row">
                    <span className="label">From:</span>
                    <span className="value">{notif.customerName || "Customer"}</span>
                  </div>
                  {notif.cropName && (
                    <div className="detail-row">
                      <span className="label">Item:</span>
                      <span className="value">{notif.cropName}</span>
                    </div>
                  )}
                  {notif.quantity && (
                    <div className="detail-row">
                      <span className="label">Quantity:</span>
                      <span className="value">{notif.quantity} {notif.unit || "units"}</span>
                    </div>
                  )}
                  {notif.amount && (
                    <div className="detail-row">
                      <span className="label">Offer:</span>
                      <span className="value highlight">₹{notif.amount}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="notif-actions">
                {notif.type === "REQUEST" && (
                  <>
                    <button
                      className="action-btn accept-btn"
                      onClick={() => handleAcceptNotification(notif.id)}
                      disabled={timers[notif.id] === 0}
                    >
                      ✅ Accept
                    </button>
                    <button
                      className="action-btn reject-btn"
                      onClick={() => handleRejectNotification(notif.id)}
                      disabled={timers[notif.id] === 0}
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
                {notif.type === "MESSAGE" && (
                  <button
                    className="action-btn view-btn"
                    onClick={() => navigate("/transport-dealer/messages")}
                  >
                    💬 View Chat
                  </button>
                )}
                {notif.type === "ORDER" && (
                  <button
                    className="action-btn view-btn"
                    onClick={() => navigate("/transport-dealer/orders")}
                  >
                    📋 View Order
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <p>No notifications at the moment</p>
            <small>You'll receive notifications when customers send requests</small>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <TransportDealerBottomNav />
    </div>
  );
}
