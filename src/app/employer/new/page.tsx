/**
 * S-07 공고 등록 (사장님)
 *
 * 구조화 입력이 핵심입니다. 여기서 받은 값이 사람인 공고보다 정확한 실질시급을 만듭니다.
 * 등록 전에 "구직자에게 이렇게 보입니다"로 실질시급을 먼저 보여줍니다.
 *
 * 공고는 서버에 저장되지 않고 이 브라우저에만 남습니다 (→ lib/account.ts).
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { JobResult } from '@/types';
import { addMyJob } from '@/lib/account';
import { useAccount } from '@/lib/useAccount';
import { minimumWage } from '@/lib/minimumWage';
import { minutes, percent, won } from '@/lib/format';
import EmptyState from '@/components/EmptyState';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

const inputClass =
  'w-full rounded-lg border border-line px-3.5 py-3 text-sm outline-none focus:border-brand';

/** "09:00", "14:00" → 5 (자정을 넘기면 24를 더해 계산) */
function hoursBetween(start: string, end: string): number | null {
  const parse = (v: string) => {
    const m = v.match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) + Number(m[2]) / 60 : null;
  };
  const s = parse(start);
  const e = parse(end);
  if (s === null || e === null) return null;

  const span = e > s ? e - s : e + 24 - s; // 야간 근무
  return Math.round(span * 100) / 100;
}

