import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiDelete } from "../utils/api";
import "../styles/FarmerAccount.css"; // Reuse same styles

export default function MyCrops() {
  const navigate = useNavigate();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCrops();
  }, []);

  const loadCrops = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      const storedRole = localStorage.getItem("userRole");
      
      console.log("🔐 Debug Info:");
      console.log("- Token exists:", !!token);
      console.log("- Stored role:", storedRole);
      
      if (!token) {
        console.error("❌ No authentication token found");
        setError("You are not authenticated. Please logout and login again as a farmer.");
        setLoading(false);
        return;
      }

      // Decode JWT to see what's inside (for debugging)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("- JWT payload role:", payload.role);
        console.log("- JWT payload sub (userId):", payload.sub);
        
        if (payload.role !== 'farmer') {
          setError(`Wrong account type! You are logged in as "${payload.role}". Please logout and login with a farmer account.`);
          setLoading(false);
          return;
        }
      } catch (decodeError) {
        console.error("❌ Failed to decode JWT:", decodeError);
      }

      console.log("📍 Loading your crops...");

      const data = await apiGet("crops/my-crops/list");
      console.log("📊 Response received");
      console.log("✅ Your crops loaded:", data);
      // Backend returns array directly, not { crops: [...] }
      setCrops(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Error loading crops:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCrop = async (cropId) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this crop? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
      if (!token) {
        alert('Please login again to delete crops.');
        navigate('/login');
        return;
      }

      console.log('🗑️ Deleting crop:', cropId);

      const data = await apiDelete(`crops/${cropId}`);
      console.log('✅ Crop deleted successfully');
      alert('✅ Crop deleted successfully!');
      setShowModal(false);
      loadCrops(); // Reload the crops list
    } catch (error) {
      console.error('❌ Error deleting crop:', error);
      alert('Error deleting crop. Please try again.');
    }
  };

  return (
    <div className="my-crops-page">
      <div className="crops-page-header">
        <button className="back-btn" onClick={() => navigate("/farmer-account")}>
          ← Back to Account
        </button>
        <h2>🌾 My Added Crops</h2>
        <button className="add-new-crop-btn" onClick={() => navigate("/farmer/add-crop")}>
          ➕ Add New Crop
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <p>⏳ Loading your crops...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadCrops}>🔄 Retry</button>
        </div>
      )}

      {!loading && !error && crops.length > 0 && (
        <div className="crops-grid">
          {crops.map((crop, index) => {
            const availableQty = Number(crop.availableQuantity || 0);
            const totalQty = Number(crop.totalQuantity ?? availableQty);
            const soldQty = Math.max(Number(crop.soldQuantity ?? (totalQty - availableQty)), 0);

            return (
            <div key={crop._id || index} className="crop-card">
              <div className="crop-header">
                <h4>{crop.cropName}</h4>
                <span className={`status ${crop.status}`}>{crop.status}</span>
              </div>
              <div className="crop-details">
                <p><strong>📂 Category:</strong> {crop.category}</p>
                <p><strong>🏷️ Variety:</strong> {crop.variety || "N/A"}</p>
                <p><strong>💰 Price:</strong> ₹{crop.pricePerKg}/kg</p>
                <p><strong>🌾 Total Crop:</strong> {totalQty} kg</p>
                <p><strong>📦 Available:</strong> {availableQty} kg</p>
                <p><strong>✅ Sold:</strong> {soldQty} kg</p>
                <p><strong>⭐ Quality:</strong> {crop.quality}</p>
                <p><strong>🌱 Organic:</strong> {crop.isOrganic ? "Yes ✅" : "No"}</p>
                <p><strong>📝 Description:</strong> {crop.description ? crop.description.substring(0, 60) + '...' : "N/A"}</p>
                <p><strong>📅 Added:</strong> {new Date(crop.createdAt).toLocaleDateString()}</p>
              </div>
              <button 
                className="view-details-btn"
                onClick={() => {
                  setSelectedCrop(crop);
                  setShowModal(true);
                }}
              >
                👁️ View Full Details
              </button>
              <button
                className="quick-delete-btn"
                onClick={() => handleDeleteCrop(crop._id)}
              >
                🗑️ Delete Crop
              </button>
            </div>
          )})}
        </div>
      )}

      {!loading && !error && crops.length === 0 && (
        <div className="empty-state">
          <p>📭 You haven't added any crops yet.</p>
          <button className="add-crop-link" onClick={() => navigate("/farmer/add-crop")}>
            ➕ Add Your First Crop
          </button>
        </div>
      )}

      {/* Full Details Modal */}
      {showModal && selectedCrop && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🌾 {selectedCrop.cropName} - Complete Details</h2>
              <button className="close-modal" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {/* Crop Images */}
              {selectedCrop.images && selectedCrop.images.length > 0 && (
                <div className="crop-images-section">
                  <h3>📸 Crop Images</h3>
                  <div className="images-grid">
                    {selectedCrop.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt={`${selectedCrop.cropName} ${idx + 1}`}
                        className="crop-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="details-section">
                <h3>📋 Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Crop Name:</span>
                    <span className="value">{selectedCrop.cropName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Category:</span>
                    <span className="value">{selectedCrop.category}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Variety:</span>
                    <span className="value">{selectedCrop.variety || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Quality Grade:</span>
                    <span className="value">{selectedCrop.quality || "Standard"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Organic:</span>
                    <span className="value">{selectedCrop.isOrganic ? "Yes 🌱" : "No"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span className="value status-badge">{selectedCrop.status}</span>
                  </div>
                </div>
              </div>

              {/* Pricing & Quantity */}
              <div className="details-section">
                <h3>💰 Pricing & Quantity</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Price per Kg:</span>
                    <span className="value">₹{selectedCrop.pricePerKg}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Crop Quantity:</span>
                    <span className="value">{Number(selectedCrop.totalQuantity ?? selectedCrop.availableQuantity ?? 0)} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Available Quantity:</span>
                    <span className="value">{selectedCrop.availableQuantity} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Sold Quantity:</span>
                    <span className="value">{Math.max(Number(selectedCrop.soldQuantity ?? ((selectedCrop.totalQuantity ?? selectedCrop.availableQuantity ?? 0) - (selectedCrop.availableQuantity ?? 0))), 0)} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Minimum Order:</span>
                    <span className="value">{selectedCrop.minimumOrderQuantity || 1} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Total Value:</span>
                    <span className="value">₹{(selectedCrop.pricePerKg * selectedCrop.availableQuantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Farming Details */}
              <div className="details-section">
                <h3>🚜 Farming Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Irrigation Method:</span>
                    <span className="value">{selectedCrop.irrigationMethod || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Fertilizer Used:</span>
                    <span className="value">{selectedCrop.fertilizerUsed || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Storage Type:</span>
                    <span className="value">{selectedCrop.storageType || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Moisture %:</span>
                    <span className="value">{selectedCrop.moisturePercentage || "N/A"}%</span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="details-section">
                <h3>📅 Important Dates</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Production Date:</span>
                    <span className="value">{selectedCrop.productionDate ? new Date(selectedCrop.productionDate).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Expiry Date:</span>
                    <span className="value">{selectedCrop.expiryDate ? new Date(selectedCrop.expiryDate).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Added to Platform:</span>
                    <span className="value">{new Date(selectedCrop.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Last Updated:</span>
                    <span className="value">{new Date(selectedCrop.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Full Description */}
              {selectedCrop.description && (
                <div className="details-section">
                  <h3>📝 Full Description</h3>
                  <p className="full-description">{selectedCrop.description}</p>
                </div>
              )}

              {/* Location Information */}
              <div className="details-section">
                <h3>📍 Location Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Location:</span>
                    <span className="value">{selectedCrop.farmerLocation || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">State:</span>
                    <span className="value">{selectedCrop.farmerState || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">District:</span>
                    <span className="value">{selectedCrop.farmerDistrict || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Mandal:</span>
                    <span className="value">{selectedCrop.farmerMandal || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="delete-crop-btn" 
                onClick={() => handleDeleteCrop(selectedCrop._id)}
              >
                🗑️ Delete Crop
              </button>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
              