"use client";

import { MapInterface } from "@/components/map-interface";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";

export default function Home() {
  const { messages } = useLanguage();
  const { page } = messages;

  return (
    <div className="flex min-h-screen flex-col ">
      <header className="w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-6 py-6 sm:px-10">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12 sm:px-10">
        <div className="flex w-full max-w-6xl flex-col items-center gap-10">
          <div className="text-center">
            <p className="text-2xl uppercase tracking-[0.4em] text-muted-foreground">
              {page.strapline}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold text-foreground sm:text-5xl">
              {page.headline}
            </h1>
            <p className="mt-4 mx-auto max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              {page.description}
            </p>
          </div>
          <MapInterface />
        </div>
      </main>
    </div>
  );
}
