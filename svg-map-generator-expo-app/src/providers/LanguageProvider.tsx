import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

import type { Locale, Messages } from "../lib/i18n";
import { getMessages, supportedLocales } from "../lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
};

const STORAGE_KEY = "mvf-language";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && supportedLocales.includes(value as Locale);
}

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isLocale(stored)) {
          setLocaleState(stored);
          return;
        }
        return AsyncStorage.setItem(STORAGE_KEY, "en").catch(() => {});
      })
      .catch(() => {
        // Ignore storage errors; fall back to default locale.
      });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState((current) => {
      if (current === next) {
        return current;
      }
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages,
    }),
    [locale, messages, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside a LanguageProvider");
  }
  return context;
}
