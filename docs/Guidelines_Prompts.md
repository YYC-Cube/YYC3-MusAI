# D-Music Guidelines

---

## 📋 项目概述

```
项目名称：D-Music
核心理念：五标五高五化
- 五标：标准化、规范化、自动化、智能化、可视化
- 五高：高可用、高性能、高安全、高扩展、高可维护
- 五化：流程化、文档化、工具化、数字化、生态化

技术栈：
- 前端：Vue 3 + TypeScript + Vite
- 后端：Node.js + Express
- 数据库：MySQL + Redis
- 部署：Docker + Kubernetes
```

---

## 一、标准化建设提示词

### 1.1 音乐元数据标准

```
提示词：实现音乐元数据标准化模块

需求：
- 统一歌曲信息格式
- 支持多语言元数据
- 自动元数据提取

```typescript
interface MusicMetadata {
  id: string
  title: string                    // 歌曲标题
  titleAlt?: string                // 标题别名（多语言）
  artist: string                   // 艺术家
  artistId?: string                // 艺术家ID
  album: string                    // 专辑名
  albumId?: string                 // 专辑ID
  duration: number                 // 时长（毫秒）
  cover: string                    // 封面URL
  coverThumb?: string              // 缩略图
  genre: string[]                  // 流派
  year?: number                    // 发行年份
  trackNumber?: number             // 音轨号
  discNumber?: number              // 光盘号
  bitrate: number                  // 比特率
  sampleRate: number               // 采样率
  channels: number                 // 声道数
  fileSize: number                 // 文件大小
  format: string                   // 格式（mp3/flac/wav）
  lyrics?: string                  // 歌词
  copyright?: string               // 版权信息
  isrc?: string                    // 国际标准录音代码
  createdAt: Date
  updatedAt: Date
}

// 元数据验证
function validateMetadata(metadata: MusicMetadata): ValidationResult

// 自动提取元数据
function extractMetadata(file: File): Promise<MusicMetadata>

// 元数据标准化
function normalizeMetadata(raw: any): MusicMetadata
```
```

### 1.2 歌词格式标准

```
提示词：实现 LRC 歌词解析与同步模块

需求：
- LRC 格式解析
- 毫秒级时间轴
- 歌词同步滚动
- 翻译歌词支持

```typescript
interface LyricLine {
  time: number          // 时间（毫秒）
  text: string          // 歌词文本
  translation?: string  // 翻译
}

interface LyricParser {
  // 解析 LRC 格式
  parseLRC(content: string): LyricLine[]
  
  // 时间标签解析 [mm:ss.xx]
  parseTimeTag(tag: string): number
  
  // 获取当前歌词
  getCurrentLyric(lines: LyricLine[], currentTime: number): LyricLine | null
  
  // 歌词搜索
  searchLyric(query: string): Promise<LyricLine[]>
}

// LRC 格式示例
const lrcExample = `
[ti:歌曲标题]
[ar:艺术家]
[al:专辑]
[00:00.00]第一句歌词
[00:05.50]第二句歌词
[00:10.00]第三句歌词
`
```
```

### 1.3 用户生成内容标准

```
提示词：实现 UGC 内容审核系统

需求：
- 内容审核流程
- 敏感词过滤
- 图片审核
- 人工审核队列

```typescript
interface UGCContent {
  id: string
  userId: string
  type: 'comment' | 'review' | 'message' | 'image'
  content: string
  status: 'pending' | 'approved' | 'rejected' | 'deleted'
  auditResult?: AuditResult
  createdAt: Date
}

interface AuditResult {
  passed: boolean
  score: number           // 安全分数 0-100
  categories: string[]    // 风险类别
  reason?: string         // 拒绝原因
  auditor?: string        // 审核人
  auditedAt: Date
}

class ContentAuditor {
  // 敏感词检测
  detectSensitiveWords(content: string): string[]
  
  // 图片审核
  auditImage(imageUrl: string): Promise<AuditResult>
  
  // 文本审核
  auditText(content: string): Promise<AuditResult>
  
  // 提交审核
  submitForAudit(content: UGCContent): void
  
  // 人工审核
  manualAudit(contentId: string, decision: 'approve' | 'reject', reason?: string): void
}
```
```

---

## 二、流程化建设提示词

### 2.1 音乐管理流程

