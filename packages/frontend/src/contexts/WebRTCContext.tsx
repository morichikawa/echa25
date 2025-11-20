import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { Member } from '../types'

interface WebRTCContextType {
  members: Member[]
  setMembers: (members: Member[]) => void
  peerConnections: Map<string, RTCPeerConnection>
  dataChannels: Map<string, RTCDataChannel>
  connectedPeers: Set<string>
  setConnectedPeers: (peers: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  broadcast: (message: any) => void
}

const WebRTCContext = createContext<WebRTCContextType | null>(null)

export const WebRTCProvider = ({ children }: { children: ReactNode }) => {
  const [members, setMembers] = useState<Member[]>([])
  const [peerConnections] = useState(new Map<string, RTCPeerConnection>())
  const [dataChannels] = useState(new Map<string, RTCDataChannel>())
  const [connectedPeers, setConnectedPeers] = useState(new Set<string>())

  const broadcast = useCallback((message: any) => {
    const openChannels = Array.from(dataChannels.entries()).filter(([_, dc]) => dc.readyState === 'open')
    console.log('📢 Broadcasting to', openChannels.length, '/', dataChannels.size, 'peers')
    
    openChannels.forEach(([userId, dc]) => {
      try {
        console.log('  ✅ Sending to peer', userId)
        dc.send(JSON.stringify(message))
      } catch (error) {
        console.error('  ❌ Failed to send to peer', userId, error)
      }
    })
    
    // Log failed channels
    dataChannels.forEach((dc, userId) => {
      if (dc.readyState !== 'open') {
        console.log('  ⚠️ Peer', userId, 'not ready, state:', dc.readyState)
      }
    })
  }, [dataChannels])

  return (
    <WebRTCContext.Provider value={{
      members,
      setMembers,
      peerConnections,
      dataChannels,
      connectedPeers,
      setConnectedPeers,
      broadcast
    }}>
      {children}
    </WebRTCContext.Provider>
  )
}

export const useWebRTC = () => {
  const context = useContext(WebRTCContext)
  if (!context) throw new Error('useWebRTC must be used within WebRTCProvider')
  return context
}
