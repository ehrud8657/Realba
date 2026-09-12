/**
 * 계정 · 찜 · 내 출발지 · 기본 검색 조건 저장소
 *
 * ★ 지금은 브라우저(localStorage)에만 저장합니다. 서버도 DB도 쓰지 않습니다.
 *
 *   그래서 이런 한계가 있습니다. 화면에도 그대로 고지합니다.
 *   - 아이디 중복확인은 **이 기기에 저장된 계정들** 안에서만 검사합니다
 *   - 다른 기기에서는 같은 아이디로 로그인할 수 없습니다
 *   - 브라우저 데이터를 지우면 계정도 함께 사라집니다
 *
 * ⚠️ 비밀번호는 PBKDF2 해시로만 저장하고 원문은 어디에도 남기지 않습니다.
 *    그래도 기기 안 데모 계정이라 실제 보안이 되는 구조가 아닙니다.
 *    화면에서 "실제로 쓰는 비밀번호를 넣지 마세요"라고 안내합니다.
 *
 * 화면은 이 파일의 함수만 부르고 localStorage를 직접 건드리지 않습니다.
 * 나중에 서버 계정으로 바꿀 때 이 파일만 갈아끼우면 화면은 그대로입니다.
 */

import type { JobSource, TransportMode } from '@/types';

const KEY = 'realba:account';
/** 로그인하지 않은 상태에서 찜한 것들이 담기는 자리 */
const GUEST = '__guest__';

export type UserRole = 'SEEKER' | 'OWNER';

export interface Profile {
  /** 로그인 아이디 */
  userId: string;
  /** 이름 */
  name: string;
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

/** 계정 하나에 딸린 데이터 */
interface UserData {
  favorites: FavoriteJob[];
  places: SavedPlace[];
  prefs: Preferences;
}

/** localStorage에 실제로 들어가는 모양 */
interface Persisted {
  accounts: {
    userId: string;
    name: string;
    role: UserRole;
    /** PBKDF2(비밀번호, salt) 결과. 원문은 저장하지 않습니다 */
    passwordHash: string;
    salt: string;
    createdAt: string;
  }[];
  /** 로그인 상태 유지 — 여기 값이 있으면 다음에 열어도 그대로 로그인입니다 */
  sessionUserId: string | null;
  /** 로그인 화면에 미리 채워 둘 아이디 ('아이디 저장' 체크 시) */
  rememberedUserId: string | null;
  data: Record<string, UserData>;
}

/** 화면이 보는 상태 */
export interface AccountState {
  profile: Profile | null;
  favorites: FavoriteJob[];
  places: SavedPlace[];
  prefs: Preferences;
  rememberedUserId: string | null;
  /** 이 기기에 저장된 계정 수 (로그인 안내에 씁니다) */
  accountCount: number;
}

const EMPTY_PREFS: Preferences = { hours: 5, mode: 'TRANSIT', defaultPlaceId: null };
const EMPTY_DATA: UserData = { favorites: [], places: [], prefs: EMPTY_PREFS };

export const EMPTY_STATE: AccountState = {
  profile: null,
  ...EMPTY_DATA,
  rememberedUserId: null,
  accountCount: 0,
};

/* ── 저장소 ──────────────────────────────────────────────── */

let cache: Persisted | null = null;
const listeners = new Set<() => void>();

function load(): Persisted {
  if (cache) return cache;

  const empty: Persisted = {
    accounts: [],
    sessionUserId: null,
    rememberedUserId: null,
    data: {},
  };
  if (typeof window === 'undefined') return empty;

  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Persisted>) : null;
    cache = {
      accounts: parsed?.accounts ?? [],
      sessionUserId: parsed?.sessionUserId ?? null,
      rememberedUserId: parsed?.rememberedUserId ?? null,
      data: parsed?.data ?? {},
    };
  } catch {
    // 시크릿 모드 등에서 읽기가 막히면 빈 상태로 시작합니다
    cache = empty;
  }
  return cache;
}

function save(next: Persisted) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막혀도 화면은 계속 동작합니다 (새로고침하면 사라질 뿐)
  }
  listeners.forEach((fn) => fn());
}

function currentKey(p: Persisted) {
  return p.sessionUserId ?? GUEST;
}

function dataOf(p: Persisted, key = currentKey(p)): UserData {
  const d = p.data[key];
  return {
    favorites: d?.favorites ?? [],
    places: d?.places ?? [],
    prefs: { ...EMPTY_PREFS, ...(d?.prefs ?? {}) },
  };
}

/** 지금 로그인한 사람(또는 비로그인 자리)의 데이터만 바꿉니다 */
function updateData(fn: (d: UserData) => UserData) {
  const p = load();
  const key = currentKey(p);
  save({ ...p, data: { ...p.data, [key]: fn(dataOf(p, key)) } });
}

