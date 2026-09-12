import type { Metadata, Viewport } from 'next';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: '리알바 — 교통비와 출퇴근 시간까지 계산한 알바 검색',
  description:
    '시급 12,000원 알바가 실제로는 9,276원입니다. 교통비와 이동시간을 반영한 실질시급으로 알바를 비교하세요.',

  // ↓ 여기부터 PWA 설정
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true, // 아이폰에서 주소창 없이 전체화면으로 실행
    statusBarStyle: 'default',
    title: '리알바',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1B64DA', // 폰 상단 상태바 색
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 실수로 확대되는 것 방지 (앱처럼 느껴지게)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm">{children}</div>
        <PwaRegister />
      </body>
    </html>
  );
}
