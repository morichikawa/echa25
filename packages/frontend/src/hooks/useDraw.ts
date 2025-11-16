import { useState, useCallback } from 'react'

export const useDraw = () => {
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(2)

  const handleToolChange = useCallback((newTool: 'pen' | 'eraser') => {
    setTool(newTool)
  }, [])

  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor)
  }, [])

  const handleSizeChange = useCallback((newSize: number) => {
    setSize(newSize)
  }, [])

  return {
    tool,
    color,
    size,
    setTool: handleToolChange,
    setColor: handleColorChange,
    setSize: handleSizeChange
  }
}
