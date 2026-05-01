import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/store/**/*.{ts,tsx}",
    "./src/types/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paperCream: "#F5F0E8",
        inkNavy: "#1A1A2E",
        officialRed: "#C0392B",
        govGold: "#D4A017",
        formWhite: "#FFFFFF",
        midGray: "#666666",
        ruleGray: "#D0CCC2",
        stampRedBg: "#FAEAEA",
        goldBg: "#FDF7E3",
      },
    },
  },
  plugins: [],
};

export default config;
