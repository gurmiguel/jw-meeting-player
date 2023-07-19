const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
    container: {
      center: true,
    },
  },
  plugins: [
    plugin(function ({ addBase, theme }) {
      addBase({
        'h1': { marginBottom: theme('spacing.2'), fontSize: theme('fontSize.3xl') },
        'h2': { marginBottom: theme('spacing.1.5'), fontSize: theme('fontSize.2xl') },
        'h3': { marginBottom: theme('spacing.1'), fontSize: theme('fontSize.xl') },
        'h4': { marginBottom: theme('spacing.0.5'), fontSize: theme('fontSize.lg') },
      })
    })
  ],
}