```
提示词：实现音乐管理全流程系统

流程：音乐上传 → 元数据填写 → 质量检测 → 内容审核 → 版权确认 → 发布上线 → 数据分析

```typescript
interface MusicUploadFlow {
  // 步骤1：上传
  upload(file: File): Promise<UploadResult>
  
  // 步骤2：元数据填写
  fillMetadata(uploadId: string, metadata: Partial<MusicMetadata>): void
  
  // 步骤3：质量检测
  qualityCheck(uploadId: string): Promise<QualityReport>
  
  // 步骤4：内容审核
  contentAudit(uploadId: string): Promise<AuditResult>
  
  // 步骤5：版权确认
  copyrightVerify(uploadId: string): Promise<CopyrightStatus>
  
  // 步骤6：发布上线
  publish(uploadId: string): Promise<PublishResult>
  
  // 步骤7：数据分析
  analytics(musicId: string): Promise<MusicAnalytics>
}

interface QualityReport {
  audioQuality: 'excellent' | 'good' | 'acceptable' | 'poor'
  bitrate: number
  sampleRate: number
  dynamicRange: number
  peakLevel: number
  issues: string[]
  recommendations: string[]
}

interface CopyrightStatus {
  verified: boolean
  type: 'original' | 'cover' | 'remix' | 'sample'
  license?: string
  royalties?: RoyaltyInfo
}
```
```

### 2.2 用户服务流程

```
提示词：实现用户服务全流程系统

流程：用户注册 → 身份验证 → 偏好设置 → 个性化推荐 → 音乐播放 → 互动反馈 → 数据收集

```typescript
interface UserOnboardingFlow {
  // 步骤1：注册
  register(credentials: RegisterCredentials): Promise<User>
  
  // 步骤2：身份验证
  verifyIdentity(userId: string, method: 'email' | 'phone' | 'idcard'): Promise<boolean>
  
  // 步骤3：偏好设置
  setupPreferences(userId: string, preferences: UserPreferences): void
  
  // 步骤4：个性化推荐
  generateRecommendations(userId: string): Promise<Recommendation[]>
  
  // 步骤5：音乐播放
  trackPlayback(userId: string, musicId: string, duration: number): void
  
  // 步骤6：互动反馈
  collectFeedback(userId: string, feedback: UserFeedback): void
  
  // 步骤7：数据收集
  collectBehaviorData(userId: string): Promise<BehaviorData>
}

interface UserPreferences {
  genres: string[]
  artists: string[]
  languages: string[]
  moods: string[]
  discoveryLevel: 'conservative' | 'balanced' | 'adventurous'
}
```
```

### 2.3 内容创作流程

```
提示词：实现 AI 内容创作流程系统

流程：主题选择 → 风格设定 → 关键词输入 → AI生成 → 人工编辑 → 预览确认 → 保存/发布

```typescript
interface AICreationFlow {
  // 步骤1：主题选择
  selectTheme(theme: CreationTheme): void
  
  // 步骤2：风格设定
  setStyle(style: MusicStyle): void
  
  // 步骤3：关键词输入
  inputKeywords(keywords: string[]): void
  
  // 步骤4：AI生成
  generate(params: GenerationParams): Promise<CreationResult>
  
  // 步骤5：人工编辑
  edit(creationId: string, modifications: EditModification[]): void
  
  // 步骤6：预览确认
  preview(creationId: string): Promise<PreviewResult>
  
  // 步骤7：保存/发布
  saveOrPublish(creationId: string, action: 'save' | 'publish'): Promise<ActionResult>
}

interface GenerationParams {
  theme: CreationTheme
  style: MusicStyle
  keywords: string[]
  duration?: number
  tempo?: number
  key?: string
  mood?: string
  instruments?: string[]
}

interface CreationResult {
  id: string
  lyrics?: string
  melody?: string      // MIDI 或音频 URL
  arrangement?: string
  duration: number
  metadata: CreationMetadata
}
```
```

### 2.4 数据分析流程

```
提示词：实现数据分析流程系统

流程：数据采集 → 清洗处理 → 存储归档 → 分析挖掘 → 可视化展示 → 报告生成 → 决策支持

```typescript
interface DataAnalysisFlow {
  // 步骤1：数据采集
  collect(sources: DataSource[]): Promise<RawData[]>
  
  // 步骤2：清洗处理
  clean(rawData: RawData[]): Promise<CleanedData>
  
  // 步骤3：存储归档
  store(data: CleanedData): Promise<StorageResult>
  
