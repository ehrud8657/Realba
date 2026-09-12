/**
 * S-03 공고 상세 — 계산 과정 + 조건 바꿔보기
 * 소유자: C (프론트 — 상세)
 *
 * 조건(근무시간·교통비 지원·주휴수당)은 서버에 다시 묻지 않고 lib/calc.ts로 그 자리에서
 * 다시 계산합니다. (그래서 슬라이더를 움직이면 숫자가 즉시 반응합니다 — 데모에서 잘 먹힙니다)
 *
 * 검색 조건(출발지·이동수단·근무시간)은 URL로 받아 그대로 API에 넘깁니다.
 * 이동수단을 빠뜨리면 목록과 상세의 숫자가 달라집니다. 주의하세요.
 */

'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { JobResult, JobsResponse, TransportMode } from '@/types';
import { calcForJob } from '@/lib/calc';
import { percent, won } from '@/lib/format';
import { isBelowMinimumWage, minimumWage } from '@/lib/minimumWage';
import CalcBreakdown from '@/components/CalcBreakdown';
import RouteSummary from '@/components/RouteSummary';
import WorkHoursSlider from '@/components/WorkHoursSlider';
import SourceBadge from '@/components/SourceBadge';
import EstimatedTag, { hoursSourceOf } from '@/components/EstimatedTag';
import EmptyState from '@/components/EmptyState';
import { MinimumWageWarning } from '@/components/RealWageBadge';

/** 교통비 지원 선택지 */
const SUBSIDY_PRESETS = [0, 1000, 2000, 3000];

