/**
 * S-08 마이페이지
 *
 * 로그인 전에는 로그인/회원가입 안내만 보여주고, 계정이 생기면 본 화면을 보여줍니다.
 * 계정·찜·출발지는 전부 이 브라우저에만 저장됩니다 (→ lib/account.ts).
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TransportMode } from '@/types';
import {
  addPlace,
  defaultOrigin,
  removeFavorite,
  removePlace,
  setDefaultPlace,
  setPreferences,
  signOut,
  signUp,
  signIn,
  type UserRole,
} from '@/lib/account';
import { useAccount } from '@/lib/useAccount';
import { percent, won } from '@/lib/format';
import WorkHoursSlider from '@/components/WorkHoursSlider';
import SourceBadge from '@/components/SourceBadge';
import EmptyState from '@/components/EmptyState';
import { LogoMark } from '@/components/Logo';

const MODES: [TransportMode, string][] = [
  ['TRANSIT', '대중교통'],
  ['TAXI', '택시'],
  ['CAR', '자가용'],
];

export default function MyPage() {
  const account = useAccount();
  return account.profile ? <Profile /> : <Gate hasLocalData={account.favorites.length > 0} />;
}

/* ── 로그인 전 ───────────────────────────────────────────── */

function Gate({ hasLocalData }: { hasLocalData: boolean }) {
  const [tab, setTab] = useState<'SIGN_UP' | 'SIGN_IN' | null>(null);
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<UserRole>('SEEKER');

  if (!tab) {
    return (
      <main className="px-5 pb-16 pt-16 text-center">
        <div className="flex justify-center">
          <LogoMark size={64} />
        </div>
        <h1 className="mt-5 text-[19px] font-bold text-ink">로그인이 필요해요</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          로그인하면 찜한 공고와 자주 쓰는 출발지를
          <br />
          저장해 두고 바로 꺼내 쓸 수 있어요.
        </p>

        <button
          onClick={() => setTab('SIGN_UP')}
          className="mt-8 w-full rounded-lg bg-brand py-4 text-[15px] font-bold text-white active:bg-brand-deep"
        >
          회원가입
        </button>
        <button
          onClick={() => setTab('SIGN_IN')}
          className="mt-2.5 w-full rounded-lg border border-line py-4 text-[15px] font-bold text-ink"
        >
          로그인
        </button>

        {hasLocalData && (
          <p className="mt-4 text-[11px] text-ink-soft">
            이 기기에 저장해 둔 찜이 남아 있어요. 로그인하면 다시 보입니다.
          </p>
        )}
        <LocalNotice />
      </main>
    );
  }

  const isSignUp = tab === 'SIGN_UP';

  return (
    <main className="px-5 pb-16 pt-5">
      <button onClick={() => setTab(null)} className="text-lg text-ink" aria-label="뒤로">
        ←
      </button>

      <h1 className="mt-4 text-[19px] font-bold text-ink">{isSignUp ? '회원가입' : '로그인'}</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        {isSignUp
          ? '닉네임만 있으면 됩니다. 비밀번호는 받지 않아요.'
          : '이 기기에서 쓰던 닉네임을 넣어 주세요.'}
      </p>

      <div className="mt-6">
        <label htmlFor="nickname" className="mb-2 block text-[13px] font-semibold text-ink">
          닉네임
        </label>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nickname.trim()) {
              isSignUp ? signUp(nickname, role) : signIn(nickname);
            }
          }}
          placeholder="예) 신촌알바러"
          maxLength={20}
          className="w-full rounded-lg border border-line px-3.5 py-3 text-sm outline-none focus:border-brand"
        />
      </div>

      {isSignUp && (
        <div className="mt-5">
          <span className="mb-2 block text-[13px] font-semibold text-ink">어떤 분이신가요?</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['SEEKER', '알바 찾는 중'],
                ['OWNER', '사장님'],
              ] as [UserRole, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                aria-pressed={role === value}
                className={`rounded-lg border py-3 text-[13px] font-semibold ${
                  role === value ? 'border-brand bg-blue-50 text-brand' : 'border-line text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => (isSignUp ? signUp(nickname, role) : signIn(nickname))}
        disabled={!nickname.trim()}
        className="mt-8 w-full rounded-lg bg-brand py-4 text-[15px] font-bold text-white disabled:bg-gray-300"
      >
        {isSignUp ? '시작하기' : '로그인'}
      </button>

      <LocalNotice />
    </main>
  );
}

function LocalNotice() {
  return (
    <p className="mt-6 rounded-lg bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-ink-soft">
      ⓘ 지금은 계정을 <b>이 브라우저에만</b> 저장합니다. 서버로 보내지 않기 때문에 다른 기기에서는
      보이지 않고, 브라우저 데이터를 지우면 함께 사라집니다.
    </p>
  );
}

/* ── 로그인 후 ───────────────────────────────────────────── */

function Profile() {
  const account = useAccount();
  const { profile, favorites, places, prefs } = account;
  if (!profile) return null;

  const origin = defaultOrigin(account) ?? '신촌역';
  const searchQuery = new URLSearchParams({
    origin,
    keyword: '',
    hours: String(prefs.hours),
    mode: prefs.mode,
  }).toString();

  const withSnapshot = favorites.filter((f) => f.snapshot);
  const avgReal =
    withSnapshot.length > 0
      ? Math.round(
          withSnapshot.reduce((sum, f) => sum + (f.snapshot?.realHourlyWage ?? 0), 0) /
            withSnapshot.length,
        )
      : null;

  return (
    <main className="px-5 pb-16 pt-6">
      <div className="flex items-center gap-3">
        <LogoMark size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-bold text-ink">{profile.nickname}</div>
          <div className="text-[12px] text-ink-soft">
            {profile.role === 'OWNER' ? '사장님' : '구직자'}
          </div>
        </div>
        <button onClick={signOut} className="text-[12px] font-semibold text-ink-soft">
          로그아웃
        </button>
      </div>

      {avgReal !== null && (
        <p className="mt-4 rounded-card bg-blue-50 px-4 py-3 text-[12px] text-brand tnum">
          찜한 공고 {withSnapshot.length}건의 평균 실질시급은 <b>{won(avgReal)}</b>이에요.
        </p>
      )}

      {/* ── 찜한 공고 ── */}
      <h2 className="mb-2.5 mt-7 text-[13px] font-bold text-ink">♥ 찜한 공고 ({favorites.length})</h2>
      {favorites.length === 0 ? (
        <EmptyState
          title="아직 찜한 공고가 없어요."
          description="검색 결과나 상세 화면에서 ♡를 누르면 여기에 모입니다."
          action={
            <Link href={`/search?${searchQuery}`} className="text-sm font-semibold text-brand">
              공고 보러 가기
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {favorites.map((f) => (
            <li key={f.jobId} className="rounded-card border border-line p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <SourceBadge source={f.source} />
                  <Link
                    href={`/jobs/${f.jobId}?${searchQuery}`}
                    className="mt-1.5 block text-[15px] font-bold leading-snug text-ink"
                  >
                    {f.title}
                  </Link>
                  <div className="mt-0.5 text-[12px] text-ink-soft">
                    {f.companyName} · {f.address}
                  </div>
                </div>
                <button
                  onClick={() => removeFavorite(f.jobId)}
                  aria-label="찜 해제"
                  className="text-lg leading-none text-bad"
                >
                  ♥
                </button>
              </div>

              {f.snapshot ? (
                <div className="mt-2.5 text-[13px] tnum">
                  <span className="text-ink-soft">시급 {won(f.hourlyWage)}</span>
                  <span className="ml-2 font-bold text-ink">
                    실질 {won(f.snapshot.realHourlyWage)}
                  </span>
                  <span className="ml-1.5 font-bold text-bad">
                    −{percent(Math.abs(f.snapshot.lossRate))}
                  </span>
                  <div className="mt-1 text-[11px] text-ink-soft">
                    {f.snapshot.origin} 출발 · 하루 {f.snapshot.hours}시간 기준으로 찜했어요
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 text-[13px] text-ink-soft tnum">시급 {won(f.hourlyWage)}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── 내 출발지 ── */}
      <h2 className="mb-2.5 mt-8 text-[13px] font-bold text-ink">📍 내 출발지</h2>
      <PlaceList places={places} defaultId={prefs.defaultPlaceId} />

      {/* ── 기본 검색 조건 ── */}
      <h2 className="mb-2.5 mt-8 text-[13px] font-bold text-ink">⚙️ 기본 검색 조건</h2>
      <div className="space-y-4 rounded-card border border-line p-4">
        <WorkHoursSlider
          value={prefs.hours}
          onChange={(v) => setPreferences({ hours: v })}
          label="하루 근무시간"
        />
        <div>
          <span className="mb-2 block text-xs font-semibold text-ink">이동수단</span>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreferences({ mode: value })}
                aria-pressed={prefs.mode === value}
                className={`rounded-lg border py-2 text-[13px] font-semibold ${
                  prefs.mode === value
                    ? 'border-brand bg-blue-50 text-brand'
                    : 'border-line text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-ink-soft">홈 화면을 열면 이 값으로 시작합니다.</p>
      </div>

      <LocalNotice />
    </main>
  );
}

function PlaceList({
  places,
  defaultId,
}: {
  places: { id: string; label: string; query: string }[];
  defaultId: string | null;
}) {
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');

  function add() {
    addPlace(label, query);
    setLabel('');
    setQuery('');
  }

  return (
    <div className="rounded-card border border-line p-4">
      {places.length === 0 ? (
        <p className="text-[12px] text-ink-soft">
          집·학교처럼 자주 쓰는 출발지를 저장해 두면 검색할 때 바로 꺼내 쓸 수 있어요.
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {places.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <button
                onClick={() => setDefaultPlace(p.id)}
                aria-pressed={defaultId === p.id}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  defaultId === p.id
                    ? 'border-brand bg-blue-50 text-brand'
                    : 'border-line text-ink-soft'
                }`}
              >
                {defaultId === p.id ? '기본' : '기본으로'}
              </button>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                <b>{p.label}</b> <span className="text-ink-soft">{p.query}</span>
              </span>
              <button
                onClick={() => removePlace(p.id)}
                aria-label={`${p.label} 삭제`}
                className="text-[12px] text-ink-soft"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="집"
          maxLength={10}
          aria-label="출발지 별칭"
          className="w-20 rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="서울 서대문구 연희동"
          aria-label="출발지 주소"
          className="min-w-0 flex-1 rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
        <button
          onClick={add}
          disabled={!label.trim() || !query.trim()}
          className="rounded-lg bg-ink px-3 text-[13px] font-semibold text-white disabled:bg-gray-300"
        >
          추가
        </button>
      </div>
    </div>
  );
}
