import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}","./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink:"#0f172a", soft:"#f8fafc", accent:"#22c55e", card:"#ffffff" }
    }
  },
  plugins: []
} satisfies Config;
