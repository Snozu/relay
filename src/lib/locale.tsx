"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { STRINGS, type Locale, type Strings } from "@/lib/i18n";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Strings;
}>({ locale: "en", setLocale: () => {}, t: STRINGS.en });

const STORAGE_KEY = "relay.locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Starts English on the server and on first paint so the markup matches;
  // the stored preference is applied after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: STRINGS[locale] as Strings }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
