import { Box, Typography, Button } from '@mui/material'
import { Add } from '@mui/icons-material'
import { LayerItem } from '../../molecules'
import { useLayer } from '../../../contexts/LayerContext'

const LayerPanel = () => {
  const { layers, activeLayerId, createLayer, deleteLayer, setActiveLayer } = useLayer()

  const handleRename = (id: string, name: string) => {
    const layer = layers.find(l => l.id === id)
    if (layer) layer.name = name
  }

  const handleToggleVisibility = (id: string) => {
    const layer = layers.find(l => l.id === id)
    if (layer) layer.visible = !layer.visible
  }

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newLayers = [...layers]
      ;[newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]]
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < layers.length - 1) {
      const newLayers = [...layers]
      ;[newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]]
    }
  }

  return (
    <Box sx={{ width: 250, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>レイヤー</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          fullWidth
          onClick={() => createLayer()}
        >
          追加
        </Button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {layers.map((layer, index) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isActive={layer.id === activeLayerId}
            onSelect={() => setActiveLayer(layer.id)}
            onDelete={() => deleteLayer(layer.id)}
            onRename={(name) => handleRename(layer.id, name)}
            onToggleVisibility={() => handleToggleVisibility(layer.id)}
            onMoveUp={index > 0 ? () => handleMoveUp(index) : undefined}
            onMoveDown={index < layers.length - 1 ? () => handleMoveDown(index) : undefined}
          />
        ))}
      </Box>
    </Box>
  )
}

export default LayerPanel
