/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: "#ffcc00",
        cricket: {
          green: "#2ecc71",
          red: "#e74c3c",
          dark: "#1a1a1a",
          card: "#262626"
        }
      },
    },
  },
  plugins: [],
};
