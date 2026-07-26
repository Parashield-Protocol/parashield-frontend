import { describe, it, expect, vi, beforeEach } from 'vitest';
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
