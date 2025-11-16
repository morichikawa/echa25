import { createContext, useContext, useState, ReactNode } from 'react'
import { Layer } from '../types'
import { generateId } from '../utils/helpers'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants'

interface LayerContextType {
  layers: Layer[]
  activeLayerId: string
  createLayer: (name?: string, id?: string) => Layer
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  getActiveLayer: () => Layer | undefined
}

const LayerContext = createContext<LayerContextType | null>(null)

export const LayerProvider = ({ children }: { children: ReactNode }) => {
  const [layers, setLayers] = useState<Layer[]>([])
  const [activeLayerId, setActiveLayerId] = useState('')

  const createLayer = (name?: string, id?: string): Layer => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    const ctx = canvas.getContext('2d')!
    
    const layer: Layer = {
      id: id || generateId(),
      name: name || `レイヤー ${layers.length + 1}`,
      canvas,
      ctx,
      visible: true,
      zIndex: layers.length
    }
    
    setLayers(prev => [...prev, layer])
    return layer
  }

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id))
    if (activeLayerId === id && layers.length > 1) {
      setActiveLayerId(layers[0].id)
    }
  }

  const getActiveLayer = () => layers.find(l => l.id === activeLayerId)

  return (
    <LayerContext.Provider value={{
      layers,
      activeLayerId,
      createLayer,
      deleteLayer,
      setActiveLayer: setActiveLayerId,
      getActiveLayer
    }}>
      {children}
    </LayerContext.Provider>
  )
}

export const useLayer = () => {
  const context = useContext(LayerContext)
  if (!context) throw new Error('useLayer must be used within LayerProvider')
  return context
}
