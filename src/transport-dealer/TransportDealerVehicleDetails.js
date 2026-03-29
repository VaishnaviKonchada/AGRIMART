import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TransportDealerBottomNav from "./TransportDealerBottomNav";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch, API_BASE_URL } from "../utils/api";
import "../styles/TransportDealerVehicles.css";



export default function TransportDealerVehicleDetails() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser"));
  const token = localStorage.getItem("accessToken");

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingServiceAreas, setEditingServiceAreas] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandal, setSelectedMandal] = useState("");
  const [locationType, setLocationType] = useState("pickup");
  const [tempPickupLocations, setTempPickupLocations] = useState([]);
  const [tempDropLocations, setTempDropLocations] = useState([]);
  const [districtSearch, setDistrictSearch] = useState("");
  const [mandalSearch, setMandalSearch] = useState("");
  const [dealerServiceAreas, setDealerServiceAreas] = useState(null);

  // Load vehicles on mount
  useEffect(() => {
    loadVehicles();
    loadDistricts();
    loadDealerServiceAreas();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
        if (data.vehicles && data.vehicles.length > 0) {
          setSelectedVehicle(data.vehicles[0]);
        }
      }
    } catch (err) {
      console.error("Error loading vehicles:", err);
      alert("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const loadDealerServiceAreas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dealer/transport-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success || data.profile) {
        setDealerServiceAreas(data.profile);
      }
    } catch (err) {
      console.error("Error loading dealer service areas:", err);
    }
  };

  const loadDistricts = async () => {
    try {
      const data = await apiGet("locations/districts");
      if (data.success) {
        setDistricts(data.districts);
      }
    } catch (err) {
      console.error("Error loading districts:", err);
    }
  };

  const loadMandals = async (district) => {
    try {
      const data = await apiGet("locations/mandals/${district}");
      if (data.success) {
        setMandals(data.mandals);
      } else {
        setMandals([]);
      }
    } catch (err) {
      console.error("Error loading mandals:", err);
      setMandals([]);
    }
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    setSelectedMandal("");
    setDistrictSearch("");
    if (district) {
      loadMandals(district);
    } else {
      setMandals([]);
    }
  };

  const handleAddLocation = () => {
    if (!selectedDistrict || !selectedMandal) {
      alert("Please select both district and mandal");
      return;
    }

    const locationName = `${selectedMandal}, ${selectedDistrict}`;

    if (locationType === "pickup") {
      if (!tempPickupLocations.includes(locationName)) {
        setTempPickupLocations([...tempPickupLocations, locationName]);
      } else {
        alert("This pickup location is already added");
      }
    } else {
      if (!tempDropLocations.includes(locationName)) {
        setTempDropLocations([...tempDropLocations, locationName]);
      } else {
        alert("This drop location is already added");
      }
    }

    setSelectedDistrict("");
    setSelectedMandal("");
    setMandalSearch("");
  };

  const handleRemoveLocation = (location, type) => {
    if (type === "pickup") {
      setTempPickupLocations(tempPickupLocations.filter(l => l !== location));
    } else {
      setTempDropLocations(tempDropLocations.filter(l => l !== location));
    }
  };

  const handleEditServiceAreas = (vehicle) => {
    setSelectedVehicle(vehicle);
    setTempPickupLocations(vehicle.pickupLocations || []);
    setTempDropLocations(vehicle.dropLocations || []);
    setEditingServiceAreas(true);
    setLocationType("pickup");
    setSelectedDistrict("");
    setSelectedMandal("");
  };

  const handleSaveServiceAreas = async () => {
    if (!selectedVehicle) return;

    try {
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles/${selectedVehicle._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupLocations: tempPickupLocations,
          dropLocations: tempDropLocations,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save service areas");
      }

      await loadVehicles();
      setEditingServiceAreas(false);
      alert("Service areas saved ✅");
    } catch (err) {
      console.error("Error saving service areas:", err);
      alert(err.message || "Failed to save service areas");
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete vehicle");
      }

      await loadVehicles();
      alert("Vehicle deleted ✅");
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      alert(err.message || "Failed to delete vehicle");
    }
  };

  const handleVisibilityToggle = async (vehicle) => {
    try {
      const response = await fetch(`${API_BASE_URL}/dealer/vehicles/${vehicle._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isVisibleToCustomers: !vehicle.isVisibleToCustomers,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update visibility");
      }

      await loadVehicles();
    } catch (err) {
      console.error("Error updating visibility:", err);
      alert(err.message || "Failed to update visibility");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading vehicles...</p>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="empty-state-container">
        <div className="empty-state">
          <div className="empty-icon">🚙</div>
          <p>No vehicles added yet</p>
          <small>Add your first vehicle from the Vehicles page</small>
          <button
            className="add-vehicle-btn"
            onClick={() => navigate("/transport-dealer/vehicles")}
          >
            Go to Vehicles Page
          </button>
        </div>
        <TransportDealerBottomNav />
      </div>
    );
  }

  return (
    <div className="vehicle-details-container">
      <div className="page-header">
        <h2>🚙 My Vehicles & Service Areas</h2>
        <button
          className="back-btn"
          onClick={() => navigate("/transport-dealer-account")}
        >
          ← Back to Account
        </button>
      </div>

      <div className="vehicle-details-layout">
        {/* Vehicle List */}
        <div className="vehicle-list-sidebar">
          <h3>My Vehicles ({vehicles.length})</h3>
          <div className="vehicle-list">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle._id}
                className={`vehicle-list-item ${
                  selectedVehicle?._id === vehicle._id ? "active" : ""
                }`}
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <div className="vehicle-type-icon">
                  {vehicle.vehicleType === "TRUCK"
                    ? "🚚"
                    : vehicle.vehicleType === "AUTO"
                    ? "🛺"
                    : "🏍️"}
                </div>
                <div className="vehicle-list-info">
                  <h4>{vehicle.vehicleName || "Unknown"}</h4>
                  <p>{vehicle.licensePlate}</p>
                  <span className={`badge ${vehicle.status.toLowerCase()}`}>
                    {vehicle.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="vehicle-details-main">
          {selectedVehicle && (
            <>
              {/* Vehicle Info Card */}
              <div className="vehicle-details-card">
                <div className="card-header">
                  <h3>{selectedVehicle.vehicleName || "Vehicle"}</h3>
                  <div className="vehicle-badges">
                    {selectedVehicle.documentVerified && (
                      <span className="badge verified">✓ Verified</span>
                    )}
                    {selectedVehicle.isVisibleToCustomers && (
                      <span className="badge visible">👁️ Visible</span>
                    )}
                  </div>
                </div>

                <div className="vehicle-info-grid">
                  <div className="info-item">
                    <span className="label">Vehicle Type</span>
                    <span className="value">{selectedVehicle.vehicleType}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">License Plate</span>
                    <span className="value">{selectedVehicle.licensePlate}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Capacity</span>
                    <span className="value">{selectedVehicle.capacity} kg</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Year</span>
                    <span className="value">{selectedVehicle.year || "N/A"}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Insurance Expiry</span>
                    <span className="value">{selectedVehicle.insuranceExpiry || "Not set"}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Available Units</span>
                    <span className="value">{selectedVehicle.quantity || 1}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Status</span>
                    <span className={`value status-${selectedVehicle.status.toLowerCase()}`}>
                      {selectedVehicle.status}
                    </span>
                  </div>
                </div>

                {/* Service Areas Summary */}
                <div className="service-areas-summary">
                  <div className="summary-item">
                    <span className="label">Pickup Locations</span>
                    <span className="count">{selectedVehicle.pickupLocations?.length || 0}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Drop Locations</span>
                    <span className="count">{selectedVehicle.dropLocations?.length || 0}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="vehicle-actions">
                  <button
                    className="btn-primary"
                    onClick={() => handleEditServiceAreas(selectedVehicle)}
                  >
                    📍 Edit Service Areas
                  </button>
                  <button
                    className={`btn-toggle ${selectedVehicle.isVisibleToCustomers ? "visible" : "hidden"}`}
                    onClick={() => handleVisibilityToggle(selectedVehicle)}
                  >
                    {selectedVehicle.isVisibleToCustomers ? "👁️ Visible to Customers" : "🚫 Hidden"}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteVehicle(selectedVehicle._id)}
                  >
                    🗑️ Delete Vehicle
                  </button>
                </div>
              </div>

              {/* Service Areas Details */}
              <div className="service-areas-details">
                <h4>📍 Service Areas</h4>

                {selectedVehicle.pickupLocations && selectedVehicle.pickupLocations.length > 0 && (
                  <div className="locations-section">
                    <h5>🔵 Pickup Locations ({selectedVehicle.pickupLocations.length})</h5>
                    <div className="location-list">
                      {selectedVehicle.pickupLocations.map((location, idx) => (
                        <div key={idx} className="location-item pickup">
                          📍 {location}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVehicle.dropLocations && selectedVehicle.dropLocations.length > 0 && (
                  <div className="locations-section">
                    <h5>🟡 Drop Locations ({selectedVehicle.dropLocations.length})</h5>
                    <div className="location-list">
                      {selectedVehicle.dropLocations.map((location, idx) => (
                        <div key={idx} className="location-item drop">
                          📍 {location}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!selectedVehicle.pickupLocations || selectedVehicle.pickupLocations.length === 0) &&
                  (!selectedVehicle.dropLocations || selectedVehicle.dropLocations.length === 0) && (
                    <p className="no-data">No service areas configured yet</p>
                  )}
              </div>

              {/* Dealer Level Service Areas */}
              {dealerServiceAreas && (
                <div className="dealer-service-areas">
                  <h4>🌐 Your Service Coverage (Dealer Level)</h4>
                  
                  {dealerServiceAreas.pickupLocations && dealerServiceAreas.pickupLocations.length > 0 && (
                    <div className="locations-section">
                      <h5>🔵 Pickup Locations ({dealerServiceAreas.pickupLocations.length})</h5>
                      <div className="location-list">
                        {dealerServiceAreas.pickupLocations.map((location, idx) => (
                          <div key={idx} className="location-item pickup">
                            📍 {location}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dealerServiceAreas.dropLocations && dealerServiceAreas.dropLocations.length > 0 && (
                    <div className="locations-section">
                      <h5>🟡 Drop Locations ({dealerServiceAreas.dropLocations.length})</h5>
                      <div className="location-list">
                        {dealerServiceAreas.dropLocations.map((location, idx) => (
                          <div key={idx} className="location-item drop">
                            📍 {location}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!dealerServiceAreas.pickupLocations || dealerServiceAreas.pickupLocations.length === 0) &&
                    (!dealerServiceAreas.dropLocations || dealerServiceAreas.dropLocations.length === 0) && (
                      <div className="setup-reminder">
                        <p>⚠️ Configure service areas to be visible to customers</p>
                        <button 
                          className="btn-setup"
                          onClick={() => window.location.href = "/transport-dealer/service-areas"}
                        >
                          📍 Setup Service Areas
                        </button>
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Service Areas Modal */}
      {editingServiceAreas && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setEditingServiceAreas(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Service Areas - {selectedVehicle.vehicleName}</h3>
              <button
                className="close-btn"
                onClick={() => setEditingServiceAreas(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="location-tabs">
                <button
                  className={`tab ${locationType === "pickup" ? "active" : ""}`}
                  onClick={() => setLocationType("pickup")}
                >
                  🔵 Pickup Locations
                </button>
                <button
                  className={`tab ${locationType === "drop" ? "active" : ""}`}
                  onClick={() => setLocationType("drop")}
                >
                  🟡 Drop Locations
                </button>
              </div>

              <div className="location-selector">
                <div className="selector-group">
                  <label>District</label>
                  <input
                    type="text"
                    placeholder="Search district..."
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="selector"
                  >
                    <option value="">Select District</option>
                    {districts
                      .filter(d =>
                        d.district.toLowerCase().includes(districtSearch.toLowerCase())
                      )
                      .map((district) => (
                        <option key={district._id} value={district.district}>
                          {district.district}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="selector-group">
                  <label>Mandal</label>
                  <input
                    type="text"
                    placeholder="Search mandal..."
                    value={mandalSearch}
                    onChange={(e) => setMandalSearch(e.target.value)}
                    className="search-input"
                    disabled={!selectedDistrict}
                  />
                  <select
                    value={selectedMandal}
                    onChange={(e) => setSelectedMandal(e.target.value)}
                    className="selector"
                    disabled={!selectedDistrict}
                  >
                    <option value="">Select Mandal</option>
                    {mandals
                      .filter(m => m.name.toLowerCase().includes(mandalSearch.toLowerCase()))
                      .map((mandal) => (
                        <option key={mandal._id} value={mandal.name}>
                          {mandal.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  className="btn-add"
                  onClick={handleAddLocation}
                  disabled={!selectedMandal}
                >
                  ➕ Add {locationType === "pickup" ? "Pickup" : "Drop"}
                </button>
              </div>

              <div className="locations-display">
                {tempPickupLocations.length > 0 && (
                  <div className="location-group">
                    <h5>🔵 Pickup Locations ({tempPickupLocations.length})</h5>
                    <div className="location-chips">
                      {tempPickupLocations.map((location, idx) => (
                        <div key={idx} className="chip pickup-chip">
                          {location}
                          <button
                            onClick={() => handleRemoveLocation(location, "pickup")}
                            className="remove-btn"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tempDropLocations.length > 0 && (
                  <div className="location-group">
                    <h5>🟡 Drop Locations ({tempDropLocations.length})</h5>
                    <div className="location-chips">
                      {tempDropLocations.map((location, idx) => (
                        <div key={idx} className="chip drop-chip">
                          {location}
                          <button
                            onClick={() => handleRemoveLocation(location, "drop")}
                            className="remove-btn"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setEditingServiceAreas(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveServiceAreas}>
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <TransportDealerBottomNav />
    </div>
  );
}
