import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CustomerHeader from "../components/CustomerHeader";
import BottomNav from "../components/BottomNav";
import "../styles/FarmerCropDetails.css";

export default function FarmerCropDetails() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const farmer = location.state?.farmer || null;
  const cropName = location.state?.cropName || "Crop";
  const crops = Array.isArray(location.state?.crops) ? location.state.crops : [];

  const localizeValue = (value, type) => {
    if (!value) return value;
    // Attempt translation, fallback to original
    return t(`common.${value.toLowerCase()}`, { defaultValue: value });
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
          <div><strong>{t('farmerCrop.totalAvailable', "Total Available")}:</strong> {totalAvailable} kg</div>
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
            <div key={crop._id || `${crop.cropName}-${crop.variety}-${price}`} className="crop-item-card">
              <div className="crop-item-header">
                <h3>{crop.cropName || t('common.notAvailable', "N/A")}</h3>
                <span>{localizeValue(crop.variety, "crop") || crop.variety || t('common.standard', "Standard")}</span>
              </div>

              {visibleImages.length > 0 && (
                <div className="crop-image-row">
                  {visibleImages.map((imageSrc, index) => (
                    <img
                      key={`${crop._id || crop.cropName}-img-${index}`}
                      src={imageSrc}
                      alt={`${crop.cropName || "crop"} ${index + 1}`}
                      className="crop-preview-image"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="crop-item-grid">
                <div><strong>{t('common.category', "Category")}:</strong> {localizeValue(crop.category, "category") || crop.category || t('common.notAvailable', "N/A")}</div>
                <div><strong>{t('common.available', "Available")}:</strong> {available} kg</div>
                <div><strong>{t('common.price', "Price")}:</strong> Rs.{price}/kg</div>
                <div><strong>{t('farmerCrop.minOrder', "Min Order")}:</strong> {crop.minimumOrderQuantity || crop.minOrder || 1} kg</div>
                <div><strong>{t('common.quality', "Quality")}:</strong> {localizeValue(crop.quality, "quality") || crop.quality || t('common.notAvailable', "N/A")}</div>
                <div><strong>{t('farmerCrop.organic', "Organic")}:</strong> {crop.isOrganic || crop.organic ? t('common.yes', "Yes") : t('common.no', "No")}</div>
                <div><strong>{t('farmerCrop.storage', "Storage")}:</strong> {localizeValue(crop.storageType, "storage") || crop.storageType || t('common.notAvailable', "N/A")}</div>
              </div>

              <div className="crop-description">
                <strong>{t('common.description', "Description")}:</strong> {localizeText(crop.description, "farmerCrop.noDescription")}
              </div>

              <div className="crop-description">
                <strong>{t('farmerCrop.cropGuidance', "Crop Guidance")}:</strong> {localizeText(cropGuidance, "farmerCrop.noGuidance")}
              </div>

              {cropImages.length === 0 && (
                <div className="crop-image-note">{t('farmerCrop.imageUnavailable', "Image unavailable")}</div>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
