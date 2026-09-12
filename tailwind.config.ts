import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // docs/WIREFRAME.md §5 디자인 토큰
        brand: '#1B64DA',
        good: '#0F9D58',
        warn: '#B8860B',
        bad: '#DB4437',
      },
    },
  },
  plugins: [],
};

export default config;
