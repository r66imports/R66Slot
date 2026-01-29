import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // R66SLOT Theme - Route 66 Racing Colors
        primary: {
          DEFAULT: '#DC2626', // Racing red
          red: '#DC2626',
          dark: '#991B1B',
          light: '#EF4444',
        },
        secondary: {
          DEFAULT: '#1F2937', // Dark gray/almost black
          gray: '#1F2937',
        },
        accent: {
          DEFAULT: '#FBBF24', // Chrome yellow accent
          yellow: '#FBBF24',
          silver: '#D1D5DB',
        },
        black: '#000000',
        white: '#FFFFFF',
      },
      fontFamily: {
        sans: ['var(--font-assistant)', 'system-ui', 'sans-serif'],
        play: ['var(--font-play)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
}

export default config
