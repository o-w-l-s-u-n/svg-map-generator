"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const STORAGE_KEY = "mvf-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    } else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setTheme(mq.matches ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setTheme(event.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const icon =
    theme === "light" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <SunMedium className="h-4 w-4" />
    );

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-10 rounded-full !p-0"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      disabled={!mounted}
    >
      {icon}
      <span className="sr-only">Toggle color theme</span>
    </Button>
  );
}
