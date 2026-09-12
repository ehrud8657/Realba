/**
 * S-08 마이페이지
 *
 * 로그인 전에는 회원가입/로그인 화면, 계정이 생기면 본 화면을 보여줍니다.
 * 계정·찜·출발지는 전부 이 브라우저에만 저장됩니다 (→ lib/account.ts).
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TransportMode } from '@/types';
import {
  PASSWORD_RULE,
  USER_ID_RULE,
  addPlace,
  defaultOrigin,
  isUserIdTaken,
  removeFavorite,
  removeMyJob,
  removePlace,
  setDefaultPlace,
  setPreferences,
  signIn,
  signOut,
  signUp,
  validatePassword,
  validateUserId,
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

const inputClass =
  'w-full rounded-lg border border-line px-3.5 py-3 text-sm outline-none focus:border-brand';

export default function MyPage() {
  const account = useAccount();
  return account.profile ? <Profile /> : <Gate hasGuestData={account.favorites.length > 0} />;
}

/* ── 로그인 전 ───────────────────────────────────────────── */

function Gate({ hasGuestData }: { hasGuestData: boolean }) {
  const { rememberedUserId, accountCount } = useAccount();
  const [tab, setTab] = useState<'SIGN_UP' | 'SIGN_IN' | null>(null);

  if (tab === 'SIGN_UP') {
    return <SignUpForm onBack={() => setTab(null)} onGoSignIn={() => setTab('SIGN_IN')} />;
  }
  if (tab === 'SIGN_IN') {
    return (
      <SignInForm
        onBack={() => setTab(null)}
        onGoSignUp={() => setTab('SIGN_UP')}
        rememberedUserId={rememberedUserId}
        accountCount={accountCount}
      />
    );
  }

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

      {hasGuestData && (
        <p className="mt-4 text-[11px] text-ink-soft">
          로그인 전에 찜해 둔 공고가 있어요. 회원가입하면 새 계정으로 옮겨집니다.
        </p>
      )}
      <LocalNotice />
    </main>
  );
}

function SignUpForm({ onBack, onGoSignIn }: { onBack: () => void; onGoSignIn: () => void }) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState<UserRole>('SEEKER');
  /** 중복확인 결과. 아이디를 다시 고치면 초기화됩니다 */
  const [idCheck, setIdCheck] = useState<{ userId: string; available: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checkedForCurrent = idCheck !== null && idCheck.userId === userId.trim();
  const idOk = checkedForCurrent && idCheck.available;

  function checkId() {
    const value = userId.trim();
    const invalid = validateUserId(value);
    if (invalid) {
      setIdCheck(null);
      setError(invalid);
      return;
    }
    setError(null);
    setIdCheck({ userId: value, available: !isUserIdTaken(value) });
  }

  async function submit() {
    setError(null);

    if (!name.trim()) return setError('이름을 입력해 주세요.');

    const idError = validateUserId(userId);
    if (idError) return setError(idError);
    if (!idOk) return setError('아이디 중복확인을 해주세요.');

    const pwError = validatePassword(password);
    if (pwError) return setError(pwError);
    if (password !== password2) return setError('비밀번호가 서로 달라요.');

    setBusy(true);
    const result = await signUp({ name, userId, password, role });
    setBusy(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <main className="px-5 pb-16 pt-5">
      <button onClick={onBack} className="text-lg text-ink" aria-label="뒤로">
        ←
      </button>

      <h1 className="mt-4 text-[19px] font-bold text-ink">회원가입</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">이 기기에 계정을 만들어 둡니다.</p>

      <div className="mt-6 space-y-4">
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            maxLength={20}
            className={inputClass}
          />
        </Field>

        <div>
          <span className="mb-2 block text-[13px] font-semibold text-ink">아이디</span>
          <div className="flex gap-2">
            <input
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setIdCheck(null);
              }}
              placeholder="realba_user"
              maxLength={20}
              autoComplete="username"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button
              type="button"
              onClick={checkId}
              className="shrink-0 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink"
            >
              중복확인
            </button>
          </div>
          {checkedForCurrent ? (
            <p className={`mt-1.5 text-[11px] ${idCheck.available ? 'text-good' : 'text-bad'}`}>
              {idCheck.available ? '사용할 수 있는 아이디예요.' : '이미 사용 중인 아이디예요.'}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-ink-soft">{USER_ID_RULE}</p>
          )}
        </div>

        <Field label="비밀번호" hint={PASSWORD_RULE}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>

        <Field label="비밀번호 확인">
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>

        <div>
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
      </div>

      {error && <p className="mt-4 text-[12px] font-semibold text-bad">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-brand py-4 text-[15px] font-bold text-white disabled:bg-gray-300"
      >
        {busy ? '만드는 중…' : '가입하고 시작하기'}
      </button>

      <button onClick={onGoSignIn} className="mt-3 w-full text-[12px] text-ink-soft">
        이미 계정이 있어요 — 로그인
      </button>

      <PasswordNotice />
      <LocalNotice />
    </main>
  );
}

