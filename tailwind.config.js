/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#FF6B00', // Hesics Orange
          600: '#ea580c',
          700: '#c2410c',
        },
        dark: {
          900: '#0B0B0E', // Main background
          800: '#121217', // Secondary card background
          700: '#1A1A22', // Hover/Border
          600: '#262633', // Muted border
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
