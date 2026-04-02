import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet } from "../utils/api";
import SessionManager from "../utils/SessionManager";
import { readCartItems, writeCartItems } from "../utils/cartStorage";
import "../styles/MyOrders.css";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";
import noOrdersImg from "../assets/no-orders.png";

export default function MyOrders() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderNotice, setOrderNotice] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  const hasText = (value) => typeof value === "string" && value.trim().length > 0;

  const formatOrderLocation = (delivery = {}, type = "pickup") => {
    const isPickup = type === "pickup";
    const primary = isPickup ? delivery?.pickup : delivery?.drop;
    const mandal = isPickup ? delivery?.pickupMandal : delivery?.dropMandal;
    const district = isPickup ? delivery?.pickupDistrict : delivery?.dropDistrict;

    if (hasText(primary)) return primary.trim();

    const parts = [mandal, district]
      .map((part) => String(part || "").trim())
      .filter(Boolean);

    return parts.length ? parts.join(", ") : t('notSet', 'Not specified');
  };

  const formatCompleteDeliveryAddress = (order = {}) => {
    const snapshot = order?.customerSnapshot || {};
    return snapshot.fullAddress && String(snapshot.fullAddress).trim().length > 0 ? String(snapshot.fullAddress).trim() : "";
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

  useEffect(() => {
    const noticeRaw = localStorage.getItem("orderPlacedNotification");
    if (noticeRaw) {
      try {
        const notice = JSON.parse(noticeRaw);
        setOrderNotice(notice);
      } catch (err) {
        console.warn("Failed to parse orderPlacedNotification", err);
      } finally {
        localStorage.removeItem("orderPlacedNotification");
      }
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const session = SessionManager.getSession();
        const activeUserId = String(session?.user?.id || session?.user?._id || "").trim();
        const activeRole = String(session?.role || session?.user?.role || "").toLowerCase().trim();
        
        if (!token || !activeUserId || activeRole !== "customer") {
          setOrders([]);
          setLoading(false);
          return;
        }

        const ordersData = await apiGet("orders");
        const safeOrders = Array.isArray(ordersData) ? ordersData : [];

        const scopedOrders = safeOrders.filter((order) => {
          const orderCustomerId = String(order?.customerId?._id || order?.customerId || "").trim();
          return orderCustomerId === activeUserId;
        });

        setOrders(scopedOrders);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const renderFullOrderDetailsModal = () => {
    if (!selectedOrderDetails) return null;
    const order = selectedOrderDetails;

    return (
      <div className="order-modal-overlay" onClick={() => setSelectedOrderDetails(null)}>
        <div className="order-modal-content" onClick={e => e.stopPropagation()}>
          <div className="order-modal-header">
            <h2>📄 {t('myOrders.orderDetails', 'Order Details')}</h2>
            <button className="close-modal-btn" onClick={() => setSelectedOrderDetails(null)}>✕</button>
          </div>
          
          <div className="order-modal-body">
            <div className="modal-section">
              <div className="modal-section-title">🆔 {t('myOrders.orderId', 'Order ID')}</div>
              <div className="info-value info-value-mono">{order.orderId}</div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🔗 {t('common.ids', 'System Identifiers')}</div>
              <div className="details-info-grid">
                <div className="info-item">
                  <span className="info-label">{t('orders.farmerId', 'Farmer ID')}</span>
                  <span className="info-value info-value-mono">{order.farmerId?._id || order.farmerId}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('orders.customerId', 'Customer ID')}</span>
                  <span className="info-value info-value-mono">{order.customerId?._id || order.customerId}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('orders.dealerId', 'Dealer ID')}</span>
                  <span className="info-value info-value-mono">{order.dealerId?._id || order.dealerId}</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">👨‍🌾 {t('myOrders.farmerInfo', 'Farmer Information')}</div>
              <div className="details-info-grid">
                <div className="info-item">
                  <span className="info-label">{t('orders.name', 'Name')}</span>
                  <span className="info-value">{order.farmerId?.name || t('common.unknown', 'Unknown')}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('myOrders.farmerEmail', 'Farmer Email')}</span>
                  <span className="info-value">{order.farmerId?.email || t('notSet', 'Not set')}</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🚛 {t('myOrders.transportInfo', 'Transport Info')}</div>
              <div className="details-info-grid">
                <div className="info-item">
                  <span className="info-label">{t('orders.name', 'Dealer Name')}</span>
                  <span className="info-value">{order.dealerId?.name || t('common.unknown', 'Unknown')}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('myOrders.dealerPhone', 'Dealer Phone')}</span>
                  <span className="info-value">{order.dealerId?.profile?.phone || t('notSet', 'Not set')}</span>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">📍 {t('orders.dropAddress', 'Drop Address')}</div>
              <div className="info-value">
                {order.customerSnapshot?.fullAddress || 
                 t('notSet', 'Not set')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const deleteOrder = async (orderId, e) => {
    e.stopPropagation();
    if (window.confirm(t('myOrders.deleteConfirm', "Are you sure you want to delete this order?"))) {
      const updatedOrders = orders.filter((order) => (order.orderId || order.id || order._id) !== orderId);
      setOrders(updatedOrders);
    }
  };

  const handleReorder = (order, e) => {
    e.stopPropagation();
    const currentCart = readCartItems();
    const updatedCart = [...currentCart];
    
    order.items.forEach(item => {
      const existingIndex = updatedCart.findIndex(
        cartItem => cartItem.cropName === item.cropName && cartItem.farmerId === order.farmerId
      );
      
      if (existingIndex >= 0) {
        updatedCart[existingIndex].quantity += item.quantity;
      } else {
        updatedCart.push({
          cropName: item.cropName || item.name,
          variety: item.variety || "Standard",
          pricePerKg: item.pricePerKg,
          quantity: item.quantity,
          farmerId: order.farmerId,
          farmerName: order.farmerName,
          cropId: item.cropId,
          farmerLocation: formatOrderLocation(order.delivery, "pickup") || item.farmerLocation,
        });
      }
    });
    
    writeCartItems(updatedCart);
    navigate("/cart");
  };

  const handleContactSupport = (e) => {
    e.stopPropagation();
    navigate("/support");
  };

  const filterOrders = (ordersList) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    switch (filterType) {
      case "recent":
        return ordersList.filter((order) => new Date(order.createdAt).getTime() >= sevenDaysAgo);
      case "past":
        return ordersList.filter((order) => new Date(order.createdAt).getTime() < sevenDaysAgo);
      case "pending":
        return ordersList.filter((order) => order.status !== "Delivered" && order.status !== "Cancelled");
      default:
        return ordersList;
    }
  };

  const filteredOrders = filterOrders(orders);

  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmed": return "status-confirmed";
      case "In Transit": return "status-transit";
      case "Delivered": return "status-delivered";
      case "Cancelled": return "status-cancelled";
      default: return "status-pending";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Confirmed": return "✓";
      case "In Transit": return "🚚";
      case "Delivered": return "📦";
      case "Cancelled": return "✕";
      default: return "⏳";
    }
  };

  return (
    <div className="myorders-container">
      <CustomerHeader />
      
      {orderNotice && (
        <div className="order-placed-notice">
          <span className="notice-icon">✨</span>
          <div className="notice-text">
            {t('payment.orderConfirmed', 'Order placed successfully')}: <strong>#{orderNotice.orderId}</strong>
          </div>
        </div>
      )}

      <div className="orders-header">
        <div className="header-content">
          <h1>{t('myOrders.title', 'My Orders')}</h1>
          <p className="subtitle">{t('myOrders.subtitle', 'Track and manage all your orders')}</p>
        </div>
      </div>

      {orders.length > 0 && !loading && (
        <div className="orders-summary">
          <div className="summary-card">
            <div className="summary-stat">
              <span className="stat-icon">📦</span>
              <div className="stat-content">
                <span className="stat-label">{t('customerAccount.totalOrders', 'Total Orders')}</span>
                <span className="stat-value">{orders.length}</span>
              </div>
            </div>
            <div className="summary-stat">
              <span className="stat-icon">💰</span>
              <div className="stat-content">
                <span className="stat-label">{t('myOrders.totalSpent', 'Total Spent')}</span>
                <span className="stat-value">
                  ₹{orders.reduce((sum, o) => sum + (o.summary?.total || o.total || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="summary-stat">
              <span className="stat-icon">✅</span>
              <div className="stat-content">
                <span className="stat-label">{t('myOrders.completed', 'Completed')}</span>
                <span className="stat-value">
                  {orders.filter((o) => o.status === "Delivered").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="filter-tabs-container">
          <div className="filter-tabs">
            <button className={`filter-tab ${filterType === "all" ? "active" : ""}`} onClick={() => setFilterType("all")}>
              <span>{t('myOrders.allOrders', 'All')}</span>
              <span className="tab-count">{orders.length}</span>
            </button>
            <button className={`filter-tab ${filterType === "recent" ? "active" : ""}`} onClick={() => setFilterType("recent")}>
              <span>{t('myOrders.recent', 'Recent')}</span>
              <span className="tab-count">{orders.filter(o => new Date(o.createdAt).getTime() >= (Date.now() - 7*24*60*60*1000)).length}</span>
            </button>
            <button className={`filter-tab ${filterType === "pending" ? "active" : ""}`} onClick={() => setFilterType("pending")}>
              <span>{t('myOrders.pending', 'Pending')}</span>
              <span className="tab-count">{orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").length}</span>
            </button>
          </div>
        </div>
      )}

      <div className="orders-content">
        {loading ? (
          <div className="empty-state">
            <div className="loader"></div>
            <h2>{t('myOrders.loadingOrders', 'Loading Orders...')}</h2>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="orders-list">
            {filteredOrders.map((order) => {
              const orderId = order.orderId || order.id || order._id;
              const itemsTotal = order.summary?.itemsTotal || 0;
              const transportFinalFee = order.summary?.transportFinalFee || 0;
              const platformFee = order.summary?.platformFee || 0;
              const total = order.summary?.total || (itemsTotal + transportFinalFee + platformFee);

              return (
                <div key={orderId} className={`order-card ${expandedOrderId === orderId ? "expanded" : ""}`}>
                  <div className="order-header-row" onClick={() => toggleOrderExpand(orderId)}>
                    <div className="order-id-section">
                      <span className="order-id">#{String(orderId).slice(-8).toUpperCase()}</span>
                      <span className="order-date">{new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <div className="order-parties-inline">
                        <span>👨‍🌾 {order.farmerName || "Farmer"}</span>
                        <span>•</span>
                        <span>🚚 {order.dealerName || order.transport?.dealerName || "Transport"}</span>
                      </div>
                    </div>

                    <div className="order-status-section">
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)} {order.status}
                      </span>
                    </div>

                    <div className="order-price-section">
                      <span className="total-amount">₹{total.toLocaleString()}</span>
                      <span className="amount-breakup">{order.items?.length || 0} items</span>
                    </div>

                    <div className="expand-icon">⌄</div>
                  </div>

                  {expandedOrderId === orderId && (
                    <div className="order-details-expanded">
                      <div className="detail-section">
                        <h4 className="section-title">🛒 {t('myOrders.itemsOrdered', 'Items')}</h4>
                        <div className="items-grid">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="item-detail-card">
                              <div>
                                <div className="item-detail-name">{item.cropName}</div>
                                <div className="item-detail-qty">{item.quantity} kg × ₹{item.pricePerKg}</div>
                              </div>
                              <div className="item-detail-price">₹{(item.quantity * item.pricePerKg).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="detail-section">
                        <h4 className="section-title">💰 {t('myOrders.priceSummary', 'Summary')}</h4>
                        <div className="price-summary-grid">
                          <div className="summary-row">
                            <span className="summary-label">{t('myOrders.itemsTotal', 'Items Total')}</span>
                            <span className="summary-value">₹{itemsTotal.toLocaleString()}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">{t('myOrders.finalDeliveryCharge', 'Delivery')}</span>
                            <span className="summary-value">₹{transportFinalFee.toLocaleString()}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">{t('myOrders.platformFee', 'Platform Fee')}</span>
                            <span className="summary-value">₹{platformFee.toLocaleString()}</span>
                          </div>
                          <div className="summary-row total-summary-row">
                            <span className="summary-label">{t('myOrders.totalPaid', 'Total')}</span>
                            <span className="total-summary-value">₹{total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="detail-actions">
                        <button className="full-details-btn" onClick={() => setSelectedOrderDetails(order)}>
                          📄 {t('myOrders.viewFullOrderDetails', 'Full Details')}
                        </button>
                        <button className="support-btn" onClick={handleContactSupport}>
                          💬 {t('myOrders.contactSupport', 'Support')}
                        </button>
                        <button className="reorder-btn" onClick={(e) => handleReorder(order, e)}>
                          🔄 {t('myOrders.reorder', 'Reorder')}
                        </button>
                        <button className="delivery-btn" onClick={() => navigate(`/delivery-status/${order._id}`)}>
                          🚚 {t('myOrders.deliveryStatus', 'Status')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <img src={noOrdersImg} alt="No Orders" className="empty-state-img" />
            <h2>{t('myOrders.noOrdersYet', 'No Orders Yet')}</h2>
            <p>{t('myOrders.startShoppingMsg', 'Start fresh! Your next meal is just a click away.')}</p>
            <button className="start-shopping-btn" onClick={() => navigate("/")}>
              {t('myOrders.startShoppingBtn', 'Shop Now')}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
      {renderFullOrderDetailsModal()}
    </div>
  );
}
