import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet } from "../utils/api";
import noOrdersImg from "../assets/no-orders.png";
import "../styles/FarmerOrders.css";

function FarmerOrders() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedDetails, setExpandedDetails] = useState({});

  const getStableId = (value) => {
    if (!value) return "-";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value._id || value.id || "-";
    return String(value);
  };

  const user = JSON.parse(localStorage.getItem("registeredUser") || "null");

  // Fetch farmer orders from backend
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const farmerId = user?.id || user?._id;
        
        if (!token || !farmerId) {
          console.warn(t("orders.noAccessToken", "No access token found, showing empty orders"));
          setOrders([]);
          setLoading(false);
          return;
        }

        const data = await apiGet(`orders/farmer/${farmerId}`);
        const ordersData = Array.isArray(data) ? data : data?.orders || [];
        console.log('✅ Fetched farmer orders:', ordersData.length);
        setOrders(ordersData);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [t, user?.id, user?._id]);

  const stats = useMemo(() => {
    const total = orders.length;
    const activeOrders = orders.filter((o) => !["Cancelled", "Rejected"].includes(o.status));
    const revenue = activeOrders.reduce((s, o) => {
      const itemsTotal = o.summary?.itemsTotal || o.itemsTotal || 
        (o.items?.reduce((a, i) => a + ((i.quantity || 0) * (i.pricePerKg || 0)), 0) || 0);
      return s + itemsTotal;
    }, 0);
    const pending = orders.filter((o) => o.status === "Pending").length;
    return { total, revenue, pending };
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "All") list = list.filter((o) => o.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((o) =>
        (o.orderId || o.id || "").toLowerCase().includes(q) ||
        (o.items || []).some((i) => String(i.cropName || i.name || "").toLowerCase().includes(q)) ||
        (o.customerName || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [orders, statusFilter, query]);

  const getStatusClass = (status) => String(status || "").toLowerCase().replace(/\s+/g, "-");

  const formatCustomerDropAddress = (order) => {
    const delivery = order?.delivery || {};
    const snapshot = order?.customerSnapshot || {};
    const profile = order?.customerId?.profile || {};

    const doorNo = String(delivery?.dropDoorNo || snapshot?.doorNo || profile?.doorNo || "").trim();
    const locationText = String(delivery?.dropLocationText || delivery?.drop || snapshot?.locationText || profile?.locationText || "").trim();
    const mandal = String(delivery?.dropMandal || snapshot?.mandal || profile?.mandal || "").trim();
    const district = String(delivery?.dropDistrict || snapshot?.district || profile?.district || "").trim();
    const state = String(delivery?.dropState || snapshot?.state || profile?.state || "").trim();
    const pincode = String(delivery?.dropPincode || snapshot?.pincode || profile?.pincode || "").trim();
    const country = String(delivery?.dropCountry || snapshot?.country || profile?.country || "").trim();

    const parts = [];
    if (doorNo) parts.push(`${t("farmerAccount.doorNo")}: ${doorNo}`);
    [locationText, mandal, district, state, pincode, country]
      .filter((part) => String(part || "").trim())
      .forEach((part) => {
        const normalized = String(part).trim();
        if (!parts.includes(normalized)) parts.push(normalized);
      });

    return parts.length ? parts.join(", ") : "-";
  };

  const toggleDetailSection = (orderKey, section) => {
    setExpandedDetails((prev) => {
      const current = prev[orderKey] || { customer: false, dealer: false };
      return {
        ...prev,
        [orderKey]: {
          ...current,
          [section]: !current[section],
        },
      };
    });
  };

  return (
    <div className="farmer-orders">
      <div className="orders-header">
        <div>
          <h2>📦 {t("orders.title")}</h2>
          <p className="subtitle">{t("orders.subtitle")}</p>
        </div>
        <div className="header-actions">
          <input
            className="search"
            placeholder={t("orders.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="dashboard-btn" onClick={() => navigate("/farmer-dashboard")}> 
            <span className="dash-icon">📊</span>
            <span className="dash-label">{t("orders.dashboard")}</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">{t("orders.totalOrders")}</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t("orders.cropRevenue")}</div>
          <div className="stat-value">₹{stats.revenue.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t("orders.pending")}</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
      </div>

      <div className="filters">
        {["All", "Confirmed", "Pending", "In Transit", "Delivered", "Cancelled"].map((s) => (
          <button key={s} className={`chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
            {t(`orders.status.${s.replace(/\s+/g, "").toLowerCase()}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">{t("orders.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <img src={noOrdersImg} alt="No Orders" className="empty-state-img" />
          <p>
            {orders.length === 0 
              ? t("orders.noOrdersYet")
              : t("orders.noOrdersFound")}
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {filtered.map((o) => {
            const orderKey = o._id || o.id;
            const orderItems = (o.items || []).map((item) => {
              const quantity = Number(item?.quantity || 0);
              const pricePerKg = Number(item?.pricePerKg || 0);
              const lineTotal = quantity * pricePerKg;
              return {
                name: item?.cropName || item?.name || "Crop",
                quantity,
                pricePerKg,
                lineTotal,
              };
            });

            const computedItemsTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
            const summaryItemsTotal = Number(o.summary?.itemsTotal || o.itemsTotal || 0);
            const itemsTotal = summaryItemsTotal > 0 ? summaryItemsTotal : computedItemsTotal;
            const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
            const isSingleItem = orderItems.length <= 1;
            const firstItem = orderItems[0] || { name: "Crop", quantity: 0, pricePerKg: 0 };
            const compactFormula = orderItems.length
              ? orderItems
                  .map((item) => `${item.name} (${item.quantity} x ${item.pricePerKg.toLocaleString()})`)
                  .join(" + ")
              : "-";
            const orderedProducts = orderItems.length
              ? orderItems.map((item) => `${item.name}${item.quantity ? ` (${item.quantity} kg)` : ""}`).join(", ")
              : "-";
            const priceFormula = orderItems.length
              ? `${compactFormula} = ${itemsTotal.toLocaleString()}`
              : `${itemsTotal.toLocaleString()}`;
            const customerEmail = o.customerEmail || o.customerId?.email || "-";
            const customerLocation = formatCustomerDropAddress(o);
            const dealerPhone = o.dealerId?.profile?.phone || o.dealerPhone || "-";
            const dealerEmail = o.dealerId?.email || o.dealerEmail || "-";
            const showCustomerDetails = expandedDetails[orderKey]?.customer;
            const showDealerDetails = expandedDetails[orderKey]?.dealer;
            const customerId = getStableId(o.customerId);
            const dealerId = getStableId(o.dealerId || o.transport?.dealerId);
            const farmerId = getStableId(o.farmerId);

            return (
              <div key={orderKey} className="order-card">
                <div className="order-main">
                  <div className="crop-pill">{isSingleItem ? firstItem.name : `${firstItem.name} +${orderItems.length - 1}`}</div>
                  <div className="order-id">{o.orderId || o.id || "N/A"}</div>
                  <div className={`status ${getStatusClass(o.status)}`}>
                    {t(`orders.status.${(o.status || "").replace(/\s+/g, "").toLowerCase()}`, o.status)}
                  </div>
                </div>
                <div className="order-info">
                  <div>
                    <div className="label">{t("orders.orderedProducts")}</div>
                    <div className="value address-value">{orderedProducts}</div>
                  </div>
                  <div>
                    <div className="label">{t("orders.quantity")}</div>
                    <div className="value">{totalQuantity} {t("addCrop.unitKg")}</div>
                  </div>
                  <div>
                    <div className="label">{t("orders.pricePerKg")}</div>
                    <div className="value">{isSingleItem ? `₹${firstItem.pricePerKg.toLocaleString()}` : t("common.mixed", "Mixed")}</div>
                  </div>
                  <div>
                    <div className="label">{t("orders.farmerAmount")}</div>
                    <div className="value">₹{itemsTotal.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="label">{t("orders.priceFormula")}</div>
                    <div className="value">{priceFormula}</div>
                  </div>
                  <div>
                    <div className="label">{t("orders.farmerId")}</div>
                    <div className="value">{String(farmerId)}</div>
                  </div>
                  <div>
                    <div className="label">{t("orders.created")}</div>
                    <div className="value">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="label">{t("orders.farmerReceives")}</div>
                    <div className="value">₹{itemsTotal.toLocaleString()}</div>
                  </div>
                </div>

                <div className="details-toggle-row">
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => toggleDetailSection(orderKey, "customer")}
                  >
                    {showCustomerDetails ? t("orders.hideCustomerDetails") : t("orders.viewCustomerDetails")}
                  </button>
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => toggleDetailSection(orderKey, "dealer")}
                  >
                    {showDealerDetails ? t("orders.hideDealerDetails") : t("orders.viewDealerDetails")}
                  </button>
                </div>

                {(showCustomerDetails || showDealerDetails) && (
                  <div className="details-panels">
                    {showCustomerDetails && (
                      <div className="detail-panel">
                        <div className="detail-panel-title">{t("orders.customerDetails")}</div>
                        <div className="detail-item-row"><span>{t("orders.name")}</span><strong>{o.customerName || "-"}</strong></div>
                        <div className="detail-item-row"><span>{t("orders.customerId")}</span><strong>{String(customerId)}</strong></div>
                        <div className="detail-item-row"><span>{t("orders.email")}</span><strong>{customerEmail}</strong></div>
                        <div className="detail-item-row full"><span>{t("orders.dropAddress")}</span><strong>{customerLocation}</strong></div>
                      </div>
                    )}

                    {showDealerDetails && (
                      <div className="detail-panel">
                        <div className="detail-panel-title">{t("orders.dealerDetails")}</div>
                        <div className="detail-item-row"><span>{t("orders.name")}</span><strong>{o.dealerName || o.transport?.dealerName || "-"}</strong></div>
                        <div className="detail-item-row"><span>{t("orders.dealerId")}</span><strong>{String(dealerId)}</strong></div>
                        <div className="detail-item-row"><span>{t("orders.contact")}</span><strong>{dealerPhone}</strong></div>
                        <div className="detail-item-row full"><span>{t("orders.email")}</span><strong>{dealerEmail}</strong></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FarmerOrders;
