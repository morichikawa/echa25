import { useEffect, useRef, useState } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../utils/constants'
import { drawLine } from '../../../utils/drawingEngine'

interface CanvasProps {
  tool: 'pen' | 'eraser'
  color: string
  size: number
  onDraw?: (data: any) => void
}

const Canvas = ({ tool, color, size, onDraw }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, scale * delta))
      
      if (newScale !== scale) {
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const canvasX = (mouseX - offset.x) / scale
        const canvasY = (mouseY - offset.y) / scale
        setOffset({
          x: mouseX - canvasX * newScale,
          y: mouseY - canvasY * newScale
        })
        setScale(newScale)
      }
    }

    container.addEventListener('wheel', wheelHandler, { passive: false })
    return () => {
      container.removeEventListener('wheel', wheelHandler)
    }
  }, [scale, offset])

  const getCanvasPosition = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      setIsPanning(true)
      setLastPos({ x: e.clientX, y: e.clientY })
    } else if (e.button === 0) {
      setIsDrawing(true)
      const pos = getCanvasPosition(e)
      setLastPos(pos)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: offset.x + (e.clientX - lastPos.x),
        y: offset.y + (e.clientY - lastPos.y)
      })
      setLastPos({ x: e.clientX, y: e.clientY })
    } else if (isDrawing) {
      const pos = getCanvasPosition(e)
      const canvas = canvasRef.current
      
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          drawLine(ctx, lastPos.x, lastPos.y, pos.x, pos.y, color, size, tool)
          
          if (onDraw) {
            onDraw({
              x1: lastPos.x,
              y1: lastPos.y,
              x2: pos.x,
              y2: pos.y,
              color,
              size,
              tool
            })
          }
        }
      }
      
      setLastPos(pos)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setIsPanning(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        overflow: 'hidden',
        position: 'relative',
        cursor: isPanning ? 'grabbing' : 'crosshair',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}
      />
    </div>
  )
}

export default Canvas
