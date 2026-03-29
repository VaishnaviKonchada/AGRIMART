import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PolicyPage.css";

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div className="policy-page">
      <div className="policy-container">
        <button className="policy-back-btn" onClick={() => navigate("/payment")}>
          ← Back
        </button>

        <h1 className="policy-title">AgriMart Terms &amp; Conditions</h1>
        <p className="policy-updated">Last updated: March 2026</p>

        <p className="policy-intro">
          Welcome to AgriMart. By accessing or using our platform, you agree to
          comply with and be bound by these Terms &amp; Conditions. Please read
          them carefully before placing any order or using any service.
        </p>

        <section className="policy-section">
          <h2>1. User Roles</h2>
          <p>
            AgriMart provides services for farmers, customers, transport
            dealers, and administrators. Each user must use the platform
            strictly according to their assigned role. Misuse of roles or
            impersonation of another user type is strictly prohibited.
          </p>
        </section>

        <section className="policy-section">
          <h2>2. Account Responsibility</h2>
          <p>
            Users must provide accurate, complete, and up-to-date information
            during registration. You are solely responsible for maintaining the
            confidentiality of your login credentials. AgriMart will not be
            liable for any loss arising from unauthorized access due to failure
            to protect your credentials.
          </p>
        </section>

        <section className="policy-section">
          <h2>3. Product Listings</h2>
          <p>
            Farmers must provide accurate crop details including crop name,
            quantity, quality grade, and harvest information. Crop prices are
            automatically updated using government mandi price APIs to maintain
            transparency and fair market value. AgriMart reserves the right to
            remove listings that contain false or misleading information.
          </p>
        </section>

        <section className="policy-section">
          <h2>4. Orders and Payments</h2>
          <p>
            Customers must complete payment before order confirmation. AgriMart
            processes all transactions securely. Once an order is placed and
            payment is successful, cancellation is subject to the cancellation
            policy. All prices shown are inclusive of applicable taxes unless
            stated otherwise.
          </p>
        </section>

        <section className="policy-section">
          <h2>5. Delivery Services</h2>
          <p>
            Transport dealers registered on AgriMart are responsible for
            delivering crops safely from farmers to customers within the agreed
            timeframe and location. Delivery charges are negotiated directly
            between the customer and the transport dealer through the in-app
            chat. AgriMart is not liable for delays caused by external factors
            such as weather, road conditions, or unforeseen circumstances.
          </p>
        </section>

        <section className="policy-section">
          <h2>6. Platform Fee</h2>
          <p>
            AgriMart charges a platform service fee of 2% of the total order
            value, capped at a maximum of ₹100 per order. This fee is used to
            maintain the platform, ensure data security, and support ongoing
            services. The fee is clearly shown in the price breakdown before
            payment is confirmed.
          </p>
        </section>

        <section className="policy-section">
          <h2>7. Price Negotiation</h2>
          <p>
            Transport pricing is negotiated between customers and dealers
            through the AgriMart chat feature. Once both parties confirm the
            negotiated price, the agreed amount is binding and reflected in the
            payment page. AgriMart does not intervene in the price negotiation
            process.
          </p>
        </section>

        <section className="policy-section">
          <h2>8. Prohibited Activities</h2>
          <p>
            Users must not post false or misleading information, attempt to
            manipulate prices, misuse the platform for illegal activities,
            harass other users, or attempt to bypass the platform's payment
            system. Violations may result in account suspension or permanent
            ban.
          </p>
        </section>

        <section className="policy-section">
          <h2>9. Dispute Resolution</h2>
          <p>
            In case of disputes between buyers, sellers, or transport dealers,
            users may raise a complaint through the AgriMart support section.
            AgriMart will investigate and respond within a reasonable timeframe.
            AgriMart's decision in such matters will be final.
          </p>
        </section>

        <section className="policy-section">
          <h2>10. Limitation of Liability</h2>
          <p>
            AgriMart's liability is limited to the transaction value of the
            specific order in dispute. AgriMart is not responsible for indirect,
            incidental, or consequential damages arising from the use or
            inability to use the platform.
          </p>
        </section>

        <section className="policy-section">
          <h2>11. Policy Updates</h2>
          <p>
            AgriMart reserves the right to update these terms at any time.
            Continued use of the platform after changes are published constitutes
            your acceptance of the updated terms. Significant changes will be
            communicated via the platform.
          </p>
        </section>

        <div className="policy-footer">
          <p>
            If you have any questions about these terms, please contact us
            through the Support section in the app.
          </p>
        </div>
      </div>
    </div>
  );
}
