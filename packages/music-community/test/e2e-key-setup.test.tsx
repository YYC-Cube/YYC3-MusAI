/**
 * @file E2EKeySetup 端到端加密向导测试
 * @description 覆盖状态检测、浏览器不支持、密钥生成/上传成功与失败、口令强度、
 *              备份/跳过备份、指纹复制、从备份恢复的成功/口令错误/无备份/异常、密钥轮换与本地化
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { E2EKeySetup } from '../src'

const mocks = vi.hoisted(() => ({
  generateKeyPair: vi.fn(),
  getE2EEStatus: vi.fn(),
  isE2EESupported: vi.fn(),
  createKeyBackup: vi.fn(),
  restoreKeyFromBackup: vi.fn(),
  deleteLocalKeys: vi.fn(),
  pkiApi: {
    getStatus: vi.fn(),
    uploadPublicKey: vi.fn(),
    storeKeyBackup: vi.fn(),
    getKeyBackup: vi.fn(),
    deletePublicKey: vi.fn(),
  },
}))

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, ...mocks }
})

const user = { id: 'u1', email: 'alice@example.com' }

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const utils = render(
    createElement(E2EKeySetup, { isOpen: true, onClose, user, lang: 'zh', ...over })
  )
  return { onClose, ...utils }
}

function findButton(container: HTMLElement, icon: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  )!
}

beforeEach(() => {
  Object.values(mocks.pkiApi).forEach((fn) => fn.mockReset())
  mocks.generateKeyPair.mockReset()
  mocks.getE2EEStatus.mockReset()
  mocks.isE2EESupported.mockReset()
  mocks.createKeyBackup.mockReset()
  mocks.restoreKeyFromBackup.mockReset()
  mocks.deleteLocalKeys.mockReset()

  mocks.isE2EESupported.mockReturnValue(true)
  mocks.getE2EEStatus.mockResolvedValue({ hasLocalKeys: false })
  mocks.pkiApi.getStatus.mockResolvedValue(null)
  mocks.generateKeyPair.mockResolvedValue({ publicKeyJwk: { kty: 'RSA' } })
  mocks.pkiApi.uploadPublicKey.mockResolvedValue({ success: true, fingerprint: 'FP-1' })
  mocks.createKeyBackup.mockResolvedValue({
    encryptedPrivateKey: 'enc',
    salt: 'salt',
    iv: 'iv',
    publicKeyJwk: { kty: 'RSA' },
  })
  mocks.pkiApi.storeKeyBackup.mockResolvedValue({ success: true })
  mocks.restoreKeyFromBackup.mockResolvedValue(true)
  mocks.pkiApi.getKeyBackup.mockResolvedValue({
    hasBackup: true,
    encryptedPrivateKey: 'enc',
    salt: 'salt',
    iv: 'iv',
    publicKeyJwk: { kty: 'RSA' },
    createdAt: 1,
  })
  mocks.pkiApi.deletePublicKey.mockResolvedValue(null)
  mocks.deleteLocalKeys.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('E2EKeySetup 介绍与状态', () => {
  it('未打开时不渲染', () => {
    const { container } = setup({ isOpen: false })
    expect(container.firstChild).toBeNull()
  })

  it('介绍页展示特性并支持稍后关闭', async () => {
    const viewer = userEvent.setup()
    const { onClose } = setup()
    expect(screen.getByText('端到端加密 (E2EE)')).toBeInTheDocument()
    expect(screen.getByText('RSA-2048 密钥对 + AES-256 加密')).toBeInTheDocument()
    expect(screen.getByText('私钥仅存储在你的设备上')).toBeInTheDocument()
    expect(screen.getByText('可选的口令保护密钥备份')).toBeInTheDocument()

    await viewer.click(screen.getByText('稍后'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('浏览器不支持时展示警告并禁用生成按钮', async () => {
    mocks.isE2EESupported.mockReturnValue(false)
    setup()
    await waitFor(() =>
      expect(screen.getByText('你的浏览器不支持 Web Crypto API。请使用现代浏览器。')).toBeInTheDocument()
    )
    const generate = screen.getByRole('button', { name: /生成密钥/ })
    expect(generate).toBeDisabled()
    expect(mocks.getE2EEStatus).not.toHaveBeenCalled()
  })

  it('状态检测异常时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getE2EEStatus.mockRejectedValue(new Error('crypto fail'))
    setup()
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('[E2EE Setup] Status check error:', expect.any(Error))
    )
    errorSpy.mockRestore()
  })

  it('已注册用户展示状态、指纹、注册时间与备份状态', async () => {
    const enrolledAt = new Date(2024, 0, 5).getTime()
    mocks.getE2EEStatus.mockResolvedValue({ hasLocalKeys: true })
    mocks.pkiApi.getStatus.mockResolvedValue({
      fingerprint: 'ABCD-EFGH',
      enrolledAt,
      hasBackup: true,
      enrolled: true,
    })
    setup()
    await waitFor(() => expect(screen.getByText('E2EE 已启用')).toBeInTheDocument())

    expect(screen.getByText('ABCD-EFGH')).toBeInTheDocument()
    expect(screen.getByText(new Date(enrolledAt).toLocaleDateString())).toBeInTheDocument()
    expect(screen.getByText('已备份')).toBeInTheDocument()
    expect(screen.queryByText('备份密钥')).toBeNull()
    expect(screen.getByText('轮换密钥')).toBeInTheDocument()
  })

  it('已注册未备份时可进入备份步骤', async () => {
    const viewer = userEvent.setup()
    mocks.getE2EEStatus.mockResolvedValue({ hasLocalKeys: true })
    mocks.pkiApi.getStatus.mockResolvedValue({
      fingerprint: 'FP',
      enrolledAt: Date.now(),
      hasBackup: false,
      enrolled: true,
    })
    setup()
    await waitFor(() => expect(screen.getByText('未备份')).toBeInTheDocument())
    await viewer.click(screen.getByText('备份密钥'))
    expect(screen.getByText('密钥备份（可选）')).toBeInTheDocument()
  })

  it('轮换密钥删除本地与服务端密钥并回到介绍页', async () => {
    const viewer = userEvent.setup()
    mocks.getE2EEStatus.mockResolvedValue({ hasLocalKeys: true })
    mocks.pkiApi.getStatus.mockResolvedValue({ fingerprint: 'FP', enrolledAt: Date.now(), hasBackup: true, enrolled: true })
    setup()
    await waitFor(() => expect(screen.getByText('轮换密钥')).toBeInTheDocument())

    await viewer.click(screen.getByText('轮换密钥'))
    await waitFor(() => expect(screen.getByText('端到端加密 (E2EE)')).toBeInTheDocument())
    expect(mocks.deleteLocalKeys).toHaveBeenCalledWith('u1')
    expect(mocks.pkiApi.deletePublicKey).toHaveBeenCalledWith('u1')
  })

  it('轮换失败时展示错误', async () => {
    const viewer = userEvent.setup()
    mocks.getE2EEStatus.mockResolvedValue({ hasLocalKeys: true })
    mocks.pkiApi.getStatus.mockResolvedValue({ fingerprint: 'FP', enrolledAt: Date.now(), hasBackup: true, enrolled: true })
    mocks.pkiApi.deletePublicKey.mockRejectedValue(new Error('rotate fail'))
    setup()
    await waitFor(() => expect(screen.getByText('轮换密钥')).toBeInTheDocument())
    await viewer.click(screen.getByText('轮换密钥'))
    await waitFor(() => expect(screen.getByText('rotate fail')).toBeInTheDocument())
  })
})

describe('E2EKeySetup 生成与备份', () => {
  it('生成密钥成功进入备份步骤并支持设置口令与创建备份', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    await viewer.click(screen.getByRole('button', { name: /生成密钥/ }))
    await waitFor(() => expect(screen.getByText('密钥备份（可选）')).toBeInTheDocument())
    expect(mocks.generateKeyPair).toHaveBeenCalledWith('u1')
    expect(mocks.pkiApi.uploadPublicKey).toHaveBeenCalledWith('u1', { kty: 'RSA' })

    const passphrase = screen.getByPlaceholderText('设置恢复口令 (至少8位)')
    await viewer.type(passphrase, 'short')
    expect(screen.getByText('太短')).toBeInTheDocument()
    await viewer.clear(passphrase)
    await viewer.type(passphrase, 'mediumpass')
    expect(screen.getByText('一般')).toBeInTheDocument()
    await viewer.clear(passphrase)
    await viewer.type(passphrase, 'goodpass1234')
    expect(screen.getByText('良好')).toBeInTheDocument()
    await viewer.clear(passphrase)
    await viewer.type(passphrase, 'excellentpass123')
    expect(screen.getByText('极佳')).toBeInTheDocument()

    // 显示/隐藏口令
    const eye = findButton(container, 'eye')
    await viewer.click(eye)
    expect(passphrase).toHaveAttribute('type', 'text')
    await viewer.click(findButton(container, 'eye-off'))
    expect(passphrase).toHaveAttribute('type', 'password')

    await viewer.clear(passphrase)
    await viewer.type(passphrase, 'supersecret123')
    await viewer.type(screen.getByPlaceholderText('确认口令'), 'supersecret123')
    await viewer.click(screen.getByRole('button', { name: /创建备份/ }))

    await waitFor(() => expect(screen.getByText('E2EE 设置完成！')).toBeInTheDocument())
    expect(mocks.createKeyBackup).toHaveBeenCalledWith('u1', 'supersecret123')
    expect(mocks.pkiApi.storeKeyBackup).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', encryptedPrivateKey: 'enc', salt: 'salt', iv: 'iv' })
    )
    expect(screen.getByText('已备份')).toBeInTheDocument()
    expect(screen.getByText('FP-1')).toBeInTheDocument()

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    fireEvent.click(findButton(container, 'copy'))
    expect(writeText).toHaveBeenCalledWith('FP-1')
    await waitFor(() => expect(findButton(container, 'check')).toBeInTheDocument())

    await viewer.click(screen.getByText('完成'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('跳过备份直接完成，不展示已备份徽章', async () => {
    const viewer = userEvent.setup()
    setup()
    await viewer.click(screen.getByRole('button', { name: /生成密钥/ }))
    await waitFor(() => expect(screen.getByText('密钥备份（可选）')).toBeInTheDocument())
    await viewer.click(screen.getByText('跳过'))
    expect(screen.getByText('E2EE 设置完成！')).toBeInTheDocument()
    expect(screen.queryByText('已备份')).toBeNull()
  })

  it('上传公钥被拒时回到介绍页并提示错误', async () => {
    const viewer = userEvent.setup()
    mocks.pkiApi.uploadPublicKey.mockResolvedValue({ success: false })
    setup()
    await viewer.click(screen.getByRole('button', { name: /生成密钥/ }))
    await waitFor(() => expect(screen.getByText('Server rejected public key upload')).toBeInTheDocument())
    expect(screen.getByText('端到端加密 (E2EE)')).toBeInTheDocument()
  })

  it('密钥生成抛错时展示错误信息', async () => {
    const viewer = userEvent.setup()
    mocks.generateKeyPair.mockRejectedValue(new Error('no crypto'))
    setup()
    await viewer.click(screen.getByRole('button', { name: /生成密钥/ }))
    await waitFor(() => expect(screen.getByText('no crypto')).toBeInTheDocument())
  })

  it('备份创建失败时展示错误', async () => {
    const viewer = userEvent.setup()
    mocks.createKeyBackup.mockResolvedValue(null)
    setup()
    await viewer.click(screen.getByRole('button', { name: /生成密钥/ }))
    await waitFor(() => expect(screen.getByText('密钥备份（可选）')).toBeInTheDocument())
    await viewer.type(screen.getByPlaceholderText('设置恢复口令 (至少8位)'), 'supersecret123')
    await viewer.type(screen.getByPlaceholderText('确认口令'), 'supersecret123')
    await viewer.click(screen.getByRole('button', { name: /创建备份/ }))
    await waitFor(() => expect(screen.getByText('Failed to create backup')).toBeInTheDocument())
  })

  it('未登录时点击生成不会调用密钥生成', async () => {
    const viewer = userEvent.setup()
    setup({ user: null })
    await viewer.click(screen.getByRole('button', { name: /生成密钥/ }))
    expect(mocks.generateKeyPair).not.toHaveBeenCalled()
  })
})

describe('E2EKeySetup 备份恢复', () => {
  async function openRestore(viewer: ReturnType<typeof userEvent.setup>) {
    mocks.pkiApi.getStatus.mockResolvedValue({ hasBackup: true, enrolled: false })
    setup()
    await waitFor(() => expect(screen.getByText('从备份恢复密钥')).toBeInTheDocument())
    await viewer.click(screen.getByText('从备份恢复密钥'))
    expect(screen.getByText('从备份恢复')).toBeInTheDocument()
  }

  it('恢复成功后展示成功提示并跳转状态页', async () => {
    const viewer = userEvent.setup()
    await openRestore(viewer)
    mocks.pkiApi.getStatus.mockResolvedValue({ fingerprint: 'FP-R', enrolledAt: Date.now(), hasBackup: true, enrolled: true })
    await viewer.type(screen.getByPlaceholderText('输入恢复口令'), 'secret123')
    await viewer.click(screen.getByRole('button', { name: /恢复/ }))

    await waitFor(() => expect(screen.getByText('密钥恢复成功！')).toBeInTheDocument())
    expect(mocks.restoreKeyFromBackup).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', encryptedPrivateKey: 'enc' }),
      'secret123'
    )
    await waitFor(() => expect(screen.getByText('E2EE 已启用')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('FP-R')).toBeInTheDocument()
  })

  it('口令错误时展示失败提示', async () => {
    const viewer = userEvent.setup()
    mocks.restoreKeyFromBackup.mockResolvedValue(false)
    await openRestore(viewer)
    await viewer.type(screen.getByPlaceholderText('输入恢复口令'), 'wrongpass')
    await viewer.click(screen.getByRole('button', { name: /恢复/ }))
    await waitFor(() => expect(screen.getByText('口令错误或备份已损坏')).toBeInTheDocument())
  })

  it('服务器无备份时提示错误', async () => {
    const viewer = userEvent.setup()
    mocks.pkiApi.getKeyBackup.mockResolvedValue({ hasBackup: false })
    await openRestore(viewer)
    await viewer.type(screen.getByPlaceholderText('输入恢复口令'), 'secret123')
    await viewer.click(screen.getByRole('button', { name: /恢复/ }))
    await waitFor(() => expect(screen.getByText('服务器上没有找到密钥备份')).toBeInTheDocument())
  })

  it('恢复接口异常时展示错误', async () => {
    const viewer = userEvent.setup()
    mocks.pkiApi.getKeyBackup.mockRejectedValue(new Error('restore boom'))
    await openRestore(viewer)
    await viewer.type(screen.getByPlaceholderText('输入恢复口令'), 'secret123')
    await viewer.click(screen.getByRole('button', { name: /恢复/ }))
    await waitFor(() => expect(screen.getByText('restore boom')).toBeInTheDocument())
  })

  it('返回按钮回到介绍页', async () => {
    const viewer = userEvent.setup()
    await openRestore(viewer)
    await viewer.click(screen.getByText('返回'))
    expect(screen.getByText('端到端加密 (E2EE)')).toBeInTheDocument()
  })

  it('口令为空时恢复按钮禁用', async () => {
    const viewer = userEvent.setup()
    await openRestore(viewer)
    expect(screen.getByRole('button', { name: /恢复/ })).toBeDisabled()
  })
})

describe('E2EKeySetup 其他', () => {
  it('遮罩与关闭按钮触发 onClose', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    fireEvent.click(container.querySelector('.fixed.inset-0.z-\\[80\\]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
    await viewer.click(findButton(container, 'x'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('英文语言渲染英文文案', () => {
    setup({ lang: 'en' })
    expect(screen.getByText('End-to-End Encryption')).toBeInTheDocument()
    expect(screen.getByText('RSA-2048 key pair + AES-256 encryption')).toBeInTheDocument()
    expect(screen.getByText('Generate Keys')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('英文环境完成备份口令强度、跳过备份与完成页', async () => {
    const viewer = userEvent.setup()
    setup({ lang: 'en' })
    await viewer.click(screen.getByRole('button', { name: /Generate Keys/ }))
    await waitFor(() => expect(screen.getByText('Key Backup (Optional)')).toBeInTheDocument())
    expect(screen.getByText('Remember this passphrase! If forgotten, you cannot restore your private key and will need to regenerate.')).toBeInTheDocument()

    const pass = screen.getByPlaceholderText('Recovery passphrase (min 8 chars)')
    await viewer.type(pass, 'short')
    expect(screen.getByText('Too short')).toBeInTheDocument()
    await viewer.clear(pass)
    await viewer.type(pass, 'fairpass1')
    expect(screen.getByText('Fair')).toBeInTheDocument()
    await viewer.clear(pass)
    await viewer.type(pass, 'goodpass1234')
    expect(screen.getByText('Good')).toBeInTheDocument()
    await viewer.clear(pass)
    await viewer.type(pass, 'excellentpass123')
    expect(screen.getByText('Excellent')).toBeInTheDocument()
    await viewer.type(screen.getByPlaceholderText('Confirm passphrase'), 'excellentpass123')
    expect(screen.getByText('Create Backup')).toBeInTheDocument()

    await viewer.click(screen.getByText('Skip'))
    expect(screen.getByText('E2EE Setup Complete!')).toBeInTheDocument()
    expect(screen.getByText('Encrypted')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('英文环境覆盖生成中与上传中的中间态文案', async () => {
    const viewer = userEvent.setup()
    let resolveGenerate: (value: unknown) => void
    let resolveUpload: (value: unknown) => void
    mocks.generateKeyPair.mockReturnValue(new Promise((resolve) => { resolveGenerate = resolve }))
    mocks.pkiApi.uploadPublicKey.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve }))
    setup({ lang: 'en' })

    await viewer.click(screen.getByRole('button', { name: /Generate Keys/ }))
    expect(screen.getByText('Generating RSA-2048 key pair...')).toBeInTheDocument()
    expect(screen.getByText('This may take a few seconds')).toBeInTheDocument()

    resolveGenerate!({ publicKeyJwk: { kty: 'RSA' } })
    await waitFor(() => expect(screen.getByText('Uploading public key to server...')).toBeInTheDocument())
    expect(screen.getByText('Private key is safely stored on your device')).toBeInTheDocument()

    resolveUpload!({ success: true, fingerprint: 'FP-EN' })
    await waitFor(() => expect(screen.getByText('Key Backup (Optional)')).toBeInTheDocument())
    await viewer.click(screen.getByText('Skip'))
    expect(screen.getByText('E2EE Setup Complete!')).toBeInTheDocument()
  })

  it('英文环境展示已启用状态、未备份提示与备份入口', async () => {
    const viewer = userEvent.setup()
    mocks.getE2EEStatus.mockResolvedValue({ hasLocalKeys: true })
    mocks.pkiApi.getStatus.mockResolvedValue({
      fingerprint: 'FP-EN',
      enrolledAt: Date.now(),
      hasBackup: false,
      enrolled: true,
    })
    setup({ lang: 'en' })
    await waitFor(() => expect(screen.getByText('E2EE Enabled')).toBeInTheDocument())
    expect(screen.getByText('Your end-to-end encryption keys are configured.')).toBeInTheDocument()
    expect(screen.getByText('Fingerprint')).toBeInTheDocument()
    expect(screen.getByText('Enrolled')).toBeInTheDocument()
    expect(screen.getByText('Key Backup')).toBeInTheDocument()
    expect(screen.getByText('Not backed up')).toBeInTheDocument()
    expect(screen.getByText('Backup Keys')).toBeInTheDocument()
    expect(screen.getByText('Rotate Keys')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()

    await viewer.click(screen.getByText('Backup Keys'))
    expect(screen.getByText('Key Backup (Optional)')).toBeInTheDocument()
  })

  it('英文环境展示恢复页并成功恢复', async () => {
    const viewer = userEvent.setup()
    mocks.pkiApi.getStatus.mockResolvedValue({ hasBackup: true, enrolled: false })
    setup({ lang: 'en' })
    await waitFor(() => expect(screen.getByText('Restore keys from backup')).toBeInTheDocument())
    await viewer.click(screen.getByText('Restore keys from backup'))
    expect(screen.getByText('Restore from Backup')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()

    await viewer.type(screen.getByPlaceholderText('Enter recovery passphrase'), 'secret123')
    await viewer.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(screen.getByText('Keys restored successfully!')).toBeInTheDocument())
  })
})
