/**
 * S-03 공고 상세 — 계산 과정 + 조건 바꿔보기
 * 소유자: C (프론트 — 상세)
 *
 * 근무시간 슬라이더는 서버에 다시 묻지 않고 lib/calc.ts 로 그 자리에서 다시 계산합니다.
 * (그래서 슬라이더를 움직이면 숫자가 즉시 반응합니다 — 데모에서 잘 먹힙니다)
 */

'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { JobResult, JobsResponse } from '@/types';
import { calcForJob } from '@/lib/calc';
import { LOSS_STYLE, lossLevel, minutes, percent, won } from '@/lib/format';
import CalcBreakdown from '@/components/CalcBreakdown';

export default function JobDetailPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm text-gray-400">불러오는 중…</div>}>
      <JobDetail />
    </Suspense>
  );
}

function JobDetail() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();

  const origin = sp.get('origin') ?? '신촌역';
  const keyword = sp.get('keyword') ?? '';
  const baseHours = Number(sp.get('hours')) || 5;

  const [item, setItem] = useState<JobResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hours, setHours] = useState(baseHours);

  useEffect(() => {
    const q = new URLSearchParams({ origin, keyword, hours: String(baseHours) });
    fetch(`/api/jobs?${q}`)
      .then((r) => r.json())
      .then((json: JobsResponse) => {
        const found = json.items.find((x) => x.job.id === params.id);
        if (found) setItem(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [params.id, origin, keyword, baseHours]);

  if (notFound) {
    return (
      <main className="p-5">
        <p className="text-sm text-gray-500">공고를 찾을 수 없어요.</p>
        <Link href="/" className="mt-3 inline-block text-sm font-semibold text-brand">
          홈으로
        </Link>
      </main>
    );
  }

  if (!item) return <div className="p-5 text-sm text-gray-400">불러오는 중…</div>;

  const { job, route } = item;

  // 슬라이더 값으로 그 자리에서 다시 계산 (서버에 다시 묻지 않습니다)
  const calc = calcForJob(job, route, hours);

  const searchQuery = new URLSearchParams({ origin, keyword, hours: String(baseHours) }).toString();

  return (
    <main className="px-5 pb-16 pt-5">
      <Link href={`/search?${searchQuery}`} className="text-lg text-gray-400">
        ←
      </Link>

      <div className="mt-3">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            job.source === 'OWNER' ? 'border-brand text-brand' : 'border-gray-300 text-gray-500'
          }`}
        >
          {job.source === 'OWNER' ? '사장님공고' : '사람인'}
        </span>
        <h1 className="mt-2 text-lg font-bold leading-snug">{job.title}</h1>
        <p className="mt-1 text-xs text-gray-500">
          {job.companyName} · {job.address}
        </p>
      </div>

      {calc ? (
        <>
          <div className="mt-5 rounded-xl border-2 border-gray-900 p-4 text-center">
            <div className="text-xs text-gray-500">실질시급</div>
            <div className="mt-1 text-3xl font-bold tnum">{won(calc.realHourlyWage)}</div>
            <div className="mt-1 text-xs text-gray-500 tnum">
              표시 시급 {won(calc.nominalHourlyWage)} 대비
            </div>
            <div
              className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold tnum ${
                LOSS_STYLE[lossLevel(calc.lossRate)]
              }`}
            >
              −{won(calc.nominalHourlyWage - calc.realHourlyWage)} ({percent(calc.lossRate)})
            </div>
          </div>

          <h2 className="mb-2 mt-6 text-sm font-bold">계산 과정</h2>
          <CalcBreakdown calc={calc} />

          <h2 className="mb-2 mt-6 text-sm font-bold">조건 바꿔보기</h2>
          <div className="rounded-xl border border-gray-200 p-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              하루 근무시간 — <span className="tnum">{hours.toFixed(1)}</span>시간
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
            <p className="mt-2 text-[11px] text-gray-400">
              슬라이더를 움직이면 위 숫자가 바로 다시 계산됩니다.
            </p>
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-bad">경로를 찾지 못해 실질시급을 계산할 수 없어요.</p>
      )}

      <h2 className="mb-2 mt-6 text-sm font-bold">이동 경로</h2>
      <div className="rounded-xl border border-gray-200 p-4 text-sm tnum">
        {route ? (
          <>
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">편도 소요시간</span>
              <span>{minutes(route.oneWayMinutes)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">편도 요금</span>
              <span>{won(route.oneWayFare)}</span>
            </div>
            <div className="flex justify-between py-0.5 font-semibold">
              <span>왕복 합계</span>
              <span>
                {minutes(route.oneWayMinutes * 2)} · {won(route.oneWayFare * 2)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-gray-500">경로 정보 없음</span>
        )}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold">공고 정보</h2>
      <div className="rounded-xl border border-gray-200 p-4 text-sm">
        <Info label="근무시간" value={`${job.dailyWorkHours}시간`} tag={job.hoursIsEstimated ? '추정' : '확정'} />
        <Info label="시급" value={won(job.hourlyWage)} />
        <Info label="근무지" value={job.address} />
      </div>

      {job.hoursIsEstimated && (
        <p className="mt-3 rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-500">
          ⓘ 사람인 공고는 근무시간 정보를 제공하지 않아, 검색할 때 입력한 값으로 계산했습니다.
          사장님이 직접 등록한 공고는 근무시간이 확정값이라 더 정확합니다.
        </p>
      )}

      {job.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 block rounded-lg bg-gray-900 py-3.5 text-center text-sm font-bold text-white"
        >
          사람인에서 지원하기 ↗
        </a>
      )}
    </main>
  );
}

function Info({ label, value, tag }: { label: string; value: string; tag?: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-600">{label}</span>
      <span className="tnum">
        {value}
        {tag && (
          <span
            className={`ml-1.5 rounded px-1 text-[10px] ${
              tag === '확정' ? 'bg-blue-50 text-brand' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {tag}
          </span>
        )}
      </span>
    </div>
  );
}
