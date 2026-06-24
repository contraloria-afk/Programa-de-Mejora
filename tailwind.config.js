/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        advanDark: '#0b192e',
        advanOrange: '#f27405',
        advanGray: '#1e293b',
      }
    },
  },
  plugins: [],
}
