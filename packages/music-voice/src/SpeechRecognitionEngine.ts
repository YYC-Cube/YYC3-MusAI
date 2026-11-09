/**
 * @file SpeechRecognitionEngine.ts
 * @description 语音识别引擎 - 支持多语言实时语音识别
 */

import { getSharedAudioContext } from '@yyc3/music-utils';

export interface SpeechRecognitionConfig {
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  noiseSuppression: boolean
  autoGainControl: boolean
  echoCancellation: boolean
  speechRecognitionService?: 'web' | 'azure' | 'google' | 'whisper'
  apiKey?: string
  endpoint?: string
}

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
  alternatives: Array<{
    transcript: string
    confidence: number
  }>
  timestamp: number
  language: string
}

export interface SpeechRecognitionEvent {
  type: 'start' | 'result' | 'end' | 'error' | 'no-speech' | 'audio-start' | 'audio-end'
  data?: any
  timestamp: number
}

export class SpeechRecognitionEngine {
  private recognition: any = null
  private config: SpeechRecognitionConfig
  private isListening: boolean = false
  private isInitialized: boolean = false
  private audioContext: AudioContext | null = null
  private abortCleanup: (() => void) | null = null
  private mediaStream: MediaStream | null = null
  private speechBuffer: Float32Array[] = []
  private lastResultTime: number = 0
  private silenceTimeout: ReturnType<typeof setTimeout> | null = null
  
  private listeners: Map<string, Function[]> = new Map()
  private resultHistory: SpeechRecognitionResult[] = []
  private maxHistorySize: number = 100

  private readonly SILENCE_TIMEOUT = 2000 // 2秒无语音自动停止
  private readonly MIN_CONFIDENCE = 0.6 // 最低置信度
  private readonly SAMPLE_RATE = 16000 // 音频采样率

  constructor(config?: Partial<SpeechRecognitionConfig>) {
    this.config = {
      language: 'zh-CN',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      noiseSuppression: true,
      autoGainControl: true,
      echoCancellation: true,
      speechRecognitionService: 'web',
      ...config
    }
  }

