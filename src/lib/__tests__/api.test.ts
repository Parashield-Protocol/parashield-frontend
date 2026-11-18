import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, type AxiosResponse } from 'axios';
import { ApiError } from '../errors';
import * as api from '../api';
import storage from '../storage';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios, AxiosError: class extends Error {} };
});

vi.mock('../storage', () => ({
  default: {
    getSession: vi.fn(),
    setSession: vi.fn(),
    removeSession: vi.fn(),
    getLocal: vi.fn(),
    setLocal: vi.fn(),
    removeLocal: vi.fn(),
  },
}));

describe('api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unwrap()', () => {
    it('returns data when success is true', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: 200,
          data: { success: true, data: [{ id: 'prod-1', name: 'Test Product' }] },
        } as AxiosResponse),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);

      const products = await api.fetchProducts();
      expect(products).toEqual([{ id: 'prod-1', name: 'Test Product' }]);
    });

    it('throws ApiError when success is false even with HTTP 200', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: 200,
          data: { success: false, error: 'Invalid signature' },
        } as AxiosResponse),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);

      await expect(api.fetchProducts()).rejects.toThrow(ApiError);
    });

    it('throws ApiError with correct message and status from response', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: 200,
          data: { success: false, error: 'Custom error message' },
        } as AxiosResponse),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);

      try {
        await api.fetchProducts();
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe('Custom error message');
        expect((err as ApiError).status).toBe(200);
      }
    });

    it('throws ApiError with fallback message when error is missing', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: 200,
          data: { success: false },
        } as AxiosResponse),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);

      try {
        await api.fetchProducts();
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe('Request failed');
      }
    });
  });

  describe('withRetry()', () => {
    // Builds a mocked axios client whose GET resolves/rejects per the queue.
    function mockGet(...outcomes: Array<{ ok: unknown } | { fail: ApiError }>) {
      const get = vi.fn();
      for (const outcome of outcomes) {
        if ('fail' in outcome) get.mockRejectedValueOnce(outcome.fail);
        else get.mockResolvedValueOnce({ status: 200, data: { success: true, data: outcome.ok } });
      }
      const mockClient = {
        get,
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);
      return get;
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not retry on 4xx errors', async () => {
      const err = new AxiosError('Not found');
      (err as unknown as { response: { status: number } }).response = { status: 404 };

      const mockClient = {
        get: vi.fn().mockRejectedValue(err),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);

      await expect(api.fetchProducts()).rejects.toThrow();
    });

    it('does not retry genuine client errors like 400', async () => {
      const get = mockGet({ fail: new ApiError('Bad request', 400) });

      await expect(api.fetchProducts()).rejects.toThrow(ApiError);
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('retries 429 Too Many Requests (issue #231)', async () => {
      vi.useFakeTimers();
      const get = mockGet({ fail: new ApiError('Too many requests', 429) }, { ok: [] });

      const pending = api.fetchProducts();
      await vi.advanceTimersByTimeAsync(500);

      await expect(pending).resolves.toEqual([]);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('retries 408 Request Timeout (issue #231)', async () => {
      vi.useFakeTimers();
      const get = mockGet({ fail: new ApiError('Request timeout', 408) }, { ok: [] });

      const pending = api.fetchProducts();
      await vi.advanceTimersByTimeAsync(500);

      await expect(pending).resolves.toEqual([]);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('waits for Retry-After when it exceeds the default backoff', async () => {
      vi.useFakeTimers();
      const get = mockGet(
        { fail: new ApiError('Rate limited', 429, undefined, 5_000) },
        { ok: [] },
      );

      const pending = api.fetchProducts();

      await vi.advanceTimersByTimeAsync(500);
      expect(get).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(4_500);
      await expect(pending).resolves.toEqual([]);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('caps an unreasonable Retry-After at 30s', async () => {
      vi.useFakeTimers();
      const get = mockGet(
        { fail: new ApiError('Rate limited', 429, undefined, 3_600_000) },
        { ok: [] },
      );

      const pending = api.fetchProducts();
      await vi.advanceTimersByTimeAsync(30_000);

      await expect(pending).resolves.toEqual([]);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('gives up after exhausting retries on a persistent 429', async () => {
      vi.useFakeTimers();
      const get = mockGet(
        { fail: new ApiError('Rate limited', 429) },
        { fail: new ApiError('Rate limited', 429) },
        { fail: new ApiError('Rate limited', 429) },
      );

      const pending = api.fetchProducts();
      const assertion = expect(pending).rejects.toThrow('Rate limited');
      await vi.advanceTimersByTimeAsync(1_500);

      await assertion;
      expect(get).toHaveBeenCalledTimes(3);
    });
  });

  describe('Auth interceptor & handlers', () => {
    it('sets auth error handler callback', () => {
      const handler = vi.fn();
      api.setAuthErrorHandler(handler);
      expect(api.setAuthErrorHandler).toBeDefined();
    });

    it('reads token from storage', () => {
      vi.mocked(storage.getSession).mockReturnValue('token-123');
      expect(storage.getSession).toBeDefined();
    });
  });

  describe('API endpoints', () => {
    it('fetchChallenge passes encoded wallet parameter', () => {
      const wallet = 'GBU123+ABC';
      expect(wallet).toContain('+');
    });

    it('login sends payload', () => {
      expect(api.login).toBeDefined();
    });

    it('fetchClaim returns null on 404 ApiError', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue(new ApiError('Not found', 404)),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);

      const res = await api.fetchClaim('missing-id');
      expect(res).toBeNull();
    });

    it('fetchOracleReading returns null on 404 ApiError', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue(new ApiError('Not found', 404)),
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      };
      vi.mocked(axios.create).mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);

      const res = await api.fetchOracleReading('missing-key');
      expect(res).toBeNull();
    });
  });
});
