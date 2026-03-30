import React from "react";
import "./Welcome.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function Welcome() {
  const { t } = useTranslation();

  return (
    <div className="welcome-container">
      <div className="welcome-box">
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <LanguageSwitcher />
        </div>
        <h1 className="welcome-title">🌾 AgriMart</h1>
        <p className="welcome-subtitle">
          {t('Your trusted marketplace for crops, vegetables & fruits', 'Your trusted marketplace for crops, vegetables & fruits')}
        </p>

        <img
          src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=60"
          alt="agri"
          className="welcome-img"
        />

        <div className="welcome-buttons">
          <button
            className="welcome-btn login"
            type="button"
            onClick={() => {
              window.location.assign("/login");
            }}
          >
            {t('Login', 'Login')}
          </button>

          <button
            className="welcome-btn register"
            type="button"
            onClick={() => {
              window.location.assign("/register");
            }}
          >
            {t('Register', 'Register')}
          </button>
        </div>
      </div>
    </div>
  );
}
