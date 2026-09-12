/**
 * 怨꾩젙 쨌 李?쨌 ??異쒕컻吏 쨌 湲곕낯 寃??議곌굔 ??μ냼
 *
 * ??吏湲덉? 釉뚮씪?곗?(localStorage)?먮쭔 ??ν빀?덈떎. ?쒕쾭??DB???곗? ?딆뒿?덈떎.
 *
 *   洹몃옒???대윴 ?쒓퀎媛 ?덉뒿?덈떎. ?붾㈃?먮룄 洹몃?濡?怨좎??⑸땲??
 *   - ?꾩씠??以묐났?뺤씤? **??湲곌린????λ맂 怨꾩젙??* ?덉뿉?쒕쭔 寃?ы빀?덈떎
 *   - ?ㅻⅨ 湲곌린?먯꽌??媛숈? ?꾩씠?붾줈 濡쒓렇?명븷 ???놁뒿?덈떎
 *   - 釉뚮씪?곗? ?곗씠?곕? 吏?곕㈃ 怨꾩젙???④퍡 ?щ씪吏묐땲??
 *
 * ?좑툘 鍮꾨?踰덊샇??PBKDF2 ?댁떆濡쒕쭔 ??ν븯怨??먮Ц? ?대뵒?먮룄 ?④린吏 ?딆뒿?덈떎.
 *    洹몃옒??湲곌린 ???곕え 怨꾩젙?대씪 ?ㅼ젣 蹂댁븞???섎뒗 援ъ“媛 ?꾨떃?덈떎.
 *    ?붾㈃?먯꽌 "?ㅼ젣濡??곕뒗 鍮꾨?踰덊샇瑜??ｌ? 留덉꽭???쇨퀬 ?덈궡?⑸땲??
 *
 * ?붾㈃? ???뚯씪???⑥닔留?遺瑜닿퀬 localStorage瑜?吏곸젒 嫄대뱶由ъ? ?딆뒿?덈떎.
 * ?섏쨷???쒕쾭 怨꾩젙?쇰줈 諛붽? ?????뚯씪留?媛덉븘?쇱슦硫??붾㈃? 洹몃?濡쒖엯?덈떎.
 */

import type { JobSource, TransportMode } from '@/types';

const KEY = 'realba:account';
/** 濡쒓렇?명븯吏 ?딆? ?곹깭?먯꽌 李쒗븳 寃껊뱾???닿린???먮━ */
const GUEST = '__guest__';

export type UserRole = 'SEEKER' | 'OWNER';

export interface Profile {
  /** 濡쒓렇???꾩씠??*/
  userId: string;
  /** ?대쫫 */
  name: string;
  role: UserRole;
  createdAt: string;
}

/** 李쒗븳 怨듦퀬. 紐⑸줉?먯꽌 諛붾줈 蹂댁뿬以????덇쾶 怨듦퀬 ?붿빟???④퍡 ??ν빀?덈떎 */
export interface FavoriteJob {
  jobId: string;
  title: string;
  companyName: string;
  address: string;
  hourlyWage: number;
  source: JobSource;
  savedAt: string;
  /** 李쒗븷 ?뱀떆??怨꾩궛 寃곌낵. ?섏쨷??"洹몃븣 vs 吏湲???鍮꾧탳??蹂댁뿬以띾땲??*/
  snapshot: {
    realHourlyWage: number;
    lossRate: number;
    hours: number;
    mode: TransportMode;
    origin: string;
  } | null;
}

/**
 * ?ъ옣?섏씠 吏곸젒 ?щ┛ 怨듦퀬.
 * 醫뚰몴????ν븯吏 ?딄퀬, 寃?됀룸?由щ낫湲????쒕쾭媛 二쇱냼瑜?吏?ㅼ퐫?⑺빀?덈떎
 * (??src/app/api/jobs/preview/route.ts)
 */
export interface OwnerJobDraft {
  id: string;
  title: string;
  companyName: string;
  address: string;
  hourlyWage: number;
  dailyWorkHours: number;
  /** "09:00 ~ 14:00" */
  workTime?: string;
  /** "??湲? */
  workDays?: string;
  /** ?섎（ 援먰넻鍮?吏?먯븸(?? */
  transportSubsidyPerDay: number;
  postedAt: string;
  deadline?: string;
}

