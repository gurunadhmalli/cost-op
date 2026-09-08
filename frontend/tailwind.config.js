/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        milky: {
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#F0F4F9',
          300: '#EBF0F7',
          400: '#E2E8F0',
          500: '#CBD5E1',
          600: '#94A3B8',
          700: '#64748B',
          800: '#334155',
          900: '#0F172A',
        },
        neu: {
          base: '#EBF0F7',
          light: '#FFFFFF',
          dark: '#CAD4E2',
          darker: '#B0BCCE',
        },
        cyber: {
          sky: '#0284C7',
          cyan: '#0891B2',
          emerald: '#059669',
          amber: '#D97706',
          rose: '#E11D48',
          violet: '#7C3AED',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neu-flat': '8px 8px 18px #cad4e2, -8px -8px 18px #ffffff',
        'neu-flat-sm': '4px 4px 10px #cad4e2, -4px -4px 10px #ffffff',
        'neu-hover': '12px 12px 24px #c2cee0, -12px -12px 24px #ffffff',
        'neu-pressed': 'inset 4px 4px 8px #cad4e2, inset -4px -4px 8px #ffffff',
        'neu-pressed-sm': 'inset 2px 2px 5px #cad4e2, inset -2px -2px 5px #ffffff',
        'neu-accent': '6px 6px 16px rgba(2, 132, 199, 0.25), -6px -6px 16px #ffffff',
        'neu-rose': '6px 6px 16px rgba(225, 29, 72, 0.25), -6px -6px 16px #ffffff',
        'neu-emerald': '6px 6px 16px rgba(5, 150, 105, 0.25), -6px -6px 16px #ffffff',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