/** 공고의 실제 지원액이 보기에 없으면 그 값을 항목으로 추가합니다 (빈 셀렉트 방지) */
function subsidyOptions(jobSubsidy: number) {
  const amounts = SUBSIDY_PRESETS.includes(jobSubsidy)
    ? SUBSIDY_PRESETS
    : [...SUBSIDY_PRESETS, jobSubsidy].sort((a, b) => a - b);
  return [
    ...amounts.map((v) => ({
      value: String(v),
      label: v === 0 ? '없음' : `일 ${v.toLocaleString('ko-KR')}원`,
    })),
    { value: 'FULL', label: '실비 전액' },
  ];
}

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
  const mode = (sp.get('mode') as TransportMode) ?? 'TRANSIT';

  const [item, setItem] = useState<JobResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  // ── 조건 바꿔보기 상태 ──────────────────────────────
  const [hours, setHours] = useState(baseHours);
  const [subsidy, setSubsidy] = useState<string | null>(null); // null = 공고 값 그대로
  const [holidayPay, setHolidayPay] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState(baseHours * 5);
  /** 사용자가 주 근무시간을 직접 고쳤으면 더 이상 슬라이더를 따라가지 않습니다 */
  const weeklyEdited = useRef(false);

  // 하루 근무시간을 바꾸면 주 근무시간(= 하루 × 5일)도 같이 움직입니다.
  // 안 그러면 하루 8시간인데 주 25시간이 남아 주 3.1일 근무로 계산됩니다
  function changeHours(v: number) {
    setHours(v);
    if (!weeklyEdited.current) setWeeklyHours(v * 5);
  }

  useEffect(() => {
    const q = new URLSearchParams({
      origin,
      keyword,
      hours: String(baseHours),
      mode,
      id: params.id,
    });

    fetch(`/api/jobs?${q}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
      .then((r) => r.json())
      .then((json: JobsResponse) => {
        const found = json.items.find((x) => x.job.id === params.id);
        if (found) {
          setItem(found);
          setSubsidy(String(found.job.transportSubsidyPerDay ?? 0));
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [params.id, origin, keyword, baseHours, mode]);

  const searchQuery = new URLSearchParams({
    origin,
    keyword,
    hours: String(baseHours),
    mode,
  }).toString();

  if (notFound) {
    return (
      <main className="p-5">
        <EmptyState
          title="공고를 찾을 수 없어요."
          description="목록으로 돌아가 다른 공고를 확인해 보세요."
          action={
            <Link href={`/search?${searchQuery}`} className="text-sm font-semibold text-brand">
              검색 결과로
            </Link>
          }
        />
      </main>
    );
  }

  if (!item) return <div className="p-5 text-sm text-gray-400">불러오는 중…</div>;

  const { job, route } = item;

  // 슬라이더·셀렉트 값으로 그 자리에서 다시 계산 (서버에 다시 묻지 않습니다)
  const calc = calcForJob(job, route, {
    hours,
    subsidyPerDay: subsidy === 'FULL' ? 0 : Number(subsidy ?? 0),
    fullFareSubsidy: subsidy === 'FULL',
    includeWeeklyHolidayPay: holidayPay,
    weeklyWorkHours: weeklyHours,
  });

  const dday = daysUntil(job.deadline);

  return (
    <main className="px-5 pb-16 pt-5">
      <div className="flex items-center">
        <Link href={`/search?${searchQuery}`} className="text-lg text-gray-400" aria-label="검색 결과로">
          ←
        </Link>
        <ShareButton title={job.title} />
      </div>

      <div className="mt-3">
        <span className="inline-flex items-center gap-1.5">
          <SourceBadge source={job.source} />
          {dday !== null && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 tnum">
              {dday > 0 ? `D-${dday}` : dday === 0 ? '오늘 마감' : '마감됨'}
            </span>
          )}
        </span>
        <h1 className="mt-2 text-[19px] font-bold leading-snug text-ink">{job.title}</h1>
        <p className="mt-1 text-[12px] text-ink-soft">
          {job.companyName} · {job.address}
        </p>
      </div>

      {calc ? (
        <>
          <div className="mt-5 rounded-card border border-line p-5 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-[11px] text-ink-soft">실질시급</div>
            <div
              className="mt-1 text-[34px] font-extrabold text-ink tnum"
              aria-label={`실질시급 ${calc.realHourlyWage}원, 표시 시급 ${calc.nominalHourlyWage}원 대비 ${percent(Math.abs(calc.lossRate))} ${calc.lossRate >= 0 ? '낮음' : '높음'}`}
            >
              {won(calc.realHourlyWage)} {calc.lossRate < 0.1 ? '🔥' : ''}
            </div>
            <div className="mt-1.5 text-[12px] text-ink-soft tnum">
              기본 시급 {won(calc.nominalHourlyWage)} 대비
            </div>
            <div
              className={`mt-0.5 text-[13px] font-bold tnum ${
                calc.lossRate >= 0 ? 'text-bad' : 'text-good'
              }`}
            >
              {calc.lossRate >= 0 ? '−' : '+'}
              {won(Math.abs(calc.nominalHourlyWage - calc.realHourlyWage))} (
              {percent(Math.abs(calc.lossRate))})
            </div>
            {calc.includesWeeklyHolidayPay && (
              <div className="mt-1 text-[11px] text-gray-500">주휴수당 포함 기준</div>
            )}
            {(isBelowMinimumWage(job.hourlyWage) || calc.realHourlyWage < minimumWage()) && (
              <div>
                <MinimumWageWarning wageBelowMinimum={isBelowMinimumWage(job.hourlyWage)} />
              </div>
            )}
          </div>

          <div className="mt-7">
            <CalcBreakdown calc={calc} />
          </div>

          <h2 className="mb-2 mt-7 text-[13px] font-bold text-ink">조건 바꿔보기</h2>
          <div className="space-y-4 rounded-card border border-line p-4">
            <WorkHoursSlider value={hours} onChange={changeHours} />

            <div>
              <label
                htmlFor="subsidy-select"
                className="mb-1.5 block text-xs font-semibold text-gray-700"
              >
                교통비 지원
              </label>
              <select
                id="subsidy-select"
                value={subsidy ?? '0'}
                onChange={(e) => setSubsidy(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tnum"
              >
                {subsidyOptions(job.transportSubsidyPerDay ?? 0).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="holiday-toggle" className="text-xs font-semibold text-gray-700">
                  주휴수당 포함
                </label>
                <button
                  id="holiday-toggle"
                  type="button"
                  role="switch"
                  aria-checked={holidayPay}
                  onClick={() => setHolidayPay((v) => !v)}
                  className={`h-6 w-11 rounded-full transition ${
                    holidayPay ? 'bg-brand' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition ${
                      holidayPay ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {holidayPay && (
                <div className="mt-2">
                  <label
                    htmlFor="weekly-hours"
                    className="mb-1 block text-[11px] font-semibold text-gray-600"
                  >
                    주 소정근로시간
                  </label>
                  <input
                    id="weekly-hours"
                    type="number"
                    min={1}
                    max={60}
                    step={0.5}
                    value={weeklyHours}
                    onChange={(e) => {
                      weeklyEdited.current = true;
                      setWeeklyHours(Number(e.target.value) || 0);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tnum"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    주 15시간 이상일 때만 주휴수당이 발생합니다.
                    {weeklyHours > 0 && weeklyHours < 15 && (
                      <span className="text-bad"> 지금 값으로는 발생하지 않아요.</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-400">
              값을 바꾸면 위 숫자가 바로 다시 계산됩니다.
            </p>
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-bad">경로를 찾지 못해 실질시급을 계산할 수 없어요.</p>
      )}

      <h2 className="mb-2 mt-7 text-[13px] font-bold text-ink">이동 경로</h2>
      <RouteSummary
        route={route}
        mode={mode}
        subsidyPerDay={subsidy === 'FULL' ? (route?.oneWayFare ?? 0) * 2 : Number(subsidy ?? 0)}
      />

      <h2 className="mb-2 mt-7 text-[13px] font-bold text-ink">공고 정보</h2>
      <div className="rounded-card border border-line p-4 text-sm">
        <Info label="시급" value={won(job.hourlyWage)} />
        <Info label="하루 근무시간" value={`${hours}시간`} />
        {job.workTime && <Info label="근무 시간대" value={job.workTime} />}
        {job.workDays && <Info label="근무 요일" value={job.workDays} />}
        {job.employmentType && <Info label="고용형태" value={job.employmentType} />}
        {job.deadline && <Info label="마감일" value={job.deadline} />}
        <Info label="근무지" value={job.address} />

        <div className="mt-2 border-t border-gray-100 pt-2 text-right">
          <span className="text-xs text-gray-600">근무시간 정확도</span>
          <EstimatedTag source={hoursSourceOf(job)} expandable />
        </div>
      </div>

      {job.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="mt-7 block rounded-lg bg-ink py-4 text-center text-[15px] font-bold text-white"
        >
          사람인에서 지원하기 ↗
        </a>
      )}
    </main>
  );
}

/** 공유 — 폰에서는 공유 시트, 데스크톱에서는 링크 복사 */
function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window === 'undefined' ? '' : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `리알바 — ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 사용자가 공유를 취소한 경우 — 아무것도 하지 않습니다
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="공고 공유하기"
      className="ml-auto text-xs font-semibold text-gray-500"
    >
      {copied ? '링크 복사됨' : '⇪ 공유'}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-600">{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}

/** 마감일까지 남은 일수. 없으면 null */
function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const end = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000) - 1;
}
