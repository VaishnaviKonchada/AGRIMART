import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PolicyPage.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="policy-page">
      <div className="policy-container">
        <button className="policy-back-btn" onClick={() => navigate("/payment")}>
          ← Back
        </button>

        <h1 className="policy-title">AgriMart Privacy Policy</h1>
        <p className="policy-updated">Last updated: March 2026</p>

        <p className="policy-intro">
          AgriMart values your privacy and is committed to protecting your
          personal information. This Privacy Policy explains what data we
          collect, how we use it, and how we keep it secure.
        </p>

        <section className="policy-section">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly, including:
          </p>
          <ul>
            <li>Full name, email address, and phone number during registration</li>
            <li>Location data (mandal, district, state) for service area matching</li>
            <li>Crop details submitted by farmers</li>
            <li>Order details and payment summaries</li>
            <li>Chat messages between customers and transport dealers</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>2. How We Use Your Information</h2>
          <p>
            Your information is used to:
          </p>
          <ul>
            <li>Create and manage your account on AgriMart</li>
            <li>Process orders and coordinate deliveries</li>
            <li>Match customers with nearby transport dealers</li>
            <li>Calculate and display real-time mandi prices for crops</li>
            <li>Send order confirmations and delivery status updates</li>
            <li>Improve platform features and user experience</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>3. Data Security</h2>
          <p>
            We take security seriously. AgriMart uses secure authentication
            methods including token-based sessions and encrypted password
            storage. All sensitive data is transmitted over HTTPS. We regularly
            review our security practices to protect against unauthorized access,
            alteration, or disclosure.
          </p>
        </section>

        <section className="policy-section">
          <h2>4. Data Sharing</h2>
          <p>
            AgriMart does not sell, trade, or rent your personal information to
            third parties. Limited data sharing occurs only in the following
            situations:
          </p>
          <ul>
            <li>
              <strong>Transport dealers</strong> receive customer delivery
              address and contact details only for the purpose of completing the
              assigned delivery.
            </li>
            <li>
              <strong>Farmers</strong> receive order details to fulfill crop
              requests.
            </li>
            <li>
              Data may be disclosed if required by law or governmental
              authority.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>5. Cookies and Session Data</h2>
          <p>
            AgriMart uses browser localStorage to maintain your login session
            and store temporary order data (such as selected dealer, final
            negotiated price, and cart items). This data is local to your
            device and is cleared when you log out. We do not use third-party
            tracking cookies.
          </p>
        </section>

        <section className="policy-section">
          <h2>6. Location Data</h2>
          <p>
            AgriMart may request access to your device location to help match
            you with transport dealers operating in your area. Location data is
            used only for service area matching and is not stored permanently
            beyond what is needed for the current session.
          </p>
        </section>

        <section className="policy-section">
          <h2>7. User Rights</h2>
          <p>
            You have the right to:
          </p>
          <ul>
            <li>Access and update your profile information through your Account page</li>
            <li>Request deletion of your account by contacting support</li>
            <li>Request a copy of the data associated with your account</li>
          </ul>
          <p>
            To exercise any of these rights, please use the Support section
            within the app.
          </p>
        </section>

        <section className="policy-section">
          <h2>8. Children's Privacy</h2>
          <p>
            AgriMart is intended for users who are 18 years of age or older.
            We do not knowingly collect personal information from minors. If
            we become aware that a minor has provided personal data, we will
            delete it promptly.
          </p>
        </section>

        <section className="policy-section">
          <h2>9. Retention of Data</h2>
          <p>
            We retain your account and order data for as long as your account
            is active or as needed to provide services. If you request account
            deletion, we will remove your personal data within a reasonable
            period, except where retention is required by law.
          </p>
        </section>

        <section className="policy-section">
          <h2>10. Policy Changes</h2>
          <p>
            AgriMart may update this privacy policy periodically to reflect
            changes in law, technology, or our services. Users will be notified
            of significant changes through the platform. Your continued use of
            AgriMart after updates are posted constitutes acceptance of the
            revised policy.
          </p>
        </section>

        <div className="policy-footer">
          <p>
            If you have any questions or concerns about this Privacy Policy,
            please contact us through the Support section in the app.
          </p>
        </div>
      </div>
    </div>
  );
}
