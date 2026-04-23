import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont",
               "SF Pro Text", "Helvetica Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        base: ["17px", { lineHeight: "1.6" }],
      },
      letterSpacing: {
        tight:   "-0.025em",
        tighter: "-0.04em",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary:    "var(--primary)",
        card:       "var(--card)",
        border:     "var(--border)",
        muted:      "var(--muted)",
      },
    },
  },
  plugins: [],
};
export default config;
