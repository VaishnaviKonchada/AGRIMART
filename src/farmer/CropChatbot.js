
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/CropChatbot.css";
import SessionManager from "../utils/SessionManager";
import { API_BASE_URL } from "../utils/api";

// Backend translation proxy endpoint
const TRANSLATE_PROXY_URL = "/api/translate";

// English source constants for all static bot messages
const EN_BOT_MESSAGES = {
  greeting: "Hi! Upload a leaf photo or ask a crop question.",
  analyzingImage: "Analyzing image...",
  diagnosis: "Diagnosis",
  confidence: "Confidence",
  severity: "Severity",
  checkInField: "Check in field",
  topPredictions: "Top predictions:",
  recommendations: "Recommendations:",
  couldNotAnalyze: "Could not analyze this image right now.",
  improveYieldQ: "How can I improve yield?",
  yieldTips: "🌱 Yield tips:\n• Follow 50:25:25 NPK split doses\n• Mulch to retain soil moisture\n• Adopt drip/alternate row irrigation\n• Scout for pests weekly and use traps",
  keepLearning: "I'll keep learning with you. For accurate diagnosis, clear leaf images and growth stage help a lot. Would you like best practices for your crop?",
  uploadLeafPhoto: "Upload leaf photo",
  analyzeImage: "Analyze Image",
  improveYield: "Improve Yield",
  irrigationTips: "Irrigation tips",
  fertilizerSchedule: "Fertilizer schedule",
  pestControl: "Pest control",
  quickIrrigationQ: "Best irrigation for tomatoes?",
  quickFertilizerQ: "Fertilizer schedule for paddy?",
  quickPestQ: "How to prevent pests?",
  inputPlaceholder: "Type a message or choose a quick tip...",
  send: "Send"
};

// Helper to translate text using backend proxy
async function libreTranslate(text, targetLang) {
  if (!text || targetLang === "en") return text;
  let langCode = targetLang;
  if (langCode === "hi") langCode = "hi";
  if (langCode === "te") langCode = "te";
  try {
    const res = await fetch(TRANSLATE_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang: langCode })
    });
    const data = await res.json();
    return data.translatedText || text;
  } catch (e) {
    return text;
  }
}

