import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Figma 시안(뉴비톤) 기준. 예전 값은 docs/WIREFRAME.md §5에 있습니다
        brand: '#2563EB',      // 인트로 배경, CTA, 강조
        'brand-deep': '#1D4ED8',
        good: '#0F9D58',
        warn: '#B8860B',
        bad: '#EF4444',        // 손실률, 마이너스 금액
        ink: '#111827',        // 본문 검정
        'ink-soft': '#6B7280', // 보조 텍스트
        line: '#E5E7EB',       // 카드 테두리
      },
      borderRadius: {
        card: '14px',
      },
      fontFamily: {
        sans: ['Pretendard', 'Pretendard Variable', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
