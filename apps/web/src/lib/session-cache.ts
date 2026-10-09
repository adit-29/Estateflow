import type { SessionUser } from '@estateflow/shared';
import { api } from './api-client';

let liveMe: Promise<SessionUser> | null = null;

export function cachedMe() {
  if (!liveMe) {
    liveMe = api.me().catch((error) => {
      liveMe = null;
      throw error;
    });
  }
  return liveMe;
}

export function clearCachedMe() {
  liveMe = null;
}
