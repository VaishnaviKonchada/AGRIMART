import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost } from "../utils/api";
import "../styles/FarmerDetailsModal.css";

export default function FarmerDetailsModal({ farmerId, preferredCropName, preferredVariety, onClose }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [farmer, setFarmer] = useState(null);
  const [farmerCrops, setFarmerCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [translatedMap, setTranslatedMap] = useState({});

  useEffect(() => {
     if (farmerCrops.length === 0) return;
     
     const varietyList = farmerCrops.map(c => c.variety).filter(Boolean);
     const cropNames = farmerCrops.map(c => c.cropName).filter(Boolean);
     const uniqueTexts = [...new Set([...varietyList, ...cropNames])];
     
     if (uniqueTexts.length === 0) return;
    const tLang = i18n.language === 'te' ? 'Telugu' : 'Hindi';
    const mapping = {};
    uniqueTexts.forEach(v => {
      // Primary check: translation file
      const translated = t(`varieties.${v}`, v);
      if (translated !== v) {
        mapping[v] = translated;
      } else {
        // Secondary check: lowercase key (for crop names like 'Tomato')
        const lowerTrans = t(v.toLowerCase(), v);
        mapping[v] = lowerTrans;
      }
    });
    setTranslatedMap(mapping);

    // AI Translation for missing ones
    const txtToTrans = uniqueTexts.filter(v => mapping[v] === v).join(" ||| ");
    if (txtToTrans) {
      apiPost('translate', {
        text: txtToTrans,
        targetLang: tLang,
        mode: "general"
      }).then(res => {
        if (res?.translatedText) {
          const parts = res.translatedText.split("|||").map(s => s.trim());
          const fullMap = { ...mapping };
          uniqueTexts.filter(v => mapping[v] === v).forEach((orig, idx) => {
            if (parts[idx] && parts[idx] !== orig) fullMap[orig] = parts[idx];
          });
          setTranslatedMap(fullMap);
        }
      }).catch(e => console.error("Variety translation failed", e));
    }
  }, [farmerCrops, i18n.language]);

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
      const farmerData = await apiGet(`crops/farmers/${farmerId}`);
      setFarmer(farmerData);
      const cropsData = await apiGet(`crops/farmers/${farmerId}/crops`);
      setFarmerCrops(Array.isArray(cropsData) ? cropsData : []);
    } catch (error) {
      setError(error.message || 'Failed to load farmer details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="farmer-modal-overlay" onClick={onClose}>
        <div className="farmer-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{t('farmerModal.loading', 'Loading farmer details...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="farmer-modal-overlay" onClick={onClose}>
        <div className="farmer-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="error-container">
            <p style={{ color: '#d32f2f', fontWeight: 600 }}>{error || t('farmerModal.error', 'Unable to load farmer details')}</p>
            <button onClick={onClose} className="close-modal-btn">{t('farmerModal.close', 'Close')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-modal-overlay" onClick={onClose}>
      <div className="farmer-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="farmer-modal-header">
          <h2>👨‍🌾 {t('farmerModal.profileTitle', 'Farmer Profile')}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Farmer Profile Card */}
        <div className="farmer-profile-card">
          <div className="avatar">{(farmer.name || "F").charAt(0).toUpperCase()}</div>
          <div className="farmer-info">
            <div className="name">
              {farmer.name || t('farmer', 'Farmer')}
              <span className="verified-icon" title={t('verified')}> ✅</span>
            </div>
            <div className="location-details">
              <span className="location-item">{farmer.state || t('notSet')}</span>
              <span className="location-divider">•</span>
              <span className="location-item">{farmer.district || ""}</span>
              <span className="location-divider">•</span>
              <span className="location-item">{farmer.mandal || ""}</span>
            </div>
          </div>
          <div className="badges-container">
            <span className="badge verified">✓ {t('farmerModal.verified', 'Verified')}</span>
            <span className="badge active">● {t('farmerModal.active', 'Active')}</span>
            <span className="badge rating">⭐ {farmer.rating || '4.5'}</span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🌾</span>
            <div className="stat-content">
              <div className="stat-label">{t('farmerModal.totalCrops', 'Total Crops')}</div>
              <div className="stat-value">{scopedFarmerCrops.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📦</span>
            <div className="stat-content">
              <div className="stat-label">{t('farmerModal.available', 'Available')}</div>
              <div className="stat-value">
                {scopedFarmerCrops.reduce((sum, crop) => sum + (crop.availableQuantity || crop.quantity || 0), 0)} {t('kg', 'kg')}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-content">
              <div className="stat-label">{t('farmerModal.totalValue', 'Total Value')}</div>
              <div className="stat-value">
                ₹{scopedFarmerCrops.reduce((sum, crop) => sum + (Number(crop.availableQuantity || crop.quantity || 0) * Number(crop.pricePerKg || 0)), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Farmer's Crops Section */}
        <div className="crops-section">
          <h3 className="section-title">
            🌾 {t('farmerModal.farmerCrops', { crop: t(preferredCropName?.toLowerCase() || 'crop', preferredCropName || 'Crop') })} ({scopedFarmerCrops.length})
          </h3>
          
          {scopedFarmerCrops.length > 0 ? (
            <div className="farmer-modal-crops-grid">
              {scopedFarmerCrops.map((crop) => {
                const quantity = Number(crop.availableQuantity || crop.quantity || 0);
                const price = Number(crop.pricePerKg || 0);
                const totalValue = quantity * price;
                const isOrganic = crop.isOrganic || crop.organic;
                
                return (
                  <div key={crop._id} className="crop-card">
                    <div className="crop-header">
                      <div className="crop-name">{translatedMap[crop.cropName] || t(crop.cropName?.toLowerCase(), crop.cropName)}</div>
                      {crop.variety && <span className="crop-variety">{translatedMap[crop.variety] || crop.variety}</span>}
                    </div>

                    <div className="crop-badges">
                      {isOrganic && <span className="badge-organic">🍃 {t('organic', 'Organic')}</span>}
                      {crop.quality && <span className="badge-quality">🏆 {translatedMap[crop.quality] || t(crop.quality.toLowerCase(), crop.quality)}</span>}
                      {crop.storageType && <span className="badge-storage">❄️ {translatedMap[crop.storageType] || t(crop.storageType.toLowerCase(), crop.storageType)}</span>}
                    </div>

                    {(crop.images || crop.photos) && (crop.images?.[0] || crop.photos?.[0]) && (
                      <div className="farmer-modal-image-wrapper">
                        <img 
                          src={crop.images?.[0] || crop.photos?.[0]} 
                          alt={translatedMap[crop.cropName] || t(crop.cropName?.toLowerCase(), crop.cropName)} 
                          className="farmer-modal-img" 
                        />
                      </div>
                    )}

                    <div className="crop-details-list">
                      <div className="farmer-detail-row">
                        <span className="label">{t('farmerModal.category', 'Category')}:</span>
                        <span className="value">{t(crop.category?.toLowerCase(), crop.category)}</span>
                      </div>
                      <div className="farmer-detail-row highlight">
                        <span className="label">{t('farmerModal.available', 'Available')}:</span>
                        <span className="value">{quantity} {t('kg', 'kg')}</span>
                      </div>
                      <div className="farmer-detail-row highlight">
                        <span className="label">{t('farmerModal.sellingPrice', 'Price')}:</span>
                        <span className="value">₹{price}{t('kg_unit', '/kg')}</span>
                      </div>
                      <div className="farmer-detail-row">
                        <span className="label">{t('farmerModal.minOrder', 'Min Order')}:</span>
                        <span className="value">{crop.minimumOrderQuantity || crop.minOrder || 1} {t('kg', 'kg')}</span>
                      </div>
                      <div className="farmer-detail-row farmer-modal-total-value-row">
                        <span className="label">{t('farmerModal.totalValue', 'Total Value')}:</span>
                        <span className="value">₹{totalValue.toLocaleString()}</span>
                      </div>
                    </div>

                    <button className="view-details-btn" onClick={() => openFullDetailsPage(crop)}>
                      {t('farmerModal.viewFullDetails', 'View Full Details')}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-crops">
              <p>{t('no_matching_crops', 'No matching crops available')}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-modal-btn" onClick={onClose}>
            ← {t('farmerModal.backToCrop', 'Back to Crop')}
          </button>
        </div>
      </div>
    </div>
  );
}
