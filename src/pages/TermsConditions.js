import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "../styles/PolicyPage.css";

export default function TermsConditions() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header-actions">
          <button className="policy-back-btn" onClick={() => navigate("/payment")}>
            ← {t("common.back", "Back")}
          </button>
          <LanguageSwitcher className="policy-lang-dropdown" />
        </div>

        <h1 className="policy-title">{t("termsConditions.title")}</h1>
        <p className="policy-updated">{t("termsConditions.updated")}</p>

        <p className="policy-intro">
          {t("termsConditions.intro")}
        </p>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.userRoles.title")}</h2>
          <p>{t("termsConditions.sections.userRoles.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.accountResponsibility.title")}</h2>
          <p>{t("termsConditions.sections.accountResponsibility.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.productListings.title")}</h2>
          <p>{t("termsConditions.sections.productListings.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.ordersPayments.title")}</h2>
          <p>{t("termsConditions.sections.ordersPayments.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.deliveryServices.title")}</h2>
          <p>{t("termsConditions.sections.deliveryServices.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.platformFee.title")}</h2>
          <p>{t("termsConditions.sections.platformFee.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.priceNegotiation.title")}</h2>
          <p>{t("termsConditions.sections.priceNegotiation.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.prohibitedActivities.title")}</h2>
          <p>{t("termsConditions.sections.prohibitedActivities.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.disputeResolution.title")}</h2>
          <p>{t("termsConditions.sections.disputeResolution.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.limitationLiability.title")}</h2>
          <p>{t("termsConditions.sections.limitationLiability.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("termsConditions.sections.policyUpdates.title")}</h2>
          <p>{t("termsConditions.sections.policyUpdates.content")}</p>
        </section>

        <div className="policy-footer">
          <p>{t("termsConditions.footer")}</p>
        </div>
      </div>
    </div>
  );
}

