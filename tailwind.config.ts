import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      colors: {
        compass: {
          bg: '#FAFAF8',
          sidebar: '#F5F4F0',
          border: '#E8E6DF',
          text: '#1C1C1A',
          muted: '#6B6B66',
          hint: '#A8A8A2',
          accent: '#2E4057',
          urgent: '#C0392B',
          soon: '#D4780F',
          bubble: {
            user: '#EAF1FB',
            'user-text': '#1A3A6B',
            assistant: '#F5F4F0',
          }
        }
      }
    }
  },
  plugins: [],
}

export default config
