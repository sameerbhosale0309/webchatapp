import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cassette Futurism Hardware Palette Tokens
        'paper-display': '#e7e7e7',
        'chassis-sand': '#beb4ad',
        'cassette-housing': '#afa298',
        'oxide-brown': '#aca6a0',
        'magnetic-oxide': '#907771',
        'dark-oxide': '#2c2725',

        // Semantic bindings for existing code compatibility
        canvas: '#beb4ad',
        surface: '#e7e7e7',
        'surface-glass': 'rgba(231, 231, 231, 0.92)',
        sunken: '#2c2725',
        border: {
          subtle: 'rgba(44, 39, 37, 0.2)',
          strong: 'rgba(44, 39, 37, 0.4)',
        },
        text: {
          primary: '#2c2725',
          secondary: '#736862',
          tertiary: '#907771',
          inverse: '#e7e7e7',
        },
        accent: {
          violet: '#907771',
          magenta: '#b2867a',
          oxide: '#907771',
        },
        success: '#2DE0A0',
        warning: '#F59E0B',
        danger: '#D94848',
        presence: { online: '#2DE0A0' },
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #907771 0%, #b2867a 100%)',
        'accent-gradient-soft': 'linear-gradient(135deg, rgba(144, 119, 113, 0.2), rgba(178, 134, 122, 0.2))',
        'crt-mesh': 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.12) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
      },
      fontFamily: {
        display: ['Space Mono', 'JetBrains Mono', 'monospace'],
        body: ['Inter', 'Geist Mono', 'sans-serif'],
        mono: ['JetBrains Mono', 'Space Mono', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        bubble: '4px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.15)',
        md: '0 4px 12px rgba(0, 0, 0, 0.2)',
        lg: '0 12px 28px rgba(0, 0, 0, 0.25)',
        recessed: 'inset 1px 1px 2px rgba(0,0,0,0.35), inset -1px -1px 0px rgba(255,255,255,0.4)',
        raised: 'inset 1px 1px 0px rgba(255,255,255,0.6), inset -1px -1px 1px rgba(0,0,0,0.4), 0 2px 5px rgba(0,0,0,0.2)',
        glow: '0 0 16px rgba(144, 119, 113, 0.4)',
        'glow-phosphor': '0 0 16px rgba(45, 224, 160, 0.5)',
        'glow-amber': '0 0 16px rgba(245, 158, 11, 0.5)',
      },
      keyframes: {
        whoosh: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        tapeSpool: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        vuMeter: {
          '0%, 100%': { height: '15%' },
          '50%': { height: '85%' },
        },
        crtRoll: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        rubberStamp: {
          '0%': { transform: 'scale(1.4) rotate(-4deg)', opacity: '0' },
          '70%': { transform: 'scale(0.96) rotate(1deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        cursorBlink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        whoosh: 'whoosh 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'tape-spool': 'tapeSpool 4s linear infinite',
        'vu-meter-1': 'vuMeter 0.8s ease-in-out infinite',
        'vu-meter-2': 'vuMeter 1.1s ease-in-out infinite 0.2s',
        'vu-meter-3': 'vuMeter 0.7s ease-in-out infinite 0.4s',
        'crt-roll': 'crtRoll 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'rubber-stamp': 'rubberStamp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'cursor-blink': 'cursorBlink 1s infinite',
      },
    },
  },
  plugins: [],
};

export default config;