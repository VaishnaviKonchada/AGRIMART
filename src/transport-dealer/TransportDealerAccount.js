import React, { useEffect, useState } from "react";
import { geocodeAddress } from "../utils/geocode";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut, API_BASE_URL } from "../utils/api";
import { getCurrentLocationDetails } from "../utils/locationHelpers";
import "../styles/TransportDealerAccount.css";

export default function TransportDealerAccount() {
  const navigate = useNavigate();
  const [dealer, setDealer] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    state: "",
    district: "",
    mandal: "",
    doorNo: "",
    location: "",
    pincode: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    licenseNumber: "",
    vehicleCount: 0,
    coordinates: null,
  });
    const [addressCoords, setAddressCoords] = useState(null);
    const [coordsError, setCoordsError] = useState("");
    const [fetchingCoords, setFetchingCoords] = useState(false);

    function getFullAddress() {
      const parts = [
        dealer.doorNo,
        dealer.location,
        dealer.mandal,
        dealer.district,
        dealer.state,
        dealer.pincode,
        dealer.country
      ];
      return parts.filter(Boolean).join(", ");
    }

    async function handleFetchCoordinates() {
      setFetchingCoords(true);
      setCoordsError("");
      try {
        const address = getFullAddress();
        if (!address || address.replace(/[\,\s]/g, "").length < 8) {
          setCoordsError("Please enter a valid address");
          setFetchingCoords(false);
          return;
        }
        const coords = await geocodeAddress(address);
        setAddressCoords(coords);
        setCoordsError("");
        setDealer((prev) => ({ ...prev, coordinates: coords }));
      } catch (err) {
        setCoordsError("Could not fetch coordinates for this address");
        setAddressCoords(null);
      } finally {
        setFetchingCoords(false);
      }
    }
  const [vehicles, setVehicles] = useState([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [famousNearby, setFamousNearby] = useState([]);
  const [locationPayload, setLocationPayload] = useState(null);

  useEffect(() => {
    fetchDealerProfile();
    loadVehicles();
  }, []);

  const fetchDealerProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet("users/me");
      console.log('✅ Dealer profile loaded:', data.user.name, 'Role:', data.user.role);
      const user = data.user;
      setDealer({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        country: user.country || '',
        state: user.state || '',
        district: user.district || '',
        mandal: user.mandal || '',
        doorNo: user.doorNo || '',
        location: user.location || '',
        pincode: user.pincode || '',
        bankName: dealer.bankName || '',
        accountNumber: dealer.accountNumber || '',
        ifscCode: dealer.ifscCode || '',
        licenseNumber: dealer.licenseNumber || '',
        vehicleCount: vehicles.length,
        coordinates: user.coordinates || null,
      });
      // Update only role and name in localStorage, keep original login data
      const storedUser = JSON.parse(localStorage.getItem("registeredUser") || '{}');
      localStorage.setItem("registeredUser", JSON.stringify({...storedUser, name: user.name, role: user.role}));
    } catch (error) {
      console.error("Error fetching dealer profile:", error);
    } finally {
      setLoading(false);
    }
  };

  /* 🚗 Load all vehicles added by this dealer */
  const loadVehicles = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const response = await fetch(`${API_BASE_URL}/dealer/vehicles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success) {
          setVehicles(data.vehicles || []);
          setDealer((d) => ({ ...d, vehicleCount: data.vehicles.length }));
          return;
        }
      }

      const data = await apiGet("dealer/vehicles");
      if (data.success) {
        setVehicles(data.vehicles || []);
        setDealer((d) => ({ ...d, vehicleCount: data.vehicles.length }));
      }
    } catch (err) {
      console.error("Error loading vehicles:", err);
    }
  };

  const save = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert('Please login again to save changes.');
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      const data = await apiPut('users/profile', {
        name: dealer.name,
        phone: dealer.phone,
        country: dealer.country,
        state: dealer.state,
        district: dealer.district,
        mandal: dealer.mandal,
        doorNo: dealer.doorNo,
        pincode: dealer.pincode,
        locationText: dealer.location,
        coordinates: dealer.coordinates,
      });

      console.log('✅ Profile updated successfully:', data);
      alert("Profile updated successfully ✅");
      setEditMode(false);
      // Refresh profile from backend
      fetchDealerProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    // Clear all localStorage data
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("registeredUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("dealerProfile");
    localStorage.removeItem("farmerProfile");
    localStorage.removeItem("adminProfile");
    
    console.log("✅ Dealer logged out successfully");
    alert("Logged out successfully. You can now login with a different role.");
    navigate("/login");
  };

  const applyLocation = (payload, chosenLocation) => {
    const nextLocation = String(chosenLocation || payload?.selectedLocation || payload?.baseLocation || "").trim();
    if (!nextLocation) return;

    setDealer((prev) => ({
      ...prev,
      location: nextLocation,
      pincode: payload?.pincode || prev.pincode,
      state: payload?.state || prev.state,
      country: payload?.country || prev.country,
      district: payload?.district || prev.district,
      mandal: payload?.mandal || prev.mandal,
      coordinates: payload?.coordinates || prev.coordinates,
    }));
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const payload = await getCurrentLocationDetails();
      setLocationPayload(payload);
      setLocationSuggestions(payload.suggestions || []);
      setFamousNearby(payload.famousNearby || []);
      setShowLocationModal(true);
      applyLocation(payload);
    } catch (error) {
      console.error("Current location fetch failed:", error);
      alert("Unable to fetch your current location.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const handlePickSuggestedLocation = (value) => {
    applyLocation(locationPayload, value);
    setShowLocationModal(false);
  };

  const handlePickFamousPlace = (place) => {
    const current = String(dealer.location || "").trim();
    const cleaned = current.replace(/\s*\(Near\s+[^)]+\)\s*$/i, "").trim();
    const nextValue = cleaned ? `${cleaned} (Near ${place})` : String(place);
    applyLocation(locationPayload, nextValue);
    setShowLocationModal(false);
  };

  return (
    <div className="transport-dealer-account">
      {/* Header */}
      <div className="account-header">
        <div className="title-wrap">
          <h2>🚚 Dealer Account</h2>
          <p className="subtitle">Manage your profile and business details</p>
        </div>
        <button className="dashboard-btn" onClick={() => navigate("/transport-dealer-dashboard")}>
          <span className="dash-icon">📊</span>
          <span className="dash-label">Dashboard</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="profile-card">
        <div className="avatar">
          {(dealer.name || "D").charAt(0).toUpperCase()}
        </div>
        <div className="info">
          <div className="name">{dealer.name || "Dealer Name"}</div>
          <div className="email">{dealer.email || "email@example.com"}</div>
          <div className="location">
            📍 {dealer.mandal || "Mandal"}, {dealer.district || "District"}, {dealer.state || "State"}{" "}
            {dealer.pincode ? `- ${dealer.pincode}` : ""}
          </div>
          <div className="location" style={{fontSize: '12px', opacity: 0.8}}>
            {dealer.location || "Full location"} • {dealer.country || "Country"}
          </div>
        </div>
        <div className="badges">
          <span className="badge verified">Verified</span>
          <span className="badge active">Active</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat">
          <div className="icon">📦</div>
          <div className="content">
            <div className="label">Total Deliveries</div>
            <div className="value">0</div>
          </div>
        </div>
        <div className="stat">
          <div className="icon">🚙</div>
          <div className="content">
            <div className="label">Vehicles</div>
            <div className="value">{dealer.vehicleCount || 0}</div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Buttons */}
      <div className="quick-nav-buttons">
        <button 
          className="nav-btn orders-btn"
          onClick={() => navigate("/transport-dealer/orders")}
        >
          <span className="nav-icon">📦</span>
          <span className="nav-label">Confirmed Orders</span>
        </button>
        <button 
          className="nav-btn payments-btn"
          onClick={() => navigate("/transport-dealer/payments")}
        >
          <span className="nav-icon">💰</span>
          <span className="nav-label">Payment Details</span>
        </button>
        <button 
          className="nav-btn vehicles-btn"
          onClick={() => {
            loadVehicles();
            setShowVehicleModal(true);
          }}
        >
          <span className="nav-icon">🚚</span>
          <span className="nav-label">View Vehicles</span>
        </button>
        <button 
          className="nav-btn"
          onClick={() => navigate("/transport-dealer/support")}
        >
          <span className="nav-icon">⚠️</span>
          <span className="nav-label">Complaints</span>
        </button>
      </div>

      {/* Form Sections */}
      <div className="form-section">
        <h3 className="section-title">📋 Personal Information</h3>
        <fieldset className="form-grid" disabled={!editMode}>
          <div className="field">
            <label>Full Name</label>
            <input
              value={dealer.name}
              onChange={(e) => setDealer({ ...dealer, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={dealer.email} disabled />
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input
              value={dealer.phone}
              onChange={(e) => setDealer({ ...dealer, phone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
          <div className="field">
            <label>License Number</label>
            <input
              value={dealer.licenseNumber}
              onChange={(e) => setDealer({ ...dealer, licenseNumber: e.target.value })}
              placeholder="DL1234567890"
            />
          </div>
        </fieldset>
      </div>

      {/* Address Information */}
      <div className="form-section">
        <h3 className="section-title">🏠 Address Information</h3>
        <fieldset className="form-grid" disabled={!editMode}>
          <div className="field">
            <label>Country</label>
            <input
              value={dealer.country}
              onChange={(e) => setDealer({ ...dealer, country: e.target.value })}
              placeholder="India"
            />
          </div>
          <div className="field">
            <label>State</label>
            <input
              value={dealer.state}
              onChange={(e) => setDealer({ ...dealer, state: e.target.value })}
              placeholder="Andhra Pradesh"
            />
          </div>
          <div className="field">
            <label>District</label>
            <input
              value={dealer.district}
              onChange={(e) => setDealer({ ...dealer, district: e.target.value })}
              placeholder="Srikakulam"
            />
          </div>
          <div className="field">
            <label>Mandal</label>
            <input
              value={dealer.mandal}
              onChange={(e) => setDealer({ ...dealer, mandal: e.target.value })}
              placeholder="Srikakulam"
            />
          </div>
          <div className="field">
            <label>Pincode</label>
            <input
              value={dealer.pincode}
              onChange={(e) => setDealer({ ...dealer, pincode: e.target.value })}
              placeholder="123456"
            />
          </div>
          <div className="field">
            <label>Door No/House No</label>
            <input
              value={dealer.doorNo}
              onChange={(e) => setDealer({ ...dealer, doorNo: e.target.value })}
              placeholder="E.g., 123-A"
            />
          </div>
          <div className="field full">
            <label>Full Location/Address</label>
            <input
              value={dealer.location}
              onChange={(e) => setDealer({ ...dealer, location: e.target.value })}
              placeholder="Street, Area, Landmark"
            />
          </div>
          {/* Address Coordinates Field - below address */}
          <div className="field full">
            <label>Address Coordinates</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1a4d2e', fontSize: '15px' }}>
                {dealer.coordinates && dealer.coordinates.lat && dealer.coordinates.lon
                  ? `${dealer.coordinates.lat.toFixed(6)}, ${dealer.coordinates.lon.toFixed(6)}`
                  : '--'}
              </span>
              {editMode && (
                <button
                  type="button"
                  className="fetch-coords-btn"
                  onClick={handleFetchCoordinates}
                  disabled={fetchingCoords}
                  style={{
                    background: editMode ? 'linear-gradient(90deg, #4caf50 60%, #2196f3 100%)' : '#bdbdbd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: fetchingCoords ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(33,150,243,0.08)',
                    transition: 'background 0.2s',
                    outline: 'none',
                    marginLeft: '4px'
                  }}
                >
                  {fetchingCoords ? 'Fetching...' : 'Fetch from Address'}
                </button>
              )}
              {coordsError && (
                <span style={{ color: 'red', marginLeft: 8, fontSize: '13px' }}>{coordsError}</span>
              )}
            </div>
          </div>
        </fieldset>
      </div>

      {showLocationModal && (
        <div className="account-location-modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="account-location-modal" onClick={(e) => e.stopPropagation()}>
            <div className="account-location-modal-header">
              <h3>Pick Current Location</h3>
              <button type="button" className="account-location-modal-close" onClick={() => setShowLocationModal(false)}>
                ✕
              </button>
            </div>

            {locationPayload?.baseLocation && (
              <p className="account-location-modal-text">Detected: {locationPayload.baseLocation}</p>
            )}

            {locationSuggestions.length > 0 && (
              <div className="account-location-suggestions">
                {locationSuggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion}-${idx}`}
                    type="button"
                    className="account-suggestion-chip"
                    onClick={() => handlePickSuggestedLocation(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {famousNearby.length > 0 && (
              <div className="account-famous-nearby">
                <span className="account-famous-title">Nearby famous place(s):</span>
                <div className="account-famous-list">
                  {famousNearby.map((place, idx) => (
                    <button
                      key={`${place}-${idx}`}
                      type="button"
                      className="account-famous-chip"
                      onClick={() => handlePickFamousPlace(place)}
                    >
                      {place}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banking Information */}
      <div className="form-section">
        <h3 className="section-title">🏦 Banking Information</h3>
        <fieldset className="form-grid" disabled={!editMode}>
          <div className="field">
            <label>Bank Name</label>
            <input
              value={dealer.bankName}
              onChange={(e) => setDealer({ ...dealer, bankName: e.target.value })}
              placeholder="Enter bank name"
            />
          </div>
          <div className="field">
            <label>Account Number</label>
            <input
              value={dealer.accountNumber}
              onChange={(e) => setDealer({ ...dealer, accountNumber: e.target.value })}
              placeholder="Enter account number"
            />
          </div>
          <div className="field">
            <label>IFSC Code</label>
            <input
              value={dealer.ifscCode}
              onChange={(e) => setDealer({ ...dealer, ifscCode: e.target.value })}
              placeholder="SBIN0001234"
            />
          </div>
        </fieldset>
      </div>

      {/* Vehicle List Modal */}
      {showVehicleModal && (
        <div className="vehicle-modal-overlay" onClick={() => setShowVehicleModal(false)}>
          <div className="vehicle-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🚗 Your Vehicles ({vehicles.length})</h2>
              <button className="close-btn" onClick={() => setShowVehicleModal(false)}>✕</button>
            </div>
            
            {vehicles.length > 0 ? (
              <div className="vehicle-list">
                {vehicles.map((vehicle) => (
                  <div key={vehicle._id} className="vehicle-card-modal">
                    <div className="vehicle-header">
                      <div className="vehicle-title">
                        <h3>{vehicle.vehicleName || vehicle.name}</h3>
                        <span className={`status-badge ${vehicle.status?.toLowerCase()}`}>
                          {vehicle.status || 'Active'}
                        </span>
                      </div>
                      <div className="vehicle-type-badge">{vehicle.vehicleType || vehicle.type}</div>
                    </div>
                    
                    <div className="vehicle-details">
                      <div className="detail-row">
                        <span className="label">License Plate:</span>
                        <span className="value">{vehicle.licensePlate}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Capacity:</span>
                        <span className="value">{vehicle.capacity} kg</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Year:</span>
                        <span className="value">{vehicle.year || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Quantity:</span>
                        <span className="value">{vehicle.quantity}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Insurance Expiry:</span>
                        <span className="value">{vehicle.insuranceExpiry || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Visible to Customers:</span>
                        <span className="value">{vehicle.isVisibleToCustomers ? 'Yes' : 'No'}</span>
                      </div>
                      {vehicle.pickupLocations?.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Pickup Locations:</span>
                          <div className="location-list">
                            {vehicle.pickupLocations.map((loc, i) => (
                              <span key={i} className="location-chip pickup">📍 {loc}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {vehicle.dropLocations?.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Drop Locations:</span>
                          <div className="location-list">
                            {vehicle.dropLocations.map((loc, i) => (
                              <span key={i} className="location-chip drop">🎯 {loc}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-vehicles">
                <div className="empty-icon">🚫</div>
                <h3>No Vehicles Added</h3>
                <p>You haven't added any vehicles yet.</p>
                <button 
                  className="add-vehicle-link-btn"
                  onClick={() => {
                    setShowVehicleModal(false);
                    navigate("/transport-dealer/vehicles");
                  }}
                >
                  ➕ Add Your First Vehicle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {!editMode ? (
          <>
            <button className="save-btn" type="button" onClick={() => setEditMode(true)}>
              ✏️ Edit Details
            </button>
            <button className="logout-btn" type="button" onClick={handleLogout}>
              🚪 Logout
            </button>
          </>
        ) : (
          <>
            <button className="save-btn" type="button" onClick={save} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
            <button className="cancel-btn" type="button" onClick={() => setEditMode(false)} disabled={saving}>
              Cancel
            </button>
            <button className="logout-btn" type="button" onClick={handleLogout}>
              🚪 Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
