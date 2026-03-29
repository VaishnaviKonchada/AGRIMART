import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/FarmerCropDetails.css";

export default function FarmerCropDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const farmer = location.state?.farmer || null;
  const cropName = location.state?.cropName || "Crop";
  const crops = Array.isArray(location.state?.crops) ? location.state.crops : [];

  const LANGUAGE_LABELS = {
    en: "English",
    te: "తెలుగు",
    hi: "हिंदी",
  };

  const UI_TEXT = {
    en: {
      detailsNotAvailable: "Details Not Available",
      detailsNotFound: "Crop details were not found. Please return and try again.",
      back: "<- Back",
      fullDetails: "Full Details",
      allEntries: "All",
      entriesAddedByFarmer: "entries added by this farmer",
      farmerInformation: "Farmer Information",
      name: "Name",
      farmerId: "Farmer ID",
      phone: "Phone",
      email: "Email",
      location: "Location",
      totalAvailable: "Total Available",
      category: "Category",
      available: "Available",
      price: "Price",
      minOrder: "Min Order",
      quality: "Quality",
      organic: "Organic",
      storage: "Storage",
      description: "Description",
      cropGuidance: "Crop Guidance",
      noGuidance: "No guidance provided",
      noDescription: "No description available",
      yes: "Yes",
      no: "No",
      standard: "Standard",
      notAvailable: "N/A",
      imageUnavailable: "Image unavailable",
    },
    te: {
      detailsNotAvailable: "వివరాలు అందుబాటులో లేవు",
      detailsNotFound: "పంట వివరాలు కనబడలేదు. దయచేసి వెనుకకు వెళ్లి మళ్లీ ప్రయత్నించండి.",
      back: "<- వెనుకకు",
      fullDetails: "పూర్తి వివరాలు",
      allEntries: "అన్ని",
      entriesAddedByFarmer: "ఈ రైతు చే చేర్చిన నమోదు అంశాలు",
      farmerInformation: "రైతు సమాచారం",
      name: "పేరు",
      farmerId: "రైతు ఐడి",
      phone: "ఫోన్",
      email: "ఇమెయిల్",
      location: "ప్రాంతం",
      totalAvailable: "మొత్తం అందుబాటులో",
      category: "వర్గం",
      available: "అందుబాటులో",
      price: "ధర",
      minOrder: "కనిష్ట ఆర్డర్",
      quality: "నాణ్యత",
      organic: "సేంద్రీయ",
      storage: "నిల్వ",
      description: "వివరణ",
      cropGuidance: "పంట మార్గదర్శకం",
      noGuidance: "మార్గదర్శకం అందుబాటులో లేదు",
      noDescription: "వివరణ అందుబాటులో లేదు",
      yes: "అవును",
      no: "కాదు",
      standard: "సాధారణం",
      notAvailable: "N/A",
      imageUnavailable: "చిత్రం అందుబాటులో లేదు",
    },
    hi: {
      detailsNotAvailable: "विवरण उपलब्ध नहीं है",
      detailsNotFound: "फसल का विवरण नहीं मिला। कृपया वापस जाकर फिर से प्रयास करें।",
      back: "<- वापस",
      fullDetails: "पूरा विवरण",
      allEntries: "सभी",
      entriesAddedByFarmer: "इस किसान द्वारा जोड़ी गई प्रविष्टियां",
      farmerInformation: "किसान जानकारी",
      name: "नाम",
      farmerId: "किसान आईडी",
      phone: "फोन",
      email: "ईमेल",
      location: "स्थान",
      totalAvailable: "कुल उपलब्ध",
      category: "श्रेणी",
      available: "उपलब्ध",
      price: "कीमत",
      minOrder: "न्यूनतम ऑर्डर",
      quality: "गुणवत्ता",
      organic: "ऑर्गेनिक",
      storage: "भंडारण",
      description: "विवरण",
      cropGuidance: "फसल मार्गदर्शन",
      noGuidance: "मार्गदर्शन उपलब्ध नहीं है",
      noDescription: "विवरण उपलब्ध नहीं है",
      yes: "हां",
      no: "नहीं",
      standard: "स्टैंडर्ड",
      notAvailable: "N/A",
      imageUnavailable: "छवि उपलब्ध नहीं है",
    },
  };

  const CURATED_VALUE_MAP = {
    te: {
      category: {
        Vegetable: "కూరగాయ",
        Fruit: "పండు",
        Pulse: "పప్పు",
        Grain: "ధాన్యం",
        Spice: "మసాలా",
        Herb: "ఆకు దినుసు",
        Other: "ఇతర",
      },
      quality: {
        Premium: "ప్రీమియం",
        Standard: "సాధారణం",
        Economy: "ఆర్థిక",
      },
      storage: {
        Ambient: "సాధారణ ఉష్ణోగ్రత",
        Chilled: "చల్లని నిల్వ",
        Frozen: "ఫ్రీజ్ నిల్వ",
      },
      unit: {
        kg: "కిలో",
        Kg: "కిలో",
        ton: "టన్ను",
        Ton: "టన్ను",
      },
      crop: {
        Mango: "మామిడి",
        Tomato: "టమాటా",
        Onion: "ఉల్లి",
        Potato: "బంగాళాదుంప",
        Banana: "అరటి",
      },
    },
    hi: {
      category: {
        Vegetable: "सब्जी",
        Fruit: "फल",
        Pulse: "दाल",
        Grain: "अनाज",
        Spice: "मसाला",
        Herb: "जड़ी-बूटी",
        Other: "अन्य",
      },
      quality: {
        Premium: "प्रीमियम",
        Standard: "स्टैंडर्ड",
        Economy: "इकोनॉमी",
      },
      storage: {
        Ambient: "सामान्य तापमान",
        Chilled: "ठंडा भंडारण",
        Frozen: "जमा हुआ भंडारण",
      },
      unit: {
        kg: "किलो",
        Kg: "किलो",
        ton: "टन",
        Ton: "टन",
      },
      crop: {
        Mango: "आम",
        Tomato: "टमाटर",
        Onion: "प्याज",
        Potato: "आलू",
        Banana: "केला",
      },
    },
  };

  const CURATED_TEXT_MAP = {
    te: {
      "fresh farm-grown banganapalli mangoes harvested this season. sweet taste, premium quality, and naturally ripened. suitable for direct consumption and juice preparation.": "ఈ సీజన్‌లో కోసిన తాజా బంగనపల్లి మామిడిపండ్లు. తీయని రుచి, ప్రీమియం నాణ్యత, సహజంగా పండినవి. నేరుగా తినడానికి మరియు జ్యూస్ తయారీకి అనుకూలం.",
      "mango grows best in warm tropical climates with well-drained loamy soil. farmers plant grafted mango saplings in pits about 1 meter deep, keeping around 8 meters spacing between trees. regular watering through drip irrigation helps young plants grow well. organic manure and balanced fertilizers improve tree health. mango fruits are usually harvested between april and june when they reach full size and start turning slightly yellow.": "మామిడి పంట వేడి ఉష్ణమండల వాతావరణంలో, నీరు నిల్వ కాకుండా పోయే లోమీ నేలలో బాగా పెరుగుతుంది. సుమారు 1 మీటర్ లోతు గుంతల్లో గ్రాఫ్టెడ్ మొక్కలు నాటి, చెట్ల మధ్య సుమారు 8 మీటర్ల దూరం ఉంచాలి. డ్రిప్ సేద్యంతో క్రమం తప్పకుండా నీరు ఇస్తే చిన్న మొక్కలు బాగా పెరుగుతాయి. సేంద్రీయ ఎరువు మరియు సమతుల ఎరువులు చెట్టు ఆరోగ్యాన్ని మెరుగుపరుస్తాయి. మామిడి పండ్లు సాధారణంగా ఏప్రిల్ నుండి జూన్ మధ్య పూర్తిగా ఎదిగి స్వల్పంగా పసుపు రంగు రావడం ప్రారంభమైనప్పుడు కోతకు వస్తాయి.",
    },
    hi: {
      "fresh farm-grown banganapalli mangoes harvested this season. sweet taste, premium quality, and naturally ripened. suitable for direct consumption and juice preparation.": "इस मौसम में तोड़े गए ताजे बांगनपल्ली आम। मीठा स्वाद, प्रीमियम गुणवत्ता और प्राकृतिक रूप से पके हुए। सीधे खाने और जूस बनाने के लिए उपयुक्त।",
      "mango grows best in warm tropical climates with well-drained loamy soil. farmers plant grafted mango saplings in pits about 1 meter deep, keeping around 8 meters spacing between trees. regular watering through drip irrigation helps young plants grow well. organic manure and balanced fertilizers improve tree health. mango fruits are usually harvested between april and june when they reach full size and start turning slightly yellow.": "आम की खेती गर्म उष्णकटिबंधीय जलवायु और अच्छी जल निकासी वाली दोमट मिट्टी में सबसे अच्छी होती है। किसान लगभग 1 मीटर गहरे गड्ढों में ग्राफ्टेड पौधे लगाते हैं और पेड़ों के बीच लगभग 8 मीटर दूरी रखते हैं। ड्रिप सिंचाई से नियमित पानी देने पर पौधे अच्छे बढ़ते हैं। जैविक खाद और संतुलित उर्वरक पेड़ के स्वास्थ्य को बेहतर बनाते हैं। आम के फल आमतौर पर अप्रैल से जून के बीच तब तोड़े जाते हैं जब वे पूरे आकार में आकर हल्के पीले होने लगते हैं।",
    },
  };

  const t = (key) => UI_TEXT[selectedLanguage]?.[key] || UI_TEXT.en[key] || key;

  const normalizeSentence = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

  const localizeValue = (value, type) => {
    if (!value || selectedLanguage === "en") return value;
    const curated = CURATED_VALUE_MAP[selectedLanguage]?.[type]?.[value];
    return curated || value;
  };

  const localizeText = (text, fallbackKey) => {
    const normalized = String(text || "").trim();
    if (!normalized) {
      return t(fallbackKey);
    }
    if (selectedLanguage === "en") return normalized;

    const exact = CURATED_TEXT_MAP[selectedLanguage]?.[normalizeSentence(normalized)];
    if (exact) return exact;

    return normalized;
  };

  if (!farmer || crops.length === 0) {
    return (
      <div className="farmer-crop-details-page">
        <div className="farmer-crop-details-card">
          <h2>{t("detailsNotAvailable")}</h2>
          <p>{t("detailsNotFound")}</p>
          <button className="back-btn" onClick={() => navigate(-1)}>
            {t("back")}
          </button>
        </div>
      </div>
    );
  }

  const totalAvailable = crops.reduce(
    (sum, crop) => sum + Number(crop.availableQuantity || crop.quantity || 0),
    0
  );

  return (
    <div className="farmer-crop-details-page">
      <div className="farmer-crop-details-header">
        <div className="header-top-row">
          <button className="back-btn" onClick={() => navigate(-1)}>
            {t("back")}
          </button>
          <div className="language-toggle">
            {Object.entries(LANGUAGE_LABELS).map(([langCode, label]) => (
              <button
                key={langCode}
                type="button"
                className={`language-btn ${selectedLanguage === langCode ? "active" : ""}`}
                onClick={() => setSelectedLanguage(langCode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <h1>{localizeValue(cropName, "crop") || cropName} {t("fullDetails")}</h1>
        <p>{t("allEntries")} {localizeValue(cropName, "crop") || cropName} {t("entriesAddedByFarmer")}</p>
      </div>

      <div className="farmer-info-box">
        <h3>{t("farmerInformation")}</h3>
        <div className="info-grid">
          <div><strong>{t("name")}:</strong> {farmer.name || t("notAvailable")}</div>
          <div><strong>{t("farmerId")}:</strong> {String(farmer._id || t("notAvailable"))}</div>
          <div><strong>{t("phone")}:</strong> {farmer.phone || t("notAvailable")}</div>
          <div><strong>{t("email")}:</strong> {farmer.email || t("notAvailable")}</div>
          <div><strong>{t("location")}:</strong> {[farmer.mandal, farmer.district, farmer.state].filter(Boolean).join(", ") || t("notAvailable")}</div>
          <div><strong>{t("totalAvailable")}:</strong> {totalAvailable} kg</div>
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
                <h3>{crop.cropName || t("notAvailable")}</h3>
                <span>{localizeValue(crop.variety, "crop") || crop.variety || t("standard")}</span>
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
                <div><strong>{t("category")}:</strong> {localizeValue(crop.category, "category") || crop.category || t("notAvailable")}</div>
                <div><strong>{t("available")}:</strong> {available} {localizeValue(crop.unit || "kg", "unit") || "kg"}</div>
                <div><strong>{t("price")}:</strong> Rs.{price}/kg</div>
                <div><strong>{t("minOrder")}:</strong> {crop.minimumOrderQuantity || crop.minOrder || 1} {localizeValue(crop.unit || "kg", "unit") || "kg"}</div>
                <div><strong>{t("quality")}:</strong> {localizeValue(crop.quality, "quality") || crop.quality || t("notAvailable")}</div>
                <div><strong>{t("organic")}:</strong> {crop.isOrganic || crop.organic ? t("yes") : t("no")}</div>
                <div><strong>{t("storage")}:</strong> {localizeValue(crop.storageType, "storage") || crop.storageType || t("notAvailable")}</div>
              </div>

              <div className="crop-description">
                <strong>{t("description")}:</strong> {localizeText(crop.description, "noDescription")}
              </div>

              <div className="crop-description">
                <strong>{t("cropGuidance")}:</strong> {localizeText(cropGuidance, "noGuidance")}
              </div>

              {cropImages.length === 0 && (
                <div className="crop-image-note">{t("imageUnavailable")}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
