/**
 * 인트로 화면 — 파란 전면 배경에 워드마크 (Figma 시안 '인트로 화면')
 *
 * 세션당 한 번만 보여주고 1.4초 뒤 사라집니다. 탭하면 바로 넘어갑니다.
 * (실행영상 도입부에 쓰기 좋으라고 넣었지만, 데모 중에 거슬리면 안 되므로 짧게 잡았습니다)
 */

'use client';

import { useEffect, useState } from 'react';
import { Wordmark } from './Logo';

const SEEN_KEY = 'realba:splash-seen';

export default function Splash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      // 저장이 막혀 있으면 그냥 보여줍니다
    }
    if (seen) return;

    setShow(true);
    const leave = setTimeout(() => setLeaving(true), 1100);
    const done = setTimeout(() => dismiss(), 1400);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // 무시
    }
  }

  if (!show) return null;

  return (
    <div
      onClick={dismiss}
      role="presentation"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-brand transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <Wordmark tone="light" className="text-[44px]" />
    </div>
  );
}
