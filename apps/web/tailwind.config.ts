import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['var(--text-hero)', { lineHeight: '1.1', fontWeight: '700' }],
        page: ['var(--text-page)', { lineHeight: '1.2', fontWeight: '700' }],
        section: ['var(--text-section)', { lineHeight: '1.3', fontWeight: '600' }],
        card: ['var(--text-card)', { lineHeight: '1.35', fontWeight: '600' }],
        body: ['var(--text-body)', { lineHeight: '1.55', fontWeight: '400' }],
        meta: ['var(--text-meta)', { lineHeight: '1.45', fontWeight: '500' }],
        helper: ['var(--text-helper)', { lineHeight: '1.4', fontWeight: '400' }],
        kpi: ['var(--text-kpi)', { lineHeight: '1.1', fontWeight: '700' }],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
