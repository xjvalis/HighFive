import { useState } from "react";
import { LanguageContext, LANGUAGES } from "./language";

export default function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem("hf_lang");
    if (stored) return stored;
    // Default to Czech for new visitors
    localStorage.setItem("hf_lang", "cs");
    return "cs";
  });

  const setLang = (code) => {
    localStorage.setItem("hf_lang", code);
    setLangState(code);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}