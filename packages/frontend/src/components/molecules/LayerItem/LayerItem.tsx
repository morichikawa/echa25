import { Box, IconButton, TextField, Checkbox } from '@mui/material'
import { Delete, DragIndicator, ArrowUpward, ArrowDownward } from '@mui/icons-material'
import { Layer } from '../../../types'

interface LayerItemProps {
  layer: Layer
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
  onToggleVisibility: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const LayerItem = ({
  layer,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onToggleVisibility,
  onMoveUp,
  onMoveDown
}: LayerItemProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: isActive ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        cursor: 'pointer'
      }}
      onClick={onSelect}
    >
      <DragIndicator sx={{ cursor: 'grab', color: 'text.secondary' }} />
      <Checkbox
        checked={layer.visible}
        onChange={(e) => {
          e.stopPropagation()
          onToggleVisibility()
        }}
        size="small"
      />
      <TextField
        value={layer.name}
        onChange={(e) => {
          e.stopPropagation()
          onRename(e.target.value)
        }}
        onClick={(e) => e.stopPropagation()}
        size="small"
        variant="standard"
        sx={{ flex: 1 }}
      />
      {onMoveUp && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMoveUp() }}>
          <ArrowUpward fontSize="small" />
        </IconButton>
      )}
      {onMoveDown && (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMoveDown() }}>
          <ArrowDownward fontSize="small" />
        </IconButton>
      )}
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Delete fontSize="small" />
      </IconButton>
    </Box>
  )
}

export default LayerItem
