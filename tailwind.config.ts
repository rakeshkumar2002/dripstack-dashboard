import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'Hanken Grotesk', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: '#f4f5f8',
        ink: '#11131a',
        muted: '#5b616e',
        faint: '#8b909c',
        fainter: '#a3a8b4',
        hair: '#e7e9f0',
        brand: {
          DEFAULT: '#2f5fd0',
          hover: '#2750b8',
          tint: '#eef3ff',
          border: '#c9d8fb',
        },
        sev: {
          red: '#e5484d',
          redink: '#cf2f37',
          redtint: '#fdeced',
          amber: '#cf8a09',
          ambertint: '#faf1db',
          green: '#15935b',
          greentint: '#e3f4ec',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
