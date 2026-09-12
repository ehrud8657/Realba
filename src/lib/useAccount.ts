/**
 * 계정 상태를 화면에서 읽는 훅.
 * localStorage는 서버에 없으므로 서버 렌더 때는 빈 상태를 돌려줍니다.
 */

'use client';

import { useSyncExternalStore } from 'react';
import { EMPTY_STATE, readAccount, subscribeAccount, type AccountState } from './account';

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribeAccount, readAccount, () => EMPTY_STATE);
}
