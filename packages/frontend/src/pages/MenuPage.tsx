import { Box, TextField, Button, Typography, Container } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { getRandomColor } from '../utils/helpers'

function MenuPage() {
  const [roomId, setRoomId] = useState('')
  const [nickname, setNickname] = useState('')
  const { setSession } = useSession()
  const navigate = useNavigate()

  const handleJoin = () => {
    if (roomId && nickname) {
      setSession({
        roomId,
        nickname,
        userId: '',
        myColor: getRandomColor()
      })
      navigate(`/canvas?roomId=${roomId}&nickname=${nickname}`)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h3" component="h1">
          🎨 echa25
        </Typography>
        <TextField
          label="部屋ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          fullWidth
        />
        <TextField
          label="ニックネーム"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          fullWidth
        />
        <Button
          variant="contained"
          size="large"
          onClick={handleJoin}
          disabled={!roomId || !nickname}
        >
          入室
        </Button>
      </Box>
    </Container>
  )
}

export default MenuPage
