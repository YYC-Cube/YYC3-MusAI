import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@yyc3/music-hooks'
import { setLocalMode } from '@yyc3/music-utils'
import App from './App'
import '../styles/index.css'
import '../styles/tailwind.css'
import '../styles/theme.css'
import '../styles/fonts.css'

// 本地模式由构建期 env 驱动（W8-P0-1）：未配置 VITE_API_BASE 即本地模式
// （收藏/歌单/队列落本地缓存）；生产构建必须显式注入 VITE_API_BASE。
setLocalMode(!import.meta.env.VITE_API_BASE)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
