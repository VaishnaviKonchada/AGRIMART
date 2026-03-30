import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../utils/api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import CustomerHeader from "../components/CustomerHeader";
import BottomNav from "../components/BottomNav";
import { useTranslation } from "react-i18next";
import "../styles/Home.css";

const PENDING_DEALER_REQUESTS_KEY = "pendingDealerRequests";

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const AUTO_REFRESH_MS = 5 * 60 * 1000;
  const [search, setSearch] = useState("");
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default crop images mapping
  const cropImages = {
    "apple": "https://cdn.pixabay.com/photo/2016/08/09/10/30/apple-1580273_1280.jpg",
    "potato": "https://cdn.pixabay.com/photo/2016/08/11/08/43/potatoes-1585060_1280.jpg",
    "grapes": "https://cdn.pixabay.com/photo/2015/05/07/13/46/grapes-756503_1280.jpg",
    "tomato": "https://cdn.pixabay.com/photo/2017/10/06/17/17/tomato-2823826_1280.jpg",
    "onion": "https://cdn.pixabay.com/photo/2016/03/05/22/59/onion-1239340_1280.jpg",
    "carrot": "https://cdn.pixabay.com/photo/2017/08/06/15/23/carrot-2593538_1280.jpg",
    "cabbage": "https://cdn.pixabay.com/photo/2016/08/15/10/43/cabbage-1595797_1280.jpg",
    "cauliflower": "https://cdn.pixabay.com/photo/2017/03/16/20/07/cauliflower-2150546_1280.jpg",
    "brinjal": "https://cdn.pixabay.com/photo/2016/11/18/14/29/eggplant-1834392_1280.jpg",
    "peas": "https://cdn.pixabay.com/photo/2016/03/05/22/03/peas-1239186_1280.jpg",
    "beans": "https://cdn.pixabay.com/photo/2018/02/16/10/52/green-beans-3157142_1280.jpg",
    "radish": "https://cdn.pixabay.com/photo/2017/08/08/01/17/radish-2609470_1280.jpg",
    "beetroot": "https://cdn.pixabay.com/photo/2017/01/19/11/01/beet-1991143_1280.jpg",
    "spinach": "https://cdn.pixabay.com/photo/2017/08/01/08/25/spinach-2563917_1280.jpg",
    "okra": "https://cdn.pixabay.com/photo/2017/02/20/08/28/okra-2082699_1280.jpg",
    "coriander": "https://cdn.pixabay.com/photo/2016/03/05/22/03/coriander-1239176_1280.jpg",
    "mint": "https://cdn.pixabay.com/photo/2016/03/02/22/14/mint-1232046_1280.jpg",
    "garlic": "https://cdn.pixabay.com/photo/2016/03/05/22/03/garlic-1239231_1280.jpg",
    "mango": "https://cdn.pixabay.com/photo/2015/04/23/16/34/mango-736532_1280.jpg",
    "banana": "https://cdn.pixabay.com/photo/2017/06/25/19/30/bananas-2442430_1280.jpg",
    "orange": "https://cdn.pixabay.com/photo/2016/09/19/15/08/oranges-1681214_1280.jpg",
    "strawberry": "https://cdn.pixabay.com/photo/2016/04/15/08/04/strawberries-1330459_1280.jpg",
    "bell pepper": "https://cdn.pixabay.com/photo/2016/03/05/22/03/bell-pepper-1239263_1280.jpg",
    "cucumber": "https://cdn.pixabay.com/photo/2015/07/17/13/44/cucumbers-849269_1280.jpg",
    "watermelon": "https://cdn.pixabay.com/photo/2015/06/24/13/32/watermelon-819415_1280.jpg",
    "papaya": "https://cdn.pixabay.com/photo/2017/08/01/20/14/papaya-2567348_1280.jpg",
    "pumpkin": "https://cdn.pixabay.com/photo/2016/09/20/22/22/pumpkin-1683658_1280.jpg",
    "ginger": "https://cdn.pixabay.com/photo/2017/01/06/19/15/ginger-1958350_1280.jpg",
    "green chilli": "https://cdn.pixabay.com/photo/2018/04/09/05/46/chilli-3302972_1280.jpg",
    "lemon": "https://cdn.pixabay.com/photo/2017/02/05/12/31/lemons-2038808_1280.jpg",
    "pomegranate": "https://cdn.pixabay.com/photo/2017/10/07/15/44/pomegranate-2825556_1280.jpg",
    "guava": "https://cdn.pixabay.com/photo/2019/07/14/16/29/guava-4337830_1280.jpg",
    "drumstick": "https://cdn.pixabay.com/photo/2020/02/09/12/57/moringa-4832710_1280.jpg",
    "bottle gourd": "https://cdn.pixabay.com/photo/2017/09/26/18/28/bottle-gourd-2789967_1280.jpg",
    "ridge gourd": "https://cdn.pixabay.com/photo/2020/04/02/08/40/ridge-gourd-4994809_1280.jpg",
    "bitter gourd": "https://cdn.pixabay.com/photo/2016/06/25/14/08/bitter-melon-1478918_1280.jpg",
    "pineapple": "https://cdn.pixabay.com/photo/2016/03/27/19/43/pineapple-1283636_1280.jpg",
    "coconut": "https://cdn.pixabay.com/photo/2016/09/08/10/52/coconuts-1654285_1280.jpg"
  };

  // Fetch crops from backend
  useEffect(() => {
    fetchCrops();

    const refreshTimer = setInterval(() => {
      fetchCrops({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    const checkPendingDealerRequests = async () => {
      try {
        const pending = JSON.parse(localStorage.getItem(PENDING_DEALER_REQUESTS_KEY) || "[]");
        if (!Array.isArray(pending) || pending.length === 0) return;

        for (const req of pending) {
          if (!req?.requestId) continue;

          const statusData = await apiGet(`transport-dealers/request/${req.requestId}`);

          if (statusData?.status === "ACCEPTED" && statusData?.chatId) {
            localStorage.setItem("activeChat", JSON.stringify({
              chatId: statusData.chatId,
              requestId: req.requestId,
            }));
            const next = pending.filter((item) => String(item.requestId) !== String(req.requestId));
            localStorage.setItem(PENDING_DEALER_REQUESTS_KEY, JSON.stringify(next));
            alert("✅ " + t("Dealer accepted your request. Opening chat...", "Dealer accepted your request. Opening chat..."));
            navigate("/chat");
            return;
          }

          if (["REJECTED", "EXPIRED"].includes(statusData?.status)) {
            const next = pending.filter((item) => String(item.requestId) !== String(req.requestId));
            localStorage.setItem(PENDING_DEALER_REQUESTS_KEY, JSON.stringify(next));
          }
        }
      } catch (error) {
        console.warn("Pending dealer request check failed", error);
      }
    };

    const timer = setInterval(checkPendingDealerRequests, 5000);
    checkPendingDealerRequests();
    return () => clearInterval(timer);
  }, [navigate]);

  const fetchCrops = async ({ silent = false } = {}) => {
    try {
      if (!silent) { setLoading(true); setError(null); }
      const data = await apiGet("crops");
      console.log("✅ Fetched crops from backend:", data.length, "crops");

      const transformedCrops = data.map(crop => {
        const cropName = crop.cropName || crop.name || "Unknown";
        const farmerName = crop.farmerId?.name || crop.farmerDetails?.name || "Unknown Farmer";
        return {
          id: crop._id,
          name: cropName,
          image: crop.images?.[0] || crop.image || cropImages[cropName.toLowerCase()] || "https://via.placeholder.com/300x200?text=" + cropName,
          sellingPricePerKg: Number(crop.pricePerKg || 0),
          mandiReference: crop.mandiReference || null,
          category: crop.category || "Vegetable",
          farmer: farmerName,
          variety: crop.variety || "Standard",
          availableKg: Number(crop.availableQuantity ?? crop.availableKg ?? crop.quantity ?? 0)
        };
      });

      setCrops(transformedCrops);
    } catch (err) {
      console.error("❌ Error fetching crops:", err);
      if (!silent) { setError(err.message); setCrops([]); }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filteredCrops = crops.filter((crop) =>
    crop.name.toLowerCase().includes(search.toLowerCase()) ||
    crop.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="home-page">
      <CustomerHeader />

      {/* ── SEARCH HERO BANNER ── */}
      <section className="search-section">
        <div className="search-section-inner">
          <h1 className="search-title">{t('Fresh Produce, Direct from Farmers', 'Fresh Produce, Direct from Farmers')}</h1>
          <p className="search-subtitle">{t('Search vegetables, fruits, grains & more', 'Search vegetables, fruits, grains & more')}</p>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              id="home-search"
              type="text"
              placeholder={t("Search crops, vegetables, fruits...", "Search crops, vegetables, fruits...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── SECTION HEADER ── */}
      {!loading && !error && (
        <div className="section-header">
          <h2 className="section-title-text">
            🌿 {t('Available Crops', 'Available Crops')}
          </h2>
          <span className="section-count">
            {filteredCrops.length} {filteredCrops.length === 1 ? t('listing', 'listing') : t('listings', 'listings')}
          </span>
        </div>
      )}

      {/* ── CROPS CONTAINER ── */}
      <div className="crops-container">

        {/* Loading */}
        {loading && (
          <div className="state-card">
            <div className="ag-spinner"></div>
            <p className="state-message">{t('Loading fresh crops…', 'Loading fresh crops…')}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="state-card">
            <span className="state-icon">⚠️</span>
            <p className="error-text">{error}</p>
            <button className="retry-btn" onClick={fetchCrops}>↻ {t('Retry', 'Retry')}</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredCrops.length === 0 && (
          <div className="state-card">
            <span className="state-icon">🔍</span>
            <p className="state-message">{t('No crops found for', 'No crops found for')} "{search}"</p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && filteredCrops.length > 0 && (
          <div className="crops-grid">
            {filteredCrops.map((crop) => (
              <div
                key={crop.id}
                className="crop-card"
                onClick={() =>
                  navigate("/crop-details", {
                    state: {
                      crop: {
                        name: crop.name,
                        variety: crop.variety,
                        pricePerKg: crop.sellingPricePerKg,
                        mandiReference: crop.mandiReference,
                        category: crop.category,
                        cropName: crop.name
                      }
                    }
                  })
                }
              >
                <div className="crop-image-wrapper">
                  <img src={crop.image} alt={crop.name} className="crop-image" />
                  <span className={`category-badge ${crop.category.toLowerCase()}`}>
                    {t(crop.category, crop.category)}
                  </span>
                </div>

                <div className="crop-info">
                  <h3 className="crop-name">{t(crop.name, crop.name)}</h3>
                  <p className="crop-price">
                    ₹{crop.sellingPricePerKg} <span>/{t('kg', 'kg')}</span>
                  </p>
                  <p className="crop-price-note">{t('Farmer selling price', 'Farmer selling price')}</p>
                  {crop.mandiReference && (
                    <span
                      className="crop-mandi-ref"
                      title={t("Government mandi wholesale reference. 1 quintal = 100 kg.", "Government mandi wholesale reference. 1 quintal = 100 kg.")}
                    >
                      🏛 ₹{crop.mandiReference.modalPricePerQuintal}/{t('quintal', 'quintal')}
                    </span>
                  )}
                  <p className="crop-farmer">👨‍🌾 {crop.farmer}</p>
                  <button className="view-details-btn">{t('View Details →', 'View Details →')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

    </div>
  );
}
