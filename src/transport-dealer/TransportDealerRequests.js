import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import { apiGet, apiPut } from "../utils/api";
import "../styles/TransportDealerRequests.css";
export default function TransportDealerRequests() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const [requests, setRequests] = useState([]);
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [emailActionHandled, setEmailActionHandled] = useState(false);

  // Fetch pending requests from backend
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setApiError("");
        const data = await apiGet("transport-dealers/pending");
        if (data.success) {
          setRequests(data.requests);

          // Initialize timers for each request
          const initialTimers = {};
          data.requests.forEach(req => {
            const expiresAtMs = new Date(req.expiresAt).getTime();
            const secondsRemaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
            initialTimers[req._id] = secondsRemaining;
          });
          setTimers(initialTimers);
        }
      } catch (error) {
        console.error("❌ Error fetching requests:", error);
        setApiError(error?.message || "Failed to fetch requests");
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) {
      fetchRequests();
      // Refresh every 10 seconds
      const refreshInterval = setInterval(fetchRequests, 10000);
      return () => clearInterval(refreshInterval);
    }
  }, [user?.id]);
  useEffect(() => {
    if (loading || emailActionHandled) return;
    const params = new URLSearchParams(location.search || "");
    const requestId = params.get("requestId");
    const action = (params.get("action") || "").toLowerCase();
    if (!requestId || !["accept", "reject"].includes(action)) {
      return;
    }
    const targetRequest = requests.find(req => String(req._id) === String(requestId));
    if (!targetRequest) {
      alert("Request not found or already processed.");
      setEmailActionHandled(true);
      return;
    }
    const runAction = async () => {
      try {
        if (action === "accept") {
          const data = await apiPut(`transport-dealers/request/${requestId}/accept`, {});
          if (data?.success) {
            setEmailActionHandled(true);
            setRequests(prev => prev.filter(r => r._id !== requestId));
            alert("✅ Request accepted from email link. Opening chat...");
            navigate("/transport-dealer/messages", {
              state: {
                chatId: data.chatId
              }
            });
            return;
          }
        }
        if (action === "reject") {
          const data = await apiPut(`transport-dealers/request/${requestId}/reject`, {
            reason: "Rejected via email action"
          });
          if (data?.success) {
            setEmailActionHandled(true);
            setRequests(prev => prev.filter(r => r._id !== requestId));
            alert("✅ Request rejected from email link.");
            return;
          }
        }
      } catch (error) {
        console.error("❌ Email action failed:", error);
        alert(error?.message || "Failed to process email action");
        setEmailActionHandled(true);
      }
    };
    runAction();
  }, [loading, emailActionHandled, location.search, requests, navigate]);

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prevTimers => {
        const updated = {
          ...prevTimers
        };
        Object.keys(updated).forEach(id => {
          updated[id] = Math.max(0, updated[id] - 1);
          if (updated[id] === 0) {
            handleAutoReject(id);
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const handleAcceptRequest = async orderId => {
    try {
      const data = await apiPut(`transport-dealers/request/${orderId}/accept`, {});
      if (data.success) {
        setRequests(requests.filter(r => r._id !== orderId));
        alert("✅ Request accepted! Opening chat...");
        navigate("/transport-dealer/messages", {
          state: {
            chatId: data.chatId
          }
        });
      } else {
        alert(`❌ ${data?.error || data?.message || "Failed to accept request"}`);
      }
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      alert(`❌ ${error?.message || "Error accepting request"}`);
    }
  };
  const handleAutoReject = async orderId => {
    try {
      await apiPut(`transport-dealers/request/${orderId}/reject`, {});
      setRequests(requests.filter(r => r._id !== orderId));
    } catch (error) {
      console.error("❌ Error auto-rejecting request:", error);
    }
  };
  const handleRejectRequest = async (orderId, reason) => {
    try {
      const data = await apiPut(`transport-dealers/request/${orderId}/reject`, {
        reason
      });
      if (data.success) {
        setRequests(requests.filter(r => r._id !== orderId));
        alert("✅ Request rejected");
      }
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
    }
  };
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  return <div className="transport-dealer-requests">
      {/* Header */}
      <div className="requests-header">
        <h2>{t("\uD83D\uDCEC Transport Requests")}</h2>
        <button className="back-btn" onClick={() => navigate("/transport-dealer-dashboard")}>{t("Back")}</button>
      </div>

      {/* Info Banner */}
      <div className="request-info-banner">
        <div className="info-icon">ℹ️</div>
        <div className="info-text">
          <p>{t("You have")}<strong>{t("5 minutes")}</strong>{t("to accept or reject each request. After 5 minutes, the request will be automatically rejected.")}</p>
        </div>
      </div>

      {/* Requests List */}
      <div className="requests-container">
        {apiError && <div className="empty-state">
            <p>{t("Unable to load requests:")}{apiError}</p>
          </div>}

        {loading ? <div className="empty-state">
            <p>{t("Loading requests...")}</p>
          </div> : requests.length > 0 ? requests.map((request, idx) => <div key={idx} className="request-card">
              {/* Timer Badge */}
              <div className={`timer-badge ${timers[request._id] <= 60 ? "warning" : ""} ${timers[request._id] === 0 ? "expired" : ""}`}>
                ⏱️ {formatTime(timers[request._id] || 0)}
              </div>

              {/* Request Header */}
              <div className="request-header">
                <div className="customer-info">
                  <div className="customer-avatar">
                    {(request.customerName || "F").charAt(0).toUpperCase()}
                  </div>
                  <div className="customer-details">
                    <h3>{request.customerName || t("Customer")}</h3>
                    <p className="customer-role">{t("\uD83D\uDE9C Farmer:")}{request.farmerName || t("N/A")}</p>
                  </div>
                </div>
                <div className="request-meta">
                  <span className="request-badge">{t("\uD83C\uDD95 New")}</span>
                  <div className="price-chip">₹{request.quotedPrice || "0"}</div>
                </div>
              </div>

              {/* Request Details */}
              <div className="request-details">
                <div className="meta-grid">
                  <div className="meta-item">
                    <span className="icon">📦</span>
                    <div>
                      <p className="label">{t("Crop(s)")}</p>
                      {request.cropDetails && request.cropDetails.includes(',') ? <ul className="crop-list">
                          {request.cropDetails.split(',').map((crop, i) => <li key={i}>{crop.trim()}</li>)}
                        </ul> : <p className="value">{request.cropDetails || request.cropItem || request.cropName || t("Not specified")}</p>}
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="icon">⚖️</span>
                    <div>
                      <p className="label">{t("Quantity")}</p>
                      <p className="value">{request.quantity || "0"}</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="icon">🚗</span>
                    <div>
                      <p className="label">{t("Vehicle")}</p>
                      <p className="value">{request.vehicleType || t("Any")}</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="icon">📏</span>
                    <div>
                      <p className="label">{t("Distance")}</p>
                      <p className="value">{request.distance || "0"}{t("km")}</p>
                    </div>
                  </div>
                </div>

                <div className="route-card">
                  <div className="route-point">
                    <span className="dot pickup" />
                    <div>
                      <p className="label">{t("Pickup")}</p>
                      <p className="value">{request.pickupLocation || t("Not specified")}</p>
                    </div>
                  </div>
                  <div className="route-divider">→</div>
                  <div className="route-point">
                    <span className="dot drop" />
                    <div>
                      <p className="label">{t("Drop")}</p>
                      <p className="value">{request.dropLocation || t("Not specified")}</p>
                    </div>
                  </div>
                </div>
                {request.fullAddress && request.fullAddress.trim().length > 0 && <div className="note-card">
                    <span className="icon">🏷️</span>
                    <p className="value"><b>{t("Full Address:")}</b> {request.fullAddress}</p>
                  </div>}

                {request.specialNotes && <div className="note-card">
                    <span className="icon">📝</span>
                    <p className="value">{request.specialNotes}</p>
                  </div>}
              </div>

              {/* Action Buttons */}
              <div className="request-actions">
                <button className="accept-btn" onClick={() => handleAcceptRequest(request._id)} disabled={timers[request._id] === 0}>{t("\u2705 Accept")}</button>
                <button className="reject-btn" onClick={() => handleRejectRequest(request._id, t("Busy or unavailable"))} disabled={timers[request._id] === 0}>{t("\u2715 Reject")}</button>
              </div>
            </div>) : <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>{t("No pending requests at the moment")}</p>
            <small>{t("New requests will appear here when customers book")}</small>
          </div>}
      </div>

      {/* Bottom Navigation */}
      <TransportDealerBottomNav />
    </div>;
}