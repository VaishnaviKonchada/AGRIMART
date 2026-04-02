import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import "../styles/Home.css"; // Reuse existing header styles

export default function CustomerHeader() {
  const { t } = useTranslation();
  
  return (
    <header className="home-header">
      <div className="section-container header-inner">
        <div className="logo-wrap">
          <span className="logo-icon">🌿</span>
          <span className="logo-text">Agri<span>Mart</span></span>
        </div>
        <div className="header-actions">
          <span className="tagline">{t('Fresh from Farmers, Daily', 'Fresh from Farmers, Daily')}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
