"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LANG,
  LANGS,
  STORAGE_KEY,
  dirFor,
  translate,
} from "@/lib/i18n";
import { setFormatLang } from "@/lib/format";

const I18nContext = createContext({
  lang: DEFAULT_LANG,
  dir: dirFor(DEFAULT_LANG),
  t: (k) => k,
  setLang: () => {},
});

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(v)) return v;
  } catch {}
  return DEFAULT_LANG;
}

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // hydrate from localStorage on the client
  useEffect(() => {
    setLangState(readStored());
  }, []);

  // keep <html>, storage and the format helpers in sync
  useEffect(() => {
    setFormatLang(lang);
    try {
      document.documentElement.lang = lang;
      document.documentElement.dir = dirFor(lang);
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, [lang]);

  const setLang = useCallback((l) => {
    setLangState(LANGS.includes(l) ? l : DEFAULT_LANG);
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  return (
    <I18nContext.Provider value={{ lang, dir: dirFor(lang), t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// convenience: const t = useT()
export function useT() {
  return useContext(I18nContext).t;
}

export function LangToggle({ className = "" }) {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className={`btn border border-line text-muted hover:bg-panel2 px-2 py-1 text-xs ${className}`}
      title={t("lang.switch")}
    >
      {t("lang.switch")}
    </button>
  );
}
