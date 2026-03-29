import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../utils/api";
import "../styles/TransportDealerActiveTrips.css";

export default function TransportDealerActiveTrips() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const [filterStatus, setFilterStatus] = useState("All");
  const [trips, setTrips] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) { setLoading(false); return; }

      const dealerId = user?.id || user?._id;

      try {
        // Try batch-aware endpoint first
        if (dealerId) {
          try {
            const batchData = await apiGet(`dealer/batch-orders/${dealerId}`);
            if (batchData.success) {
              setBatches(batchData.batches || []);
            }
          } catch (_) {}
        }

        // Fetch individual trip list (drives stats + status updates)
        const data = await apiGet('orders');
        if (Array.isArray(data)) {
          setTrips(data);
        }
      } catch (error) {
        console.error("âŒ Error fetching trips:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const filteredTrips = useMemo(() => {
    if (filterStatus === "All") return trips;
    if (filterStatus === "Pending Pickup") return trips.filter((t) => t.status === "Confirmed" || t.status === "Pending");
    if (filterStatus === "Completed") return trips.filter((t) => t.status === "Delivered");
    return trips.filter((t) => t.status === filterStatus);
  }, [trips, filterStatus]);

  const stats = useMemo(() => ({
    active: trips.filter((t) => t.status === "In Transit").length,
    completed: trips.filter((t) => t.status === "Delivered").length,
    total: trips.length,
  }), [trips]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem("accessToken");
    if (!token) { alert("Please login again"); return; }
    try {
      const updatedOrder = await apiPatch(`orders/${orderId}/status`, { status: newStatus });
      setTrips((prev) =>
        prev.map((t) => ((t.orderId || t.id || t._id) === orderId ? updatedOrder : t))
      );
      alert(`Trip updated to ${newStatus} ✅`);
    } catch (error) {
      console.error("âŒ Error updating trip:", error);
      alert("Failed to update trip status: " + error.message);
    }
  };

  const hasCoordinates = (coords) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  };

  const formatCoordinates = (coords) => {
    if (!hasCoordinates(coords)) return "N/A";
    return `${Number(coords.lat).toFixed(6)}, ${Number(coords.lng).toFixed(6)}`;
  };

  // Build a quick lookup: orderId -> batch (so we can show batch badge on individual trip cards)
  const orderIdToBatch = useMemo(() => {
    const map = {};
    batches.forEach((batch) => {
      (batch.stops || []).forEach((stop) => {
        map[stop.orderId] = batch;
      });
    });
    return map;
  }, [batches]);

  return (
    <div className="transport-dealer-active-trips">
      {/* Header */}
      <div className="trips-header">
        <h2>🚚 Active Trips</h2>
        <button className="back-btn" onClick={() => navigate("/transport-dealer-dashboard")}> 
          ← Back
        </button>
      </div>

      {/* Stats */}
      <div className="trips-stats">
        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div className="stat-info">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">In Transit</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Trips</div>
          </div>
        </div>
        {batches.length > 0 && (
          <div className="stat-card">
            <div className="stat-icon">🔀</div>
            <div className="stat-info">
              <div className="stat-value">{batches.length}</div>
              <div className="stat-label">Batch Trips</div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {["All", "Pending Pickup", "In Transit", "Completed"].map((status) => (
          <button
            key={status}
            className={`filter-btn ${filterStatus === status ? "active" : ""}`}
            onClick={() => setFilterStatus(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Trips List */}
      <div className="trips-list">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p>Loading trips...</p>
          </div>
        ) : filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => {
            const tripId = trip.orderId || trip.id || trip._id;
            const tripDate = trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
            const transportFinalFee = trip.summary?.transportFinalFee || trip.summary?.transportFee || trip.transport?.price || 0;
            const transportBaseFee = trip.summary?.transportBaseFee || transportFinalFee;
            const batchDiscount = trip.summary?.batchDiscount || Math.max(transportBaseFee - transportFinalFee, 0);
            const dealerPayout = trip.summary?.dealerPayout || transportFinalFee;
            const platformContribution = trip.summary?.platformContribution || Math.max(dealerPayout - transportFinalFee, 0);
            const routeDistance = Number(trip.delivery?.distance ?? trip.distance);
            const distanceSource = hasCoordinates(trip.delivery?.pickupCoordinates) && hasCoordinates(trip.delivery?.dropCoordinates)
              ? "Exact GPS" : "Fallback area";
            const pickupLocation = trip.delivery?.pickup || trip.pickupLocation || "Not specified";
            const dropLocation = trip.delivery?.drop || trip.deliveryLocation || "Not specified";
            const vehicleType = trip.transport?.vehicle || trip.vehicleType || "Not assigned";
            const itemsDescription = trip.items?.map((i) => i.cropName).join(", ") || trip.cropName || "Not specified";
            const totalQuantity = trip.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || trip.quantity || 0;

            // Check if this trip belongs to a batch
            const parentBatch = orderIdToBatch[tripId];

            return (
              <div key={tripId} className="trip-card">
                {/* Batch badge if applicable */}
                {parentBatch && (
                  <div className="batch-tag" style={{ marginBottom: "8px" }}>
                    🔀 Batch Trip — {parentBatch.orderCount} stops &nbsp;|&nbsp;
                    Route: 📤 {parentBatch.pickupLocation}
                    {parentBatch.stops.map((stop) => (
                      <span key={stop._id}>{" → "} {stop.customerName}</span>
                    ))}
                  </div>
                )}

                {/* Trip Header */}
                <div className="trip-header">
                  <div className="trip-id-section">
                    <h3>Trip #{tripId}</h3>
                    <span className={`status-badge status-${trip.status?.toLowerCase().replace(/\s+/g, "-")}`}>
                      {trip.status || "Pending"}
                    </span>
                  </div>
                  <div className="trip-time">ðŸ“… {tripDate}</div>
                </div>

                {/* Customer Info */}
                <div className="customer-section">
                  <div className="customer-box">
                    <div className="customer-avatar">
                      {(trip.customerName || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="customer-info">
                      <p className="customer-name">{trip.customerName || "Customer"}</p>
                      <p className="customer-phone">ðŸ“ž {trip.customerPhone || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="trip-details">
                  <div className="detail-section">
                    <h4>📦 Shipment Details</h4>
                    <div className="detail-items">
                      <div className="detail-item">
                        <span className="label">Item:</span>
                        <span className="value">{itemsDescription}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Quantity:</span>
                        <span className="value">{totalQuantity} kg</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Vehicle:</span>
                        <span className="value">{vehicleType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>🗺️ Route</h4>
                    <div className="route-info">
                      <div className="location">
                        <span className="icon">📦</span>
                        <div>
                          <p className="label">Pickup</p>
                          <p className="address">{pickupLocation}</p>
                        </div>
                      </div>

                      {/* If batch â€” show all stops in sequence */}
                      {parentBatch ? (
                        parentBatch.stops.map((stop) => (
                          <React.Fragment key={stop._id}>
                            <div className="arrow">↓</div>
                            <div className="location">
                              <span className="icon">{stop.stopNumber === parentBatch.stops.length ? "🏁" : "🗺️"}</span>
                              <div>
                                <p className="label">Stop {stop.stopNumber} — {stop.customerName}</p>
                                <p className="address">{stop.dropLocation}</p>
                              </div>
                            </div>
                          </React.Fragment>
                        ))
                      ) : (
                        <>
                          <div className="arrow">↓</div>
                          <div className="location">
                            <span className="icon">📥</span>
                            <div>
                              <p className="label">Delivery</p>
                              <p className="address">{dropLocation}</p>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="location" style={{ marginTop: "8px" }}>
                        <span className="icon">🗺️</span>
                        <div>
                          <p className="label">Distance</p>
                          <p className="address">{Number.isFinite(routeDistance) ? `${routeDistance} km` : "N/A"}</p>
                        </div>
                      </div>
                      <div className="location" style={{ marginTop: "8px" }}>
                        <span className="icon">🛰️</span>
                        <div>
                          <p className="label">Source</p>
                          <p className="address">{distanceSource}</p>
                        </div>
                      </div>
                      <div className="location" style={{ marginTop: "8px" }}>
                        <span className="icon">🗺️</span>
                        <div>
                          <p className="label">Pickup Coordinates</p>
                          <p className="address">{formatCoordinates(trip.delivery?.pickupCoordinates)}</p>
                        </div>
                      </div>
                      <div className="location" style={{ marginTop: "8px" }}>
                        <span className="icon">🎯</span>
                        <div>
                          <p className="label">Drop Coordinates</p>
                          <p className="address">{formatCoordinates(trip.delivery?.dropCoordinates)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>💰 Payment</h4>
                    <div className="payment-info">
                      <div className="payment-item">
                        <span className="label">Base Delivery:</span>
                        <span className="value">₹{transportBaseFee.toLocaleString()}</span>
                      </div>
                      <div className="payment-item">
                        <span className="label">Batch Discount:</span>
                        <span className="value" style={{ color: "#2e7d32" }}>-₹{batchDiscount.toLocaleString()}</span>
                      </div>
                      {parentBatch && (() => {
                        const myStop = parentBatch.stops.find((s) => s.orderId === tripId);
                        return myStop ? (
                          <div className="payment-item">
                            <span className="label">Batch Discount (10%):</span>
                            <span className="value" style={{ color: "#1565c0" }}>-₹{myStop.batchDiscount}</span>
                          </div>
                        ) : null;
                      })()}
                      <div className="payment-item">
                        <span className="label">Final Delivery Charge:</span>
                        <span className="value highlight">₹{transportFinalFee.toLocaleString()}</span>
                      </div>
                      <div className="payment-item">
                        <span className="label">Dealer Payout:</span>
                        <span className="value highlight" style={{ color: "#2e7d32" }}>₹{Number(parentBatch ? (parentBatch.stops.find((s) => s.orderId === tripId)?.dealerPayout || dealerPayout) : dealerPayout).toLocaleString()}</span>
                      </div>
                      <div className="payment-item">
                        <span className="label">Platform Contribution:</span>
                        <span className="value" style={{ color: "#1565c0" }}>₹{Number(parentBatch ? (parentBatch.stops.find((s) => s.orderId === tripId)?.platformContribution || platformContribution) : platformContribution).toLocaleString()}</span>
                      </div>
                      {parentBatch && (
                        <div className="payment-item" style={{ borderTop: "1px solid #e0e0e0", marginTop: "6px", paddingTop: "6px" }}>
                          <span className="label" style={{ fontWeight: 700 }}>Total Batch Earnings:</span>
                          <span className="value highlight" style={{ color: "#2e7d32", fontWeight: 700 }}>₹{parentBatch.totalEarnings}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="trip-actions">
                  {(trip.status === "Pending" || trip.status === "Confirmed") && (
                    <button className="action-btn pickup-btn" onClick={() => handleUpdateStatus(tripId, "In Transit")}> 
                      🎯 Start Delivery
                    </button>
                  )}
                  {trip.status === "In Transit" && (
                    <button className="action-btn complete-btn" onClick={() => handleUpdateStatus(tripId, "Delivered")}>
                      âœ“ Mark Delivered
                    </button>
                  )}
                  <button className="action-btn message-btn" onClick={() => navigate("/transport-dealer/messages")}>
                    ðŸ’¬ Chat
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <div className="empty-icon">ðŸš—</div>
            <p>No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""} trips</p>
            <small>Your active trips will appear here</small>
          </div>
        )}
      </div>

      <TransportDealerBottomNav />
    </div>
  );
}
