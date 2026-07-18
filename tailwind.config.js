/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--c-ink)',
        surface: 'var(--c-surface)',
        surface2: 'var(--c-surface2)',
        line: 'var(--c-line)',
        paper: 'var(--c-paper)',
        muted: 'var(--c-muted)',
        amber: {
          DEFAULT: '#F2A93B',
          deep: '#D9822B',
        },
        exposure: {
          low: '#4C9A6A',
          moderate: '#E8B93A',
          high: '#D64545',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
