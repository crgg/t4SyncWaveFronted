/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf9f6',
          100: '#f5f3ed',
          200: '#e8e4d3',
          300: '#d9d2b5',
          400: '#c9bf97',
          500: '#b8ab79',
          600: '#8c7f49',
          700: '#6b6138',
          800: '#4a4327',
          900: '#2a2516',
        },
        dark: {
          bg: '#121212',
          surface: '#181818',
          card: '#1e1e1e',
          hover: '#2a2a2a',
          text: '#ffffff',
          'text-secondary': '#b3b3b3',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-progress': 'slide-progress linear forwards',
      },
      keyframes: {
        'slide-progress': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress)' },
        },
      },
    },
  },
  plugins: [],
}

