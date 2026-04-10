import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-syne)', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // IGNIZIA brand palette
        brand: {
          navy: '#063472',
          pink: '#E8347E',
          green: '#2DC37C',
          blue: '#06BAF6',
          orange: '#FAB61F',
          yellow: '#FAE934',
        },
        // Semantic roles (prefer these in components)
        primary: '#063472', // alias to brand.navy
        accent: '#06BAF6', // primary call-to-action
        action: '#06BAF6', // buttons, primary interactive elements
        success: '#2DC37C',
        warning: '#FAB61F',
        info: '#06BAF6',
        highlight: '#FAE934',
        danger: '#E8347E',
        'background-light': '#f8fafc',
        'background-dark': '#020617',
        'card-light': '#ffffff',
        'card-dark': '#1e293b',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'slide-up-1': 'slide-up 0.5s ease-out 0.05s forwards',
        'slide-up-2': 'slide-up 0.5s ease-out 0.1s forwards',
        'slide-up-3': 'slide-up 0.5s ease-out 0.15s forwards',
        'slide-up-4': 'slide-up 0.5s ease-out 0.2s forwards',
        'slide-up-5': 'slide-up 0.5s ease-out 0.25s forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [forms, typography],
};

export default config;
