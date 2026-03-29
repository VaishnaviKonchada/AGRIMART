
import React, { useState } from "react";
import { API_BASE_URL } from "../utils/api";
import "../styles/Auth.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";


export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);


  const handleSend = async () => {
    if (!email) {
      alert(t("pleaseEnterEmail") || "Please enter email");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await response.json() : { message: await response.text() };

      if (!response.ok) {
        alert(data.message || t("failedToSendResetLink") || `Failed to send reset link (${response.status})`);
        return;
      }

      alert(data.message || t("resetLinkSent") || "If the email exists, a reset link was sent.");
    } catch (err) {
      console.error("Forgot password error:", err);
      alert(t("failedToSendResetLink") || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0 0 0' }}>
        <LanguageSwitcher />
      </div>
      <div className="auth-box">
        <h3 className="auth-title">{t("forgotPassword")}</h3>

        <input
          className="form-control auth-input"
          placeholder={t("enterEmail") || "Enter your email"}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="btn btn-primary auth-btn" onClick={handleSend}>
          {loading ? t("sending") || "Sending..." : t("sendResetLink") || "Send Reset Link"}
        </button>
      </div>
    </div>
  );
}