export default function NewJobPage() {
  const router = useRouter();
  const { profile, prefs } = useAccount();

  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('14:00');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [days, setDays] = useState<string[]>(['월', '화', '수', '목', '금']);
  const [subsidy, setSubsidy] = useState('0');

  const [preview, setPreview] = useState<JobResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wage = Number(hourlyWage.replace(/[^\d]/g, '')) || 0;
  const span = hoursBetween(start, end);
  const dailyWorkHours =
    span === null ? null : Math.round((span - (Number(breakMinutes) || 0) / 60) * 100) / 100;
  const overnight = span !== null && end <= start;
  const belowMinimum = wage > 0 && wage < minimumWage();

  const ready =
    title.trim() !== '' &&
    companyName.trim() !== '' &&
    address.trim() !== '' &&
    wage > 0 &&
    dailyWorkHours !== null &&
    dailyWorkHours > 0;

  /** 구직자 기준 미리보기 — 기본 출발지와 기본 근무조건으로 계산해 봅니다 */
  useEffect(() => {
    if (!ready) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await fetch('/api/jobs/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: '신촌역',
            hours: dailyWorkHours,
            mode: prefs.mode,
            jobs: [
              {
                id: 'preview',
                title: title.trim(),
                companyName: companyName.trim(),
                address: address.trim(),
                hourlyWage: wage,
                dailyWorkHours,
                transportSubsidyPerDay: Number(subsidy) || 0,
              },
            ],
          }),
        });
        const json = await res.json();
        if (!cancelled) setPreview(json.items?.[0] ?? null);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 600); // 입력이 멈추면 계산합니다

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, title, companyName, address, wage, dailyWorkHours, subsidy, prefs.mode]);

  function submit() {
    setError(null);

    if (!ready || dailyWorkHours === null) return setError('필수 항목을 모두 채워 주세요.');
    if (belowMinimum) {
      return setError(`시급이 ${minimumWage().toLocaleString('ko-KR')}원(최저임금)보다 낮아요.`);
    }
    if (!preview || !preview.route) {
      return setError('근무지 주소를 찾지 못했어요. 지하철역이나 동 이름을 넣어 보세요.');
    }

    addMyJob({
      title: title.trim(),
      companyName: companyName.trim(),
      address: address.trim(),
      hourlyWage: wage,
      dailyWorkHours,
      workTime: `${start} ~ ${end}`,
      workDays: days.length === 7 ? '매일' : days.join('·'),
      transportSubsidyPerDay: Number(subsidy) || 0,
    });

    router.push('/me');
  }

  if (!profile) {
    return (
      <main className="px-5 pb-16 pt-16">
        <EmptyState
          title="로그인이 필요해요."
          description="사장님 계정으로 로그인하면 공고를 올릴 수 있어요."
          action={
            <Link href="/me" className="text-sm font-semibold text-brand">
              로그인하러 가기
            </Link>
          }
        />
      </main>
    );
  }

  if (profile.role !== 'OWNER') {
    return (
      <main className="px-5 pb-16 pt-16">
        <EmptyState
          title="사장님 계정에서만 올릴 수 있어요."
          description={`지금은 '${profile.name}' 구직자 계정으로 로그인되어 있어요. 사장님 계정으로 가입하면 공고를 등록할 수 있습니다.`}
          action={
            <Link href="/me" className="text-sm font-semibold text-brand">
              마이페이지로
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="px-5 pb-16 pt-5">
      <Link href="/me" className="text-lg text-ink" aria-label="마이페이지로">
        ←
      </Link>
      <h1 className="mt-4 text-[19px] font-bold text-ink">공고 등록</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        근무시간과 교통비 지원을 정확히 적을수록, 구직자에게 실질시급이 더 정확하게 보입니다.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="공고 제목 *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="연희동 로스터리 바리스타 (오전)"
            maxLength={40}
            className={inputClass}
          />
        </Field>

        <Field label="사업장 이름 *">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="연희동 로스터리"
            maxLength={30}
            className={inputClass}
          />
        </Field>

        <Field label="근무지 주소 *" hint="도로명·지번 주소나 역 이름을 넣으면 좌표를 찾아옵니다.">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="서울 서대문구 연희동"
            className={inputClass}
          />
        </Field>

        <Field label="시급 *">
          <div className="relative">
            <input
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder={String(minimumWage())}
              className={`${inputClass} tnum pr-8`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
              원
            </span>
          </div>
          {belowMinimum && (
            <p className="mt-1.5 text-[11px] font-semibold text-bad">
              최저임금({won(minimumWage())})보다 낮아요. 이 상태로는 등록할 수 없습니다.
            </p>
          )}
        </Field>

        <div>
          <span className="mb-2 block text-[13px] font-semibold text-ink">근무 시간 *</span>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={`${inputClass} tnum`}
            />
            <span className="text-ink-soft">~</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={`${inputClass} tnum`}
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[12px] text-ink-soft">휴게시간</span>
            <input
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              className="w-16 rounded-lg border border-line px-2 py-1.5 text-[13px] tnum outline-none focus:border-brand"
            />
            <span className="text-[12px] text-ink-soft">분</span>
            <span className="ml-auto text-[12px] font-semibold text-ink tnum">
              하루 {dailyWorkHours ?? '—'}시간
            </span>
          </div>
          {overnight && (
            <p className="mt-1.5 text-[11px] text-amber-700">
              종료가 시작보다 빨라 <b>야간 근무</b>(자정 넘김)로 계산했습니다.
            </p>
          )}
        </div>

        <div>
          <span className="mb-2 block text-[13px] font-semibold text-ink">근무 요일</span>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays((v) => (on ? v.filter((x) => x !== d) : [...v, d]))}
                  aria-pressed={on}
                  className={`rounded-lg border py-2 text-[13px] font-semibold ${
                    on ? 'border-brand bg-blue-50 text-brand' : 'border-line text-ink-soft'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <Field
          label="교통비 지원"
          hint="지원하면 구직자가 보는 실질시급이 올라갑니다. 이 서비스에서 가장 눈에 띄는 차이입니다."
        >
          <select
            value={subsidy}
            onChange={(e) => setSubsidy(e.target.value)}
            className={`${inputClass} tnum`}
          >
            <option value="0">없음</option>
            <option value="1000">일 1,000원</option>
            <option value="2000">일 2,000원</option>
            <option value="3000">일 3,000원</option>
            <option value="5000">일 5,000원</option>
          </select>
        </Field>
      </div>

      {/* ── 미리보기 ── */}
      <h2 className="mb-2.5 mt-8 text-[13px] font-bold text-ink">구직자에게 이렇게 보여요</h2>
      <div className="rounded-card border border-line p-4">
        {!ready ? (
          <p className="text-[12px] text-ink-soft">
            제목·사업장·주소·시급·근무시간을 채우면 실질시급을 미리 계산해 드려요.
          </p>
        ) : previewing ? (
          <p className="text-[12px] text-ink-soft">계산 중…</p>
        ) : preview?.calc && preview.route ? (
          <div className="tnum">
            <div className="text-[12px] text-ink-soft">신촌역에서 출발하는 구직자 기준</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold text-ink">
                {won(preview.calc.realHourlyWage)}
              </span>
              <span
                className={`text-[13px] font-bold ${
                  preview.calc.lossRate >= 0 ? 'text-bad' : 'text-good'
                }`}
              >
                {preview.calc.lossRate >= 0 ? '−' : '+'}
                {percent(Math.abs(preview.calc.lossRate))}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-ink-soft">
              시급 {won(wage)} · 편도 {minutes(preview.route.oneWayMinutes)} · 왕복 교통비{' '}
              {won(preview.calc.dailyCommuteCost)}
            </div>
            {Number(subsidy) > 0 && (
              <div className="mt-1 text-[12px] text-brand">
                교통비 {won(Number(subsidy))} 지원으로 실질시급이 올라갔어요.
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-bad">
            주소를 찾지 못했어요. 지하철역이나 동 이름으로 다시 적어 주세요.
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-[12px] font-semibold text-bad">{error}</p>}

      <button
        onClick={submit}
        disabled={!ready || belowMinimum}
        className="mt-6 w-full rounded-lg bg-brand py-4 text-[15px] font-bold text-white disabled:bg-gray-300"
      >
        공고 등록하기
      </button>

      <p className="mt-4 rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-ink-soft">
        ⓘ 올린 공고는 <b>이 브라우저에만</b> 저장됩니다. 서버로 보내지 않기 때문에 다른 사람의
        검색 결과에는 나오지 않고, 내 검색 결과에서만 함께 비교됩니다.
      </p>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-2 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
