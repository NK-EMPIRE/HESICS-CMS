/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      zIndex: {
        dropdown: '100',
        modal: '200',
        modalDropdown: '250',
        confirmDialog: '300',
        toast: '400',
      },
      colors: {
        // HESICS Brand System
        hesics: {
          blue:        '#1E9EFF',
          'blue-dark': '#0A8AE6',
          'blue-dim':  'rgba(30, 158, 255, 0.12)',
        },
        // Elevated Dark Luxury Palette
        surface: {
          root:    '#050505',
          main:    '#09090B',
          card:    '#0E0E11',
          elevated:'#141418',
          hover:   '#18181D',
          border:  '#1C1C21',
          subtle:  '#27272F',
        },
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};