  /**
   * 初始化语音识别
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      // 检查浏览器支持
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        throw new Error('浏览器不支持语音识别API')
      }

      // 获取麦克风权限
      await this.requestMicrophonePermission()

      // 创建语音识别实例
      const SpeechRecognition = (window as any).webkitSpeechRecognition || 
                               (window as any).SpeechRecognition
      
      this.recognition = new SpeechRecognition()
      
      // 配置识别器
      this.recognition.lang = this.config.language
      this.recognition.continuous = this.config.continuous
      this.recognition.interimResults = this.config.interimResults
      this.recognition.maxAlternatives = this.config.maxAlternatives

      // 设置音频处理参数
      if (this.recognition.audioContext) {
        const audioContext = this.recognition.audioContext
        const source = audioContext.createMediaStreamSource(this.mediaStream!)
        
        // 创建滤波器降噪
        const filter = audioContext.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 300
        filter.Q.value = 1
        
        // 创建增益控制器
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 2.0
        
        source.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(audioContext.destination)
      }

      // 绑定事件处理器
      this.setupEventHandlers()

      this.isInitialized = true
      this.emit('initialized', { timestamp: Date.now() })
      
      console.log('语音识别引擎初始化成功')
      return true

    } catch (error) {
      console.error('语音识别引擎初始化失败:', error)
      this.emit('error', { 
        type: 'initialization', 
        error: error.message,
        timestamp: Date.now()
      })
      return false
    }
  }

  /**
   * 请求麦克风权限
   */
  private async requestMicrophonePermission(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1
        }
      })
      
      const sharedContext = getSharedAudioContext()
      if (!sharedContext) {
        throw new Error('当前环境不支持 WebAudio')
      }
      this.audioContext = sharedContext
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => undefined)
      }
      
    } catch (error) {
      throw new Error(`麦克风权限获取失败: ${error.message}`)
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return

    // 语音开始
    this.recognition.onstart = () => {
      this.isListening = true
      this.lastResultTime = Date.now()
      this.emit('start', { timestamp: Date.now() })
      
      // 开始静音检测
      this.startSilenceDetection()
    }

    // 语音结果
    this.recognition.onresult = (event: any) => {
      this.lastResultTime = Date.now()
      
      const results: any[] = Array.from(event.results)
      const lastResult = results[results.length - 1]
      
      const recognitionResult: SpeechRecognitionResult = {
        transcript: lastResult[0].transcript,
        confidence: lastResult[0].confidence,
        isFinal: lastResult.isFinal,
        alternatives: Array.from(lastResult).map((alt: any) => ({
          transcript: alt.transcript,
          confidence: alt.confidence
        })),
        timestamp: Date.now(),
        language: this.config.language
      }

      // 过滤低置信度结果
      if (recognitionResult.confidence < this.MIN_CONFIDENCE && !recognitionResult.isFinal) {
        return
      }

      // 保存到历史
      this.resultHistory.push(recognitionResult)
      if (this.resultHistory.length > this.maxHistorySize) {
        this.resultHistory.shift()
      }

      // 发射结果事件
      this.emit('result', recognitionResult)

      // 如果是最终结果，发射final事件
      if (recognitionResult.isFinal) {
        this.emit('final', recognitionResult)
        
        // 处理语音命令
        this.processVoiceCommand(recognitionResult.transcript)
      }
    }

    // 语音结束
    this.recognition.onend = () => {
      this.isListening = false
      this.stopSilenceDetection()
      this.emit('end', { timestamp: Date.now() })
    }

    // 错误处理
    this.recognition.onerror = (event: any) => {
      const error = event.error || 'unknown'
      console.error('语音识别错误:', error)
      
      this.emit('error', { 
        type: 'recognition', 
        error,
        timestamp: Date.now()
      })

      // 自动重启（如果是网络错误）
      if (error === 'network') {
        setTimeout(() => {
          if (!this.isListening) {
            this.start()
          }
        }, 1000)
      }
    }

    // 无语音检测
    this.recognition.onspeechend = () => {
      this.emit('no-speech', { timestamp: Date.now() })
    }

    // 音频开始
    this.recognition.onaudiostart = () => {
      this.emit('audio-start', { timestamp: Date.now() })
    }

    // 音频结束
    this.recognition.onaudioend = () => {
      this.emit('audio-end', { timestamp: Date.now() })
    }
  }

  /**
   * 开始语音识别
   * @param signal 可选中止信号；触发时自动停止识别
   */
  async start(signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted) return false

    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) return false
    }

    if (signal?.aborted) return false

    if (this.isListening) {
      console.warn('语音识别已经在进行中')
      return true
    }

    try {
      this.recognition.start()
      this.bindAbortSignal(signal)
      return true
    } catch (error) {
      console.error('启动语音识别失败:', error)
      this.emit('error', { 
        type: 'start', 
        error: error.message,
        timestamp: Date.now()
      })
      return false
    }
  }

  private bindAbortSignal(signal?: AbortSignal): void {
    this.unbindAbortSignal()
    if (!signal) return
    const onAbort = () => this.stop()
    signal.addEventListener('abort', onAbort, { once: true })
    this.abortCleanup = () => signal.removeEventListener('abort', onAbort)
  }

  private unbindAbortSignal(): void {
    this.abortCleanup?.()
    this.abortCleanup = null
  }

  /**
   * 停止语音识别
   */
  stop(): void {
    this.unbindAbortSignal()
    if (!this.isListening || !this.recognition) return

    try {
      this.recognition.stop()
    } catch (error) {
      console.error('停止语音识别失败:', error)
    }
  }

  /**
   * 切换语言
   */
  setLanguage(language: string): void {
    this.config.language = language
    if (this.recognition) {
      this.recognition.lang = language
    }
    
    this.emit('language-changed', { 
      language,
      timestamp: Date.now()
    })
  }

  /**
   * 开始静音检测
   */
  private startSilenceDetection(): void {
    this.stopSilenceDetection()
    
    this.silenceTimeout = setTimeout(() => {
      if (this.isListening && Date.now() - this.lastResultTime > this.SILENCE_TIMEOUT) {
        console.log('检测到静音，自动停止识别')
        this.stop()
        this.emit('silence-timeout', { timestamp: Date.now() })
      } else if (this.isListening) {
        this.startSilenceDetection()
      }
    }, this.SILENCE_TIMEOUT)
  }

  /**
   * 停止静音检测
   */
  private stopSilenceDetection(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout)
      this.silenceTimeout = null
    }
  }

  /**
   * 处理语音命令
   */
  private processVoiceCommand(transcript: string): void {
    // 转换为小写并去除标点
    const cleanTranscript = transcript.toLowerCase()
      .replace(/[.,!?;:]/g, '')
      .trim()

    // 发射命令事件
    this.emit('command', {
      transcript: cleanTranscript,
      original: transcript,
      timestamp: Date.now()
    })

    // 保存命令历史
    this.saveCommandHistory(cleanTranscript)
  }

  /**
   * 保存命令历史
   */
  private saveCommandHistory(command: string): void {
    const history = JSON.parse(localStorage.getItem('voice_command_history') || '[]')
    history.push({
      command,
      timestamp: Date.now(),
      language: this.config.language
    })
    
    // 只保留最近的100条记录
    if (history.length > 100) {
      history.shift()
    }
    
    localStorage.setItem('voice_command_history', JSON.stringify(history))
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLanguages(): Array<{
    code: string
    name: string
    nativeName: string
  }> {
    return [
      { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
      { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
      { code: 'en-US', name: 'English (US)', nativeName: 'English' },
      { code: 'en-GB', name: 'English (UK)', nativeName: 'English' },
      { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
      { code: 'fr-FR', name: 'French', nativeName: 'Français' },
      { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
      { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
      { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
      { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' }
    ]
  }

  /**
   * 获取识别历史
   */
  getHistory(): SpeechRecognitionResult[] {
    return [...this.resultHistory]
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.resultHistory = []
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isListening: this.isListening,
      language: this.config.language,
      historySize: this.resultHistory.length,
      lastResultTime: this.lastResultTime
    }
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stop()
    this.stopSilenceDetection()
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    
    // AudioContext 由全应用共享管理，销毁引擎时不关闭，避免影响其他音频消费者
    this.audioContext = null
    
    this.listeners.clear()
    this.resultHistory = []
    this.isInitialized = false
    this.isListening = false
  }
}
