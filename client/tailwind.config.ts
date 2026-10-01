import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        'surface-glass': 'var(--bg-surface-glass)',
        sunken: 'var(--bg-sunken)',
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          violet: 'var(--accent-violet)',
          magenta: 'var(--accent-magenta)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        presence: { online: 'var(--presence-online)' },
      },
      backgroundImage: {
        'accent-gradient': 'var(--accent-gradient)',
        'accent-gradient-soft': 'var(--accent-gradient-soft)',
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jbmono)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        bubble: 'var(--radius-bubble)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        glow: 'var(--shadow-glow-accent)',
        'glow-success': 'var(--shadow-glow-success)',
      },
      backdropBlur: { glass: '20px' },
      keyframes: {
        whoosh: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.92)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        typingDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        reactionPop: {
          '0%': { transform: 'scale(0)' },
          '60%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        presencePulse: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        badgeBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.25)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        staggerIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        whoosh: 'whoosh 320ms cubic-bezier(0.16,1,0.3,1) both',
        'typing-dot': 'typingDot 1.2s ease-in-out infinite',
        'reaction-pop': 'reactionPop 420ms cubic-bezier(.34,1.56,.64,1) both',
        'presence-pulse': 'presencePulse 2s ease-out infinite',
        'badge-bounce': 'badgeBounce 380ms cubic-bezier(.34,1.56,.64,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'stagger-in': 'staggerIn 300ms cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};

export default config;