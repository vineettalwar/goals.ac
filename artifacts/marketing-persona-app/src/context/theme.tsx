"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ThemeContext } from "./theme-context";
import { isProductAppPath } from "@/lib/theme-path";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (!isProductAppPath(path)) {
      document.documentElement.classList.remove("dark");
      setTheme("light");
      setMounted(true);
      return;
    }
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      } else {
        setTheme("dark");
      }
    } catch {
      setTheme("dark");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isProductAppPath(window.location.pathname)) {
      document.documentElement.classList.remove("dark");
      return;
    }
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
