/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Material 3 accent roles — CSS vars so the theme picker drives them.
        primary: "var(--m3-primary)",
        "on-primary": "var(--m3-on-primary)",
        "primary-container": "var(--m3-primary-container)",
        "on-primary-container": "var(--m3-on-primary-container)",
        // Neutral scale — intentionally not themed (dark theme reads better gray).
        surface: "#111514",
        "surface-low": "#0E1211",
        "surface-container": "#161B19",
        "surface-high": "#1C2220",
        "surface-highest": "#242B29",
        "on-surface": "#E2E6E3",
        "on-surface-variant": "#B3BBB6",
        outline: "#6A736E",
        "outline-variant": "#2C3431",
        error: "#FFB4AB",
      },
      fontFamily: {
        sans: ["Roboto", "Segoe UI", "sans-serif"],
        mono: ["'Roboto Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // M3 shape scale
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "28px",
      },
    },
  },
  plugins: [],
};
