import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./Welcome.css";
import welcomeBg from "../assets/welcome-bg.png"; 

export default function Welcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <div className="welcome-bg-wrapper">
        <img src={welcomeBg} alt="Welcome to AgriMart" className="welcome-bg-image" />
        <div className="welcome-gradient-overlay"></div>
      </div>

      <div className="welcome-content">
        <div className="welcome-lang-switcher">
          <LanguageSwitcher />
        </div>
        
        <div className="welcome-card">
          <div className="welcome-logo">🌾</div>
          <h1 className="welcome-title">AgriMart</h1>
          <p className="welcome-tagline">
            {t('marketplaceTagline', 'Your trusted marketplace for crops, vegetables & fruits')}
          </p>
          
          <div className="welcome-actions">
            <button
              className="welcome-btn-primary"
              onClick={() => navigate("/login")}
            >
              {t('login', 'Login')}
            </button>
            
            <button
              className="welcome-btn-secondary"
              onClick={() => navigate("/register")}
            >
              {t('createAccount', 'Create Account')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
