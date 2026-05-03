/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gamer: {
          neon: '#00ffcc',
          purple: '#bc13fe',
          dark: '#0a0a0c',
          card: '#16161e'
        }
      }
    },
  },
  plugins: [],
}
