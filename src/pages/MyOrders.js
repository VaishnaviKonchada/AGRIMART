import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet } from "../utils/api";
import SessionManager from "../utils/SessionManager";
import { readCartItems, writeCartItems } from "../utils/cartStorage";
import "../styles/MyOrders.css";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";

export default function MyOrders() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderNotice, setOrderNotice] = useState(null);

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
    // Only show fullAddress if present
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

  // Fetch customer orders from backend
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
          console.warn("No access token found");
          setOrders([]);
          setLoading(false);
          return;
        }

        const ordersData = await apiGet("orders");
        const safeOrders = Array.isArray(ordersData) ? ordersData : [];

        // Defense-in-depth: keep only the active customer's orders in UI state.
        const scopedOrders = safeOrders.filter((order) => {
          const orderCustomerId = String(order?.customerId?._id || order?.customerId || "").trim();
          return orderCustomerId === activeUserId;
        });

        if (scopedOrders.length !== safeOrders.length) {
          console.warn("Filtered out non-owned orders from customer view", {
            received: safeOrders.length,
            kept: scopedOrders.length,
          });
        }

        console.log('✅ Fetched customer orders:', scopedOrders.length);
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

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const deleteOrder = async (orderId, e) => {
    e.stopPropagation();
    if (window.confirm(t('myOrders.deleteConfirm', "Are you sure you want to delete this order?"))) {
      // Remove from UI immediately
      const updatedOrders = orders.filter((order) => (order.orderId || order.id) !== orderId);
      setOrders(updatedOrders);
      
      // Note: In production, you would call a DELETE API endpoint here
      // For now, just update local state
      console.log('Order deleted from view:', orderId);
    }
  };

  const handleReorder = (order, e) => {
    e.stopPropagation();
    
    // Get current cart
    const currentCart = readCartItems();
    
    // Add all items from the order to cart
    const updatedCart = [...currentCart];
    
    order.items.forEach(item => {
      // Check if item already exists in cart
      const existingIndex = updatedCart.findIndex(
        cartItem => cartItem.cropName === item.cropName && cartItem.farmerId === order.farmerId
      );
      
      if (existingIndex >= 0) {
        // Update quantity if item exists
        updatedCart[existingIndex].quantity += item.quantity;
      } else {
        // Add new item
        updatedCart.push({
          cropName: item.cropName || item.name,
          variety: item.variety || "Standard",
          pricePerKg: item.pricePerKg,
          quantity: item.quantity,
          farmerId: order.farmerId,
          farmerName: order.farmerName,
          farmerLocation: formatOrderLocation(order.delivery, "pickup") || item.farmerLocation,
        });
      }
    });
    
    // Save updated cart
    writeCartItems(updatedCart);
    
    // Store the preferred dealer if available
    if (order.transport) {
      localStorage.setItem("preferredDealer", JSON.stringify({
        id: order.dealerId,
        name: order.dealerName || order.transport.dealerName,
        vehicle: order.transport.vehicle,
        price: order.transport.price,
      }));
    }
    
    // Show success message
    alert(t('myOrders.reorderSuccess', { 
      defaultValue: `✓ {{count}} item(s) added to cart!{{dealerMsg}}`, 
      count: order.items.length,
      dealerMsg: order.dealerName ? `\n\n${t('myOrders.dealerPreselected', 'Your previous transport dealer "{{name}}" will be preselected.', { name: order.dealerName })}` : ''
    }));
    
    // Navigate to cart
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
        // Orders from last 7 days
        return ordersList.filter((order) => {
          const timestamp = new Date(order.createdAt).getTime();
          return timestamp >= sevenDaysAgo;
        });
      case "past":
        // Orders older than 7 days
        return ordersList.filter((order) => {
          const timestamp = new Date(order.createdAt).getTime();
          return timestamp < sevenDaysAgo;
        });
      case "pending":
        // Orders not delivered or cancelled
        return ordersList.filter(
          (order) => order.status !== "Delivered" && order.status !== "Cancelled"
        );
      default:
        return ordersList;
    }
  };

  const getRecentOrdersCount = (ordersList) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return ordersList.filter((order) => {
      const timestamp = new Date(order.createdAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;
  };

  const getPastOrdersCount = (ordersList) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return ordersList.filter((order) => {
      const timestamp = new Date(order.createdAt).getTime();
      return Number.isFinite(timestamp) && timestamp < sevenDaysAgo;
    }).length;
  };

  const filteredOrders = filterOrders(orders);

  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmed":
        return "status-confirmed";
      case "In Transit":
        return "status-transit";
      case "Delivered":
        return "status-delivered";
      case "Cancelled":
        return "status-cancelled";
      default:
        return "status-pending";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Confirmed":
        return "✓";
      case "In Transit":
        return "🚚";
      case "Delivered":
        return "📦";
      case "Cancelled":
        return "✕";
      default:
        return "⏳";
    }
  };

  return (
    <div className="myorders-container">
      <CustomerHeader />
      {orderNotice ? (
        <div className="order-placed-notice">
          ✅ {t('payment.orderConfirmed', 'Order placed successfully')}: <strong>{orderNotice.orderId}</strong>
          {orderNotice.cropName ? ` (${orderNotice.cropName})` : ""}
        </div>
      ) : null}

      {/* HEADER */}
      <div className="orders-header">
        <div className="header-content">
          <h1>📦 {t('myOrders.title', 'My Orders')}</h1>
          <p className="subtitle">{t('myOrders.subtitle', 'Track and manage all your orders')}</p>
        </div>
      </div>

      {/* FILTER TABS */}
      {orders.length > 0 && (
        <div className="filter-tabs-container">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              <span className="tab-icon">📋</span>
              <span className="tab-label">{t('myOrders.allOrders', 'All Orders')}</span>
              <span className="tab-count">{orders.length}</span>
            </button>
            <button
              className={`filter-tab ${filterType === "recent" ? "active" : ""}`}
              onClick={() => setFilterType("recent")}
            >
              <span className="tab-icon">🕐</span>
              <span className="tab-label">{t('myOrders.recent', 'Recent')}</span>
              <span className="tab-count">
                {getRecentOrdersCount(orders)}
              </span>
            </button>
            <button
              className={`filter-tab ${filterType === "past" ? "active" : ""}`}
              onClick={() => setFilterType("past")}
            >
              <span className="tab-icon">📅</span>
              <span className="tab-label">{t('myOrders.pastOrders', 'Past Orders')}</span>
              <span className="tab-count">
                {getPastOrdersCount(orders)}
              </span>
            </button>
            <button
              className={`filter-tab ${filterType === "pending" ? "active" : ""}`}
              onClick={() => setFilterType("pending")}
            >
              <span className="tab-icon">⏳</span>
              <span className="tab-label">{t('myOrders.pending', 'Pending')}</span>
              <span className="tab-count">
                {orders.filter((order) => order.status !== "Delivered" && order.status !== "Cancelled").length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ORDERS LIST */}
      <div className="orders-content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h2>{t('myOrders.loadingOrders', 'Loading Orders...')}</h2>
            <p>{t('myOrders.pleaseWait', 'Please wait while we fetch your orders.')}</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="orders-list">
            {filteredOrders.map((order) => {
              const orderId = order.orderId || order.id || order._id;
              const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
              const itemsTotal = order.summary?.itemsTotal || order.itemsTotal || 0;
              // Always use backend-confirmed values for delivery charge and discount
              const transportFinalFee = order.summary?.transportFinalFee ?? order.summary?.transportFee ?? order.transportFee ?? 0;
              const transportBaseFee = order.summary?.transportBaseFee ?? transportFinalFee;
              const batchDiscount = order.summary?.batchDiscount ?? Math.max(transportBaseFee - transportFinalFee, 0);
              const dealerPayout = order.summary?.dealerPayout || transportFinalFee;
              const platformContribution = order.summary?.platformContribution || Math.max(dealerPayout - transportFinalFee, 0);
              const routeDistance = Number(order.delivery?.distance);
              const distanceSource = hasCoordinates(order.delivery?.pickupCoordinates) && hasCoordinates(order.delivery?.dropCoordinates)
                ? "Exact GPS"
                : "Fallback area";
              const platformFee = order.summary?.platformFee || order.platformFee || 0;
              const total = order.summary?.total ?? order.total ?? (itemsTotal + transportFinalFee + platformFee);
              const farmerName = order.farmerName || order.items?.[0]?.farmerName || "Unknown Farmer";
              const farmerId = order.farmerId?._id || order.farmerId || "N/A";
              const customerId = order.customerId?._id || order.customerId || "N/A";
              const dealerName = order.dealerName || order.transport?.dealerName || "N/A";
              const dealerId = order.dealerId?._id || order.dealerId || order.transport?.dealerId || "N/A";
              const dealerPhone =
                order.dealerId?.profile?.phone ||
                order.transport?.dealerPhone ||
                order.dealerPhone ||
                "Not available yet";

              return (
              <div
                key={orderId}
                className={`order-card ${
                  expandedOrderId === orderId ? "expanded" : ""
                }`}
              >
                {/* ORDER HEADER - ALWAYS VISIBLE */}
                <div
                  className="order-header-row"
                  onClick={() => toggleOrderExpand(orderId)}
                >
                  <div className="order-id-section">
                    <span className="order-id">{orderId}</span>
                    <span className="order-date">
                      📅 {orderDate}
                    </span>
                    <span className="order-parties-inline">
                      👨‍🌾 {farmerName} | 🚚 {dealerName}
                    </span>
                  </div>

                  <div className="order-status-section">
                    <span
                      className={`status-badge ${getStatusColor(order.status)}`}
                    >
                      <span className="status-icon">{getStatusIcon(order.status)}</span>
                      {order.status}
                    </span>
                  </div>

                  <div className="order-price-section">
                    <div className="amount-stack">
                      <span className="total-amount">
                        ₹{total.toLocaleString()}
                      </span>
                      <span className="amount-breakup">
                        ₹{itemsTotal.toLocaleString()} + ₹{transportFinalFee.toLocaleString()} + ₹{platformFee.toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="delete-order-btn"
                      onClick={(e) => deleteOrder(orderId, e)}
                      title="Delete Order"
                    >
                      🗑️
                    </button>
                    <span className="expand-icon">
                      {expandedOrderId === orderId ? "▼" : "▶"}
                    </span>
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {expandedOrderId === orderId && (
                  <div className="order-details-expanded">
                    {/* FARMER SECTION */}
                    <div className="detail-section farmer-detail">
                      <h4 className="section-title">👨‍🌾 {t('myOrders.farmerInfo', 'Farmer Information')}</h4>
                      <div className="farmer-grid">
                        <div className="farmer-info-item">
                          <span className="label">{t('orders.customerId', 'Customer ID')}</span>
                          <span className="value">{String(customerId)}</span>
                        </div>
                        <div className="farmer-info-item">
                          <span className="label">{t('orders.name', 'Farmer Name')}</span>
                          <span className="value">{farmerName}</span>
                        </div>
                        <div className="farmer-info-item">
                          <span className="label">{t('orders.farmerId', 'Farmer ID')}</span>
                          <span className="value">{String(farmerId)}</span>
                        </div>
                        <div className="farmer-info-item">
                          <span className="label">{t('orders.dropAddress', 'Pickup Location')}</span>
                          <span className="value">{formatOrderLocation(order.delivery, "pickup")}</span>
                        </div>
                        <div className="farmer-info-item">
                          <span className="label">{t('customerAccount.fullLocation', 'Full Delivery Address')}</span>
                          <span className="value full-address">{formatCompleteDeliveryAddress(order) || t('notSet', "Not specified")}</span>
                        </div>
                        <div className="farmer-info-item">
                          <span className="label">{t('customerAccount.addressCoords', 'Pickup Coordinates')}</span>
                          <span className="value">{formatCoordinates(order.delivery?.pickupCoordinates)}</span>
                        </div>
                        <div className="farmer-info-item">
                          <span className="label">{t('customerAccount.addressCoords', 'Drop Coordinates')}</span>
                          <span className="value">{formatCoordinates(order.delivery?.dropCoordinates)}</span>
                        </div>
                      </div>
                    </div>

                    {/* ITEMS SECTION */}
                    <div className="detail-section items-detail">
                      <h4 className="section-title">🛒 {t('myOrders.itemsOrdered', 'Items Ordered')}</h4>
                      <div className="items-grid">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="item-detail-card">
                            <div className="item-detail-name">{item.cropName || item.name}</div>
                            <div className="item-detail-qty">
                              {item.quantity} kg @ {t('cart.farmerSellingPrice', 'farmer selling price')} ₹{item.pricePerKg}/kg
                            </div>
                            <div className="item-detail-price">
                              ₹{(item.pricePerKg * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TRANSPORT SECTION */}
                    <div className="detail-section transport-detail">
                      <h4 className="section-title">🚚 {t('myOrders.transportInfo', 'Transport Info')}</h4>
                      <div className="transport-grid">
                        <div className="transport-info-item">
                          <span className="label">{t('orders.name', 'Dealer')}</span>
                          <span className="value">{dealerName}</span>
                        </div>
                        <div className="transport-info-item">
                          <span className="label">{t('orders.dealerId', 'Dealer ID')}</span>
                          <span className="value">{String(dealerId)}</span>
                        </div>
                        <div className="transport-info-item">
                          <span className="label">{t('orders.contact', 'Dealer Contact Number')}</span>
                          <span className="value">{dealerPhone}</span>
                        </div>
                        <div className="transport-info-item">
                          <span className="label">{t('transportDealers.vehicle', 'Vehicle')}</span>
                          <span className="value badge">
                            {order.transport?.vehicle || t('notSet', "N/A")}
                          </span>
                        </div>
                        <div className="transport-info-item">
                          <span className="label">{t('myOrders.finalDeliveryCharge', 'Transport Fee')}</span>
                          <span className="value">
                            ₹{transportFinalFee.toLocaleString()}
                          </span>
                        </div>
                        <div className="transport-info-item">
                          <span className="label">{t('transportDealers.distance', 'Door-to-door Distance')}</span>
                          <span className="value">{Number.isFinite(routeDistance) ? `${routeDistance} km` : t('notSet', "N/A")}</span>
                        </div>
                        <div className="transport-info-item">
                          <span className="label">{t('myOrders.distanceSource', 'Distance Source')}</span>
                          <span className="value">{distanceSource}</span>
                        </div>
                      </div>
                    </div>

                    {/* PRICE BREAKDOWN */}
                    <div className="detail-section price-breakdown-detail">
                      <h4 className="section-title">💰 {t('myOrders.priceSummary', 'Price Summary')}</h4>
                      <div className="price-summary-grid">
                        <div className="summary-row">
                          <span className="summary-label">{t('myOrders.itemsTotal', 'Items Total')}</span>
                          <span className="summary-value">
                            ₹{itemsTotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">{t('myOrders.baseDelivery', 'Base Delivery')}</span>
                          <span className="summary-value">
                            ₹{transportBaseFee.toLocaleString()}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">{t('myOrders.batchDiscount', 'Batch Discount')}</span>
                          <span className="summary-value" style={{ color: "#2e7d32" }}>
                            -₹{batchDiscount.toLocaleString()}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">{t('myOrders.finalDeliveryCharge', 'Final Delivery Charge')}</span>
                          <span className="summary-value">
                            ₹{transportFinalFee.toLocaleString()}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label" style={{ fontSize: "0.95em", color: "#1976d2" }}>
                            {t('myOrders.note', 'Note')}
                          </span>
                          <span className="summary-value" style={{ fontSize: "0.95em", color: "#1976d2" }}>
                            {t('myOrders.finalFeeNote', 'Delivery charge shown is the final backend-confirmed value after all discounts and batching. This matches the dealer and order summary.')}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">{t('transportDealers.distance', 'Delivery Distance')}</span>
                          <span className="summary-value">
                            {Number.isFinite(routeDistance) ? `${routeDistance} km` : t('notSet', "N/A")}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">{t('myOrders.platformFee', 'Platform Fee')}</span>
                          <span className="summary-value">
                            ₹{platformFee.toLocaleString()}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">{t('orders.priceFormula', 'Price Formula')}</span>
                          <span className="summary-value">
                            ₹{itemsTotal.toLocaleString()} + ₹{transportFinalFee.toLocaleString()} + ₹{platformFee.toLocaleString()}
                          </span>
                        </div>
                        <div className="summary-divider"></div>
                        <div className="summary-row total-summary-row">
                          <span className="summary-label">{t('myOrders.totalPaid', 'Total Paid')}</span>
                          <span className="total-summary-value">
                            ₹{total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="detail-actions">
                      <button
                        className="delivery-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/delivery-status/${encodeURIComponent(orderId)}`);
                        }}
                      >
                        🚚 {t('myOrders.deliveryStatus', 'Delivery Status')}
                      </button>
                      <button 
                        className="reorder-btn"
                        onClick={(e) => handleReorder(order, e)}
                      >
                        🔄 {t('myOrders.reorder', 'Reorder')}
                      </button>
                      <button 
                        className="support-btn"
                        onClick={handleContactSupport}
                      >
                        💬 {t('myOrders.contactSupport', 'Contact Support')}
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
            <div className="empty-icon">📭</div>
            <h2>{filterType === "all" ? t('myOrders.noOrdersYet', "No Orders Yet") : t('myOrders.noFilteredOrders', { type: t(`myOrders.${filterType}`, filterType) })}</h2>
            <p>
              {filterType === "all"
                ? t('myOrders.startShoppingMsg', "You haven't placed any orders yet. Start shopping now!")
                : t('myOrders.noFilteredMsg', { type: t(`myOrders.${filterType}`, filterType) })}
            </p>
            {filterType === "all" && (
              <button
                className="start-shopping-btn"
                onClick={() => navigate("/")}
              >
                🛍️ {t('myOrders.startShoppingBtn', 'Start Shopping')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* SUMMARY CARD - ONLY IF ORDERS EXIST */}
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
            <div className="summary-card-divider"></div>
            <div className="summary-stat">
              <span className="stat-icon">💰</span>
              <div className="stat-content">
                <span className="stat-label">{t('myOrders.totalSpent', 'Total Spent')}</span>
                <span className="stat-value">
                  ₹{orders.reduce((sum, o) => sum + (o.summary?.total || o.total || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="summary-card-divider"></div>
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
      <BottomNav />
    </div>
  );
}
