import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FarmerDetailsModal from "../components/FarmerDetailsModal";
import BottomNav from "../components/BottomNav";
import { readCartItems, writeCartItems } from "../utils/cartStorage";
import { apiGet } from "../utils/api";
import "../styles/CropDetails.css";

export default function CropDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const AUTO_REFRESH_MS = 5 * 60 * 1000;
  
  // Get selectedCrop from navigation state OR fallback to localStorage (for backward compatibility)
  const selectedCrop = location.state?.crop || JSON.parse(localStorage.getItem("selectedCrop") || "null");

  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedFarmer, setExpandedFarmer] = useState(null);
  const [filterVariety, setFilterVariety] = useState("all");
  const [allCrops, setAllCrops] = useState([]); // Store all crops from backend
  const [showFarmerDetailsModal, setShowFarmerDetailsModal] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [selectedCropContext, setSelectedCropContext] = useState(null);
  const [mandiReference, setMandiReference] = useState(null);
  const [mandiLoading, setMandiLoading] = useState(false);

  // Fetch crop details and all crops from backend
  useEffect(() => {
    const fetchCropDetails = async () => {
      try {
        if (!selectedCrop) {
          setLoading(false);
          return;
        }

        // Set the selected crop immediately
        setCrop(selectedCrop);
        if (selectedCrop.mandiReference) {
          setMandiReference(selectedCrop.mandiReference);
        }

        // Fetch all crops from backend to find farmers
        const allCropsData = await apiGet("crops");
        setAllCrops(allCropsData || []);
        const selectedName = (selectedCrop.cropName || selectedCrop.name || '').toLowerCase();
        const matchedCrop = (allCropsData || []).find((item) => (item.cropName || '').toLowerCase() === selectedName && item.mandiReference);
        if (matchedCrop?.mandiReference) {
          setMandiReference(matchedCrop.mandiReference);
        }
        console.log("✅ All crops loaded:", allCropsData.length, "crops");
      } catch (error) {
        console.error("❌ Error fetching crop details:", error);
        setAllCrops([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCropDetails();
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
  };

  // Make variety lookup case-insensitive and robust
  const getVarieties = () => {
    if (!crop?.name) return [];
    // Find the key in cropVarieties that matches crop.name (case-insensitive, trimmed)
    const cropNameNormalized = crop.name.trim().toLowerCase();
    const key = Object.keys(cropVarieties).find(
      k => k.trim().toLowerCase() === cropNameNormalized
    );
    return key ? cropVarieties[key] : [];
  };

  // Fetch real farmers from backend based on selected crop
  const filteredFarmers = useMemo(() => {
    if (!selectedCrop || !allCrops || allCrops.length === 0) {
      return [];
    }

    console.log("🔍 Filtering farmers for crop:", selectedCrop.name, "Variety filter:", filterVariety);
    console.log("📊 Available crops from backend:", allCrops.length);

    // Always use the latest pricePerKg from the backend API response
    // Find all crops that match the selected crop name (case-insensitive)
    const cropNameNormalized = selectedCrop.name.trim().toLowerCase();
    const matchingCrops = allCrops.filter(c =>
      c.cropName && c.cropName.trim().toLowerCase() === cropNameNormalized
    );

    // Filter by variety if a specific variety is selected
    let cropsToDisplay = matchingCrops;
    if (filterVariety && filterVariety !== "all") {
      cropsToDisplay = matchingCrops.filter(c =>
        c.variety && c.variety.trim().toLowerCase() === filterVariety.trim().toLowerCase()
      );
    }

    // Group crops by farmers, always using pricePerKg from API
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

      // Always use pricePerKg from API, never fallback to static or hardcoded value
      const availableQuantity = Number(crop.availableQuantity ?? crop.availableKg ?? crop.quantity ?? 0);
      const pricePerKg = Number(crop.pricePerKg); // No fallback, must be from API

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

  const addToCart = (farmer, cropData) => {
  const cart = readCartItems();

  cart.push({
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
  });

  writeCartItems(cart);
  alert("✅ Item added to cart 🛒");
};

  const viewOtherCrop = (cropName) => {
    navigate("/crop-details", {
      state: {
        crop: { 
          name: cropName,
          cropName: cropName
        }
      }
    });
    // Force reload to fetch new data
    window.location.href = "/crop-details";
  };

  if (loading) return <h3>Loading crop details...</h3>;
  if (!crop) return <h3>No crop selected</h3>;

  return (
    <div className="crop-details-page">

      {/* ✅ TOP RIGHT ICONS */}
      <div className="top-icons">
        <span onClick={() => navigate("/home")} title="Home">🏠</span>
        <span onClick={() => navigate("/cart")} title="Cart">🛒</span>
      </div>

      <div className="page-header">
        <h2>🌾 {crop.cropName || crop.name}</h2>
        <p className="subtitle">{filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? 's' : ''} available</p>
      </div>

      <div className="price-context-card">
        <div className="price-context-title">Price clarity</div>
        <div className="price-context-line">Customer price shown below is the farmer selling price in ₹/kg.</div>
        <div className="price-context-line muted" title="Government mandi prices are wholesale rates. 1 quintal = 100 kg.">Mandi reference uses ₹/quintal. 1 quintal = 100 kg.</div>
        {mandiLoading && <div className="price-context-line muted">Loading AP mandi reference...</div>}
        {!mandiLoading && mandiReference && (
          <>
            <div className="price-context-line">
              AP mandi wholesale reference: ₹{mandiReference.modalPricePerQuintal}/quintal
              {mandiReference.arrivalDate ? ` on ${mandiReference.arrivalDate}` : ""}
            </div>
            <div className="price-context-line muted">
              Approx reference equivalent: ₹{mandiReference.suggestedPricePerKg}/kg
              {mandiReference.market ? ` • ${mandiReference.market}, ${mandiReference.state}` : ""}
            </div>
          </>
        )}
      </div>

      {/* FILTER SECTION */}
      <div className="filter-section">
        {getVarieties().length > 0 && (
          <div className="filter-box full-width">
            <label className="filter-label">🌱 Select Variety</label>
            <div className="variety-chips">
              <span
                className={`variety-chip ${filterVariety === "all" ? "active" : ""}`}
                onClick={() => setFilterVariety("all")}
              >
                All Varieties
              </span>
              {getVarieties().map((variety, i) => (
                <span
                  key={i}
                  className={`variety-chip ${filterVariety === variety ? "active" : ""}`}
                  onClick={() => setFilterVariety(variety)}
                >
                  {variety}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="farmers-list">
        {loading && (
          <div style={{textAlign: 'center', padding: '40px', color: '#1e8e3e'}}>
            <div style={{fontSize: '48px', marginBottom: '10px'}}>🌾</div>
            Loading farmers...
          </div>
        )}

        {!loading && filteredFarmers.length === 0 && (
          <div style={{textAlign: 'center', padding: '40px', color: '#7f8c8d'}}>
            <div style={{fontSize: '48px', marginBottom: '10px'}}>😔</div>
            <p>No farmers available with this crop.</p>
            <p style={{fontSize: '14px', marginTop: '10px'}}>
              {filterVariety !== "all" 
                ? `Try selecting "All Varieties" or choose a different variety.`
                : "Check back later or try another crop."}
            </p>
          </div>
        )}

        {!loading && filteredFarmers.map((f) => {
          // Get the first crop that matches the selected crop name (for display in header)
          const displayCrop = f.crops.find(c => c.name === crop?.name) || f.crops[0];
          
          return (
            <div key={f.id} className="farmer-card">
              
              {/* FARMER INFO ROW */}
              <div className="farmer-header">
                <div className="farmer-info">
                  <h4>👨‍🌾 {f.name}</h4>
                </div>
                <div className="location-badge">
                  📍 {f.location}
                </div>
              </div>

              {/* CROPS FROM THIS FARMER */}
              {f.crops.map((cropItem, idx) => (
                <div key={idx} style={{marginBottom: idx < f.crops.length - 1 ? '15px' : '0', paddingBottom: idx < f.crops.length - 1 ? '15px' : '0', borderBottom: idx < f.crops.length - 1 ? '1px solid #e0e0e0' : 'none'}}>
                  {f.crops.length > 1 && (
                    <div style={{fontSize: '13px', color: '#16a34a', fontWeight: '600', marginBottom: '8px'}}>
                      🌱 {cropItem.variety || "Standard"}
                    </div>
                  )}
                  {/* VERTICAL CROP DETAILS ROW (line-by-line format) */}
                  <div className="farmer-info-vertical" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', fontSize: '1.08rem', fontWeight: 600, color: '#222', marginBottom: '8px'}}>
                    <span><span className="farmer-info-label">available:</span> <span className="farmer-info-value">{cropItem.availableKg} kg</span></span>
                    <span><span className="farmer-info-label">selling price:</span> <span className="farmer-info-value">₹{mandiReference && mandiReference.suggestedPricePerKg ? mandiReference.suggestedPricePerKg : cropItem.price} /kg</span></span>
                    <span><span className="farmer-info-label">total value:</span> <span className="farmer-info-value">₹{Number(cropItem.totalValue || 0).toLocaleString()}</span></span>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="action-buttons" style={{marginTop: '10px'}}>
                    <button className="add-cart-btn" onClick={() => addToCart(f, cropItem)}>
                      🛒 Add to Cart
                    </button>

                    <button
                      className="farmer-details-btn"
                      onClick={() => {
                        setSelectedFarmerId(f.id);
                        setSelectedCropContext({
                          cropName: cropItem.name,
                          variety: cropItem.variety,
                        });
                        setShowFarmerDetailsModal(true);
                      }}
                    >
                      👨‍🌾 Farmer Details
                    </button>
                  </div>
                </div>
              ))}

              {/* OTHER CROPS BUTTON */}
              <button
                className="other-crops-btn"
                style={{marginTop: '15px', width: '100%'}}
                onClick={() =>
                  setExpandedFarmer(expandedFarmer === f.id ? null : f.id)
                }
              >
                🌱 View Other Crops {expandedFarmer === f.id ? "▲" : "▼"}
              </button>

            {/* OTHER CROPS DROPDOWN */}
            {expandedFarmer === f.id && (
              <div className="other-crops">
                <div className="crops-grid">
                  {/* Show other crops from backend for SAME farmer */}
                  {(() => {
                    if (allCrops.length > 0) {
                      // Get crops from SAME farmer but different crop name
                      const sameFarmerCrops = allCrops
                        .filter((c) => 
                          (c.farmerId?._id === f.id || c.farmerId === f.id) && // Same farmer
                          c.cropName?.toLowerCase() !== crop?.name?.toLowerCase() // Different crop
                        );

                      
                      if (sameFarmerCrops.length === 0) {
                        return <p style={{padding: '15px', color: '#666'}}>This farmer has no other crops listed</p>;
                      }
                      
                      return sameFarmerCrops.map((c, i) => (
                        <div 
                          key={i} 
                          className="crop-chip"
                          onClick={() => {
                            navigate("/crop-details", {
                              state: {
                                crop: {
                                  name: c.cropName,
                                  cropName: c.cropName,
                                  variety: c.variety,
                                  pricePerKg: Number(c.pricePerKg || 0),
                                  category: c.category
                                }
                              }
                            });
                            // Force page reload for new crop data
                            setTimeout(() => window.location.reload(), 100);
                          }}
                        >
                          <span className="crop-name">{c.cropName}</span>
                          <span className="crop-price">₹{c.pricePerKg}/kg</span>
                        </div>
                      ));
                    }
                    
                    // Fallback to hardcoded data (same farmer only)
                    return f.crops
                      ? f.crops
                          .filter((c) => c.name !== crop.name)
                          .map((c, i) => (
                            <div 
                              key={i} 
                              className="crop-chip"
                              onClick={() => viewOtherCrop(c.name)}
                            >
                              <span className="crop-name">{c.name}</span>
                              <span className="crop-price">₹{c.price}/kg</span>
                            </div>
                          ))
                      : <p style={{padding: '15px', color: '#666'}}>No other crops available</p>;
                  })()}
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Farmer Details Modal */}
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
