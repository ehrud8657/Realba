/**
 * 하단 탭바 (Figma 시안 '하단바')
 *
 * 기존 Plus 아이콘은 간편 실질시급 계산기로 연결합니다.
 * 마이페이지는 아직 준비 중입니다.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  ready: boolean;
  /** 이 경로들에서 활성으로 봅니다 */
  match?: (path: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: '/',
    label: 'Home',
    ready: true,
    match: (p) => p === '/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Search',
    ready: true,
    match: (p) => p.startsWith('/search') || p.startsWith('/jobs'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/calculator',
    label: 'Plus',
    ready: true,
    match: (p) => p.startsWith('/calculator'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '#',
    label: 'My Page',
    ready: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-white/95 backdrop-blur">
      <ul className="flex">
        {TABS.map((tab) => {
          const active = tab.ready && (tab.match?.(pathname) ?? false);

          const inner = (
            <span className="flex flex-col items-center gap-0.5 py-2">
              {tab.icon}
              <span className="text-[10px] font-semibold">{tab.label}</span>
              <span
                className={`mt-0.5 h-0.5 w-5 rounded-full ${active ? 'bg-ink' : 'bg-transparent'}`}
              />
            </span>
          );

          return (
            <li key={tab.label} className="flex-1">
              {tab.ready ? (
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block ${active ? 'text-ink' : 'text-ink-soft'}`}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-label={`${tab.label} — 준비 중`}
                  title="준비 중입니다"
                  className="block w-full cursor-default text-gray-300"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {/* 아이폰 홈 인디케이터 자리 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
