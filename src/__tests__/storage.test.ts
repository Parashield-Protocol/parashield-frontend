import storage from '../lib/storage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const sessionStorageMock = {
  getItem: vi.fn<(key: string) => string | null>(() => null),
  setItem: vi.fn<(key: string, value: string) => void>(),
  removeItem: vi.fn<(key: string) => void>(),
};

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('storage', () => {
  beforeEach(() => localStorageMock.clear());

  it('sets and gets string values', () => {
    expect(storage.set('key', 'value')).toBe(true);
    expect(storage.get('key')).toBe('value');
  });

  it('returns null for missing keys', () => {
    expect(storage.get('missing')).toBeNull();
  });

  it('removes values', () => {
    storage.set('key', 'value');
    storage.remove('key');
    expect(storage.get('key')).toBeNull();
  });

  it('stores and retrieves JSON', () => {
    const obj = { a: 1, b: 'hello', c: [1, 2, 3] };
    storage.setJSON('obj', obj);
    expect(storage.getJSON<typeof obj>('obj')).toEqual(obj);
  });

  it('returns null for invalid JSON', () => {
    localStorageMock.setItem('bad', 'not-valid-json{');
    expect(storage.getJSON('bad')).toBeNull();
  });

  it('returns false instead of throwing when local storage quota is exceeded', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });

    expect(storage.set('key', 'value')).toBe(false);
    expect(() => storage.set('key', 'value')).not.toThrow();
    setItem.mockRestore();
  });

  it('returns false instead of throwing when session storage quota is exceeded', () => {
    sessionStorageMock.setItem.mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });

    expect(storage.setSession('token', 'value')).toBe(false);
    expect(() => storage.setSession('token', 'value')).not.toThrow();
    sessionStorageMock.setItem.mockReset();
  });

  // #613: Safari private browsing throws on setItem even for tiny writes.
  // The value must stay readable for the page session instead of vanishing.
  describe('in-memory fallback when browser storage rejects writes', () => {
    it('keeps a failed localStorage write readable via get/getJSON', () => {
      const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });

      expect(storage.set('wallet', 'GABC')).toBe(false);
      expect(storage.get('wallet')).toBe('GABC');
      expect(storage.setJSON('prefs', { a: 1 })).toBe(false);
      expect(storage.getJSON('prefs')).toEqual({ a: 1 });

      storage.remove('wallet');
      expect(storage.get('wallet')).toBeNull();
      setItem.mockRestore();
    });

    it('falls back to memory when localStorage throws SecurityError on read and write', () => {
      const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });

      storage.set('k', 'v');
      expect(storage.get('k')).toBe('v');

      setItem.mockRestore();
      getItem.mockRestore();
    });

    it('prefers browser storage again once a write succeeds', () => {
      const setItem = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });
      storage.set('k2', 'old');
      setItem.mockRestore();

      expect(storage.set('k2', 'new')).toBe(true);
      expect(storage.get('k2')).toBe('new');
      localStorage.removeItem('k2');
      expect(storage.get('k2')).toBeNull();
    });

    it('keeps a failed sessionStorage write readable via getSession', () => {
      sessionStorageMock.setItem.mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });

      expect(storage.setSession('ps_auth_token', 'jwt')).toBe(false);
      expect(storage.getSession('ps_auth_token')).toBe('jwt');
      storage.removeSession('ps_auth_token');
      expect(storage.getSession('ps_auth_token')).toBeNull();
      sessionStorageMock.setItem.mockReset();
    });
  });
});
