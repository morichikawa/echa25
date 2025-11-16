import { Box, ToggleButtonGroup, Slider, Button } from '@mui/material'
import { Edit, AutoFixHigh, Delete } from '@mui/icons-material'
import { ToolButton } from '../../molecules'
import { useState } from 'react'

interface ToolbarProps {
  onToolChange: (tool: 'pen' | 'eraser') => void
  onColorChange: (color: string) => void
  onSizeChange: (size: number) => void
  onClear: () => void
}

const Toolbar = ({ onToolChange, onColorChange, onSizeChange, onClear }: ToolbarProps) => {
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(2)

  const handleToolChange = (newTool: 'pen' | 'eraser') => {
    setTool(newTool)
    onToolChange(newTool)
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value)
    onColorChange(e.target.value)
  }

  const handleSizeChange = (_: Event, value: number | number[]) => {
    const newSize = value as number
    setSize(newSize)
    onSizeChange(newSize)
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <ToggleButtonGroup value={tool} exclusive>
        <ToolButton
          value="pen"
          selected={tool === 'pen'}
          icon={<Edit />}
          label="ペン"
          onChange={() => handleToolChange('pen')}
        />
        <ToolButton
          value="eraser"
          selected={tool === 'eraser'}
          icon={<AutoFixHigh />}
          label="消しゴム"
          onChange={() => handleToolChange('eraser')}
        />
      </ToggleButtonGroup>

      {tool === 'pen' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <label>色:</label>
          <input type="color" value={color} onChange={handleColorChange} />
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
        <label>太さ:</label>
        <Slider
          value={size}
          onChange={handleSizeChange}
          min={1}
          max={tool === 'pen' ? 50 : 100}
          valueLabelDisplay="auto"
        />
      </Box>

      <Button variant="outlined" startIcon={<Delete />} onClick={onClear}>
        クリア
      </Button>
    </Box>
  )
}

export default Toolbar