function SignInForm({
  onBack,
  onGoSignUp,
  rememberedUserId,
  accountCount,
}: {
  onBack: () => void;
  onGoSignUp: () => void;
  rememberedUserId: string | null;
  accountCount: number;
}) {
  const [userId, setUserId] = useState(rememberedUserId ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(Boolean(rememberedUserId));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const result = await signIn({ userId, password, remember });
    setBusy(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <main className="px-5 pb-16 pt-5">
      <button onClick={onBack} className="text-lg text-ink" aria-label="뒤로">
        ←
      </button>

      <h1 className="mt-4 text-[19px] font-bold text-ink">로그인</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        {accountCount === 0
          ? '이 기기에 저장된 계정이 아직 없어요.'
          : '이 기기에서 만든 계정으로 들어갑니다.'}
      </p>

      <div className="mt-6 space-y-4">
        <Field label="아이디">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoComplete="username"
            className={inputClass}
          />
        </Field>

        <Field label="비밀번호">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoComplete="current-password"
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          아이디 저장
        </label>
      </div>

      {error && <p className="mt-4 text-[12px] font-semibold text-bad">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-brand py-4 text-[15px] font-bold text-white disabled:bg-gray-300"
      >
        {busy ? '확인 중…' : '로그인'}
      </button>

      <button onClick={onGoSignUp} className="mt-3 w-full text-[12px] text-ink-soft">
        계정이 없어요 — 회원가입
      </button>

      <LocalNotice />
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

function PasswordNotice() {
  return (
    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-left text-[11px] leading-relaxed text-amber-800">
      ⚠️ <b>데모용 계정입니다.</b> 비밀번호는 해시로만 저장하고 원문은 남기지 않지만, 서버가 없는
      기기 안 계정이라 실제 보안이 되는 구조가 아닙니다. <b>평소 쓰시는 비밀번호는 넣지 마세요.</b>
    </p>
  );
}

function LocalNotice() {
  return (
    <p className="mt-6 rounded-lg bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-ink-soft">
      ⓘ 계정을 <b>이 브라우저에만</b> 저장합니다. 아이디 중복확인도 이 기기에 저장된 계정들 안에서만
      검사하고, 다른 기기에서는 같은 아이디로 로그인할 수 없습니다. 브라우저 데이터를 지우면 함께
      사라집니다.
    </p>
  );
}

/* ── 로그인 후 ───────────────────────────────────────────── */

function Profile() {
  const account = useAccount();
  const { profile, favorites, places, prefs, myJobs } = account;
  if (!profile) return null;

  const isOwner = profile.role === 'OWNER';

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
          <div className="truncate text-[17px] font-bold text-ink">{profile.name}</div>
          <div className="text-[12px] text-ink-soft">
            @{profile.userId} · {profile.role === 'OWNER' ? '사장님' : '구직자'}
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

      {/* ── 내가 올린 공고 (사장님 계정만) ── */}
      {isOwner && (
        <>
          <div className="mb-2.5 mt-7 flex items-center">
            <h2 className="text-[13px] font-bold text-ink">📢 내가 올린 공고 ({myJobs.length})</h2>
            <Link
              href="/employer/new"
              className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white"
            >
              + 공고 등록
            </Link>
          </div>

          {myJobs.length === 0 ? (
            <div className="rounded-card border border-line p-4 text-[12px] text-ink-soft">
              아직 올린 공고가 없어요. 등록하면 내 검색 결과에 함께 나와서, 구직자에게 실질시급이
              얼마로 보이는지 확인할 수 있습니다.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {myJobs.map((j) => (
                <li key={j.id} className="rounded-card border border-line p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold leading-snug text-ink">{j.title}</div>
                      <div className="mt-0.5 text-[12px] text-ink-soft">
                        {j.companyName} · {j.address}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMyJob(j.id)}
                      aria-label={`${j.title} 삭제`}
                      className="text-[12px] text-ink-soft"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-soft tnum">
                    <span>시급 {won(j.hourlyWage)}</span>
                    <span>
                      ⏱ {j.workTime ?? ''} ({j.dailyWorkHours}시간)
                    </span>
                    {j.workDays && <span>{j.workDays}</span>}
                    {j.transportSubsidyPerDay > 0 && (
                      <span className="text-brand">교통비 {won(j.transportSubsidyPerDay)} 지원</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ── 찜한 공고 ── */}
      <h2 className="mb-2.5 mt-7 text-[13px] font-bold text-ink">
        ♥ 찜한 공고 ({favorites.length})
      </h2>
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
