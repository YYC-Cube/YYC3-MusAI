---
@file: Figma-对齐-修复审核提示词_v1.0.md
@description: YYC³ D-Music-B Figma 设计对齐修复与审核提示词
@author: YanYuCloudCube Team
@version: v1.0
@created: 2026-02-26
@updated: 2026-02-26
@status: active
@tags: [figma, alignment, review, fix]
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

# Figma 设计对齐 - 修复与审核提示词

## 📋 使用说明

### 适用场景

此提示词适用于以下场景：

| 场景 | 说明 | 使用方式 |
|------|------|----------|
| **Figma 设计修复** | 根据 Figma 设计修复现有 UI/UX 问题 | 逐像素对齐，逐交互验证 |
| **代码审核** | 审核修复后的代码是否符合 Figma 设计 | 对比 Figma 设计稿，检查实现细节 |
| **回归测试** | 验证修复后是否引入新的问题 | 全面测试，确保功能正常 |
| **设计评审** | 评估新功能是否符合 Figma 设计规范 | 设计规范检查，用户体验评估 |

### 协作流程

```
┌─────────────────────────────────────────────────────────┐
│         Figma 对齐修复与审核流程                  │
├─────────────────────────────────────────────────────────┤
│                                                   │
│  1. Figma 设计分析                                 │
│     ├── 打开 Figma 设计文件                         │
│     ├── 分析设计规范（颜色、字体、间距）           │
│     ├── 分析交互规范（动画、过渡、反馈）           │
│     ├── 分析响应式规则（断点、布局）             │
│     └── 提取关键设计参数（尺寸、圆角、阴影）   │
│                                                   │
│  2. 现有代码审查                                 │
│     ├── 定位相关组件文件                           │
│     ├── 分析当前实现与 Figma 设计的差距           │
│     ├── 识别需要修复的问题                       │
│     └── 记录技术债务和优化点                 │
│                                                   │
│  3. 修复实施                                       │
│     ├── 按照 Figma 设计修改 UI/UX               │
│     ├── 调整样式（颜色、间距、圆角）           │
│     ├── 实现交互（动画、过渡、反馈）           │
│     ├── 优化响应式布局                           │
│     └── 确保无障碍支持                           │
│                                                   │
│  4. 代码审核                                       │
│     ├── 逐像素比对 UI 设计                       │
│     ├── 逐交互验证用户体验                     │
│     ├── 检查代码质量和类型安全                 │
│     └── 验证性能指标                           │
│                                                   │
│  5. 测试验证                                       │
│     ├── 功能测试（确保功能正常）                   │
│     ├── UI 测试（确保视觉一致）                   │
│     ├── 交互测试（确保体验流畅）                   │
│     ├── 响应式测试（确保多设备兼容）             │
│     └── 性能测试（确保性能达标）                   │
│                                                   │
│  6. 文档更新                                       │
│     ├── 更新组件文档                               │
│     ├── 记录修复内容                               │
│     ├── 更新 Figma 交互记录                       │
│     └── 提供回归测试建议                         │
│                                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 核心原则

### Figma 对齐原则

| 原则 | 描述 | 执行要求 |
|------|------|----------|
| **逐像素对齐** | 所有尺寸、间距、圆角必须与 Figma 完全一致 | 使用设计工具测量，精确到 1px |
| **颜色精确匹配** | 所有颜色值必须与 Figma 完全一致 | 使用 Figma 颜色代码，不使用近似值 |
| **字体规范统一** | 字体大小、字重、行高必须与 Figma 一致 | 使用 Tailwind 类名，不使用硬编码 |
| **交互流畅自然** | 所有动画、过渡必须符合 Figma 设计 | 使用 CSS 动画，时长和缓动函数一致 |
| **响应式严格** | 断点、布局必须遵循 Figma 响应式规则 | 使用 Tailwind 断点，不使用自定义媒体查询 |
| **无障碍优先** | 所有交互必须支持键盘和屏幕阅读器 | 添加 ARIA 标签，支持键盘导航 |

### 代码质量原则

| 原则 | 描述 | 执行要求 |
|------|------|----------|
| **类型安全** | 所有代码必须通过 TypeScript 类型检查 | 零类型错误，严格类型定义 |
| **代码规范** | 代码必须符合 YYC³ 编码规范 | ESLint 零警告，代码可读性高 |
| **性能优先** | 所有修复必须考虑性能影响 | 不引入性能问题，优化渲染性能 |
| **测试覆盖** | 所有修复必须有对应测试 | 单元测试 ≥ 80%，集成测试 100% |
| **向后兼容** | 修复不能破坏现有功能 | 全面测试，确保功能正常 |

---

## 📐 Figma 设计规范

### 颜色系统

#### 主色板

| 颜色 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **Primary** | #6366f1 | `bg-indigo-600` | 主要按钮、链接、强调 |
| **Primary Light** | #818cf8 | `bg-indigo-500` | 悬停状态 |
| **Primary Dark** | #4338ca | `bg-indigo-700` | 按下状态 |
| **Secondary** | #6b7280 | `bg-gray-600` | 次要按钮、链接 |
| **Success** | #10b981 | `bg-green-600` | 成功状态、确认按钮 |
| **Warning** | #f59e0b | `bg-yellow-500` | 警告状态、注意提示 |
| **Error** | #ef4444 | `bg-red-500` | 错误状态、取消按钮 |
| **Info** | #3b82f6 | `bg-blue-500` | 信息提示、链接 |

#### 中性色

| 颜色 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **White** | #ffffff | `bg-white` | 背景、卡片 |
| **Gray 50** | #f9fafb | `bg-gray-50` | 浅色背景 |
| **Gray 100** | #f3f4f6 | `bg-gray-100` | 边框、分割线 |
| **Gray 200** | #e5e7eb | `bg-gray-200` | 悬停背景 |
| **Gray 300** | #d1d5db | `bg-gray-300` | 禁用状态 |
| **Gray 400** | #9ca3af | `bg-gray-400` | 占位符 |
| **Gray 500** | #6b7280 | `text-gray-600` | 次要文字 |
| **Gray 600** | #4b5563 | `text-gray-700` | 主要文字 |
| **Gray 700** | #374151 | `text-gray-800` | 标题文字 |
| **Gray 800** | #1f2937 | `text-gray-900` | 深色文字 |
| **Black** | #111827 | `bg-gray-900` | 深色背景 |

#### 阴影系统

| 阴影 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **Shadow Sm** | 0 1px 2px rgba(0,0,0,0.05) | `shadow-sm` | 小元素、卡片 |
| **Shadow Base** | 0 1px 3px rgba(0,0,0,0.1) | `shadow` | 默认阴影 |
| **Shadow Md** | 0 4px 6px -1px rgba(0,0,0,0.1) | `shadow-md` | 中等元素、卡片 |
| **Shadow Lg** | 0 10px 15px -3px rgba(0,0,0,0.1) | `shadow-lg` | 大元素、弹窗 |
| **Shadow Xl** | 0 20px 25px -5px rgba(0,0,0,0.1) | `shadow-xl` | 超大元素、模态框 |

### 字体系统

#### 字体家族

| 字体 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **Primary** | Inter, system-ui | `font-sans` | 主要文字 |
| **Secondary** | JetBrains Mono, monospace | `font-mono` | 代码、数据 |
| **Heading** | Inter, system-ui | `font-sans` | 标题 |

#### 字体大小

| 大小 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **XS** | 12px | `text-xs` | 辅助文字、标签 |
| **SM** | 14px | `text-sm` | 次要文字、描述 |
| **Base** | 16px | `text-base` | 正文、段落 |
| **LG** | 18px | `text-lg` | 次要标题 |
| **XL** | 20px | `text-xl` | 主要标题 |
| **2XL** | 24px | `text-2xl` | 大标题 |
| **3XL** | 30px | `text-3xl` | 特大标题 |
| **4XL** | 36px | `text-4xl` | 超大标题 |

#### 字重

| 字重 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **Normal** | 400 | `font-normal` | 正文 |
| **Medium** | 500 | `font-medium` | 次要标题 |
| **Semibold** | 600 | `font-semibold` | 主要标题 |
| **Bold** | 700 | `font-bold` | 强调文字 |

### 间距系统

#### 间距比例

| 间距 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **0** | 0px | `p-0 m-0` | 无间距 |
| **1** | 4px | `p-1 m-1` | 超小间距 |
| **2** | 8px | `p-2 m-2` | 小间距 |
| **3** | 12px | `p-3 m-3` | 中等间距 |
| **4** | 16px | `p-4 m-4` | 标准间距 |
| **5** | 20px | `p-5 m-5` | 大间距 |
| **6** | 24px | `p-6 m-6` | 超大间距 |
| **8** | 32px | `p-8 m-8` | 特大间距 |
| **10** | 40px | `p-10 m-10` | 最大间距 |

#### 圆角系统

| 圆角 | Figma 值 | Tailwind 类名 | 用途 |
|------|----------|--------------|------|
| **None** | 0px | `rounded-none` | 无圆角 |
| **SM** | 4px | `rounded-sm` | 小圆角 |
| **Base** | 8px | `rounded` | 默认圆角 |
| **LG** | 12px | `rounded-lg` | 大圆角 |
| **XL** | 16px | `rounded-xl` | 超大圆角 |
| **2XL** | 24px | `rounded-2xl` | 特大圆角 |
| **Full** | 9999px | `rounded-full` | 完全圆角 |

### 响应式断点

| 断点 | Figma 值 | Tailwind 类名 | 设备 |
|------|----------|--------------|------|
| **SM** | 640px | `sm:` | 小型手机 |
| **MD** | 768px | `md:` | 平板 |
| **LG** | 1024px | `lg:` | 小型笔记本 |
| **XL** | 1280px | `xl:` | 桌面 |
| **2XL** | 1536px | `2xl:` | 大型显示器 |

---

## 🔍 审核检查清单

### 视觉设计审核

#### 颜色检查

- [ ] 所有颜色值与 Figma 设计完全一致
- [ ] 使用 Tailwind 类名，不使用硬编码颜色
- [ ] 颜色对比度符合 WCAG AA 标准（4.5:1）
- [ ] 深色模式颜色正确配置
- [ ] 禁用状态颜色正确显示

#### 字体检查

- [ ] 所有字体大小与 Figma 设计完全一致
- [ ] 所有字重与 Figma 设计完全一致
- [ ] 行高符合设计规范（1.5-1.75）
- [ ] 字体家族正确配置
- [ ] 文字颜色与背景对比度足够

#### 间距检查

- [ ] 所有内边距与 Figma 设计完全一致
- [ ] 所有外边距与 Figma 设计完全一致
- [ ] 所有间距使用 Tailwind 类名
- [ ] 间距比例符合 4px 基数系统
- [ ] 响应式间距正确调整

#### 圆角检查

- [ ] 所有圆角与 Figma 设计完全一致
- [ ] 使用 Tailwind 圆角类名
- [ ] 圆角在所有边角一致
- [ ] 圆角在不同屏幕尺寸正确显示

#### 阴影检查

- [ ] 所有阴影与 Figma 设计完全一致
- [ ] 使用 Tailwind 阴影类名
- [ ] 阴影颜色和模糊度正确
- [ ] 阴影在不同屏幕尺寸正确显示

### 交互设计审核

#### 动画检查

- [ ] 所有动画时长与 Figma 设计一致（通常 200-300ms）
- [ ] 所有缓动函数与 Figma 设计一致（通常 ease-out）
- [ ] 动画流畅，无卡顿
- [ ] 动画可以禁用（prefers-reduced-motion）
- [ ] 动画不影响性能

#### 过渡检查

- [ ] 所有过渡效果与 Figma 设计一致
- [ ] 过渡时长合理（通常 150-250ms）
- [ ] 过渡属性明确（all、transform、opacity）
- [ ] 过渡在不同浏览器一致
- [ ] 过渡不影响可访问性

#### 反馈检查

- [ ] 所有交互都有明确反馈（视觉、触觉）
- [ ] 加载状态清晰可见
- [ ] 错误状态明确显示
- [ ] 成功状态明确显示
- [ ] 禁用状态明确显示

### 响应式设计审核

#### 布局检查

- [ ] 在所有断点布局正确
- [ ] 移动端布局符合 Figma 设计
- [ ] 平板布局符合 Figma 设计
- [ ] 桌面布局符合 Figma 设计
- [ ] 大屏幕布局符合 Figma 设计

#### 元素检查

- [ ] 图片在不同屏幕正确缩放
- [ ] 文字在不同屏幕正确换行
- [ ] 按钮在不同屏幕正确大小
- [ ] 表单在不同屏幕正确布局
- [ ] 导航在不同屏幕正确显示

### 无障碍审核

#### ARIA 标签检查

- [ ] 所有交互元素有正确的 ARIA 标签
- [ ] 所有图片有 alt 文本
- [ ] 所有表单元素有 label
- [ ] 所有状态变化有 live region
- [ ] 错误信息与表单元素关联

#### 键盘导航检查

- [ ] 所有交互可以通过键盘访问
- [ ] Tab 键导航顺序合理
- [ ] Enter/Space 键触发正确操作
- [ ] Escape 键关闭模态框
- [ ] 方向键导航正确

#### 屏幕阅读器检查

- [ ] 语义化 HTML 结构正确
- [ ] 焦点管理正确
- [ ] 动态内容更新正确通知
- [ ] 错误信息可被屏幕阅读器读取
- [ ] 状态变化可被屏幕阅读器感知

---

## 🛠️ 修复实施指南

### 修复前准备

#### 1. 打开 Figma 设计文件

```bash
# 打开 Figma 设计文件
# 确保使用最新版本的设计稿
# 记录关键设计参数
```

#### 2. 定位相关组件

```bash
# 查找需要修复的组件
find src/app/components -name "*.tsx" | grep -i "componentname"

