/**
 * S-01 홈 / 검색
 * 소유자: B (프론트 — 검색)
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const RECENT_ORIGINS = ['신촌역', '강남역', '홍대입구역', '잠실역', '서울역'];

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState('신촌역');
  const [keyword, setKeyword] = useState('');
  const [hours, setHours] = useState(5);

  function search() {
    const q = new URLSearchParams({ origin, keyword, hours: String(hours) });
    router.push(`/search?${q}`);
  }

  return (
    <main className="px-5 pb-16 pt-8">
      <h1 className="text-lg font-bold">리알바</h1>

      <div className="mt-6">
        <p className="text-2xl font-bold leading-snug">
          시급 12,000원 알바,
          <br />
          진짜로는 9,276원입니다.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          교통비와 출퇴근 시간까지 계산해 드릴게요.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">📍 출발지</label>
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="우리집 주소를 입력하세요"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RECENT_ORIGINS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOrigin(o)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  origin === o
                    ? 'border-brand bg-blue-50 text-brand'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">
            🔍 어떤 알바를 찾으세요?
          </label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="카페, 편의점, 물류 … (비워두면 전체)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">
            ⏱ 하루 근무시간 — <span className="tnum">{hours.toFixed(1)}</span>시간
          </label>
          <input
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-brand"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            사람인 공고는 근무시간을 제공하지 않아, 이 값으로 계산합니다.
          </p>
        </div>
      </div>

      <button
        onClick={search}
        className="mt-8 w-full rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white"
      >
        실질시급으로 찾기 →
      </button>
    </main>
  );
}
