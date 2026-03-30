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
  // All state hooks must be declared at the very top before any useEffect or function
  const [fetchingCoords, setFetchingCoords] = useState(false);
  // NEW: Full Address (free text, independent)
  const [fullAddress, setFullAddress] = useState("");
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

  // Helper to build full address string for geocoding
  function getFullAddress() {
    return [dropDoorNo, dropLocationText, selectedMandal, selectedDistrict, dropState, dropPincode, dropCountry]
      .filter(Boolean)
      .join(", ");
  }

  // Handler to fetch coordinates from address
  async function handleFetchCoordinates(addressOverride) {
    setFetchingCoords(true);
    setCoordsError("");
    try {
      // Build the most complete address possible
      let address = addressOverride || [
        dropLocationText,
        selectedMandal,
        selectedDistrict,
        dropPincode,
        dropState,
        dropCountry
      ].filter(Boolean).join(", ");
      if (typeof address !== 'string') address = String(address || '');
      console.log('[DEBUG] handleFetchCoordinates: address used for geocoding:', address);
      if (!address || address.replace(/[\,\s]/g, "").length < 8) {
        setCoordsError(t('customerAccount.validAddressError', "Please enter a valid address."));
        setFetchingCoords(false);
        return;
      }
      let usedFallback = false;
      let coords = null;
      let triedFallback = false;
      try {
        coords = await geocodeAddress(address);
        console.log('[DEBUG] Geocoding result:', coords);
      } catch (err1) {
        // Only fallback if location text is empty or geocoding fails
        if (!dropLocationText.trim()) {
          let fallbackAddress = [dropPincode, dropState, dropCountry].filter(Boolean).join(', ');
          if (typeof fallbackAddress !== 'string') fallbackAddress = String(fallbackAddress || '');
          console.warn('[DEBUG] Geocoding failed for full address, trying fallback:', fallbackAddress);
          if (!fallbackAddress || fallbackAddress.replace(/[\,\s]/g, "").length < 8) {
            setCoordsError(t('transportDealers.fallbackAddressError', "Please enter a valid pincode, state, and country."));
            setDropCoordinates(null);
            return;
          }
          triedFallback = true;
          try {
            coords = await geocodeAddress(fallbackAddress);
            console.log('[DEBUG] Fallback geocoding result:', coords);
            usedFallback = true;
          } catch (err2) {
            let errorMsg = "Could not fetch coordinates for this address.\n";
            if (err2 && err2.message) {
              errorMsg += "Reason: " + err2.message + "\n";
            }
            errorMsg += "Attempted: " + fallbackAddress;
            setCoordsError(errorMsg);
            setDropCoordinates(null);
            console.error('[DEBUG] Geocoding error (both attempts):', err1, err2);
            return;
          }
        } else {
          setCoordsError(t('customerAccount.coordsFetchError', "Could not fetch coordinates for this address."));
          setDropCoordinates(null);
          console.error('[DEBUG] Geocoding error (full address):', err1);
          return;
        }
      }
      // Validate India bounds
      if (!coords || !isIndiaCoordinates(coords.lat, coords.lon)) {
        setDropCoordinates(null);
        setCoordsError(t('transportDealers.indiaBoundsError', "Could not find valid Indian coordinates for this address."));
        return;
      }
      setDropCoordinates({ lat: coords.lat, lng: coords.lon });
      setCoordsError(usedFallback ? t('transportDealers.pincodeFallbackWarning', 'Warning: Used pincode-level coordinates, may be less accurate.') : "");
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
    // Cleanup
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropPincode]);
  const navigate = useNavigate();

  // Updated per-km rates (lowered)
  const getRatePerKm = (vehicleTypeValue) => {
    const type = String(vehicleTypeValue || "").toUpperCase();
    if (type === "AUTO") return 12; // was 15
    if (type === "TRUCK") return 20; // was 28
    return 6; // was 8
  };

  const appendCoordinateParams = (params, prefix, coords) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    params.set(`${prefix}Lat`, String(lat));
    params.set(`${prefix}Lng`, String(lng));
  };

  const hasCoordinates = (coords) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && isIndiaCoordinates(lat, lng);
  };

  const formatCoordinates = (coords) => {
    if (!hasCoordinates(coords)) return t('notSet', "N/A");
    return `${Number(coords.lat).toFixed(6)}, ${Number(coords.lng).toFixed(6)}`;
  };

  // Weight and distance-based suitability
  function isVehicleSuitable(vehicleType, quantity, distance) {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(distance)) return false;
    const type = (vehicleType || "").toUpperCase();
    if (type === "BIKE") return qty <= 10 && distance <= 5;
    if (type === "AUTO") return qty > 10 && qty <= 50 && distance > 5 && distance <= 25;
    if (type === "TRUCK") return qty > 50 && qty <= 150 && distance > 25;
    return false;
  }

  // Combine weight and distance filtering
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

  /* 💰 Calculate transport charges for all vehicles */
  const calculateAllCharges = (dealersList, distance, quantity) => {
    const charges = {};
    const productPrice = getTotalProductPrice(order);

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

    const chargeList = Object.values(chargesMap || {})
      .map((entry) => Number(entry?.charge) || 0)
      .filter((value) => value > 0);

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
          const response = await fetch(
            `${API_BASE_URL}/locations/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
          );
          const data = await response.json();

          if (data.success) {
            const baseLocation = data.locationText || data.fullAddress || `Lat: ${lat}, Lng: ${lng}`;
            const nearestFamous = Array.isArray(data.famousNearby) && data.famousNearby.length > 0
              ? String(data.famousNearby[0]).trim()
              : "";

            const locationWithLandmark = nearestFamous
              ? `${baseLocation} (Near ${nearestFamous})`
              : baseLocation;

            setDropLocationText(locationWithLandmark);
            setDropPincode(data.pincode || "");
            setDropState(data.state || "");
            setDropCountry(data.country || "");

            const mergedSuggestions = [
              locationWithLandmark,
              baseLocation,
              data.alternativeLocation,
              ...(Array.isArray(data.nearbySuggestions) ? data.nearbySuggestions : []),
            ].filter(Boolean);

            const uniqueSuggestions = Array.from(new Set(mergedSuggestions.map((s) => String(s).trim())));
            setLocationSuggestions(uniqueSuggestions.slice(0, 6));
            setFamousNearby(Array.isArray(data.famousNearby) ? data.famousNearby.slice(0, 5) : []);
          } else {
            setDropLocationText(`Lat: ${lat}, Lng: ${lng}`);
            setLocationSuggestions([]);
            setFamousNearby([]);
          }
        } catch (err) {
          console.error("Reverse geocode failed:", err);
          setDropLocationText(`Lat: ${lat}, Lng: ${lng}`);
          setLocationSuggestions([]);
          setFamousNearby([]);
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

  /* 🔁 Load order and fetch dealers */
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
  }, []);

  /* 📍 Load AP districts on mount */
  useEffect(() => {
    loadDistricts();
  }, []);

  /* 📍 Load mandals when district changes */
  useEffect(() => {
    if (selectedDistrict) {
      loadMandals(selectedDistrict);
    }
  }, [selectedDistrict]);

  useEffect(() => {
    if (dropCoordinates && dropLocation && selectedDistrict && selectedMandal && order) {
      handleLocationChange({ target: { value: dropLocation } });
    }
  }, [dropCoordinates]);

  /* 💰 Calculate transport charges when dealers or distance changes */
  useEffect(() => {
    if (dropLocation && filteredDealers.length > 0 && Number.isFinite(distance) && distance >= 0 && order) {
      calculateAllCharges(filteredDealers, distance, order.totalQty);
    }
  }, [filteredDealers, distance, order, dropLocation]);

  /* � Fetch dealers from backend based on pickup location, drop location, and quantity */
  const fetchDealers = async (orderData) => {
    try {
      setLoading(true);
      setError("");

      // Initially, only filter by pickup location (no drop location selected yet)
      const params = new URLSearchParams({
        pickupLocation: orderData.farmerLocation,
        dropLocation: orderData.farmerLocation, // Same as pickup initially
        quantity: orderData.totalQty,
        productPrice: String(getTotalProductPrice(orderData)),
        pickupOnly: 'true', // Flag to show dealers who can pickup only
      });

      const response = await fetch(`${API_BASE_URL}/transport-dealers/filter?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch dealers");
      }

      const data = await response.json();
      const dealersByWeightAndDistance = filterDealersByWeightAndDistance(data.dealers, orderData.totalQty, data.distance);

      setDistance(data.distance);
      setVehicleType(data.vehicleType);
      setDealers(dealersByWeightAndDistance);
      setFilteredDealers(dealersByWeightAndDistance);
      setPagePriceAlert(data?.priceAlert?.showAlert ? data.priceAlert : null);

      console.log(`✅ Fetched ${data.dealers.length} ${data.vehicleType} dealers (${data.distance}km, weight+distance)`);
    } catch (err) {
      console.error("❌ Error fetching dealers:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* 📍 Load all AP districts */
  const loadDistricts = async () => {
    try {
      setDistrictsLoading(true);
      const response = await fetch(`${API_BASE_URL}/locations/districts`);
      const data = await response.json();
      if (data.success) {
        setDistricts(data.districts);
      }
    } catch (err) {
      console.error("Error loading districts:", err);
    } finally {
      setDistrictsLoading(false);
    }
  };

  /* 📍 Load mandals for selected district */
  const loadMandals = async (district) => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/mandals/${district}`);
      const data = await response.json();
      if (data.success) {
        setMandals(data.mandals);
      }
    } catch (err) {
      console.error("Error loading mandals:", err);
      setMandals([]);
    }
  };

  /* 🔍 Handle drop location change and filter dealers */
  const handleLocationChange = async (e) => {
    const location = e.target.value;
    setDropLocation(location);
    setShowLocationWarning(false);

    if (!location.trim()) {
      setFilteredDealers(dealers);
      setPagePriceAlert(null);
      return;
    }

    if (!order) return;

    try {
      setLoading(true);
      setError("");

      // When drop location is selected, filter by BOTH pickup AND drop
      const params = new URLSearchParams({
        pickupLocation: order.farmerLocation,
        dropLocation: location,
        quantity: order.totalQty,
        productPrice: String(getTotalProductPrice(order)),
        // pickupOnly is NOT set - backend will filter by both locations
      });

      appendCoordinateParams(params, "pickup", order?.farmerCoordinates);
      appendCoordinateParams(params, "drop", dropCoordinates);

      const response = await fetch(`${API_BASE_URL}/transport-dealers/filter?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to filter dealers");
      }

      const data = await response.json();
      const dealersByWeightAndDistance = filterDealersByWeightAndDistance(data.dealers, order.totalQty, data.distance);

      setDistance(data.distance);
      setVehicleType(data.vehicleType);
      setFilteredDealers(dealersByWeightAndDistance);
      setPagePriceAlert(data?.priceAlert?.showAlert ? data.priceAlert : null);

      if (dealersByWeightAndDistance.length === 0) {
        setShowLocationWarning(true);
      }

      console.log(`✅ Filtered ${data.dealers.length} ${data.vehicleType} dealers for ${location} (weight+distance)`);
    } catch (err) {
      console.error("❌ Error filtering dealers:", err.message);
      setError(err.message);
      setShowLocationWarning(true);
      setPagePriceAlert(null);
    } finally {
      setLoading(false);
    }
  };

  /* 📬 INITIATE CHAT - Send notification to dealer */
  const initiateChat = async (dealer, vehicle) => {
    if (
      !dropLocation ||
      !selectedMandal ||
      !selectedDistrict ||
      !dropCountry.trim() ||
      !dropState.trim() ||
      !dropPincode.trim() ||
      !dropLocationText.trim() ||
      !isValidPhone(customerPhone)
    ) {
      alert(t('transportDealers.fillFieldsWarning', "⚠️ Please fill all mandatory fields and enter a valid Indian mobile number (+91 9XXXXXXXXX) before requesting this vehicle."));
      return;
    }

    const currentRole = localStorage.getItem("userRole");
    if (currentRole !== "customer") {
      alert(t('transportDealers.customerLoginWarning', "⚠️ Please login with a customer account to request a vehicle."));
      return;
    }

    try {
      setLoading(true);

      const cropNames = Array.from(new Set(
        (order?.items || [])
          .map((item) => item?.cropName || item?.name || item?.crop || item?.cropType || item?.productName || "")
          .map((name) => String(name).trim())
          .filter(Boolean)
      ));

      const cropItem = cropNames[0]
        || order?.cropName
        || order?.cropType
        || order?.crop
        || "";

      const cropDetails = cropNames.length > 0 ? cropNames.join(", ") : cropItem;

      const requestBody = {
        dealerId: dealer.dealerId,
        pickupLocation: order.farmerLocation,
        dropLocation: dropLocation,
        quantity: order.totalQty,
        farmerName: order.farmerName,
        farmerLocation: order.farmerLocation,
        cropItem,
        cropDetails,
        quotedPrice: vehicle.quotedPrice,
        pricing: {
          baseCharge: Number(vehicle.baseTransportCharge || vehicle.pricingBreakdown?.baseCharge || vehicle.quotedPrice || 0),
          finalCharge: Number(vehicle.transportCharge || vehicle.quotedPrice || 0),
          batchDiscount: Number(vehicle.batchDiscount || 0),
          batchDiscountRate: Number(vehicle.batchDiscountRate || 0),
          batchDiscountRatePct: Number(vehicle.batchDiscountRatePct || 0),
          dealerPayout: Number(vehicle.dealerPayout || vehicle.transportCharge || vehicle.quotedPrice || 0),
          platformContribution: Number(vehicle.platformContribution || 0),
          incentivePreview: vehicle.incentivePreview || {
            eligible: false,
            dealerBonus: 0,
            farmerBonus: 0,
            totalBonus: 0,
          },
        },
        vehicleType: vehicle.vehicleType,
        vehicleId: vehicle._id,
        vehicleName: vehicle.vehicleName,
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
        fullAddress: fullAddress,
      };

      const data = await apiPost("transport-dealers/request", requestBody);
      const requestId = data.requestId;

      console.log(`📬 Request sent to ${dealer.dealerName}. RequestID: ${requestId}`);

      const requestKey = `${dealer._id}-${vehicle._id}`;

      try {
        const existing = JSON.parse(localStorage.getItem(PENDING_DEALER_REQUESTS_KEY) || "[]");
        const next = [
          ...existing.filter((item) => String(item.requestId) !== String(requestId)),
          {
            requestId,
            dealerId: dealer.dealerId,
            createdAt: Date.now(),
          },
        ];
        localStorage.setItem(PENDING_DEALER_REQUESTS_KEY, JSON.stringify(next));
      } catch (storageErr) {
        console.warn("Could not persist pending dealer request", storageErr);
      }

      setTopRejectionNotice(null);

      // ✅ Update UI to show "Waiting for response"
      setChatRequests((prev) => ({
        ...prev,
        [requestKey]: {
          status: "SENT",
          timestamp: Date.now(),
          requestId,
          timeRemaining: 5 * 60 * 1000, // 5 minutes in milliseconds
        },
      }));

      // ✅ Start countdown timer for 5 minutes
      startRequestTimer(requestKey, requestId, data.expiresAt, dealer.dealerId, dealer.dealerName, vehicle);
    } catch (err) {
      console.error("❌ Error sending request:", err.message);
      alert(t('transportDealers.requestError', "Failed to send request"));
    } finally {
      setLoading(false);
    }
  };

  /* ⏱️ Start 5-minute countdown timer */
  const startRequestTimer = (requestKey, requestId, expiresAt, dealerId, dealerName, vehicle) => {
    if (timers[requestKey]) {
      clearInterval(timers[requestKey]);
    }

    const expiryTime = new Date(expiresAt).getTime();

    const intervalId = setInterval(async () => {
      const now = Date.now();
      const timeRemaining = Math.max(0, expiryTime - now);

      try {
        const response = await fetch(`${API_BASE_URL}/transport-dealers/request/${requestId}`);
        const data = await response.json();

        let shouldAlertRejected = false;

        setChatRequests((prev) => {
          const previousStatus = prev[requestKey]?.status;
          if (data.status === "REJECTED" && previousStatus !== "REJECTED") {
            shouldAlertRejected = true;
          }

          return {
            ...prev,
            [requestKey]: {
              ...prev[requestKey],
              timeRemaining,
              status: data.status,
              rejectReason: data.rejectReason || "",
            },
          };
        });

        if (data.status === "ACCEPTED") {
          try {
            const existing = JSON.parse(localStorage.getItem(PENDING_DEALER_REQUESTS_KEY) || "[]");
            localStorage.setItem(
              PENDING_DEALER_REQUESTS_KEY,
              JSON.stringify(existing.filter((item) => String(item.requestId) !== String(requestId)))
            );
          } catch (_) {}

          clearInterval(intervalId);
          setTimers((prev) => ({ ...prev, [requestKey]: null }));
          setDealerResponses((prev) => ({
            ...prev,
            [requestKey]: { accepted: true, timestamp: Date.now() },
          }));
          openChat(dealerId, requestId, vehicle, data.chatId);
        } else if (data.status === "REJECTED") {
          try {
            const existing = JSON.parse(localStorage.getItem(PENDING_DEALER_REQUESTS_KEY) || "[]");
            localStorage.setItem(
              PENDING_DEALER_REQUESTS_KEY,
              JSON.stringify(existing.filter((item) => String(item.requestId) !== String(requestId)))
            );
          } catch (_) {}

          clearInterval(intervalId);
          setTimers((prev) => ({ ...prev, [requestKey]: null }));
          setChatRequests((prev) => ({
            ...prev,
            [requestKey]: {
              ...prev[requestKey],
              status: "REJECTED",
              timeRemaining: 0,
              rejectReason: data.rejectReason || "",
            },
          }));

          if (shouldAlertRejected) {
            setTopRejectionNotice({
              requestKey,
              dealerName: dealerName || t('transportDealers.dealer', "Dealer"),
              message: t('transportDealers.rejectedMsg', "Request was declined. Dealer may be busy. Please try again in 5-10 minutes or choose another dealer."),
              timestamp: Date.now(),
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        } else if (data.status === "EXPIRED") {
          try {
            const existing = JSON.parse(localStorage.getItem(PENDING_DEALER_REQUESTS_KEY) || "[]");
            localStorage.setItem(
              PENDING_DEALER_REQUESTS_KEY,
              JSON.stringify(existing.filter((item) => String(item.requestId) !== String(requestId)))
            );
          } catch (_) {}

          clearInterval(intervalId);
          setTimers((prev) => ({ ...prev, [requestKey]: null }));
          setChatRequests((prev) => ({
            ...prev,
            [requestKey]: { ...prev[requestKey], status: "EXPIRED", timeRemaining: 0 },
          }));
        }
      } catch (err) {
        console.error("❌ Error checking request status:", err.message);
      }

      if (timeRemaining <= 0) {
        try {
          const existing = JSON.parse(localStorage.getItem(PENDING_DEALER_REQUESTS_KEY) || "[]");
          localStorage.setItem(
            PENDING_DEALER_REQUESTS_KEY,
            JSON.stringify(existing.filter((item) => String(item.requestId) !== String(requestId)))
          );
        } catch (_) {}

        clearInterval(intervalId);
        setTimers((prev) => ({ ...prev, [requestKey]: null }));
        setChatRequests((prev) => ({
          ...prev,
          [requestKey]: { ...prev[requestKey], status: "EXPIRED", timeRemaining: 0 },
        }));
      }
    }, 1000);

    setTimers((prev) => ({ ...prev, [requestKey]: intervalId }));
  };

  /* 💬 OPEN CHAT - After dealer accepts */
  const openChat = (dealerId, requestId, vehicle, chatId) => {
    const dealer = filteredDealers.find(d => d.dealerId === dealerId);
    if (!dealer) return;

    const currentUser = JSON.parse(localStorage.getItem("registeredUser") || "{}");

    localStorage.setItem(
      "activeChat",
      JSON.stringify({
        chatId: chatId || null,
        customerId: currentUser.id || null,
        farmerName: order.farmerName,
        farmerLocation: order.farmerLocation,
        dealerId: dealerId,
        dealerName: dealer.dealerName,
        dealerPrice: vehicle.quotedPrice,
        pricing: {
          baseCharge: Number(vehicle.baseTransportCharge || vehicle.pricingBreakdown?.baseCharge || vehicle.quotedPrice || 0),
          finalCharge: Number(vehicle.transportCharge || vehicle.quotedPrice || 0),
          batchDiscount: Number(vehicle.batchDiscount || 0),
          batchDiscountRate: Number(vehicle.batchDiscountRate || 0),
          batchDiscountRatePct: Number(vehicle.batchDiscountRatePct || 0),
          dealerPayout: Number(vehicle.dealerPayout || vehicle.transportCharge || vehicle.quotedPrice || 0),
          platformContribution: Number(vehicle.platformContribution || 0),
          incentivePreview: vehicle.incentivePreview || {
            eligible: false,
            dealerBonus: 0,
            farmerBonus: 0,
            totalBonus: 0,
          },
        },
        vehicle: vehicle.vehicleType,
        vehicleId: vehicle._id,
        licensePlate: vehicle.licensePlate,
        totalQty: order.totalQty,
        distance,
        pickup: order.farmerLocation,
        pickupCoordinates: order.farmerCoordinates,
        drop: dropLocation,
        customerAddress: {
          phone: `+91${normalizePhone(customerPhone)}`,
          doorNo: dropDoorNo,
          country: dropCountry,
          state: dropState,
          district: selectedDistrict,
          mandal: selectedMandal,
          pincode: dropPincode,
          locationText: dropLocationText,
          coordinates: dropCoordinates,
        },
        status: "ACCEPTED",
        messages: [],
        requestId: requestId,
      })
    );

    navigate("/chat");
  };

  /* 📊 Format time remaining */
  const formatTimeRemaining = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!order) return <h3>{t('transportDealers.noOrderFound', 'No transport order found')}</h3>;

  const totalProductPrice = getTotalProductPrice(order);
  // Only show distance if both pickup and drop coordinates are present
  const hasRouteDistance = dropLocation && Number.isFinite(distance) && distance >= 0 && hasCoordinates(order?.farmerCoordinates) && hasCoordinates(dropCoordinates);
  const distanceSource = hasCoordinates(order?.farmerCoordinates) && hasCoordinates(dropCoordinates)
    ? "Exact GPS"
    : "Coordinates missing";
  const fallbackPriceAlert = getClientPriceAlert(transportCharges, totalProductPrice, Boolean(dropLocation));
  const effectivePriceAlert = pagePriceAlert?.showAlert ? pagePriceAlert : fallbackPriceAlert;

  return (
    <div className="transport-page">
      <CustomerHeader />

      <div className="page-header">
        <h2>🚚 {t('transportDealers.title', 'Transport Dealers')}</h2>
        <p className="subtitle">{t('transportDealers.selectDealer', 'Find the perfect transport partner for your delivery')}</p>
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
          <span className="alert-message">
            {topRejectionNotice.message}
          </span>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setTopRejectionNotice(null)}
            aria-label={t('common.dismiss', "Dismiss")}
          >
            ×
          </button>
        </div>
      )}

      {/* 📦 ORDER SUMMARY */}
      <div className="summary-card">
        <div className="summary-header">
          <h3>📦 {t('payment.orderItems', 'Order Summary')}</h3>
        </div>
        <div className="summary-content">
          <div className="summary-item">
            <span className="label">👨‍🌾 {t('orders.name', 'Farmer')}:</span>
            <span className="value">{order.farmerName}</span>
          </div>
          <div className="summary-item">
            <span className="label">📍 {t('transportDealers.pickup', 'Pickup Location')}:</span>
            <span className="value">{order.farmerLocation}</span>
          </div>
          <div className="summary-item">
            <span className="label">⚖️ {t('cart.totalQuantity', 'Total Quantity')}:</span>
            <span className="value">{order.totalQty} kg</span>
          </div>
          <div className="summary-item">
            <span className="label">💵 {t('cart.totalSellingPrice', 'Crop Price')}:</span>
            <span className="value">Rs.{totalProductPrice}</span>
          </div>
          <div className="summary-item">
            <span className="label">📍 {t('customerAccount.addressCoords', 'Pickup Coordinates')}:</span>
            <span className="value">{formatCoordinates(order?.farmerCoordinates)}</span>
          </div>
          <div className="summary-item">
            <span className="label">🚛 {t('transportDealers.vehicle', 'Selected Vehicle')}:</span>
            <span className="value vehicle-badge">{vehicleType || t('customerAccount.fetching', "Loading...")}</span>
          </div>
        </div>
      </div>

      {/* 📍 DROP LOCATION - DISTRICT & MANDAL SELECTORS */}
      <div className="location-section">
        <div className="input-wrapper">
          <label className="input-label">📍 {t('transportDealers.deliveryAddress', 'Delivery Address Details')}</label>

          {/* NEW: Full Address (free text, independent) */}
          <div className="location-selectors">
            <div className="selector-group" style={{ width: '100%' }}>
              <label htmlFor="full-address">{t('customerAccount.fullLocation', 'Full Address')} ({t('common.optional', 'optional')})</label>
              <textarea
                id="full-address"
                className="location-select"
                style={{ minHeight: 48, resize: 'vertical', width: '100%' }}
                value={fullAddress}
                onChange={e => setFullAddress(e.target.value)}
                placeholder={t('transportDealers.fullAddressPlaceholder', "Enter full delivery address (if available).")}
              />
              <span className="input-hint" style={{ fontSize: 13, color: '#666' }}>
                {t('transportDealers.fullAddressHint', 'This field is for your reference only.')}
              </span>
            </div>
          </div>

          <div className="location-selectors">
            <div className="selector-group">
              <label htmlFor="customer-phone">{t('customerAccount.phone', 'Phone Number')} *</label>
              <input
                id="customer-phone"
                className="location-select"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(normalizePhone(e.target.value).slice(0, 10))}
                placeholder="9876543210"
              />
            </div>

            <div className="selector-group">
              <label htmlFor="drop-door">{t('customerAccount.doorNo', 'Door/House No')} ({t('common.optional', 'Optional')})</label>
              <input
                id="drop-door"
                className="location-select"
                value={dropDoorNo}
                onChange={(e) => setDropDoorNo(e.target.value)}
                placeholder={t('customerAccount.doorNo', "Door/House No")}
              />
            </div>
          </div>
          
          <div className="location-selectors">
            <div className="selector-group">
              <label htmlFor="drop-country">{t('customerAccount.country', 'Country')} *</label>
              <input
                id="drop-country"
                className="location-select"
                value={dropCountry}
                onChange={(e) => setDropCountry(e.target.value)}
                placeholder={t('customerAccount.country', "Country")}
              />
            </div>

            <div className="selector-group">
              <label htmlFor="drop-state">{t('customerAccount.state', 'State')} *</label>
              <input
                id="drop-state"
                className="location-select"
                value={dropState}
                onChange={(e) => setDropState(e.target.value)}
                placeholder={t('customerAccount.state', "State")}
              />
            </div>
          </div>

          <div className="location-selectors">
            <div className="selector-group">
              <label htmlFor="district">{t('customerAccount.district', 'District')}:</label>
              <select
                id="district"
                className="location-select"
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedMandal(""); // Reset mandal when district changes
                  setDropLocation(""); // Reset drop location
                  setDropCoordinates(null);
                }}
                disabled={districtsLoading || loading}
              >
                <option value="">{t('customerAccount.selectDistrict', "Select District...")}</option>
                {districts.map((dist) => (
                  <option key={dist.code} value={dist.district}>
                    {dist.district} ({dist.mandalCount} mandals)
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label htmlFor="mandal">{t('customerAccount.mandal', 'Mandal')} *</label>
              <select
                id="mandal"
                className="location-select"
                value={selectedMandal}
                onChange={(e) => {
                  setSelectedMandal(e.target.value);
                  // Format drop location as "Mandal, District" to match pickup location format
                  const formattedLocation = e.target.value ? `${e.target.value}, ${selectedDistrict}` : "";
                  setDropLocation(formattedLocation);
                  setDropCoordinates(null);
                  if (order && formattedLocation) {
                    handleLocationChange({ target: { value: formattedLocation } });
                  }
                }}
                disabled={!selectedDistrict || mandals.length === 0 || loading}
              >
                <option value="">{t('customerAccount.selectMandal', "Select Mandal...")}</option>
                {mandals.map((mandal) => (
                  <option key={mandal.name} value={mandal.name}>
                    {mandal.name}
                  </option>
                ))}
              </select>
            </div>
          </div>


          <div className="location-selectors">
            <div className="selector-group">
              <label htmlFor="drop-pincode">{t('customerAccount.pincode', 'Pincode')} *</label>
              <input
                id="drop-pincode"
                className="location-select"
                value={dropPincode}
                onChange={(e) => setDropPincode(e.target.value)}
                placeholder={t('customerAccount.pincode', "Pincode")}
                autoComplete="postal-code"
              />
            </div>
          </div>

          {/* Coordinates row (below pincode, like Account page) */}
          <div className="location-selectors">
            <div className="selector-group">
              <label htmlFor="drop-coordinates">{t('customerAccount.addressCoords', 'Address Coordinates')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1a4d2e', fontSize: '15px' }}>
                  {dropCoordinates && dropCoordinates.lat && dropCoordinates.lng
                    ? `${Number(dropCoordinates.lat).toFixed(6)}, ${Number(dropCoordinates.lng).toFixed(6)}`
                    : '--'}
                </span>
                <button
                  type="button"
                  className="fetch-coords-btn"
                  onClick={handleFetchCoordinates}
                  disabled={fetchingCoords}
                  style={{
                    background: 'linear-gradient(90deg, #4caf50 60%, #2196f3 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: fetchingCoords ? 'not-allowed' : 'pointer',
                  }}
                >
                  {fetchingCoords ? t('customerAccount.fetching', 'Fetching...') : t('customerAccount.fetchFromAddress', 'Fetch from Address')}
                </button>
                {coordsError && (
                  <span style={{ color: 'red', marginLeft: 8, fontSize: '13px' }}>{coordsError}</span>
                )}
              </div>
            </div>
          </div>

          {/* Location row (no Address Coordinator button here) */}
          <div className="location-selectors">
            <div className="selector-group">
              <label htmlFor="drop-location-text">{t('customerAccount.location', 'Location')} *</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="drop-location-text"
                  className="location-select"
                  value={dropLocationText}
                  onChange={(e) => setDropLocationText(e.target.value)}
                  placeholder={t('transportDealers.locationPlaceholder', "Type manually or tap location icon")}
                  autoComplete="address-line2"
                />
                <button
                  type="button"
                  className="location-pin-btn"
                  onClick={getDropLiveLocation}
                  disabled={loadingDropLocation}
                  title={t('customerAccount.useCurrentLocation', "Use current location")}
                >
                  {loadingDropLocation ? "..." : "📍"}
                </button>
              </div>
              {locationSuggestions.length > 0 && (
                <div className="location-suggestions">
                  {locationSuggestions.map((suggestion, idx) => (
                    <button
                      key={`${suggestion}-${idx}`}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => setDropLocationText(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {famousNearby.length > 0 && (
                <div className="famous-nearby">
                  <span className="famous-title">{t('customerAccount.nearbyFamousPlaces', 'Nearby famous place(s):')}</span>
                  <span className="famous-value">
                    {famousNearby.map((place, idx) => (
                      <button
                        key={`${place}-${idx}`}
                        type="button"
                        className="famous-chip"
                        onClick={() => {
                          const current = (dropLocationText || "").trim();
                          const cleaned = current.replace(/\s*\(Near\s+[^)]+\)\s*$/i, "").trim();
                          const nextValue = cleaned ? `${cleaned} (Near ${place})` : String(place);
                          setDropLocationText(nextValue);
                        }}
                      >
                        {place}
                      </button>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="input-hint">
            {selectedMandal && hasCoordinates(order?.farmerCoordinates) && hasCoordinates(dropCoordinates)
              ? t('transportDealers.distanceInfo', {
                  defaultValue: 'Door-to-door distance: {{distance}}km | Showing {{type}} dealers from {{pickup}} to {{drop}}',
                  distance,
                  type: vehicleType,
                  pickup: order.farmerLocation,
                  drop: `${selectedMandal}, ${selectedDistrict}`
                })
              : selectedMandal
                ? t('transportDealers.coordsWarning', {
                    defaultValue: '⚠️ Please fetch coordinates for both pickup and drop locations to show accurate distance. Currently showing dealers who can pickup from: {{pickup}}',
                    pickup: order.farmerLocation
                  })
                : t('transportDealers.mandalWarning', {
                    defaultValue: '⚠️ Fill mandatory fields and select drop location to see route-specific dealers. Currently showing dealers who can pickup from: {{pickup}}',
                    pickup: order.farmerLocation
                  })}
          </p>
          <p className="input-hint">
            {t('myOrders.distanceSource', 'Distance Source')}: {distanceSource} | {t('transportDealers.dropCoords', 'Drop coordinates')}: {formatCoordinates(dropCoordinates)}
            {!hasCoordinates(order?.farmerCoordinates) || !hasCoordinates(dropCoordinates) ? (
              <span style={{ color: 'red', fontWeight: 600, marginLeft: 8 }}>
                {t('transportDealers.preciseLocationWarning', '⚠️ Please use "Fetch from Address" or location pin for both pickup and drop to enable accurate distance and transport charge calculation.')}
              </span>
            ) : null}
          </p>

          {/* Delivery Charge Explanation Section */}
          <div style={{
            background: '#eaf7ed',
            border: '1px solid #b2dfdb',
            borderRadius: '8px',
            padding: '14px 18px',
            margin: '18px 0 10px 0',
            color: '#0f2f1a',
            fontSize: '15px',
            lineHeight: 1.7,
            boxShadow: '0 2px 8px rgba(33,150,243,0.04)'
          }}>
            <strong>{t('transportDealers.howCalculatedTitle', 'How Delivery Charges Are Calculated')}:</strong>
            <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
              <li>
                <b>{t('transportDealers.distance', 'Distance')}</b> {t('transportDealers.distanceExpl', 'is calculated using coordinates.')}
              </li>
              <li>
                <b>{t('myOrders.finalDeliveryCharge', 'Delivery charge')}</b> = <b>{t('myOrders.baseDelivery', 'Base fare')}</b> + {t('transportDealers.chargeExpl', 'Distance charge + discounts.')}
              </li>
              <li>
                <b>{t('transportDealers.perKmRates', 'Per-kilometer rates')}</b>: {t('transportDealers.ratesList', 'Bike ₹6/km, Auto ₹12/km, Truck ₹20/km.')}
              </li>
              <li>
                <b>{t('myOrders.batchDiscount', 'Batch Discount')}</b> {t('transportDealers.batchExpl', 'applies for grouped orders.')}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ❌ ERROR MESSAGE */}
      {error && (
        <div style={{ color: "red", padding: "10px", marginBottom: "10px", backgroundColor: "#fee" }}>
          ⚠️ {error}
        </div>
      )}

      {/* 🚛 DEALERS */}
      <div className="dealers-section">
        <div className="section-header">
          <h3>
            {dropLocation
              ? `🔍 ${t('transportDealers.dealersForRoute', { 
                  defaultValue: '{{type}} Dealers: {{pickup}} → {{drop}}',
                  type: vehicleType,
                  pickup: order.farmerLocation,
                  drop: dropLocation
                })}`
              : `🚛 ${t('transportDealers.pickupDealers', { 
                  defaultValue: 'Dealers Available for Pickup from {{pickup}}',
                  pickup: order.farmerLocation
                })}`}
          </h3>
          <span className="dealer-count">
            {loading ? t('customerAccount.fetching', 'Loading...') : t('transportDealers.dealersFound', { 
              defaultValue: '{{count}} Dealer Found', 
              count: filteredDealers.length 
            })}
          </span>
        </div>

        {dropLocation && filteredDealers.length > 0 && (
          <div className="pricing-info-banner">
            <span className="info-icon">ℹ️</span>
            <span className="info-text">
              {t('transportDealers.pricingExplBanner', 'Delivery price shows Base Delivery, Batch Discount, and Final Delivery. This matches the dealer and order summary.')}
            </span>
          </div>
        )}

        {showLocationWarning && (
          <div className="warning-message">
            ⚠️ {t('transportDealers.noDealersForLocation', { 
              defaultValue: 'No dealers available for "{{location}}". Try a different location.',
              location: dropLocation
            })}
          </div>
        )}

        <div className="dealer-grid">
          {filteredDealers.map((dealer) => {
            return (
              <div key={dealer._id} className="dealer-card">
                <div className="dealer-header">
                  <h4>{dealer.dealerName}</h4>
                  {dealer.dealerVerified && (
                    <span className="verified-badge">✅ {t('customerAccount.verified', 'Verified')}</span>
                  )}
                </div>

                {dealer.vehicles.map((vehicle) => {
                  const requestKey = `${dealer._id}-${vehicle._id}`;
                  const isRequestSent = chatRequests[requestKey]?.status === "SENT";
                  const isExpired = chatRequests[requestKey]?.status === "EXPIRED";
                  const isRejected = chatRequests[requestKey]?.status === "REJECTED";
                  const isAccepted = dealerResponses[requestKey]?.accepted;
                  const timeRemaining = chatRequests[requestKey]?.timeRemaining;

                  return (
                    <div key={vehicle._id} className="dealer-vehicle-card">
                      <div className="dealer-info">
                        <div className="info-row">
                          <span className="info-label">{t('transportDealers.vehicle', 'Vehicle')}:</span>
                          <span className="info-value">{vehicle.vehicleType}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">{t('orders.name', 'Name')}:</span>
                          <span className="info-value">{vehicle.vehicleName || "-"}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Reg. Number:</span>
                          <span className="info-value">{vehicle.licensePlate}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">{t('transportDealers.capacity', 'Capacity')}:</span>
                          <span className="info-value">{vehicle.capacity} kg</span>
                        </div>
                        <div className="info-row price-row">
                          <span className="info-label">💰 {dropLocation ? t('myOrders.finalDeliveryCharge', 'Transport Charge:') : t('transportDealers.quote', 'Quote:')}</span>
                          <span className="info-value price">
                            {hasRouteDistance ? (
                              <>
                                ₹{transportCharges[vehicle._id]?.charge || vehicle.quotedPrice}
                                <span className="price-detail">
                                  {' '}({distance}km)
                                </span>
                              </>
                            ) : (
                              <span style={{ color: "#888" }}>
                                {(!hasCoordinates(order?.farmerCoordinates) || !hasCoordinates(dropCoordinates))
                                  ? t('transportDealers.fetchCoordsInstruction', "Fetch coordinates for both pickup and drop to see price and distance")
                                  : t('transportDealers.selectDropInstruction', "Select drop location to see price")}
                              </span>
                            )}
                          </span>
                        </div>
@/c:\Users\konch\OneDrive\Desktop\agrimart-client\src\pages\TransportDealers.js:1323
                        {hasRouteDistance && Number(transportCharges[vehicle._id]?.batchDiscount || 0) > 0 && (
                          <div className="info-row">
                            <span className="info-label">{t('myOrders.batchDiscount', 'Batch Discount')}:</span>
                            <span className="info-value" style={{ color: "#2e7d32", fontWeight: 700 }}>
                              -₹{Number(transportCharges[vehicle._id]?.batchDiscount || 0).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* 📋 Transport Charge Breakdown */}
                        {hasRouteDistance && transportCharges[vehicle._id]?.breakdown && (
                          <>
                            {Array.isArray(transportCharges[vehicle._id].breakdown.slabBreakdown) && transportCharges[vehicle._id].breakdown.slabBreakdown.length > 0 && (
                              <div className="slab-breakdown" style={{marginBottom:'8px', fontSize:'13px', color:'#444'}}>
                                <div style={{fontWeight:'bold', marginBottom:'2px'}}>Distance Slab Breakdown:</div>
                                {transportCharges[vehicle._id].breakdown.slabBreakdown.map((slab, idx) => (
                                  <div key={idx} style={{marginLeft:'8px'}}>
                                    {slab.distance} km × ₹{slab.rate}/km = ₹{slab.amount}
                                  </div>
                                ))}
                              </div>
                            )}
                             <div className="transport-breakdown">
                               <div className="breakdown-row">
                                 <span>{t('myOrders.baseDelivery', 'Base Fare')} ({t('common.minimum', 'Minimum')}):</span>
                                 <span>₹{Number(transportCharges[vehicle._id].breakdown.minimumBaseCharge).toFixed(2)} <span style={{fontSize:'12px',color:'#888'}}>({t('common.minimumCharge', 'Minimum charge')})</span></span>
                               </div>
                               <div className="breakdown-row">
                                 <span>{t('transportDealers.distanceCharge', 'Distance Charge')}:</span>
                                 <span>
                                   ₹{Number(transportCharges[vehicle._id].breakdown.slabDistanceTotal).toFixed(2)}
                                   <span style={{fontSize:'12px',color:'#888',marginLeft:'4px'}}>
                                     ({Number(transportCharges[vehicle._id].breakdown.distance).toFixed(1)} km × ₹6/km)
                                   </span>
                                 </span>
                               </div>
                               <div className="breakdown-row">
                                 <span>{t('transportDealers.appliedFare', 'Applied Fare')}:</span>
                                 <span>
                                   ₹{Number(transportCharges[vehicle._id].breakdown.baseCharge).toFixed(2)}
                                   <span style={{fontSize:'12px',color:'#888',marginLeft:'4px'}}>
                                     ({t('transportDealers.higherOfMsg', 'Higher of minimum or distance charge')})
                                   </span>
                                 </span>
                               </div>
                               {transportCharges[vehicle._id].breakdown.loadCharge > 0 && (
                                 <div className="breakdown-row">
                                   <span>{t('transportDealers.loadCharge', 'Load Charge')}:</span>
                                   <span>₹{Number(transportCharges[vehicle._id].breakdown.loadCharge).toFixed(2)}</span>
                                 </div>
                               )}
                               {Number(transportCharges[vehicle._id].breakdown.batchDiscount || 0) > 0 && (
                                 <div className="breakdown-row">
                                   <span>{t('myOrders.batchDiscount', 'Batch Discount')}:</span>
                                   <span>-₹{Number(transportCharges[vehicle._id].breakdown.batchDiscount).toFixed(2)}</span>
                                 </div>
                               )}
                               <div className="breakdown-row total">
                                 <span>{t('myOrders.finalDeliveryCharge', 'Final Transport Charge')}:</span>
                                 <span>
                                   ₹{Number(transportCharges[vehicle._id].breakdown.finalCharge || transportCharges[vehicle._id].breakdown.totalCharge).toFixed(2)}
                                   <span style={{fontSize:'12px',color:'#888',marginLeft:'4px'}}>({t('transportDealers.afterDiscounts', 'Applied fare minus any discounts')})</span>
                                 </span>
                               </div>
                             </div>
                          </>
                        )}

                      </div>

                      <div className="service-locations">
                        <span className="locations-label">📍 Pickup:</span>
                        <div className="locations-chips">
                          {vehicle.pickupLocations.slice(0, 3).map((loc, idx) => (
                            <span key={`${vehicle._id}-pickup-${idx}`} className="location-chip">
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>

                       <div className="service-locations">
                        <span className="locations-label">🎯 {t('transportDealers.drop', 'Drop')}:</span>
                        <div className="locations-chips">
                          {vehicle.dropLocations.slice(0, 3).map((loc, idx) => (
                            <span key={`${vehicle._id}-drop-${idx}`} className="location-chip">
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>
@/c:\Users\konch\OneDrive\Desktop\agrimart-client\src\pages\TransportDealers.js:1414
                       <div className="action-buttons">
                         <button
                           className={`initiate-btn ${isRequestSent ? "sent" : ""} ${isAccepted ? "accepted" : ""} ${isExpired ? "expired" : ""} ${!dropLocation ? "disabled-hint" : ""}`}
                           onClick={() => initiateChat(dealer, vehicle)}
                           disabled={isRequestSent || isAccepted || isExpired || loading}
                         >
                           {isAccepted ? (
                             t('transportDealers.acceptedBtn', "✅ Dealer Accepted!")
                           ) : isRejected ? (
                             t('transportDealers.requestAgainBtn', "📬 Request Again")
                           ) : isExpired ? (
                             t('transportDealers.expiredBtn', "❌ Request Expired")
                           ) : isRequestSent ? (
                             `⏳ ${formatTimeRemaining(timeRemaining)}`
                           ) : !dropLocation ? (
                             t('transportDealers.selectDropFirstHint', "📍 Select Drop Location First")
                           ) : (
                             t('transportDealers.requestVehicle', "📬 Request This Vehicle")
                           )}
                         </button>
                       </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {filteredDealers.length === 0 && !showLocationWarning && !loading && (
          <div className="no-dealers">
            <p>{t('transportDealers.noDealers', 'No dealers available')}</p>
          </div>
        )}

        {loading && (
          <div className="no-dealers">
            <p>{t('customerAccount.fetching', 'Loading dealers...')}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