  // 步骤4：分析挖掘
  analyze(data: CleanedData, analysisType: AnalysisType): Promise<AnalysisResult>
  
  // 步骤5：可视化展示
  visualize(result: AnalysisResult): Visualization[]
  
  // 步骤6：报告生成
  generateReport(results: AnalysisResult[]): Promise<Report>
  
  // 步骤7：决策支持
  provideInsights(report: Report): DecisionInsight[]
}

type AnalysisType = 
  | 'user_behavior' 
  | 'content_performance' 
  | 'trend_prediction' 
  | 'revenue_analysis'
  | 'engagement_metrics'
```
```

---

## 三、科技化建设提示词

### 3.1 音频技术

```
提示词：实现高级音频处理系统

需求：
- 音频编解码
- AI降噪
- 3D音效
- 智能均衡器
- 自适应比特率

```typescript
class AudioProcessor {
  // 音频编解码
  encode(audio: AudioBuffer, format: 'mp3' | 'aac' | 'flac'): Promise<Blob>
  decode(file: Blob): Promise<AudioBuffer>
  
  // AI降噪
  denoise(audio: AudioBuffer, level: number): Promise<AudioBuffer>
  
  // 3D音效
  apply3DEffect(audio: AudioBuffer, position: Position3D): Promise<AudioBuffer>
  
  // 智能均衡器
  autoEQ(audio: AudioBuffer, preset: EQPreset): Promise<AudioBuffer>
  
  // 音频分析
  analyze(audio: AudioBuffer): AudioAnalysis
}

interface Position3D {
  x: number  // 左右 (-1 to 1)
  y: number  // 前后 (-1 to 1)
  z: number  // 上下 (-1 to 1)
}

interface AudioAnalysis {
  bpm: number
  key: string
  mode: 'major' | 'minor'
  energy: number
  danceability: number
  valence: number
  sections: AudioSection[]
}

// 自适应比特率流媒体
class AdaptiveStreamer {
  selectQuality(networkSpeed: number, bufferHealth: number): QualityLevel
  switchQuality(current: QualityLevel, target: QualityLevel): void
  monitorNetwork(): Observable<NetworkStatus>
}
```
```

### 3.2 前端技术

```
提示词：实现前端核心技术模块

需求：
- 响应式布局
- Canvas可视化
- PWA支持
- 性能优化

```typescript
// 响应式布局
interface ResponsiveLayout {
  breakpoints: {
    mobile: number    // 320px
    tablet: number    // 768px
    desktop: number   // 1024px
    wide: number      // 1440px
  }
  
  useMediaQuery(query: string): boolean
  useBreakpoint(): Breakpoint
  useResponsiveValue<T>(values: Record<Breakpoint, T>): T
}

// Canvas 音频可视化
class AudioVisualizer {
  constructor(canvas: HTMLCanvasElement, audioContext: AudioContext)
  
  // 波形图
  drawWaveform(analyser: AnalyserNode): void
  
  // 频谱图
  drawSpectrum(analyser: AnalyserNode): void
  
  // 粒子效果
  drawParticles(audioData: Uint8Array): void
  
  // 圆形可视化
  drawCircular(audioData: Uint8Array): void
}

// PWA 功能
class PWAService {
  registerServiceWorker(): Promise<ServiceWorkerRegistration>
  requestNotificationPermission(): Promise<NotificationPermission>
  showNotification(title: string, options: NotificationOptions): void
  checkForUpdate(): Promise<void>
  getInstallPrompt(): BeforeInstallPromptEvent | null
}

// 性能优化
class PerformanceOptimizer {
  // 图片懒加载
  lazyLoadImages(): void
  
  // 代码分割
  dynamicImport<T>(module: string): Promise<T>
  
  // 虚拟列表
  useVirtualList<T>(items: T[], itemHeight: number): VirtualListResult<T>
  
  // 缓存策略
  cache<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T>
}
```
```

### 3.3 后端技术

```
提示词：实现后端微服务架构

需求：
- 微服务拆分
- 云原生部署
- 大数据处理
- 实时计算

```typescript
// 微服务架构
interface Microservices {
  userService: UserService
  musicService: MusicService
  recommendationService: RecommendationService
  searchService: SearchService
  analyticsService: AnalyticsService
  notificationService: NotificationService
}

