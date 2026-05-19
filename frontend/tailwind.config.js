/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Палитра шрифтов под BEAUTY ROOM с прикреплённого референса
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Кремово-беж + графит — фирменная палитра ATELIER
        cream: {
          50: '#faf7f2',
          100: '#f4eee5',
          200: '#ece4d4',
          300: '#dccfb9',
          400: '#c8b89e',
          500: '#a89880',
        },
        ink: {
          50: '#f6f5f3',
          100: '#e6e3df',
          200: '#bdb8b1',
          300: '#928c84',
          400: '#5b554f',
          500: '#3a352f',
          600: '#26221e',
          700: '#1a1714',
          800: '#0f0d0b',
        },
        accent: {
          gold: '#a89980',
          rose: '#c89c91',
        },
      },
      letterSpacing: {
        widest: '0.18em',
      },
      borderRadius: {
        xl2: '1.5rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 6px 24px rgba(20, 18, 15, 0.06)',
        card: '0 14px 40px rgba(20, 18, 15, 0.08)',
      },
    },
  },
  plugins: [],
};
