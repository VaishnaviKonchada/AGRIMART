import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/api";
import "../styles/Auth.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const email = searchParams.get("email");
  const token = searchParams.get("token");

  // Check if link is valid
  useEffect(() => {
    if (!email || !token) {
      setError("Reset link is invalid or expired. Please request a new password reset.");
    }
  }, [email, token]);

  // Calculate password strength
  const calculateStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[!@#$%^&*]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPass(value);
    calculateStrength(value);
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "#e74c3c";
    if (passwordStrength <= 2) return "#f39c12";
    if (passwordStrength <= 3) return "#f1c40f";
    if (passwordStrength <= 4) return "#27ae60";
    return "#2ecc71";
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 2) return "Fair";
    if (passwordStrength <= 3) return "Good";
    if (passwordStrength <= 4) return "Strong";
    return "Very Strong";
  };

  const handleReset = async () => {
    setError("");

    // Validation
    if (!newPass || !confirm) {
      setError("Please fill in all fields");
      return;
    }

    if (newPass.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPass !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (!email || !token) {
      setError("Reset link is invalid or expired. Please request a new password reset.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: newPass }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Password reset failed. Please try again.");
        return;
      }

      setSuccess(true);
      setNewPass("");
      setConfirm("");
    } catch (err) {
      console.error("Reset error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card success-card">
          <div className="success-icon">
            <span>✓</span>
          </div>
          <h2>Password Reset Successful!</h2>
          <p>Your password has been reset successfully.</p>
          <p className="text-muted">You can now login with your new password.</p>
          <button 
            className="btn-primary auth-btn w-100 mt-4"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Your Password</h2>
          <p className="text-muted">Enter your new password below</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">New Password</label>
          <div className="password-input-wrapper">
            <input
              className="form-input"
              type={showNewPass ? "text" : "password"}
              placeholder="Enter new password (min. 8 characters)"
              value={newPass}
              onChange={handlePasswordChange}
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowNewPass(!showNewPass)}
              title={showNewPass ? "Hide password" : "Show password"}
            >
              {showNewPass ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          {newPass && (
            <div className="strength-indicator">
              <div className="strength-bar">
                <div 
                  className="strength-fill" 
                  style={{
                    width: `${(passwordStrength / 5) * 100}%`,
                    backgroundColor: getStrengthColor()
                  }}
                ></div>
              </div>
              <span className="strength-label" style={{ color: getStrengthColor() }}>
                Strength: {getStrengthLabel()}
              </span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <div className="password-input-wrapper">
            <input
              className="form-input"
              type={showConfirmPass ? "text" : "password"}
              placeholder="Confirm your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              title={showConfirmPass ? "Hide password" : "Show password"}
            >
              {showConfirmPass ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          {newPass && confirm && newPass !== confirm && (
            <p className="text-error text-sm mt-2">Passwords do not match</p>
          )}

          {newPass && confirm && newPass === confirm && (
            <p className="text-success text-sm mt-2">✓ Passwords match</p>
          )}
        </div>

        <button 
          className="btn-primary auth-btn w-100 mt-4"
          onClick={handleReset} 
          disabled={loading || !newPass || !confirm}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </button>

        <div className="auth-footer">
          <p className="text-sm text-muted">
            Remember your password? <a href="/login">Go to Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
