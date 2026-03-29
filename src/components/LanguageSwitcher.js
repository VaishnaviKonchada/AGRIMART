import React from "react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "te", label: "తెలుగు" }
];

export default function LanguageSwitcher({ className }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value);
    localStorage.setItem("appLanguage", e.target.value);
  };

  return (
    <select value={currentLang} onChange={handleChange} className={className}>
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
