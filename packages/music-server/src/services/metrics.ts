/**
 * 轻量指标采集（Prometheus 文本格式）
 * 仅依赖进程内计数，无需外部依赖。
 */

const startedAt = Date.now();
const byMethod: Record<string, number> = {};
const byStatus: Record<string, number> = {};
let totalRequests = 0;

export function recordRequest(method: string, status: number): void {
  totalRequests++;
  const m = method.toUpperCase();
  byMethod[m] = (byMethod[m] || 0) + 1;
  const s = String(status);
  byStatus[s] = (byStatus[s] || 0) + 1;
}

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function renderMetrics(): string {
  const mem = process.memoryUsage();
  const lines: string[] = [
    '# HELP musai_http_requests_total Total HTTP requests handled',
    '# TYPE musai_http_requests_total counter',
    `musai_http_requests_total ${totalRequests}`,
    '# HELP musai_http_requests_by_method HTTP requests by method',
    '# TYPE musai_http_requests_by_method counter',
  ];

  for (const [method, count] of Object.entries(byMethod)) {
    lines.push(`musai_http_requests_by_method{method="${esc(method)}"} ${count}`);
  }

  lines.push(
    '# HELP musai_http_requests_by_status HTTP requests by status code',
    '# TYPE musai_http_requests_by_status counter',
  );
  for (const [status, count] of Object.entries(byStatus)) {
    lines.push(`musai_http_requests_by_status{status="${esc(status)}"} ${count}`);
  }

  lines.push(
    '# HELP musai_process_uptime_seconds Process uptime in seconds',
    '# TYPE musai_process_uptime_seconds gauge',
    `musai_process_uptime_seconds ${Math.round((Date.now() - startedAt) / 1000)}`,
    '# HELP musai_process_resident_memory_bytes Resident memory size',
    '# TYPE musai_process_resident_memory_bytes gauge',
    `musai_process_resident_memory_bytes ${mem.rss}`,
    '# HELP musai_nodejs_heap_used_bytes Node.js heap used',
    '# TYPE musai_nodejs_heap_used_bytes gauge',
    `musai_nodejs_heap_used_bytes ${mem.heapUsed}`,
  );

  return lines.join('\n') + '\n';
}
