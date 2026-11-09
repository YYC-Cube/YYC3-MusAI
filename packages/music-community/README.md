# @yyc3/music-community

> 动态流、评论、时间线、Fork 树、挑战、直播、时空胶囊、上传、分享与端到端加密。

| 属性 | 值 |
| --- | --- |
| 版本 | 2.0.0 |
| 定位 | 社区组件 |
| 许可证 | MIT |
| 仓库 | https://github.com/YYC-Cube/YYC3-MusAI |

## 安装

```bash
pnpm add @yyc3/music-community react
```

## 快速开始

```tsx
import { CommunityFeed, CommentSystem, SpaceTimePanel } from '@yyc3/music-community'

export function Community({ open, close, activities, user, trackId }: any) {
  return (
    <>
      <CommunityFeed isOpen={open} onClose={close} activities={activities} onRefresh={() => {}} isLoading={false} />
      <CommentSystem isOpen={open} onClose={close} songId="s1" songTitle="夜航" currentTime={0} user={user} />
      <SpaceTimePanel isOpen={open} onClose={close} user={user} currentTrackId={trackId} />
    </>
  )
}
```

## 导出清单

- CommunityFeed、CommentSystem、TimelineComments、ForkTree、ChallengePanel
- LiveSessionPanel、SpaceTimePanel、UploadPanel、ShareWorkModal
- E2EKeySetup、MHeartSystem

## 关键 API

| 名称 | 说明 |
| --- | --- |
| `CommunityFeed` | isOpen、onClose、activities、onRefresh、isLoading |
| `CommentSystem` | isOpen、onClose、songId、songTitle、currentTime、user |
| `ChallengePanel` | isOpen、onClose、user、onOpenCreationStudio |
| `SpaceTimePanel` | isOpen、onClose、user、currentTrackId、currentTrackTitle |
| `E2EKeySetup` | 端到端密钥初始化，配合 music-utils 的 crypto API |

## 说明

社区组件均以「受控弹层」形式设计，数据与鉴权由宿主注入，组件内部不持有全局状态。

## 兼容性

- React 19+（组件包 peer 依赖）
- TypeScript 5.6+ / Node.js 20.19+
- 现代浏览器（Chrome/Edge/Safari/Firefox 最近两个大版本）

## 开发与验证

```bash
pnpm --filter @yyc3/music-community build
pnpm --filter @yyc3/music-community typecheck
pnpm --filter @yyc3/music-community lint
pnpm test:coverage
```

## 许可证

MIT © 2026 YanYuCloudCube™（YYC³）

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来 — Words Initiate Quadrants, Language Serves as Core for Future<br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
