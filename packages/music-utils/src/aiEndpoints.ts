/**
 * YYC³ MusAI · Ollama 端点解析（自 YYC3-CloudPivot-Intelli-Matrix 抽取并去依赖）
 *
 * 目的：统一「本地部署走同源代理 / 远端走直连」的两套 Ollama 地址，
 * 对齐团队「统一适配 Ollama 本地推理」的推理接入要求。
 *
 * 设计要点：
 * - 不引入任何第三方依赖，仅读 VITE_* 环境变量；
 * - 参数可覆盖，便于测试与多实例（n1/n2）切换；
 * - SSR 环境（无 window）按直连处理。
 */

export interface OllamaEndpointOptions {
  /** 直连基址，形如 http://localhost:11434；默认取 VITE_OLLAMA_BASE_URL */
  baseUrl?: string;
  /** 同源代理前缀，形如 /api/v1/llm/ollama；默认取 VITE_OLLAMA_PROXY_PATH */
  proxyPath?: string;
  /** 当前主机名，默认取 window.location.hostname；便于测试注入 */
  hostname?: string;
}

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_PROXY_PATH = '/api/v1/llm/ollama';

function readEnv(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function stripLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '');
}

/** 是否本地部署环境（同源代理可用）：localhost / 127.0.0.1 / 192.168.* / 10.* / 172.* */
export function isLocalDeployment(hostname?: string): boolean {
  const host = hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname);
  if (!host) return false;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.')
  );
}

function resolveBaseUrl(options: OllamaEndpointOptions): string {
  return stripTrailingSlash(options.baseUrl ?? readEnv('VITE_OLLAMA_BASE_URL') ?? DEFAULT_BASE_URL);
}

function resolveProxyPath(options: OllamaEndpointOptions): string {
  const raw = options.proxyPath ?? readEnv('VITE_OLLAMA_PROXY_PATH') ?? DEFAULT_PROXY_PATH;
  return stripTrailingSlash(raw);
}

/**
 * 解析 Ollama 任意子路径端点
 * @param subPath 子路径，如 chat / tags / embeddings
 */
export function getOllamaUrl(subPath: string, options: OllamaEndpointOptions = {}): string {
  const path = stripLeadingSlash(subPath);
  if (isLocalDeployment(options.hostname)) {
    return `${resolveProxyPath(options)}/${path}`;
  }
  return `${resolveBaseUrl(options)}/api/${path}`;
}

/** Ollama 对话端点 */
export function getOllamaChatUrl(options: OllamaEndpointOptions = {}): string {
  return getOllamaUrl('chat', options);
}

/** Ollama 模型列表端点 */
export function getOllamaTagsUrl(options: OllamaEndpointOptions = {}): string {
  return getOllamaUrl('tags', options);
}

/** 诊断信息，供连接测试面板展示当前生效模式与地址 */
export function getOllamaEndpointInfo(options: OllamaEndpointOptions = {}): {
  mode: 'proxy' | 'direct';
  chatUrl: string;
  tagsUrl: string;
  proxyPath: string;
  directBase: string;
} {
  return {
    mode: isLocalDeployment(options.hostname) ? 'proxy' : 'direct',
    chatUrl: getOllamaChatUrl(options),
    tagsUrl: getOllamaTagsUrl(options),
    proxyPath: resolveProxyPath(options),
    directBase: resolveBaseUrl(options),
  };
}
