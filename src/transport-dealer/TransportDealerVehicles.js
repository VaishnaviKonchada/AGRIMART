import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import { API_BASE_URL } from "../utils/api";
import "../styles/TransportDealerVehicles.css";
const parseJsonResponse = async response => {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    const snippet = text.trim().slice(0, 120);
    if (snippet.startsWith("<!DOCTYPE") || snippet.toLowerCase().includes("<html")) {
      throw new Error(`API returned HTML instead of JSON (status ${response.status}). Please confirm backend is running on ${API_BASE_URL} and you are logged in.`);
    }
    throw new Error(`Invalid JSON response (status ${response.status}): ${snippet}`);
  }
};
export default function TransportDealerVehicles() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const formRef = useRef(null);
  const isValidCalendarDate = (day, month, year) => {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };
  const normalizeInsuranceExpiry = value => {
    if (!value) return "";
    const raw = String(value).trim();
    const dmyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      return isValidCalendarDate(day, month, year) ? raw : "";
    }
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      if (!isValidCalendarDate(day, month, year)) return "";
      return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(year)}`;
    }
    return "";
  };
  const formatInsuranceInput = inputValue => {
    const digits = String(inputValue || "").replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  };
  const isValidInsuranceInput = value => /^\d{2}-\d{2}-\d{4}$/.test(value) && !!normalizeInsuranceExpiry(value);
  const normalizeVehicleType = type => {
    if (!type) return "Truck";
    const value = type.toString().toLowerCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
  };
  const createInitialVehicle = () => ({
    name: "",
    type: "Truck",
    licensePlate: "",
    capacity: "",
    year: new Date().getFullYear(),
    insuranceExpiry: "",
    documentVerified: false,
    quantity: 1,
    status: "Active",
    pickupLocations: [],
    dropLocations: [],
    isVisibleToCustomers: true
  });
  const [vehicles, setVehicles] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState(createInitialVehicle());
  const [editVehicleId, setEditVehicleId] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandal, setSelectedMandal] = useState([]);
  const [locationType, setLocationType] = useState("pickup");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceVehicleId, setServiceVehicleId] = useState(null);
  const [servicePickupLocations, setServicePickupLocations] = useState([]);
  const [serviceDropLocations, setServiceDropLocations] = useState([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchPickup, setMatchPickup] = useState("");
  const [matchDrop, setMatchDrop] = useState("");
  const [matchQuantity, setMatchQuantity] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState("");
  const [matchVehicleId, setMatchVehicleId] = useState(null);

  // Inline service areas state (for Option B flow)
  const [showInlineServiceAreas, setShowInlineServiceAreas] = useState(false);
  const [inlinePickupLocations, setInlinePickupLocations] = useState([]);
  const [inlineDropLocations, setInlineDropLocations] = useState([]);
  const [inlineLocationType, setInlineLocationType] = useState("pickup");
  const [inlineSelectedDistrict, setInlineSelectedDistrict] = useState("");
  const [inlineSelectedMandal, setInlineSelectedMandal] = useState([]);
  const [inlineDistrictSearch, setInlineDistrictSearch] = useState("");
  const [inlineMandalSearch, setInlineMandalSearch] = useState("");
  const [inlineMandals, setInlineMandals] = useState([]);

  // Location data from API
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [districtSearch, setDistrictSearch] = useState("");
  const [mandalSearch, setMandalSearch] = useState("");
  const [districtsLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [expandedServiceAreas, setExpandedServiceAreas] = useState({});
  const getDealerId = () => user?._id || user?.id || user?.userId || user?.dealerId || null;
  const isServiceAreaExpanded = (vehicleId, areaType) => Boolean(expandedServiceAreas[`${vehicleId}:${areaType}`]);
  const toggleServiceAreaExpanded = (vehicleId, areaType) => {
    const key = `${vehicleId}:${areaType}`;
    setExpandedServiceAreas(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const isQuantityMatch = (vehicleType, quantity) => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return false;
    const type = (vehicleType || "").toUpperCase();
    if (type === "BIKE") return qty <= 10;
    if (type === "AUTO") return qty > 10 && qty <= 50;
    if (type === "TRUCK") return qty > 50 && qty <= 150;
    return false;
  };
  const filterDealersByQuantity = (dealersList, quantity) => {
    return (dealersList || []).map(dealer => ({
      ...dealer,
      vehicles: (dealer.vehicles || []).filter(vehicle => isQuantityMatch(vehicle.vehicleType, quantity))
    })).filter(dealer => dealer.vehicles.length > 0);
  };
  const loadVehicles = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        alert("Please login first");
        navigate("/login");
        return;
      }
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Failed to load vehicles");
      }
      if (!data.success) {
        throw new Error(data.error || "Failed to load vehicles");
      }
      setVehicles((data.vehicles || []).map(vehicle => ({
        ...vehicle,
        insuranceExpiry: normalizeInsuranceExpiry(vehicle.insuranceExpiry) || vehicle.insuranceExpiry || ""
      })));
    } catch (err) {
      console.error("Error loading vehicles:", err);
    }
  };

  // Load districts on component mount
  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load districts when inline service areas form is shown
  useEffect(() => {
    if (showInlineServiceAreas && districts.length === 0) {
      loadInlineDistricts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInlineServiceAreas]);
  const handleAddVehicle = async () => {
    if (!newVehicle.name || !newVehicle.licensePlate || !newVehicle.capacity) {
      alert("Please fill in all required fields");
      return;
    }
    const normalizedInsuranceExpiry = normalizeInsuranceExpiry(newVehicle.insuranceExpiry);
    if (newVehicle.insuranceExpiry && !normalizedInsuranceExpiry) {
      alert("Insurance Expiry must be in DD-MM-YYYY format with a valid calendar date");
      return;
    }
    try {
      const token = localStorage.getItem("accessToken");
      const url = editVehicleId ? `${API_BASE_URL}/dealer/vehicles/${editVehicleId}` : `${API_BASE_URL}/dealer/add-vehicle`;
      const method = editVehicleId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newVehicle,
          insuranceExpiry: normalizedInsuranceExpiry,
          vehicleType: newVehicle.type,
          vehicleName: newVehicle.name
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || data.message || (Array.isArray(data.errors) && data.errors.length > 0 ? data.errors[0]?.message : "") || `Failed to save vehicle (HTTP ${response.status})`);
      }
      if (!data.success) {
        throw new Error(data.error || data.message || "Failed to save vehicle");
      }

      // If adding new vehicle (not editing), show inline service areas form
      if (!editVehicleId) {
        alert("Vehicle added! Now add service areas for this vehicle");
        setShowInlineServiceAreas(true);
        setInlinePickupLocations([]);
        setInlineDropLocations([]);
        setInlineLocationType("pickup");
        setInlineSelectedDistrict("");
        setInlineSelectedMandal("");
        setInlineDistrictSearch("");
        setInlineMandalSearch("");
        // Districts will be loaded when needed (on form interaction)
      } else {
        // If editing, just save and close
        alert("Vehicle updated successfully ✅");
        await loadVehicles();
        setNewVehicle(createInitialVehicle());
        setEditVehicleId(null);
        setShowAddVehicle(false);
      }
    } catch (err) {
      console.error("Error saving vehicle:", err);
      alert(err.message || "Failed to save vehicle");
    }
  };
  const handleToggleForm = () => {
    if (showAddVehicle) {
      setShowAddVehicle(false);
      setEditVehicleId(null);
      setNewVehicle(createInitialVehicle());
    } else {
      setShowAddVehicle(true);
    }
  };
  const handleDeleteVehicle = async vehicleId => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete vehicle");
      }
      if (!data.success) {
        throw new Error(data.error || "Failed to delete vehicle");
      }
      await loadVehicles();
      alert("Vehicle deleted successfully ✅");
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      alert(err.message || "Failed to delete vehicle");
    }
  };
  const handleAddLocation = () => {
    if (!selectedDistrict || selectedMandal.length === 0) {
      alert("Please select district and at least one mandal");
      return;
    }
    const newLocations = [];
    const duplicates = [];
    selectedMandal.forEach(mandal => {
      const locationName = `${mandal}, ${selectedDistrict}`;
      if (locationType === "pickup") {
        if (servicePickupLocations.includes(locationName)) {
          duplicates.push(mandal);
        } else {
          newLocations.push(locationName);
        }
      } else {
        if (serviceDropLocations.includes(locationName)) {
          duplicates.push(mandal);
        } else {
          newLocations.push(locationName);
        }
      }
    });
    if (locationType === "pickup") {
      if (newLocations.length > 0) {
        setServicePickupLocations([...servicePickupLocations, ...newLocations]);
      }
    } else {
      if (newLocations.length > 0) {
        setServiceDropLocations([...serviceDropLocations, ...newLocations]);
      }
    }
    if (newLocations.length > 0) {
      alert(`✅ Added ${newLocations.length} ${locationType} location(s)` + (duplicates.length > 0 ? ` (${duplicates.length} duplicate(s) skipped)` : ""));
    } else {
      alert("All selected mandals already added");
    }
    setSelectedDistrict("");
    setSelectedMandal([]);
  };
  const handleRemoveLocation = (location, type) => {
    if (type === "pickup") {
      setServicePickupLocations(servicePickupLocations.filter(l => l !== location));
    } else {
      setServiceDropLocations(serviceDropLocations.filter(l => l !== location));
    }
  };

  // Inline service areas handlers
  const loadInlineDistricts = async (searchTerm = "") => {
    try {
      setDistrictsLoadError(false);
      const token = localStorage.getItem("accessToken");
      const url = searchTerm ? `${API_BASE_URL}/locations/districts?search=${encodeURIComponent(searchTerm)}` : `${API_BASE_URL}/locations/districts`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        setDistrictsLoadError(true);
        setDistricts([]);
        return;
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON", contentType);
        setDistrictsLoadError(true);
        setDistricts([]);
        return;
      }
      const data = await parseJsonResponse(response);
      if (data.success) {
        setDistricts(data.districts || []);
        setDistrictsLoadError(false);
      } else {
        console.error("Failed to load districts:", data);
        setDistrictsLoadError(true);
        setDistricts([]);
      }
    } catch (err) {
      console.error("Error loading districts:", err);
      setDistrictsLoadError(true);
      setDistricts([]);
    }
  };
  const loadInlineMandals = async (district, searchTerm = "") => {
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${API_BASE_URL}/locations/mandals/${encodeURIComponent(district)}?search=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        setInlineMandals([]);
        return;
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON", contentType);
        setInlineMandals([]);
        return;
      }
      const data = await parseJsonResponse(response);
      if (data.success) {
        setInlineMandals(data.mandals || []);
      } else {
        console.error("Failed to load mandals:", data);
        setInlineMandals([]);
      }
    } catch (err) {
      console.error("Error loading mandals:", err);
      setInlineMandals([]);
    }
  };
  const loadModalMandals = async district => {
    if (!district) {
      setMandals([]);
      return;
    }
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${API_BASE_URL}/locations/mandals/${encodeURIComponent(district)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        setMandals([]);
        return;
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("Response is not JSON", contentType);
        setMandals([]);
        return;
      }
      const data = await parseJsonResponse(response);
      if (data.success) {
        setMandals(data.mandals || []);
      } else {
        console.error("Failed to load mandals:", data);
        setMandals([]);
      }
    } catch (err) {
      console.error("Error loading mandals:", err);
      setMandals([]);
    }
  };
  const handleInlineAddLocation = () => {
    if (!inlineSelectedDistrict || inlineSelectedMandal.length === 0) {
      alert("Please select district and at least one mandal");
      return;
    }
    const newLocations = [];
    const duplicates = [];
    inlineSelectedMandal.forEach(mandal => {
      const locationName = `${mandal}, ${inlineSelectedDistrict}`;
      if (inlineLocationType === "pickup") {
        if (inlinePickupLocations.includes(locationName)) {
          duplicates.push(mandal);
        } else {
          newLocations.push(locationName);
        }
      } else {
        if (inlineDropLocations.includes(locationName)) {
          duplicates.push(mandal);
        } else {
          newLocations.push(locationName);
        }
      }
    });
    if (inlineLocationType === "pickup") {
      if (newLocations.length > 0) {
        setInlinePickupLocations([...inlinePickupLocations, ...newLocations]);
      }
    } else {
      if (newLocations.length > 0) {
        setInlineDropLocations([...inlineDropLocations, ...newLocations]);
      }
    }
    if (newLocations.length > 0) {
      alert(`✅ Added ${newLocations.length} ${inlineLocationType} location(s)` + (duplicates.length > 0 ? ` (${duplicates.length} duplicate(s) skipped)` : ""));
    } else {
      alert("All selected mandals already added");
    }
    setInlineSelectedDistrict("");
    setInlineSelectedMandal([]);
  };
  const handleInlineRemoveLocation = (location, type) => {
    if (type === "pickup") {
      setInlinePickupLocations(inlinePickupLocations.filter(l => l !== location));
    } else {
      setInlineDropLocations(inlineDropLocations.filter(l => l !== location));
    }
  };
  const saveInlineServiceAreas = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      // Get the last added vehicle
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const vehiclesData = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(vehiclesData.error || "Failed to get vehicle");
      }
      if (!vehiclesData.success || !vehiclesData.vehicles.length) {
        throw new Error("Failed to get vehicle");
      }
      const lastVehicle = vehiclesData.vehicles[vehiclesData.vehicles.length - 1];

      // Update vehicle with service areas
      const updateResponse = await fetch(`${API_BASE_URL}/dealer/vehicles/${lastVehicle._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupLocations: inlinePickupLocations,
          dropLocations: inlineDropLocations,
          isVisibleToCustomers: inlinePickupLocations.length > 0 && inlineDropLocations.length > 0
        })
      });
      const updateData = await parseJsonResponse(updateResponse);
      if (!updateResponse.ok) {
        throw new Error(updateData.error || "Failed to save service areas");
      }
      if (!updateData.success) {
        throw new Error(updateData.error || "Failed to save service areas");
      }
      alert("✅ Vehicle and Service Areas saved successfully!");
      await loadVehicles();
      setShowInlineServiceAreas(false);
      setShowAddVehicle(false);
      setNewVehicle(createInitialVehicle());
      setInlinePickupLocations([]);
      setInlineDropLocations([]);
    } catch (err) {
      console.error("Error saving service areas:", err);
      alert(err.message || "Failed to save service areas");
    }
  };
  const skipInlineServiceAreas = () => {
    alert("Vehicle added without service areas. You can add them later from the edit menu.");
    setShowInlineServiceAreas(false);
    setShowAddVehicle(false);
    loadVehicles();
    setNewVehicle(createInitialVehicle());
  };
  const [districtsLoadError, setDistrictsLoadError] = useState(false);
  const openServiceAreas = vehicle => {
    setServiceVehicleId(vehicle._id);
    setServicePickupLocations(vehicle.pickupLocations || []);
    setServiceDropLocations(vehicle.dropLocations || []);
    setLocationType("pickup");
    setSelectedDistrict("");
    setSelectedMandal("");
    setDistrictSearch("");
    setMandalSearch("");
    setMandals([]);
    if (districts.length === 0) {
      loadInlineDistricts();
    }
    setShowServiceModal(true);
  };
  const saveServiceAreas = async () => {
    if (!serviceVehicleId) return;
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles/${serviceVehicleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupLocations: servicePickupLocations,
          dropLocations: serviceDropLocations,
          ...(servicePickupLocations.length > 0 && serviceDropLocations.length > 0 ? {
            isVisibleToCustomers: true
          } : {})
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Failed to save service areas");
      }
      if (!data.success) {
        throw new Error(data.error || "Failed to save service areas");
      }
      await loadVehicles();
      setShowServiceModal(false);
      alert("Service areas saved ✅");
    } catch (err) {
      console.error("Error saving service areas:", err);
      alert(err.message || "Failed to save service areas");
    }
  };
  const toggleVehicleVisibility = async vehicle => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles/${vehicle._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isVisibleToCustomers: !vehicle.isVisibleToCustomers
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Failed to update visibility");
      }
      if (!data.success) {
        throw new Error(data.error || "Failed to update visibility");
      }
      await loadVehicles();
    } catch (err) {
      console.error("Error updating visibility:", err);
      alert(err.message || "Failed to update visibility");
    }
  };
  const _openMatchModal = vehicleId => { // eslint-disable-line no-unused-vars
    setMatchVehicleId(vehicleId || null);
    setMatchPickup("");
    setMatchDrop("");
    setMatchQuantity("");
    setMatchResult(null);
    setMatchError("");
    setShowMatchModal(true);
  };
  const _enableVisibilityForVehicle = async vehicleId => { // eslint-disable-line no-unused-vars
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isVisibleToCustomers: true
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to enable visibility");
      }
      await loadVehicles();
    } catch (err) {
      console.error("Error enabling visibility:", err);
      alert(err.message || "Failed to enable visibility");
    }
  };
  const checkCustomerVisibility = async () => {
    if (!matchPickup || !matchDrop || !matchQuantity) {
      alert("Please enter pickup, drop, and quantity");
      return;
    }
    try {
      setMatchLoading(true);
      setMatchError("");
      setMatchResult(null);
      const params = new URLSearchParams({
        pickupLocation: matchPickup,
        dropLocation: matchDrop,
        quantity: matchQuantity
      });
      const response = await fetch(`${API_BASE_URL}/transport-dealers/filter?${params}`);
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to check visibility");
      }
      const qty = Number(matchQuantity);
      const dealersByQty = filterDealersByQuantity(data.dealers || [], qty);
      const dealerId = getDealerId();
      const matchedDealer = dealersByQty.find(d => d.dealerId === dealerId);
      let matchedVehicles = matchedDealer ? matchedDealer.vehicles : [];
      if (matchVehicleId) {
        matchedVehicles = matchedVehicles.filter(v => v._id === matchVehicleId);
      }
      setMatchResult({
        matchedDealer,
        matchedVehicles,
        totalDealers: dealersByQty.length,
        vehicleType: data.vehicleType,
        distance: data.distance
      });
    } catch (err) {
      setMatchError(err.message || "Failed to check visibility");
    } finally {
      setMatchLoading(false);
    }
  };
  return <div className="transport-dealer-vehicles">
      {/* Header */}
      <div className="vehicles-header">
        <h2>{t("\uD83D\uDE99 My Vehicles")}</h2>
        <button className="back-btn" onClick={() => navigate("/transport-dealer-dashboard")}>{t("\u2190 Back")}</button>
      </div>

      {/* Summary */}
      <div className="vehicles-summary">
        <div className="summary-item">
          <span className="label">{t("Total Vehicles")}</span>
          <span className="value">{vehicles.length}</span>
        </div>
        <div className="summary-item">
          <span className="label">{t("Verified")}</span>
          <span className="value">{vehicles.filter(v => v.documentVerified).length}</span>
        </div>
      </div>

      {/* Add Vehicle Button */}
      <button className="add-vehicle-btn" onClick={handleToggleForm}>
        {showAddVehicle ? editVehicleId ? t("✕ Cancel Edit") : t("✕ Cancel") : t("+ Add Vehicle")}
      </button>

      <button className="add-vehicle-btn service-area-btn" onClick={() => navigate("/transport-dealer/service-area")} type="button">{t("\uD83D\uDCCD Service Areas")}</button>

      {/* Add Vehicle Form */}
      {showAddVehicle && <div className="add-vehicle-form" ref={formRef}>
          <h3>{editVehicleId ? t("✏️ Edit Vehicle") : t("📝 Add New Vehicle")}</h3>

          <div className="form-grid">
            <div className="form-field">
              <label>{t("Vehicle Name/Model")}</label>
              <input value={newVehicle.name} onChange={e => setNewVehicle({
            ...newVehicle,
            name: e.target.value
          })} placeholder={t("e.g., Truck Model X")} />
            </div>
            <div className="form-field">
              <label>{t("Vehicle Type")}</label>
              <select value={newVehicle.type} onChange={e => setNewVehicle({
            ...newVehicle,
            type: e.target.value
          })}>
                <option value="Bike">{t("\uD83C\uDFCD\uFE0F Bike")}</option>
                <option value="Auto">{t("\uD83D\uDEFA Auto")}</option>
                <option value="Truck">{t("\uD83D\uDE9A Truck")}</option>
              </select>
            </div>
            <div className="form-field">
              <label>{t("License Plate")}</label>
              <input value={newVehicle.licensePlate} onChange={e => setNewVehicle({
            ...newVehicle,
            licensePlate: e.target.value
          })} placeholder={t("e.g., DL01AB1234")} />
            </div>
            <div className="form-field">
              <label>{t("Capacity (in kg)")}</label>
              <input type="number" value={newVehicle.capacity} onChange={e => setNewVehicle({
            ...newVehicle,
            capacity: e.target.value
          })} placeholder={t("e.g., 5000")} />
            </div>
            <div className="form-field">
              <label>{t("Year of Purchase")}</label>
              <input type="number" value={newVehicle.year} onChange={e => setNewVehicle({
            ...newVehicle,
            year: e.target.value
          })} />
            </div>
            <div className="form-field">
              <label>{t("Insurance Expiry")}</label>
              <input type="text" value={newVehicle.insuranceExpiry} onChange={e => setNewVehicle({
            ...newVehicle,
            insuranceExpiry: formatInsuranceInput(e.target.value)
          })} placeholder={t("DD-MM-YYYY")} inputMode="numeric" maxLength={10} />
              {newVehicle.insuranceExpiry && !isValidInsuranceInput(newVehicle.insuranceExpiry) && <small style={{
            color: "#c62828"
          }}>{t("Use valid format: DD-MM-YYYY")}</small>}
            </div>
            <div className="form-field">
              <label>{t("Quantity Available")}</label>
              <input type="number" value={newVehicle.quantity} onChange={e => setNewVehicle({
            ...newVehicle,
            quantity: Math.max(1, parseInt(e.target.value) || 1)
          })} min="1" placeholder={t("e.g., 1")} />
            </div>
            <div className="form-field">
              <label>{t("Vehicle Status")}</label>
              <select value={newVehicle.status} onChange={e => setNewVehicle({
            ...newVehicle,
            status: e.target.value
          })}>
                <option value="Active">{t("\uD83D\uDFE2 Active")}</option>
                <option value="Maintenance">{t("\uD83D\uDFE1 Maintenance")}</option>
                <option value="Inactive">{t("\u26AB Inactive")}</option>
              </select>
            </div>
          </div>

          <div className="form-checkbox">
            <input type="checkbox" checked={newVehicle.documentVerified} onChange={e => setNewVehicle({
          ...newVehicle,
          documentVerified: e.target.checked
        })} />
            <label>{t("I hereby confirm the above details are true")}</label>
          </div>
          <button className="submit-btn" onClick={handleAddVehicle}>
            {editVehicleId ? "💾 Save Changes" : "✓ Add Vehicle"}
          </button>
        </div>}

      {/* Inline Service Areas Form */}
      {showInlineServiceAreas && <div className="add-vehicle-form service-areas-form">
          <h3>{t("\uD83D\uDCCD Add Service Areas for Vehicle")}</h3>
          <p style={{
        color: '#666',
        marginBottom: '20px'
      }}>{t("Define pickup and drop locations for this vehicle")}</p>

          {/* Error state */}
          {districtsLoadError && <div style={{
        background: '#fee',
        border: '1px solid #fcc',
        color: '#c00',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
              <p style={{
          margin: '0 0 10px 0'
        }}>{t("\u26A0\uFE0F Failed to load districts from the server")}</p>
              <button onClick={() => loadInlineDistricts()} style={{
          background: '#c00',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>{t("\uD83D\uDD04 Retry Loading Districts")}</button>
            </div>}

          {/* Loading state */}
          {!districtsLoadError && districts.length === 0 && <div style={{
        background: '#f0f0f0',
        padding: '20px',
        borderRadius: '4px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
              <p>{t("Loading locations...")}</p>
            </div>}

          {/* Form (only show if districts loaded) */}
          {districts.length > 0 && <>
              <div className="location-tabs" style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px'
        }}>
                <button className={`tab ${inlineLocationType === "pickup" ? "active" : ""}`} onClick={() => setInlineLocationType("pickup")} style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: inlineLocationType === "pickup" ? '#5B5BA3' : '#e0e0e0',
            color: inlineLocationType === "pickup" ? 'white' : 'black'
          }}>{t("\uD83D\uDD35 Pickup Locations")}</button>
                <button className={`tab ${inlineLocationType === "drop" ? "active" : ""}`} onClick={() => setInlineLocationType("drop")} style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: inlineLocationType === "drop" ? '#5B5BA3' : '#e0e0e0',
            color: inlineLocationType === "drop" ? 'white' : 'black'
          }}>{t("\uD83D\uDFE1 Drop Locations")}</button>
              </div>

              <div className="form-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
                <div className="form-field">
                  <label>{t("Search District:")}</label>
                  <input type="text" placeholder={t("\uD83D\uDD0D Search district...")} value={inlineDistrictSearch} onChange={e => setInlineDistrictSearch(e.target.value)} className="search-input" />
                  <select value={inlineSelectedDistrict} onChange={e => {
              setInlineSelectedDistrict(e.target.value);
              setInlineSelectedMandal([]);
              setInlineDistrictSearch("");
              setInlineMandals([]);
              if (e.target.value) {
                loadInlineMandals(e.target.value);
              }
            }} className="form-control">
                    <option value="">{t("Select District")}</option>
                    {districts.filter(d => d.district.toLowerCase().includes(inlineDistrictSearch.toLowerCase())).map(district => <option key={district.district} value={district.district}>
                          {district.district}
                        </option>)}
                  </select>
                </div>

                <div className="form-field">
                  <label>{t("Search Mandal:")}</label>
                  <input type="text" placeholder={t("\uD83D\uDD0D Search mandal...")} value={inlineMandalSearch} onChange={e => setInlineMandalSearch(e.target.value)} className="search-input" disabled={!inlineSelectedDistrict} />
                  <select value={inlineSelectedMandal} onChange={e => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              setInlineSelectedMandal(selectedOptions);
              setInlineMandalSearch("");
            }} className="form-control" disabled={!inlineSelectedDistrict} multiple size="5">
                    <option value="" disabled>{t("Select Mandal(s)")}</option>
                    {inlineMandals.filter(m => m.name.toLowerCase().includes(inlineMandalSearch.toLowerCase())).map(mandal => <option key={mandal.name} value={mandal.name}>
                          {mandal.name}
                        </option>)}
                  </select>
                  <small style={{
              color: '#64748b',
              fontSize: '12px',
              marginTop: '4px',
              display: 'block'
            }}>{t("\uD83D\uDCA1 Hold Ctrl (Windows) or Cmd (Mac) to select multiple mandals")}</small>
                </div>
              </div>

              <button className="submit-btn" onClick={handleInlineAddLocation} disabled={inlineSelectedMandal.length === 0} style={{
          marginBottom: '20px'
        }}>{t("\u2795 Add")}{inlineLocationType === "pickup" ? "Pickup" : "Drop"}{t("Location")}{inlineSelectedMandal.length > 1 ? "s" : ""}
                {inlineSelectedMandal.length > 0 && ` (${inlineSelectedMandal.length})`}
              </button>

              <div style={{
          marginBottom: '20px'
        }}>
                {inlinePickupLocations.length > 0 && <div style={{
            marginBottom: '15px'
          }}>
                    <h4>{t("\uD83D\uDD35 Pickup Locations (")}{inlinePickupLocations.length})</h4>
                    <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
                      {inlinePickupLocations.map(location => <div key={location} style={{
                background: '#e3f2fd',
                padding: '8px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                          <span>{location}</span>
                          <button onClick={() => handleInlineRemoveLocation(location, "pickup")} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}>
                            ✕
                          </button>
                        </div>)}
                    </div>
                  </div>}

                {inlineDropLocations.length > 0 && <div style={{
            marginBottom: '15px'
          }}>
                    <h4>{t("\uD83D\uDFE1 Drop Locations (")}{inlineDropLocations.length})</h4>
                    <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
                      {inlineDropLocations.map(location => <div key={location} style={{
                background: '#fff3e0',
                padding: '8px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                          <span>{location}</span>
                          <button onClick={() => handleInlineRemoveLocation(location, "drop")} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}>
                            ✕
                          </button>
                        </div>)}
                    </div>
                  </div>}

                {inlinePickupLocations.length === 0 && inlineDropLocations.length === 0 && <p style={{
            color: '#999',
            fontStyle: 'italic'
          }}>{t("No locations added yet")}</p>}
              </div>

              <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                <button className="submit-btn" onClick={saveInlineServiceAreas} disabled={inlinePickupLocations.length === 0 || inlineDropLocations.length === 0}>{t("\uD83D\uDCBE Save Vehicle & Service Areas")}</button>
                <button className="cancel-btn" onClick={skipInlineServiceAreas} style={{
            background: '#ccc',
            color: 'black',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>{t("\u23ED\uFE0F Skip for Now")}</button>
              </div>
            </>}
        </div>}

      {/* Vehicles List */}
      <div className="vehicles-list">
        {vehicles.length > 0 ? vehicles.map(vehicle => <div key={vehicle._id} className="vehicle-card">
              <div className="vehicle-header">
                <div className="vehicle-type-badge">
                  {vehicle.vehicleType === "TRUCK" ? "🚚" : vehicle.vehicleType === "AUTO" ? "🛺" : vehicle.vehicleType === "BIKE" ? "🏍️" : "🚗"}
                  {vehicle.vehicleType}
                </div>
                <div className="vehicle-badges">
                  {vehicle.status === "Active" && <span className="status-badge active">{t("\uD83D\uDFE2 Active")}</span>}
                  {vehicle.status === "Maintenance" && <span className="status-badge maintenance">{t("\uD83D\uDFE1 Maintenance")}</span>}
                  {vehicle.status === "Inactive" && <span className="status-badge inactive">{t("\u26AB Inactive")}</span>}
                  {vehicle.documentVerified && <span className="verified-badge">{t("\u2713 Verified")}</span>}
                </div>
              </div>

              <div className="vehicle-info">
                <h4>{vehicle.vehicleName || vehicle.name}</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="icon">📋</span>
                    <div>
                      <span className="label">{t("License Plate")}</span>
                      <span className="value">{vehicle.licensePlate}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="icon">⚖️</span>
                    <div>
                      <span className="label">{t("Capacity")}</span>
                      <span className="value">{vehicle.capacity}{t("kg")}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="icon">📅</span>
                    <div>
                      <span className="label">{t("Year")}</span>
                      <span className="value">{vehicle.year || "-"}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="icon">🛡️</span>
                    <div>
                      <span className="label">{t("Insurance Valid")}</span>
                      <span className="value">{normalizeInsuranceExpiry(vehicle.insuranceExpiry) || "Not set"}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="icon">📊</span>
                    <div>
                      <span className="label">{t("Available Units")}</span>
                      <span className="value">{vehicle.quantity || 1}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Areas Summary */}
              <div style={{
          background: '#f5f5f5',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
                <h5 style={{
            margin: '0 0 10px 0',
            fontSize: '14px',
            fontWeight: '600'
          }}>{t("\uD83D\uDCCD Service Areas")}</h5>
                {!vehicle.isVisibleToCustomers && <p style={{
            margin: '0 0 10px 0',
            fontSize: '12px',
            color: '#c62828'
          }}>{t("Hidden from customer page. Click \"Show to Customers\" to list this vehicle.")}</p>}
                {vehicle.pickupLocations?.length > 0 || vehicle.dropLocations?.length > 0 ? <>
                    {vehicle.pickupLocations?.length > 0 && <div style={{
              marginBottom: '10px'
            }}>
                        <p style={{
                margin: '0 0 5px 0',
                fontSize: '12px',
                color: '#666'
              }}>{t("\uD83D\uDD35 Pickup (")}{vehicle.pickupLocations.length}):</p>
                        <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                          {vehicle.pickupLocations.slice(0, isServiceAreaExpanded(vehicle._id, "pickup") ? vehicle.pickupLocations.length : 3).map((location, idx) => <span key={idx} style={{
                  background: '#e3f2fd',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px'
                }}>
                              {location}
                            </span>)}
                          {vehicle.pickupLocations.length > 3 && <button type="button" onClick={() => toggleServiceAreaExpanded(vehicle._id, "pickup")} style={{
                  background: '#e3f2fd',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}>
                              {isServiceAreaExpanded(vehicle._id, "pickup") ? 'Show less' : `+${vehicle.pickupLocations.length - 3} more`}
                            </button>}
                        </div>
                      </div>}
                    {vehicle.dropLocations?.length > 0 && <div>
                        <p style={{
                margin: '0 0 5px 0',
                fontSize: '12px',
                color: '#666'
              }}>{t("\uD83D\uDFE1 Drop (")}{vehicle.dropLocations.length}):</p>
                        <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                          {vehicle.dropLocations.slice(0, isServiceAreaExpanded(vehicle._id, "drop") ? vehicle.dropLocations.length : 3).map((location, idx) => <span key={idx} style={{
                  background: '#fff3e0',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px'
                }}>
                              {location}
                            </span>)}
                          {vehicle.dropLocations.length > 3 && <button type="button" onClick={() => toggleServiceAreaExpanded(vehicle._id, "drop")} style={{
                  background: '#fff3e0',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}>
                              {isServiceAreaExpanded(vehicle._id, "drop") ? 'Show less' : `+${vehicle.dropLocations.length - 3} more`}
                            </button>}
                        </div>
                      </div>}
                  </> : <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#999',
            fontStyle: 'italic'
          }}>{t("No service areas configured yet")}</p>}
              </div>

              <div className="vehicle-actions">
                <button className="action-btn edit-btn" onClick={() => {
            setShowAddVehicle(true);
            setShowInlineServiceAreas(false);
            setEditVehicleId(vehicle._id);
            setNewVehicle({
              ...createInitialVehicle(),
              ...vehicle,
              name: vehicle.vehicleName || vehicle.name,
              type: normalizeVehicleType(vehicle.vehicleType || vehicle.type),
              insuranceExpiry: normalizeInsuranceExpiry(vehicle.insuranceExpiry) || ""
            });
            setTimeout(() => {
              formRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }, 0);
          }}>{t("\u270F\uFE0F Edit")}</button>
                <button className="action-btn" onClick={() => openServiceAreas(vehicle)}>{t("\uD83D\uDCCD Service Areas")}</button>
                <button className={`action-btn ${vehicle.isVisibleToCustomers ? "visible-btn" : "hidden-btn"}`} onClick={() => toggleVehicleVisibility(vehicle)}>
                  {vehicle.isVisibleToCustomers ? "🙈 Hide from Customers" : "👁️ Show to Customers"}
                </button>
                <button className="action-btn delete-btn" onClick={() => handleDeleteVehicle(vehicle._id)}>{t("\uD83D\uDDD1\uFE0F Delete")}</button>
              </div>
            </div>) : <div className="empty-state">
            <div className="empty-icon">🚙</div>
            <p>{t("No vehicles added yet")}</p>
            <small>{t("Add your first vehicle to start deliveries")}</small>
          </div>}
      </div>

      {showServiceModal && <div className="vehicle-modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="vehicle-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("\uD83D\uDCCD Set Service Areas")}</h3>
              <button className="close-btn" onClick={() => setShowServiceModal(false)}>✕</button>
            </div>

            <div className="locations-section">
              <div className="location-selector">
                <div className="location-type-tabs">
                  <button className={`tab ${locationType === "pickup" ? "active" : ""}`} onClick={() => setLocationType("pickup")}>{t("\uD83D\uDD35 Pickup Locations")}</button>
                  <button className={`tab ${locationType === "drop" ? "active" : ""}`} onClick={() => setLocationType("drop")}>{t("\uD83D\uDFE1 Drop Locations")}</button>
                </div>

                <div className="location-input-group-parallel">
                  <div className="selector-wrapper">
                    <label className="selector-label">{t("District")}</label>
                    <input type="text" placeholder={t("\uD83D\uDD0D Search District...")} value={districtSearch} onChange={e => setDistrictSearch(e.target.value)} className="search-input" />
                    <select value={selectedDistrict} onChange={e => {
                  setSelectedDistrict(e.target.value);
                  setSelectedMandal([]);
                  setDistrictSearch("");
                  setMandalSearch("");
                  setMandals([]);
                  if (e.target.value) {
                    loadModalMandals(e.target.value);
                  }
                }} className="location-select" disabled={districtsLoading}>
                      <option value="">{t("Select District")}</option>
                      {districts.filter(d => d.district.toLowerCase().includes(districtSearch.toLowerCase())).map(district => <option key={district.code || district.district} value={district.district}>
                            {district.district} ({district.mandalCount}{t("mandals)")}</option>)}
                    </select>
                  </div>

                  <div className="selector-wrapper">
                    <label className="selector-label">{t("Mandal")}</label>
                    <input type="text" placeholder={t("\uD83D\uDD0D Search Mandal...")} value={mandalSearch} onChange={e => setMandalSearch(e.target.value)} className="search-input" disabled={!selectedDistrict} />
                    <select value={selectedMandal} onChange={e => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedMandal(selectedOptions);
                  setMandalSearch("");
                }} className="location-select" disabled={!selectedDistrict} multiple size="6">
                      <option value="" disabled>{t("Select Mandal(s)")}</option>
                      {mandals.filter(m => m.name.toLowerCase().includes(mandalSearch.toLowerCase())).map(mandal => <option key={mandal.name} value={mandal.name}>
                            {mandal.name}
                          </option>)}
                    </select>
                    <small style={{
                  color: '#64748b',
                  fontSize: '12px',
                  marginTop: '4px',
                  display: 'block'
                }}>{t("\uD83D\uDCA1 Hold Ctrl (Windows) or Cmd (Mac) to select multiple mandals")}</small>
                  </div>

                  <button className="add-location-btn" onClick={handleAddLocation} disabled={selectedMandal.length === 0}>
                    {locationType === "pickup" ? "➕ Add Pickup" : "➕ Add Drop"}
                    {selectedMandal.length > 0 && ` (${selectedMandal.length})`}
                  </button>
                </div>
              </div>

              <div className="locations-display">
                {servicePickupLocations.length > 0 && <div className="location-group">
                    <h4>{t("\uD83D\uDD35 Pickup Locations (")}{servicePickupLocations.length})</h4>
                    <div className="location-chips">
                      {servicePickupLocations.map(location => <div key={location} className="location-chip pickup-chip">
                          {location}
                          <button className="remove-btn" onClick={() => handleRemoveLocation(location, "pickup")}>✕</button>
                        </div>)}
                    </div>
                  </div>}

                {serviceDropLocations.length > 0 && <div className="location-group">
                    <h4>{t("\uD83D\uDFE1 Drop Locations (")}{serviceDropLocations.length})</h4>
                    <div className="location-chips">
                      {serviceDropLocations.map(location => <div key={location} className="location-chip drop-chip">
                          {location}
                          <button className="remove-btn" onClick={() => handleRemoveLocation(location, "drop")}>✕</button>
                        </div>)}
                    </div>
                  </div>}
              </div>
            </div>

            <div className="modal-actions">
              <button className="submit-btn" onClick={saveServiceAreas}>{t("\uD83D\uDCBE Save Service Areas")}</button>
            </div>
          </div>
        </div>}

      {showMatchModal && <div className="vehicle-modal-overlay" onClick={() => setShowMatchModal(false)}>
          <div className="vehicle-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("\uD83D\uDD0E Check Customer Visibility")}</h3>
              <button className="close-btn" onClick={() => setShowMatchModal(false)}>✕</button>
            </div>

            <div className="locations-section">
              <div className="form-grid" style={{
            gridTemplateColumns: "1fr 1fr 1fr"
          }}>
                <div className="form-field">
                  <label>{t("Customer Pickup (Mandal/District)")}</label>
                  <input value={matchPickup} onChange={e => setMatchPickup(e.target.value)} placeholder={t("e.g., Srikakulam")} />
                </div>
                <div className="form-field">
                  <label>{t("Customer Drop (Mandal/District)")}</label>
                  <input value={matchDrop} onChange={e => setMatchDrop(e.target.value)} placeholder={t("e.g., Parvathipuram")} />
                </div>
                <div className="form-field">
                  <label>{t("Quantity (kg)")}</label>
                  <input type="number" min="1" value={matchQuantity} onChange={e => setMatchQuantity(e.target.value)} placeholder={t("e.g., 12")} />
                </div>
              </div>

              <p style={{
            marginTop: "8px",
            color: "#64748b",
            fontSize: "12px"
          }}>{t("Rules: Bike \u2264 5kg, Auto > 5kg to \u2264 50kg, Truck > 50kg to \u2264 150kg.")}</p>

              {matchError && <div style={{
            color: "#b91c1c",
            background: "#fee2e2",
            padding: "10px",
            borderRadius: "8px",
            marginTop: "10px"
          }}>
                  {matchError}
                </div>}

              {matchResult && <div style={{
            marginTop: "12px"
          }}>
                  {matchResult.matchedDealer && matchResult.matchedVehicles.length > 0 ? <div style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "10px",
              borderRadius: "8px"
            }}>{t("\u2705 Your dealer will be visible to this customer.")}<div style={{
                marginTop: "8px",
                fontSize: "12px"
              }}>{t("Matching vehicles:")}{matchResult.matchedVehicles.map(v => v.vehicleName || v.vehicleType).join(", ")}
                      </div>
                    </div> : <div style={{
              background: "#fff7ed",
              color: "#9a3412",
              padding: "10px",
              borderRadius: "8px"
            }}>{t("\u274C Your dealer will NOT be visible for this request.")}<div style={{
                marginTop: "6px",
                fontSize: "12px"
              }}>{t("Check service areas, visibility toggle, and quantity rules.")}</div>
                    </div>}
                </div>}
            </div>

            <div className="modal-actions">
              <button className="submit-btn" onClick={checkCustomerVisibility} disabled={matchLoading}>
                {matchLoading ? "Checking..." : "🔍 Check Visibility"}
              </button>
            </div>
          </div>
        </div>}

      {/* Bottom Navigation */}
      <TransportDealerBottomNav />
    </div>;
}