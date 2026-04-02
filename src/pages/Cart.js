import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Cart.css";
import { clearCartItems, readCartItems, writeCartItems, syncCartWithBackend, pushCartToBackend } from "../utils/cartStorage";
import { apiGet } from "../utils/api";
import { BULK_DISCOUNT_LABEL, BULK_ORDER_MIN_QTY } from "../constants/pricingRules";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";
import { useTranslation } from "react-i18next";
import emptyCartImg from "../assets/empty-cart.png";

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 0. Try to populate from local storage immediately for speed
    const syncInit = readCartItems();
    if (syncInit.length > 0) {
      setCart(syncInit);
    }

    const initCart = async () => {
      try {
        setLoading(true);
        // 1. Sync local cart with backend
        await syncCartWithBackend();
        const localCart = readCartItems();
        
        // Update with immediate local sync result
        setCart(localCart);
        
        // 2. Refresh crops and check availability
        const crops = await apiGet("crops").catch(() => []);
        const availableCropNames = new Set(
          crops.map(c => (c.cropName || c.name || "").trim().toLowerCase())
        );
        
        // Map availability
        const validatedCart = localCart.map(item => ({
          ...item,
          isAvailable: crops.length > 0 ? availableCropNames.has((item.cropName || "").trim().toLowerCase()) : true
        }));
        
        setCart(validatedCart);
      } catch (err) {
        console.error("Cart init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initCart();
  }, [navigate]);

  // 🔹 Group items by farmerId
  const groupedCart = cart.reduce((acc, item) => {
    acc[item.farmerId] = acc[item.farmerId] || [];
    acc[item.farmerId].push(item);
    return acc;
  }, {});

  // 🔹 Update quantity (min = 1)
  const updateQty = async (id, delta) => {
    const updated = cart.map((item) => {
      if (item.id === id) {
        const qty = item.quantity + delta;
        return { ...item, quantity: qty < 1 ? 1 : qty };
      }
      return item;
    });

    setCart(updated);
    writeCartItems(updated);
    await pushCartToBackend(updated);
  };

  // 🔹 Remove item
  const removeItem = async (id) => {
    const updated = cart.filter((item) => item.id !== id);
    setCart(updated);
    if (updated.length) {
      writeCartItems(updated);
    } else {
      clearCartItems();
    }
    await pushCartToBackend(updated);
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

  const isEmpty = Object.keys(groupedCart).length === 0;

  return (
    <div className="cart-page">
      <CustomerHeader />

      <div className="cart-header-container">
        <h2>
          <span>🛒</span> {t('cart.title', 'My Cart')}
        </h2>
      </div>

      {loading ? (
        <div className="empty-cart-container" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginLeft: '12px' }}>{t('common.loading', 'Loading Cart...')}</p>
        </div>
      ) : isEmpty ? (
        <div className="empty-cart-container">
          <img src={emptyCartImg} alt="Empty Cart" className="empty-cart-img" />
          <h3>{t('cart.emptyCartTitle', 'Your basket is empty')}</h3>
          <p>{t('cart.emptyCartSub', 'Looks like you haven\'t added any fresh crops yet.')}</p>
          <Link to="/home" className="shop-now-btn">
            {t('cart.shopNow', 'Shop Fresh Crops')}
          </Link>
        </div>
      ) : (
        <div className="cart-content">
          {(() => {
            const globalTotalQty = cart.reduce((s, i) => s + i.quantity, 0);
            const isGlobalBulkActive = globalTotalQty >= BULK_ORDER_MIN_QTY;
            const globalQtyToUnlock = Math.max(0, BULK_ORDER_MIN_QTY - globalTotalQty);

            return (
              <>
                {/* Global Bulk Discount Notification */}
                <div className={`discount-banner global-banner ${isGlobalBulkActive ? "active" : "pending"}`} 
                     style={{ marginBottom: '20px', borderRadius: '12px', padding: '16px' }}>
                  {isGlobalBulkActive ? (
                    <>
                      <span>⭐</span>
                      <div>
                        <b>{t('cart.bulkDiscountActive', 'Bulk Discount Unlocked!')}</b>
                        {BULK_DISCOUNT_LABEL} {t('cart.offOnTransport', 'off on transport costs')}
                      </div>
                    </>
                  ) : (
                    <>
                      <span>💡</span>
                      <div>
                        <b>{t('cart.bulkDiscountPending', 'Unlock Bulk Discount')}</b>
                        {t('cart.addMoreToUnlock', { 
                          defaultValue: 'Add {{count}} kg more to get transport discount', 
                          count: globalQtyToUnlock 
                        })}
                      </div>
                    </>
                  )}
                </div>

                {Object.keys(groupedCart).map((farmerId) => {
                  const items = groupedCart[farmerId];
                  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                  const totalPrice = items.reduce(
                    (s, i) => s + i.quantity * i.pricePerKg,
                    0
                  );

                  return (
                    <div key={farmerId} className="farmer-card">
                      {/* 👨‍🌾 Farmer Header */}
                      <header className="farmer-header">
                        <div className="farmer-info">
                          <h3>👨‍🌾 {items[0].farmerName}</h3>
                          <p>📍 {items[0].farmerLocation}</p>
                        </div>
                        <div className="items-count-badge">
                          {items.length} {t('cart.items', 'items')}
                        </div>
                      </header>

                      {/* 🧺 Products */}
                      <div className="items-list">
                        {items.map((item) => (
                          <div key={item.id} className="item-row">
                            <div className="crop-placeholder-img">
                              {item.category === 'Fruit' ? '🍎' : '🥬'}
                            </div>
                            
                            <div className="item-details">
                              <b>{item.cropName}</b>
                              <span>₹{item.pricePerKg} {t('kg_unit', '/ kg')}</span>
                              {item.isAvailable === false && (
                                <span className="out-of-stock-badge">⚠️ {t('cart.unavailable', 'Currently Unavailable')}</span>
                              )}
                            </div>

                            <div className="qty-controls">
                              <button className="qty-btn" onClick={() => updateQty(item.id, -1)} aria-label="Decrease quantity">−</button>
                              <span className="current-qty">{item.quantity} {t('kg', 'kg')}</span>
                              <button className="qty-btn" onClick={() => updateQty(item.id, 1)} aria-label="Increase quantity">+</button>
                            </div>

                            <div className="price-col">
                              ₹{item.quantity * item.pricePerKg}
                            </div>

                            <button className="remove-btn" onClick={() => removeItem(item.id)} title="Remove item">
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* 📦 Summary */}
                      <footer className="farmer-footer">
                        <div className="summary-stats">
                          <div className="stat-group">
                            <div className="stat">
                              <span className="stat-label">{t('cart.totalWeight', 'Total Weight')}</span>
                              <span className="stat-value">{totalQty} {t('kg', 'kg')}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">{t('cart.subtotal', 'Subtotal')}</span>
                              <span className="stat-value">₹{totalPrice}</span>
                            </div>
                          </div>

                          <button className="checkout-btn" onClick={() => selectTransport(items)}>
                            🚚 {t('cart.continueCheckout', 'Find Transport')}
                          </button>
                        </div>
                      </footer>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}
      <BottomNav />
    </div>
  );
}

