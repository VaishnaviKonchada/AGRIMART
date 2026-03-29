import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch, API_BASE_URL } from "../utils/api";
import "../styles/TransportDealerServiceArea.css";



export default function TransportDealerServiceArea() {
  const navigate = useNavigate();
  const [pickupLocations, setPickupLocations] = useState([]);
  const [dropLocations, setDropLocations] = useState([]);
  const [pickupDistrict, setPickupDistrict] = useState("");
  const [pickupMandal, setPickupMandal] = useState([]);
  const [dropDistrict, setDropDistrict] = useState("");
  const [dropMandal, setDropMandal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchPickup, setSearchPickup] = useState("");
  const [searchDrop, setSearchDrop] = useState("");
  const [districts, setDistricts] = useState([]);
  const [pickupMandals, setPickupMandals] = useState([]);
  const [dropMandals, setDropMandals] = useState([]);
  const [pickupDistrictSearch, setPickupDistrictSearch] = useState("");
  const [pickupMandalSearch, setPickupMandalSearch] = useState("");
  const [dropDistrictSearch, setDropDistrictSearch] = useState("");
  const [dropMandalSearch, setDropMandalSearch] = useState("");
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [serviceAreasSaved, setServiceAreasSaved] = useState(false);
  const [savedData, setSavedData] = useState(null);

  // Load existing service areas
  useEffect(() => {
    fetchServiceAreas();
  }, []);

  useEffect(() => {
    loadDistricts();
  }, []);

  useEffect(() => {
    if (pickupDistrict) {
      loadMandals(pickupDistrict, "", setPickupMandals);
      setPickupMandal([]);
      setPickupMandalSearch("");
    } else {
      setPickupMandals([]);
      setPickupMandal([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDistrict]);

  useEffect(() => {
    if (dropDistrict) {
      loadMandals(dropDistrict, "", setDropMandals);
      setDropMandal([]);
      setDropMandalSearch("");
    } else {
      setDropMandals([]);
      setDropMandal([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropDistrict]);

  useEffect(() => {
    if (pickupDistrict) {
      loadMandals(pickupDistrict, pickupMandalSearch, setPickupMandals);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupMandalSearch, pickupDistrict]);

  useEffect(() => {
    if (dropDistrict) {
      loadMandals(dropDistrict, dropMandalSearch, setDropMandals);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropMandalSearch, dropDistrict]);

  const fetchServiceAreas = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/dealer/transport-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPickupLocations(data.profile?.pickupLocations || []);
        setDropLocations(data.profile?.dropLocations || []);
      }
    } catch (err) {
      console.error("Error fetching service areas:", err);
    }
  };

  const fetchSavedServiceAreas = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/dealer/transport-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSavedData(data.profile);
      }
    } catch (err) {
      console.error("Error fetching saved service areas:", err);
    }
  };

  const loadDistricts = async (searchTerm = "") => {
    try {
      setDistrictsLoading(true);
      const data = await apiGet(`locations/districts?search=${encodeURIComponent(searchTerm)}`);
      if (data.success) {
        setDistricts(data.districts);
      }
    } catch (err) {
      console.error("Error loading districts:", err);
    } finally {
      setDistrictsLoading(false);
    }
  };

  const loadMandals = async (district, searchTerm, setMandalsList) => {
    try {
      console.log(`Loading mandals for district: ${district}, search: ${searchTerm}`);
      const data = await apiGet(`locations/mandals/${encodeURIComponent(district)}?search=${encodeURIComponent(searchTerm || "")}`);
      console.log(`Mandals response:`, data);
      if (data.success) {
        setMandalsList(data.mandals || []);
        console.log(`Set ${data.mandals?.length || 0} mandals`);
      } else {
        console.warn("Failed to load mandals:", data);
        setMandalsList([]);
      }
    } catch (err) {
      console.error("Error loading mandals:", err);
      setMandalsList([]);
    }
  };

  /* Add pickup location */
  const addPickupLocation = () => {
    if (!pickupDistrict || pickupMandal.length === 0) {
      setMessage("Please select pickup district and at least one mandal");
      return;
    }

    const newLocations = [];
    const duplicates = [];

    pickupMandal.forEach(mandal => {
      const locationName = `${mandal}, ${pickupDistrict}`;
      if (pickupLocations.includes(locationName)) {
        duplicates.push(mandal);
      } else {
        newLocations.push(locationName);
      }
    });

    if (newLocations.length > 0) {
      setPickupLocations([...pickupLocations, ...newLocations]);
      setPickupMandal([]);
      setPickupMandalSearch("");
      setMessage(`✅ Added ${newLocations.length} pickup location(s)${duplicates.length > 0 ? ` (${duplicates.length} duplicate(s) skipped)` : ''}`);
    } else {
      setMessage("All selected mandals already added");
    }
  };

  /* Add drop location */
  const addDropLocation = () => {
    if (!dropDistrict || dropMandal.length === 0) {
      setMessage("Please select drop district and at least one mandal");
      return;
    }

    const newLocations = [];
    const duplicates = [];

    dropMandal.forEach(mandal => {
      const locationName = `${mandal}, ${dropDistrict}`;
      if (dropLocations.includes(locationName)) {
        duplicates.push(mandal);
      } else {
        newLocations.push(locationName);
      }
    });

    if (newLocations.length > 0) {
      setDropLocations([...dropLocations, ...newLocations]);
      setDropMandal([]);
      setDropMandalSearch("");
      setMessage(`✅ Added ${newLocations.length} drop location(s)${duplicates.length > 0 ? ` (${duplicates.length} duplicate(s) skipped)` : ''}`);
    } else {
      setMessage("All selected mandals already added");
    }
  };

  /* Remove individual pickup location */
  const removePickupLocation = (location) => {
    setPickupLocations(pickupLocations.filter(loc => loc !== location));
    setMessage(`✅ Removed: ${location}`);
    setTimeout(() => setMessage(""), 1500);
  };

  /* Remove all pickup locations */
  const clearAllPickupLocations = () => {
    if (window.confirm("Are you sure you want to clear all pickup locations?")) {
      setPickupLocations([]);
      setMessage("✅ All pickup locations cleared");
      setTimeout(() => setMessage(""), 1500);
    }
  };

  /* Remove individual drop location */
  const removeDropLocation = (location) => {
    setDropLocations(dropLocations.filter(loc => loc !== location));
    setMessage(`✅ Removed: ${location}`);
    setTimeout(() => setMessage(""), 1500);
  };

  /* Remove all drop locations */
  const clearAllDropLocations = () => {
    if (window.confirm("Are you sure you want to clear all drop locations?")) {
      setDropLocations([]);
      setMessage("✅ All drop locations cleared");
      setTimeout(() => setMessage(""), 1500);
    }
  };

  /* Save to backend */
  const saveServiceAreas = async () => {
    if (pickupLocations.length === 0 || dropLocations.length === 0) {
      setMessage("⚠️ Please add at least one pickup and one drop location");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

       if (!token) {
         throw new Error("Please login first");
       }

       console.log("Saving service areas:", { pickupLocations, dropLocations });

      const response = await fetch(`${API_BASE_URL}/dealer/register-transport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupLocations,
          dropLocations,
        }),
      });

       const data = await response.json();
       console.log("Server response:", data);

      if (!response.ok) {
         throw new Error(data.error || data.message || `Server error (${response.status})`);
      }

      setServiceAreasSaved(true);
      setMessage("✅ Service areas saved successfully!");
      setTimeout(() => setMessage(""), 1500);
      // Fetch and display the saved data
      setTimeout(() => fetchSavedServiceAreas(), 500);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* Filter locations for search */
  const filteredPickupLocations = pickupLocations.filter(loc =>
    loc.toLowerCase().includes(searchPickup.toLowerCase())
  );

  const filteredDropLocations = dropLocations.filter(loc =>
    loc.toLowerCase().includes(searchDrop.toLowerCase())
  );

  return (
    <div className="service-area-container">
      <div className="service-area-header">
        <h2>📍 Service Areas Setup</h2>
        <p>Select pickup and drop locations for your deliveries</p>
        <button
          className="service-area-back"
          onClick={() => navigate("/transport-dealer/vehicles")}
          type="button"
        >
          ← Back
        </button>
      </div>

      {message && (
        <div className={`service-area-message ${message.includes("✅") ? "success" : message.includes("❌") ? "error" : "info"}`}>
          {message}
        </div>
      )}

      <div className="service-area-grid">
        {/* Selector Section */}
        <div className="selector-section">
          <h3>🎯 Add New Location</h3>
          <div className="selector-columns">
            <div className="selector-card">
              <h4>🔵 Pickup Location</h4>
              <div className="selector-group">
                <label>Select District:</label>
                <div className="search-row">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search district..."
                    value={pickupDistrictSearch}
                    onChange={(e) => setPickupDistrictSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="search-btn"
                    onClick={() => loadDistricts(pickupDistrictSearch)}
                    disabled={districtsLoading}
                  >
                    Search
                  </button>
                </div>
                <select
                  className="form-control"
                  value={pickupDistrict}
                  onChange={(e) => {
                    setPickupDistrict(e.target.value);
                    setPickupMandal([]);
                  }}
                  disabled={districtsLoading}
                >
                  <option value="">-- Select District --</option>
                  {districts.map((district) => (
                    <option key={district.code || district.district} value={district.district}>
                      {district.district} ({district.mandalCount} mandals)
                    </option>
                  ))}
                </select>
              </div>

              <div className="selector-group">
                <label>Select Mandal:</label>
                <div className="search-row">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search mandal..."
                    value={pickupMandalSearch}
                    onChange={(e) => setPickupMandalSearch(e.target.value)}
                    disabled={!pickupDistrict}
                  />
                  <button
                    type="button"
                    className="search-btn"
                    onClick={() => loadMandals(pickupDistrict, pickupMandalSearch, setPickupMandals)}
                    disabled={!pickupDistrict}
                  >
                    Search
                  </button>
                </div>
                <select
                  className="form-control mandal-multiselect"
                  value={pickupMandal}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setPickupMandal(selectedOptions);
                  }}
                  disabled={!pickupDistrict}
                  multiple
                  size="5"
                >
                  {pickupMandals.length === 0 ? (
                    <option disabled>No mandals available</option>
                  ) : (
                    pickupMandals.map((mandal) => (
                      <option key={mandal.name} value={mandal.name}>
                        {mandal.name}
                      </option>
                    ))
                  )}
                </select>
                <small style={{color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block'}}>
                  💡 Hold Ctrl (Windows) or Cmd (Mac) to select multiple mandals
                </small>
              </div>

              <div className="selector-actions">
                <button
                  className="btn-add pickup"
                  onClick={addPickupLocation}
                  disabled={loading || pickupMandal.length === 0}
                >
                  ➕ Add Pickup Location{pickupMandal.length > 1 ? 's' : ''}
                  {pickupMandal.length > 0 && ` (${pickupMandal.length})`}
                </button>
              </div>
            </div>

            <div className="selector-card">
              <h4>🟡 Drop Location</h4>
              <div className="selector-group">
                <label>Select District:</label>
                <div className="search-row">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search district..."
                    value={dropDistrictSearch}
                    onChange={(e) => setDropDistrictSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="search-btn"
                    onClick={() => loadDistricts(dropDistrictSearch)}
                    disabled={districtsLoading}
                  >
                    Search
                  </button>
                </div>
                <select
                  className="form-control"
                  value={dropDistrict}
                  onChange={(e) => {
                    setDropDistrict(e.target.value);
                    setDropMandal([]);
                  }}
                  disabled={districtsLoading}
                >
                  <option value="">-- Select District --</option>
                  {districts.map((district) => (
                    <option key={district.code || district.district} value={district.district}>
                      {district.district} ({district.mandalCount} mandals)
                    </option>
                  ))}
                </select>
              </div>

              <div className="selector-group">
                <label>Select Mandal:</label>
                <div className="search-row">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search mandal..."
                    value={dropMandalSearch}
                    onChange={(e) => setDropMandalSearch(e.target.value)}
                    disabled={!dropDistrict}
                  />
                  <button
                    type="button"
                    className="search-btn"
                    onClick={() => loadMandals(dropDistrict, dropMandalSearch, setDropMandals)}
                    disabled={!dropDistrict}
                  >
                    Search
                  </button>
                </div>
                <select
                  className="form-control mandal-multiselect"
                  value={dropMandal}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setDropMandal(selectedOptions);
                  }}
                  disabled={!dropDistrict}
                  multiple
                  size="5"
                >
                  {dropMandals.length === 0 ? (
                    <option disabled>No mandals available</option>
                  ) : (
                    dropMandals.map((mandal) => (
                      <option key={mandal.name} value={mandal.name}>
                        {mandal.name}
                      </option>
                    ))
                  )}
                </select>
                <small style={{color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block'}}>
                  💡 Hold Ctrl (Windows) or Cmd (Mac) to select multiple mandals
                </small>
              </div>

              <div className="selector-actions">
                <button
                  className="btn-add drop"
                  onClick={addDropLocation}
                  disabled={loading || dropMandal.length === 0}
                >
                  ➕ Add Drop Location{dropMandal.length > 1 ? 's' : ''}
                  {dropMandal.length > 0 && ` (${dropMandal.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="locations-section">
          <div className="locations-header">
            <h3>📤 Pickup Locations ({pickupLocations.length})</h3>
            <div style={{display: 'flex', gap: '8px'}}>
              <input
                type="text"
                className="search-input"
                placeholder="Search pickup..."
                value={searchPickup}
                onChange={(e) => setSearchPickup(e.target.value)}
              />
              <button
                className="btn-remove"
                onClick={clearAllPickupLocations}
                disabled={pickupLocations.length === 0}
                title="Clear all pickup locations"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>

          <div className="locations-list">
            {filteredPickupLocations.length > 0 ? (
              filteredPickupLocations.map((location) => (
                <div key={location} className="location-chip pickup-chip">
                  <span>{location}</span>
                  <button
                    className="remove-btn"
                    onClick={() => removePickupLocation(location)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-message">No pickup locations added yet</p>
            )}
          </div>
        </div>

        <div className="locations-section">
          <div className="locations-header">
            <h3>📥 Drop Locations ({dropLocations.length})</h3>
            <div style={{display: 'flex', gap: '8px'}}>
              <input
                type="text"
                className="search-input"
                placeholder="Search drop..."
                value={searchDrop}
                onChange={(e) => setSearchDrop(e.target.value)}
              />
              <button
                className="btn-remove"
                onClick={clearAllDropLocations}
                disabled={dropLocations.length === 0}
                title="Clear all drop locations"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>

          <div className="locations-list">
            {filteredDropLocations.length > 0 ? (
              filteredDropLocations.map((location) => (
                <div key={location} className="location-chip drop-chip">
                  <span>{location}</span>
                  <button
                    className="remove-btn"
                    onClick={() => removeDropLocation(location)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-message">No drop locations added yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="save-section">
        {!serviceAreasSaved ? (
          <>
            <button
              className="btn-save"
              onClick={saveServiceAreas}
              disabled={loading || pickupLocations.length === 0 || dropLocations.length === 0}
            >
              {loading ? "Saving..." : "💾 Save Service Areas"}
            </button>
            <p className="save-hint">
              ℹ️ Your dealers can only accept requests for routes within your selected service areas
            </p>
          </>
        ) : (
          <div className="completion-card">
            <div className="completion-header">
              <div className="completion-icon">✅</div>
              <h3>Setup Complete!</h3>
            </div>
            <p className="completion-message">
              Your vehicle details and service areas have been successfully saved.
            </p>
            
            {/* Display Saved Data */}
            {savedData && (
              <div className="saved-areas-display">
                <h4>📍 Service Areas Summary</h4>
                
                {savedData.pickupLocations && savedData.pickupLocations.length > 0 && (
                  <div className="saved-section">
                    <h5>🔵 Pickup Locations ({savedData.pickupLocations.length})</h5>
                    <div className="saved-locations">
                      {savedData.pickupLocations.map((location, idx) => (
                        <span key={idx} className="saved-location-tag pickup">
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {savedData.dropLocations && savedData.dropLocations.length > 0 && (
                  <div className="saved-section">
                    <h5>🟡 Drop Locations ({savedData.dropLocations.length})</h5>
                    <div className="saved-locations">
                      {savedData.dropLocations.map((location, idx) => (
                        <span key={idx} className="saved-location-tag drop">
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button
              className="btn-complete"
              onClick={() => navigate("/transport-dealer/vehicles")}
            >
              ✨ Complete Setup & Go to Dashboard
            </button>
          </div>
        )}
      </div>

      
    </div>
  );
}
