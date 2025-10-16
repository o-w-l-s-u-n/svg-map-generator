"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";

const orderedLocales: Locale[] = ["en", "ru"];

export function LanguageToggle() {
  const { locale, setLocale, messages } = useLanguage();
  const nextLocale = orderedLocales[(orderedLocales.indexOf(locale) + 1) % orderedLocales.length];
  const nextLanguageName = messages.common.languageNames[nextLocale];
  const ariaLabel = messages.common.switchToLanguage.replace(
    "{language}",
    nextLanguageName
  );

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 px-4"
      onClick={() => setLocale(nextLocale)}
      aria-label={ariaLabel}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.3em]">
        {messages.common.languageShort[locale]}
      </span>
    </Button>
  );
}
