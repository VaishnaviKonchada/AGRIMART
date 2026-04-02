import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { geocodeAddress } from "../utils/geocode";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../utils/api";
import { getCurrentLocationDetails } from "../utils/locationHelpers";
import "../styles/FarmerAccount.css";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function FarmerAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [famousNearby, setFamousNearby] = useState([]);
  const [locationPayload, setLocationPayload] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

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
        const coords = await geocodeAddress(address);
        setAddressCoords(coords);
        setCoordsError("");
        setFormData((prev) => ({ ...prev, coordinates: coords }));
      } catch (err) {
        setCoordsError("Could not fetch coordinates for this address");
        setAddressCoords(null);
      } finally {
        setFetchingCoords(false);
      }
    }
  useEffect(() => {
    fetchFarmerProfile();
    fetchOrders();
  }, []);

  const fetchFarmerProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet("users/me");
      console.log('✅ Farmer profile loaded:', data.user.name, 'Role:', data.user.role);
      setFarmer(data.user);
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
    } catch (error) {
      console.error("Error fetching farmer profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const ordersData = await apiGet("orders");
      setOrders(ordersData);
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

  const save = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setSaving(true);
    try {
      const data = await apiPut("users/profile", formData);
      setFarmer(data.user);
      // Update only name and role in localStorage, keep original login data
      const storedUser = JSON.parse(localStorage.getItem("registeredUser") || '{}');
      localStorage.setItem("registeredUser", JSON.stringify({...storedUser, name: data.user.name, role: data.user.role}));
      alert("Profile updated successfully ✅");
      setEditMode(false);
      // Refresh profile from backend
      fetchFarmerProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    if (loading) {
      return { count: 0, delivered: 0, revenue: 0 };
    }

    const delivered = orders.filter((o) => o.status === "Delivered");
    const revenue = delivered.reduce((s, o) => {
      const itemsTotal = o.summary?.itemsTotal || o.itemsTotal || 
        (o.items?.reduce((a, i) => a + ((i.quantity || 0) * (i.pricePerKg || 0)), 0) || 0);
      return s + itemsTotal;
    }, 0);
    
    return { 
      count: orders.length, 
      delivered: delivered.length, 
      revenue 
    };
  }, [orders, loading]);

  const handleLogout = () => {
    // Clear all localStorage data
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("registeredUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("dealerProfile");
    localStorage.removeItem("farmerProfile");
    localStorage.removeItem("adminProfile");
    
    console.log("✅ Farmer logged out successfully");
    alert("Logged out successfully. You can now login with a different role.");
    navigate("/login");
  };

  return (
    <div className="farmer-account">
      <div className="account-header">
        <div className="title-wrap">
          <h2>👨‍🌾 {t('farmerAccount.title')}</h2>
          <p className="subtitle">{t('farmerAccount.subtitle')}</p>
        </div>
        <button className="dashboard-btn" onClick={() => navigate("/farmer-dashboard")}> 
          <span className="dash-icon">📊</span>
          <span className="dash-label">{t('farmerAccount.dashboard')}</span>
        </button>
      </div>
      <div className="profile-card">
        <div className="avatar">
          {(farmer?.name || "F").charAt(0).toUpperCase()}
        </div>
        <div className="info">
          <div className="name">{farmer?.name || "Your Name"}</div>
          <div className="email">{farmer?.email || "email@example.com"}</div>
          <div className="location">
            📍 {farmer?.mandal || "Mandal"}, {farmer?.district || "District"}, {farmer?.state || "State"}
            {farmer?.pincode ? ` - ${farmer.pincode}` : ""}
          </div>
          <div className="location" style={{ fontSize: "12px", opacity: 0.8 }}>
            {farmer?.location || "Full location"} • {farmer?.country || "Country"}
          </div>
        </div>
        <div className="badges">
          <span className="badge verified">{t('farmerAccount.verified')}</span>
          <span className="badge active">{t('farmerAccount.active')}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="icon">📦</div>
          <div className="content">
            <div className="label">{t('farmerAccount.totalOrders')}</div>
            <div className="value">{loading ? "..." : stats.count}</div>
          </div>
        </div>
        <div className="stat">
          <div className="icon">✅</div>
          <div className="content">
            <div className="label">{t('farmerAccount.delivered')}</div>
            <div className="value">{loading ? "..." : stats.delivered}</div>
          </div>
        </div>
      </div>

      <div className="quick-nav-buttons">
        <button className="nav-btn orders-btn" onClick={() => navigate("/farmer/my-crops")}>
          <span className="nav-icon">🌾</span>
          <span className="nav-label">{t('farmerAccount.myCrops')}</span>
        </button>
        <button className="nav-btn payments-btn" onClick={() => navigate("/farmer/orders")}>
          <span className="nav-icon">📦</span>
          <span className="nav-label">{t('farmerAccount.orders')}</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/farmer/add-crop")}>
          <span className="nav-icon">➕</span>
          <span className="nav-label">{t('farmerAccount.addCrop')}</span>
        </button>
        <button className="nav-btn" onClick={() => navigate("/farmer/support")}>
          <span className="nav-icon">⚠️</span>
          <span className="nav-label">{t('farmerAccount.complaints')}</span>
        </button>
      </div>

      <div className="form-section">
        <h3 className="section-title">📋 {t('farmerAccount.personalInfo')}</h3>
        <fieldset className="form-grid" disabled={!editMode}>
          <div className="field">
            <label>{t('farmerAccount.fullName')}</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>{t('email')}</label>
            <input value={farmer?.email || ""} disabled />
          </div>
          <div className="field">
            <label>{t('farmerAccount.phone')}</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
        </fieldset>
      </div>

      <div className="form-section">
        <h3 className="section-title">🏠 {t('farmerAccount.addressInfo')}</h3>
        <fieldset className="form-grid" disabled={!editMode}>
          <div className="field">
            <label>{t('farmerAccount.country')}</label>
            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>{t('farmerAccount.state')}</label>
            <input
              name="state"
              value={formData.state}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>{t('farmerAccount.district')}</label>
            <input
              name="district"
              value={formData.district}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>{t('farmerAccount.mandal')}</label>
            <input
              name="mandal"
              value={formData.mandal}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>{t('farmerAccount.pincode')}</label>
            <input
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
            />
          </div>          <div className="field">
            <label>{t('farmerAccount.doorNo')}</label>
            <input
              name="doorNo"
              value={formData.doorNo}
              onChange={handleChange}
              placeholder="E.g., 123-A"
            />
          </div>
          <div className="field full">
            <label>{t('farmerAccount.fullLocation')}</label>
            <div className="account-location-row">
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
              <button
                type="button"
                className="account-location-pin-btn"
                onClick={handleUseCurrentLocation}
                disabled={loadingLocation || !editMode}
                title={t('farmerAccount.useCurrentLocation')}
              >
                {loadingLocation ? t('farmerAccount.loading') : "📍"}
              </button>
            </div>
          </div>
          <div className="field full">
            <label>{t('farmerAccount.addressCoords')}</label>
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
                  {fetchingCoords ? t('farmerAccount.fetching') : t('farmerAccount.fetchFromAddress')}
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
              <h3>{t('farmerAccount.pickCurrentLocation')}</h3>
              <button type="button" className="account-location-modal-close" onClick={() => setShowLocationModal(false)}>
                ✕
              </button>
            </div>

            {locationPayload?.baseLocation && (
              <p className="account-location-modal-text">{t('farmerAccount.detected')}: {locationPayload.baseLocation}</p>
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
                <span className="account-famous-title">{t('farmerAccount.nearbyFamousPlaces')}</span>
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
              ✏️ {t('farmerAccount.editDetails')}
            </button>
            <button className="logout-btn" type="button" onClick={handleLogout}>
              🚪 {t('logout')}
            </button>
          </>
        ) : (
          <>
            <button className="save-btn" type="button" onClick={save} disabled={saving}>
              {saving ? t('farmerAccount.saving') : t('farmerAccount.saveChanges')}
            </button>
            <button className="cancel-btn" type="button" onClick={() => setEditMode(false)} disabled={saving}>
              {t('farmerAccount.cancel')}
            </button>
            <button className="logout-btn" type="button" onClick={handleLogout} disabled={saving}>
              🚪 {t('logout')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
