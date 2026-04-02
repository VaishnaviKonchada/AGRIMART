import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/CropChatbot.css";
import SessionManager from "../utils/SessionManager";
import { API_BASE_URL, apiPost } from "../utils/api";

export default function CropChatbot() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [chat, setChat] = useState([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const fileRef = useRef(null);

  const currentLang = i18n.language || "en";
  const targetLangName = currentLang === "te" ? "Telugu" : currentLang === "hi" ? "Hindi" : "English";

  useEffect(() => {
    if (chat.length === 0) {
      setChat([
        {
          sender: "bot",
          text: t("chatbot.greeting", "Hi! I'm your Crop Health Assistant. Upload a leaf photo to analyze, or ask me anything about irrigation, fertilizers, or pest control."),
          ts: Date.now(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLang]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setAnalyzed(false);
    setChat((prev) => [
      ...prev,
      {
        sender: "bot",
        text: `📷 ${t("chatbot.imageReceived", "Image received. Ready to analyze.")}`,
        ts: Date.now(),
      },
    ]);
  };

  const analyzeImage = async () => {
    if (!image) return;
    setChat((prev) => [...prev, { sender: "farmer", text: t("chatbot.analyzeCropImage", "Analyze my crop image"), ts: Date.now() }]);
    setTyping(true);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const session = SessionManager.getSession();
      const token = session?.token;

      const response = await fetch(`${API_BASE_URL}/disease/predict`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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

      // Build report with localized labels (Fallback if translation fails)
      const dLabel = t("chatbot.diagnosis", "Diagnosis");
      const cLabel = t("chatbot.confidence", "Confidence");
      const sLabel = t("chatbot.severity", "Severity");
      const tLabel = t("chatbot.topPredictions", "Top predictions");
      const rLabel = t("chatbot.recommendations", "Recommendations");
      const cif = t("chatbot.checkInField", "Check in field");

      let rawMessage = `${dLabel}: ${data.diagnosis}\n${cLabel}: ${confidencePct}%\n${sLabel}: ${data?.advice?.severity || cif}\n\n${tLabel}:\n${topLines}\n\n${rLabel}:\n${advice.map((line) => `- ${line}`).join("\n")}`;

      // Translate the content if not English
      if (currentLang !== "en") {
        try {
          // Send pure English text to AI so it knows what to translate
          const englishMessage = `Diagnosis: ${data.diagnosis}\nConfidence: ${confidencePct}%\nSeverity: ${data?.advice?.severity || "Check in field"}\n\nTop predictions:\n${topLines}\n\nRecommendations:\n${advice.map((line) => `- ${line}`).join("\n")}`;
          
          const transRes = await apiPost("translate", {
            text: englishMessage,
            targetLang: targetLangName,
            mode: "prediction" // Use the specialized agricultural translation mode
          });
          if (transRes?.translatedText) {
            rawMessage = transRes.translatedText;
          }
        } catch (err) {
          console.error("Translation failed", err);
        }
      }

      setTyping(false);
      setChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: rawMessage,
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
          text: `${t("chatbot.couldNotAnalyze")} ${error.message}`,
          ts: Date.now(),
        },
      ]);
    }
  };

  const improveYield = () => {
    setChat((prev) => [...prev, { sender: "farmer", text: t("chatbot.improveYieldQ"), ts: Date.now() }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: t("chatbot.yieldTips"),
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

    try {
      const response = await apiPost("translate", {
        text: msg,
        targetLang: targetLangName,
        mode: "chat"
      });

      setTyping(false);
      setChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: response.reply || t("chatbot.keepLearning"),
          ts: Date.now(),
        },
      ]);
    } catch (error) {
      console.error("Chat AI error:", error);
      setTyping(false);
      setChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: t("chatbot.keepLearning"),
          ts: Date.now(),
        },
      ]);
    }
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
            <span>📷 {t("chatbot.uploadLeafPhoto")}</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
          </div>
          {image && (
            <div className="preview">
              <img src={URL.createObjectURL(image)} alt="preview" />
              {!analyzed ? (
                <button className="primary" onClick={analyzeImage}>{t("chatbot.analyzeImage")}</button>
              ) : (
                <button onClick={improveYield}>{t("chatbot.improveYield")}</button>
              )}
            </div>
          )}
          <div className="quick">
            <button onClick={() => { setInput(t("chatbot.quickIrrigationQ")); sendText(); }}>{t("chatbot.irrigationTips")}</button>
            <button onClick={() => { setInput(t("chatbot.quickFertilizerQ")); sendText(); }}>{t("chatbot.fertilizerSchedule")}</button>
            <button onClick={() => { setInput(t("chatbot.quickPestQ")); sendText(); }}>{t("chatbot.pestControl")}</button>
          </div>
        </div>

        {/* Composer */}
        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatbot.inputPlaceholder")}
            onKeyDown={(e) => e.key === 'Enter' && sendText()}
          />
          <button className="send" onClick={sendText}>{t("chatbot.send")}</button>
        </div>
      </div>
    </div>
  );
}