// 用户服务
interface UserService {
  register(credentials: RegisterDTO): Promise<User>
  login(credentials: LoginDTO): Promise<AuthToken>
  getProfile(userId: string): Promise<UserProfile>
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>
}

// 音乐服务
interface MusicService {
  upload(file: File, metadata: MusicMetadata): Promise<Music>
  stream(musicId: string, quality: QualityLevel): Promise<ReadableStream>
  search(query: SearchQuery): Promise<SearchResult>
  getRecommendations(userId: string): Promise<Music[]>
}

// 推荐服务
interface RecommendationService {
  getPersonalized(userId: string): Promise<Recommendation[]>
  getSimilar(musicId: string): Promise<Music[]>
  getTrending(): Promise<Music[]>
  getNewReleases(): Promise<Music[]>
}

// Kubernetes 部署配置
const k8sDeployment = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: d-music-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: d-music-api
  template:
    spec:
      containers:
      - name: api
        image: d-music/api:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
`
```
```

---

## 四、规范化建设提示词

### 4.1 开发管理规范

```
提示词：建立开发管理规范体系

需求：
- Git工作流
- 代码审查
- 版本发布

```yaml
# Git 分支策略
branches:
  main:
    description: 生产环境
    protection: true
    requiredReviews: 2
    
  develop:
    description: 开发环境
    protection: true
    requiredReviews: 1
    
  feature/*:
    description: 功能分支
    from: develop
    mergeTo: develop
    
  release/*:
    description: 发布分支
    from: develop
    mergeTo: main
    
  hotfix/*:
    description: 热修复分支
    from: main
    mergeTo: main, develop

# 提交规范 (Conventional Commits)
commitlint:
  types:
    - feat: 新功能
    - fix: Bug修复
    - docs: 文档更新
    - style: 代码格式
    - refactor: 重构
    - perf: 性能优化
    - test: 测试
    - chore: 构建/工具
    - ci: CI/CD
    - build: 构建

# 代码审查清单
codeReviewChecklist:
  - [ ] 代码符合规范
  - [ ] 有足够的测试覆盖
  - [ ] 无安全漏洞
  - [ ] 性能可接受
  - [ ] 文档已更新
  - [ ] 无敏感信息泄露

# 版本发布流程
releaseProcess:
  1. 创建 release 分支
  2. 更新版本号
  3. 更新 CHANGELOG
  4. 运行完整测试
  5. 合并到 main
  6. 打 tag
  7. 构建 Docker 镜像
  8. 部署到生产
  9. 发布通知
```
```

### 4.2 内容管理规范

```
提示词：实现内容管理规范系统

需求：
- 音乐上传标准
- 版权审核流程
- 内容分类体系

```typescript
// 音乐上传标准
interface MusicUploadStandard {
  // 格式要求
  formats: ['mp3', 'flac', 'wav', 'aac', 'ogg']
  
  // 质量要求
  minBitrate: 128      // kbps
  recommendedBitrate: 320
  minSampleRate: 44100 // Hz
  
  // 文件大小限制
  maxSize: 100         // MB
  
  // 元数据必填项
  requiredMetadata: ['title', 'artist', 'genre']
  
  // 封面要求
  coverRequirements: {
    formats: ['jpg', 'png', 'webp']
    minSize: [500, 500]
    maxSize: 3000      // KB
  }
}

// 版权审核流程
interface CopyrightAuditFlow {
  // 提交审核
  submit(musicId: string, copyrightInfo: CopyrightInfo): Promise<AuditRequest>
  
  // 审核步骤
  steps: [
    '自动检测',      // 音频指纹匹配
    '人工初审',      // 版权专员审核
    '法务复核',      // 法务确认
    '最终审批'       // 管理层批准
  ]
  
  // 审核结果
  results: ['approved', 'rejected', 'pending', 'needs_info']
}

// 内容分类体系
interface ContentClassification {
  // 流派分类
  genres: [
    'pop', 'rock', 'hiphop', 'electronic', 'jazz',
    'classical', 'folk', 'rnb', 'country', 'metal',
    'blues', 'reggae', 'punk', 'indie', 'other'
  ]
  
  // 情绪分类
  moods: [
    'happy', 'sad', 'energetic', 'calm', 'romantic',
    'angry', 'melancholy', 'uplifting', 'peaceful', 'intense'
  ]
  
  // 场景分类
  scenes: [
    'workout', 'study', 'sleep', 'party', 'travel',
    'dinner', 'morning', 'evening', 'focus', 'relax'
  ]
  
  // 语言分类
  languages: ['zh', 'en', 'ja', 'ko', 'other']
}
```
```

### 4.3 服务质量规范

```
提示词：实现服务质量监控体系

