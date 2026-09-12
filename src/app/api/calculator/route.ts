import { NextRequest, NextResponse } from 'next/server';
import { FALLBACK_ORIGINS, geocodeDetailed } from '@/lib/geocode';
import { estimateRoute, estimateTaxi, haversineKm } from '@/lib/odsay';
import type { LatLng, Route } from '@/types';

async function locate(label: string) {
  if (Object.hasOwn(FALLBACK_ORIGINS, label)) {
    return { location: FALLBACK_ORIGINS[label], matchedQuery: label };
  }
  return geocodeDetailed(label);
}
const validPoint = (p: LatLng) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
  && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
const validRoute = (r: Route) => Number.isFinite(r.oneWayMinutes) && r.oneWayMinutes >= 0
  && Number.isFinite(r.oneWayFare) && r.oneWayFare >= 0;

// Resolve places once per submission; switching modes needs no external route request.
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || !('origin' in body) || !('destination' in body)
      || typeof body.origin !== 'string' || typeof body.destination !== 'string') {
      return NextResponse.json({ error: '출발지와 도착지를 입력해주세요.' }, { status: 400 });
    }
    const origin = body.origin.trim();
    const destination = body.destination.trim();
    if (!origin || !destination || origin.length > 150 || destination.length > 150) {
      return NextResponse.json({ error: '장소를 1~150자로 입력해주세요.' }, { status: 400 });
    }
    const [from, to] = await Promise.all([locate(origin), locate(destination)]);
    if (!from || !to || !validPoint(from.location) || !validPoint(to.location)) {
      return NextResponse.json({ error: '장소를 찾지 못했어요. 역 이름이나 정확한 도로명 주소로 다시 입력해주세요.' }, { status: 422 });
    }
    const same = from.location.lat === to.location.lat && from.location.lng === to.location.lng;
    // Bus-only routing is not provided by the shared mixed-transit lookup.
    // Return clearly labelled estimates for all modes in a single response.
    const zero = { oneWayMinutes: 0, oneWayFare: 0 };
    const routes = {
      WALK: same ? zero : { oneWayMinutes: Math.max(1, Math.round(haversineKm(from.location, to.location) * 1.3 / 4 * 60)), oneWayFare: 0 },
      BUS: same ? zero : estimateRoute(from.location, to.location),
      TAXI: same ? zero : estimateTaxi(from.location, to.location),
    };
    if (!Object.values(routes).every(validRoute)) throw new Error('Invalid route');
    return NextResponse.json({ routes, source: same ? 'same-place' : 'estimate',
      origin: from.matchedQuery, destination: to.matchedQuery },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError
      ? '입력 내용을 확인해주세요.' : '경로를 확인하지 못했어요. 잠시 후 다시 시도해주세요.' },
      { status: error instanceof SyntaxError ? 400 : 503 });
  }
}
