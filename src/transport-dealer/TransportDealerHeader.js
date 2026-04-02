import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SessionManager from '../utils/SessionManager';
import './styles/TransportDealerHeader.css';

const TransportDealerHeader = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Restore session for info display
    const session = SessionManager.getSession();
    if (session) {
      setUser(session.user);
    }
    
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t("Good Morning") || "Good Morning";
    if (hour < 17) return t("Good Afternoon") || "Good Afternoon";
    return t("Good Evening") || "Good Evening";
  };

  return (
    <header className="dashboard-header">
      <div className="greeting-section">
        <h1>{getGreeting()} 🚚</h1>
        <p className="dealer-name">{user?.name || t("Transport Dealer")}</p>
        <p className="time-display">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <div className="header-actions">
        <LanguageSwitcher />
        <button 
          className="account-icon-btn" 
          onClick={() => navigate("/transport-dealer/account")} 
          title={t("Account Settings")}
        >
          👤
        </button>
      </div>
    </header>
  );
};

export default TransportDealerHeader;