需求：
- SLA定义
- 性能监控
- 告警机制

```typescript
// 服务等级协议 (SLA)
interface SLA {
  availability: 99.9          // 系统可用性
  apiResponseTime: 200        // API响应时间 (ms)
  pageLoadTime: 2000          // 页面加载时间 (ms)
  errorRate: 0.1              // 错误率 (%)
  mttr: 30                    // 平均恢复时间 (分钟)
}

// 性能监控
class PerformanceMonitor {
  // 监控指标
  metrics: {
    cpu: number
    memory: number
    diskIO: number
    networkIO: number
    requestRate: number
    errorRate: number
    latency: number
  }
  
  // 收集指标
  collect(): Promise<Metrics>
  
  // 存储历史数据
  store(metrics: Metrics): Promise<void>
  
  // 生成报告
  report(period: TimePeriod): Promise<PerformanceReport>
}

// 告警规则
interface AlertRules {
  // CPU 告警
  cpuAlert: {
    warning: 70    // %
    critical: 90
    duration: 300  // 秒
  }
  
  // 内存告警
  memoryAlert: {
    warning: 80
    critical: 95
    duration: 300
  }
  
  // 错误率告警
  errorRateAlert: {
    warning: 1
    critical: 5
    duration: 60
  }
  
  // 响应时间告警
  latencyAlert: {
    warning: 500
    critical: 1000
    duration: 60
  }
}

// 告警通知
class AlertNotifier {
  sendAlert(alert: Alert): Promise<void>
  
  channels: {
    email: EmailChannel
    sms: SMSChannel
    webhook: WebhookChannel
    slack: SlackChannel
  }
}
```
```

---

## 五、智能化建设提示词

### 5.1 智能推荐系统

```
提示词：实现智能推荐系统

需求：
- 用户画像构建
- 内容特征提取
- 多算法融合推荐

```typescript
// 用户画像
interface UserProfile {
  userId: string
  
  // 基础属性
  demographics: {
    age: number
    gender: string
    location: string
    language: string
  }
  
  // 行为特征
  behaviors: {
    playHistory: PlayRecord[]
    searchHistory: SearchRecord[]
    interactionHistory: InteractionRecord[]
    socialConnections: string[]
  }
  
  // 偏好特征
  preferences: {
    genres: Map<string, number>      // 流派偏好度
    artists: Map<string, number>     // 艺术家偏好度
    moods: Map<string, number>       // 情绪偏好度
    tempos: Map<string, number>      // 节奏偏好度
  }
  
  // 时间特征
  temporal: {
    activeHours: number[]
    activeDays: number[]
    sessionDuration: number
  }
}

// 内容特征提取
class FeatureExtractor {
  // 音频特征
  extractAudioFeatures(audio: AudioBuffer): AudioFeatures
  
  // 元数据特征
  extractMetadataFeatures(metadata: MusicMetadata): MetadataFeatures
  
  // 歌词特征
  extractLyricFeatures(lyrics: string): LyricFeatures
  
  // 社交特征
  extractSocialFeatures(musicId: string): SocialFeatures
}

// 推荐算法
class RecommendationEngine {
  // 协同过滤
  collaborativeFiltering(userId: string): Promise<Recommendation[]>
  
  // 内容推荐
  contentBasedFiltering(userId: string): Promise<Recommendation[]>
  
  // 深度学习推荐
  deepLearningRecommendation(userId: string): Promise<Recommendation[]>
  
  // 混合推荐
  hybridRecommendation(userId: string): Promise<Recommendation[]>
  
  // 实时推荐
  realtimeRecommendation(context: RecommendationContext): Promise<Recommendation[]>
}

// 推荐结果
interface Recommendation {
  musicId: string
  score: number
  reason: string
  algorithm: string
  confidence: number
}
```
```

### 5.2 智能创作助手

```
提示词：实现 AI 智能创作助手

需求：
- AI歌词生成
- 智能编辑辅助
- 创作灵感推荐

