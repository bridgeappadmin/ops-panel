import { useSyncExternalStore } from 'react';
import type { AdminRole, Session } from './types';

// sessionStorage: a reload keeps you signed in, closing the tab signs you out.
const KEYS = { token: 'ops.token', role: 'ops.role', name: 'ops.name' } as const;
const CHANGE = 'ops-session';

// useSyncExternalStore needs the same object back while nothing changed.
let cached: Session | null = null;
let cachedFrom = '';

function read(): Session | null {
  const token = sessionStorage.getItem(KEYS.token);
  const role = sessionStorage.getItem(KEYS.role);
  const name = sessionStorage.getItem(KEYS.name) ?? '';
  if (!token || !role) return null;
  const from = `${token}\n${role}\n${name}`;
  if (from !== cachedFrom) {
    cachedFrom = from;
    cached = { token, role: role as AdminRole, name };
  }
  return cached;
}

const changed = () => window.dispatchEvent(new Event(CHANGE));

export const session = {
  get: read,
  set({ token, role, name }: Session) {
    sessionStorage.setItem(KEYS.token, token);
    sessionStorage.setItem(KEYS.role, role);
    sessionStorage.setItem(KEYS.name, name);
    changed();
  },
  clear() {
    Object.values(KEYS).forEach((key) => sessionStorage.removeItem(key));
    changed();
  },
};

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

/** The signed-in session, re-rendering on sign-in and sign-out. Null on the server and during hydration. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
