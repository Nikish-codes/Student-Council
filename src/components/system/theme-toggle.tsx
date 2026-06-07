"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

/**
 * Floating bottom-right theme toggle. Reads the current theme from the html
 * `.light` class (which the pre-paint script in `<head>` set from
 * localStorage), flips it on click, and persists. The no-flash script means
 * there's no SSR/CSR mismatch for the *theme*, but we still defer first
 * render of the icon to client mount to avoid hydration noise around the
 * actual button label.
 */
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme | null>(null);

  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  function flip() {
    const next: Theme = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    if (next === "light") root.classList.add("light");
    else root.classList.remove("light");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / blocked storage — silent no-op */
    }
    setTheme(next);
  }

  // Don't render the label until we know the actual theme, to avoid a
  // misleading icon on first paint.
  const Icon = theme === "light" ? Moon : Sun;
  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={label}
      title={label}
      className="fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-line/15 bg-surface/80 text-ink shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur transition-colors hover:bg-surface"
    >
      {theme === null ? (
        <span className="block h-4 w-4 rounded-full bg-ink/20" aria-hidden />
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </button>
  );
}
