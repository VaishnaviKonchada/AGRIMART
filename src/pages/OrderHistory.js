import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiDelete } from "../utils/api";
import "../styles/OrderHistory.css";
import BottomNav from "../components/BottomNav";

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet('orders');
        if (Array.isArray(data)) {
          setOrders(data.reverse());
        }
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const deleteOrder = async (orderId) => {
    try {
      await apiDelete(`orders/${orderId}`);
      setOrders((prev) => prev.filter((o) => (o.orderId || o.id || o._id) !== orderId));
    } catch (error) {
      console.error("❌ Error deleting order:", error);
      alert("Failed to delete order: " + error.message);
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

  return (
    <div className="order-history-page">
      <div className="order-header">
        <h2>📦 My Orders</h2>
        <button onClick={() => navigate("/home")}>🏠 Home</button>
      </div>

      {loading ? (
        <p className="no-orders">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="no-orders">No orders placed yet</p>
      ) : (
        orders.map((order) => {
          const orderId = order.orderId || order.id || order._id;
          const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
          const total = order.summary?.total || order.total || 0;
          const transportFinalFee = order.summary?.transportFinalFee || order.summary?.transportFee || order.transportFee || 0;
          const transportBaseFee = order.summary?.transportBaseFee || transportFinalFee;
          const batchDiscount = order.summary?.batchDiscount || Math.max(transportBaseFee - transportFinalFee, 0);
          const dealerPayout = order.summary?.dealerPayout || transportFinalFee;
          const platformContribution = order.summary?.platformContribution || Math.max(dealerPayout - transportFinalFee, 0);
          const routeDistance = Number(order.delivery?.distance);
          const distanceSource = hasCoordinates(order.delivery?.pickupCoordinates) && hasCoordinates(order.delivery?.dropCoordinates)
            ? "Exact GPS"
            : "Fallback area";
          
          return (
          <div className="order-card" key={orderId}>
            <div className="order-top">
              <span>Order ID: #{orderId}</span>
              <span>{orderDate}</span>
              <button onClick={() => deleteOrder(orderId)}>🗑️</button>
            </div>

            {/* ITEMS */}
            <div className="order-items">
              {order.items.map((item, i) => (
                <div className="order-item" key={i}>
                  <img src={item.image || `/crops/${item.cropName || item.name}.jpg`} alt={item.cropName || item.name} />
                  <div>
                    <h4>{item.cropName || item.name}</h4>
                    <p>
                      {item.quantity} kg × ₹{item.pricePerKg}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* TRANSPORT */}
            <div className="order-transport">
              <p>🚚 {order.dealerName || order.transport?.dealerName || "N/A"}</p>
              <p>📍 Pickup: {order.delivery?.pickup || order.transport?.pickup || "Not specified"}</p>
              <p>📦 Drop: {order.delivery?.drop || order.transport?.drop || "Not specified"}</p>
              <p>📏 Distance: {Number.isFinite(routeDistance) ? `${routeDistance} km` : "N/A"}</p>
              <p>🧭 Source: {distanceSource}</p>
              <p>📍 Pickup Coordinates: {formatCoordinates(order.delivery?.pickupCoordinates)}</p>
              <p>🎯 Drop Coordinates: {formatCoordinates(order.delivery?.dropCoordinates)}</p>
              <p>💰 Base Delivery: ₹{transportBaseFee}</p>
              <p style={{ color: "#2e7d32" }}>🎯 Batch Discount: -₹{batchDiscount}</p>
              <p>✅ Final Delivery Charge: ₹{transportFinalFee}</p>
            </div>

            <div className="order-total">
              <strong>Total Paid: ₹{total}</strong>
            </div>

            <div className="order-status">
              Status: <span>{order.status}</span>
            </div>

            {/* 🔥 TRACK DELIVERY BUTTON */}
            <button
              className="track-btn"
              onClick={() => navigate(`/delivery-status/${orderId}`)}
            >
              🚚 Track Delivery
            </button>
          </div>
        );
        })
      )}
      <BottomNav />
    </div>
  );
}
