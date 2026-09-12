/**
 * 출발지 입력 + 자동완성 + 최근 출발지
 * (docs/WIREFRAME.md §3 S-01: 300ms 디바운스 → /api/geocode, 최근 3건은 localStorage)
 *
 * 카카오 키가 없으면 API가 고정 출발지 목록에서 찾아 돌려주므로 여기서는 신경 쓰지 않아도 됩니다.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

export interface Place {
  label: string;
  address?: string;
}

const STORAGE_KEY = 'realba:recent-origins';
const MAX_RECENTS = 3;
/** 최근 기록이 아직 없을 때 보여주는 기본 칩 */
const DEFAULT_CHIPS = ['신촌역', '강남역', '홍대입구역'];

export function loadRecentOrigins(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveRecentOrigin(label: string) {
  if (typeof window === 'undefined') return;
  const trimmed = label.trim();
  if (!trimmed) return;
  try {
    const next = [trimmed, ...loadRecentOrigins().filter((x) => x !== trimmed)].slice(0, MAX_RECENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 시크릿 모드 등에서 저장이 막혀도 검색 자체는 계속 됩니다
  }
}

export default function PlaceAutocomplete({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  /** 엔터로 바로 검색할 때 */
  onSubmit?: () => void;
}) {
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  /** 방금 칩이나 자동완성으로 고른 값이면 다시 검색하지 않습니다 */
  const justPicked = useRef(false);

  useEffect(() => {
    const saved = loadRecentOrigins();
    setRecents(saved.length ? saved : DEFAULT_CHIPS);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    if (q.length < 2) {
      setItems([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: AbortSignal.timeout(5000),
        });
        const json = await res.json();
        setItems((json?.items ?? []) as Place[]);
      } catch {
        setItems([]);
      } finally {
        setSearched(true);
      }
    }, 300); // 입력 300ms 디바운스

    return () => clearTimeout(timer);
  }, [value]);

  function pick(label: string) {
    justPicked.current = true;
    onChange(label);
    setOpen(false);
    setItems([]);
    setSearched(false);
  }

  const notFound = open && searched && value.trim().length >= 2 && items.length === 0;

  return (
    <div>
      <label htmlFor="origin-input" className="mb-1.5 block text-xs font-semibold text-gray-700">
        📍 출발지
      </label>
      <div className="relative">
        <input
          id="origin-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setOpen(false);
              onSubmit?.();
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="우리집 주소를 입력하세요"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />

        {open && items.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {items.map((p, i) => (
              <li key={`${p.label}-${i}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p.label)}
                  className="block w-full px-3 py-2 text-left hover:bg-gray-50"
                >
                  <span className="text-sm">{p.label}</span>
                  {p.address && (
                    <span className="ml-1.5 text-[11px] text-gray-400">{p.address}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notFound && (
        <p className="mt-1.5 text-[11px] text-bad">
          주소를 찾지 못했어요. 지하철역이나 동 이름으로 다시 시도해 보세요.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {recents.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => pick(o)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              value === o ? 'border-brand bg-blue-50 text-brand' : 'border-gray-300 text-gray-500'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
