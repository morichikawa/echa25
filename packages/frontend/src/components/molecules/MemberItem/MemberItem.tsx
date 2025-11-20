import { Box, Typography, Chip } from '@mui/material'
import { Member } from '../../../types'

interface MemberItemProps {
  member: Member
  isConnected?: boolean
}

const MemberItem = ({ member, isConnected }: MemberItemProps) => {
  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            bgcolor: member.color,
            border: '2px solid',
            borderColor: isConnected === undefined ? 'primary.main' : (isConnected ? 'success.main' : 'divider')
          }}
        />
        <Typography variant="body2" sx={{ flex: 1 }}>
          {member.nickname}
        </Typography>
        {member.isHost && (
          <Chip label="Host" size="small" color="primary" />
        )}
      </Box>
      {isConnected !== undefined && (
        <Typography 
          variant="caption" 
          sx={{ 
            ml: 3, 
            color: isConnected ? 'success.main' : 'text.secondary',
            fontSize: '0.7rem'
          }}
        >
          {isConnected ? '✅ WebRTC接続済み' : '⏳ 接続待ち'}
        </Typography>
      )}
    </Box>
  )
}

export default MemberItem
