// YYC³ music-utils — Ollama 端点解析测试
// 覆盖本地/远端判定、直连与代理两种形态、尾斜杠归一、子路径拼接与诊断信息
import { describe, it, expect } from 'vitest'
import {
  isLocalDeployment,
  getOllamaUrl,
  getOllamaChatUrl,
  getOllamaTagsUrl,
  getOllamaEndpointInfo,
} from '../src/aiEndpoints'

describe('isLocalDeployment', () => {
  it('识别本地与内网地址', () => {
    for (const host of ['localhost', '127.0.0.1', '192.168.3.45', '10.0.0.7', '172.16.1.2']) {
      expect(isLocalDeployment(host)).toBe(true)
    }
  })

  it('公网域名判为非本地', () => {
    expect(isLocalDeployment('musai.yyc3.vip')).toBe(false)
    expect(isLocalDeployment('')).toBe(false)
  })
})

describe('getOllamaUrl', () => {
  it('本地走同源代理', () => {
    expect(
      getOllamaUrl('chat', { hostname: 'localhost', proxyPath: '/api/v1/llm/ollama' })
    ).toBe('/api/v1/llm/ollama/chat')
  })

  it('远端走直连并拼 /api 前缀', () => {
    expect(
      getOllamaUrl('tags', { hostname: 'musai.yyc3.vip', baseUrl: 'http://gpu.example:11434' })
    ).toBe('http://gpu.example:11434/api/tags')
  })

  it('归一子路径前导斜杠与基址尾斜杠', () => {
    expect(
      getOllamaUrl('/embeddings', { hostname: 'example.com', baseUrl: 'http://h:11434/' })
    ).toBe('http://h:11434/api/embeddings')
    expect(getOllamaUrl('show', { hostname: 'localhost', proxyPath: '/proxy/' })).toBe(
      '/proxy/show'
    )
  })
})

describe('端点快捷方法', () => {
  it('chat / tags 复用统一解析', () => {
    const options = { hostname: 'localhost', proxyPath: '/p' }
    expect(getOllamaChatUrl(options)).toBe('/p/chat')
    expect(getOllamaTagsUrl(options)).toBe('/p/tags')
  })
})

describe('getOllamaEndpointInfo', () => {
  it('本地返回 proxy 模式与代理前缀', () => {
    expect(
      getOllamaEndpointInfo({ hostname: 'localhost', proxyPath: '/p', baseUrl: 'http://h:11434' })
    ).toEqual({
      mode: 'proxy',
      chatUrl: '/p/chat',
      tagsUrl: '/p/tags',
      proxyPath: '/p',
      directBase: 'http://h:11434',
    })
  })

  it('远端返回 direct 模式与直连基址', () => {
    const info = getOllamaEndpointInfo({ hostname: 'api.yyc3.vip', baseUrl: 'http://h:11434/' })
    expect(info.mode).toBe('direct')
    expect(info.chatUrl).toBe('http://h:11434/api/chat')
    expect(info.directBase).toBe('http://h:11434')
  })
})
