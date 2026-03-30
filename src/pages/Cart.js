import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Cart.css";
import { clearCartItems, readCartItems, writeCartItems } from "../utils/cartStorage";
import { apiGet } from "../utils/api";
import { BULK_DISCOUNT_LABEL, BULK_ORDER_MIN_QTY } from "../constants/pricingRules";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";
import { useTranslation } from "react-i18next";

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);

  useEffect(() => {
    // On mount, validate cart items against backend crops
    const validateCart = async () => {
      const localCart = readCartItems();
      try {
        const crops = await apiGet("crops");
        // Build a Set of available crop names (case-insensitive)
        const availableCropNames = new Set(
          crops.map(c => (c.cropName || c.name || "").trim().toLowerCase())
        );
        // Only keep cart items whose cropName is still available
        const filteredCart = localCart.filter(item =>
          availableCropNames.has((item.cropName || "").trim().toLowerCase())
        );
        if (filteredCart.length !== localCart.length) {
          // Update cart if any items were removed
          if (filteredCart.length) {
            writeCartItems(filteredCart);
          } else {
            clearCartItems();
          }
        }
        setCart(filteredCart);
      } catch (err) {
        // On error, fallback to local cart
        setCart(localCart);
      }
    };
    validateCart();
  }, []);

  // 🔹 Group items by farmerId
  const groupedCart = cart.reduce((acc, item) => {
    acc[item.farmerId] = acc[item.farmerId] || [];
    acc[item.farmerId].push(item);
    return acc;
  }, {});

  // 🔹 Update quantity (min = 1)
  const updateQty = (id, delta) => {
    const updated = cart.map((item) => {
      if (item.id === id) {
        const qty = item.quantity + delta;
        return { ...item, quantity: qty < 1 ? 1 : qty };
      }
      return item;
    });

    setCart(updated);
    writeCartItems(updated);
  };

  // 🔹 Remove item
  const removeItem = (id) => {
    const updated = cart.filter((item) => item.id !== id);
    setCart(updated);
    if (updated.length) {
      writeCartItems(updated);
    } else {
      clearCartItems();
    }
  };

  // 🔹 Select transport dealer for one farmer
  const selectTransport = (items) => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);

    localStorage.setItem(
      "currentTransportOrder",
      JSON.stringify({
        farmerId: items[0].farmerId,
        farmerName: items[0].farmerName,
        farmerLocation: items[0].farmerLocation,
        farmerCoordinates: items[0].farmerCoordinates || null,
        totalQty,
        items,
      })
    );

    navigate("/transport-dealers");
  };

  return (

    <div className="cart-page">
      <CustomerHeader />

      <h2>🛒 {t('cart.title', 'My Cart')}</h2>

      {Object.keys(groupedCart).length === 0 && (
        <p className="empty-cart">{t('cart.emptyCart', 'Your cart is empty')}</p>
      )}

      {Object.keys(groupedCart).map((farmerId) => {
        const items = groupedCart[farmerId];
        const totalQty = items.reduce((s, i) => s + i.quantity, 0);
        const isBulkActive = totalQty >= BULK_ORDER_MIN_QTY;
        const qtyToUnlock = Math.max(0, BULK_ORDER_MIN_QTY - totalQty);
        const totalPrice = items.reduce(
          (s, i) => s + i.quantity * i.pricePerKg,
          0
        );

        return (
          <div key={farmerId} className="farmer-card">

            {/* 👨‍🌾 Farmer Header */}
            <div className="farmer-header">
              <h3>👨‍🌾 {items[0].farmerName}</h3>
              <p>📍 {items[0].farmerLocation}</p>
            </div>

            {/* 🧺 Products */}
            {items.map((item) => (
              <div key={item.id} className="item-row">
                <div className="item-info">
                  <strong>{item.cropName}</strong>
                  <small>{t('cart.farmerSellingPrice', 'Farmer selling price')}: ₹{item.pricePerKg} / kg</small>
                </div>

                <div className="qty-box">
                  <button onClick={() => updateQty(item.id, -1)}>-</button>
                  <span>{item.quantity} kg</span>
                  <button onClick={() => updateQty(item.id, 1)}>+</button>
                </div>

                <div className="item-total">
                  ₹{item.quantity * item.pricePerKg}
                </div>

                <span className="remove" onClick={() => removeItem(item.id)}>
                  ❌
                </span>
              </div>
            ))}

            {/* 📦 Summary */}
            <div className="summary">
              <div>
                <p><strong>{t('cart.totalQuantity', 'Total Quantity')}:</strong> {totalQty} kg</p>
                <p className={`bulk-status ${isBulkActive ? "active" : "pending"}`}>
                  {isBulkActive
                    ? `⭐ ${t('cart.bulkDiscountActive', 'Bulk Discount Active')} (${BULK_DISCOUNT_LABEL} ${t('cart.offOnTransport', 'off on transport')})`
                    : `💡 ${t('cart.addMoreToUnlock', { defaultValue: 'Add {{count}} kg more to unlock bulk discount', count: qtyToUnlock })}`}
                </p>
                <p><strong>{t('cart.totalSellingPrice', 'Total Selling Price')}:</strong> ₹{totalPrice}</p>
              </div>

              <button onClick={() => selectTransport(items)}>
                🚚 {t('cart.selectTransportDealer', 'Select Transport Dealer')}
              </button>
            </div>

          </div>
        );
      })}
      <BottomNav />
    </div>
  );
}
