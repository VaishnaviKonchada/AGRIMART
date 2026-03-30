import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import "../styles/DeliveryStatus.css";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";

const deliverySteps = [
  { 
    id: "Confirmed", 
    label: "Order Confirmed",
    icon: "✓",
    description: "We have received your order"
  },
  { 
    id: "Picked Up", 
    label: "Picked Up",
    icon: "📦",
    description: "Your order has been picked up"
  },
  { 
    id: "In Transit", 
    label: "In Transit",
    icon: "🚚",
    description: "Your order is on the way"
  },
  { 
    id: "Delivered", 
    label: "Delivered",
    icon: "🎉",
    description: "Order delivered successfully"
  },
];

export default function DeliveryStatus() {
  const { orderId: orderIdParam } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const orders = await apiGet('orders');
        if (Array.isArray(orders)) {
          const decodedOrderId = decodeURIComponent(orderIdParam);
          const found = orders.find((o) => (o.orderId || o.id || o._id) === decodedOrderId);
          setOrder(found);
        }
      } catch (error) {
        console.error("❌ Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderIdParam]);

  if (loading) {
    return (
      <div className="delivery-status-container">
        <div className="not-found-card">
          <div className="not-found-icon">⏳</div>
          <h2>Loading Order</h2>
          <p>Please wait while we fetch your order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="delivery-status-container">
        <div className="not-found-card">
          <div className="not-found-icon">📦</div>
          <h2>Order Not Found</h2>
          <p>We couldn't find the order you're looking for.</p>
          <p className="order-id-text">Order ID: {decodeURIComponent(orderIdParam)}</p>
          <button 
            className="back-to-orders-btn"
            onClick={() => navigate("/orders")}
          >
            ← Back to My Orders
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = deliverySteps.findIndex(step => step.id === order.status);
  const isDelivered = order.status === "Delivered";
  const isCancelled = order.status === "Cancelled";

  // Calculate estimated delivery (for demo - 3 days from order creation)
  const orderCreatedTime = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  const estimatedDelivery = new Date(orderCreatedTime + 3 * 24 * 60 * 60 * 1000);
  const formattedEstimatedDate = estimatedDelivery.toLocaleDateString('en-IN', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const orderId = order.orderId || order.id || order._id;
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
  const total = order.summary?.total || order.total || 0;
  const farmerLocation = order.delivery?.pickup || order.farmer?.location || "Not specified";
  const deliveryLocation = order.delivery?.drop || order.delivery?.location || "Not specified";
  const dealerName = order.dealerName || order.transport?.dealerName || "N/A";
  const vehicleType = order.transport?.vehicle || "N/A";
  const routeDistance = Number(order.delivery?.distance);
  const transportBaseFee = Number(order.summary?.transportBaseFee || order.transport?.price || 0);
  const transportFinalFee = Number(order.summary?.transportFinalFee || order.summary?.transportFee || order.transport?.price || 0);
  const batchDiscount = Number(order.summary?.batchDiscount || Math.max(transportBaseFee - transportFinalFee, 0));
  const dealerPayout = Number(order.summary?.dealerPayout || transportFinalFee);
  const platformContribution = Number(order.summary?.platformContribution || Math.max(dealerPayout - transportFinalFee, 0));
  const hasCoordinates = (coords) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  };
  const formatCoordinates = (coords) => {
    if (!hasCoordinates(coords)) return "N/A";
    return `${Number(coords.lat).toFixed(6)}, ${Number(coords.lng).toFixed(6)}`;
  };
  const distanceSource = hasCoordinates(order.delivery?.pickupCoordinates) && hasCoordinates(order.delivery?.dropCoordinates)
    ? "Exact GPS"
    : "Fallback area";

  return (
    <div className="delivery-status-container">
      <CustomerHeader />

      <div className="delivery-content">
        {/* STATUS BANNER */}
        <div className={`status-banner ${isDelivered ? 'delivered' : isCancelled ? 'cancelled' : 'in-progress'}`}>
          <div className="status-banner-content">
            <div className="status-icon-large">
              {isDelivered ? "✓" : isCancelled ? "✕" : "🚚"}
            </div>
            <div className="status-text">
              <h2>{isDelivered ? "Delivered" : isCancelled ? "Cancelled" : order.status}</h2>
              <p>
                {isDelivered 
                  ? "Your order has been delivered successfully" 
                  : isCancelled 
                  ? "This order has been cancelled"
                  : `Expected delivery by ${formattedEstimatedDate}`}
              </p>
            </div>
          </div>
        </div>

        {/* DELIVERY TIMELINE */}
        {!isCancelled && (
          <div className="timeline-card">
            <h3 className="section-heading">Delivery Status</h3>
            <div className="delivery-timeline">
              {deliverySteps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.id} className={`timeline-item ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="timeline-marker">
                      <div className="timeline-circle">
                        {isActive ? step.icon : index + 1}
                      </div>
                      {index < deliverySteps.length - 1 && (
                        <div className={`timeline-line ${isActive && index < currentStepIndex ? 'active' : ''}`}></div>
                      )}
                    </div>
                    <div className="timeline-content">
                      <h4>{step.label}</h4>
                      <p>{step.description}</p>
                      {isCurrent && (
                        <span className="current-badge">Current Status</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ORDER DETAILS */}
        <div className="details-card">
          <h3 className="section-heading">Order Details</h3>
          
          <div className="detail-row">
            <span className="detail-label">Order ID</span>
            <span className="detail-value">{orderId}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Order Date</span>
            <span className="detail-value">{orderDate}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Payment Method</span>
            <span className="detail-value">
              <span className="payment-badge">💳 {order.paymentMethod || "UPI"}</span>
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Total Amount</span>
            <span className="detail-value amount">₹{total.toLocaleString()}</span>
          </div>
        </div>

        {/* ITEMS ORDERED */}
        <div className="items-card">
          <h3 className="section-heading">Items Ordered</h3>
          <div className="items-list">
            {order.items.map((item, index) => (
              <div key={index} className="order-item">
                <div className="item-icon">🌾</div>
                <div className="item-details">
                  <h4>{item.cropName || item.name}</h4>
                  <p>{item.quantity} kg × farmer selling price ₹{item.pricePerKg}/kg</p>
                </div>
                <div className="item-price">
                  ₹{(item.quantity * item.pricePerKg).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DELIVERY ADDRESS */}
        <div className="address-card">
          <h3 className="section-heading">Delivery Information</h3>
          
          <div className="address-section">
            <div className="address-icon">📍</div>
            <div className="address-content">
              <h4>Pickup Location</h4>
              <p>{farmerLocation}</p>
              <p>Coords: {formatCoordinates(order.delivery?.pickupCoordinates)}</p>
            </div>
          </div>

          <div className="address-divider">
            <div className="divider-line"></div>
            <div className="divider-icon">↓</div>
            <div className="divider-line"></div>
          </div>

          <div className="address-section">
            <div className="address-icon">🎯</div>
            <div className="address-content">
              <h4>Delivery Location</h4>
              <p>{order?.customerSnapshot?.fullAddress?.trim() ? order.customerSnapshot.fullAddress : deliveryLocation}</p>
              <p>Coords: {formatCoordinates(order.delivery?.dropCoordinates)}</p>
            </div>
          </div>
        </div>

        {/* TRANSPORT INFO */}
        <div className="transport-card">
          <h3 className="section-heading">Transport Details</h3>
          <div className="transport-info">
            <div className="transport-row">
              <div className="transport-icon">🚚</div>
              <div className="transport-details">
                <h4>{dealerName}</h4>
                <p>Vehicle: <span className="vehicle-badge">{vehicleType}</span></p>
                <p>Distance: <strong>{Number.isFinite(routeDistance) ? `${routeDistance} km` : "N/A"}</strong></p>
                <p>Source: <strong>{distanceSource}</strong></p>
                <p>Base Delivery: ₹{transportBaseFee.toLocaleString()}</p>
                <p style={{ color: "#2e7d32" }}>Batch Discount: -₹{batchDiscount.toLocaleString()}</p>
                <p>Final Delivery Charge: ₹{transportFinalFee.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => navigate("/orders")}>
            View All Orders
          </button>
          <button className="action-btn secondary" onClick={() => navigate("/support")}>
            📞 Contact Support
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
