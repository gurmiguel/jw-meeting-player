const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fade-in 0.5s ease both',
        'fade-out': 'fade-out 0.5s ease both',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      dropShadow: {
        'hard': '0 1px 1px rgb(0 0 0 / 0.5)',
      },
    },
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
        '.absolute-fill': { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
        '.fixed-fill': { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' },
        '.absolute-center': { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
        '.fixed-center': { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
        '.border-inset-white': { boxShadow: '0 0 0 2px rgba(255,255,255,var(--tw-border-opacity, 1))' },
        '.border-inset-black': { boxShadow: '0 0 0 2px rgba(0,0,0,var(--tw-border-opacity, 1))' },
      })
    }),
  ],
  corePlugins: {
    preflight: false,
  },
}