# 查看组件文件
cat src/app/components/ComponentName.tsx
```

#### 3. 分析差距

```typescript
// 创建差距分析文档
interface DesignGap {
  component: string;
  figmaSpec: string;
  currentImpl: string;
  gap: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

const gaps: DesignGap[] = [
  {
    component: 'VideoPlayer',
    figmaSpec: '圆角 12px，阴影 0-4px-16px rgba(0,0,0,0.1)',
    currentImpl: '圆角 8px，阴影 0-2px-4px rgba(0,0,0,0.05)',
    gap: '圆角和阴影不符合 Figma 设计',
    priority: 'high',
    action: '更新圆角为 rounded-xl，阴影为 shadow-lg'
  }
];
```

### 修复实施

#### 1. 更新样式

```typescript
// 修复前
<div className="video-container" style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>

// 修复后（使用 Tailwind 类名）
<div className="video-container rounded-xl shadow-lg">
```

#### 2. 更新间距

```typescript
// 修复前
<div style={{ padding: '16px' }}>

// 修复后（使用 Tailwind 类名）
<div className="p-4">
```

#### 3. 更新颜色

```typescript
// 修复前
<button style={{ backgroundColor: '#6366f1' }}>

// 修复后（使用 Tailwind 类名）
<button className="bg-indigo-600">
```

#### 4. 更新字体

```typescript
// 修复前
<h1 style={{ fontSize: '24px', fontWeight: 600 }}>

// 修复后（使用 Tailwind 类名）
<h1 className="text-2xl font-semibold">
```

#### 5. 更新圆角

```typescript
// 修复前
<div style={{ borderRadius: '8px' }}>

// 修复后（使用 Tailwind 类名）
<div className="rounded-lg">
```

#### 6. 更新阴影

```typescript
// 修复前
<div style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>

// 修复后（使用 Tailwind 类名）
<div className="shadow">
```

#### 7. 视频播放器修复

**Figma 设计规范**:

| 元素 | Figma 设计 | Tailwind 类名 |
|------|-----------|--------------|
| **视频容器** | 圆角 12px，阴影 0-4px-16px rgba(0,0,0,0.1) | `rounded-xl shadow-lg` |
| **播放控件** | 底部悬浮，高度 64px，背景 blur(20px) | `h-16 backdrop-blur-md bg-black/50` |
| **进度条** | 高度 4px，主色 #6366f1，已播放 #8b5cf6 | `h-1 bg-indigo-600` |
| **音量控制** | 悬浮显示，图标 24x24px | `w-6 h-6` |
| **全屏按钮** | 右上角，32x32px，白色半透明 | `w-8 h-8 bg-white/20` |
| **加载状态** | 中心显示，旋转动画 1s | `animate-spin` |

**修复前**:

```typescript
<div className="video-player" style={{ borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
  <video src={videoUrl} controls />
  <div className="controls" style={{ height: '48px', background: 'rgba(0,0,0,0.7)' }}>
    <button className="play-btn" style={{ width: '20px', height: '20px' }}>
      <PlayIcon />
    </button>
    <div className="progress" style={{ height: '2px', background: '#6366f1' }} />
  </div>
</div>
```

**修复后**:

```typescript
<div className="video-player rounded-xl shadow-lg overflow-hidden relative">
  <video
    src={videoUrl}
    className="w-full h-full object-cover"
    controlsList="nodownload"
  />
  
  <div className="controls absolute bottom-0 left-0 right-0 h-16 backdrop-blur-md bg-black/50 flex items-center px-4 gap-4">
    <button className="play-btn w-6 h-6 text-white hover:text-indigo-400 transition-colors" aria-label="播放/暂停">
      <PlayIcon />
    </button>
    
    <div className="progress flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
      <div className="progress-bar h-full bg-indigo-600 transition-all duration-200" style={{ width: `${progress}%` }} />
    </div>
    
    <div className="volume-control relative group">
      <button className="volume-btn w-6 h-6 text-white hover:text-indigo-400 transition-colors" aria-label="音量">
        <VolumeIcon />
      </button>
      <div className="volume-slider absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 h-1 bg-gray-600 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="volume-bar h-full bg-indigo-600" style={{ width: `${volume}%` }} />
      </div>
    </div>
    
    <button className="fullscreen-btn w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors" aria-label="全屏">
      <FullscreenIcon />
    </button>
  </div>
  
  {loading && (
    <div className="loading-state absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="spinner w-12 h-12 border-4 border-white/30 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )}
</div>
```

**关键修复点**:
- ✅ 视频容器圆角从 8px 更新为 12px（`rounded-xl`）
- ✅ 视频容器阴影从 `0-2px-4px` 更新为 `0-4px-16px`（`shadow-lg`）
- ✅ 播放控件高度从 48px 更新为 64px（`h-16`）
- ✅ 播放控件背景添加毛玻璃效果（`backdrop-blur-md`）
- ✅ 进度条高度从 2px 更新为 4px（`h-1`）
- ✅ 音量控制图标大小从 20px 更新为 24px（`w-6 h-6`）
- ✅ 全屏按钮大小从 20px 更新为 32px（`w-8 h-8`）
- ✅ 添加加载状态动画（`animate-spin`）
- ✅ 添加 ARIA 标签支持无障碍

**验证方法**:
```bash
# 1. 视觉验证
# 打开 Figma 设计文件
# 对比视频容器圆角和阴影
# 对比播放控件高度和背景
# 对比进度条高度和颜色

# 2. 交互验证
# 测试播放/暂停按钮
# 测试进度条拖动
# 测试音量控制
# 测试全屏切换

# 3. 性能验证
# 测试视频加载速度
# 测试播放流畅度
# 测试内存占用

# 4. 无障碍验证
# 测试键盘导航
# 测试屏幕阅读器
# 测试 ARIA 标签
```

#### 8. 音乐播放器修复

**Figma 设计规范**:

| 元素 | Figma 设计 | Tailwind 类名 |
|------|-----------|--------------|
| **播放器卡片** | 圆角 16px，阴影 0-8px-24px rgba(0,0,0,0.12) | `rounded-2xl shadow-xl` |
| **专辑封面** | 正方形 120x120px，圆角 8px | `w-30 h-30 rounded-lg` |
| **歌曲信息** | 标题 18px，艺术家 14px，颜色 #6b7280 | `text-lg font-semibold text-gray-600` |
| **播放控制** | 按钮大小 48x48px，间距 16px | `w-12 h-12 gap-4` |
| **进度条** | 高度 6px，主色 #6366f1，已播放 #8b5cf6 | `h-1.5 bg-indigo-600` |
| **时间显示** | 字体 12px，颜色 #9ca3af | `text-xs text-gray-400` |
| **音量滑块** | 高度 4px，宽度 120px | `h-1 w-30` |
| **播放模式** | 图标 20x20px，间距 8px | `w-5 h-5 gap-2` |

**修复前**:

```typescript
<div className="music-player" style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
  <img src={albumCover} alt={title} style={{ width: '100px', height: '100px', borderRadius: '4px' }} />
  <div className="info">
    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{title}</h3>
    <p style={{ fontSize: '12px', color: '#9ca3af' }}>{artist}</p>
  </div>
  <div className="controls">
    <button className="prev-btn" style={{ width: '40px', height: '40px' }}>
      <PrevIcon />
    </button>
    <button className="play-btn" style={{ width: '40px', height: '40px' }}>
      <PlayIcon />
    </button>
    <button className="next-btn" style={{ width: '40px', height: '40px' }}>
      <NextIcon />
    </button>
  </div>
  <div className="progress" style={{ height: '3px', background: '#6366f1' }} />
  <div className="time" style={{ fontSize: '10px', color: '#9ca3af' }}>
    <span>0:00</span>
    <span>3:45</span>
  </div>
</div>
```

**修复后**:

```typescript
<div className="music-player rounded-2xl shadow-xl bg-white p-6 space-y-6">
  <div className="album-cover flex justify-center">
    <img
      src={albumCover}
      alt={title}
      className="w-30 h-30 rounded-lg object-cover shadow-md"
    />
  </div>
  
  <div className="song-info text-center space-y-2">
    <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
    <p className="text-sm text-gray-600 truncate">{artist}</p>
  </div>
  
  <div className="progress-container space-y-2">
    <div className="progress h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
      <div className="progress-bar h-full bg-indigo-600 transition-all duration-200" style={{ width: `${progress}%` }} />
    </div>
    <div className="time flex justify-between text-xs text-gray-400">
      <span>{formatTime(currentTime)}</span>
      <span>{formatTime(duration)}</span>
    </div>
  </div>
  
  <div className="controls flex items-center justify-center gap-4">
    <button className="mode-btn w-5 h-5 text-gray-400 hover:text-indigo-600 transition-colors" aria-label="播放模式">
      <ShuffleIcon />
    </button>
    
    <button className="prev-btn w-12 h-12 flex items-center justify-center text-gray-700 hover:text-indigo-600 transition-colors" aria-label="上一首">
      <PrevIcon />
    </button>
    
    <button className="play-btn w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg" aria-label="播放/暂停">
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </button>
    
    <button className="next-btn w-12 h-12 flex items-center justify-center text-gray-700 hover:text-indigo-600 transition-colors" aria-label="下一首">
      <NextIcon />
    </button>
    
    <button className="mode-btn w-5 h-5 text-gray-400 hover:text-indigo-600 transition-colors" aria-label="播放模式">
      <RepeatIcon />
    </button>
  </div>
  
  <div className="volume-control flex items-center justify-center gap-3">
    <button className="volume-btn w-5 h-5 text-gray-400 hover:text-indigo-600 transition-colors" aria-label="音量">
      <VolumeIcon />
    </button>
    <div className="volume-slider w-30 h-1 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
      <div className="volume-bar h-full bg-indigo-600 transition-all duration-200" style={{ width: `${volume}%` }} />
    </div>
  </div>
</div>
```

**关键修复点**:

- ✅ 播放器卡片圆角从 12px 更新为 16px（`rounded-2xl`）
- ✅ 播放器卡片阴影从 `0-4px-12px` 更新为 `0-8px-24px`（`shadow-xl`）
- ✅ 专辑封面大小从 100px 更新为 120px（`w-30 h-30`）
- ✅ 专辑封面圆角从 4px 更新为 8px（`rounded-lg`）
- ✅ 歌曲标题字体从 16px 更新为 18px（`text-lg`）
- ✅ 艺术家字体从 12px 更新为 14px（`text-sm`）
- ✅ 播放控制按钮大小从 40px 更新为 48px（`w-12 h-12`）
- ✅ 播放控制按钮间距从 12px 更新为 16px（`gap-4`）
- ✅ 进度条高度从 3px 更新为 6px（`h-1.5`）
- ✅ 时间显示字体从 10px 更新为 12px（`text-xs`）
- ✅ 添加播放模式按钮（随机、重复）
- ✅ 添加 ARIA 标签支持无障碍

**验证方法**:
```bash
# 1. 视觉验证
# 打开 Figma 设计文件
# 对比播放器卡片圆角和阴影
# 对比专辑封面大小和圆角
# 对比歌曲信息字体大小和颜色
# 对比播放控制按钮大小和间距
# 对比进度条高度和颜色
# 对比时间显示字体大小

# 2. 交互验证
# 测试播放/暂停按钮
# 测试上一首/下一首按钮
# 测试进度条拖动
# 测试音量滑块
# 测试播放模式切换

# 3. 性能验证
# 测试音频加载速度
# 测试播放流畅度
# 测试内存占用

# 4. 无障碍验证
# 测试键盘导航
# 测试屏幕阅读器
# 测试 ARIA 标签
```

### 修复后验证

#### 1. 视觉对比

```bash
# 打开 Figma 设计文件
# 打开浏览器开发者工具
# 逐元素对比尺寸、颜色、间距
```

#### 2. 交互测试

```bash
# 测试所有交互
# 验证动画、过渡、反馈
# 确保体验流畅
```

#### 3. 响应式测试

```bash
# 在不同屏幕尺寸测试
# 验证布局正确
# 确保元素可见
```

#### 4. 无障碍测试

```bash
# 使用键盘导航
# 使用屏幕阅读器
# 验证 ARIA 标签
```

---

## ✅ 代码审核标准

### 功能审核

- [ ] 修复后的功能与 Figma 设计一致
- [ ] 所有交互符合 Figma 设计规范
- [ ] 所有状态正确显示（正常、悬停、禁用、错误）
- [ ] 所有动画和过渡符合 Figma 设计
- [ ] 响应式布局在所有断点正确

### 代码质量审核

- [ ] TypeScript 类型检查零错误
- [ ] ESLint 检查零警告
- [ ] 代码符合 YYC³ 编码规范
- [ ] 代码可读性高，注释清晰
- [ ] 无硬编码值，使用 Tailwind 类名

### 性能审核

- [ ] 修复不引入性能问题
- [ ] 渲染性能良好（60fps）
- [ ] 内存占用合理（< 100MB）
- [ ] 网络请求数合理（< 50）
- [ ] Lighthouse 评分 ≥ 90

### 测试审核

- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 集成测试通过率 100%
- [ ] E2E 测试通过率 100%
- [ ] 回归测试通过率 100%
- [ ] 无障碍测试通过

---

## 📝 审核报告模板

### 报告结构

```markdown
# Figma 对齐修复审核报告

## 组件信息

- **组件名称**: [ComponentName]
- **文件路径**: [src/app/components/ComponentName.tsx]
- **审核日期**: [YYYY-MM-DD]
- **审核人员**: [Name]

## Figma 设计规范

- **设计文件**: [Figma URL]
- **设计版本**: [Version]
- **设计规范**: [详细描述]

## 修复内容

### 修复前

- **问题描述**: [详细描述]
- **影响范围**: [影响的功能/页面]
- **严重程度**: [High/Medium/Low]

### 修复后

- **修复方案**: [详细描述]
- **修改文件**: [文件列表]
- **代码变更**: [关键代码片段]

## 审核结果

### 视觉设计

- [ ] 颜色与 Figma 一致
- [ ] 字体与 Figma 一致
- [ ] 间距与 Figma 一致
- [ ] 圆角与 Figma 一致
- [ ] 阴影与 Figma 一致

### 交互设计

- [ ] 动画与 Figma 一致
- [ ] 过渡与 Figma 一致
- [ ] 反馈与 Figma 一致
- [ ] 响应式与 Figma 一致

### 代码质量

- [ ] TypeScript 类型检查通过
- [ ] ESLint 检查通过
- [ ] 代码规范符合
- [ ] 性能指标达标

### 测试覆盖

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] E2E 测试通过
- [ ] 无障碍测试通过

## 总体评估

- **审核结果**: [通过/不通过/有条件通过]
- **主要问题**: [列出主要问题]
- **改进建议**: [列出改进建议]
- **后续行动**: [列出后续行动]

## 附录

- **截图对比**: [修复前后对比图]
- **测试报告**: [测试结果链接]
- **性能数据**: [性能指标数据]
```

---

## 🚀 执行建议

### 优先级排序

1. **高优先级** - 核心功能、用户体验关键
2. **中优先级** - 次要功能、用户体验重要
3. **低优先级** - 辅助功能、用户体验一般

### 执行策略

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| **逐个修复** | 每次修复一个组件，确保质量 | 复杂组件、关键功能 |
| **批量修复** | 同时修复多个相似组件，提高效率 | 简单组件、相似问题 |
| **分阶段修复** | 按功能模块分阶段修复 | 大型功能、复杂系统 |

### 质量保证

- 每个修复必须经过代码审核
- 每个修复必须经过测试验证
- 每个修复必须经过 Figma 对齐验证
- 每个修复必须经过性能测试

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

**Made with ❤️ by YanYuCloudCube Team**

</div>
