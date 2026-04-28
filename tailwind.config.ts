import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0c10',
        bg2: '#12151c',
        bg3: '#1c2030',
        'bg-elevated': '#232838',
        border: '#262b3d',
        'border-strong': '#353b54',
        text1: '#f4f6fb',
        text2: '#8a93ad',
        'text-muted': '#5b647d',
        primary: '#d4ff3a',
        'primary-hover': '#b8e82a',
        'on-primary': '#0a0c10',
        accent: '#ff3d8a',
        orange: '#ff7a1a',
        success: '#2dd4a4',
        warning: '#ffb627',
        danger: '#ff4d6d',
      },
      fontFamily: {
        display: ['Inter', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
        body: ['Inter', 'SF Pro Text', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px',
        DEFAULT: '16px',
        lg: '22px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 4px 12px rgba(0,0,0,0.35)',
        DEFAULT: '0 12px 32px rgba(0,0,0,0.45)',
        lg: '0 20px 60px rgba(0,0,0,0.55)',
        glow: '0 8px 28px rgba(212,255,58,0.22)',
        'glow-lg': '0 12px 32px rgba(212,255,58,0.35)',
      },
      animation: {
        fadeUp: 'fadeUp .25s ease',
        fadeIn: 'fadeIn .2s ease',
        scaleIn: 'scaleIn .25s cubic-bezier(.2,.8,.2,1)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(.96) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
