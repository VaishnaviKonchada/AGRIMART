import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import "../styles/TransportDealerOrders.css";

export default function TransportDealerOrders() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const [batches, setBatches] = useState([]);
  const [singles, setSingles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const getStableId = (value) => {
    if (!value) return "N/A";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value._id || value.id || "N/A";
    return String(value);
  };

  const hasText = (value) => typeof value === "string" && value.trim().length > 0;

  const buildCustomerFullAddress = (order) => {
    const customer = order?.customer || {};
    // Prefer fullAddress if present
    if (hasText(customer.fullAddress)) {
      return customer.fullAddress.trim();
    }
    const parts = [];
    if (hasText(customer.address)) parts.push(`Door No: ${customer.address.trim()}`);
    [customer.locationText, customer.mandal, customer.district, customer.state, customer.pincode]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .forEach((part) => {
        if (!parts.includes(part)) parts.push(part);
      });
    return parts.length ? parts.join(", ") : "N/A";
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

  const toggleDetails = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const dealerId = user?.id || user?._id;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await apiGet(`dealer/batch-orders/${dealerId}`);
        if (data.success) {
          setBatches(data.batches || []);
          setSingles(data.singles || []);
        }
      } catch (error) {
        // Fallback: try legacy endpoint quietly
        try {
          const legacy = await apiGet(`dealer/orders/${dealerId}`);
          if (legacy.success) {
            setBatches([]);
            setSingles(legacy.orders.map((o) => ({ ...o, type: "single" })));
          }
        } catch (_) {}
        console.error("❌ Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (dealerId) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [user?.id, user?._id]);

  // Helper to calculate platform fee for a stop/order
  const getPlatformFee = (stopOrOrder) => {
    const total = Number(stopOrOrder.transportFinalFee || stopOrOrder.amount || 0);
    const payout = Number(stopOrOrder.dealerPayout || 0);
    return total > payout ? total - payout : 0;
  };

  const totalOrders = batches.reduce((s, b) => s + b.orderCount, 0) + singles.length;

  return (
    <div className="transport-dealer-orders">
      {/* Header */}
      <div className="orders-header">
        <div className="header-content">
          <h2>📦 Confirmed Orders</h2>
          <p className="subtitle">View all your confirmed orders and delivery details</p>
        </div>
        <button className="back-btn" onClick={() => navigate("/transport-dealer/account")}>
          ← Back to Account
        </button>
      </div>

      <div className="orders-container">
        {loading ? (
          <div className="empty-state"><p>Loading orders...</p></div>
        ) : totalOrders > 0 ? (
          <>
            {/* ── BATCH TRIP CARDS ── */}
            {batches.map((batch) => {
              const isExpanded = expandedId === batch.batchId;
              return (
                <div key={batch.batchId} className="order-card horizontal batch-card">
                  <div className="batch-tag">🔀 Batch Trip — {batch.orderCount} Stops</div>
                  <div className="order-header-horizontal">
                    <div className="order-main-meta">
                      <div className="order-id-block">
                        <span className="id-label">Batch ID</span>
                        <span className="id-value">#{batch.batchId.slice(-8)}</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Orders</span>
                        <span className="id-value">{batch.orderCount} customers</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Vehicle</span>
                        <span className="id-value">{batch.vehicleType}</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Total Weight</span>
                        <span className="id-value">{batch.totalWeight} kg</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Total Earnings</span>
                        <span className="id-value" style={{ color: "#2e7d32", fontWeight: 700 }}>₹{batch.totalEarnings}</span>
                      </div>
                    </div>
                    <div className="order-actions-horizontal">
                      <button className="view-details-btn" onClick={() => toggleDetails(batch.batchId)}>
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                  </div>

                  {/* Multi-stop route summary */}
                  <div className="batch-route-summary">
                    <span className="route-label">Route: </span>
                    <span className="route-text">
                      📤 {batch.pickupLocation}
                      {batch.stops.map((stop) => (
                        <span key={stop._id}>{" → 📍 "}{stop.customerName} ({stop.dropLocation})</span>
                      ))}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="order-details-expanded">
                      {batch.stops.map((stop) => (
                        <div key={stop._id} className="batch-stop-detail">
                          <h4 className="section-heading">Stop {stop.stopNumber} — {stop.customerName}</h4>
                          <div className="details-grid">
                            <div className="detail-section">
                              <div className="detail-item">
                                <span className="detail-label">Order ID</span>
                                <span className="detail-value">#{stop.orderId}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Crop / Item</span>
                                <span className="detail-value">{stop.cropItem}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Quantity</span>
                                <span className="detail-value">{stop.quantity} kg</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Drop Location</span>
                                <span className="detail-value">{stop.dropLocation}</span>
                              </div>
                              {stop.dropCoordinates && (
                                <div className="detail-item">
                                  <span className="detail-label">Drop Coordinates</span>
                                  <span className="detail-value">{formatCoordinates(stop.dropCoordinates)}</span>
                                </div>
                              )}
                            </div>
                            <div className="detail-section">
                              <h4 className="section-heading">💰 Delivery Pricing</h4>
                              <div className="detail-item">
                                <span className="detail-label">Base Delivery</span>
                                <span className="detail-value">₹{stop.deliveryFee}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Batch Discount</span>
                                <span className="detail-value" style={{ color: "#2e7d32" }}>-₹{stop.batchDiscount}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Final Delivery Charge</span>
                                <span className="detail-value" style={{ fontWeight: 700 }}>₹{stop.finalFee}</span>
                              </div>
                            </div>
                          </div>
                          <div className="earnings-section">
                            <h4 className="section-heading">💵 Your Earnings</h4>
                            <div className="earnings-grid">
                              <div className="earnings-item">
                                <span className="earnings-label">Customer Pays</span>
                                <span className="earnings-value">₹{Number(stop.finalFee || 0).toLocaleString()}</span>
                              </div>
                              <div className="earnings-item">
                                <span className="earnings-label">Platform Fee</span>
                                <span className="earnings-value" style={{ color: '#e65100' }}>-₹{getPlatformFee(stop).toLocaleString()}</span>
                              </div>
                              <div className="earnings-item">
                                <span className="earnings-label">Platform Adds</span>
                                <span className="earnings-value bonus">+₹{Number(stop.platformContribution || 0).toLocaleString()}</span>
                              </div>
                              <div className="earnings-item total">
                                <span className="earnings-label">Your Payout</span>
                                <span className="earnings-value total">₹{Number(stop.dealerPayout || 0).toLocaleString()}</span>
                              </div>
                            </div>
                            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                              <b>Note:</b> "Your Payout" is the actual amount credited to you. Platform fee is deducted from the total delivery charge.
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── SINGLE ORDER CARDS (unchanged original flow) ── */}
            {singles.map((order) => {
              const orderKey = order._id || order.orderId;
              const isExpanded = expandedId === orderKey;
              return (
                <div key={orderKey} className="order-card horizontal">
                  <div className="order-header-horizontal">
                    <div className="order-main-meta">
                      <div className="order-id-block">
                        <span className="id-label">Order ID</span>
                        <span className="id-value">#{order.orderId}</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Customer</span>
                        <span className="id-value">{order.customer?.name || "N/A"}</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Farmer</span>
                        <span className="id-value">{order.farmerName || "N/A"}</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Amount</span>
                        <span className="id-value">₹{order.amount}</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Distance</span>
                        <span className="id-value">{order.distance !== null && order.distance !== undefined ? `${order.distance} km` : "N/A"}</span>
                      </div>
                      <div className="order-id-block">
                        <span className="id-label">Status</span>
                        <span className={`status-badge ${String(order.status || "").toLowerCase()}`}>✅ {order.status}</span>
                      </div>
                    </div>
                    <div className="order-actions-horizontal">
                      <button className="view-details-btn" onClick={() => toggleDetails(orderKey)}>
                        {isExpanded ? "Hide Order Details" : "View Order Details"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="order-details-expanded">
                      <div className="details-grid">
                        <div className="detail-section">
                          <h4 className="section-heading">📍 Route Details</h4>
                          <div className="detail-item">
                            <span className="detail-label">Farmer Pickup Location</span>
                            <span className="detail-value">{order.pickupLocation || "N/A"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Customer Drop Location</span>
                            <span className="detail-value">{order.dropLocation || "N/A"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Distance</span>
                            <span className="detail-value">
                              {order.distance !== null && order.distance !== undefined ? `${order.distance} km` : "N/A"}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Pickup Coordinates</span>
                            <span className="detail-value">{formatCoordinates(order.pickupCoordinates)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Drop Coordinates</span>
                            <span className="detail-value">{formatCoordinates(order.dropCoordinates)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Distance Source</span>
                            <span className="detail-value">{order.distanceSource || "Fallback area"}</span>
                          </div>
                        </div>

                        <div className="detail-section">
                          <h4 className="section-heading">👤 Customer Details</h4>
                          <div className="detail-item">
                            <span className="detail-label">Contact Number</span>
                            <span className="detail-value">{order.customer?.phone || "N/A"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Delivery Address</span>
                            <span className="detail-value">{buildCustomerFullAddress(order)}</span>
                          </div>
                        </div>

                        <div className="detail-section">
                          <h4 className="section-heading">🚜 Load Details</h4>
                          <div className="detail-item">
                            <span className="detail-label">Crop/Item</span>
                            <span className="detail-value">{order.cropItem || "N/A"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Quantity</span>
                            <span className="detail-value">{order.quantity || "N/A"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Vehicle Type</span>
                            <span className="detail-value">{order.vehicleType || "N/A"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Base Delivery</span>
                            <span className="detail-value">₹{Number(order.transportBaseFee || order.amount || 0).toLocaleString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Batch Discount</span>
                            <span className="detail-value" style={{ color: "#2e7d32" }}>-₹{Number(order.batchDiscount || 0).toLocaleString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Final Delivery Charge</span>
                            <span className="detail-value">₹{Number(order.transportFinalFee || order.amount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="earnings-section">
                          <h4 className="section-heading">💵 Your Earnings</h4>
                          <div className="earnings-grid">
                            <div className="earnings-item">
                              <span className="earnings-label">Customer Pays</span>
                              <span className="earnings-value">₹{Number(order.transportFinalFee || order.amount || 0).toLocaleString()}</span>
                            </div>
                            <div className="earnings-item">
                              <span className="earnings-label">Platform Fee</span>
                              <span className="earnings-value" style={{ color: '#e65100' }}>-₹{getPlatformFee(order).toLocaleString()}</span>
                            </div>
                            <div className="earnings-item">
                              <span className="earnings-label">Platform Adds</span>
                              <span className="earnings-value bonus">+₹{Number(order.platformContribution || 0).toLocaleString()}</span>
                            </div>
                            <div className="earnings-item total">
                              <span className="earnings-label">Your Payout</span>
                              <span className="earnings-value total">₹{Number(order.dealerPayout || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                            <b>Note:</b> "Your Payout" is the actual amount credited to you. Platform fee is deducted from the total delivery charge.
                          </div>
                        </div>
                      </div>
                      {order.specialNotes ? (
                        <div className="notes-section">
                          <h4 className="section-heading">📝 Special Notes</h4>
                          <p className="notes-text">{order.specialNotes}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No confirmed orders yet</p>
            <small>Orders will appear here once customers confirm their requests</small>
          </div>
        )}
      </div>

      <TransportDealerBottomNav />
    </div>
  );
}
