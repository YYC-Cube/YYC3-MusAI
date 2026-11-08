// 测试环境桥接：jsdom 缺 WebCrypto subtle 与 IndexedDB，以 Node 原生实现补齐
import { webcrypto } from 'node:crypto'
import 'fake-indexeddb/auto'

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}
