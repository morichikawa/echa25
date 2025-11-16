import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SessionProvider } from './contexts/SessionContext'
import { LayerProvider } from './contexts/LayerContext'
import { WebRTCProvider } from './contexts/WebRTCContext'
import MenuPage from './pages/MenuPage'
import CanvasPage from './pages/CanvasPage'

function App() {
  return (
    <SessionProvider>
      <LayerProvider>
        <WebRTCProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MenuPage />} />
              <Route path="/canvas" element={<CanvasPage />} />
            </Routes>
          </BrowserRouter>
        </WebRTCProvider>
      </LayerProvider>
    </SessionProvider>
  )
}

export default App
