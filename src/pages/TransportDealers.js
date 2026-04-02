import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiPost, API_BASE_URL } from "../utils/api";
import { calculateTransportPricing } from "../utils/transportCharges";
import { geocodeAddress } from "../utils/geocode";
import "../styles/TransportDealers.css";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";

// Strict India bounds (approximate)
function isIndiaCoordinates(lat, lng) {
  lat = Number(lat);
  lng = Number(lng);
  // India bounding box: lat 6-38, lng 68-98
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 6 && lat <= 38 &&
    lng >= 68 && lng <= 98
  );
}

const PENDING_DEALER_REQUESTS_KEY = "pendingDealerRequests";

export default function TransportDealers() {
  const { t } = useTranslation();
  // All state hooks
  const [fetchingCoords, setFetchingCoords] = useState(false);
  const [coordsError, setCoordsError] = useState("");
  const [geocodeDebounce, setGeocodeDebounce] = useState(null);
  const [order, setOrder] = useState(null);
  const [distance, setDistance] = useState(0);
  const [vehicleType, setVehicleType] = useState("");
  const [dealers, setDealers] = useState([]);
  const [filteredDealers, setFilteredDealers] = useState([]);
  const [dropLocation, setDropLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandal, setSelectedMandal] = useState("");
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [dropDoorNo, setDropDoorNo] = useState("");
  const [dropCountry, setDropCountry] = useState("India");
  const [dropState, setDropState] = useState("Andhra Pradesh");
  const [dropPincode, setDropPincode] = useState("");
  const [dropLocationText, setDropLocationText] = useState("");
  const [dropCoordinates, setDropCoordinates] = useState(null);
  const [loadingDropLocation, setLoadingDropLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [famousNearby, setFamousNearby] = useState([]);
  const [topRejectionNotice, setTopRejectionNotice] = useState(null);
  const [chatRequests, setChatRequests] = useState({});
  const [dealerResponses, setDealerResponses] = useState({});
  const [timers, setTimers] = useState({});
  const [transportCharges, setTransportCharges] = useState({});
  const [pagePriceAlert, setPagePriceAlert] = useState(null);

  const navigate = useNavigate();

  // Auto-geocode when location text changes (debounced)
  useEffect(() => {
    if (!dropLocationText || dropLocationText.length < 4) return;
    if (geocodeDebounce) clearTimeout(geocodeDebounce);
    const timer = setTimeout(() => {
      handleFetchCoordinates();
    }, 900);
    setGeocodeDebounce(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropLocationText]);

  // Handler to fetch coordinates from address
  async function handleFetchCoordinates(addressOverride) {
    setFetchingCoords(true);
    setCoordsError("");
    try {
      let address = addressOverride || [
        dropLocationText,
        selectedMandal,
        selectedDistrict,
        dropPincode,
        dropState,
        dropCountry
      ].filter(Boolean).join(", ");
      if (typeof address !== 'string') address = String(address || '');
      
      if (!address || address.replace(/[\,\s]/g, "").length < 8) {
        setFetchingCoords(false);
        return;
      }

      let coords = null;
      try {
        coords = await geocodeAddress(address);
      } catch (err1) {
        setDropCoordinates(null);
        return;
      }

      if (!coords || !isIndiaCoordinates(coords.lat, coords.lon)) {
        setDropCoordinates(null);
        return;
      }

      setDropCoordinates({ lat: coords.lat, lng: coords.lon });
    } finally {
      setFetchingCoords(false);
    }
  }

  // Auto-geocode when pincode changes (debounced)
  useEffect(() => {
    if (!dropPincode || dropPincode.length < 5) return;
    if (geocodeDebounce) clearTimeout(geocodeDebounce);
    const timer = setTimeout(() => {
      handleFetchCoordinates();
    }, 800);
    setGeocodeDebounce(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropPincode]);

  const hasCoordinates = (coords) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && isIndiaCoordinates(lat, lng);
  };

  const formatCoordinates = (coords) => {
    if (!hasCoordinates(coords)) return t('notSet', "N/A");
    return `${Number(coords.lat).toFixed(6)}, ${Number(coords.lng).toFixed(6)}`;
  };

  const hasRouteDistance = dropLocation && Number.isFinite(distance) && distance >= 0 && hasCoordinates(order?.farmerCoordinates) && hasCoordinates(dropCoordinates);

  function isVehicleSuitable(vehicleType, quantity, distance) {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(distance)) return false;
    const type = (vehicleType || "").toUpperCase();
    
    // A more intelligent selection:
    // Bikes are for local, small loads only.
    if (type === "BIKE") return distance <= 30;
    
    // Autos and Trucks can handle long distances regardless of small quantity if requested.
    if (type === "AUTO") return distance <= 150;
    if (type === "TRUCK") return true; 

    return false;
  }

  const filterDealersByWeightAndDistance = (dealersList, quantity, distance) => {
    const qty = Number(quantity);
    return (dealersList || [])
      .map((dealer) => ({
        ...dealer,
        vehicles: (dealer.vehicles || []).filter((vehicle) =>
          isVehicleSuitable(vehicle.vehicleType, quantity, distance) && Number(vehicle.capacity) >= qty
        ),
      }))
      .filter((dealer) => dealer.vehicles.length > 0);
  };

  const calculateAllCharges = (dealersList, distance, quantity) => {
    const charges = {};
    (dealersList || []).forEach((dealer) => {
      (dealer.vehicles || []).forEach((vehicle) => {
        const vehicleId = vehicle._id;
        const chargeResult = vehicle?.pricingBreakdown
          ? {
              baseCharge: Number(vehicle.baseTransportCharge || vehicle.pricingBreakdown.baseCharge || vehicle.quotedPrice || 0),
              finalCharge: Number(vehicle.transportCharge || vehicle.quotedPrice || 0),
              batchDiscount: Number(vehicle.batchDiscount || 0),
              batchDiscountRatePct: Number(vehicle.batchDiscountRatePct || 0),
              dealerPayout: Number(vehicle.dealerPayout || vehicle.transportCharge || vehicle.quotedPrice || 0),
              platformContribution: Number(vehicle.platformContribution || 0),
              breakdown: vehicle.pricingBreakdown,
            }
          : calculateTransportPricing(distance, vehicle.vehicleType, quantity);
        
        charges[vehicleId] = {
          charge: chargeResult.finalCharge,
          baseCharge: chargeResult.baseCharge,
          batchDiscount: chargeResult.batchDiscount,
          batchDiscountRatePct: chargeResult.batchDiscountRatePct,
          dealerPayout: chargeResult.dealerPayout,
          platformContribution: chargeResult.platformContribution,
          breakdown: chargeResult.breakdown
        };
      });
    });
    setTransportCharges(charges);
  };

  const getTotalProductPrice = (orderData) => {
    const lineItemsTotal = orderData?.items?.reduce((sum, item) => {
      const qty = Number(item.quantity || item.qty || 0);
      const unitPrice = Number(item.pricePerKg || item.unitPrice || item.price || 0);
      const lineTotal = Number(item.total || item.totalPrice || 0);
      const resolvedLine = lineTotal > 0 ? lineTotal : (qty * unitPrice);
      return sum + resolvedLine;
    }, 0) || 0;
    const orderLevelTotal = Number(orderData?.totalPrice || orderData?.productTotal || 0);
    return lineItemsTotal > 0 ? lineItemsTotal : orderLevelTotal;
  };

  const getClientPriceAlert = (chargesMap, productPrice, hasDropLocation) => {
    if (!hasDropLocation) return null;
    const cropPrice = Number(productPrice) || 0;
    if (cropPrice <= 0) return null;
    const chargeList = Object.values(chargesMap || {}).map((entry) => Number(entry?.charge) || 0).filter((value) => value > 0);
    if (!chargeList.length) return null;
    const highestCharge = Math.max(...chargeList);
    if (highestCharge > cropPrice) {
      return {
        type: 'warning',
        showAlert: true,
        message: t('transportDealers.highChargeWarning', {
          defaultValue: 'Heads up! Delivery charge can be higher than crop value for this route (Delivery: Rs.{{charge}}, Crop: Rs.{{price}}). You can reduce cost per item by increasing quantity or selecting a closer dealer.',
          charge: highestCharge,
          price: cropPrice
        })
      };
    }
    return null;
  };

  const normalizePhone = (value) => {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length > 10) digits = digits.slice(-10);
    return digits;
  };

  const isValidPhone = (value) => /^[6-9]\d{9}$/.test(normalizePhone(value));

  const getDropLiveLocation = async () => {
    if (!navigator.geolocation) {
      alert(t('transportDealers.geoNotSupported', "Geolocation not supported"));
      return;
    }
    setLoadingDropLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setDropCoordinates({ lat, lng });
        try {
          const response = await fetch(`${API_BASE_URL}/locations/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
          const data = await response.json();
          if (data.success) {
            const baseLocation = data.locationText || data.fullAddress || `Lat: ${lat}, Lng: ${lng}`;
            const nearestFamous = Array.isArray(data.famousNearby) && data.famousNearby.length > 0 ? String(data.famousNearby[0]).trim() : "";
            const locationWithLandmark = nearestFamous ? `${baseLocation} (Near ${nearestFamous})` : baseLocation;
            setDropLocationText(locationWithLandmark);
            setDropPincode(data.pincode || "");
            setDropState(data.state || "");
            setDropCountry(data.country || "");
            const mergedSuggestions = [locationWithLandmark, baseLocation, data.alternativeLocation, ...(Array.isArray(data.nearbySuggestions) ? data.nearbySuggestions : [])].filter(Boolean);
            const uniqueSuggestions = Array.from(new Set(mergedSuggestions.map((s) => String(s).trim())));
            setLocationSuggestions(uniqueSuggestions.slice(0, 6));
            setFamousNearby(Array.isArray(data.famousNearby) ? data.famousNearby.slice(0, 5) : []);
          } else {
            setDropLocationText(`Lat: ${lat}, Lng: ${lng}`);
          }
        } catch (err) {
          setDropLocationText(`Lat: ${lat}, Lng: ${lng}`);
        } finally {
          setLoadingDropLocation(false);
        }
      },
      () => {
        setLoadingDropLocation(false);
        alert(t('transportDealers.locationDenied', "Location access denied"));
      }
    );
  };

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("currentTransportOrder"));
    if (!data) return;
    const currentUser = JSON.parse(localStorage.getItem("registeredUser") || "{}");
    const profile = currentUser?.profile || {};
    setCustomerPhone(profile.phone || currentUser.phone || "");
    setDropDoorNo(profile.doorNo || "");
    setDropCountry(profile.country || "India");
    setDropState(profile.state || "Andhra Pradesh");
    setDropPincode(profile.pincode || "");
    setOrder(data);
    fetchDealers(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadDistricts(); }, []);
  useEffect(() => { if (selectedDistrict) loadMandals(selectedDistrict); }, [selectedDistrict]);

  useEffect(() => {
    if (dropCoordinates && dropLocationText && selectedDistrict && selectedMandal && order) {
      handleLocationChange({ target: { value: `${selectedMandal}, ${selectedDistrict}` } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropCoordinates]);

  useEffect(() => {
    if (dropLocation && filteredDealers.length > 0 && Number.isFinite(distance) && distance >= 0 && order) {
      calculateAllCharges(filteredDealers, distance, order.totalQty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDealers, distance, order, dropLocation]);

  const fetchDealers = async (orderData) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        pickupLocation: orderData.farmerLocation,
        dropLocation: orderData.farmerLocation,
        quantity: orderData.totalQty,
        productPrice: String(getTotalProductPrice(orderData)),
        pickupOnly: 'true',
      });
      const response = await fetch(`${API_BASE_URL}/transport-dealers/filter?${params}`);
      const data = await response.json();
      const dealersByWeightAndDistance = filterDealersByWeightAndDistance(data.dealers, orderData.totalQty, data.distance);
      setDistance(data.distance);
      setVehicleType(data.vehicleType);
      setDealers(dealersByWeightAndDistance);
      setFilteredDealers(dealersByWeightAndDistance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async () => {
    try {
      setDistrictsLoading(true);
      const response = await fetch(`${API_BASE_URL}/locations/districts`);
      const data = await response.json();
      if (data.success) setDistricts(data.districts);
    } catch (err) {} finally { setDistrictsLoading(false); }
  };

  const loadMandals = async (district) => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/mandals/${district}`);
      const data = await response.json();
      if (data.success) setMandals(data.mandals);
    } catch (err) { setMandals([]); }
  };

  const handleLocationChange = async (e) => {
    const location = e.target.value;
    setDropLocation(location);
    setShowLocationWarning(false);
    if (!location.trim() || !order) {
      setFilteredDealers(dealers);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams({
        pickupLocation: order.farmerLocation,
        dropLocation: location,
        quantity: order.totalQty,
        productPrice: String(getTotalProductPrice(order)),
      });
      if (hasCoordinates(order?.farmerCoordinates)) {
        params.set("pickupLat", order.farmerCoordinates.lat);
        params.set("pickupLng", order.farmerCoordinates.lng);
      }
      if (hasCoordinates(dropCoordinates)) {
        params.set("dropLat", dropCoordinates.lat);
        params.set("dropLng", dropCoordinates.lng);
      }
      const response = await fetch(`${API_BASE_URL}/transport-dealers/filter?${params}`);
      const data = await response.json();
      const dealersByWeightAndDistance = filterDealersByWeightAndDistance(data.dealers, order.totalQty, data.distance);
      setDistance(data.distance);
      setVehicleType(data.vehicleType);
      setFilteredDealers(dealersByWeightAndDistance);
      if (dealersByWeightAndDistance.length === 0) setShowLocationWarning(true);
    } catch (err) {
      setError(err.message);
      setShowLocationWarning(true);
    } finally {
      setLoading(false);
    }
  };

  const initiateChat = async (dealer, vehicle) => {
    if (!dropLocation || !selectedMandal || !selectedDistrict || !dropPincode.trim() || !dropLocationText.trim() || !isValidPhone(customerPhone)) {
      alert(t('transportDealers.fillFieldsWarning', "⚠️ Please fill all mandatory fields and enter a valid mobile number."));
      return;
    }
    try {
      setLoading(true);
      const cropNames = Array.from(new Set((order?.items || []).map((item) => item?.cropName || item?.name || "").filter(Boolean)));
      const cropItem = cropNames[0] || order?.cropName || "";
      const requestBody = {
        dealerId: dealer.dealerId,
        pickupLocation: order.farmerLocation,
        dropLocation: dropLocation,
        quantity: order.totalQty,
        farmerName: order.farmerName,
        farmerLocation: order.farmerLocation,
        cropItem,
        quotedPrice: vehicle.quotedPrice,
        pricing: {
          baseCharge: Number(vehicle.baseTransportCharge || vehicle.pricingBreakdown?.baseCharge || vehicle.quotedPrice || 0),
          finalCharge: Number(vehicle.transportCharge || vehicle.quotedPrice || 0),
          batchDiscount: Number(vehicle.batchDiscount || 0),
          dealerPayout: Number(vehicle.dealerPayout || vehicle.transportCharge || vehicle.quotedPrice || 0),
        },
        vehicleType: vehicle.vehicleType,
        vehicleId: vehicle._id,
        licensePlate: vehicle.licensePlate,
        customerPhone: normalizePhone(customerPhone),
        customerDoorNo: dropDoorNo,
        customerCountry: dropCountry,
        customerState: dropState,
        customerDistrict: selectedDistrict,
        customerMandal: selectedMandal,
        customerPincode: dropPincode,
        customerLocationText: dropLocationText,
        customerCoordinates: dropCoordinates,
        pickupCoordinates: order.farmerCoordinates,
      };
      const data = await apiPost("transport-dealers/request", requestBody);
      const requestId = data.requestId;
      const requestKey = `${dealer._id}-${vehicle._id}`;
      setChatRequests((prev) => ({ ...prev, [requestKey]: { status: "SENT", timestamp: Date.now(), requestId, timeRemaining: 5 * 60 * 1000 } }));
      startRequestTimer(requestKey, requestId, data.expiresAt, dealer.dealerId, dealer.dealerName, vehicle);
    } catch (err) {
      alert(t('transportDealers.requestError', "Failed to send request"));
    } finally {
      setLoading(false);
    }
  };

  const startRequestTimer = (requestKey, requestId, expiresAt, dealerId, dealerName, vehicle) => {
    const expiryTime = new Date(expiresAt).getTime();
    const intervalId = setInterval(async () => {
      const now = Date.now();
      const timeRemaining = Math.max(0, expiryTime - now);
      try {
        const response = await fetch(`${API_BASE_URL}/transport-dealers/request/${requestId}`);
        const data = await response.json();
        setChatRequests((prev) => ({
          ...prev,
          [requestKey]: { ...prev[requestKey], timeRemaining, status: data.status },
        }));
        if (data.status === "ACCEPTED") {
          clearInterval(intervalId);
          openChat(dealerId, requestId, vehicle, data.chatId);
        } else if (data.status === "REJECTED" || data.status === "EXPIRED" || timeRemaining <= 0) {
          clearInterval(intervalId);
        }
      } catch (err) {}
    }, 2000);
    setTimers((prev) => ({ ...prev, [requestKey]: intervalId }));
  };

  const openChat = (dealerId, requestId, vehicle, chatId) => {
    const dealer = filteredDealers.find(d => d.dealerId === dealerId);
    if (!dealer) return;
    const currentUser = JSON.parse(localStorage.getItem("registeredUser") || "{}");
    localStorage.setItem("activeChat", JSON.stringify({
      chatId,
      customerId: currentUser.id,
      farmerName: order.farmerName,
      dealerId,
      dealerName: dealer.dealerName,
      vehicle: vehicle.vehicleType,
      totalQty: order.totalQty,
      distance,
      cropName: Array.from(new Set((order?.items || []).map((item) => item?.cropName || item?.name || "").filter(Boolean)))[0] || order?.cropName || "",
      status: "ACCEPTED",
    }));
    navigate("/chat");
  };

  const formatTimeRemaining = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!order) return <h3>{t('transportDealers.noOrderFound', 'No transport order found')}</h3>;

  const totalProductPrice = getTotalProductPrice(order);
  const effectivePriceAlert = pagePriceAlert || getClientPriceAlert(transportCharges, totalProductPrice, Boolean(dropLocation));

  return (
    <div className="transport-page">
      <CustomerHeader />

      <div className="transport-content-wrapper">
        <div className="page-header">
          <div className="verified-badge">
            <span>✅</span> {t('transportDealers.verifiedDealers', 'Verified Partner Network')}
          </div>
          <h2>{t('transportDealers.availableDealers', 'Available Transport Dealers')}</h2>
          <p className="subtitle">{t('transportDealers.selectDealer', 'Find the perfect transport partner for your delivery based on vehicle type and location')}</p>
        </div>

        {effectivePriceAlert?.showAlert && (
          <div className="page-price-alert">
            <span className="alert-icon">⚠️</span>
            <span className="alert-message">{effectivePriceAlert.message}</span>
          </div>
        )}

        {topRejectionNotice && (
          <div className="page-rejection-alert" role="status" aria-live="polite">
            <span className="alert-icon">❌</span>
            <span className="alert-message">{topRejectionNotice.message}</span>
            <button type="button" className="alert-close-btn" onClick={() => setTopRejectionNotice(null)}>×</button>
          </div>
        )}

        <div className="summary-card">
          <div className="summary-header">
            <h3>📦 {t('payment.orderItems', 'Order Details')}</h3>
          </div>
          <div className="summary-content">
            <div className="summary-item">
              <span className="label">👤 {t('orders.name', 'Farmer')}</span>
              <span className="value">{order.farmerName}</span>
            </div>
            <div className="summary-item">
              <span className="label">📍 {t('transportDealers.pickup', 'Pickup')}</span>
              <span className="value">{order.farmerLocation}</span>
            </div>
            <div className="summary-item">
              <span className="label">⚖️ {t('cart.totalQuantity', 'Total Weight')}</span>
              <span className="value">{order.totalQty} kg</span>
            </div>
            <div className="summary-item">
              <span className="label">💰 {t('cart.totalSellingPrice', 'Product Value')}</span>
              <span className="value">₹{totalProductPrice}</span>
            </div>
            <div className="summary-item">
              <span className="label">🌐 {t('customerAccount.addressCoords', 'GPS Pickup')}</span>
              <span className="value">{formatCoordinates(order?.farmerCoordinates)}</span>
            </div>
            <div className="summary-item">
              <span className="label">🚚 {t('transportDealers.vehicle', 'Vehicle Type')}</span>
              <span className="value"><span className="vehicle-badge">{t(vehicleType) || "N/A"}</span></span>
            </div>
          </div>
        </div>

        <div className="location-section">
          <h3>📍 {t('transportDealers.deliveryAddress', 'Delivery Address')}</h3>
          <div className="input-wrapper" style={{marginBottom: '24px'}}>
            <label className="input-label">🏡 {t('customerAccount.fullLocation', 'Full Address')} <span style={{fontSize:'12px', opacity: 0.6}}>({t('common.optional', 'Optional')})</span></label>
            <textarea
              className="drop-input"
              rows="3"
              value={dropLocationText}
              onChange={(e) => setDropLocationText(e.target.value)}
              placeholder={t('transportDealers.fullAddressPlaceholder', "Enter landmark and exact door no.")}
            />
            <p className="input-hint">{t('transportDealers.exactAddressHint', 'Exact door no. for accurate drop.')}</p>
          </div>

          <div className="location-selectors">
            <div className="selector-group">
              <label>📞 {t('customerAccount.phone', 'Phone Number')} *</label>
              <input
                type="tel"
                className="drop-input"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(normalizePhone(e.target.value).slice(0, 10))}
                placeholder="9XXXXXXXXX"
              />
            </div>
            <div className="selector-group">
              <label>🏠 {t('customerAccount.doorNo', 'Door Number')} <span style={{fontSize:'12px', opacity: 0.6}}>({t('common.optional', 'Optional')})</span></label>
              <input
                type="text"
                className="drop-input"
                value={dropDoorNo}
                onChange={(e) => setDropDoorNo(e.target.value)}
                placeholder="Door No."
              />
            </div>
          </div>

          <div className="location-selectors">
            <div className="selector-group">
              <label>{t('farmerAccount.district', 'District')} *</label>
              <select
                className="location-select"
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedMandal("");
                }}
              >
                <option value="">-- {t('transportDealers.selectDistrict', 'Select District')} --</option>
                {districtsLoading ? <option>{t('common.loading', 'Loading...')}</option> : districts.map((d) => <option key={d.district || d} value={d.district || d}>{t(d.district || d)}</option>)}
              </select>
            </div>
            <div className="selector-group">
              <label>{t('farmerAccount.mandal', 'Mandal')} *</label>
              <select
                className="location-select"
                value={selectedMandal}
                disabled={!selectedDistrict}
                onChange={(e) => {
                  setSelectedMandal(e.target.value);
                  handleLocationChange({ target: { value: `${e.target.value}, ${selectedDistrict}` } });
                }}
              >
                <option value="">-- {t('transportDealers.selectMandal', 'Select Mandal')} --</option>
                {mandals.map((m) => <option key={m.name || m} value={m.name || m}>{m.name || m}</option>)}
              </select>
            </div>
          </div>

          <div className="selector-group" style={{marginTop: '24px'}}>
            <label>🏠 {t('customerAccount.pincode', 'Pincode')} *</label>
            <input
              type="text"
              className="drop-input"
              value={dropPincode}
              onChange={(e) => setDropPincode(e.target.value)}
              placeholder="5XXXXX"
            />
          </div>

          <div style={{marginTop: '24px', padding: '12px 16px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <span style={{fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase'}}>
              🌐 {t('transportDealers.liveCoords', 'Live Drop Coordinates')}
            </span>
            <span style={{fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#1a4d2e'}}>
              {formatCoordinates(dropCoordinates)}
            </span>
          </div>

          <div style={{display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap'}}>
            <button className="location-pin-btn" style={{flex: 1}} onClick={getDropLiveLocation} disabled={loadingDropLocation}>
              {loadingDropLocation ? "⏳ ..." : "📍"} {t('transportDealers.useLiveLocation', 'Use My Live Location')}
            </button>
            {locationSuggestions.length > 0 && (
              <div className="location-suggestions" style={{flex: '1 0 100%'}}>
                {locationSuggestions.map((s, i) => (
                  <span key={i} className="suggestion-chip" onClick={() => { setDropLocationText(s); handleFetchCoordinates(s); }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {hasRouteDistance && (
          <div className="pricing-info-banner">
            <span className="info-icon">ℹ️</span>
            <div className="info-text">
              <strong>{t('transportDealers.priceCalculation', 'Pricing calculated based on distance')}:</strong>
              {" "}{distance}km {t('transportDealers.totalDistance', 'total distance from farmer to your location.')}
            </div>
          </div>
        )}

        <div className="dealers-section">
          <div className="section-header">
            <h3>🏢 {t('transportDealers.nearbyDealers', 'Transport Partners')}</h3>
            {filteredDealers.length > 0 && <span className="dealer-count">{filteredDealers.length} {t('transportDealers.dealersAvailable', 'Available')}</span>}
          </div>

          <div className="dealer-grid">
            {filteredDealers.map((dealer) => (
              <React.Fragment key={dealer._id}>
                {dealer.vehicles.map((vehicle) => {
                  const requestKey = `${dealer._id}-${vehicle._id}`;
                  const chatState = chatRequests[requestKey];
                  const timeRemaining = chatState?.timeRemaining || 0;
                  const isRequestSent = chatState?.status === "SENT" || chatState?.status === "PENDING";
                  const isAccepted = chatState?.status === "ACCEPTED" || dealerResponses[requestKey]?.accepted;
                  return (
                    <div key={vehicle._id} className="dealer-card">
                      <div className="dealer-header">
                        <h4>{dealer.dealerName}</h4>
                        <span className="vehicle-icon">{vehicle.vehicleType.toUpperCase() === 'TRUCK' ? '🚛' : vehicle.vehicleType.toUpperCase() === 'AUTO' ? '🛺' : '🛵'}</span>
                      </div>
                      <div className="dealer-info">
                        <div className="info-row"><span className="info-label">{t('transportDealers.vehicle', 'Mode')}</span><span className="info-value">{vehicle.vehicleName || vehicle.vehicleType}</span></div>
                        <div className="info-row"><span className="info-label">{t('transportDealers.regNo', 'Reg. No')}</span><span className="info-value">{vehicle.licensePlate}</span></div>
                        <div className="info-row"><span className="info-label">{t('transportDealers.capacity', 'Max Load')}</span><span className="info-value">{vehicle.capacity} kg</span></div>
                        <div className="info-row" style={{marginTop: '8px', borderTop: '2px dashed #f1f5f9', paddingTop: '16px'}}>
                          <span className="info-label" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                            💰 {t('transportDealers.fare', 'Est. Fare')}
                            <span title={t('transportDealers.minFareInfo', 'Calculated by distance. Minimum system charge of ₹15 applies to ensure service availability.')} style={{cursor: 'help', opacity: 0.5}}>ⓘ</span>
                          </span>
                          <span className="info-value price">₹{transportCharges[vehicle._id]?.charge || vehicle.quotedPrice}</span>
                        </div>
                      </div>

                      <div className="service-locations" style={{padding: '0 32px 24px', background: 'var(--card-bg)'}}>
                        <div className="location-group">
                          <span className="locations-label" style={{fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', display: 'block'}}>📍 {t('transportDealers.pickupAreas', 'Pickup')}:</span>
                          <div className="locations-chips" style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                            {(vehicle.pickupLocations || []).map((loc, idx) => (
                              <span key={idx} className="location-chip" style={{background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700}}>{loc}</span>
                            ))}
                          </div>
                        </div>
                        <div className="location-group" style={{marginTop: '12px'}}>
                          <span className="locations-label" style={{fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', display: 'block'}}>🎯 {t('transportDealers.dropAreas', 'Drop')}:</span>
                          <div className="locations-chips" style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                            {(vehicle.dropLocations || []).map((loc, idx) => (
                              <span key={idx} className="location-chip" style={{background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700}}>{loc}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="action-buttons">
                        <button className={`initiate-btn ${!dropLocation ? 'disabled-hint' : ''} ${isRequestSent ? "sent" : ""}`} disabled={isRequestSent || isAccepted || loading} onClick={() => initiateChat(dealer, vehicle)}>
                          {isAccepted ? t('common.accepted', '✅ Accepted') : isRequestSent ? `⏳ ${formatTimeRemaining(timeRemaining)}` : !dropLocation ? t('transportDealers.selectDropFirstHint', '📍 Set Address First') : t('transportDealers.requestVehicle', '📬 Request Vehicle')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          {filteredDealers.length === 0 && !loading && <div className="no-dealers"><p>😴 {t('transportDealers.noDealers', 'No transport partners found.')}</p></div>}
          {loading && <div className="no-dealers"><p>🔍 {t('customerAccount.fetching', 'Searching...')}</p></div>}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
