import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          DEFAULT: "#2563eb",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(37,99,235,.25), 0 10px 30px -10px rgba(37,99,235,.45)",
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'], // ✅ dodana definicja font-inter
      },
    },
  },
  plugins: [],
}

export default config
