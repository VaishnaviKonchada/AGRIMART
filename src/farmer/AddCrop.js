import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost } from "../utils/api";
import "../styles/AddCrop.css";

/* 🌱 Crop Procedures Dataset (Sample – Major Crops) */
const cropProcedures = {
  rice: {
    en: "1 Seed Selection and Nursery Preparation\nGood quality rice seeds are selected and sown in a small nursery area. After about 20-25 days, the seedlings grow strong and are ready for transplanting.\n\n2 Transplanting Seedlings\nThe young rice seedlings from the nursery are carefully removed and planted in the main field with proper spacing between plants.\n\n3 Irrigation Management\nRice fields require regular water. Farmers maintain a shallow layer of water in the field to support plant growth.\n\n4 Fertilizer Application\nFarmers apply fertilizers such as Urea, DAP, and Potash to improve plant growth and increase yield.\n\n5 Weed and Pest Control\nWeeds are removed regularly, and farmers monitor the crop for pests or diseases to protect the plants.\n\n6 Harvesting\nAfter about 100-120 days, when the rice plants turn golden yellow, the crop is harvested and grains are separated from the plants.",
    te: "1 విత్తనాల ఎంపిక మరియు నర్సరీ సిద్ధం\nమంచి నాణ్యత గల వరి విత్తనాలను ఎంచుకుని చిన్న నర్సరీలో విత్తుతారు. సుమారు 20-25 రోజుల్లో మొక్కలు బలంగా పెరిగి నాటడానికి సిద్ధమవుతాయి.\n\n2 నారు నాటు\nనర్సరీలో పెరిగిన నారును జాగ్రత్తగా తీసి ప్రధాన పొలంలో సరైన అంతరంతో నాటుతారు.\n\n3 నీటి నిర్వహణ\nవరి పంటకు క్రమం తప్పకుండా నీరు అవసరం. మొక్కల పెరుగుదలకు పొలంలో తక్కువ లోతు నీటిమట్టాన్ని ఉంచుతారు.\n\n4 ఎరువుల వినియోగం\nపంట పెరుగుదల మరియు దిగుబడి పెరగడానికి యూరియా, డిఏపీ, పొటాష్ వంటి ఎరువులను వాడుతారు.\n\n5 కలుపు మరియు కీటక నియంత్రణ\nకలుపును తరచుగా తొలగించి, కీటకాలు లేదా రోగాలపై పర్యవేక్షణ చేసి పంటను రక్షిస్తారు.\n\n6 కోత\nసుమారు 100-120 రోజులకు పంట బంగారు రంగు పడితే కోత కోసి గింజలను వేరుచేస్తారు.",
    hi: "1 बीज चयन और नर्सरी तैयारी\nअच्छी गुणवत्ता वाले धान के बीज चुने जाते हैं और छोटी नर्सरी में बोए जाते हैं। लगभग 20-25 दिनों बाद पौधे मजबूत होकर रोपाई के लिए तैयार हो जाते हैं।\n\n2 रोपाई\nनर्सरी के पौधों को सावधानी से निकालकर मुख्य खेत में उचित दूरी पर लगाया जाता है।\n\n3 सिंचाई प्रबंधन\nधान की फसल में नियमित पानी की आवश्यकता होती है। पौधों की वृद्धि के लिए खेत में उथली जल परत बनाए रखी जाती है।\n\n4 उर्वरक प्रबंधन\nफसल की बढ़वार और उपज के लिए यूरिया, डीएपी और पोटाश जैसे उर्वरकों का उपयोग किया जाता है।\n\n5 खरपतवार और कीट नियंत्रण\nखरपतवार नियमित रूप से हटाए जाते हैं और कीट/रोगों की निगरानी करके फसल की सुरक्षा की जाती है।\n\n6 कटाई\nलगभग 100-120 दिनों बाद जब पौधे सुनहरे पीले हो जाएं, तब फसल काटकर दानों को अलग किया जाता है।"
  },

  tomato: {
    en: "Tomato grows well in loamy soil with good drainage. Use FYM before planting. Suitable season: Rabi & Kharif. Fertilizers: Urea, DAP. Requires moderate watering.",
    te: "టమాటా పంట మంచి డ్రైనేజి ఉన్న లోమీ మట్టిలో బాగా పెరుగుతుంది. రబీ మరియు ఖరీఫ్ కాలాలు అనుకూలం. ఎరువులు: యూరియా, డీఏపీ.",
    hi: "टमाटर दोमट मिट्टी में अच्छी जल निकासी के साथ उगता है। रबी और खरीफ मौसम उपयुक्त हैं। उर्वरक: यूरिया, डीएपी।"
  },

  potato: {
    en: "Potato requires sandy loam soil. Cool climate preferred. Season: Rabi. Fertilizers: Potash, Nitrogen. Regular irrigation required.",
    te: "బంగాళాదుంప ఇసుక లోమీ మట్టిలో బాగా పెరుగుతుంది. చల్లని వాతావరణం అవసరం. కాలం: రబీ.",
    hi: "आलू रेतीली दोमट मिट्टी में उगता है। ठंडा मौसम उपयुक्त है। मौसम: रबी।"
  },

  onion: {
    en: "Onion grows well in well-drained soil. Season: Rabi & Kharif. Requires light irrigation and nitrogen fertilizers.",
    te: "ఉల్లి మంచి డ్రైనేజి ఉన్న మట్టిలో బాగా పెరుగుతుంది. రబీ మరియు ఖరీఫ్ కాలాలు అనుకూలం.",
    hi: "प्याज अच्छी जल निकासी वाली मिट्टी में उगता है। रबी और खरीफ उपयुक्त हैं।"
  },

  carrot: {
    en: "Carrot grows best in sandy loam soil. Season: Winter. Requires phosphorus-rich fertilizers.",
    te: "క్యారెట్ ఇసుక లోమీ మట్టిలో బాగా పెరుగుతుంది. చలికాలం అనుకూలం.",
    hi: "गाजर रेतीली दोमट मिट्टी में उगती है। सर्दी का मौसम उपयुक्त है।"
  },

  apple: {
    en: "Apple requires cool climate and well-drained loamy soil. Fertilizers: NPK. Season: Winter.",
    te: "ఆపిల్ చల్లని వాతావరణంలో మరియు లోమీ మట్టిలో బాగా పెరుగుతుంది.",
    hi: "सेब ठंडी जलवायु और दोमट मिट्टी में उगता है।"
  },

  banana: {
    en: "Banana grows well in fertile loamy soil with good moisture. Season: All year. Requires heavy irrigation.",
    te: "అరటి సారవంతమైన లోమీ మట్టిలో బాగా పెరుగుతుంది. ఏడాది పొడవునా సాగు చేయవచ్చు.",
    hi: "केला उपजाऊ दोमट मिट्टी में उगता है। सालभर उगाया जा सकता है।"
  }
};

