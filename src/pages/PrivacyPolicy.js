import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "../styles/PolicyPage.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header-actions">
          <button className="policy-back-btn" onClick={() => navigate("/payment")}>
            ← {t("common.back")}
          </button>
          <div className="policy-language-selector">
            <span>{t("language")}: </span>
            <LanguageSwitcher className="policy-lang-dropdown" />
          </div>
        </div>

        <h1 className="policy-title">{t("privacyPolicy.title")}</h1>
        <p className="policy-updated">{t("privacyPolicy.updated")}</p>

        <p className="policy-intro">
          {t("privacyPolicy.intro")}
        </p>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section1.title")}</h2>
          <p>{t("privacyPolicy.section1.intro")}</p>
          <ul>
            <li>{t("privacyPolicy.section1.item1")}</li>
            <li>{t("privacyPolicy.section1.item2")}</li>
            <li>{t("privacyPolicy.section1.item3")}</li>
            <li>{t("privacyPolicy.section1.item4")}</li>
            <li>{t("privacyPolicy.section1.item5")}</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section2.title")}</h2>
          <p>{t("privacyPolicy.section2.intro")}</p>
          <ul>
            <li>{t("privacyPolicy.section2.item1")}</li>
            <li>{t("privacyPolicy.section2.item2")}</li>
            <li>{t("privacyPolicy.section2.item3")}</li>
            <li>{t("privacyPolicy.section2.item4")}</li>
            <li>{t("privacyPolicy.section2.item5")}</li>
            <li>{t("privacyPolicy.section2.item6")}</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section3.title")}</h2>
          <p>{t("privacyPolicy.section3.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section4.title")}</h2>
          <p>{t("privacyPolicy.section4.intro")}</p>
          <ul>
            <li>{t("privacyPolicy.section4.item1")}</li>
            <li>{t("privacyPolicy.section4.item2")}</li>
            <li>{t("privacyPolicy.section4.item3")}</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section5.title")}</h2>
          <p>{t("privacyPolicy.section5.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section6.title")}</h2>
          <p>{t("privacyPolicy.section6.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section7.title")}</h2>
          <p>{t("privacyPolicy.section7.intro")}</p>
          <ul>
            <li>{t("privacyPolicy.section7.item1")}</li>
            <li>{t("privacyPolicy.section7.item2")}</li>
            <li>{t("privacyPolicy.section7.item3")}</li>
          </ul>
          <p>{t("privacyPolicy.section7.footer")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section8.title")}</h2>
          <p>{t("privacyPolicy.section8.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section9.title")}</h2>
          <p>{t("privacyPolicy.section9.content")}</p>
        </section>

        <section className="policy-section">
          <h2>{t("privacyPolicy.section10.title")}</h2>
          <p>{t("privacyPolicy.section10.content")}</p>
        </section>

        <div className="policy-footer">
          <p>{t("privacyPolicy.footer")}</p>
        </div>
      </div>
    </div>
  );
}
