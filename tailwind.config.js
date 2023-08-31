const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontWeight: {
      thin: '200',
      extralight: '300',
      light: '400',
      normal: '500',
      medium: '600',
      semibold: '700',
      bold: '800',
      extrabold: '900',
      black: '1000',
    },
    extend: {
      fontFamily: {
        sans: ['Inconsolata', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT: "#3b82f6",   // blue-500
          dark:    "#1d4ed8",   // blue-700
          light:   "#93c5fd"    // blue-300
        },
        success: {
          DEFAULT: "#22c55e"    // green-500
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