// Curated sentence-level translations for guidance text entered by users.
const CURATED_GUIDANCE_TRANSLATIONS = {
  en: {
    "Crop procedure will be updated soon by the system.": {
      te: "ఈ పంట మార్గదర్శకం త్వరలో సిస్టమ్ ద్వారా నవీకరించబడుతుంది.",
      hi: "इस फसल मार्गदर्शन को सिस्टम द्वारा जल्द ही अपडेट किया जाएगा।"
    },
    "Tomato grows well in loamy soil with good drainage. Use FYM before planting. Suitable season: Rabi & Kharif. Fertilizers: Urea, DAP. Requires moderate watering.": {
      te: "టమాటా పంట మంచి డ్రైనేజి ఉన్న లోమీ మట్టిలో బాగా పెరుగుతుంది. రబీ మరియు ఖరీఫ్ కాలాలు అనుకూలం. ఎరువులు: యూరియా, డీఏపీ.",
      hi: "टमाटर दोमट मिट्टी में अच्छी जल निकासी के साथ उगता है। रबी और खरीफ मौसम उपयुक्त हैं। उर्वरक: यूरिया, डीएपी।"
    },
    "Potato requires sandy loam soil. Cool climate preferred. Season: Rabi. Fertilizers: Potash, Nitrogen. Regular irrigation required.": {
      te: "బంగాళాదుంప ఇసుక లోమీ మట్టిలో బాగా పెరుగుతుంది. చల్లని వాతావరణం అవసరం. కాలం: రబీ.",
      hi: "आलू रेतीली दोमट मिट्टी में उगता है। ठंडा मौसम उपयुक्त है। मौसम: रबी।"
    },
    "Onion grows well in well-drained soil. Season: Rabi & Kharif. Requires light irrigation and nitrogen fertilizers.": {
      te: "ఉల్లి మంచి డ్రైనేజి ఉన్న మట్టిలో బాగా పెరుగుతుంది. రబీ మరియు ఖరీఫ్ కాలాలు అనుకూలం.",
      hi: "प्याज अच्छी जल निकासी वाली मिट्टी में उगता है। रबी और खरीफ उपयुक्त हैं।"
    },
    "Carrot grows best in sandy loam soil. Season: Winter. Requires phosphorus-rich fertilizers.": {
      te: "క్యారెట్ ఇసుక లోమీ మట్టిలో బాగా పెరుగుతుంది. చలికాలం అనుకూలం.",
      hi: "गाजर रेतीली दोमट मिट्टी में उगती है। सर्दी का मौसम उपयुक्त है।"
    },
    "Carrot grows best in cool climates and sandy loam soil with good drainage. Farmers sow carrot seeds directly in the field with proper spacing to allow roots to grow straight. Regular irrigation and phosphorus-rich fertilizers help improve root development. Carrots are usually ready for harvest in about 90-110 days after sowing.": {
      te: "క్యారెట్ పంట చల్లటి వాతావరణంలో మరియు మంచి డ్రైనేజి ఉన్న ఇసుక లోమీ మట్టిలో బాగా పెరుగుతుంది. వేర్లు నేరుగా పెరగడానికి రైతులు సరైన అంతరంతో విత్తనాలను నేరుగా పొలంలో విత్తుతారు. క్రమం తప్పకుండా నీరు పెట్టడం మరియు ఫాస్ఫరస్ అధికంగా ఉన్న ఎరువులు వేర్ల అభివృద్ధిని మెరుగుపరుస్తాయి. సాధారణంగా విత్తిన తర్వాత 90-110 రోజుల్లో క్యారెట్లు కోతకు సిద్ధమవుతాయి.",
      hi: "गाजर अच्छी जल निकासी वाली रेतीली दोमट मिट्टी और ठंडे मौसम में बेहतर उगती है। जड़ों को सीधा बढ़ने देने के लिए किसान उचित दूरी पर बीज सीधे खेत में बोते हैं। नियमित सिंचाई और फास्फोरस युक्त उर्वरक जड़ों के विकास में मदद करते हैं। आमतौर पर बुवाई के 90-110 दिनों बाद गाजर की फसल कटाई के लिए तैयार हो जाती है।"
    },
    "Apple requires cool climate and well-drained loamy soil. Fertilizers: NPK. Season: Winter.": {
      te: "ఆపిల్ చల్లని వాతావరణంలో మరియు లోమీ మట్టిలో బాగా పెరుగుతుంది.",
      hi: "सेब ठंडी जलवायु और दोमट मिट्टी में उगता है।"
    },
    "Banana grows well in fertile loamy soil with good moisture. Season: All year. Requires heavy irrigation.": {
      te: "అరటి సారవంతమైన లోమీ మట్టిలో బాగా పెరుగుతుంది. ఏడాది పొడవునా సాగు చేయవచ్చు.",
      hi: "केला उपजाऊ दोमट मिट्टी में उगता है। सालभर उगाया जा सकता है।"
    }
  }
};

