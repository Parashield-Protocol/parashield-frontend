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

describe('storage', () => {
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
});
