import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@yyc3/music-hooks'
import { setLocalMode } from '@yyc3/music-utils'
import App from './App'
import '../styles/index.css'
import '../styles/tailwind.css'
import '../styles/theme.css'
import '../styles/fonts.css'

// 当前无后端，本地即真：启动即开启本地模式，收藏/歌单/队列全部落本地缓存
setLocalMode(true)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