/** 화면이 쓰는 상태를 만들어 돌려줍니다 */
export function readAccount(): AccountState {
  if (typeof window === 'undefined') return EMPTY_STATE;

  const p = load();
  const account = p.accounts.find((a) => a.userId === p.sessionUserId) ?? null;

  return {
    profile: account
      ? {
          userId: account.userId,
          name: account.name,
          role: account.role,
          createdAt: account.createdAt,
        }
      : null,
    ...dataOf(p),
    rememberedUserId: p.rememberedUserId,
    accountCount: p.accounts.length,
  };
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

/* ── 비밀번호 해싱 ───────────────────────────────────────── */

const PBKDF2_ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

function randomSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

/* ── 입력 검증 ───────────────────────────────────────────── */

export const USER_ID_RULE = '영문·숫자·밑줄 4~20자';
export const PASSWORD_RULE = '6자 이상';

export function validateUserId(userId: string): string | null {
  const v = userId.trim();
  if (!v) return '아이디를 입력해 주세요.';
  if (!/^[A-Za-z0-9_]{4,20}$/.test(v)) return `아이디는 ${USER_ID_RULE}여야 해요.`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return '비밀번호를 입력해 주세요.';
  if (password.length < 6) return `비밀번호는 ${PASSWORD_RULE}이어야 해요.`;
  return null;
}

/**
 * 아이디 중복확인.
 * ⚠️ 이 기기에 저장된 계정들 안에서만 검사합니다. 서버가 없으므로 다른 사람이
 *    같은 아이디로 가입하는 것은 막지 못합니다.
 */
export function isUserIdTaken(userId: string): boolean {
  const v = userId.trim().toLowerCase();
  return load().accounts.some((a) => a.userId.toLowerCase() === v);
}

/* ── 회원가입 · 로그인 ───────────────────────────────────── */

export type AuthResult = { ok: true } | { ok: false; message: string };

export async function signUp(params: {
  name: string;
  userId: string;
  password: string;
  role?: UserRole;
}): Promise<AuthResult> {
  const name = params.name.trim();
  const userId = params.userId.trim();

  if (!name) return { ok: false, message: '이름을 입력해 주세요.' };

  const idError = validateUserId(userId);
  if (idError) return { ok: false, message: idError };

  const pwError = validatePassword(params.password);
  if (pwError) return { ok: false, message: pwError };

  // 중복확인 버튼을 눌렀더라도 제출 시점에 한 번 더 봅니다
  if (isUserIdTaken(userId)) return { ok: false, message: '이미 사용 중인 아이디예요.' };

  const salt = randomSalt();
  const passwordHash = await hashPassword(params.password, salt);

  const p = load();
  // 로그인 전에 찜해 둔 것이 있으면 새 계정으로 옮겨 줍니다
  const guest = dataOf(p, GUEST);
  const carried = guest.favorites.length > 0 || guest.places.length > 0;

  save({
    ...p,
    accounts: [
      ...p.accounts,
      {
        userId,
        name,
        role: params.role ?? 'SEEKER',
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      },
    ],
    sessionUserId: userId,
    data: {
      ...p.data,
      [userId]: carried ? guest : EMPTY_DATA,
      ...(carried ? { [GUEST]: EMPTY_DATA } : {}),
    },
  });

  return { ok: true };
}

export async function signIn(params: {
  userId: string;
  password: string;
  remember?: boolean;
}): Promise<AuthResult> {
  const userId = params.userId.trim();
  const p = load();
  const account = p.accounts.find((a) => a.userId.toLowerCase() === userId.toLowerCase());

  // 아이디가 없는지 비밀번호가 틀렸는지 구분해서 알려주지 않습니다
  const fail: AuthResult = { ok: false, message: '아이디 또는 비밀번호가 맞지 않아요.' };
  if (!account) {
    return p.accounts.length === 0
      ? { ok: false, message: '이 기기에 저장된 계정이 없어요. 회원가입을 먼저 해주세요.' }
      : fail;
  }

  const hash = await hashPassword(params.password, account.salt);
  if (hash !== account.passwordHash) return fail;

  save({
    ...p,
    sessionUserId: account.userId,
    rememberedUserId: params.remember ? account.userId : null,
  });
  return { ok: true };
}

/** 로그아웃 — 찜과 저장한 출발지는 계정에 그대로 남습니다 */
export function signOut() {
  const p = load();
  save({ ...p, sessionUserId: null });
}

/* ── 찜 ──────────────────────────────────────────────────── */

export function isFavorite(jobId: string) {
  return readAccount().favorites.some((f) => f.jobId === jobId);
}

export function toggleFavorite(fav: Omit<FavoriteJob, 'savedAt'>) {
  updateData((d) => {
    const exists = d.favorites.some((f) => f.jobId === fav.jobId);
    return {
      ...d,
      favorites: exists
        ? d.favorites.filter((f) => f.jobId !== fav.jobId)
        : [{ ...fav, savedAt: new Date().toISOString() }, ...d.favorites],
    };
  });
}

export function removeFavorite(jobId: string) {
  updateData((d) => ({ ...d, favorites: d.favorites.filter((f) => f.jobId !== jobId) }));
}

/* ── 내 출발지 ───────────────────────────────────────────── */

export function addPlace(label: string, query: string) {
  const l = label.trim();
  const q = query.trim();
  if (!l || !q) return;

  updateData((d) => {
    const id = `p${Date.now()}`;
    return {
      ...d,
      places: [...d.places.filter((p) => p.label !== l), { id, label: l, query: q }],
      // 첫 출발지는 자동으로 기본이 됩니다
      prefs: { ...d.prefs, defaultPlaceId: d.prefs.defaultPlaceId ?? id },
    };
  });
}

export function removePlace(id: string) {
  updateData((d) => ({
    ...d,
    places: d.places.filter((p) => p.id !== id),
    prefs: {
      ...d.prefs,
      defaultPlaceId: d.prefs.defaultPlaceId === id ? null : d.prefs.defaultPlaceId,
    },
  }));
}

export function setDefaultPlace(id: string | null) {
  updateData((d) => ({ ...d, prefs: { ...d.prefs, defaultPlaceId: id } }));
}

/** 기본 출발지 문자열. 없으면 null */
export function defaultOrigin(state: AccountState = readAccount()): string | null {
  const place = state.places.find((p) => p.id === state.prefs.defaultPlaceId);
  return place?.query ?? null;
}

/* ── 기본 검색 조건 ──────────────────────────────────────── */

export function setPreferences(next: Partial<Pick<Preferences, 'hours' | 'mode'>>) {
  updateData((d) => ({ ...d, prefs: { ...d.prefs, ...next } }));
}
