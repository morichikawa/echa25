import { Box, Typography } from '@mui/material'
import { MemberItem } from '../../molecules'
import { useWebRTC } from '../../../contexts/WebRTCContext'

const MemberPanel = () => {
  const { members, connectedPeers } = useWebRTC()

  return (
    <Box sx={{ width: 250, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">参加者 ({members.length})</Typography>
      </Box>
      <Box>
        {members.map((member) => (
          <MemberItem 
            key={member.userId} 
            member={member} 
            isConnected={connectedPeers.has(member.userId)}
          />
        ))}
      </Box>
    </Box>
  )
}

export default MemberPanel