function CropChatbot() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [chat, setChat] = useState([]);
  const [translated, setTranslated] = useState({});

  // Translate all static bot messages on language change
  useEffect(() => {
    let isMounted = true;
    async function translateAll() {
      const lang = i18n.language || "en";
      const result = {};
      for (const key of Object.keys(EN_BOT_MESSAGES)) {
        if (lang === "en") {
          result[key] = EN_BOT_MESSAGES[key];
        } else {
          result[key] = await libreTranslate(EN_BOT_MESSAGES[key], lang);
        }
      }
      if (isMounted) setTranslated(result);
    }
    translateAll();
    return () => { isMounted = false; };
  }, [i18n.language]);

  // Set initial greeting when translations are ready
  useEffect(() => {
    if (translated.greeting) {
      setChat([
        {
          sender: "bot",
          text: translated.greeting,
          ts: Date.now(),
        },
      ]);
    }
  }, [translated.greeting]);

  // Update all bot messages in chat when language changes
  useEffect(() => {
    setChat((prev) =>
      prev.map((msg) => {
        if (msg.sender === "bot") {
          // Try to map known bot messages to translation keys (compare to current language only)
          switch (true) {
            case msg.text === t("chatbot.greeting"):
              return { ...msg, text: t("chatbot.greeting") };
            case msg.text === t("chatbot.analyzingImage"):
              return { ...msg, text: t("chatbot.analyzingImage") };
            case msg.text.startsWith(t("chatbot.diagnosis")):
              // Diagnosis block, cannot retranslate dynamic content
              return msg;
            case msg.text.startsWith(t("chatbot.couldNotAnalyze")):
              return { ...msg, text: t("chatbot.couldNotAnalyze") };
            case msg.text === t("chatbot.yieldTips"):
              return { ...msg, text: t("chatbot.yieldTips") };
            case msg.text === t("chatbot.keepLearning"):
              return { ...msg, text: t("chatbot.keepLearning") };
            default:
              return msg;
          }
        }
        return msg;
      })
    );
  }, [i18n.language, t]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
    const [typing, setTyping] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const fileRef = useRef();

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        setImage(file);
        setAnalyzed(false);
        setChat((prev) => [
          ...prev,
          {
            sender: "farmer",
            text: "[Uploaded a leaf photo]",
            ts: Date.now(),
          },
        ]);
      }
    };

    const analyzeImage = async () => {
      setTyping(true);
      setChat((prev) => [
        ...prev,
        { sender: "bot", text: translated.analyzingImage || EN_BOT_MESSAGES.analyzingImage, ts: Date.now() },
      ]);
      try {
        const formData = new FormData();
        formData.append("image", image);
        const response = await fetch("/api/crop-diagnosis", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || err.details || "Prediction failed");
        }

        const data = await response.json();
        const confidencePct = Number((data.confidence || 0) * 100).toFixed(2);
        const advice = data?.advice?.solution || [];
        const top = data?.predictions || [];

        const topLines = top
          .slice(0, 3)
          .map((p, idx) => `${idx + 1}. ${p.label} (${Number((p.confidence || 0) * 100).toFixed(2)}%)`)
          .join("\n");

        setTyping(false);
        setChat((prev) => [
          ...prev,
          {
            sender: "bot",
            text:
              `${translated.diagnosis || EN_BOT_MESSAGES.diagnosis}: ${data.diagnosis}\n${translated.confidence || EN_BOT_MESSAGES.confidence}: ${confidencePct}%\n${translated.severity || EN_BOT_MESSAGES.severity}: ${data?.advice?.severity || translated.checkInField || EN_BOT_MESSAGES.checkInField}\n\n${translated.topPredictions || EN_BOT_MESSAGES.topPredictions}\n${topLines}\n\n${translated.recommendations || EN_BOT_MESSAGES.recommendations}\n${advice.map((line) => `- ${line}`).join("\n")}`,
            ts: Date.now(),
          },
        ]);
        setAnalyzed(true);

      } catch (error) {
        setTyping(false);
        setChat((prev) => [                                                                                   
          ...prev,
          {
            sender: "bot",
            text: `${translated.couldNotAnalyze || EN_BOT_MESSAGES.couldNotAnalyze} ${error.message}`,
            ts: Date.now(),
          },
        ]);
      }
    };

    const improveYield = () => {
      setChat((prev) => [...prev, { sender: "farmer", text: translated.improveYieldQ || EN_BOT_MESSAGES.improveYieldQ, ts: Date.now() }]);
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setChat((prev) => [
          ...prev,
          {
            sender: "bot",
            text: translated.yieldTips || EN_BOT_MESSAGES.yieldTips,
            ts: Date.now(),
          },
        ]);
      }, 700);
    };

    const sendText = async () => {
      const msg = input.trim();
      if (!msg) return;
      setChat((prev) => [...prev, { sender: "farmer", text: msg, ts: Date.now() }]);
      setInput("");
      setTyping(true);
      // Simulate bot response (replace with real logic if needed)
      setTimeout(async () => {
        let botText = translated.keepLearning || EN_BOT_MESSAGES.keepLearning;
        setTyping(false);
        setChat((prev) => [
          ...prev,
          {
            sender: "bot",
            text: botText,
            ts: Date.now(),
          },
        ]);
      }, 650);
    };

  return (
    <div className="crop-chatbot">
      <div className="chat-container">
        <div className="chat-header">
          <div>
            <h2>🤖 {t("chatbot.title")}</h2>
            <p className="subtitle">{t("chatbot.subtitle")}</p>
          </div>
          <button className="dashboard-btn" onClick={() => navigate("/farmer-dashboard")}> 
            <span className="dash-icon">📊</span>
            <span className="dash-label">{t("chatbot.dashboard")}</span>
          </button>
        </div>

        <div className="chat-body">
          {chat.map((msg, i) => (
            <div key={i} className={`bubble ${msg.sender}`}>
              <div className="text">{msg.text}</div>
              <div className="time">{new Date(msg.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
          {typing && <div className="bubble bot typing"><span className="dot" /><span className="dot" /><span className="dot" /></div>}
        </div>

        {/* Upload & Quick actions */}
        <div className="tools">
          <div className="uploader" onClick={() => fileRef.current?.click()}>
            <span>📷 {translated.uploadLeafPhoto || EN_BOT_MESSAGES.uploadLeafPhoto}</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
          </div>
          {image && (
            <div className="preview">
              <img src={URL.createObjectURL(image)} alt="preview" />
              {!analyzed ? (
                <button className="primary" onClick={analyzeImage}>{translated.analyzeImage || EN_BOT_MESSAGES.analyzeImage}</button>
              ) : (
                <button onClick={improveYield}>{translated.improveYield || EN_BOT_MESSAGES.improveYield}</button>
              )}
            </div>
          )}
          <div className="quick">
            <button onClick={() => setInput(translated.quickIrrigationQ || EN_BOT_MESSAGES.quickIrrigationQ)}>{translated.irrigationTips || EN_BOT_MESSAGES.irrigationTips}</button>
            <button onClick={() => setInput(translated.quickFertilizerQ || EN_BOT_MESSAGES.quickFertilizerQ)}>{translated.fertilizerSchedule || EN_BOT_MESSAGES.fertilizerSchedule}</button>
            <button onClick={() => setInput(translated.quickPestQ || EN_BOT_MESSAGES.quickPestQ)}>{translated.pestControl || EN_BOT_MESSAGES.pestControl}</button>
          </div>
        </div>

        {/* Composer */}
        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={translated.inputPlaceholder || EN_BOT_MESSAGES.inputPlaceholder}
            onKeyDown={(e) => e.key === 'Enter' && sendText()}
          />
          <button className="send" onClick={sendText}>{translated.send || EN_BOT_MESSAGES.send}</button>
        </div>
      </div>
    </div>
  );
}

export default CropChatbot;
