/**
 * A3/A4 契约工具单测：分页解析与统一错误体
 */
import { assertEquals } from 'jsr:@std/assert@1';
import { apiError, ERROR_CODES, pageMeta, parsePagination } from '../src/api-contract.ts';

function mockContext(query: Record<string, string>) {
  let body: any;
  let status: number | undefined;
  const c = {
    req: { query: (k: string) => query[k] },
    json: (payload: any, s?: number) => {
      body = payload;
      status = s ?? 200;
      return { payload, status };
    },
    result: () => ({ body, status }),
  };
  return c;
}

Deno.test('contract: parsePagination 默认值与夹取', () => {
  assertEquals(parsePagination(mockContext({})), { page: 1, limit: 50, offset: 0 });
  assertEquals(
    parsePagination(mockContext({ page: '3', limit: '20' })),
    { page: 3, limit: 20, offset: 40 },
  );
  // limit 超过上限被夹取
  assertEquals(
    parsePagination(mockContext({ limit: '999' }), { maxLimit: 100 }),
    { page: 1, limit: 100, offset: 0 },
  );
  // 非法值回落默认
  assertEquals(parsePagination(mockContext({ page: '0', limit: 'abc' })), { page: 1, limit: 50, offset: 0 });
});

Deno.test('contract: pageMeta hasMore 计算', () => {
  assertEquals(pageMeta(0, { page: 1, limit: 10, offset: 0 }), {
    total: 0, page: 1, limit: 10, hasMore: false,
  });
  assertEquals(pageMeta(25, { page: 1, limit: 10, offset: 0 }).hasMore, true);
  assertEquals(pageMeta(25, { page: 3, limit: 10, offset: 20 }).hasMore, false);
  assertEquals(pageMeta(20, { page: 2, limit: 10, offset: 10 }).hasMore, false);
});

Deno.test('contract: apiError 统一错误体与状态码映射', () => {
  const ctx = mockContext({});
  ctx.json = (payload: any, s?: number) => ({ payload, status: s ?? 200 });

  assertEquals(apiError(ctx, 400, 'bad input'), {
    payload: { error: 'bad input', code: ERROR_CODES.VALIDATION_FAILED },
    status: 400,
  });
  assertEquals(apiError(ctx, 401, 'no token'), {
    payload: { error: 'no token', code: ERROR_CODES.UNAUTHORIZED },
    status: 401,
  });
  // 业务字段保留
  assertEquals(apiError(ctx, 409, 'sold out', { soldOut: true }), {
    payload: { error: 'sold out', code: ERROR_CODES.CONFLICT, soldOut: true },
    status: 409,
  });
  // 显式 code 覆盖
  assertEquals(apiError(ctx, 500, 'boom', undefined, ERROR_CODES.INTERNAL), {
    payload: { error: 'boom', code: ERROR_CODES.INTERNAL },
    status: 500,
  });
});
