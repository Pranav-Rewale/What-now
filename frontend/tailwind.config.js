/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Quicksand'", "sans-serif"],
        body: ["'Actor'", "sans-serif"],
      },
      colors: {
        primary: "#FFE100",
        primaryDark: "#000000",
        grayDark: "#1A1A1A",
        grayMid: "#3C3C3C",
        grayLight: "#E6E6E6",
        surface: "#FAFAFA",
        accentRed: "#FF4757",
        accentCyan: "#00E5FF",
        accentGreen: "#2DFF72",
        accentViolet: "#5D2EFF",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0,0,0,0.12)",
        hard: "0 2px 8px rgba(0,0,0,0.25)",
        "hard-lg": "0 4px 20px rgba(0,0,0,0.35)",
        "card-hover": "0 12px 32px rgba(0,0,0,0.18)",
      },
    },
  },
  plugins: [],
};
