import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../utils/api";
import { getCurrentLocationDetails } from "../utils/locationHelpers";
import './styles/ManagementPages.css';
import '../styles/TransportDealerAccount.css';



const AdminAccount = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [famousNearby, setFamousNearby] = useState([]);
  const [locationPayload, setLocationPayload] = useState(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    state: '',
    district: '',
    mandal: '',
    doorNo: '',
    pincode: '',
    location: '',
    coordinates: null
  });

  // Address Coordinates logic
  const [fetchingCoords, setFetchingCoords] = useState(false);
  const [coordsError, setCoordsError] = useState("");

  function getFullAddress() {
    const parts = [
      formData.doorNo,
      formData.location,
      formData.mandal,
      formData.district,
      formData.state,
      formData.pincode,
      formData.country
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
      // Use your geocode utility here
      // Example: const coords = await geocodeAddress(address);
      // setFormData((prev) => ({ ...prev, coordinates: coords }));
      // setCoordsError("");
      // setFetchingCoords(false);
    } catch (err) {
      setCoordsError("Could not fetch coordinates for this address");
    } finally {
      setFetchingCoords(false);
    }
  }

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Admin profile loaded:', data.user.name, 'Role:', data.user.role);
        setAdmin(data.user);
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          country: data.user.country || '',
          state: data.user.state || '',
          district: data.user.district || '',
          mandal: data.user.mandal || '',
          doorNo: data.user.doorNo || '',
          pincode: data.user.pincode || '',
          location: data.user.location || '',
          coordinates: data.user.coordinates || null
        });
        // Update only role and name in localStorage, keep original login data
        const storedUser = JSON.parse(localStorage.getItem("registeredUser") || '{}');
        localStorage.setItem("registeredUser", JSON.stringify({...storedUser, name: data.user.name, role: data.user.role}));
      } else if (response.status === 401) {
        console.error('❌ Token expired or invalid. Redirecting to login.');
        alert('Your session has expired. Please login again.');
        localStorage.clear();
        navigate('/login');
      }
    } catch (error) {
      console.error("Error fetching admin profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const applyLocation = (payload, chosenLocation) => {
    const nextLocation = String(chosenLocation || payload?.selectedLocation || payload?.baseLocation || "").trim();
    if (!nextLocation) return;

    setFormData((prev) => ({
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
    const current = String(formData.location || "").trim();
    const cleaned = current.replace(/\s*\(Near\s+[^)]+\)\s*$/i, "").trim();
    const nextValue = cleaned ? `${cleaned} (Near ${place})` : String(place);
    applyLocation(locationPayload, nextValue);
    setShowLocationModal(false);
  };

  const saveProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.user);
        // Update only name and role in localStorage, keep original login data
        const storedUser = JSON.parse(localStorage.getItem("registeredUser") || '{}');
        localStorage.setItem("registeredUser", JSON.stringify({...storedUser, name: data.user.name, role: data.user.role}));
        alert("Profile updated successfully ✅");
        setEditMode(false);
        // Refresh profile from backend
        fetchAdminProfile();
      } else if (response.status === 401) {
        alert('Your session has expired. Please login again.');
        localStorage.clear();
        navigate('/login');
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile");
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
    
    console.log("✅ Admin logged out successfully");
    alert("Logged out successfully. You can now login with a different role.");
    navigate("/login");
  };

  const goBack = () => navigate('/admin');

  if (loading) {
    return (
      <div className="management-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="management-page">
        <div className="account-container">
          <div className="profile-card">
            <p>Please log in to view your admin account</p>
            <button onClick={() => navigate('/login')}>🔐 Go to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="transport-dealer-account">
      <div className="account-header">
        <div className="title-wrap">
          <h2>🛡️ Administrator Account</h2>
          <p className="subtitle">Manage your admin profile and access</p>
        </div>
        <button className="dashboard-btn" onClick={() => navigate('/admin-dashboard')}>
          <span className="dash-icon">📊</span>
          <span className="dash-label">Dashboard</span>
        </button>
      </div>

      <div className="profile-card">
        <div className="avatar">{(admin.name || "A").charAt(0).toUpperCase()}</div>
        <div className="info">
          <div className="name">{admin.name || "Administrator"}</div>
          <div className="email">{admin.email || "admin@example.com"}</div>
          <div className="location">
            📍 {admin.mandal || "Mandal"}, {admin.district || "District"}, {admin.state || "State"}
            {admin.pincode ? ` - ${admin.pincode}` : ""}
          </div>
          <div className="location" style={{ fontSize: "12px", opacity: 0.8 }}>
            {admin.location || "Full location"} • {admin.country || "Country"}
          </div>
        </div>
        <div className="badges">
          <span className="badge verified">Full Access</span>
          <span className="badge active">Active</span>
        </div>
      </div>

      <div className="quick-nav-buttons">
        <button className="nav-btn orders-btn" onClick={() => navigate('/admin/users')}>
          <span className="nav-icon">👥</span>
          <span className="nav-label">Manage Users</span>
        </button>
        <button className="nav-btn payments-btn" onClick={() => navigate('/admin/orders')}>
          <span className="nav-icon">📦</span>
          <span className="nav-label">Monitor Orders</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/admin/complaints')}>
          <span className="nav-icon">⚠️</span>
          <span className="nav-label">Complaints</span>
        </button>
      </div>

      <div className="form-section">
        <h3 className="section-title">📋 Personal Information</h3>
        <fieldset className="form-grid" disabled={!editMode}>
          <div className="field">
            <label>Full Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={admin.email || ""} disabled />
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
        </fieldset>
      </div>

      <div className="form-section">
        <h3 className="section-title">🏠 Address Information</h3>
        <fieldset className="form-grid" disabled={!editMode}>
          <div className="field">
            <label>Country</label>
            <input
              name="country"
              value={formData.country}
              onChange={handleInputChange}
            />
          </div>
          <div className="field">
            <label>State</label>
            <input
              name="state"
              value={formData.state}
              onChange={handleInputChange}
            />
          </div>
          <div className="field">
            <label>District</label>
            <input
              name="district"
              value={formData.district}
              onChange={handleInputChange}
            />
          </div>
          <div className="field">
            <label>Mandal</label>
            <input
              name="mandal"
              value={formData.mandal}
              onChange={handleInputChange}
            />
          </div>
          <div className="field">
            <label>Door No/House No</label>
            <input
              name="doorNo"
              value={formData.doorNo}
              onChange={handleInputChange}
              placeholder="E.g., 123-A"
            />
          </div>
          <div className="field">
            <label>Pincode</label>
            <input
              name="pincode"
              value={formData.pincode}
              onChange={handleInputChange}
            />
          </div>
          <div className="field full">
            <label>Full Location/Address</label>
            <input
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Street, Area, Landmark"
            />
          </div>
          <div className="field full">
            <label>Address Coordinates</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1a4d2e', fontSize: '15px' }}>
                {formData.coordinates && formData.coordinates.lat && formData.coordinates.lon
                  ? `${formData.coordinates.lat.toFixed(6)}, ${formData.coordinates.lon.toFixed(6)}`
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

      <div className="action-buttons">
        {!editMode ? (
          <>
            <button className="save-btn" type="button" onClick={() => setEditMode(true)}>
              ✏️ Edit Details
            </button>
            <button className="logout-btn" type="button" onClick={() => setShowLogoutConfirm(true)}>
              🚪 Logout
            </button>
          </>
        ) : (
          <>
            <button className="save-btn" type="button" onClick={saveProfile} disabled={saving}>
              {saving ? "💾 Saving..." : "💾 Save Changes"}
            </button>
            <button className="cancel-btn" type="button" onClick={() => setEditMode(false)} disabled={saving}>
              Cancel
            </button>
            <button className="logout-btn" type="button" onClick={() => setShowLogoutConfirm(true)} disabled={saving}>
              🚪 Logout
            </button>
          </>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Logout</h2>
              <button className="close-btn" onClick={() => setShowLogoutConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="logout-message">Are you sure you want to logout?</p>
            </div>
            <div className="modal-footer">
              <button className="logout-confirm-btn" onClick={handleLogout}>
                Yes, Logout
              </button>
              <button className="modal-close-btn" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccount;
