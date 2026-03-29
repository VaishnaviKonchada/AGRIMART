import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/api";
import "../styles/Auth.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");
  const [doorNo, setDoorNo] = useState("");
  const [location, setLocation] = useState("");
  const [pincode, setPincode] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/locations/districts`);
        const data = await response.json();
        if (data.success) {
          setDistricts(data.districts);
        }
      } catch (err) {
        console.error("Failed to load districts:", err);
      }
    };

    loadDistricts();
  }, []);

  useEffect(() => {
    const loadMandals = async () => {
      if (!district) {
        setMandals([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/locations/mandals/${encodeURIComponent(district)}`);
        const data = await response.json();
        if (data.success) {
          setMandals(data.mandals);
        } else {
          setMandals([]);
        }
      } catch (err) {
        console.error("Failed to load mandals:", err);
        setMandals([]);
      }
    };

    loadMandals();
  }, [district]);

  // Email validation
  const validateEmail = (email) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  // Password validation
  const validatePassword = (pass) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/.test(pass);

  const normalizeIndianPhone = (value) => {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return digits;
  };

  const isValidIndianPhone = (value) => /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));

  // Get live location
  const getLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCoordinates({ lat, lng });

        try {
          const response = await fetch(
            `${API_BASE_URL}/locations/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
          );
          const data = await response.json();

          if (data.success) {
            // Show the most concise location text available
            const locationDisplay = data.locationText || data.fullAddress || `Lat: ${lat}, Lng: ${lng}`;
            setLocation(locationDisplay);
            setPincode(data.pincode || "");
            setState(data.state || "");
            setCountry(data.country || "");
            
            // Log detailed address for debugging
            console.log("📍 Location Details:", data.detailedAddress);
            console.log("📍 Location Text:", data.locationText);
            console.log("📍 Full Address:", data.fullAddress);
          } else {
            setLocation(`Lat: ${lat}, Lng: ${lng}`);
          }
        } catch (err) {
          console.error("Reverse geocode failed:", err);
          setLocation(`Lat: ${lat}, Lng: ${lng}`);
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setLoadingLocation(false);
        alert("Location access denied");
      }
    );
  };

  const handleRegister = async () => {
    if (
      !name ||
      !role ||
      !email ||
      !phone ||
      !password ||
      !country ||
      !state ||
      !district ||
      !mandal ||
      !location ||
      !pincode
    ) {
      alert("Please fill all required fields");
      return;
    }

    if (!isValidIndianPhone(phone)) {
      alert("Please enter a valid Indian mobile number (+91 9XXXXXXXXX)");
      return;
    }

    if (!validateEmail(email)) {
      alert("Invalid email format");
      return;
    }

    if (!validatePassword(password)) {
      alert(
        "❌ Password is weak!\n\nPassword must contain at least:\n✓ 8 characters\n✓ 1 Uppercase letter (A-Z)\n✓ 1 Lowercase letter (a-z)\n✓ 1 Number (0-9)\n✓ 1 Special character (@#$%^&+=!)"
      );
      return;
    }

    // Map UI role to backend role
    const normalizedRole = role === "transport dealer" ? "dealer" : role;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: normalizedRole,
          phone: `+91${normalizeIndianPhone(phone)}`,
          country,
          state,
          district,
          mandal,
          doorNo,
          pincode,
          locationText: location,
          coordinates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const details = data?.error ? `\nDetails: ${data.error}` : "";
        alert((data.message || "Registration failed") + details);
        return;
      }

      // Persist backend user for later use
      localStorage.setItem("registeredUser", JSON.stringify(data.user));

      alert((data.message || "Registered Successfully ✅") + "\nPlease login with your credentials.");
      navigate("/login");
    } catch (err) {
      console.error("Register error:", err);
      alert("Registration failed. Please check your network connection.");
    }
  };

  return (
    <div className="auth-bg">
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0 0 0' }}>
        <LanguageSwitcher />
      </div>
      <div className="auth-box">
        <h3 className="auth-title">{t("register")}</h3>

        <select
          className="form-control auth-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">{t("selectRole")}</option>
          <option value="customer">{t("customer")}</option>
          <option value="farmer">{t("farmer")}</option>
          <option value="transport dealer">{t("transportDealer")}</option>
        </select>

        {role && (
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            padding: '8px', 
            borderRadius: '4px', 
            marginBottom: '10px',
            fontSize: '12px',
            color: '#888'
          }}>
            {role === 'customer' && t('registerCustomerInfo')}
            {role === 'farmer' && t('registerFarmerInfo')}
            {role === 'transport dealer' && t('registerDealerInfo')}
          </div>
        )}

        <input
          className="form-control auth-input"
          placeholder={t("fullName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div style={{ fontSize: '12px', color: '#999', marginTop: '15px', marginBottom: '5px' }}>
          📍 {t("locationInfo")}
        </div>

        <input
          className="form-control auth-input"
          placeholder={t("country")}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />

        <input
          className="form-control auth-input"
          placeholder={t("state")}
          value={state}
          onChange={(e) => setState(e.target.value)}
        />

        <select
          className="form-control auth-input"
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setMandal("");
          }}
        >
          <option value="">{t("selectDistrict")}</option>
          {districts.map((d) => (
            <option key={d.code} value={d.district}>
              {d.district} ({d.mandalCount} mandals)
            </option>
          ))}
        </select>

        <select
          className="form-control auth-input"
          value={mandal}
          onChange={(e) => setMandal(e.target.value)}
          disabled={!district}
        >
          <option value="">{t("selectMandal")}</option>
          {mandals.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        <input
          className="form-control auth-input"
          placeholder={t("doorNo")}
          value={doorNo}
          onChange={(e) => setDoorNo(e.target.value)}
        />

        <div style={{ display: "flex", gap: "5px" }}>
          <input
            className="form-control auth-input"
            placeholder={t("location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-light"
            style={{ marginLeft: 8, padding: '6px 10px' }}
            onClick={getLocation}
            disabled={loadingLocation}
            title={t("getLocation")}
          >
            📍
          </button>
        </div>

        <input
          className="form-control auth-input"
          placeholder={t("pincode")}
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
        />

        <input
          className="form-control auth-input"
          placeholder={t("mobile")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

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

        <button className="btn btn-success auth-btn" onClick={handleRegister}>
          {t("register")}
        </button>

        <div className="auth-link">
          {t("alreadyAccount")} <Link to="/login">{t("login")}</Link>
        </div>
      </div>
    </div>
  );
}
