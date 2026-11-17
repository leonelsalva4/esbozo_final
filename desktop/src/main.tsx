import { lazy, Suspense, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/fonts/fonts.css'
import './index.css'
import './components/ui/system.css'
import App from './App.tsx'

const scene = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('visual') : null
const Workbench = import.meta.env.DEV ? lazy(() => import('./dev/VisualWorkbench')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{scene && Workbench ? <Workbench scene={scene} /> : <App />}</Suspense>
  </StrictMode>,
)
