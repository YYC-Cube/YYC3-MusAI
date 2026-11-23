/**
 * REST 契约工具（A3 分页 / A4 错误体）
 *
 * 统一约定：
 *   - 错误体：{ error: string, code: ErrorCode, ...业务字段 }
 *   - 列表分页：?page=1&limit=50 → { <items>, total, page, limit, hasMore }
 *
 * 保持向后兼容：现有响应键（albums/media/listings/works…）不重命名，只追加分页字段。
 */

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ERROR_CODES.VALIDATION_FAILED,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  429: ERROR_CODES.RATE_LIMITED,
  500: ERROR_CODES.INTERNAL,
};

/** 统一错误响应；`extra` 用于保留业务字段（如 soldOut） */
export function apiError(
  c: any,
  status: number,
  message: string,
  extra?: Record<string, unknown>,
  code?: ErrorCode,
) {
  return c.json(
    { error: message, code: code ?? STATUS_TO_CODE[status] ?? ERROR_CODES.INTERNAL, ...(extra ?? {}) },
    status,
  );
}

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

/** 解析 ?page=&limit=，并夹取到安全范围 */
export function parsePagination(
  c: any,
  opts: { defaultLimit?: number; maxLimit?: number } = {},
): Pagination {
  const defaultLimit = opts.defaultLimit ?? 50;
  const maxLimit = opts.maxLimit ?? 100;
  const rawPage = parseInt(String(c.req.query('page') ?? '1'), 10);
  const rawLimit = parseInt(String(c.req.query('limit') ?? String(defaultLimit)), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  return { page, limit, offset: (page - 1) * limit };
}

/** 统一分页元信息（与业务字段并列返回） */
export function pageMeta(total: number, { page, limit }: Pagination) {
  return { total, page, limit, hasMore: page * limit < total };
}
