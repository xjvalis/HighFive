import { createContext, useContext, useState } from "react";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
];

export const LanguageContext = createContext({ lang: "en", setLang: () => {} });

export function useLanguage() {
  return useContext(LanguageContext);
}