const FALLBACK_GUIDANCE_MESSAGE = {
  en: "Crop procedure will be updated soon by the system.",
  te: "ఈ పంట మార్గదర్శకం త్వరలో సిస్టమ్ ద్వారా నవీకరించబడుతుంది.",
  hi: "इस फसल मार्गदर्शन को सिस्टम द्वारा जल्द ही अपडेट किया जाएगा।",
};

function normalizeGuidanceText(text) {
  return (text || "")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getCuratedGuidanceTranslation(sourceText, targetLanguage) {
  if (!sourceText || !targetLanguage || targetLanguage === "en") return null;
  const normalized = normalizeGuidanceText(sourceText);
  const direct = CURATED_GUIDANCE_TRANSLATIONS.en[normalized]?.[targetLanguage]
    || CURATED_GUIDANCE_TRANSLATIONS.en[sourceText]?.[targetLanguage];
  return direct || null;
}

function getFallbackGuidance(language) {
  return FALLBACK_GUIDANCE_MESSAGE[language] || FALLBACK_GUIDANCE_MESSAGE.en;
}

function getProcedureForCrop(cropName, language) {
  const key = String(cropName || "").toLowerCase().trim();
  if (!key) return "";

  const direct = cropProcedures[key]?.[language] || cropProcedures[key]?.en;
  if (direct) return direct;

  return getFallbackGuidance(language);
}

function normalizeDDMMYYYYInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}-${month}`;
  return `${day}-${month}-${year}`;
}

function parseDDMMYYYY(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const isoDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dateObj = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) return null;

  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() + 1 !== month ||
    dateObj.getDate() !== day
  ) {
    return null;
  }

  return { isoDate, dateObj };
}

export default function AddCrop() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("registeredUser") || "null");
  const farmerProfile = JSON.parse(localStorage.getItem("farmerProfile") || "null");
  const categoryOptions = ["Vegetable", "Fruit", "Pulse", "Grain", "Spice", "Herb", "Other"];

  // Form state
  const [cropName, setCropName] = useState("");
  const [variety, setVariety] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minOrder, setMinOrder] = useState(1);
  const [unit, setUnit] = useState("kg");
  const [pricePerKg, setPricePerKg] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [qualityGrade, setQualityGrade] = useState("Standard");
  const [soilType, setSoilType] = useState("");
  const [irrigation, setIrrigation] = useState("Drip");
  const [fertilizer, setFertilizer] = useState("");
  const [organic, setOrganic] = useState(false);
  const [storageType, setStorageType] = useState("Ambient");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]); // base64 previews

  // Guidance section
  const [language, setLanguage] = useState("en");
  const [procedure, setProcedure] = useState("");
  const [procedureEdited, setProcedureEdited] = useState(false);
  const [procedureTexts, setProcedureTexts] = useState({ en: "", te: "", hi: "" });
  const [baseLang, setBaseLang] = useState(null);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [backendVarieties, setBackendVarieties] = useState([]);
  const [isLoadingVarieties, setIsLoadingVarieties] = useState(false);
  const [cropCatalog, setCropCatalog] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  // Government crop names for filtering
  const [govtCropNames, setGovtCropNames] = useState([]);
  const [isLoadingGovtCrops, setIsLoadingGovtCrops] = useState(false);
  const [liveProfile, setLiveProfile] = useState(null);
  const [mandiInfo, setMandiInfo] = useState({ loading: false, found: false, suggestedPricePerKg: null, modalPricePerQuintal: null, minPricePerQuintal: null, maxPricePerQuintal: null, market: '', state: '', arrivalDate: '' });

  useEffect(() => {
    const loadLiveProfile = async () => {
      try {
        const data = await apiGet("users/me");
        if (data?.user) {
          setLiveProfile(data.user);
        }
      } catch {
        // Keep silent and rely on localStorage fallback.
      }
    };

    loadLiveProfile();
  }, []);

  const farmerName =
    liveProfile?.name ||
    farmerProfile?.name ||
    user?.name ||
    "Farmer";

  const farmerLocation =
    liveProfile?.location ||
    liveProfile?.locationText ||
    farmerProfile?.location ||
    farmerProfile?.locationText ||
    farmerProfile?.profile?.locationText ||
    user?.location ||
    user?.locationText ||
    user?.profile?.locationText ||
    "";

  const farmerState =
    liveProfile?.state ||
    farmerProfile?.state ||
    farmerProfile?.profile?.state ||
    user?.state ||
    user?.profile?.state ||
    "";

  const farmerPincode =
    liveProfile?.pincode ||
    farmerProfile?.pincode ||
    farmerProfile?.profile?.pincode ||
    user?.pincode ||
    user?.profile?.pincode ||
    "";

  useEffect(() => {
    if (procedureEdited) {
      const source = baseLang || "en";
      const sourceText = procedureTexts[source] || procedureTexts.en || "";
      const existing = procedureTexts[language] || "";
      const curatedFromSource = getCuratedGuidanceTranslation(sourceText, language);
      const key = cropName.toLowerCase().trim();
      const curatedByCrop = cropProcedures[key]?.[language] || null;
      const localizedFallback = getFallbackGuidance(language);

      // If target language currently contains copied English, replace it using curated/crop translation.
      if (
        language !== "en" &&
        normalizeGuidanceText(existing) === normalizeGuidanceText(sourceText)
      ) {
        const resolved = curatedFromSource || curatedByCrop;
        if (resolved) {
          setProcedureTexts((prev) => ({ ...prev, [language]: resolved }));
          setProcedure(resolved);
          return;
        }
      }

      // If target language text is missing or only copied from source English, apply curated translation.
      if (
        curatedFromSource &&
        language !== "en" &&
        (!existing.trim() || normalizeGuidanceText(existing) === normalizeGuidanceText(sourceText))
      ) {
        setProcedureTexts((prev) => ({ ...prev, [language]: curatedFromSource }));
        setProcedure(curatedFromSource);
        return;
      }

      // In manual mode, always prefer text previously typed in the selected language.
      const existingTargetText = procedureTexts[language];
      if (existingTargetText && existingTargetText.trim()) {
        setProcedure(existingTargetText);
        return;
      }

      // If current language has no text yet, derive from English/source text first.
      if (sourceText && sourceText.trim()) {
        const resolved =
          language === "en"
            ? sourceText
            : curatedFromSource || curatedByCrop || localizedFallback;
        setProcedureTexts((prev) => ({ ...prev, [language]: resolved }));
        setProcedure(resolved);
        return;
      }

      const curated = cropProcedures[key]?.[language];
      if (curated) {
        setProcedure(curated);
        return;
      }

      if (cropName.trim()) {
        setProcedure(localizedFallback);
        setProcedureTexts((prev) => ({ ...prev, [language]: localizedFallback }));
        return;
      }

      setProcedure("");
      return;
    }
    const key = cropName.toLowerCase().trim();
    if (key) {
      const text = getProcedureForCrop(cropName, language);
      setProcedure(text);
      setProcedureTexts((prev) => ({ ...prev, [language]: text }));
    } else {
      setProcedure("");
    }
  }, [cropName, language, procedureEdited]);

  const handleLanguageChange = (targetLanguage) => {
    setLanguage(targetLanguage);

    // For user-entered text, apply curated translation when available.
    const source = baseLang || "en";
    const sourceText = procedureTexts[source] || procedureTexts.en || procedure;
    const existing = procedureTexts[targetLanguage] || "";
    const curatedFromUserText = getCuratedGuidanceTranslation(sourceText, targetLanguage);
    const key = cropName.toLowerCase().trim();
    const curatedByCrop = cropProcedures[key]?.[targetLanguage] || null;
    const localizedFallback = getFallbackGuidance(targetLanguage);

    // If target content is just copied English, force localized content.
    if (
      targetLanguage !== "en" &&
      normalizeGuidanceText(existing) === normalizeGuidanceText(sourceText)
    ) {
      const resolved = curatedFromUserText || curatedByCrop;
      if (resolved) {
        setProcedure(resolved);
        setProcedureTexts((prev) => ({ ...prev, [targetLanguage]: resolved }));
        return;
      }
    }

    if (
      curatedFromUserText &&
      targetLanguage !== "en" &&
      (!existing.trim() || normalizeGuidanceText(existing) === normalizeGuidanceText(sourceText))
    ) {
      setProcedure(curatedFromUserText);
      setProcedureTexts((prev) => ({ ...prev, [targetLanguage]: curatedFromUserText }));
      return;
    }

    if (existing && existing.trim()) {
      setProcedure(existing);
      return;
    }

    // Never auto-copy English text into Telugu/Hindi tabs.
    if (sourceText && sourceText.trim() && targetLanguage === "en") {
      setProcedure(sourceText);
      setProcedureTexts((prev) => ({ ...prev, [targetLanguage]: sourceText }));
      return;
    }

    const curated = cropProcedures[key]?.[targetLanguage] || cropProcedures[key]?.en;
    if (curated) {
      setProcedure(curated);
      setProcedureTexts((prev) => ({ ...prev, [targetLanguage]: curated }));
      return;
    }

    if (cropName.trim()) {
      setProcedure(localizedFallback);
      setProcedureTexts((prev) => ({ ...prev, [targetLanguage]: localizedFallback }));
    } else {
      setProcedure("");
    }
  };

  // Fetch government crop names on mount
  useEffect(() => {
    setIsLoadingGovtCrops(true);
    apiGet("crops")
      .then((data) => {
        // Normalize and deduplicate crop names from backend
        const names = Array.from(
          new Set(
            (data || [])
              .map((c) => (c.cropName || c.name || "").trim().toLowerCase())
              .filter((n) => n)
          )
        );
        setGovtCropNames(names);
      })
      .catch(() => setGovtCropNames([]))
      .finally(() => setIsLoadingGovtCrops(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoadingCatalog(true);
      try {
        const query = category
          ? `crops/catalog?category=${encodeURIComponent(category)}`
          : 'crops/catalog';
        const data = await apiGet(query);
        // Only keep crop names that match the government crop names
        const rawCatalog = Array.isArray(data?.crops) ? data.crops : [];
        const filteredCatalog = rawCatalog.filter((name) =>
          govtCropNames.includes((name || "").trim().toLowerCase())
        );
        setCropCatalog(filteredCatalog);
      } catch (e) {
        setCropCatalog([]);
      } finally {
        setIsLoadingCatalog(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [category, govtCropNames]);

  // Fetch Government mandi price when crop name changes
  useEffect(() => {
    const name = cropName.trim();
    if (name.length < 3) {
      setMandiInfo({ loading: false, found: false, suggestedPricePerKg: null, modalPricePerQuintal: null, minPricePerQuintal: null, maxPricePerQuintal: null, market: '', state: '', arrivalDate: '' });
      return;
    }
    setMandiInfo(prev => ({ ...prev, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const data = await apiGet(`crops/mandi-price?commodity=${encodeURIComponent(name)}`);
        if (data?.found) {
          setMandiInfo({ loading: false, found: true, suggestedPricePerKg: data.suggestedPricePerKg, modalPricePerQuintal: data.modalPricePerQuintal, minPricePerQuintal: data.minPricePerQuintal, maxPricePerQuintal: data.maxPricePerQuintal, market: data.market || '', state: data.state || '', arrivalDate: data.arrivalDate || '' });
        } else {
          setMandiInfo({ loading: false, found: false, suggestedPricePerKg: null, modalPricePerQuintal: null, minPricePerQuintal: null, maxPricePerQuintal: null, market: '', state: '', arrivalDate: '' });
        }
      } catch {
        setMandiInfo({ loading: false, found: false, suggestedPricePerKg: null, modalPricePerQuintal: null, minPricePerQuintal: null, maxPricePerQuintal: null, market: '', state: '', arrivalDate: '' });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [cropName]);

  useEffect(() => {
    const key = cropName.trim();
    if (key.length < 2) {
      setBackendVarieties([]);
      setIsLoadingVarieties(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingVarieties(true);
      try {
        const query = `crops/varieties?cropName=${encodeURIComponent(key)}&category=${encodeURIComponent(category)}`;
        const data = await apiGet(query);
        setBackendVarieties(Array.isArray(data?.varieties) ? data.varieties : []);
      } catch (e) {
        setBackendVarieties([]);
      } finally {
        setIsLoadingVarieties(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      setIsLoadingVarieties(false);
    };
  }, [cropName, category]);

  const onSelectImages = async (files) => {
    const max = 3;
    const slice = Array.from(files).slice(0, max);
    const readers = await Promise.all(
      slice.map(
        (file) =>
          new Promise((res) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.readAsDataURL(file);
          })
      )
    );
    setImages(readers);
  };

  const validate = () => {
    const e = {};
    if (!cropName.trim()) e.cropName = "Crop name is required";
    if (!category) e.category = "Category is required";
    if (!quantity || Number(quantity) <= 0) e.quantity = "Enter a valid quantity";
    if (!pricePerKg || Number(pricePerKg) <= 0) e.pricePerKg = "Enter a valid price";
    if (!harvestDate) {
      e.harvestDate = "Enter harvest date in DD-MM-YYYY format";
    } else if (!parseDDMMYYYY(harvestDate)) {
      e.harvestDate = "Invalid date. Use DD-MM-YYYY";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        navigate('/login');
        return;
      }

      // Prepare crop data to send to backend
      const parsedHarvestDate = parseDDMMYYYY(harvestDate);

      const cropData = {
        cropName: cropName.trim(),
        variety: variety.trim(),
        category,
        pricePerKg: Number(pricePerKg),
        availableQuantity: Number(quantity),
        minimumOrderQuantity: Number(minOrder),
        description: description.trim(),
        guidance: procedure.trim(),
        guidanceLanguage: language,
        images: images, // base64 images or URLs
        isOrganic: organic,
        quality: qualityGrade,
        productionDate: parsedHarvestDate ? parsedHarvestDate.dateObj : null,
        soilType: soilType,
        irrigationMethod: irrigation,
        fertilizerUsed: fertilizer.trim(),
        storageType: storageType,
        farmerLocation: farmerLocation || ''
      };

      console.log('📤 Sending crop data to backend:', cropData);

      // Call backend API to add crop
      const data = await apiPost('crops', cropData);
      console.log('✅ Crop added successfully:', data.crop);
      
      // Show success message
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      // Reset form (keep guidance language)
      setCropName("");
      setVariety("");
      setCategory("");
      setQuantity("");
      setMinOrder(1);
      setUnit("kg");
      setPricePerKg("");
      setHarvestDate("");
      setQualityGrade("Standard");
      setSoilType("");
      setIrrigation("Drip");
      setFertilizer("");
      setOrganic(false);
      setStorageType("Ambient");
      setDescription("");
      setImages([]);
      setProcedure("");
      setProcedureEdited(false);
      setProcedureTexts({ en: "", te: "", hi: "" });
      setBaseLang(null);

      // Optional: Show success message and redirect
      alert('✅ Crop added successfully! Your crop is now visible to customers.');
      // navigate('/farmer-dashboard'); // Uncomment to auto-redirect

    } catch (error) {
      console.error('❌ Error submitting crop:', error);
      alert('Network error: ' + error.message);
    }
  };

  const suggestions = useMemo(() => {
    if (backendVarieties.length > 0) {
      return backendVarieties;
    }
    const key = cropName.trim().toLowerCase();
    if (!key) return [];
    return ["Hybrid", "Desi", "Premium", "Export", "Organic"];
  }, [cropName, backendVarieties]);

  return (
    <div className="add-crop-page">
      <div className="add-crop-container">
        <div className="add-crop-header">
          <div>
            <h2>🌱 {t("addCrop.title")}</h2>
            <p className="subtitle">{t("addCrop.subtitle")}</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="dashboard-btn"
              title={t("farmerAccount.dashboard")}
              onClick={() => navigate("/farmer-dashboard")}
            >
              <span className="dash-icon">📊</span>
              <span className="dash-label">{t("farmerAccount.dashboard")}</span>
            </button>
            <div className="farmer-chip">
              <span className="avatar">{(farmerName || "F").charAt(0).toUpperCase()}</span>
              <div>
                <div className="farmer-name">{farmerName}</div>
                <div className="farmer-loc">{farmerLocation || "Not set"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Stepper (single step as only Crop Details is used) */}
        <div className="progress-steps">
          <div className="step done"><span>{t("addCrop.cropDetails")}</span></div>
        </div>

        {saved && <div className="toast-success">✓ Crop saved successfully</div>}

        <form className="add-crop-form" onSubmit={handleSubmit}>
          {/* Left section */}
          <div className="form-grid">
            <div className="form-card">
              <h3 className="card-title">{t("addCrop.cropDetails")}</h3>
              <div className="grid-2">
                <div className={`field ${errors.cropName ? 'error' : ''}`}>
                  <label>{t("addCrop.cropName")}</label>
                  <div className="input-with-icon">
                    <span className="icon">🌾</span>
                    <input
                      type="text"
                      list="crop-name-options"
                      placeholder={t("addCrop.cropNamePlaceholder")}
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                    />
                    <datalist id="crop-name-options">
                      {cropCatalog.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                    {isLoadingGovtCrops && (
                      <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>{t("addCrop.loadingGovtCrops")}</small>
                    )}
                  </div>
                  {errors.cropName && <span className="field-error">{errors.cropName}</span>}
                  {!errors.cropName && isLoadingCatalog && (
                    <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>{t("addCrop.loadingCatalog")}</small>
                  )}
                  {!errors.cropName && !isLoadingCatalog && cropCatalog.length > 0 && (
                    <small style={{ color: '#2f6f3e', marginTop: '4px', display: 'block' }}>{cropCatalog.length} government-approved crop names available</small>
                  )}
                  {/*
                  {!errors.cropName && !isLoadingCatalog && cropCatalog.length === 0 && !isLoadingGovtCrops && (
                    <small style={{ color: '#c00', marginTop: '4px', display: 'block' }}>No matching government crop names found for this category.</small>
                  )}
                  */}
                </div>
                <div className="field">
                  <label>{t("addCrop.variety")}</label>
                  <input
                    type="text"
                    list="crop-variety-options"
                    placeholder={cropName ? t("addCrop.varietyFor", { crop: cropName }) : t("addCrop.varietyPlaceholder")}
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                  />
                  <datalist id="crop-variety-options">
                    {backendVarieties.map((v, idx) => (
                      <option key={idx} value={v} />
                    ))}
                  </datalist>
                  {isLoadingVarieties && cropName && (
                    <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>{t("addCrop.loadingVarieties")}</small>
                  )}
                  {!isLoadingVarieties && backendVarieties.length > 0 && cropName && (
                    <small style={{ color: '#2f6f3e', marginTop: '4px', display: 'block' }}>{t("addCrop.varietiesFound", { count: backendVarieties.length })}</small>
                  )}
                  {!isLoadingVarieties && backendVarieties.length === 0 && cropName && (
                    <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>{t("addCrop.noVarietiesFound")}</small>
                  )}
                </div>
              </div>

              <div className="grid-3">
                <div className={`field ${errors.category ? 'error' : ''}`}>
                  <label>{t("addCrop.categoryLabel")}</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">{t("addCrop.selectCategory")}</option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.category && <span className="field-error">{errors.category}</span>}
                </div>
                <div className={`field ${errors.harvestDate ? 'error' : ''}`}>
                  <label>{t("addCrop.harvestDate")}</label>
                  <div className="input-with-icon">
                    <span className="icon">📅</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={t("addCrop.harvestDatePlaceholder")}
                      value={harvestDate}
                      onChange={(e) => {
                        setHarvestDate(normalizeDDMMYYYYInput(e.target.value));
                        if (errors.harvestDate) {
                          setErrors((prev) => ({ ...prev, harvestDate: undefined }));
                        }
                      }}
                    />
                  </div>
                  {errors.harvestDate && <span className="field-error">{errors.harvestDate}</span>}
                </div>
                <div className="field">
                  <label>{t("addCrop.qualityGrade")}</label>
                  <select value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value)}>
                    <option value="Premium">{t("addCrop.qualityPremium")}</option>
                    <option value="Standard">{t("addCrop.qualityStandard")}</option>
                    <option value="Economy">{t("addCrop.qualityEconomy")}</option>
                  </select>
                </div>
              </div>

              <div className="grid-3">
                <div className={`field ${errors.quantity ? 'error' : ''}`}>
                  <label>{t("addCrop.quantity")}</label>
                  <div className="input-with-icon">
                    <span className="icon">📦</span>
                    <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </div>
                  {errors.quantity && <span className="field-error">{errors.quantity}</span>}
                </div>
                <div className="field">
                  <label>{t("addCrop.unit")}</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="kg">{t("addCrop.unitKg")}</option>
                    <option value="ton">{t("addCrop.unitTon")}</option>
                  </select>
                </div>
                <div className={`field ${errors.pricePerKg ? 'error' : ''}`}>
                  <label>{t("addCrop.pricePerKg")}</label>
                  <div className="input-with-icon">
                    <span className="icon">💰</span>
                    <input type="number" min="1" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} />
                  </div>
                  {errors.pricePerKg && <span className="field-error">{errors.pricePerKg}</span>}
                  {mandiInfo.loading && (
                    <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>⏳ Fetching govt mandi price...</small>
                  )}
                  {!mandiInfo.loading && mandiInfo.found && (
                    <div className="mandi-suggestion">
                      <span className="mandi-icon">🏛️</span>
                      <div className="mandi-details">
                        <span className="mandi-price">Govt Suggestion: ₹{mandiInfo.suggestedPricePerKg}/kg</span>
                        <span className="mandi-range">Mandi wholesale: ₹{mandiInfo.modalPricePerQuintal}/quintal</span>
                        <span className="mandi-range">Range: ₹{mandiInfo.minPricePerQuintal} - ₹{mandiInfo.maxPricePerQuintal}/quintal</span>
                        <span className="mandi-range" title="Government mandi rates are wholesale values. 1 quintal = 100 kg.">1 quintal = 100 kg</span>
                        {mandiInfo.market && <span className="mandi-market">{mandiInfo.market}{mandiInfo.state ? `, ${mandiInfo.state}` : ''}{mandiInfo.arrivalDate ? ` • ${mandiInfo.arrivalDate}` : ''}</span>}
                      </div>
                      <button
                        type="button"
                        className="mandi-use-btn"
                        onClick={() => setPricePerKg(String(mandiInfo.suggestedPricePerKg))}
                      >Use ₹/kg</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid-3">
                <div className="field">
                  <label>{t("addCrop.minOrder")}</label>
                  <input type="number" min="1" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
                </div>
                <div className="field">
                  <label>{t("addCrop.soilType")}</label>
                  <select value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                    <option value="">{t("addCrop.selectSoilType")}</option>
                    <option>{t("addCrop.soilLoamy")}</option>
                    <option>{t("addCrop.soilSandy")}</option>
                    <option>{t("addCrop.soilClay")}</option>
                    <option>{t("addCrop.soilSilty")}</option>
                    <option>{t("addCrop.soilPeat")}</option>
                    <option>{t("addCrop.soilChalky")}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t("addCrop.storageType")}</label>
                  <select value={storageType} onChange={(e) => setStorageType(e.target.value)}>
                    <option>{t("addCrop.storageAmbient")}</option>
                    <option>{t("addCrop.storageChilled")}</option>
                    <option>{t("addCrop.storageFrozen")}</option>
                  </select>
                </div>
              </div>

              <div className="grid-3">
                <div className="field">
                  <label>{t("addCrop.irrigation")}</label>
                  <select value={irrigation} onChange={(e) => setIrrigation(e.target.value)}>
                    <option>{t("addCrop.irrigationDrip")}</option>
                    <option>{t("addCrop.irrigationSprinkler")}</option>
                    <option>{t("addCrop.irrigationFlood")}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t("addCrop.fertilizerUsed")}</label>
                  <input type="text" placeholder={t("addCrop.fertilizerPlaceholder")} value={fertilizer} onChange={(e) => setFertilizer(e.target.value)} />
                </div>
                <div className="field checkbox-field">
                  <label>{t("addCrop.organic")}</label>
                  <input type="checkbox" checked={organic} onChange={(e) => setOrganic(e.target.checked)} />
                </div>
              </div>

              <div className="field">
                <label>{t("addCrop.description")}</label>
                <textarea rows="4" placeholder={t("addCrop.descriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Right section: Guidance + Photos */}
            <div className="side-card">
              <h3 className="card-title">{t("addCrop.cropGuidance", "Crop Guidance")}</h3>
              <textarea
                className="procedure-box"
                rows="8"
                value={procedure}
                onChange={(e) => {
                  setProcedure(e.target.value);
                  setProcedureEdited(true);
                }}
                placeholder={t("addCrop.procedurePlaceholder", "Enter crop procedure or guidance in your preferred language...")}
              />

              <div className="photos-section">
                <h4 className="photos-title">{t("addCrop.photosTitle", "Photos (up to 3)")}</h4>
                <input type="file" accept="image/*" multiple onChange={(e) => onSelectImages(e.target.files)} />
                {images.length > 0 && (
                  <div className="photo-previews">
                    {images.map((src, i) => (
                      <img key={i} src={src} alt={`crop-${i}`} />
                    ))}
                  </div>
                )}
              </div>

              <div className="location-card">
                <div className="loc-row">
                  <span className="loc-label">📍 {t("addCrop.location", "Location")}</span>
                  <span className="loc-value">{farmerLocation || t("notSet", "Not set")}</span>
                </div>
                <div className="loc-row">
                  <span className="loc-label">{t("addCrop.state", "State")}</span>
                  <span className="loc-value">{farmerState || t("notSet", "Not set")}</span>
                </div>
                <div className="loc-row">
                  <span className="loc-label">{t("addCrop.pincode", "Pincode")}</span>
                  <span className="loc-value">{farmerPincode || t("notSet", "Not set")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="summary-strip">
            <div className="summary-pill">
              <span className="pill-label">{t("addCrop.qty", "Qty")}</span>
              <span className="pill-value">{quantity || 0} {unit}</span>
            </div>
            <div className="summary-pill">
              <span className="pill-label">{t("addCrop.pricePerKgShort", "Price/kg")}</span>
              <span className="pill-value">₹{pricePerKg || 0}</span>
            </div>
            <div className="summary-pill">
              <span className="pill-label">{t("addCrop.minOrderShort", "Min Order")}</span>
              <span className="pill-value">{minOrder} kg</span>
            </div>
            <div className="summary-total">
              <span className="total-label">{t("addCrop.estimatedValue", "Estimated Value")}</span>
              <span className="total-value">₹{(Number(quantity||0)*Number(pricePerKg||0)).toLocaleString()}</span>
            </div>
            <button type="submit" className="save-btn">➕ {t("addCrop.addCropBtn", "Add Crop")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}