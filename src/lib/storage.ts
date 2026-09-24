const isClient = typeof window !== 'undefined';

let securityErrorWarned = false;

// In-memory fallback (#613). Safari private browsing (and blocked/full
// storage) makes setItem throw even for tiny writes; previously the value was
// just dropped. Failed writes now land here so reads in the same page session
// still see them. Browser storage stays the source of truth when it works.
const memoryLocal   = new Map<string, string>();
const memorySession = new Map<string, string>();

function warnSecurityError(operation: string, error: unknown): void {
  if (!securityErrorWarned && error instanceof DOMException && error.name === 'SecurityError') {
    console.warn(
      `[storage] ${operation} failed due to SecurityError — storage may be disabled (e.g. private browsing mode).`,
      error,
    );
    securityErrorWarned = true;
  }
}

function get(key: string): string | null {
  if (!isClient) return null;
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch (error) { warnSecurityError('get', error); }
  return memoryLocal.get(key) ?? null;
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

function set(key: string, value: string): boolean {
  if (!isClient) return false;
  try {
    localStorage.setItem(key, value);
    memoryLocal.delete(key);
    return true;
  } catch (error) {
    if (!isQuotaExceededError(error)) warnSecurityError('set', error);
    // Not persisted, but keep it readable for this page session.
    memoryLocal.set(key, value);
    return false;
  }
}

function remove(key: string): void {
  if (!isClient) return;
  memoryLocal.delete(key);
  try { localStorage.removeItem(key); }
  catch (error) { warnSecurityError('remove', error); }
}

function getJSON<T>(key: string): T | null {
  const raw = get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; }
  catch { return null; }
}

function setJSON<T>(key: string, value: T): boolean {
  try { return set(key, JSON.stringify(value)); }
  catch { return false; }
}

function getSession(key: string): string | null {
  if (!isClient) return null;
  try {
    const value = sessionStorage.getItem(key);
    if (value !== null) return value;
  } catch (error) { warnSecurityError('getSession', error); }
  return memorySession.get(key) ?? null;
}

function setSession(key: string, value: string): boolean {
  if (!isClient) return false;
  try {
    sessionStorage.setItem(key, value);
    memorySession.delete(key);
    return true;
  } catch (error) {
    if (!isQuotaExceededError(error)) warnSecurityError('setSession', error);
    // Not persisted, but keep it readable for this page session.
    memorySession.set(key, value);
    return false;
  }
}

function removeSession(key: string): void {
  if (!isClient) return;
  memorySession.delete(key);
  try { sessionStorage.removeItem(key); }
  catch (error) { warnSecurityError('removeSession', error); }
}

const storage = { get, set, remove, getJSON, setJSON, getSession, setSession, removeSession };
export default storage;
