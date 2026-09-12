import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '리알바 — 교통비와 출퇴근 시간까지 계산한 알바 검색',
  description:
    '시급 12,000원 알바가 실제로는 9,276원입니다. 교통비와 이동시간을 반영한 실질시급으로 알바를 비교하세요.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm">{children}</div>
      </body>
    </html>
  );
}
