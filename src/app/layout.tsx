import type { Metadata, Viewport } from 'next';
import PwaRegister from '@/components/PwaRegister';
import BottomNav from '@/components/BottomNav';
import Splash from '@/components/Splash';
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
  themeColor: '#2563EB', // 폰 상단 상태바 색 (Figma 시안의 브랜드 블루)
  width: 'device-width',
  initialScale: 1,
  // maximumScale은 두지 않습니다 — 확대를 막으면 숫자를 키워 봐야 하는 사용자가 막힙니다
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="mx-auto min-h-screen max-w-md bg-white pb-20 shadow-sm">
          <Splash />
          {children}
          {/* README §10 — 실질시급은 참고용 지표라는 고지 */}
          <footer className="border-t border-gray-100 px-5 py-5 text-[11px] leading-relaxed text-gray-400">
            실질시급은 교통비·이동시간을 반영한 <b>참고용 지표</b>이며 근로계약의 근거가 아닙니다.
            이동시간과 요금은 평시 기준 추정치이고, 공고 원문은 각 출처에서 확인하세요.
          </footer>
        </div>
        <BottomNav />
        <PwaRegister />
      </body>
    </html>
  );
}
