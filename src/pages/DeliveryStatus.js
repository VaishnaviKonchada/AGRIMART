import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet } from "../utils/api";
import "../styles/DeliveryStatus.css";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";

export default function DeliveryStatus() {
  const { orderId: orderIdParam } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const deliverySteps = [
    { 
      id: "Confirmed", 
      label: t('deliveryStatus.orderPlaced'),
      icon: "🛒",
      description: t('deliveryStatus.orderPlacedDesc')
    },
    { 
      id: "Confirmed", 
      label: t('deliveryStatus.processing'),
      icon: "⚙️",
      description: t('deliveryStatus.processingDesc')
    },
    { 
      id: "Picked Up", 
      label: t('deliveryStatus.shipped'),
      icon: "📦",
      description: t('deliveryStatus.shippedDesc')
    },
    { 
      id: "In Transit", 
      label: t('deliveryStatus.inTransit'),
      icon: "🚚",
      description: t('deliveryStatus.inTransitDesc')
    },
    { 
      id: "Delivered", 
      label: t('deliveryStatus.delivered'),
      icon: "🎯",
      description: t('deliveryStatus.deliveredDesc')
    },
  ];

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orders = await apiGet('orders');
        if (Array.isArray(orders)) {
          const decodedId = String(decodeURIComponent(orderIdParam)).trim();
          const found = orders.find((o) => 
            String(o.orderId || '').trim() === decodedId || 
            String(o._id || '').trim() === decodedId ||
            String(o.id || '').trim() === decodedId
          );
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
      <div className="delivery-status-container loading">
        <div className="loader-wrapper">
          <div className="agrimart-loader"></div>
          <p>{t('deliveryStatus.trackingOrder')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="delivery-status-container">
        <div className="not-found-card">
          <div className="not-found-icon">🔍</div>
          <h2>{t('deliveryStatus.orderNotFound')}</h2>
          <p>{t('deliveryStatus.orderNotFoundDesc')}</p>
          <div className="id-badge">{decodeURIComponent(orderIdParam)}</div>
          <button 
            className="back-to-orders-btn"
            onClick={() => navigate("/orders")}
          >
            ← {t('deliveryStatus.backToOrders')}
          </button>
        </div>
      </div>
    );
  }

  // Map backend status to our granular tracking steps
  const getActiveStepIndex = () => {
    const status = order.status;
    if (status === "Delivered") return 4;
    if (status === "In Transit") return 3;
    if (status === "Picked Up") return 2;
    if (status === "Confirmed") return 1; // "Processing"
    return 0; // "Order Placed"
  };

  const currentStepIndex = getActiveStepIndex();
  const isDelivered = order.status === "Delivered";
  const isCancelled = order.status === "Cancelled";

  // Date Formatting
  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedOrderDate = orderDate.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Estimated Arrival Logic
  const estArrival = new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000);
  const formattedArrival = estArrival.toLocaleDateString('en-IN', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long'
  });

  const orderId = order.orderId || order.id || order._id;
  
  // Calculate component values cleanly
  const itemsSubtotalVal = Number(order.summary?.itemsTotal || order.itemsTotal || (order.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.pricePerKg || 0)), 0));
  const deliveryFeeVal = Number(order.summary?.transportFinalFee || order.summary?.transportFee || order.transport?.price || 0);
  const total = Number(order.summary?.total || order.total || 0);
  const platformFeeVal = Number(order.summary?.platformFee || order.summary?.platformContribution || Math.max(0, total - itemsSubtotalVal - deliveryFeeVal));

  const farmerLocation = order.delivery?.pickup || order.farmer?.location || "Not specified";
  const deliveryLocation = order.delivery?.drop || order.delivery?.location || "Not specified";
  const dealerName = order.dealerName || order.transport?.dealerName || "Assigned Dealer";
  const vehicleType = order.transport?.vehicle || "Transport Vehicle";
  return (
    <div className="delivery-status-container">
      <CustomerHeader />

      <div className="delivery-content">
        {/* HEADER SECTION */}
        <div className="tracking-header">
           <div className="header-top">
              <button className="back-link" onClick={() => navigate("/orders")}>← {t('deliveryStatus.back')}</button>
              <span className="order-tag">{t('deliveryStatus.orderHash')}{orderId}</span>
           </div>
           <div className="header-main">
              <h1>{isDelivered ? t('deliveryStatus.successfullyDelivered') : isCancelled ? t('deliveryStatus.orderCancelled') : t('deliveryStatus.arrivingBy') + " " + estArrival.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}</h1>
              <p className="status-subtext">
                {isDelivered 
                  ? `${t('deliveryStatus.deliveredOn')} ${new Date().toLocaleDateString()}` 
                  : `${t('deliveryStatus.deliveryOnTrack')} ${order.status}`}
              </p>
           </div>
        </div>

        {/* MODERN TRACKER */}
        {!isCancelled && (
          <div className="tracker-card">
            <div className="tracker-steps-container">
              {deliverySteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isProcessing = index === currentStepIndex;
                const isFuture = index > currentStepIndex;
                
                return (
                  <div key={index} className={`step-item ${isCompleted ? 'completed' : ''} ${isProcessing ? 'processing' : ''} ${isFuture ? 'future' : ''}`}>
                    <div className="step-point">
                      <div className="point-circle">
                         {isCompleted ? "✓" : step.icon}
                      </div>
                      {index < deliverySteps.length - 1 && (
                        <div className="step-line">
                           <div className="line-fill" style={{ width: isCompleted ? '100%' : '0%' }}></div>
                        </div>
                      )}
                    </div>
                    <div className="step-info">
                      <span className="step-label">{step.label}</span>
                      {isProcessing && <span className="step-time">{t('deliveryStatus.updateJustNow')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUICK DETAILS GRID */}
        <div className="details-grid">
          <div className="info-card map-card">
             <div className="card-icon">📍</div>
             <div className="card-details">
                <h4>{t('deliveryStatus.deliveryAddress')}</h4>
                <p className="primary-text">{order?.customerSnapshot?.fullAddress || deliveryLocation}</p>
                <p className="secondary-text">{order?.customerSnapshot?.phone || order.customerPhone || t('deliveryStatus.contactAttached')}</p>
             </div>
          </div>

          <div className="info-card shipment-card">
             <div className="card-icon">🚚</div>
             <div className="card-details">
                <h4>{t('deliveryStatus.shipmentInfo')}</h4>
                <p className="primary-text">{dealerName}</p>
                <p className="secondary-text">{vehicleType} • {t('deliveryStatus.expectedSoon')}</p>
             </div>
          </div>
        </div>

        {/* ORDER SUMMARY PREVIEW */}
        <div className="summary-card">
           <div className="summary-header">
              <h3>{t('deliveryStatus.orderSummary')}</h3>
              <span className="date-tag">{formattedOrderDate}</span>
           </div>
           <div className="items-preview">
              {order.items.slice(0, 2).map((item, i) => (
                <div key={i} className="preview-row">
                   <div className="item-thumb">🌾</div>
                   <div className="item-meta">
                      <span className="name">{item.cropName || item.name}</span>
                      <span className="qty">{item.quantity} kg</span>
                   </div>
                   <span className="price">₹{(item.quantity * item.pricePerKg).toLocaleString()}</span>
                </div>
              ))}
              {order.items.length > 2 && <p className="more-items">+ {order.items.length - 2} {t('deliveryStatus.moreItems')}</p>}
           </div>
           <div className="summary-footer">
              <div className="footer-row">
                 <span>{t('deliveryStatus.itemsSubtotal')}</span>
                 <span>₹{itemsSubtotalVal.toLocaleString()}</span>
              </div>
              <div className="footer-row">
                 <span>{t('deliveryStatus.deliveryFee')}</span>
                 <span>₹{deliveryFeeVal.toLocaleString()}</span>
              </div>
              {platformFeeVal > 0 && (
                <div className="footer-row">
                   <span>{t('deliveryStatus.platformFee')}</span>
                   <span>₹{platformFeeVal.toLocaleString()}</span>
                </div>
              )}
              <div className="footer-row total">
                 <span>{t('deliveryStatus.totalPaid')}</span>
                 <span>₹{total.toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="action-row">
          <button className="secondary-btn" onClick={() => navigate("/orders")}>
             {t('deliveryStatus.trackAnotherOrder')}
          </button>
          <button className="primary-btn" onClick={() => navigate("/home")}>
             {t('deliveryStatus.continueShopping')}
          </button>
        </div>

        <div className="support-section">
           <p>{t('deliveryStatus.needHelp')} <button onClick={() => navigate("/support")}>{t('deliveryStatus.contactSupport')}</button></p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
