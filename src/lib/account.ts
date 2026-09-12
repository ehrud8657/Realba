/**
 * 계정 · 찜 · 내 출발지 · 기본 검색 조건 저장소
 *
 * ★ 지금은 브라우저(localStorage)에만 저장합니다. 서버도 DB도 쓰지 않습니다.
 *   그래서 기기를 바꾸면 사라지고, 진짜 인증이 아닙니다. 보고서에 쓸 때 이 점을 밝히세요.
 *
 * 화면은 이 파일의 함수만 부르고 localStorage를 직접 건드리지 않습니다.
 * 나중에 카카오 로그인 + 서버 저장으로 바꿀 때 이 파일만 갈아끼우면 화면은 그대로입니다.
 *
 * ⚠️ 비밀번호는 받지 않습니다. 사용자가 평소 쓰는 비밀번호를 입력하게 만들면
 *    그 값이 브라우저에 남아 실제로 위험합니다. 닉네임만 받습니다.
 */

import type { JobSource, TransportMode } from '@/types';

const KEY = 'realba:account';

export type UserRole = 'SEEKER' | 'OWNER';

export interface Profile {
  nickname: string;
  role: UserRole;
  createdAt: string;
}

/** 찜한 공고. 목록에서 바로 보여줄 수 있게 공고 요약을 함께 저장합니다 */
export interface FavoriteJob {
  jobId: string;
  title: string;
  companyName: string;
  address: string;
  hourlyWage: number;
  source: JobSource;
  savedAt: string;
  /** 찜할 당시의 계산 결과. 나중에 "그때 vs 지금"을 비교해 보여줍니다 */
  snapshot: {
    realHourlyWage: number;
    lossRate: number;
    hours: number;
    mode: TransportMode;
    origin: string;
  } | null;
}

/** 집·학교처럼 별칭을 붙여 저장해 둔 출발지 */
export interface SavedPlace {
  id: string;
  label: string;
  query: string;
}

export interface Preferences {
  hours: number;
  mode: TransportMode;
  /** 기본 출발지로 쓸 SavedPlace id */
  defaultPlaceId: string | null;
}

export interface AccountState {
  profile: Profile | null;
  favorites: FavoriteJob[];
  places: SavedPlace[];
  prefs: Preferences;
}

export const EMPTY_STATE: AccountState = {
  profile: null,
  favorites: [],
  places: [],
  prefs: { hours: 5, mode: 'TRANSIT', defaultPlaceId: null },
};

/* ── 읽기 / 쓰기 ──────────────────────────────────────────── */

let cache: AccountState | null = null;
const listeners = new Set<() => void>();

export function readAccount(): AccountState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  if (cache) return cache;

  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AccountState>) : null;
    cache = {
      ...EMPTY_STATE,
      ...parsed,
      prefs: { ...EMPTY_STATE.prefs, ...(parsed?.prefs ?? {}) },
      favorites: parsed?.favorites ?? [],
      places: parsed?.places ?? [],
    };
  } catch {
    // 시크릿 모드 등에서 읽기가 막히면 빈 상태로 시작합니다
    cache = EMPTY_STATE;
  }
  return cache;
}

function write(next: AccountState) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막혀도 화면은 계속 동작합니다 (새로고침하면 사라질 뿐)
  }
  listeners.forEach((fn) => fn());
}

function update(fn: (s: AccountState) => AccountState) {
  write(fn(readAccount()));
}

/** useSyncExternalStore용 구독 */
export function subscribeAccount(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바뀐 것도 반영합니다
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/* ── 계정 ────────────────────────────────────────────────── */

export function signUp(nickname: string, role: UserRole = 'SEEKER') {
  const name = nickname.trim();
  if (!name) return;
  update((s) => ({
    ...s,
    profile: { nickname: name, role, createdAt: new Date().toISOString() },
  }));
}

/** 이 기기에 남아 있는 계정으로 다시 들어갑니다 (비밀번호가 없으므로 확인 절차도 없습니다) */
export function signIn(nickname: string) {
  const name = nickname.trim();
  if (!name) return;
  update((s) => ({
    ...s,
    profile: s.profile
      ? { ...s.profile, nickname: name }
      : { nickname: name, role: 'SEEKER', createdAt: new Date().toISOString() },
  }));
}

/** 로그아웃 — 찜과 저장한 출발지는 이 기기에 그대로 남습니다 */
export function signOut() {
  update((s) => ({ ...s, profile: null }));
}

/* ── 찜 ──────────────────────────────────────────────────── */

export function isFavorite(jobId: string) {
  return readAccount().favorites.some((f) => f.jobId === jobId);
}

export function toggleFavorite(fav: Omit<FavoriteJob, 'savedAt'>) {
  update((s) => {
    const exists = s.favorites.some((f) => f.jobId === fav.jobId);
    return {
      ...s,
      favorites: exists
        ? s.favorites.filter((f) => f.jobId !== fav.jobId)
        : [{ ...fav, savedAt: new Date().toISOString() }, ...s.favorites],
    };
  });
}

export function removeFavorite(jobId: string) {
  update((s) => ({ ...s, favorites: s.favorites.filter((f) => f.jobId !== jobId) }));
}

/* ── 내 출발지 ───────────────────────────────────────────── */

export function addPlace(label: string, query: string) {
  const l = label.trim();
  const q = query.trim();
  if (!l || !q) return;

  update((s) => {
    const id = `p${Date.now()}`;
    const places = [...s.places.filter((p) => p.label !== l), { id, label: l, query: q }];
    return {
      ...s,
      places,
      // 첫 출발지는 자동으로 기본이 됩니다
      prefs: { ...s.prefs, defaultPlaceId: s.prefs.defaultPlaceId ?? id },
    };
  });
}

export function removePlace(id: string) {
  update((s) => ({
    ...s,
    places: s.places.filter((p) => p.id !== id),
    prefs: {
      ...s.prefs,
      defaultPlaceId: s.prefs.defaultPlaceId === id ? null : s.prefs.defaultPlaceId,
    },
  }));
}

export function setDefaultPlace(id: string | null) {
  update((s) => ({ ...s, prefs: { ...s.prefs, defaultPlaceId: id } }));
}

/** 기본 출발지 문자열. 없으면 null */
export function defaultOrigin(state: AccountState = readAccount()): string | null {
  const place = state.places.find((p) => p.id === state.prefs.defaultPlaceId);
  return place?.query ?? null;
}

/* ── 기본 검색 조건 ──────────────────────────────────────── */

export function setPreferences(next: Partial<Pick<Preferences, 'hours' | 'mode'>>) {
  update((s) => ({ ...s, prefs: { ...s.prefs, ...next } }));
}
