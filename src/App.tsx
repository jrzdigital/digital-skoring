/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { MatchSimHub } from "./components/MatchSimHub";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const [themeMode, setThemeMode] = React.useState<"LED_ARENA" | "LIGHT_CONTRAST">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jrz_theme_mode");
      if (saved === "LIGHT_CONTRAST") return "LIGHT_CONTRAST";
    }
    return "LED_ARENA";
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem("jrz_theme_mode");
      setThemeMode(saved === "LIGHT_CONTRAST" ? "LIGHT_CONTRAST" : "LED_ARENA");
    };
    window.addEventListener("jrz_theme_changed", handleThemeChange);
    return () => window.removeEventListener("jrz_theme_changed", handleThemeChange);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (themeMode === "LIGHT_CONTRAST") {
        document.documentElement.classList.remove("dark", "theme-dark");
        document.documentElement.classList.add("light", "theme-light");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.style.backgroundColor = "#ffffff";
        document.body.style.color = "#0f172a";
      } else {
        document.documentElement.classList.remove("light", "theme-light");
        document.documentElement.classList.add("dark", "theme-dark");
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.style.backgroundColor = "#070d1e";
        document.body.style.color = "#f8fafc";
      }
    }
  }, [themeMode]);

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200 ${
      themeMode === "LIGHT_CONTRAST"
        ? "bg-white text-slate-900 theme-light"
        : "bg-[#070d1e] text-slate-100 theme-dark"
    }`}>
      <main className="flex-grow flex flex-col w-full">
        <ErrorBoundary>
          <MatchSimHub />
        </ErrorBoundary>
      </main>
    </div>
  );
}
