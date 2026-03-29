import React from "react";
import "./Welcome.css";

export default function Welcome() {

  return (
    <div className="welcome-container">
      <div className="welcome-box">
        <h1 className="welcome-title">🌾 AgriMart</h1>
        <p className="welcome-subtitle">
          Your trusted marketplace for crops, vegetables & fruits
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
            Login
          </button>

          <button
            className="welcome-btn register"
            type="button"
            onClick={() => {
              window.location.assign("/register");
            }}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
