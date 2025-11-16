import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { Member } from '../types'

interface WebRTCContextType {
  members: Member[]
  setMembers: (members: Member[]) => void
  peerConnections: Map<string, RTCPeerConnection>
  dataChannels: Map<string, RTCDataChannel>
  connectedPeers: Set<string>
  setConnectedPeers: (peers: Set<string>) => void
  broadcast: (message: any) => void
}

const WebRTCContext = createContext<WebRTCContextType | null>(null)

export const WebRTCProvider = ({ children }: { children: ReactNode }) => {
  const [members, setMembers] = useState<Member[]>([])
  const [peerConnections] = useState(new Map<string, RTCPeerConnection>())
  const [dataChannels] = useState(new Map<string, RTCDataChannel>())
  const [connectedPeers, setConnectedPeers] = useState(new Set<string>())

  const broadcast = useCallback((message: any) => {
    console.log('📢 Broadcasting to', dataChannels.size, 'peers')
    dataChannels.forEach((dc, userId) => {
      console.log('  - Peer', userId, 'state:', dc.readyState)
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify(message))
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
