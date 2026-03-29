import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../utils/api";
import { clearCartItems, readCartItems, writeCartItems } from "../utils/cartStorage";
import "../styles/Payment.css";
import BottomNav from "../components/BottomNav";

export default function Payment() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [paymentData, setPaymentData] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("UPI");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const dealer = JSON.parse(localStorage.getItem("selectedDealer")) || {};
    const finalPrice = JSON.parse(localStorage.getItem("finalPrice")) || null;
    const transportOrder = JSON.parse(localStorage.getItem("currentTransportOrder")) || null;
    const currentUser = JSON.parse(localStorage.getItem("registeredUser") || "{}");

    // Validate we have selected dealer and transport order items
    if (!transportOrder?.items?.length || !dealer.id) {
      // Silently redirect to cart if data is missing (e.g., after order placement or back navigation)
      navigate("/cart", { replace: true });
      return;
    }

    // Only show items for the farmer we selected transport for
    const items = transportOrder.items || [];
    const farmer = {
      id: transportOrder.farmerId,
      name: transportOrder.farmerName,
      location: transportOrder.farmerLocation,
      coordinates: transportOrder.farmerCoordinates || finalPrice?.pickupCoordinates || null,
    };

    const customer = {
      id: currentUser.id || currentUser._id || "Not available",
      name: currentUser.name || "Customer",
      email: currentUser.email || "Not available",
      phone: currentUser.phone || currentUser?.profile?.phone || "Not available",
    };

    const customerAddress = {
      phone: finalPrice?.customerAddress?.phone || customer.phone || "",
      doorNo: finalPrice?.customerAddress?.doorNo || "",
      country: finalPrice?.customerAddress?.country || currentUser?.profile?.country || "",
      state: finalPrice?.customerAddress?.state || currentUser?.profile?.state || "",
      district: finalPrice?.customerAddress?.district || currentUser?.profile?.district || "",
      mandal: finalPrice?.customerAddress?.mandal || currentUser?.profile?.mandal || "",
      pincode: finalPrice?.customerAddress?.pincode || currentUser?.profile?.pincode || "",
      locationText: finalPrice?.customerAddress?.locationText || finalPrice?.drop || transportOrder.deliveryAddress || "Not specified",
      coordinates: finalPrice?.customerAddress?.coordinates || null,
      // Add fullAddress from deliveryAddress (if available), fallback to locationText
      fullAddress: transportOrder.deliveryAddress || finalPrice?.customerAddress?.fullAddress || finalPrice?.customerAddress?.locationText || finalPrice?.drop || transportOrder.deliveryAddress || "",
    };

    const previewOrderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const deliveryDetails = {
      customerName: customer.name,
      customerPhone: customerAddress.phone || customer.phone,
      customerEmail: customer.email,
      destinationAddress: customerAddress.locationText,
    };
    
    // Helper to get full address for display
    const getCustomerFullAddress = () => {
      return customerAddress?.fullAddress && String(customerAddress.fullAddress).trim().length > 0 ? String(customerAddress.fullAddress).trim() : "";
    };

    const routeDistance = Number(finalPrice?.distance ?? transportOrder?.distance ?? 0) || 0;

    setPaymentData({ items, dealer, finalPrice, farmer, customer, customerAddress, previewOrderId, deliveryDetails, routeDistance });
  }, [navigate]);

  if (!paymentData) return null;

  const { items, dealer, finalPrice, farmer, customerAddress, previewOrderId, deliveryDetails, routeDistance } = paymentData;

  // Ensure all monetary/quantity values are numbers
  const toNumber = (val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^\d.-]/g, "");
      const num = parseFloat(cleaned);
      return Number.isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Compute total only for the selected farmer's items
  const itemsTotal = items.reduce(
    (sum, item) => sum + toNumber(item.pricePerKg) * toNumber(item.quantity),
    0
  );

  const transportFinalFee = toNumber(
    finalPrice?.transportFinalFee ?? finalPrice?.transportFee ?? dealer?.price ?? 0
  );
  // Always use backend-confirmed values for delivery charge and discount
  const transportBaseFee = toNumber(finalPrice?.transportBaseFee ?? transportFinalFee);
  const batchDiscount = toNumber(finalPrice?.batchDiscount ?? Math.max(transportBaseFee - transportFinalFee, 0));
  const dealerPayout = toNumber(finalPrice?.dealerPayout ?? Math.max(transportFinalFee, 0.85 * transportBaseFee, 60));
  const platformContribution = toNumber(finalPrice?.platformContribution ?? Math.max(dealerPayout - transportFinalFee, 0));
  const incentivePreview = finalPrice?.incentivePreview || {
    eligible: false,
    dealerBonus: 0,
    farmerBonus: 0,
    totalBonus: 0,
  };
  const platformFee = Math.min(Math.round(toNumber(itemsTotal) * 0.02), 100);
  const total = toNumber(itemsTotal) + transportFinalFee + platformFee;

  const placeOrder = async () => {
    setIsProcessing(true);

    try {
      if (!acceptedTerms) {
        alert("Please accept the terms and conditions before payment.");
        setIsProcessing(false);
        return;
      }

      if (!paymentData.items.length || !paymentData.dealer) {
        alert("Cart or Transport Dealer missing!");
        setIsProcessing(false);
        return;
      }

      // Get farmer details from selected transport order
      const farmerName = farmer?.name || "Unknown Farmer";
      const farmerLocation = farmer?.location || "Unknown Location";
      const farmerId = farmer?.id || null;

      // Get delivery location from final price data
      const deliveryLocation = finalPrice?.drop || "Not specified";

      // Get customer info
      const token = localStorage.getItem("accessToken");
      const user = JSON.parse(localStorage.getItem("registeredUser") || "{}");

      // Create order object for backend
      const orderData = {
        orderId: previewOrderId,
        items: paymentData.items.map(item => ({
          cropId: item.cropId || item.id,
          cropName: item.cropName || item.name,
          quantity: item.quantity,
          pricePerKg: item.pricePerKg,
          farmerName: farmerName,
          farmerLocation: farmerLocation,
        })),
        delivery: { 
          pickup: farmerLocation,
          pickupCoordinates: farmer?.coordinates,
          drop: deliveryLocation,
          dropCountry: customerAddress?.country,
          dropState: customerAddress?.state,
          dropDistrict: customerAddress?.district,
          dropMandal: customerAddress?.mandal,
          dropPincode: customerAddress?.pincode,
          dropDoorNo: customerAddress?.doorNo,
          dropLocationText: customerAddress?.locationText,
          dropPhone: customerAddress?.phone,
          dropCoordinates: customerAddress?.coordinates,
          distance: finalPrice?.distance || routeDistance || null,
        },
        customerSnapshot: customerAddress,
        dealerRequestId: finalPrice?.requestId,
        transport: {
          dealerId: paymentData.dealer?.dealerId || paymentData.dealer?.id,
          dealerName: paymentData.dealer?.dealerName || paymentData.dealer?.name,
          vehicle: paymentData.dealer?.vehicle || paymentData.dealer?.vehicleType,
          vehicleName: paymentData.dealer?.vehicleName,
          licensePlate: paymentData.dealer?.licensePlate,
          price: transportFinalFee,
          pricing: {
            baseCharge: transportBaseFee,
            finalCharge: transportFinalFee,
            batchDiscount,
            dealerPayout,
            platformContribution,
            incentivePreview,
          },
        },
        farmerId,
        paymentMethod: selectedPaymentMethod,
        pickup: farmerLocation,
      };

      console.log('📤 Sending order to backend:', orderData);

      // Save to backend (REQUIRED - not optional anymore)
      let savedOrder = null;
      if (token) {
        savedOrder = await apiPost("orders", orderData);
        console.log('✅ Order saved to backend:', savedOrder.orderId);
      } else {
        throw new Error("Please login to place order");
      }

      // Also save to localStorage for immediate UI update
      const newOrder = {
        id: savedOrder.orderId || `#${Date.now()}${Math.random().toString(9).substr(2, 9)}`,
        orderId: savedOrder.orderId,
        date: new Date().toLocaleString(),
        items: paymentData.items,
        farmer: {
          id: farmerId,
          name: farmerName,
          location: farmerLocation,
        },
        delivery: {
          location: deliveryLocation,
        },
        transport: paymentData.dealer,
        itemsTotal,
        transportFee: transportFinalFee,
        transportFinalFee,
        platformFee,
        total,
        status: "Confirmed",
        paymentMethod: selectedPaymentMethod,
        createdAt: new Date().getTime(),
        customerName: user.name,
        customerId: user.id,
      };

      setPlacedOrderId(savedOrder.orderId || previewOrderId);
      localStorage.setItem(
        "orderPlacedNotification",
        JSON.stringify({
          orderId: savedOrder.orderId || previewOrderId,
          cropName: paymentData.items?.[0]?.cropName || paymentData.items?.[0]?.name || "Crop",
          createdAt: Date.now(),
        })
      );

      const orders = JSON.parse(localStorage.getItem("orders")) || [];
      orders.push(newOrder);
      localStorage.setItem("orders", JSON.stringify(orders));
      
      // ✅ ONLY remove items from the specific farmer who was ordered
      const allCartItems = readCartItems();
      const remainingCartItems = allCartItems.filter(
        cartItem => cartItem.farmerId !== farmerId
      );
      
      // Update cart with remaining items (from other farmers)
      if (remainingCartItems.length > 0) {
        writeCartItems(remainingCartItems);
      } else {
        clearCartItems(); // Empty cart completely
      }
      
      localStorage.removeItem("selectedDealer");
      localStorage.removeItem("finalPrice");
      localStorage.removeItem("activeChat");
      localStorage.removeItem("currentTransportOrder");

      setShowSuccess(true);
      setIsProcessing(false);

      // Always take customer to orders after placement for immediate tracking.
      setTimeout(() => {
        navigate("/orders");
      }, 2000);
      
    } catch (error) {
      console.error("❌ Error placing order:", error);
      alert(`Failed to place order: ${error.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-container">
      {!showSuccess ? (
        <>
          <div className="payment-header">
            <div className="header-content">
              <h1>💳 Payment Summary</h1>
              <p className="subtitle">Review and confirm your order</p>
            </div>
          </div>

          <div className="payment-content">
            {/* ORDER ID SECTION */}
            <div className="payment-section transport-section">
              <div className="section-header">
                <span className="section-icon">🆔</span>
                <h3>Order ID</h3>
              </div>
              <div className="transport-info">
                <div className="transport-row">
                  <span className="label">Order ID</span>
                  <span className="value mono-id">{previewOrderId}</span>
                </div>
              </div>
            </div>

            {/* CUSTOMER DELIVERY SECTION */}
            <div className="payment-section transport-section">
              <div className="section-header">
                <span className="section-icon">📍</span>
                <h3>Customer Delivery Details</h3>
              </div>
              <div className="transport-info">
                <div className="transport-row">
                  <span className="label">Customer</span>
                  <span className="value">{deliveryDetails?.customerName || "Customer"}</span>
                </div>
                <div className="transport-row">
                  <span className="label">Customer Contact</span>
                  <span className="value">{deliveryDetails?.customerEmail} | {deliveryDetails?.customerPhone}</span>
                </div>
                <div className="transport-row">
                  <span className="label">Full Delivery Address</span>
                  <span className="value">{customerAddress?.fullAddress?.trim() ? customerAddress.fullAddress : deliveryDetails?.destinationAddress || "Not specified"}</span>
                </div>
                <div className="transport-row">
                  <span className="label">Door No</span>
                  <span className="value">{customerAddress?.doorNo || "-"}</span>
                </div>
              </div>
            </div>

            {/* ITEMS SECTION */}
            <div className="payment-section items-section">
              <div className="section-header">
                <span className="section-icon">🛒</span>
                <h3>Order Items</h3>
              </div>
              <div className="items-list">
                  {items.length > 0 ? (
                  items.map((item, i) => (
                    <div key={i} className="item-row">
                      <div className="item-info">
                        <span className="item-name">{item.cropName || item.name}</span>
                        <span className="item-qty">{item.quantity} kg @ farmer selling price ₹{item.pricePerKg}/kg</span>
                      </div>
                      <span className="item-price">
                        ₹{(item.pricePerKg * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="no-items">No items in cart</p>
                )}
              </div>
            </div>

            {/* TRANSPORT SECTION */}
            <div className="payment-section transport-section">
              <div className="section-header">
                <span className="section-icon">🚚</span>
                <h3>Transport Details</h3>
              </div>
              <div className="transport-info">
                <div className="transport-row">
                  <span className="label">✅ Price Confirmation</span>
                  <span className="value">Dealer Confirmed + Customer Confirmed</span>
                </div>
                <div className="transport-row">
                  <span className="label">👤 Dealer Name</span>
                  <span className="value">{paymentData.dealer?.name || "Not Selected"}</span>
                </div>
                <div className="transport-row">
                  <span className="label">🚗 Vehicle Type</span>
                  <span className="value badge">{paymentData.dealer?.vehicle || "N/A"}</span>
                </div>
                <div className="transport-row">
                  <span className="label">📍 Pickup Location</span>
                  <span className="value">{farmer?.location || "Not specified"}</span>
                </div>
                <div className="transport-row">
                  <span className="label">🎯 Delivery Location</span>
                  <span className="value">{deliveryDetails?.destinationAddress || "Not specified"}</span>
                </div>
              </div>
            </div>

            {/* PRICE BREAKDOWN SECTION */}
            <div className="payment-section price-section">
              <div className="section-header">
                <span className="section-icon">💰</span>
                <h3>Price Breakdown</h3>
              </div>
              <div className="price-breakdown">
                <div className="price-row">
                  <span className="price-label">Items Total</span>
                  <span className="price-value">₹{itemsTotal.toLocaleString()}</span>
                </div>
                <div className="price-row">
                  <span className="price-label">Base Delivery Charge</span>
                  <span className="price-value">₹{transportBaseFee.toLocaleString()}</span>
                </div>
                {batchDiscount > 0 && (
                  <div className="price-row">
                    <span className="price-label">Batch Discount (Platform-funded)</span>
                    <span className="price-value" style={{ color: "#2e7d32" }}>-₹{batchDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="price-row">
                  <span className="price-label">Final Delivery Charge</span>
                  <span className="price-value">₹{transportFinalFee.toLocaleString()}</span>
                </div>
                <div className="price-row">
                  <span className="price-label" style={{ fontSize: "0.95em", color: "#1976d2" }}>Note</span>
                  <span className="price-value" style={{ fontSize: "0.95em", color: "#1976d2" }}>
                    Delivery charge shown is the final backend-confirmed value after all discounts and batching. This matches the dealer and order summary.
                  </span>
                </div>
                <div className="price-row">
                  <span className="price-label">Platform Fee (2%, max ₹100)</span>
                  <span className="price-value">₹{platformFee.toLocaleString()}</span>
                </div>
                {incentivePreview?.eligible && (
                  <div className="price-row">
                    <span className="price-label">Admin Bonus Pool (Dealer + Farmer)</span>
                    <span className="price-value">₹{toNumber(incentivePreview.totalBonus).toLocaleString()}</span>
                  </div>
                )}
                <div className="price-divider"></div>
                <div className="price-row total-row">
                  <span className="price-label">Total Payable</span>
                  <span className="total-price">₹{total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* PAYMENT METHOD SECTION */}
            <div className="payment-section method-section">
              <div className="section-header">
                <span className="section-icon">💳</span>
                <h3>Payment Method</h3>
              </div>
              <div className="payment-methods">
                <div className={`method ${selectedPaymentMethod === "UPI" ? "active" : ""}`}>
                  <input type="radio" id="upi" name="payment" checked={selectedPaymentMethod === "UPI"} onChange={() => setSelectedPaymentMethod("UPI")} />
                  <label htmlFor="upi">
                    <span className="method-icon">📱</span>
                    <span className="method-name">UPI Payment</span>
                  </label>
                </div>
                <div className={`method ${selectedPaymentMethod === "Google Pay" ? "active" : ""}`}>
                  <input type="radio" id="gpay" name="payment" checked={selectedPaymentMethod === "Google Pay"} onChange={() => setSelectedPaymentMethod("Google Pay")} />
                  <label htmlFor="gpay">
                    <span className="method-icon">🟢</span>
                    <span className="method-name">Google Pay</span>
                  </label>
                </div>
                <div className={`method ${selectedPaymentMethod === "Paytm" ? "active" : ""}`}>
                  <input type="radio" id="paytm" name="payment" checked={selectedPaymentMethod === "Paytm"} onChange={() => setSelectedPaymentMethod("Paytm")} />
                  <label htmlFor="paytm">
                    <span className="method-icon">🔵</span>
                    <span className="method-name">Paytm</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="payment-section method-section">
              <div className="section-header">
                <span className="section-icon">☑️</span>
                <h3>Terms &amp; Conditions</h3>
              </div>
              <label className="terms-check">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  By continuing with the order, you confirm that you are above
                  18 years of age, and you agree to AgriMart's{" "}
                  <a
                    href="/terms-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="policy-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Use
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="policy-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="payment-actions">
            <button
              className="cancel-btn"
              onClick={() => navigate("/cart")}
              disabled={isProcessing}
            >
              ← Back to Cart
            </button>
            <button
              className={`pay-btn ${isProcessing ? "processing" : ""}`}
              onClick={placeOrder}
              disabled={isProcessing || !acceptedTerms}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                "💰 Pay & Place Order"
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="success-container">
          <div className="success-animation">
            <div className="success-checkmark">
              <div className="check-icon">✓</div>
            </div>
          </div>
          <h2>Order Confirmed!</h2>
          <p className="success-message">
            Your order has been placed successfully.
          </p>
          {placedOrderId ? <p className="redirect-message">Order ID: {placedOrderId}</p> : null}
          <p className="redirect-message">Redirecting to My Orders...</p>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
