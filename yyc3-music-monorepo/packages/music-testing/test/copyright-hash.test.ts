// §L-1 — Copyright Hash（SHA-256 · DM- 前缀 16 位大写十六进制；纯函数部分）
import { describe, it, expect } from 'vitest'

// 与 core-tests §L-1 的客户端哈希复刻保持一致
async function clientHashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `DM-${hashHex.slice(0, 16).toUpperCase()}`;
}

describe('§L-1 Copyright Hash', () => {
  it('SHA-256 确定性：同输入同输出', async () => {
    const content = 'test-content|happy|line1|line2|user-1|12345';
    expect(await clientHashContent(content)).toBe(await clientHashContent(content));
  });

  it('格式正确：DM- 前缀 + 16 位大写十六进制', async () => {
    const hash = await clientHashContent('anything');
    expect(hash.startsWith('DM-')).toBe(true);
    const hexPart = hash.slice(3);
    expect(hexPart).toHaveLength(16);
    expect(/^[0-9A-F]{16}$/.test(hexPart)).toBe(true);
  });

  it('不同内容产生不同哈希', async () => {
    const h1 = await clientHashContent('content-A');
    const h2 = await clientHashContent('content-B');
    expect(h1).not.toBe(h2);
  });

  it('空字符串也能正常哈希', async () => {
    const hash = await clientHashContent('');
    expect(hash.startsWith('DM-')).toBe(true);
    expect(hash.slice(3)).toHaveLength(16);
  });
});
