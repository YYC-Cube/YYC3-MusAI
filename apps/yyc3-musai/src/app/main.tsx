import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@yyc3/music-hooks'
import App from './App'
import '../styles/index.css'
import '../styles/tailwind.css'
import '../styles/theme.css'
import '../styles/fonts.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
