import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FarmerDetailsModal from "../components/FarmerDetailsModal";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";
import { readCartItems, writeCartItems, pushCartToBackend, syncCartWithBackend } from "../utils/cartStorage";
import { apiGet, apiPost } from "../utils/api";
import "../styles/CropDetails.css";

export default function CropDetails() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const AUTO_REFRESH_MS = 5 * 60 * 1000;
  
  const selectedCrop = location.state?.crop || JSON.parse(localStorage.getItem("selectedCrop") || "null");

  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedFarmer, setExpandedFarmer] = useState(null);
  const [filterVariety, setFilterVariety] = useState("all");
  const [allCrops, setAllCrops] = useState([]); 
  const [showFarmerDetailsModal, setShowFarmerDetailsModal] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [selectedCropContext, setSelectedCropContext] = useState(null);
  const [mandiReference, setMandiReference] = useState(null);
  const [mandiLoading, setMandiLoading] = useState(false);
  const [translatedVarietiesMap, setTranslatedVarietiesMap] = useState({});


  useEffect(() => {
    const fetchCropDetails = async () => {
      try {
        if (!selectedCrop) {
          setLoading(false);
          return;
        }

        setCrop(selectedCrop);
        if (selectedCrop.mandiReference) {
          setMandiReference(selectedCrop.mandiReference);
        }

        const allCropsData = await apiGet("crops");
        setAllCrops(allCropsData || []);
        const selectedName = (selectedCrop.cropName || selectedCrop.name || '').toLowerCase();
        const matchedCrop = (allCropsData || []).find((item) => (item.cropName || '').toLowerCase() === selectedName && item.mandiReference);
        if (matchedCrop?.mandiReference) {
          setMandiReference(matchedCrop.mandiReference);
        }
      } catch (error) {
        console.error("❌ Error fetching crop details:", error);
        setAllCrops([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCropDetails();
    syncCartWithBackend();
  }, [selectedCrop]);

  useEffect(() => {
    const cropName = selectedCrop?.cropName || selectedCrop?.name;
    if (!cropName) {
      setMandiReference(null);
      return;
    }

    const refreshMandiReference = async () => {
      try {
        setMandiLoading(true);
        const data = await apiGet(`crops/mandi-price?commodity=${encodeURIComponent(cropName)}`);
        setMandiReference(data?.found ? data : null);
      } catch (error) {
        setMandiReference(null);
      } finally {
        setMandiLoading(false);
      }
    };

    const startupTimer = setTimeout(refreshMandiReference, 250);
    const refreshTimer = setInterval(refreshMandiReference, AUTO_REFRESH_MS);

    return () => {
      clearTimeout(startupTimer);
      clearInterval(refreshTimer);
    };
  }, [selectedCrop]);

  const cropVarieties = {
    "Tomato": ["Local Tomato", "Hybrid Tomato", "Cherry Tomato", "Roma Tomato", "Country Tomato"],
    "Brinjal": ["Long Purple Brinjal", "Round Brinjal", "Green Brinjal", "Striped Brinjal", "Hybrid Brinjal", "Local Brinjal"],
    "Onion": ["Red Onion", "White Onion", "Small Onion", "Hybrid Onion", "Local Onion"],
    "Chilli": ["Green Chilli", "Red Chilli", "Long Chilli", "Hybrid Chilli", "Local Chilli"],
    "Cabbage": ["Green Cabbage", "Hybrid Cabbage", "Local Cabbage"],
    "Cauliflower": ["Early Cauliflower", "Mid Season Cauliflower", "Late Cauliflower"],
    "Carrot": ["Red Carrot", "Orange Carrot", "Hybrid Carrot"],
    "Potato": ["Local Potato", "Hybrid Potato", "Seed Potato"],
    "Sweet Potato": ["Red Sweet Potato", "White Sweet Potato"],
    "Cucumber": ["Long Cucumber", "Round Cucumber", "Hybrid Cucumber"],
    "Bottle Gourd": ["Long Bottle Gourd", "Round Bottle Gourd", "Hybrid Bottle Gourd"],
    "Bitter Gourd": ["Long Bitter Gourd", "Small Bitter Gourd", "Hybrid Bitter Gourd"],
    "Ridge Gourd": ["Long Ridge Gourd", "Hybrid Ridge Gourd"],
    "Pumpkin": ["Small Pumpkin", "Large Pumpkin", "Hybrid Pumpkin"],
    "Spinach": ["Local Spinach", "Hybrid Spinach"],
    "Coriander": ["Local Coriander", "Hybrid Coriander"],
    "Beetroot": ["Red Beetroot", "Hybrid Beetroot"],
    "Radish": ["White Radish", "Red Radish", "Hybrid Radish"],
    "Lady Finger": ["Green Okra", "Hybrid Okra", "Local Okra"],
    "Okra": ["Green Okra", "Hybrid Okra", "Local Okra"],
    "Mango": ["Banganapalli Mango", "Totapuri Mango", "Rasalu Mango", "Alphonso Mango", "Local Mango"],
    "Banana": ["Robusta Banana", "Cavendish Banana", "Red Banana", "Local Banana"],
    "Guava": ["White Guava", "Pink Guava", "Hybrid Guava"],
    "Papaya": ["Red Papaya", "Yellow Papaya", "Hybrid Papaya"],
    "Coconut": ["Tall Coconut", "Dwarf Coconut", "Hybrid Coconut"],
    "Watermelon": ["Round Watermelon", "Long Watermelon", "Hybrid Watermelon"],
    "Muskmelon": ["Sweet Muskmelon", "Hybrid Muskmelon"],
    "Orange": ["Sweet Orange", "Nagpur Orange", "Local Orange"],
    "Lemon": ["Small Lemon", "Big Lemon", "Hybrid Lemon"],
    "Apple": ["Red Apple", "Green Apple", "Golden Apple"],
    "Pineapple": ["Queen Pineapple", "Hybrid Pineapple"],
    "Grapes": ["Green Grapes", "Black Grapes", "Seedless Grapes"],
    "Pomegranate": ["Red Pomegranate", "Bhagwa Pomegranate", "Local Pomegranate"],
    "Rice": ["Sona Masuri", "Basmati Rice", "Hybrid Paddy", "Local Paddy"],
    "Paddy": ["Sona Masuri", "Basmati Rice", "Hybrid Paddy", "Local Paddy"],
    "Maize": ["Yellow Maize", "Sweet Corn", "Hybrid Maize"],
    "Wheat": ["Local Wheat", "Hybrid Wheat"],
    "Groundnut": ["Bold Groundnut", "Small Groundnut", "Hybrid Groundnut"],
    "Cotton": ["Hybrid Cotton", "Bt Cotton", "Local Cotton"],
    "Sugarcane": ["Red Sugarcane", "Green Sugarcane", "Hybrid Sugarcane"],
    "Millets": ["Ragi", "Jowar", "Bajra"],
    "Mint": ["Local Mint (Pudina)", "Spearmint", "Peppermint"],
    "Tulsi": ["Krishna Tulsi", "Rama Tulsi", "Vana Tulsi"],
    "Curry Leaves": ["Local Karivepaku", "Hybrid Kadi Patta"],
    "Fenugreek": ["Local Methi", "Kasuri Methi"],
  };

  const getVarieties = () => {
    if (!crop?.name) return [];
    const cropNameNormalized = crop.name.trim().toLowerCase();
    const key = Object.keys(cropVarieties).find(
      k => k.trim().toLowerCase() === cropNameNormalized
    );
    return key ? cropVarieties[key] : [];
  };

  const filteredFarmers = useMemo(() => {
    if (!selectedCrop || !allCrops || allCrops.length === 0) {
      return [];
    }

    const cropNameNormalized = selectedCrop.name.trim().toLowerCase();
    const matchingCrops = allCrops.filter(c =>
      c.cropName && c.cropName.trim().toLowerCase() === cropNameNormalized
    );

    let cropsToDisplay = matchingCrops;
    if (filterVariety && filterVariety !== "all") {
      cropsToDisplay = matchingCrops.filter(c =>
        c.variety && c.variety.trim().toLowerCase() === filterVariety.trim().toLowerCase()
      );
    }

    const farmerMap = {};
    cropsToDisplay.forEach(crop => {
      const farmerId = crop.farmerId?._id || crop.farmerId;
      const farmerName = crop.farmerId?.name || crop.farmerDetails?.name || "Unknown Farmer";
      const farmerLocation = crop.farmerLocation || crop.location || "Not specified";
      const farmerCoordinates = crop.farmerId?.profile?.coordinates || null;

      if (!farmerMap[farmerId]) {
        farmerMap[farmerId] = {
          id: farmerId,
          name: farmerName,
          location: farmerLocation,
          coordinates: farmerCoordinates,
          crops: []
        };
      } else if (!farmerMap[farmerId].coordinates && farmerCoordinates) {
        farmerMap[farmerId].coordinates = farmerCoordinates;
      }

      const availableQuantity = Number(crop.availableQuantity ?? crop.availableKg ?? crop.quantity ?? 0);
      const pricePerKg = Number(crop.pricePerKg); 

      farmerMap[farmerId].crops.push({
        id: crop._id,
        name: crop.cropName,
        variety: crop.variety || "Standard",
        price: pricePerKg,
        availableKg: availableQuantity,
        totalValue: availableQuantity * pricePerKg
      });
    });

    return Object.values(farmerMap);
  }, [selectedCrop, allCrops, filterVariety]);

  useEffect(() => {
    if (!crop && filteredFarmers.length === 0) return;

    const tLang = i18n.language === 'te' ? 'Telugu' : (i18n.language === 'hi' ? 'Hindi' : null);
    if (!tLang) {
      // If English, just ensure the map has the original values
      const cropTitle = crop ? (crop.cropName || crop.name || "") : "";
      const originalVarieties = getVarieties();
      const serverVarieties = filteredFarmers.flatMap(f => f.crops.map(c => c.variety || "Standard"));
      const allStrings = [...new Set([cropTitle, ...originalVarieties, ...serverVarieties])].filter(Boolean);
      
      setTranslatedVarietiesMap(prev => {
        const next = { ...prev };
        allStrings.forEach(s => { if (!next[s]) next[s] = s; });
        return next;
      });
      return;
    }

    const cropTitle = crop ? (crop.cropName || crop.name || "") : "";
    const originalVarieties = getVarieties();
    const serverVarieties = filteredFarmers.flatMap(f => f.crops.map(c => c.variety || "Standard"));
    const uniqueVars = [...new Set([cropTitle, ...originalVarieties, ...serverVarieties])].filter(Boolean);

    const stringsToTranslate = new Set();
    const localMapping = { ...translatedVarietiesMap };

    uniqueVars.forEach(v => {
      // 1. Check if already translated in our map
      if (translatedVarietiesMap[v] && translatedVarietiesMap[v] !== v) return;

      // 2. Check translation files
      const translated = t(v.toLowerCase(), v);
      if (translated !== v && translated !== v.toLowerCase()) {
        localMapping[v] = translated;
      } else {
        // 3. Needs AI translation
        stringsToTranslate.add(v);
      }
    });

    // Update with what we found locally first
    setTranslatedVarietiesMap(localMapping);

    if (stringsToTranslate.size === 0) return;

    const toTransArr = Array.from(stringsToTranslate);
    const txtToTrans = toTransArr.join(" ||| ");

    apiPost("translate", {
      text: txtToTrans,
      targetLang: tLang,
      mode: "general"
    }).then(res => {
      if (res?.translatedText) {
        const transArr = res.translatedText.split("|||").map(s => s.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, ''));
        setTranslatedVarietiesMap(prev => {
          const upMapping = { ...prev };
          toTransArr.forEach((v, idx) => {
            if (transArr[idx] && transArr[idx] !== v) {
              upMapping[v] = transArr[idx];
            }
          });
          return upMapping;
        });
      }
    }).catch(e => console.error("AI Variety translation failed:", e));
  }, [crop, allCrops, i18n.language, filteredFarmers.length]);

  const addToCart = async (farmer, cropData) => {
    const cart = readCartItems();
    const newItem = {
      id: Date.now(),
      cropId: cropData.id,
      cropName: cropData.name,
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerLocation: farmer.location,
      farmerCoordinates: farmer.coordinates || null,
      variety: cropData.variety,
      pricePerKg: cropData.price,
      quantity: 1,
    };
    cart.push(newItem);
    writeCartItems(cart);
    await pushCartToBackend(cart);
    alert(t('cart.added_success', '✅ Added to cart'));
  };

  const viewOtherCrop = (cropName) => {
    navigate("/crop-details", {
      state: { crop: { name: cropName, cropName: cropName } }
    });
    // Removed location.reload to prevent state loss
  };

  if (loading) return <div className="loading-state"><h3>{t('cropDetails.loading')}</h3></div>;
  if (!crop) return <div className="error-state"><h3>{t('cropDetails.noCrop')}</h3></div>;

  return (
    <div className="crop-details-page premium-ui">
      <CustomerHeader />

      <div className="page-header glass">
        <h2>🌾 {translatedVarietiesMap[crop.cropName || crop.name] || (crop.cropName || crop.name)}</h2>
        <p className="subtitle">
          {t('cropDetails.farmersFound', { count: filteredFarmers.length })}
        </p>
      </div>

      <div className="price-clarity-card glass">
        <div className="price-context-title">
          <span className="icon">🛡️</span> {t('cropDetails.priceClarity')}
        </div>
        <p className="price-context-line">{t('cropDetails.priceSubtitle')}</p>
        <p className="price-context-line muted">{t('cropDetails.mandiReferenceNote')}</p>
        
        {mandiLoading && <div className="mandi-loader">
          <div className="spinner"></div> {t('cropDetails.loadingMandi')}
        </div>}
        
        {!mandiLoading && mandiReference && (
          <div className="mandi-data">
            <div className="price-context-line highlight">
              {t('cropDetails.apMandiReference', { price: mandiReference.modalPricePerQuintal, date: '' })}
              {mandiReference.arrivalDate && t('cropDetails.onDate', { date: mandiReference.arrivalDate })}
            </div>
            <div className="price-context-line muted">
              {t('cropDetails.approxEquivalent', { price: mandiReference.suggestedPricePerKg })}
              {mandiReference.market && t('cropDetails.marketState', { 
                market: t(mandiReference.market, mandiReference.market), 
                state: t(mandiReference.state, mandiReference.state) 
              })}
            </div>
          </div>
        )}
      </div>

      <div className="filter-section glass">
        {getVarieties().length > 0 && (
          <div className="filter-box">
            <label className="filter-label">🌱 {t('cropDetails.selectVariety')}</label>
            <div className="variety-chips">
              <span
                className={`variety-chip ${filterVariety === "all" ? "active" : ""}`}
                onClick={() => setFilterVariety("all")}
              >
                {t('cropDetails.allVarieties')}
              </span>
              {getVarieties().map((variety, i) => (
                <span
                  key={i}
                  className={`variety-chip ${filterVariety === variety ? "active" : ""}`}
                  onClick={() => setFilterVariety(variety)}
                >
                  {translatedVarietiesMap[variety] || variety}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="farmers-list">
        {(!loading && filteredFarmers.length === 0) ? (
          <div className="empty-state glass">
            <div className="empty-icon">😔</div>
            <p>{t('cropDetails.noFarmers')}</p>
            <p className="hint">
              {filterVariety !== "all" 
                ? t('cropDetails.tryAllVarieties')
                : t('cropDetails.checkLater')}
            </p>
          </div>
        ) : (
          filteredFarmers.map((f) => (
            <div key={f.id} className="farmer-card glass-card">
              <div className="farmer-header">
                <div className="farmer-main">
                  <h4>👨‍🌾 {f.name}</h4>
                  <div className="location-badge">📍 {f.location}</div>
                </div>
              </div>

              <div className="farmer-crops">
                {f.crops.map((cropItem, idx) => (
                  <div key={idx} className="crop-item-row">
                    <div className="crop-variety-label">
                      🌱 {translatedVarietiesMap[cropItem.variety] || cropItem.variety}
                    </div>
                    
                    <div className="crop-specs">
                      <div className="spec">
                        <span className="label">{t('cropDetails.available')}:</span>
                        <span className="value">{cropItem.availableKg} {t('kg', 'kg')}</span>
                      </div>
                      <div className="spec highlight">
                        <span className="label">{t('cropDetails.sellingPrice')}:</span>
                        <span className="value">₹{cropItem.price} {t('kg_unit', '/kg')}</span>
                      </div>
                      <div className="spec">
                        <span className="label">{t('cropDetails.totalValue')}:</span>
                        <span className="value">₹{Number(cropItem.totalValue || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button className="btn-primary" onClick={() => addToCart(f, cropItem)}>
                        🛒 {t('cropDetails.addToCart')}
                      </button>

                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedFarmerId(f.id);
                          setSelectedCropContext({
                            cropName: cropItem.name,
                            variety: cropItem.variety,
                          });
                          setShowFarmerDetailsModal(true);
                        }}
                      >
                        👨‍🌾 {t('cropDetails.farmerDetails')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="btn-dropdown"
                onClick={() => setExpandedFarmer(expandedFarmer === f.id ? null : f.id)}
              >
                🌱 {t('cropDetails.viewOtherCrops')} {expandedFarmer === f.id ? "▲" : "▼"}
              </button>

              {expandedFarmer === f.id && (
                <div className="other-crops-panel">
                  <div className="crops-grid">
                    {(() => {
                      const sameFarmerCrops = allCrops.filter(c => 
                        (c.farmerId?._id === f.id || c.farmerId === f.id) && 
                        c.cropName?.toLowerCase() !== crop?.name?.toLowerCase()
                      );

                      if (sameFarmerCrops.length === 0) {
                        return <p className="no-data">{t('cropDetails.noOtherCrops')}</p>;
                      }
                      
                      return sameFarmerCrops.map((c, i) => (
                        <div 
                          key={i} 
                          className="mini-crop-chip"
                          onClick={() => {
                            setCrop({ ...c, name: c.cropName });
                            navigate("/crop-details", {
                              state: { crop: { ...c, name: c.cropName } },
                              replace: true
                            });
                          }}
                        >
                          <span className="name">{c.cropName}</span>
                          <span className="price">₹{c.pricePerKg}{t('kg_unit', '/kg')}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showFarmerDetailsModal && selectedFarmerId && (
        <FarmerDetailsModal
          farmerId={selectedFarmerId}
          preferredCropName={selectedCropContext?.cropName || crop?.name || crop?.cropName}
          preferredVariety={selectedCropContext?.variety || null}
          onClose={() => {
            setShowFarmerDetailsModal(false);
            setSelectedFarmerId(null);
            setSelectedCropContext(null);
          }}
        />
      )}
      <BottomNav />
    </div>
  );
}