/** 吏뫢룻븰援먯쿂??蹂꾩묶??遺숈뿬 ??ν빐 ??異쒕컻吏 */
export interface SavedPlace {
  id: string;
  label: string;
  query: string;
}

export interface Preferences {
  hours: number;
  mode: TransportMode;
  /** 湲곕낯 異쒕컻吏濡???SavedPlace id */
  defaultPlaceId: string | null;
}

/** 怨꾩젙 ?섎굹???몃┛ ?곗씠??*/
interface UserData {
  favorites: FavoriteJob[];
  places: SavedPlace[];
  prefs: Preferences;
  /** ?ъ옣??怨꾩젙???щ┛ 怨듦퀬 */
  myJobs: OwnerJobDraft[];
}

/** localStorage???ㅼ젣濡??ㅼ뼱媛??紐⑥뼇 */
interface Persisted {
  accounts: {
    userId: string;
    name: string;
    role: UserRole;
    /** PBKDF2(鍮꾨?踰덊샇, salt) 寃곌낵. ?먮Ц? ??ν븯吏 ?딆뒿?덈떎 */
    passwordHash: string;
    salt: string;
    createdAt: string;
  }[];
  /** 濡쒓렇???곹깭 ?좎? ???ш린 媛믪씠 ?덉쑝硫??ㅼ쓬???댁뼱??洹몃?濡?濡쒓렇?몄엯?덈떎 */
  sessionUserId: string | null;
  /** 濡쒓렇???붾㈃??誘몃━ 梨꾩썙 ???꾩씠??('?꾩씠????? 泥댄겕 ?? */
  rememberedUserId: string | null;
  data: Record<string, UserData>;
}

/** ?붾㈃??蹂대뒗 ?곹깭 */
export interface AccountState {
  profile: Profile | null;
  favorites: FavoriteJob[];
  places: SavedPlace[];
  prefs: Preferences;
  myJobs: OwnerJobDraft[];
  rememberedUserId: string | null;
  /** ??湲곌린????λ맂 怨꾩젙 ??(濡쒓렇???덈궡???곷땲?? */
  accountCount: number;
}

const EMPTY_PREFS: Preferences = { hours: 5, mode: 'TRANSIT', defaultPlaceId: null };
const EMPTY_DATA: UserData = { favorites: [], places: [], prefs: EMPTY_PREFS, myJobs: [] };

export const EMPTY_STATE: AccountState = {
  profile: null,
  ...EMPTY_DATA,
  rememberedUserId: null,
  accountCount: 0,
};

/* ?? ??μ냼 ???????????????????????????????????????????????? */

let cache: Persisted | null = null;
let serverProfile: Profile | null = null;
/**
 * ?붾㈃???섍꺼以??곹깭瑜?留뚮뱾???먭퀬 ?ъ궗?⑺빀?덈떎.
 *
 * ??useSyncExternalStore???ㅻ깄?룹쓣 === 濡?鍮꾧탳?⑸땲?? 遺瑜??뚮쭏????媛앹껜瑜?留뚮뱾硫?
 *   React媛 "怨꾩냽 諛붾먮떎"怨?蹂닿퀬 臾댄븳 ?뚮뜑??鍮좎쭛?덈떎 (?ㅼ젣濡??붾㈃?????⑤뒗 ?ш퀬媛 ?ъ뒿?덈떎).
 *   洹몃옒????μ씠 ?쇱뼱???뚮쭔 鍮꾩슦怨? 洹??몄뿉??媛숈? 媛앹껜瑜??뚮젮以띾땲??
 */
let viewCache: AccountState | null = null;
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
    // ?쒗겕由?紐⑤뱶 ?깆뿉???쎄린媛 留됲엳硫?鍮??곹깭濡??쒖옉?⑸땲??
    cache = empty;
  }
  return cache;
}

function save(next: Persisted) {
  cache = next;
  viewCache = null;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ??μ씠 留됲????붾㈃? 怨꾩냽 ?숈옉?⑸땲??(?덈줈怨좎묠?섎㈃ ?щ씪吏?肉?
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
    myJobs: d?.myJobs ?? [],
  };
}

/** 吏湲?濡쒓렇?명븳 ?щ엺(?먮뒗 鍮꾨줈洹몄씤 ?먮━)???곗씠?곕쭔 諛붽퓠?덈떎 */
function updateData(fn: (d: UserData) => UserData) {
  const p = load();
  const key = currentKey(p);
  save({ ...p, data: { ...p.data, [key]: fn(dataOf(p, key)) } });
}

