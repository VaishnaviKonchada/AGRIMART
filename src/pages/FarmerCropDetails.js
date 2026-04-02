import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiPost } from "../utils/api";
import CustomerHeader from "../components/CustomerHeader";
import BottomNav from "../components/BottomNav";
import "../styles/FarmerCropDetails.css";

export default function FarmerCropDetails() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [translatedData, setTranslatedData] = useState({});

  const farmer = location.state?.farmer || null;
  const cropName = location.state?.cropName || "Crop";
  const crops = Array.isArray(location.state?.crops) ? location.state.crops : [];

  useEffect(() => {
    if (crops.length === 0 || i18n.language === 'en') {
      setTranslatedData({});
      return;
    }

    const tLang = i18n.language === 'te' ? 'Telugu' : 'Hindi';
    const contents = [];
    crops.forEach((c) => {
      if (c.description) contents.push(`[D]:${c.description}`);
      if (c.guidance || c.procedure || c.cropGuidance) {
        contents.push(`[G]:${c.guidance || c.procedure || c.cropGuidance}`);
      }
      if (c.variety) contents.push(`[V]:${c.variety}`);
    });

    if (contents.length === 0) return;

    apiPost('translate', {
      text: contents.join(" ||| "),
      targetLang: tLang,
      mode: "general"
    }).then(res => {
      if (res?.translatedText) {
        const parts = res.translatedText.split("|||").map(s => s.trim());
        const mapping = {};
        contents.forEach((orig, idx) => {
          mapping[orig] = parts[idx] || orig;
        });
        setTranslatedData(mapping);
      }
    }).catch(e => console.error("Dynamic details translation failed", e));
  }, [crops, i18n.language]);

  const localizeValue = (value, type) => {
    if (!value) return value;
    const lookup = t(`${value.toLowerCase()}`, { defaultValue: t(`common.${value.toLowerCase()}`, { defaultValue: value }) });
    return lookup;
  };

  const localizeText = (text, fallbackKey) => {
    if (!text) return t(fallbackKey);
    return text;
  };

  if (!farmer || crops.length === 0) {
    return (
      <div className="farmer-crop-details-page">
        <CustomerHeader />
        <div className="farmer-crop-details-card">
          <h2>{t('farmerCrop.detailsNotAvailable', "Details Not Available")}</h2>
          <p>{t('farmerCrop.detailsNotFound', "Crop details were not found. Please return and try again.")}</p>
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← {t('common.back', 'Back')}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const totalAvailable = crops.reduce(
    (sum, crop) => sum + Number(crop.availableQuantity || crop.quantity || 0),
    0
  );

  return (
    <div className="farmer-crop-details-page">
      <CustomerHeader />
      
      <div className="farmer-crop-details-header">
        <div className="header-top-row">
          <button className="back-btn" onClick={() => navigate(-1)}>
             ← {t('common.back', 'Back')}
          </button>
        </div>
        <h1>{localizeValue(cropName, "crop") || cropName} {t('farmerCrop.fullDetails', "Full Details")}</h1>
        <p>{t('common.all', "All")} {localizeValue(cropName, "crop") || cropName} {t('farmerCrop.entriesByFarmer', "entries added by this farmer")}</p>
      </div>

      <div className="farmer-info-box">
        <h3>{t('farmerCrop.farmerInformation', "Farmer Information")}</h3>
        <div className="info-grid">
          <div><strong>{t('orders.name', "Name")}:</strong> {farmer.name || t('common.notAvailable', "N/A")}</div>
          <div><strong>{t('farmerCrop.farmerId', "Farmer ID")}:</strong> {String(farmer._id || farmer.id || t('common.notAvailable', "N/A"))}</div>
          <div><strong>{t('orders.contact', "Phone")}:</strong> {farmer.phone || t('common.notAvailable', "N/A")}</div>
          <div><strong>{t('common.email', "Email")}:</strong> {farmer.email || t('common.notAvailable', "N/A")}</div>
          <div><strong>{t('common.location', "Location")}:</strong> {[farmer.mandal, farmer.district, farmer.state].filter(Boolean).join(", ") || t('common.notAvailable', "N/A")}</div>
          <div><strong>{t('farmerCrop.totalAvailable', "Total Available")}:</strong> {totalAvailable} {t('kg', 'kg')}</div>
        </div>
      </div>

      <div className="crop-list">
        {crops.map((crop) => {
          const available = Number(crop.availableQuantity || crop.quantity || 0);
          const price = Number(crop.pricePerKg || 0);
          const cropGuidance = crop.guidance || crop.procedure || crop.cropGuidance || "";
          const cropImages = Array.isArray(crop.images)
            ? crop.images.filter(Boolean)
            : Array.isArray(crop.photos)
              ? crop.photos.filter(Boolean)
              : [];
          const visibleImages = cropImages.slice(0, 2);

          return (
            <div key={crop._id || `${crop.cropName}-${crop.variety}-${price}`} className="crop-item-row-premium">
              <div className="crop-badge-row">
                <span className="variety-pill">{translatedData[`[V]:${crop.variety}`] || localizeValue(crop.variety, "crop") || t('common.standard', "Standard")}</span>
                {crop.isOrganic || crop.organic && <span className="organic-tag">{t('common.organic', 'Organic')}</span>}
              </div>
              
              <h3>{localizeValue(crop.cropName, "crop") || crop.cropName}</h3>

              {visibleImages.length > 0 && (
                <div className="crop-visual-gallery">
                  {visibleImages.map((imageSrc, index) => (
                    <img key={index} src={imageSrc} alt="Crop" className="gallery-thumb" />
                  ))}
                </div>
              )}

              <div className="stats-metric-grid">
                <div className="metric">
                  <span className="label">📦 {t('common.available', "Available")}</span>
                  <span className="value">{available} {t('kg', 'kg')}</span>
                </div>
                <div className="metric highlight">
                  <span className="label">💰 {t('common.price', "Price")}</span>
                  <span className="value">₹{price}{t('kg_unit', '/kg')}</span>
                </div>
                <div className="metric">
                  <span className="label">🛒 {t('farmerCrop.minOrder', "Min Order")}</span>
                  <span className="value">{crop.minimumOrderQuantity || crop.minOrder || 1} {t('kg', 'kg')}</span>
                </div>
              </div>

              <div className="detail-tags-row">
                <span className="tag">📍 {t('common.category', "Category")}: {localizeValue(crop.category, "category")}</span>
                <span className="tag">⭐ {t('common.quality', "Quality")}: {localizeValue(crop.quality, "quality")}</span>
                <span className="tag">🏠 {t('farmerCrop.storage', "Storage")}: {localizeValue(crop.storageType, "storage")}</span>
              </div>

              <div className="description-section">
                <h4>📄 {t('common.description', "Description")}</h4>
                <p>{translatedData[`[D]:${crop.description}`] || crop.description || t('farmerCrop.noDescription')}</p>
              </div>

              {(cropGuidance) && (
                <div className="guidance-section-box">
                  <h4>💡 {t('farmerCrop.cropGuidance', "Crop Guidance")}</h4>
                  <div className="guidance-content">
                    {translatedData[`[G]:${cropGuidance}`] || cropGuidance}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
