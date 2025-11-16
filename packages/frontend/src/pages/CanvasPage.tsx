import { Box, AppBar, Toolbar as MuiToolbar, Typography, Button } from '@mui/material'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toolbar, Canvas, MemberPanel } from '../components/organisms'
import { useSession } from '../contexts/SessionContext'
import { useWebRTC as useWebRTCContext } from '../contexts/WebRTCContext'

import { useWebSocket, useWebRTC, useDraw } from '../hooks'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants'
import { clearCanvas } from '../utils/drawingEngine'

function CanvasPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { myColor } = useSession()
  const { setMembers } = useWebRTCContext()

  const { tool, color, size, setTool, setColor, setSize } = useDraw()
  const [myUserId, setMyUserId] = useState('')

  // URLパラメータからセッション設定
  useEffect(() => {
    const urlRoomId = searchParams.get('roomId')
    const urlNickname = searchParams.get('nickname')
    if (!urlRoomId || !urlNickname) {
      navigate('/')
    }
  }, [searchParams, navigate])



  const handleMessage = (data: any) => {
    if (data.type === 'joined') {
      console.log('✅ Joined room:', data)
      setMyUserId(data.userId)
      setMembers(data.members)
    } else if (data.type === 'user-joined') {
      console.log('👋 User joined:', data.nickname)
      setMembers(data.members)
      if (data.userId) {
        createPeerConnection(data.userId)
      }
    } else if (data.type === 'user-left') {
      console.log('👋 User left:', data.userId)
      setMembers(data.members || [])
      removePeer(data.userId)
    } else if (data.type === 'signal') {
      handleSignal(data.fromUserId, data.data)
    }
  }

  const { ws } = useWebSocket(
    searchParams.get('roomId') || '',
    searchParams.get('nickname') || '',
    myColor,
    handleMessage
  )

  const { createPeerConnection, handleSignal, removePeer, broadcast } = useWebRTC(ws, myUserId)

  const handleDraw = (data: any) => {
    console.log('📤 Broadcasting draw:', data)
    broadcast(data)
  }

  const handleClear = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        clearCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)
        broadcast({ type: 'clear' })
      }
    }
  }

  const handleLeave = () => {
    if (confirm('部屋を退出しますか？')) {
      navigate('/')
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <MuiToolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🎨 echa25 - {searchParams.get('roomId')}
          </Typography>
          <Button color="inherit" onClick={handleLeave}>
            退出
          </Button>
        </MuiToolbar>
      </AppBar>

      <Toolbar
        onToolChange={setTool}
        onColorChange={setColor}
        onSizeChange={setSize}
        onClear={handleClear}
      />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', bgcolor: '#f5f5f5' }}>
          <Canvas
            tool={tool}
            color={color}
            size={size}
            onDraw={handleDraw}
          />
        </Box>
        <MemberPanel />
      </Box>
    </Box>
  )
}

export default CanvasPage