```typescript
// AI 歌词生成
class LyricsGenerator {
  // 基于主题生成
  generateByTheme(theme: string, style: MusicStyle): Promise<string>
  
  // 基于关键词生成
  generateByKeywords(keywords: string[]): Promise<string>
  
  // 续写歌词
  continueLyrics(existingLyrics: string, direction: string): Promise<string>
  
  // 风格转换
  transformStyle(lyrics: string, targetStyle: MusicStyle): Promise<string>
}

// 智能编辑辅助
class LyricsEditor {
  // 韵律检查
  checkRhyme(lyrics: string): RhymeAnalysis
  
  // 词性标注
  posTagging(lyrics: string): POSTagResult[]
  
  // 情感分析
  sentimentAnalysis(lyrics: string): SentimentResult
  
  // 相似歌词推荐
  suggestSimilar(lyrics: string): Promise<string[]>
  
  // 语法检查
  grammarCheck(lyrics: string): GrammarIssue[]
}

// 创作灵感推荐
class InspirationRecommender {
  // 热门主题
  getTrendingThemes(): Promise<Theme[]>
  
  // 流行元素
  getPopularElements(): Promise<Element[]>
  
  // 创作建议
  getSuggestions(userHistory: CreationHistory[]): Promise<Suggestion[]>
  
  // 成功案例
  getSuccessCases(genre: string): Promise<CaseStudy[]>
}
```
```

### 5.3 智能交互系统

```
提示词：实现智能交互系统

需求：
- 语音交互
- 智能客服
- 情感分析

```typescript
// 语音交互
class VoiceInteraction {
  // 语音识别
  speechToText(audio: Blob): Promise<string>
  
  // 语音搜索
  voiceSearch(audio: Blob): Promise<SearchResult>
  
  // 语音控制
  voiceControl(command: string): Promise<ActionResult>
  
  // 语音助手
  voiceAssistant(query: string): Promise<AssistantResponse>
}

// 智能客服
class IntelligentCustomerService {
  // 意图识别
  recognizeIntent(query: string): Promise<Intent>
  
  // 自动问答
  autoAnswer(query: string): Promise<Answer>
  
  // 多轮对话
  conversation(userId: string, message: string): Promise<Response>
  
  // 工单创建
  createTicket(issue: Issue): Promise<Ticket>
  
  // 人工转接
  transferToHuman(userId: string): void
}

// 情感分析
class SentimentAnalyzer {
  // 评论情感分析
  analyzeComment(comment: string): SentimentResult
  
  // 用户情绪追踪
  trackUserSentiment(userId: string): Promise<SentimentTrend>
  
  // 舆情监控
  monitorPublicOpinion(): Promise<OpinionReport>
  
  // 预警触发
  triggerAlert(negativeScore: number): void
}
```
```

---

## 六、国标化建设提示词

### 6.1 国家标准遵循

```
提示词：实现国家标准合规体系

需求：
- GB/T 8566 软件开发规范
- GB/T 22239 网络安全等级保护
- GB/T 17975.3 音频编码标准
- GB/T 28539 用户界面设计

```typescript
// GB/T 8566 软件开发规范
interface SoftwareDevelopmentStandard {
  // 开发流程
  developmentProcess: {
    requirementsAnalysis: RequirementsDocument
    systemDesign: DesignDocument
    implementation: CodeStandard
    testing: TestStandard
    deployment: DeploymentStandard
    maintenance: MaintenanceStandard
  }
  
  // 文档要求
  documentation: {
    srs: SoftwareRequirementsSpecification
    sdd: SystemDesignDocument
    sad: SystemArchitectureDocument
    dbd: DatabaseDesignDocument
    apid: APIDocumentation
    um: UserManual
  }
}

// GB/T 22239 网络安全等级保护
interface SecurityProtection {
  // 等级划分
  levels: {
    level1: '自主保护'
    level2: '系统审计保护'
    level3: '安全标记保护'
    level4: '结构化保护'
    level5: '访问验证保护'
  }
  
  // 安全要求
  requirements: {
    physicalSecurity: PhysicalSecurityRequirements
    networkSecurity: NetworkSecurityRequirements
    hostSecurity: HostSecurityRequirements
    applicationSecurity: ApplicationSecurityRequirements
    dataSecurity: DataSecurityRequirements
  }
  
  // 合规检查
  complianceCheck(): Promise<ComplianceReport>
}

// GB/T 17975.3 音频编码标准
interface AudioCodingStandard {
  // 支持格式
  formats: {
    mpeg1: 'MPEG-1 Audio Layer 3 (MP3)'
    mpeg2: 'MPEG-2 Audio'
    mpeg4: 'MPEG-4 AAC'
    flac: 'Free Lossless Audio Codec'
  }
  
  // 编码参数
  parameters: {
    sampleRates: [8000, 16000, 22050, 44100, 48000, 96000]
    bitDepths: [16, 24, 32]
    channels: [1, 2, 6, 8]
  }
  
  // 质量检测
  qualityTest(audio: AudioBuffer): QualityReport
}

// GB/T 28539 用户界面设计
interface UIDesignStandard {
  // 可用性要求
  usability: {
    effectiveness: number    // 任务完成率
    efficiency: number       // 完成时间
    satisfaction: number     // 用户满意度
  }
  
  // 可访问性要求
  accessibility: {
    keyboardNavigation: boolean
    screenReaderSupport: boolean
    colorContrast: number    // 最小对比度 4.5:1
    fontSize: number         // 最小字号
  }
  
  // 设计原则
  principles: [
    '一致性',
    '反馈性',
    '容错性',
    '可学习性',
    '可记忆性'
  ]
}
```
```

### 6.2 行业标准遵循

```
提示词：实现行业标准合规体系

