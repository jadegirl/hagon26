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
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: "#1B2A4A",
        hagon: {
          blue: "#1E3A5F",
          navy: "#0F2440",
          sky: "#E8F4FD",
          cream: "#FFF8E7",
          gold: "#FFD85C",
          goldHover: "#F5CE4F",
          slate: "#F8FAFC",
          text: "#1A1A2E",
          sub: "#64748B",
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;



