/**
 * S-02 검색 결과 — 데모의 핵심 화면
 * 소유자: B (프론트 — 검색)
 *
 * 정렬·필터·근무시간을 바꾸면 서버에 다시 묻지만, 이전 목록을 지우지 않고 그 자리에서
 * 흐리게 두었다가 교체합니다. (스켈레톤이 매번 번쩍이면 정렬 역전 장면이 잘 안 보입니다)
 */

'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { JobsResponse, SortKey, TransportMode } from '@/types';
import JobCard from '@/components/JobCard';
import SortToggle from '@/components/SortToggle';
import EmptyState from '@/components/EmptyState';
import { minimumWage } from '@/lib/minimumWage';
import { won } from '@/lib/format';

const PAGE_SIZE = 10;

const MODE_LABEL: Record<TransportMode, string> = {
  TRANSIT: '대중교통',
  TAXI: '택시',
  CAR: '자가용',
};

/** 1.0 ~ 12.0시간, 0.5 단위 */
const HOUR_OPTIONS = Array.from({ length: 23 }, (_, i) => 1 + i * 0.5);

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm text-gray-400">불러오는 중…</div>}>
      <SearchResults />
    </Suspense>
  );
}

function SearchResults() {
  const sp = useSearchParams();
  const origin = sp.get('origin') ?? '신촌역';
  const keyword = sp.get('keyword') ?? '';
  const mode = (sp.get('mode') as TransportMode) ?? 'TRANSIT';

  const [hours, setHours] = useState(Number(sp.get('hours')) || 5);
  const [sort, setSort] = useState<SortKey>('REAL_WAGE');
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [aboveMinimumWage, setAboveMinimumWage] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtered = ownerOnly || aboveMinimumWage;

  // 상세 페이지로 넘길 검색 조건 (이동수단까지 함께 넘겨야 상세에서 같은 숫자가 나옵니다)
  const query = useMemo(
    () => new URLSearchParams({ origin, keyword, hours: String(hours), mode }).toString(),
    [origin, keyword, hours, mode],
  );

  // 조건이 바뀌면 '더 보기'로 늘려둔 건수를 처음으로 되돌립니다
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, sort, ownerOnly, aboveMinimumWage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams(query);
    params.set('sort', sort);
    params.set('limit', String(limit));
    if (ownerOnly) params.set('ownerOnly', '1');
    if (aboveMinimumWage) params.set('minWage', '1');

    fetch(`/api/jobs?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((json: JobsResponse) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('공고를 불러오지 못했어요.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, sort, limit, ownerOnly, aboveMinimumWage]);

  function resetFilters() {
    setOwnerOnly(false);
    setAboveMinimumWage(false);
  }

  const showSkeleton = loading && !data;

  return (
    <main className="px-5 pb-16 pt-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-lg text-gray-400" aria-label="홈으로">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {origin} 출발 {keyword && `· ${keyword}`}
          </div>
          <div className="text-[11px] text-gray-400">
            {MODE_LABEL[mode]} · 하루 {hours}시간 기준
          </div>
        </div>
        {data && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              data.mode === 'live' ? 'bg-green-50 text-good' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {data.mode === 'live' ? 'LIVE' : 'MOCK'}
          </span>
        )}
      </div>

      {/* 출발지를 못 찾았으면 조용히 넘어가지 않고 알려줍니다 */}
      {data?.origin && !data.origin.resolved && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-bad">
          <b>{data.origin.label}</b> 의 위치를 찾지 못해 <b>{data.origin.usedLabel}</b> 기준으로
          계산했습니다. 지하철역이나 동 이름으로 다시 검색해 보세요.
        </p>
      )}

      {data?.origin?.outOfArea && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          <b>{data.origin.label}</b> 은 서울에서 많이 떨어져 있어요. 지금 공고는 모두 서울이라
          이동시간이 비현실적으로 길게 나옵니다.
        </p>
      )}

      {data?.origin && data.origin.resolved && data.origin.usedLabel && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
          <b>{data.origin.usedLabel}</b> 기준으로 계산했습니다.
        </p>
      )}

      <div className="mt-4">
        <SortToggle value={sort} onChange={setSort} />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <FilterChip active={ownerOnly} onClick={() => setOwnerOnly((v) => !v)}>
          사장님공고만
        </FilterChip>
        <FilterChip active={aboveMinimumWage} onClick={() => setAboveMinimumWage((v) => !v)}>
          최저임금 이상
        </FilterChip>

        <label className="ml-auto flex items-center gap-1 text-[11px] text-gray-500">
          하루
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            aria-label="하루 근무시간"
            className="rounded-md border border-gray-300 px-1.5 py-1 text-[11px] tnum"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}시간
              </option>
            ))}
          </select>
        </label>
      </div>

      {sort === 'NOMINAL_WAGE' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          지금은 <b>표시 시급</b> 순입니다. 실질시급순으로 바꿔 보세요 — 순위가 뒤집힙니다.
        </p>
      )}

      {error && (
        <EmptyState
          title="공고를 불러오지 못했어요."
          description="잠시 후 다시 시도하거나, 검색 조건을 바꿔 보세요."
          action={
            <Link href="/" className="text-sm font-semibold text-brand">
              조건 바꾸기
            </Link>
          }
        />
      )}

      {showSkeleton && !error && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {data && !error && data.items.length === 0 && (
        <EmptyState
          title="조건에 맞는 공고가 없어요."
          description={
            filtered
              ? '필터를 끄거나 키워드를 줄여 보세요.'
              : '키워드를 줄이거나 출발지를 바꿔 보세요.'
          }
          action={
            filtered ? (
              <button onClick={resetFilters} className="text-sm font-semibold text-brand">
                필터 초기화
              </button>
            ) : (
              <Link href="/" className="text-sm font-semibold text-brand">
                조건 바꾸기
              </Link>
            )
          }
        />
      )}

      {data && !error && data.items.length > 0 && (
        <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <p className="mt-3 text-xs text-gray-500">
            총 <b className="tnum">{data.total}</b>건 중 <b className="tnum">{data.items.length}</b>
            건
            {aboveMinimumWage && ` · ${won(minimumWage())} 이상만`}
          </p>
          <div className="mt-3 space-y-3">
            {data.items.map((item, i) => (
              <JobCard key={item.job.id} item={item} rank={i + 1} query={query} />
            ))}
          </div>

          {data.hasMore && (
            <button
              onClick={() => setLimit((v) => v + PAGE_SIZE)}
              disabled={loading}
              className="mt-4 w-full rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-600 disabled:opacity-50"
            >
              {loading ? '불러오는 중…' : '더 보기'}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        active ? 'border-brand bg-blue-50 text-brand' : 'border-gray-300 text-gray-500'
      }`}
    >
      🏷 {children}
    </button>
  );
}
