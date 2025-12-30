/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        // El color dorado central del logo
        primary: {
          50: '#f2f2f6',
          100: '#F5F1E8',
          200: '#E2C285',
          300: '#D4B870',
          400: '#E2C285', // light
          500: '#C5A059', // DEFAULT
          600: '#C5A059', // DEFAULT
          700: '#A6823E', // dark
          800: '#8B6B2F',
          900: '#6B5123',
          light: '#E2C285',
          DEFAULT: '#C5A059',
          dark: '#A6823E',
        },
        // El color del texto "T4"
        secondary: {
          DEFAULT: '#1A150E',
        },
        // Colores de soporte para fondos y superficies
        surface: {
          light: '#f2f2f6', // Background principal
          dark: '#120F0A',  // Casi negro, pero con tono cálido
        },
        dark: {
          bg: '#120F0A',
          surface: '#120F0A',
          card: '#1A150E',
          hover: '#2a2516',
          text: '#F9F7F2',
          'text-secondary': '#E2C285',
        },
        light: {
          bg: '#f2f2f6',
          surface: '#f2f2f6',
          card: '#ffffff',
          hover: '#E2C285',
          text: '#1A150E',
          'text-secondary': '#A6823E',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-progress': 'slide-progress linear forwards',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        'slide-progress': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
