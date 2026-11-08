// §L-3 — ApiError 结构化错误类（测真实 @yyc3/music-utils 导出，零网络）
import { describe, it, expect } from 'vitest'
import { ApiError } from '@yyc3/music-utils'

describe('§L-3 ApiError', () => {
  it('具有正确的结构化属性并解析 JSON body', () => {
    const err = new ApiError({
      message: 'Test error',
      status: 404,
      statusText: 'Not Found',
      body: '{"error":"not found"}',
      path: '/test',
    });
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(404);
    expect(err.statusText).toBe('Not Found');
    expect(err.path).toBe('/test');
    expect(err.isRateLimited).toBe(false);
    expect(err.isNetworkError).toBe(false);
    expect(err.data).toEqual({ error: 'not found' });
  });

  it('非 JSON body 时 data 为 null', () => {
    const err = new ApiError({
      message: 'Test',
      body: 'plain text error',
      path: '/test',
    });
    expect(err.data).toBeNull();
    expect(err.body).toBe('plain text error');
  });

  it('isRateLimited 标志正确', () => {
    const err = new ApiError({
      message: 'Rate limited',
      status: 429,
      path: '/test',
      isRateLimited: true,
    });
    expect(err.isRateLimited).toBe(true);
    expect(err.status).toBe(429);
  });

  it('isNetworkError 标志正确（status=0）', () => {
    const err = new ApiError({
      message: 'Network failure',
      path: '/test',
      isNetworkError: true,
    });
    expect(err.isNetworkError).toBe(true);
    expect(err.status).toBe(0);
  });
});
