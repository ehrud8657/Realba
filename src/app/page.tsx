/**
 * S-01 홈 / 검색 (Figma 시안 '메인')
 * 소유자: B (프론트 — 검색)
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { TransportMode } from '@/types';
import PlaceAutocomplete, { saveRecentOrigin } from '@/components/PlaceAutocomplete';
import WorkHoursSlider from '@/components/WorkHoursSlider';
import { Wordmark } from '@/components/Logo';
import { defaultOrigin } from '@/lib/account';
import { useAccount } from '@/lib/useAccount';

const MODES: [TransportMode, string][] = [
  ['TRANSIT', '대중교통'],
  ['TAXI', '택시'],
  ['CAR', '자가용'],
];

export default function HomePage() {
  const router = useRouter();
  const account = useAccount();

  const [origin, setOrigin] = useState('신촌역');
  const [keyword, setKeyword] = useState('');
  const [hours, setHours] = useState(5);
  const [mode, setMode] = useState<TransportMode>('TRANSIT');
  /** 마이페이지에 저장해 둔 기본값은 처음 한 번만 채웁니다 (사용자가 바꾼 값을 덮지 않게) */
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !account.profile) return;
    applied.current = true;

    setHours(account.prefs.hours);
    setMode(account.prefs.mode);
    const saved = defaultOrigin(account);
    if (saved) setOrigin(saved);
  }, [account]);

  const canSearch = origin.trim().length > 0;

  function search() {
    if (!canSearch) return;
    saveRecentOrigin(origin);
    const q = new URLSearchParams({ origin: origin.trim(), keyword, hours: String(hours), mode });
    router.push(`/search?${q}`);
  }

  return (
    <main className="px-5 pb-10 pt-10">
      <Wordmark className="text-right text-[32px]" />

      <div className="mt-8">
        <h1 className="text-[22px] font-bold leading-snug text-ink">당신의 시급, 진짜일까요?</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          리알바가 교통비와 출퇴근 시간을 포함한
          <br />
          진짜 시급을 알려드릴게요.
        </p>
      </div>

      <div className="mt-7 space-y-5">
        <PlaceAutocomplete value={origin} onChange={setOrigin} onSubmit={search} />

        <div>
          <label className="mb-2 block text-[13px] font-semibold text-ink">🚗 이동수단</label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`rounded-lg border px-2 py-2.5 text-[13px] font-semibold transition ${
                  mode === value
                    ? 'border-brand bg-blue-50 text-brand'
                    : 'border-line text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="keyword-input" className="mb-2 block text-[13px] font-semibold text-ink">
            🔍 어떤 알바를 찾으세요?
          </label>
          <input
            id="keyword-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="카페, 편의점, 물류 … (비워두면 전체)"
            className="w-full rounded-lg border border-line px-3.5 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-brand"
          />
        </div>

        <WorkHoursSlider
          value={hours}
          onChange={setHours}
          label="⏱ 희망 근무 시간"
          hint="사람인 공고는 근무시간을 제공하지 않아, 이 값으로 계산합니다."
        />
      </div>

      <button
        onClick={search}
        disabled={!canSearch}
        className="mt-8 w-full rounded-lg bg-brand py-4 text-[15px] font-bold text-white transition active:bg-brand-deep disabled:bg-gray-300"
      >
        실질시급으로 찾기 →
      </button>
      {!canSearch && (
        <p className="mt-2 text-center text-[11px] text-ink-soft">
          출발지를 입력해야 이동시간과 교통비를 계산할 수 있어요.
        </p>
      )}
    </main>
  );
}
