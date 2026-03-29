import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../utils/api";
import { getCurrentLocationDetails } from "../utils/locationHelpers";
import { geocodeAddress } from "../utils/geocode";
import "../styles/Account.css";
import BottomNav from "../components/BottomNav";
import "../styles/TransportDealerAccount.css";

const PENDING_DEALER_REQUESTS_KEY = "pendingDealerRequests";



export default function Account() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("registeredUser") || "null");

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [famousNearby, setFamousNearby] = useState([]);
  const [locationPayload, setLocationPayload] = useState(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    state: '',
    district: '',
    mandal: '',
    doorNo: '',
    pincode: '',
    location: '',
    phone: '',
    coordinates: null
  });
  const [addressCoords, setAddressCoords] = useState(null);
  const [coordsError, setCoordsError] = useState("");
  const [fetchingCoords, setFetchingCoords] = useState(false);
  // Helper to build full address string for geocoding
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

  // Handler to fetch coordinates from address
  async function handleFetchCoordinates() {
    setFetchingCoords(true);
    setCoordsError("");
    try {
      const address = getFullAddress();
      if (!address || address.replace(/[,\s]/g, "").length < 8) {
        setCoordsError("Please enter a valid address");
        setFetchingCoords(false);
        return;
      }
      const coords = await geocodeAddress(address);
      setAddressCoords(coords);
      setCoordsError("");
    } catch (err) {
      setCoordsError("Could not fetch coordinates for this address");
      setAddressCoords(null);
    } finally {
      setFetchingCoords(false);
    }
  }

  useEffect(() => {
    fetchUserProfile();
    fetchOrders();
  }, []);

  useEffect(() => {
    const checkPendingDealerRequests = async () => {
      try {
        const pending = JSON.parse(localStorage.getItem(PENDING_DEALER_REQUESTS_KEY) || "[]");
        if (!Array.isArray(pending) || pending.length === 0) {
          return;
        }

        for (const req of pending) {
          if (!req?.requestId) continue;

          const statusData = await apiGet(`transport-dealers/request/${req.requestId}`);
          if (statusData?.status === "ACCEPTED" && statusData?.chatId) {
            localStorage.setItem(
              "activeChat",
              JSON.stringify({
                chatId: statusData.chatId,
                requestId: req.requestId,
              })
            );

            const next = pending.filter((item) => String(item.requestId) !== String(req.requestId));
            localStorage.setItem(PENDING_DEALER_REQUESTS_KEY, JSON.stringify(next));

            alert("✅ Dealer accepted your request. Opening chat...");
            navigate("/chat");
            return;
          }

          if (["REJECTED", "EXPIRED"].includes(statusData?.status)) {
            const next = pending.filter((item) => String(item.requestId) !== String(req.requestId));
            localStorage.setItem(PENDING_DEALER_REQUESTS_KEY, JSON.stringify(next));
          }
        }
      } catch (err) {
        console.warn("Pending dealer request check failed", err);
      }
    };

    const timer = setInterval(checkPendingDealerRequests, 5000);
    checkPendingDealerRequests();
    return () => clearInterval(timer);
  }, [navigate]);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(storedUser);
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet("users/me");
      if (data) {
        console.log('✅ User profile loaded:', data.user.name, 'Role:', data.user.role);
        setUser(data.user);
        setFormData({
          name: data.user.name || '',
          country: data.user.country || '',
          state: data.user.state || '',
          district: data.user.district || '',
          mandal: data.user.mandal || '',
          doorNo: data.user.doorNo || '',
          pincode: data.user.pincode || '',
          location: data.user.location || '',
          phone: data.user.phone || '',
          coordinates: data.user.coordinates || null
        });
        // Update only role and name in localStorage, keep original login data
        const storedUser = JSON.parse(localStorage.getItem("registeredUser") || '{}');
        localStorage.setItem("registeredUser", JSON.stringify({...storedUser, name: data.user.name, role: data.user.role}));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(storedUser);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await apiGet('orders');
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      const data = await apiPut('users/profile', formData);
      if (data && data.user) {
        setUser(data.user);
        // Update only name and role in localStorage, keep original login data
        const storedUser = JSON.parse(localStorage.getItem("registeredUser") || '{}');
        localStorage.setItem("registeredUser", JSON.stringify({...storedUser, name: data.user.name, role: data.user.role}));
        alert("Profile updated successfully ✅");
        setEditMode(false);
        // Refresh profile from backend
        fetchUserProfile();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile: " + error.message);
      setSaving(false);
    }
  };

  const handleDeliveryStatus = (orderId) => {
    navigate(`/delivery-status/${encodeURIComponent(orderId)}`);
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
    
    console.log("✅ Customer logged out successfully");
    alert("Logged out successfully. You can now login with a different role.");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-hero">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Please log in to view your account</h2>
            <p className="muted">We could not find your profile in this session.</p>
          </div>
          <button className="ghost-btn" onClick={() => navigate("/login")}>🔐 Go to Login</button>
        </div>
      </div>
    );
  }

  const hasCoords =
    typeof user?.coordinates?.lat === "number" && typeof user?.coordinates?.lng === "number";

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(
    (order) => String(order?.status || "").toLowerCase() === "delivered"
  ).length;

  return (
    <div className="transport-dealer-account">
      <div className="account-header">
        <div className="title-wrap">
          <h2>👤 Customer Account</h2>
          <p className="subtitle">Manage your profile and delivery details</p>
        </div>
        <div className="header-actions">
          <button className="dashboard-btn" onClick={() => navigate("/home")}
            title="Go to Home">
            <span className="dash-icon">🏠</span>
            <span className="dash-label">Home</span>
          </button>
          <button className="dashboard-btn" onClick={() => navigate("/orders")}
            title="View Orders">
            <span className="dash-icon">📦</span>
            <span className="dash-label">Orders</span>
          </button>
        </div>
      </div>

      <div className="profile-card">
        <div className="avatar">{(user.name || "C").charAt(0).toUpperCase()}</div>
        <div className="info">
          <div className="name">{user.name || "Customer"}</div>
          <div className="email">{user.email || "email@example.com"}</div>
          <div className="location">
            📍 {user.mandal || "Mandal"}, {user.district || "District"}, {user.state || "State"}
            {user.pincode ? ` - ${user.pincode}` : ""}
          </div>
          <div className="location" style={{ fontSize: "12px", opacity: 0.8 }}>
            {user.location || "Full location"} • {user.country || "Country"}
          </div>
        </div>
        <div className="badges">
          <span className="badge verified">Verified</span>
          <span className="badge active">Active</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="icon">🧾</div>
          <div className="content">
            <div className="label">Total Orders</div>
            <div className="value">{totalOrders}</div>
          </div>
        </div>
        <div className="stat">
          <div className="icon">✅</div>
          <div className="content">
            <div className="label">Delivered</div>
            <div className="value">{deliveredOrders}</div>
          </div>
        </div>
      </div>

      <div className="quick-nav-buttons">
        <button className="nav-btn orders-btn" onClick={() => navigate("/orders")}
          type="button">
          <span className="nav-icon">📦</span>
          <span className="nav-label">My Orders</span>
        </button>
        <button className="nav-btn payments-btn" onClick={() => navigate("/cart")}
          type="button">
          <span className="nav-icon">🛒</span>
          <span className="nav-label">My Cart</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/chat")}
          type="button">
          <span className="nav-icon">💬</span>
          <span className="nav-label">Dealer Chats</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/support")}
          type="button">
          <span className="nav-icon">⚠️</span>
          <span className="nav-label">Complaints</span>
        </button>
      </div>

      <div className="form-section">
        <h3 className="section-title">📋 Personal Information</h3>
        <div className="form-grid">
          <div className="field">
            <label>Full Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={!editMode}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={user.email || ""} disabled />
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={!editMode}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">🏠 Address Information</h3>
        <div className="form-grid">
          <div className="field">
            <label>Country</label>
            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={!editMode}
            />
          </div>
          <div className="field">
            <label>State</label>
            <input
              name="state"
              value={formData.state}
              onChange={handleChange}
              disabled={!editMode}
            />
          </div>
          <div className="field">
            <label>District</label>
            <input
              name="district"
              value={formData.district}
              onChange={handleChange}
              disabled={!editMode}
            />
          </div>
          <div className="field">
            <label>Mandal</label>
            <input
              name="mandal"
              value={formData.mandal}
              onChange={handleChange}
              disabled={!editMode}
            />
          </div>
          <div className="field">
            <label>Door No/House No</label>
            <input
              name="doorNo"
              value={formData.doorNo}
              onChange={handleChange}
              disabled={!editMode}
              placeholder="E.g., 123-A"
            />
          </div>
          <div className="field">
            <label>Pincode</label>
            <input
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              disabled={!editMode}
            />
          </div>
          <div className="field full">
            <label>Full Location/Address</label>
            <div className="account-location-row">
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={!editMode}
              />
              {editMode && (
                <button
                  type="button"
                  className="account-location-pin-btn"
                  onClick={handleUseCurrentLocation}
                  disabled={loadingLocation}
                  title="Use current location"
                >
                  {loadingLocation ? "..." : "📍"}
                </button>
              )}
            </div>
          </div>
          {/* Address Coordinates Field - moved below address */}
          <div className="field full">
            <label>Address Coordinates</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1a4d2e', fontSize: '15px' }}>
                {addressCoords ? `${addressCoords.lat.toFixed(6)}, ${addressCoords.lon.toFixed(6)}` : '--'}
              </span>
              <button
                type="button"
                className="fetch-coords-btn"
                onClick={handleFetchCoordinates}
                disabled={!editMode || fetchingCoords}
                style={{
                  background: editMode ? 'linear-gradient(90deg, #4caf50 60%, #2196f3 100%)' : '#bdbdbd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: (!editMode || fetchingCoords) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(33,150,243,0.08)',
                  transition: 'background 0.2s',
                  outline: 'none',
                  marginLeft: '4px'
                }}
              >
                {fetchingCoords ? 'Fetching...' : 'Fetch from Address'}
              </button>
              {coordsError && (
                <span style={{ color: 'red', marginLeft: 8, fontSize: '13px' }}>{coordsError}</span>
              )}
            </div>
          </div>
        </div>
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
            <button className="logout-btn" type="button" onClick={handleLogout}>
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
            <button className="logout-btn" type="button" onClick={handleLogout} disabled={saving}>
              🚪 Logout
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
