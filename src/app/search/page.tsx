/**
 * S-02 검색 결과 — 데모의 핵심 화면
 * 소유자: B (프론트 — 검색)
 */

'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { JobsResponse, SortKey } from '@/types';
import JobCard from '@/components/JobCard';
import SortToggle from '@/components/SortToggle';

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
  const hours = sp.get('hours') ?? '5';

  const [sort, setSort] = useState<SortKey>('REAL_WAGE');
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 상세 페이지로 넘길 검색 조건
  const query = useMemo(
    () => new URLSearchParams({ origin, keyword, hours }).toString(),
    [origin, keyword, hours],
  );

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/api/jobs?${query}&sort=${sort}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((json: JobsResponse) => !cancelled && setData(json))
      .catch(() => !cancelled && setError('공고를 불러오지 못했어요.'));

    return () => {
      cancelled = true;
    };
  }, [query, sort]);

  return (
    <main className="px-5 pb-16 pt-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-lg text-gray-400">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {origin} 출발 {keyword && `· ${keyword}`}
          </div>
          <div className="text-[11px] text-gray-400">하루 {hours}시간 기준</div>
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

      <div className="mt-4">
        <SortToggle value={sort} onChange={setSort} />
      </div>

      {sort === 'NOMINAL_WAGE' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          지금은 <b>표시 시급</b> 순입니다. 실질시급순으로 바꿔 보세요 — 순위가 뒤집힙니다.
        </p>
      )}

      {error && <p className="mt-8 text-center text-sm text-bad">{error}</p>}

      {!data && !error && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">조건에 맞는 공고가 없어요.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-brand">
            조건 바꾸기
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="mt-3 text-xs text-gray-500">
            총 <b className="tnum">{data.total}</b>건
          </p>
          <div className="mt-3 space-y-3">
            {data.items.map((item, i) => (
              <JobCard key={item.job.id} item={item} rank={i + 1} query={query} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
