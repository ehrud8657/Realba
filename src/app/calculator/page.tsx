'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { calcRealWage } from '@/lib/calc';
import { won, minutes, percent } from '@/lib/format';
import type { Route } from '@/types';

type TravelMode = 'WALK' | 'BUS' | 'TAXI';
const modes: [TravelMode, string][] = [['WALK', '도보'], ['BUS', '버스'], ['TAXI', '택시']];
type Result = { routes: Record<TravelMode, Route>; source: 'estimate' | 'same-place'; origin: string; destination: string };
const inputClass = 'mt-2 w-full min-w-0 rounded-xl border border-line bg-gray-50 px-4 py-3.5 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-blue-100';

export default function CalculatorPage() {
  const [mode, setMode] = useState<TravelMode>('BUS');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [wage, setWage] = useState('12000');
  const [hours, setHours] = useState('5');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const cache = useRef(new Map<string, Result>());
  const hourlyWage = Number(wage);
  const dailyWorkHours = Number(hours);
  const validNumbers = Number.isInteger(hourlyWage) && hourlyWage > 0 && hourlyWage <= 1000000
    && Number.isFinite(dailyWorkHours) && dailyWorkHours > 0 && dailyWorkHours <= 24;
  const route = result?.routes[mode];
  const calc = result && validNumbers ? calcRealWage({ hourlyWage, dailyWorkHours, ...result.routes[mode] }) : null;

  function editPlace(value: string, setter: (v: string) => void) {
    revision.current += 1;
    setter(value); setResult(null); setError(''); setLoading(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validNumbers || !origin.trim() || !destination.trim() || loading) return;
    const key = JSON.stringify([origin.trim(), destination.trim()]);
    const saved = cache.current.get(key);
    if (saved) { setResult(saved); setError(''); return; }
    const current = ++revision.current;
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/calculator', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: origin.trim(), destination: destination.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '계산하지 못했어요. 다시 시도해주세요.');
      if (current !== revision.current) return;
      cache.current.set(key, data); setResult(data);
    } catch (e) {
      if (current === revision.current) setError(e instanceof Error ? e.message : '연결을 확인해주세요.');
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }

  return (
    <main className="px-5 pb-10 pt-7">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-ink-soft">← 홈으로</Link>
      <div className="mt-4 flex items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand">간편 계산</span><span className="text-xs text-ink-soft">{modes.find(([key]) => key === mode)?.[1]} 기준</span></div>
      <h1 className="mt-4 text-[24px] font-bold leading-snug text-ink">이 알바, 진짜 시급은?</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">공고가 없어도 괜찮아요.<br />장소 두 곳과 시급, 근무시간만 알려주세요.</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block text-[13px] font-semibold text-ink" htmlFor="calc-origin">출발지
          <input id="calc-origin" required maxLength={150} autoComplete="off" className={inputClass} placeholder="예: 신촌역 또는 집 주소" value={origin} onChange={e => editPlace(e.target.value, setOrigin)} />
        </label>
        <label className="block text-[13px] font-semibold text-ink" htmlFor="calc-destination">도착지
          <input id="calc-destination" required maxLength={150} autoComplete="off" className={inputClass} placeholder="예: 강남역 또는 근무지 주소" value={destination} onChange={e => editPlace(e.target.value, setDestination)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0 text-[13px] font-semibold text-ink" htmlFor="calc-wage">시급 (원)
            <input id="calc-wage" type="number" inputMode="numeric" required min="1" max="1000000" step="1" className={inputClass} value={wage} onChange={e => setWage(e.target.value)} />
          </label>
          <label className="min-w-0 text-[13px] font-semibold text-ink" htmlFor="calc-hours">하루 근무 (시간)
            <input id="calc-hours" type="number" inputMode="decimal" required min="0.1" max="24" step="any" className={inputClass} value={hours} onChange={e => setHours(e.target.value)} />
          </label>
        </div>
        <button disabled={loading || !validNumbers || !origin.trim() || !destination.trim()} className="w-full rounded-xl bg-brand py-4 text-[15px] font-bold text-white transition hover:bg-brand-deep disabled:bg-gray-300" type="submit">{loading ? '이동시간과 교통비 확인 중…' : result ? '다시 계산하기' : '내 실질시급 계산하기 →'}</button>
      </form>
      <div role="group" aria-label="이동수단 선택" className="mt-5 grid grid-cols-3 gap-2">
        {modes.map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)} className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition ${mode === key ? 'border-brand bg-blue-50 text-brand' : 'border-line bg-white text-ink-soft'}`}>{label}</button>)}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-bad">{error}</p>}
      {loading && <div role="status" className="mt-6 animate-pulse rounded-card bg-blue-50 p-6 text-sm text-brand">두 장소 사이의 경로를 확인하고 있어요.</div>}
      {calc && result && route && <section aria-live="polite" aria-label="계산 결과" className="mt-6 rounded-card border border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold text-ink">내 실질시급</h2><span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-brand">{result.source === 'same-place' ? '같은 장소' : '이동시간·요금 추정'}</span></div>
        <p className="mt-4 text-xs text-ink-soft">입력 시급 <span className="line-through">{won(hourlyWage)}</span></p>
        <p className="mt-1 break-words text-[32px] font-bold tracking-tight text-brand tnum">{won(calc.realHourlyWage)}<span className="ml-1 text-sm font-medium">/ 시간</span></p>
        <p className="mt-2 text-xs text-ink-soft">표시 시급보다 {percent(Math.abs(calc.lossRate))} {calc.lossRate >= 0 ? '감소' : '증가'}</p>
        <p className="mt-4 break-words text-xs text-ink-soft">{result.origin} → {result.destination}</p>
        <dl className="mt-4 space-y-3 border-t border-blue-100 pt-4 text-sm">
          {[
            ['왕복 이동시간', minutes(route.oneWayMinutes * 2)],
            ['왕복 교통비', won(calc.dailyCommuteCost)],
            ['하루 교통비 제외 수입', won(calc.dailyNetPay)],
            ['근무 + 왕복 이동', `${calc.totalOccupiedHours}시간`],
          ].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-ink-soft">{label}</dt><dd className="font-semibold text-ink tnum">{value}</dd></div>)}
        </dl>
        {calc.dailyNetPay < 0 && <p className="mt-4 text-xs text-bad">왕복 교통비가 하루 급여보다 많아요.</p>}
        {result.source === 'estimate' && <p className="mt-4 text-xs leading-relaxed text-ink-soft">{mode === 'WALK' ? '직선거리에 우회계수와 시속 4km를 적용한 도보 추정입니다. 보행 가능 여부는 확인하지 않습니다.' : mode === 'BUS' ? '버스 시간·요금은 거리 기반 대중교통 추정식으로 계산합니다. 실제 버스 노선·배차·환승을 조회한 값이 아닙니다.' : '서울 중형택시 기준 거리·시간 추정입니다. 실제 도로·정체·할증에 따라 달라집니다.'}</p>}
        <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">(시급 × 근무시간 − 왕복 교통비) ÷ (근무시간 + 왕복 이동시간)<br />준비시간·세금·주휴수당은 포함하지 않습니다.</p>
      </section>}
      <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-soft">장소 확인 후 이동수단·시급·근무시간을 바꾸면 바로 다시 계산돼요.</p>
    </main>
  );
}