需求：
- 数字音乐内容格式规范
- 网络音乐服务规范
- 个人信息安全保护

```typescript
// 数字音乐内容格式规范
interface DigitalMusicFormat {
  // 元数据标准
  metadata: {
    required: ['title', 'artist', 'album', 'duration', 'genre']
    optional: ['composer', 'lyricist', 'producer', 'isrc', 'upc']
  }
  
  // 音频格式
  audioFormats: {
    lossy: ['mp3', 'aac', 'ogg']
    lossless: ['flac', 'alac', 'wav']
    hiRes: ['dsd', 'mqa']
  }
  
  // 封面标准
  coverArt: {
    minResolution: 500
    recommendedResolution: 1500
    formats: ['jpeg', 'png']
    colorSpace: 'sRGB'
  }
}

// 网络音乐服务规范
interface MusicServiceStandard {
  // 服务质量
  qualityOfService: {
    availability: 99.9
    responseTime: 200
    errorRate: 0.1
  }
  
  // 用户权益
  userRights: {
    privacy: boolean
    dataPortability: boolean
    accountDeletion: boolean
    refund: boolean
  }
  
  // 版权保护
  copyrightProtection: {
    drm: boolean
    watermarking: boolean
    fingerprinting: boolean
  }
}

// 个人信息安全保护
interface PersonalInfoProtection {
  // 数据收集
  dataCollection: {
    principle: '最小必要'
    consent: boolean
    purpose: string
  }
  
  // 数据存储
  dataStorage: {
    encryption: boolean
    accessControl: boolean
    audit: boolean
  }
  
  // 数据使用
  dataUsage: {
    purpose: string
    retention: Duration
    deletion: boolean
  }
  
  // 用户权利
  userRights: {
    access: boolean
    rectification: boolean
    erasure: boolean
    portability: boolean
  }
}
```
```

---

## 七、六化一体整合提示词

### 7.1 数据中台

```
提示词：实现数据中台架构

需求：
- 数据采集
- 数据处理
- 数据分析

```typescript
// 数据中台架构
class DataPlatform {
  // 数据采集层
  collection: {
    // 实时采集
    realtime: {
      userBehavior: UserBehaviorCollector
      systemMetrics: MetricsCollector
      businessEvents: EventCollector
    }
    
    // 批量采集
    batch: {
      musicMetadata: MetadataCollector
      userProfiles: ProfileCollector
      historicalData: HistoryCollector
    }
  }
  
  // 数据处理层
  processing: {
    // ETL
    etl: ETLProcessor
    
    // 实时计算
    streaming: StreamProcessor
    
    // 批处理
    batch: BatchProcessor
  }
  
  // 数据存储层
  storage: {
    // 数据湖
    dataLake: DataLake
    
    // 数据仓库
    dataWarehouse: DataWarehouse
    
    // 缓存层
    cache: CacheLayer
  }
  
  // 数据服务层
  services: {
    // 数据查询
    query: QueryService
    
    // 数据分析
    analytics: AnalyticsService
    
    // 数据可视化
    visualization: VisualizationService
  }
}
```
```

### 7.2 业务中台

```
提示词：实现业务中台架构

需求：
- 用户服务
- 内容服务
- 运营服务

