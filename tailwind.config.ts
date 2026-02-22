import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: "#0B0F19",
        panel: "#151C2B",
        accent: "#00D4FF",
        warning: "#FF5D5D",
        success: "#3EEB7B"
      }
    }
  },
  plugins: []
};

export default config;
