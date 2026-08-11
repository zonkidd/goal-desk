import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        theme: {
          bg: 'var(--bg-base)',
          panel: 'var(--panel-bg)',
          card: 'var(--card-bg)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          accent: 'var(--accent)',
          'accent-light': 'var(--accent-light)',
          'accent-sec': 'var(--accent-secondary)',
          'accent-sec-light': 'var(--accent-sec-light)',
          pause: 'var(--pause-color)',
          'pause-light': 'var(--pause-light)',
        }
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        card: 'var(--card-shadow)',
      },
      keyframes: {
        springUp: {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        spring: 'springUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [typography],
} satisfies Config
