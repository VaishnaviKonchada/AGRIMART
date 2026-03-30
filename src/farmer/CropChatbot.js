import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/CropChatbot.css";

function CropChatbot() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [chat, setChat] = useState([]);

  // Set initial greeting
  useEffect(() => {
    setChat([
      {
        sender: "bot",
        text: t("chatbotPage.greeting"),
        ts: Date.now(),
      },
    ]);
  }, []);

  // Update bot messages when language changes
  useEffect(() => {
    setChat((prev) =>
      prev.map((msg) => {
        if (msg.sender === "bot") {
          // If it matches exactly one of our static strings, update it
          // Note: This only works for static messages, not dynamic results
          if (msg.text === t("chatbotPage.greeting", { lng: i18n.language === 'en' ? 'hi' : 'en' })) {
            return { ...msg, text: t("chatbotPage.greeting") };
          }
          // For simplicity, we mostly rely on new messages being in the right language
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
          text: `[${t("addCrop.uploadPhoto", "Uploaded a photo")}]`,
          ts: Date.now(),
        },
      ]);
    }
  };

  const analyzeImage = async () => {
    setTyping(true);
    setChat((prev) => [
      ...prev,
      { sender: "bot", text: t("addCrop.analyzingImage"), ts: Date.now() },
    ]);
    try {
      const formData = new FormData();
      formData.append("image", image);
      const response = await fetch("/api/crop-diagnosis", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Prediction failed");
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
            `${t("addCrop.diagnosis")}: ${data.diagnosis}\n${t("addCrop.confidence")}: ${confidencePct}%\n${t("addCrop.severity")}: ${data?.advice?.severity || t("addCrop.checkInField")}\n\n${t("addCrop.topPredictions")}\n${topLines}\n\n${t("addCrop.recommendations")}\n${advice.map((line) => `- ${line}`).join("\n")}`,
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
          text: `${t("chatbotPage.couldNotAnalyze")} ${error.message}`,
          ts: Date.now(),
        },
      ]);
    }
  };

  const improveYield = () => {
    setChat((prev) => [...prev, { sender: "farmer", text: t("addCrop.improveYieldQ"), ts: Date.now() }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: t("addCrop.yieldTips"),
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
    setTimeout(async () => {
      setTyping(false);
      setChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: t("addCrop.keepLearning"),
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

        <div className="tools">
          <div className="uploader" onClick={() => fileRef.current?.click()}>
            <span>📷 {t("addCrop.uploadLeafPhoto")}</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
          </div>
          {image && (
            <div className="preview">
              <img src={URL.createObjectURL(image)} alt="preview" />
              {!analyzed ? (
                <button className="primary" onClick={analyzeImage}>{t("addCrop.analyzeImage")}</button>
              ) : (
                <button onClick={improveYield}>{t("addCrop.improveYield")}</button>
              )}
            </div>
          )}
          <div className="quick">
            <button onClick={() => setInput(t("addCrop.quickIrrigationQ"))}>{t("addCrop.irrigationTips")}</button>
            <button onClick={() => setInput(t("addCrop.quickFertilizerQ"))}>{t("addCrop.fertilizerSchedule")}</button>
            <button onClick={() => setInput(t("addCrop.quickPestQ"))}>{t("addCrop.pestControl")}</button>
          </div>
        </div>

        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("addCrop.inputPlaceholder")}
            onKeyDown={(e) => e.key === 'Enter' && sendText()}
          />
          <button className="send" onClick={sendText}>{t("addCrop.send")}</button>
        </div>
      </div>
    </div>
  );
}

export default CropChatbot;
