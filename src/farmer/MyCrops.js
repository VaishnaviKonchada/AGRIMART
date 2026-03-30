import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiDelete } from "../utils/api";
import "../styles/FarmerAccount.css"; 
import { useTranslation } from "react-i18next";

export default function MyCrops() {
  const { t } = useTranslation();
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
      
      if (!token) {
        setError(t('ordersPage.noAccessToken', 'No access token found'));
        setLoading(false);
        return;
      }

      const data = await apiGet("crops/my-crops/list");
      setCrops(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCrop = async (cropId) => {
    if (!window.confirm(t('myCrops.deleteConfirm', 'Are you sure you want to delete this crop?'))) {
      return;
    }

    try {
      await apiDelete(`crops/${cropId}`);
      alert(t('myCrops.deleteSuccess', 'Crop deleted successfully!'));
      setShowModal(false);
      loadCrops();
    } catch (error) {
      alert(t('myCrops.deleteError', 'Error deleting crop.'));
    }
  };

  return (
    <div className="my-crops-page">
      <div className="crops-page-header">
        <button className="back-btn" onClick={() => navigate("/farmer-account")}>
          ← {t('myCrops.backToAccount', 'Back to Account')}
        </button>
        <h2>🌾 {t('myCrops.title', 'My Added Crops')}</h2>
        <button className="add-new-crop-btn" onClick={() => navigate("/farmer/add-crop")}>
          ➕ {t('myCrops.addNewCrop', 'Add New Crop')}
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <p>⏳ {t('myCrops.loading', 'Loading your crops...')}</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadCrops}>🔄 {t('myCrops.retry', 'Retry')}</button>
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
                  <span className={`status ${crop.status}`}>
                    {t(`addCrop.status.${crop.status}`, crop.status)}
                  </span>
                </div>
                <div className="crop-details">
                  <p><strong>📂 {t('myCrops.details.category')}:</strong> {t(`addCrop.category.${crop.category?.toLowerCase()}`, crop.category)}</p>
                  <p><strong>🏷️ {t('myCrops.details.variety')}:</strong> {crop.variety || "N/A"}</p>
                  <p><strong>💰 {t('myCrops.details.pricePerKg')}:</strong> ₹{crop.pricePerKg}/kg</p>
                  <p><strong>🌾 {t('myCrops.details.totalQuantity')}:</strong> {totalQty} kg</p>
                  <p><strong>📦 {t('myCrops.details.availableQuantity')}:</strong> {availableQty} kg</p>
                  <p><strong>✅ {t('myCrops.details.soldQuantity')}:</strong> {soldQty} kg</p>
                  <p><strong>⭐ {t('myCrops.details.qualityGrade')}:</strong> {t(`addCrop.quality${crop.quality || 'Standard'}`, crop.quality || t('common.standard'))}</p>
                  <p><strong>🌱 {t('myCrops.details.organic')}:</strong> {crop.isOrganic ? `${t('common.yes')} ✅` : t('common.no')}</p>
                  <p><strong>📅 {t('myCrops.details.added')}:</strong> {new Date(crop.createdAt).toLocaleDateString()}</p>
                </div>
                <button 
                  className="view-details-btn"
                  onClick={() => {
                    setSelectedCrop(crop);
                    setShowModal(true);
                  }}
                >
                  👁️ {t('myCrops.viewFullDetails', 'View Full Details')}
                </button>
                <button
                  className="quick-delete-btn"
                  onClick={() => handleDeleteCrop(crop._id)}
                >
                  🗑️ {t('myCrops.deleteCrop', 'Delete Crop')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && crops.length === 0 && (
        <div className="empty-state">
          <p>📭 {t('myCrops.noCrops', "You haven't added any crops yet.")}</p>
          <button className="add-crop-link" onClick={() => navigate("/farmer/add-crop")}>
            ➕ {t('myCrops.addFirst', 'Add Your First Crop')}
          </button>
        </div>
      )}

      {/* Full Details Modal */}
      {showModal && selectedCrop && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🌾 {selectedCrop.cropName} - {t('myCrops.details.title')}</h2>
              <button className="close-modal" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {/* Crop Images */}
              {selectedCrop.images && selectedCrop.images.length > 0 && (
                <div className="crop-images-section">
                  <h3>📸 {t('addCrop.photosTitle')}</h3>
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

              <div className="details-section">
                <h3>📋 {t('myCrops.details.basicInfo')}</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.cropName')}:</span>
                    <span className="value">{selectedCrop.cropName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.category')}:</span>
                    <span className="value">{t(`addCrop.category.${selectedCrop.category?.toLowerCase()}`, selectedCrop.category)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.variety')}:</span>
                    <span className="value">{selectedCrop.variety || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.qualityGrade')}:</span>
                    <span className="value">{t(`addCrop.quality${selectedCrop.quality || 'Standard'}`, selectedCrop.quality || t('common.standard'))}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.organic')}:</span>
                    <span className="value">{selectedCrop.isOrganic ? `${t('common.yes')} 🌱` : t('common.no')}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.status')}:</span>
                    <span className="value status-badge">{t(`addCrop.status.${selectedCrop.status}`, selectedCrop.status)}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>💰 {t('myCrops.details.priceQuantity')}</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.pricePerKg')}:</span>
                    <span className="value">₹{selectedCrop.pricePerKg}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.totalQuantity')}:</span>
                    <span className="value">{Number(selectedCrop.totalQuantity ?? selectedCrop.availableQuantity ?? 0)} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.availableQuantity')}:</span>
                    <span className="value">{selectedCrop.availableQuantity} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.soldQuantity')}:</span>
                    <span className="value">{Math.max(Number(selectedCrop.soldQuantity ?? ((selectedCrop.totalQuantity ?? selectedCrop.availableQuantity ?? 0) - (selectedCrop.availableQuantity ?? 0))), 0)} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.minOrder')}:</span>
                    <span className="value">{selectedCrop.minimumOrderQuantity || 1} kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.totalValue')}:</span>
                    <span className="value">₹{(selectedCrop.pricePerKg * selectedCrop.availableQuantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>🚜 {t('myCrops.details.farmingDetails')}</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.irrigation')}:</span>
                    <span className="value">{selectedCrop.irrigationMethod || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.fertilizer')}:</span>
                    <span className="value">{selectedCrop.fertilizerUsed || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.storage')}:</span>
                    <span className="value">{selectedCrop.storageType || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.moisture')}:</span>
                    <span className="value">{selectedCrop.moisturePercentage || "N/A"}%</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>📅 {t('myCrops.details.dates')}</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.productionDate')}:</span>
                    <span className="value">{selectedCrop.productionDate ? new Date(selectedCrop.productionDate).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.expiryDate')}:</span>
                    <span className="value">{selectedCrop.expiryDate ? new Date(selectedCrop.expiryDate).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.added')}:</span>
                    <span className="value">{new Date(selectedCrop.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('myCrops.details.updated')}:</span>
                    <span className="value">{new Date(selectedCrop.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>📝 {t('myCrops.details.description')}</h3>
                <p className="full-description">{selectedCrop.description}</p>
              </div>

              <div className="details-section">
                <h3>📍 {t('myCrops.details.location')}</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">{t('farmerAccount.fullLocation')}:</span>
                    <span className="value">{selectedCrop.farmerLocation || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('farmerAccount.state')}:</span>
                    <span className="value">{selectedCrop.farmerState || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('farmerAccount.district')}:</span>
                    <span className="value">{selectedCrop.farmerDistrict || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{t('farmerAccount.mandal')}:</span>
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
                🗑️ {t('myCrops.deleteCrop')}
              </button>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                {t('myCrops.details.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
              