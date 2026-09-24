const isClient = typeof window !== 'undefined';

let securityErrorWarned = false;

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
  try { return localStorage.getItem(key); }
  catch (error) { warnSecurityError('get', error); return null; }
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
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) return false;
    warnSecurityError('set', error);
    return false;
  }
}

function remove(key: string): void {
  if (!isClient) return;
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
  try { return sessionStorage.getItem(key); }
  catch (error) { warnSecurityError('getSession', error); return null; }
}

function setSession(key: string, value: string): boolean {
  if (!isClient) return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) return false;
    warnSecurityError('setSession', error);
    return false;
  }
}

function removeSession(key: string): void {
  if (!isClient) return;
  try { sessionStorage.removeItem(key); }
  catch (error) { warnSecurityError('removeSession', error); }
}

const storage = { get, set, remove, getJSON, setJSON, getSession, setSession, removeSession };
export default storage;