/** ?붾㈃???곕뒗 ?곹깭瑜?留뚮뱾???뚮젮以띾땲??*/
export function readAccount(): AccountState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  if (viewCache) return viewCache;

  const p = load();
  const account = serverProfile ?? p.accounts.find((a) => a.userId === p.sessionUserId) ?? null;

  viewCache = {
    profile: account
      ? {
          userId: account!.userId,
          name: account.name,
          role: account.role,
          createdAt: account.createdAt,
        }
      : null,
    ...dataOf(p),
    rememberedUserId: p.rememberedUserId,
    accountCount: p.accounts.length,
  };
  return viewCache;
}

/** useSyncExternalStore??援щ룆 */
export function subscribeAccount(listener: () => void) {
  listeners.add(listener);
  // ?ㅻⅨ ??뿉??諛붾?寃껊룄 諛섏쁺?⑸땲??
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      viewCache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/* ?? 鍮꾨?踰덊샇 ?댁떛 ????????????????????????????????????????? */

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

/* ?? ?낅젰 寃利?????????????????????????????????????????????? */

export const USER_ID_RULE = '?곷Ц쨌?レ옄쨌諛묒쨪 4~20??;
export const PASSWORD_RULE = '6???댁긽';

export function validateUserId(userId: string): string | null {
  const v = userId.trim();
  if (!v) return '?꾩씠?붾? ?낅젰??二쇱꽭??';
  if (!/^[A-Za-z0-9_]{4,20}$/.test(v)) return `?꾩씠?붾뒗 ${USER_ID_RULE}?ъ빞 ?댁슂.`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return '鍮꾨?踰덊샇瑜??낅젰??二쇱꽭??';
  if (password.length < 6) return `鍮꾨?踰덊샇??${PASSWORD_RULE}?댁뼱???댁슂.`;
  return null;
}

/**
 * ?꾩씠??以묐났?뺤씤.
 * ?좑툘 ??湲곌린????λ맂 怨꾩젙???덉뿉?쒕쭔 寃?ы빀?덈떎. ?쒕쾭媛 ?놁쑝誘濡??ㅻⅨ ?щ엺??
 *    媛숈? ?꾩씠?붾줈 媛?낇븯??寃껋? 留됱? 紐삵빀?덈떎.
 */
export function isUserIdTaken(userId: string): boolean {
  // 以묐났?뺤씤? ?뚯썝媛???붿껌 ???쒕쾭媛 ?먯옄?곸쑝濡?寃?ы빀?덈떎.
  return false;
}

/* ?? ?뚯썝媛??쨌 濡쒓렇??????????????????????????????????????? */

export type AuthResult = { ok: true } | { ok: false; message: string };

export async function signUp(params: {
  name: string;
  userId: string;
  password: string;
  role?: UserRole;
}): Promise<AuthResult> {
  try {
    const response = await fetch('/api/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'signup', ...params }) });
    const result = await response.json();
    if (!response.ok) return { ok: false, message: result.message ?? '?뚯썝媛?낆뿉 ?ㅽ뙣?덉뼱??' };
    serverProfile = result.profile;
    save({ ...load(), sessionUserId: serverProfile?.userId ?? params.userId });
    return { ok: true };
  } catch { return { ok: false, message: '?쒕쾭 ?곌껐???뺤씤??二쇱꽭??' }; }
  const name = params.name.trim();
  const userId = params.userId.trim();

  if (!name) return { ok: false, message: '?대쫫???낅젰??二쇱꽭??' };

  const idError = validateUserId(userId);
  if (idError) return { ok: false, message: idError! };

  const pwError = validatePassword(params.password);
  if (pwError) return { ok: false, message: pwError! };

  // 以묐났?뺤씤 踰꾪듉???뚮??붾씪???쒖텧 ?쒖젏????踰???遊낅땲??
  if (isUserIdTaken(userId)) return { ok: false, message: '?대? ?ъ슜 以묒씤 ?꾩씠?붿삁??' };

  const salt = randomSalt();
  const passwordHash = await hashPassword(params.password, salt);

  const p = load();
  // 濡쒓렇???꾩뿉 李쒗빐 ??寃껋씠 ?덉쑝硫???怨꾩젙?쇰줈 ??꺼 以띾땲??
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
  try {
    const response = await fetch('/api/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'signin', ...params }) });
    const result = await response.json();
    if (!response.ok) return { ok: false, message: result.message ?? '濡쒓렇?몄뿉 ?ㅽ뙣?덉뼱??' };
    serverProfile = result.profile;
    save({ ...load(), sessionUserId: serverProfile?.userId ?? params.userId, rememberedUserId: params.remember ? params.userId : null });
    return { ok: true };
  } catch { return { ok: false, message: '?쒕쾭 ?곌껐???뺤씤??二쇱꽭??' }; }
  const userId = params.userId.trim();
  const p = load();
  const account = p.accounts.find((a) => a.userId.toLowerCase() === userId.toLowerCase());

  // ?꾩씠?붽? ?녿뒗吏 鍮꾨?踰덊샇媛 ??몃뒗吏 援щ텇?댁꽌 ?뚮젮二쇱? ?딆뒿?덈떎
  const fail: AuthResult = { ok: false, message: '?꾩씠???먮뒗 鍮꾨?踰덊샇媛 留욎? ?딆븘??' };
  if (!account) {
    return p.accounts.length === 0
      ? { ok: false, message: '??湲곌린????λ맂 怨꾩젙???놁뼱?? ?뚯썝媛?낆쓣 癒쇱? ?댁＜?몄슂.' }
      : fail;
  }

  const hash = await hashPassword(params.password, account!.salt);
  if (hash !== account!.passwordHash) return fail;

  save({
    ...p,
    sessionUserId: account!.userId,
    rememberedUserId: params.remember ? account!.userId : null,
  });
  return { ok: true };
}

/** 濡쒓렇?꾩썐 ??李쒓낵 ??ν븳 異쒕컻吏??怨꾩젙??洹몃?濡??⑥뒿?덈떎 */
export async function signOut() {
  try { await fetch('/api/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'signout' }) }); } catch { /* local cleanup below */ }
  serverProfile = null;
  const p = load();
  save({ ...p, sessionUserId: null });
}

/* ?? 李????????????????????????????????????????????????????? */

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

/* ?? ??異쒕컻吏 ????????????????????????????????????????????? */

export function addPlace(label: string, query: string) {
  const l = label.trim();
  const q = query.trim();
  if (!l || !q) return;

  updateData((d) => {
    const id = `p${Date.now()}`;
    return {
      ...d,
      places: [...d.places.filter((p) => p.label !== l), { id, label: l, query: q }],
      // 泥?異쒕컻吏???먮룞?쇰줈 湲곕낯???⑸땲??
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

/** 湲곕낯 異쒕컻吏 臾몄옄?? ?놁쑝硫?null */
export function defaultOrigin(state: AccountState = readAccount()): string | null {
  const place = state.places.find((p) => p.id === state.prefs.defaultPlaceId);
  return place?.query ?? null;
}

/* ?? ?ъ옣??怨듦퀬 ??????????????????????????????????????????? */

export function addMyJob(job: Omit<OwnerJobDraft, 'id' | 'postedAt'>): OwnerJobDraft {
  const created: OwnerJobDraft = {
    ...job,
    // 紐⑸뜲?댄꽣 id(o1, s1??? 寃뱀튂吏 ?딄쾶 ?묐몢?щ? 遺숈엯?덈떎
    id: `my-${Date.now().toString(36)}`,
    postedAt: new Date().toISOString().slice(0, 10),
  };
  updateData((d) => ({ ...d, myJobs: [created, ...d.myJobs] }));
  return created;
}

export function updateMyJob(id: string, patch: Partial<OwnerJobDraft>) {
  updateData((d) => ({
    ...d,
    myJobs: d.myJobs.map((j) => (j.id === id ? { ...j, ...patch, id: j.id } : j)),
  }));
}

export function removeMyJob(id: string) {
  updateData((d) => ({ ...d, myJobs: d.myJobs.filter((j) => j.id !== id) }));
}

/* ?? 湲곕낯 寃??議곌굔 ???????????????????????????????????????? */

export function setPreferences(next: Partial<Pick<Preferences, 'hours' | 'mode'>>) {
  updateData((d) => ({ ...d, prefs: { ...d.prefs, ...next } }));
}

