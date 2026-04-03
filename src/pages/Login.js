import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SessionManager from "../utils/SessionManager";
import { API_BASE_URL } from "../utils/api";
import "../styles/Auth.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Initialize all useState hooks FIRST (before any conditionals)
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginAttempted, setIsLoginAttempted] = useState(false);
  const [intendedRole, setIntendedRole] = useState("");

  // Auto-redirect disabled to ensure users can always access login page
  useEffect(() => {
    if (isLoginAttempted) return;
  }, [isLoginAttempted]);

  useEffect(() => {
    const stored = sessionStorage.getItem("intendedRole") || "";
    if (stored) {
      setIntendedRole(stored);
      if (!role) {
        setRole(stored);
      }
    }
  }, [role]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    if (!role) {
      alert("Please select a role");
      return;
    }

    try {
      console.log("🔐 LOGIN ATTEMPT:", { email, selectedRole: role, timestamp: new Date().toISOString() });
      
      // IMPORTANT: Mark that login is being attempted to prevent useEffect from interfering
      setIsLoginAttempted(true);
      
      const normalizedRole = role === "transport dealer" ? "dealer" : role;

      console.log("📋 Request Details:", { email, selectedRole: role, normalizedRole });

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: normalizedRole }),
      });

      console.log("📡 Server Response Status:", response.status, response.statusText);

      const data = await response.json();

      console.log("📦 Server Response Data:", { 
        message: data.message, 
        hasToken: !!data.accessToken,
        hasUser: !!data.user,
        userRole: data.user?.role 
      });

      if (!response.ok) {
        console.error("❌ LOGIN FAILED:", data.message, data.error);
        setIsLoginAttempted(false); // Reset flag on error
        alert(`Login failed: ${data.message}${data.error ? ' (' + data.error + ')' : ''}`);
        return;
      }

      // Verify role matches what was selected
      if (role && data.user.role !== normalizedRole) {
        console.warn("⚠️ ROLE MISMATCH: Backend returned:", data.user.role, "expected:", normalizedRole);
        console.warn("   (This is OK for dealer/transport-dealer - they're equivalent)");
        alert(`Note: This account is registered as "${data.user.role}". Logging you in with that role.`);
      }

      // Use SessionManager to save session
      console.log("💾 Saving session to localStorage...");
      const sessionSaved = SessionManager.saveSession(data.user, data.accessToken);
      
      if (!sessionSaved) {
        console.error("❌ SessionManager.saveSession() returned false!");
        alert("Failed to save session. Please try again.");
        setIsLoginAttempted(false);
        return;
      }

      // VERIFY data was saved correctly
      const savedSession = SessionManager.getSession();
      
      if (!savedSession) {
        console.error("❌ Session was not saved properly! SessionManager.getSession() returned null");
        alert("Session verification failed. Please try again.");
        setIsLoginAttempted(false);
        return;
      }

      console.log("✅ LOGIN SUCCESSFUL & VERIFIED:", {
        user: data.user.name,
        role: data.user.role,
        sessionRestored: sessionSaved,
        savedInStorage: savedSession?.user?.name,
        roleInStorage: savedSession?.role,
        tokenLength: savedSession?.token?.length,
        verified: savedSession?.user?.role === data.user.role
      });

      // Determine navigation target based on the user role
      const effectiveRole = data.user.role;
      const targetPath = 
        effectiveRole === "customer" ? "/home" :
        effectiveRole === "farmer" ? "/farmer-dashboard" :
        effectiveRole === "dealer" || effectiveRole === "transport dealer" ? "/transport-dealer-dashboard" :
        effectiveRole === "admin" ? "/admin" :
        "/";

      console.log("🎯 NAVIGATION PLAN:", { 
        selectedRole: role, 
        normalizedRole: normalizedRole, 
        backendRole: data.user.role,
        effectiveRole: effectiveRole,
        targetPath: targetPath
      });

      alert("Login Successful 🎉");

      // Clear logout flag and intended role since login succeeded
      sessionStorage.removeItem("logoutInProgress");
      sessionStorage.removeItem("intendedRole");

      // Start session monitoring
      console.log("🔄 Starting session monitoring...");
      SessionManager.startSessionMonitoring();

      // Hard redirect to ensure the dashboard opens
      console.log(`⚡ Navigating to ${targetPath}...`);
      window.location.assign(targetPath);
      return;

    } catch (error) {
      console.error("❌ LOGIN ERROR:", error.message);
      console.error("❌ Full error:", error);
      setIsLoginAttempted(false); // Reset flag on error
      alert("Login failed: " + error.message + "\n\nPlease check:\n1. Backend server is running on port 8081\n2. Network connection is stable\n3. Email and password are correct");
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <div className="auth-box">
        <h3 className="auth-title">{t("login")}</h3>

        <select
          className="form-control auth-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">{t("selectRole")}</option>
          <option value="customer">{t("customer")}</option>
          <option value="farmer">{t("farmer")}</option>
          <option value="admin">{t("adminLabel")}</option>
          <option value="transport dealer">{t("transportDealer")}</option>
        </select>

        <input
          className="form-control auth-input"
          type="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="password-input-wrapper">
          <input
            className="form-control auth-input"
            type={showPassword ? "text" : "password"}
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>

        <button className="btn btn-success auth-btn" onClick={handleLogin}>
          {t("login")}
        </button>

        <div className="auth-link">
          {t("noAccount")} <Link to="/register">{t("register")}</Link>
        </div>
        <div className="auth-link">
          <Link to="/forgot">{t("forgotPassword")}</Link>
        </div>
      </div>
    </div>
  );
}
