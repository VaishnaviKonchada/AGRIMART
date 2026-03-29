import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import "../styles/FarmerDetailsModal.css";

export default function FarmerDetailsModal({ farmerId, preferredCropName, preferredVariety, onClose }) {
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [farmerCrops, setFarmerCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFarmerDetails();
  }, [farmerId]);

  const normalizedPreferredName = String(preferredCropName || '').toLowerCase().trim();
  const normalizedPreferredVariety = String(preferredVariety || '').toLowerCase().trim();

  const sortedFarmerCrops = [...farmerCrops].sort((a, b) => {
    const aName = String(a.cropName || '').toLowerCase().trim();
    const bName = String(b.cropName || '').toLowerCase().trim();
    const aVariety = String(a.variety || '').toLowerCase().trim();
    const bVariety = String(b.variety || '').toLowerCase().trim();

    const aScore = (aName === normalizedPreferredName ? 2 : 0) + (normalizedPreferredVariety && aVariety === normalizedPreferredVariety ? 1 : 0);
    const bScore = (bName === normalizedPreferredName ? 2 : 0) + (normalizedPreferredVariety && bVariety === normalizedPreferredVariety ? 1 : 0);

    if (aScore !== bScore) return bScore - aScore;
    return aName.localeCompare(bName);
  });

  const scopedFarmerCrops = normalizedPreferredName
    ? sortedFarmerCrops.filter((crop) => String(crop.cropName || '').toLowerCase().trim() === normalizedPreferredName)
    : sortedFarmerCrops;

  const openFullDetailsPage = (crop) => {
    const scopedByName = normalizedPreferredName
      ? farmerCrops.filter((c) => String(c.cropName || '').toLowerCase().trim() === normalizedPreferredName)
      : [crop];

    navigate('/farmer-crop-details', {
      state: {
        farmer,
        cropName: crop.cropName,
        crops: scopedByName,
        preferredVariety,
      }
    });
    onClose();
  };

  const fetchFarmerDetails = async () => {
    try {
      setError(null);
      console.log(`📍 Fetching farmer details for ID: ${farmerId}`);
      
      // Fetch farmer details from crops API endpoint
      const farmerData = await apiGet(`crops/farmers/${farmerId}`);
      console.log('✅ Farmer data received:', farmerData);
      setFarmer(farmerData);

      // Fetch farmer's crops from crops API endpoint
      const cropsData = await apiGet(`crops/farmers/${farmerId}/crops`);
      console.log('✅ Crops data received:', cropsData);
      setFarmerCrops(Array.isArray(cropsData) ? cropsData : []);
    } catch (error) {
      console.error('❌ Error fetching farmer details:', error);
      setError(error.message || 'Failed to load farmer details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading farmer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="error-container">
            <p style={{ color: '#d32f2f', fontWeight: 600 }}>{error || 'Unable to load farmer details'}</p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Farmer ID: {farmerId}</p>
            <button onClick={onClose} className="close-modal-btn">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="farmer-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>👨‍🌾 Farmer Profile</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Farmer Profile Card */}
        <div className="farmer-profile-card">
          <div className="avatar">{(farmer.name || "F").charAt(0).toUpperCase()}</div>
          <div className="farmer-info">
            <div className="name">{farmer.name || "Farmer"}</div>
            <div className="location-details">
              <span className="location-item">
                📍 {farmer.state || "State"}
              </span>
              <span className="location-divider">•</span>
              <span className="location-item">
                {farmer.district || "District"}
              </span>
              <span className="location-divider">•</span>
              <span className="location-item">
                {farmer.mandal || "Mandal"}
              </span>
            </div>
          </div>
          <div className="badges-container">
            <span className="badge verified">✓ Verified</span>
            <span className="badge active">● Active</span>
            <span className="badge rating">⭐ 4.5</span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🌾</span>
            <div className="stat-content">
              <div className="stat-label">Total Crops</div>
              <div className="stat-value">{scopedFarmerCrops.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📦</span>
            <div className="stat-content">
              <div className="stat-label">Available</div>
              <div className="stat-value">
                {scopedFarmerCrops.reduce((sum, crop) => sum + (crop.availableQuantity || crop.quantity || 0), 0)} kg
              </div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-content">
              <div className="stat-label">Total Value</div>
              <div className="stat-value">
                ₹{scopedFarmerCrops.reduce((sum, crop) => sum + ((crop.availableQuantity || crop.quantity || 0) * (crop.pricePerKg || 0)), 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Farmer's Crops Section */}
        <div className="crops-section">
          <h3 className="section-title">🌾 Farmer's {preferredCropName || 'Crop'} ({scopedFarmerCrops.length})</h3>
          
          {scopedFarmerCrops.length > 0 ? (
            <div className="crops-grid">
              {scopedFarmerCrops.map((crop) => {
                const quantity = crop.availableQuantity || crop.quantity || 0;
                const price = crop.pricePerKg || 0;
                const totalValue = quantity * price;
                const isOrganic = crop.isOrganic || crop.organic;
                
                return (
                  <div key={crop._id} className="crop-card">
                    {/* Crop Header */}
                    <div className="crop-header">
                      <div className="crop-name">{crop.cropName || "Crop"}</div>
                      {crop.variety && <span className="crop-variety">{crop.variety}</span>}
                    </div>

                    {/* Badges */}
                    <div className="crop-badges">
                      {isOrganic && (
                        <span className="badge-organic">🌱 Organic</span>
                      )}
                      {crop.quality && (
                        <span className="badge-quality">⭐ {crop.quality}</span>
                      )}
                      {crop.storageType && (
                        <span className="badge-storage">📦 {crop.storageType}</span>
                      )}
                    </div>

                    {/* Crop Images */}
                    {(crop.images || crop.photos) && (crop.images?.[0] || crop.photos?.[0]) && (
                      <div className="crop-image-container">
                        <img 
                          src={crop.images?.[0] || crop.photos?.[0]} 
                          alt={crop.cropName}
                          className="crop-thumbnail"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {/* Crop Details */}
                    <div className="crop-details-list">
                      <div className="detail-row">
                        <span className="label">Category:</span>
                        <span className="value">{crop.category || "N/A"}</span>
                      </div>
                      <div className="detail-row highlight">
                        <span className="label">Available:</span>
                        <span className="value">{quantity} {crop.unit || "kg"}</span>
                      </div>
                      <div className="detail-row highlight">
                        <span className="label">Selling Price:</span>
                        <span className="value">₹{price}/kg</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Min Order:</span>
                        <span className="value">{crop.minimumOrderQuantity || crop.minOrder || 1} kg</span>
                      </div>
                      {crop.moisture && (
                        <div className="detail-row">
                          <span className="label">Moisture:</span>
                          <span className="value">{crop.moisture}%</span>
                        </div>
                      )}
                      <div className="detail-row total-value">
                        <span className="label">Total Value:</span>
                        <span className="value">₹{totalValue.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {crop.description && (
                      <div className="crop-description">
                        <p className="description-text">{crop.description}</p>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      className="view-details-btn"
                      onClick={() => openFullDetailsPage(crop)}
                    >
                      View Full Details →
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-crops">
              <p>No {preferredCropName || 'matching'} crops available from this farmer</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="modal-footer">
          <button className="close-modal-btn" onClick={onClose}>
            ← Back to Crop
          </button>
        </div>
      </div>
    </div>
  );
}
