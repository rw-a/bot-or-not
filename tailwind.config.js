const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT: "#3b82f6",   // blue-500
          dark:    "#1d4ed8",   // blue-700
        },
        danger: {
          DEFAULT: "#f43f5e",   // rose-500
          dark:    "#be123c",   // rose-700
        },
        muted: {
          DEFAULT: "#cbd5e1",   // slate-300
          dark:    "#94a3b8",   // slate-400
        },
      }
    },
  },
  plugins: [],
}

