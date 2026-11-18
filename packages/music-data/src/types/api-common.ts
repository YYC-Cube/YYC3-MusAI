// API 通用契约 — 响应包装、健康检查、诊断统计与限流分层

/** Rate limit tiers */
export type RateLimitTier =
  | 'standard'
  | 'sensitive'
  | 'heavy'
  | 'auth'
  | 'starpower';

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Health check response */
export interface HealthResponse {
  status: 'ok';
}

/** Diagnostics: KV stats response */
export interface KVStatsResponse {
  summary: {
    totalRows: number;
    totalPrefixGroups: number;
    uncategorizedCount: number;
    estimatedSizeKB: number;
    estimatedSizeMB: number;
    queriedAt: string;
  };
  domainStats: {
    userDomain: number;
    songDomain: number;
    socialDomain: number;
    spacetimeDomain: number;
    economyDomain: number;
    systemDomain: number;
  };
  prefixStats: Array<{
    prefix: string;
    label: string;
    labelEn: string;
    count: number;
    sampleKeys: string[];
  }>;
  emptyPrefixes: string[];
  uncategorizedKeys: string[];
  cacheStats: {
    entries: number;
    hits: number;
    misses: number;
    hitRate: string;
  };
}

/** Diagnostics: health check response */
export interface DiagnosticsHealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  checks: Record<string, {
    status: string;
    latencyMs?: number;
    detail?: string;
  }>;
  environment: Record<string, string>;
  routeModules: number;
  version: string;
}
