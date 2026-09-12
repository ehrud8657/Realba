import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const ACCESS = 'realba-access';
const REFRESH = 'realba-refresh';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function auth(path: string, body?: object, token?: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('AUTH_CONFIG');
  return fetch(`${url.replace(/\/$/, '')}/auth/v1/${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
}

function profile(user: { id: string; email?: string; created_at: string; user_metadata?: Record<string, string> }) {
  return { userId: user.email?.split('@')[0] ?? user.id, name: user.user_metadata?.name ?? '',
    role: user.user_metadata?.role === 'OWNER' ? 'OWNER' : 'SEEKER', createdAt: user.created_at };
}

function setSession(response: NextResponse, session: { access_token: string; refresh_token: string; expires_in: number }) {
  response.cookies.set(ACCESS, session.access_token, { ...cookieOptions, maxAge: session.expires_in });
  response.cookies.set(REFRESH, session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  return response;
}

function unavailable(error: unknown) {
  return json({ message: error instanceof Error && error.message === 'AUTH_CONFIG'
    ? '계정 서버 연결 설정이 필요해요. 관리자에게 문의해 주세요.'
    : '계정 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503);
}

export async function GET(request: NextRequest) {
  try {
    const access = request.cookies.get(ACCESS)?.value;
    if (access) {
      const result = await auth('user', undefined, access);
      if (result.ok) return json({ profile: profile(await result.json()) });
      if (result.status !== 401 && result.status !== 403) return unavailable(null);
    }
    const refresh = request.cookies.get(REFRESH)?.value;
    if (refresh) {
      const result = await auth('token?grant_type=refresh_token', { refresh_token: refresh });
      if (result.ok) {
        const session = await result.json();
        return setSession(json({ profile: profile(session.user) }), session);
      }
      if (result.status >= 500 || result.status === 429) return unavailable(null);
    }
    const response = json({ profile: null });
    response.cookies.set(ACCESS, '', { ...cookieOptions, maxAge: 0 });
    response.cookies.set(REFRESH, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) { return unavailable(error); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ message: '허용되지 않은 요청입니다.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ message: '잘못된 요청입니다.' }, 400); }
  if (!body || typeof body !== 'object') return json({ message: '잘못된 요청입니다.' }, 400);
  try {
    if (body.action === 'signout') {
      const access = request.cookies.get(ACCESS)?.value;
      if (access) {
        const result = await auth('logout?scope=local', {}, access);
        if (!result.ok && result.status !== 401 && result.status !== 403) return unavailable(null);
      }
      const response = json({ ok: true });
      response.cookies.set(ACCESS, '', { ...cookieOptions, maxAge: 0 });
      response.cookies.set(REFRESH, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (!['signup', 'signin'].includes(body.action)) return json({ message: '잘못된 요청입니다.' }, 400);
    const userId = typeof body.userId === 'string' ? body.userId.trim().toLowerCase() : '';
    if (!/^[a-z0-9_]{4,20}$/.test(userId) || typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 128) {
      return json({ message: '아이디는 영문·숫자·밑줄 4~20자, 비밀번호는 6~128자로 입력해 주세요.' }, 400);
    }
    const signup = body.action === 'signup';
    if (signup && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 20 || !['SEEKER', 'OWNER'].includes(body.role ?? 'SEEKER'))) {
      return json({ message: '이름과 계정 유형을 확인해 주세요.' }, 400);
    }
    // 아이디 UI를 유지하기 위한 내부 식별자. 이메일 발송/복구에는 사용하지 않습니다.
    const result = await auth(signup ? 'signup' : 'token?grant_type=password', {
      email: `${userId}@users.realba.invalid`, password: body.password,
      ...(signup ? { data: { name: body.name.trim(), role: body.role ?? 'SEEKER' } } : {}),
    });
    const session = await result.json();
    if (!result.ok) {
      const duplicate = ['user_already_exists', 'email_exists'].includes(session.code ?? session.error_code);
      return json({ message: result.status === 429 ? '요청이 많아요. 잠시 후 다시 시도해 주세요.'
        : duplicate ? '이미 사용 중인 아이디예요.'
        : signup ? '가입하지 못했어요. 아이디 중복 또는 비밀번호 조건을 확인해 주세요.'
        : '아이디 또는 비밀번호가 맞지 않아요.' }, result.status === 429 ? 429 : 400);
    }
    if (!session.access_token || !session.refresh_token || !session.user) {
      return json({ message: '아이디 가입을 위해 인증 서버의 Confirm email 설정을 꺼야 합니다.' }, 503);
    }
    return setSession(json({ profile: profile(session.user) }), session);
  } catch (error) { return unavailable(error); }
}
