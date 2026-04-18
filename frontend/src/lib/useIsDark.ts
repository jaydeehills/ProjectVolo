"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the <html> element has the "dark" class.
 * Re-renders automatically when the class changes (theme toggle or OS switch).
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;

    // Read initial value
    setIsDark(html.classList.contains("dark"));

    // Watch for future changes
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains("dark"));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
