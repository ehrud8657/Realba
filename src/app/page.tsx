/**
 * S-01 홈 / 검색
 * 소유자: B (프론트 — 검색)
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { TransportMode } from '@/types';
import PlaceAutocomplete, { saveRecentOrigin } from '@/components/PlaceAutocomplete';
import WorkHoursSlider from '@/components/WorkHoursSlider';

const MODES: [TransportMode, string][] = [
  ['TRANSIT', '대중교통'],
  ['TAXI', '택시'],
  ['CAR', '자가용'],
];

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState('신촌역');
  const [keyword, setKeyword] = useState('');
  const [hours, setHours] = useState(5);
  const [mode, setMode] = useState<TransportMode>('TRANSIT');

  const canSearch = origin.trim().length > 0;

  function search() {
    if (!canSearch) return;
    saveRecentOrigin(origin);
    const q = new URLSearchParams({ origin: origin.trim(), keyword, hours: String(hours), mode });
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
        <PlaceAutocomplete value={origin} onChange={setOrigin} onSubmit={search} />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">🚗 이동수단</label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                  mode === value
                    ? 'border-brand bg-blue-50 text-brand'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="keyword-input" className="mb-1.5 block text-xs font-semibold text-gray-700">
            🔍 어떤 알바를 찾으세요?
          </label>
          <input
            id="keyword-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="카페, 편의점, 물류 … (비워두면 전체)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>

        <WorkHoursSlider
          value={hours}
          onChange={setHours}
          label="⏱ 하루 근무시간"
          hint="사람인 공고는 근무시간을 제공하지 않아, 이 값으로 계산합니다."
        />
      </div>

      <button
        onClick={search}
        disabled={!canSearch}
        className="mt-8 w-full rounded-lg bg-gray-900 py-3.5 text-sm font-bold text-white disabled:bg-gray-300"
      >
        실질시급으로 찾기 →
      </button>
      {!canSearch && (
        <p className="mt-2 text-center text-[11px] text-gray-400">
          출발지를 입력해야 이동시간과 교통비를 계산할 수 있어요.
        </p>
      )}
    </main>
  );
}