```typescript
// 业务中台架构
class BusinessPlatform {
  // 用户中心
  userCenter: {
    // 用户管理
    userManager: UserManager
    
    // 认证授权
    auth: AuthService
    
    // 用户画像
    profile: ProfileService
  }
  
  // 内容中心
  contentCenter: {
    // 音乐管理
    musicManager: MusicManager
    
    // 内容审核
    audit: AuditService
    
    // 版权管理
    copyright: CopyrightService
  }
  
  // 运营中心
  operationCenter: {
    // 活动管理
    activity: ActivityManager
    
    // 推荐系统
    recommendation: RecommendationService
    
    // 消息推送
    notification: NotificationService
  }
  
  // 交易中心
  transactionCenter: {
    // 订单管理
    order: OrderService
    
    // 支付管理
    payment: PaymentService
    
    // 结算管理
    settlement: SettlementService
  }
}
```
```

### 7.3 技术中台

```
提示词：实现技术中台架构

需求：
- 开发框架
- 组件库
- 中间件

```typescript
// 技术中台架构
class TechnologyPlatform {
  // 开发框架
  frameworks: {
    frontend: {
      vue: VueFramework
      react: ReactFramework
      mobile: MobileFramework
    }
    
    backend: {
      nodejs: NodeJSFramework
      spring: SpringFramework
      fastapi: FastAPIFramework
    }
  }
  
  // 组件库
  componentLibraries: {
    ui: UILibrary
    chart: ChartLibrary
    audio: AudioLibrary
    video: VideoLibrary
  }
  
  // 中间件
  middleware: {
    // 消息队列
    messageQueue: MessageQueue
    
    // 缓存
    cache: CacheMiddleware
    
    // 搜索
    search: SearchMiddleware
    
    // 日志
    logger: LoggingMiddleware
  }
  
  // 基础设施
  infrastructure: {
    // 容器编排
    kubernetes: KubernetesService
    
    // 服务网格
    serviceMesh: ServiceMesh
    
    // 监控告警
    monitoring: MonitoringService
    
    // CI/CD
    cicd: CICDService
  }
}
```
```

---

## 八、项目目录结构提示词

```
提示词：按照 Guidelines 规范创建项目目录结构

```bash
# 创建项目根目录
mkdir -p D-Music/{public,src,server,database,docs,docker,scripts}

# 创建前端目录
mkdir -p D-Music/src/{router,store,api,utils,components,views,styles,assets,plugins}
mkdir -p D-Music/src/components/{layout,ui,player,visualizer,community,create,interaction}
mkdir -p D-Music/src/router/modules
mkdir -p D-Music/src/store/modules

# 创建后端目录
mkdir -p D-Music/server/{config,routes,controllers,models,services,middleware,utils,jobs,tests}
mkdir -p D-Music/server/routes/api

# 创建数据库目录
mkdir -p D-Music/database/{migrations,seeds,schemas}

# 创建文档目录
mkdir -p D-Music/docs/{api,architecture,deployment,guides}

# 创建 Docker 目录
mkdir -p D-Music/docker

# 创建脚本目录
mkdir -p D-Music/scripts

# 创建静态资源目录
mkdir -p D-Music/public/assets/{images,fonts,icons}
```

生成的目录结构：
```
D-Music/
├── public/                    # 静态资源
├── src/                       # 前端源码
│   ├── router/                # 路由配置
│   ├── store/                 # 状态管理
│   ├── api/                   # API接口
│   ├── utils/                 # 工具函数
│   ├── components/            # 组件库
│   ├── views/                 # 页面组件
│   ├── styles/                # 样式文件
│   ├── assets/                # 资源文件
│   └── plugins/               # 插件
├── server/                    # 后端服务
│   ├── config/                # 配置文件
│   ├── routes/                # 路由
│   ├── controllers/           # 控制器
│   ├── models/                # 数据模型
│   ├── services/              # 服务层
│   ├── middleware/            # 中间件
│   ├── utils/                 # 工具函数
│   ├── jobs/                  # 定时任务
│   └── tests/                 # 测试文件
├── database/                  # 数据库
│   ├── migrations/            # 迁移文件
│   ├── seeds/                 # 数据种子
│   └── schemas/               # 数据库模式
├── docs/                      # 文档
├── docker/                    # Docker配置
└── scripts/                   # 脚本文件
```
```

---

<div align="center">

> YYC³ Team | D-Music Guidelines 开发提示词库

</div>
