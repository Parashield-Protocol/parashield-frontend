import storage from '../lib/storage';

function makeMock() {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
}

const localStorageMock = makeMock();
const sessionStorageMock = makeMock();

Object.defineProperty(window, 'localStorage',  { value: localStorageMock,  writable: true });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

describe('storage — localStorage', () => {
  beforeEach(() => localStorageMock.clear());

  it('sets and gets string values', () => {
    storage.set('key', 'value');
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

  it('get returns null when localStorage.getItem throws (e.g. Safari private mode)', () => {
    vi.spyOn(localStorageMock, 'getItem').mockImplementationOnce(() => { throw new DOMException('blocked', 'SecurityError'); });
    expect(storage.get('key')).toBeNull();
  });

  it('set does not throw when localStorage.setItem throws (quota exceeded)', () => {
    const err = new DOMException('QuotaExceededError');
    Object.defineProperty(err, 'name', { value: 'QuotaExceededError' });
    vi.spyOn(localStorageMock, 'setItem').mockImplementationOnce(() => { throw err; });
    expect(() => storage.set('key', 'value')).not.toThrow();
  });

  it('remove does not throw when localStorage.removeItem throws', () => {
    vi.spyOn(localStorageMock, 'removeItem').mockImplementationOnce(() => { throw new Error('storage disabled'); });
    expect(() => storage.remove('key')).not.toThrow();
  });

  it('setJSON does not throw when underlying set throws', () => {
    vi.spyOn(localStorageMock, 'setItem').mockImplementationOnce(() => { throw new Error('full'); });
    expect(() => storage.setJSON('key', { x: 1 })).not.toThrow();
  });
});

describe('storage — sessionStorage', () => {
  beforeEach(() => sessionStorageMock.clear());

  it('sets and gets session values', () => {
    storage.setSession('tok', 'abc');
    expect(storage.getSession('tok')).toBe('abc');
  });

  it('returns null for missing session keys', () => {
    expect(storage.getSession('none')).toBeNull();
  });

  it('removes session values', () => {
    storage.setSession('tok', 'abc');
    storage.removeSession('tok');
    expect(storage.getSession('tok')).toBeNull();
  });

  it('getSession returns null when sessionStorage throws', () => {
    vi.spyOn(sessionStorageMock, 'getItem').mockImplementationOnce(() => { throw new DOMException('blocked', 'SecurityError'); });
    expect(storage.getSession('tok')).toBeNull();
  });

  it('setSession does not throw when sessionStorage throws (quota exceeded)', () => {
    vi.spyOn(sessionStorageMock, 'setItem').mockImplementationOnce(() => { throw new DOMException('QuotaExceededError'); });
    expect(() => storage.setSession('tok', 'val')).not.toThrow();
  });

  it('removeSession does not throw when sessionStorage throws', () => {
    vi.spyOn(sessionStorageMock, 'removeItem').mockImplementationOnce(() => { throw new Error('disabled'); });
    expect(() => storage.removeSession('tok')).not.toThrow();
  });
});
