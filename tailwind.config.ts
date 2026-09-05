import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        metro: {
          blue: "#0072CE",      // Line 1 (North-South)
          green: "#00A651",     // Line 2 (East-West)
          purple: "#7B2CBF",    // Line 3 (Joka-Majerhat)
          orange: "#FF7900",    // Line 6 (Kavi Subhash-Beleghata)
          yellow: "#FFD100",    // Line 4 (Noapara-Airport)
        },
        transit: {
          bg: "#0B0F17",
          card: "#121824",
          cardHover: "#182133",
          border: "#1E293B",
          borderLight: "#334155",
          muted: "#94A3B8",
          text: "#F8FAFC",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
