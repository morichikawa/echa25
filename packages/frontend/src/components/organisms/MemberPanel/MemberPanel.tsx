import { Box, Typography } from '@mui/material'
import { MemberItem } from '../../molecules'
import { useWebRTC } from '../../../contexts/WebRTCContext'

interface MemberPanelProps {
  myUserId?: string
}

const MemberPanel = ({ myUserId }: MemberPanelProps) => {
  const { members, connectedPeers } = useWebRTC()

  const sortedMembers = [...members].sort((a, b) => {
    if (a.userId === myUserId) return -1
    if (b.userId === myUserId) return 1
    return 0
  })

  return (
    <Box sx={{ width: 250, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">参加者 ({members.length})</Typography>
      </Box>
      <Box>
        {sortedMembers.map((member) => (
          <MemberItem 
            key={member.userId} 
            member={member} 
            isConnected={member.userId === myUserId ? undefined : connectedPeers.has(member.userId)}
          />
        ))}
      </Box>
    </Box>
  )
}

export default MemberPanel
