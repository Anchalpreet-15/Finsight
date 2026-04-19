/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* Bright mint green brand palette (from reference) */
        brand: {
          50:  '#effef6',
          100: '#d9fce8',
          200: '#b5f8d5',
          300: '#7eedba',
          400: '#41de9b',
          500: '#00e676', /* The hero neon green */
          600: '#00c853',
          700: '#00a344',
          800: '#007f35',
          900: '#005e27',
          950: '#003b18',
        },
        /* Deep teal accents for gradients */
        accent: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        /* Dark obsidian slate surface colors */
        surface: {
          50:  '#f5f7f8',
          100: '#e2e6e9',
          200: '#c5ced3',
          700: '#2d3b40',
          800: '#202a2d', /* Cards */
          850: '#1a2225', /* Sidebar / panels */
          900: '#141a1c', /* Main App Background */
          950: '#0d1113', /* Deepest contrast */
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'typing': 'typingBounce 1.4s ease-in-out infinite',
        'msg-in': 'msgIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        typingBounce: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.3' },
          '30%':            { transform: 'translateY(-8px)', opacity: '1' },
        },
        msgIn: {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 230, 118, 0.2)' },
          '50%':      { boxShadow: '0 0 40px rgba(0, 230, 118, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
