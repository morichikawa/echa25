import { Box } from '@mui/material'

interface RemoteCursorProps {
  x: number
  y: number
  color: string
  nickname: string
}

const RemoteCursor = ({ x, y, color, nickname }: RemoteCursorProps) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
        <path
          d="M0,0 L0,16 L5,11 L8,18 L10,17 L7,10 L13,10 Z"
          fill={color}
          stroke="white"
          strokeWidth="0.5"
        />
      </svg>
      <Box
        sx={{
          ml: 2,
          mt: -2,
          px: 1,
          py: 0.5,
          bgcolor: color,
          color: 'white',
          borderRadius: 1,
          fontSize: '12px',
          whiteSpace: 'nowrap'
        }}
      >
        {nickname}
      </Box>
    </Box>
  )
}

export default RemoteCursor
