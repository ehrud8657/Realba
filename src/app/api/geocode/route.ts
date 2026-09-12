/**
 * GET /api/geocode?q=신촌 — 출발지 자동완성
 *
 * 소유자: A (백엔드)
 * 홈 화면의 PlaceAutocomplete가 300ms 디바운스로 부릅니다.
 * 카카오 키가 없어도 고정 출발지 목록에서 찾아 돌려주므로 화면은 항상 동작합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { suggestPlaces } from '@/lib/geocode';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ items: [] });

  const items = await suggestPlaces(q);
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
