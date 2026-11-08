// 测试环境桥接：jsdom 缺 WebCrypto subtle，以 Node 原生 webcrypto 补齐
import { webcrypto } from 'node:crypto'

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}
