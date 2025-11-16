import { useCallback, useRef } from 'react'
import { useWebRTC as useWebRTCContext } from '../contexts/WebRTCContext'
import { RTC_CONFIG } from '../utils/constants'

export const useWebRTC = (ws: WebSocket | null, myUserId: string) => {
  const { peerConnections, dataChannels, connectedPeers, setConnectedPeers, broadcast } = useWebRTCContext()
  const iceCandidateQueues = useRef(new Map<string, RTCIceCandidateInit[]>())

  const createPeerConnection = useCallback((userId: string) => {
    if (peerConnections.has(userId)) return

    const pc = new RTCPeerConnection(RTC_CONFIG)
    peerConnections.set(userId, pc)

    pc.onicecandidate = (event) => {
      if (event.candidate && ws) {
        ws.send(JSON.stringify({
          action: 'signal',
          targetUserId: userId,
          data: { type: 'ice-candidate', candidate: event.candidate }
        }))
      }
    }

    pc.ondatachannel = (event) => {
      dataChannels.set(userId, event.channel)
      setupDataChannel(event.channel, userId)
    }

    if (myUserId < userId) {
      const dc = pc.createDataChannel('draw')
      dataChannels.set(userId, dc)
      setupDataChannel(dc, userId)

      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer)
      }).then(() => {
        ws?.send(JSON.stringify({
          action: 'signal',
          targetUserId: userId,
          data: { type: 'offer', offer: pc.localDescription }
        }))
      })
    }
  }, [peerConnections, dataChannels, ws, myUserId])

  const setupDataChannel = (dc: RTCDataChannel, userId: string) => {
    dc.onopen = () => {
      console.log('✅ WebRTC connected:', userId)
      setConnectedPeers(new Set([...connectedPeers, userId]))
    }
    dc.onclose = () => {
      console.log('❌ WebRTC disconnected:', userId)
      setConnectedPeers(new Set([...connectedPeers].filter(id => id !== userId)))
    }
    dc.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('📥 Received from', userId, ':', data)
      
      if (data.type === 'clear') {
        const canvas = document.querySelector('canvas')
        if (canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
          }
        }
      } else if (data.x1 !== undefined) {
        const canvas = document.querySelector('canvas')
        if (canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            if (data.tool === 'eraser') {
              ctx.globalCompositeOperation = 'destination-out'
              ctx.strokeStyle = 'rgba(0,0,0,1)'
            } else {
              ctx.globalCompositeOperation = 'source-over'
              ctx.strokeStyle = data.color
            }
            ctx.lineWidth = data.size
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(data.x1, data.y1)
            ctx.lineTo(data.x2, data.y2)
            ctx.stroke()
            ctx.globalCompositeOperation = 'source-over'
          }
        }
      }
    }
  }

  const handleSignal = useCallback(async (fromUserId: string, data: any) => {
    let pc = peerConnections.get(fromUserId)

    if (data.type === 'offer') {
      if (!pc) {
        pc = new RTCPeerConnection(RTC_CONFIG)
        peerConnections.set(fromUserId, pc)

        pc.onicecandidate = (event) => {
          if (event.candidate && ws) {
            ws.send(JSON.stringify({
              action: 'signal',
              targetUserId: fromUserId,
              data: { type: 'ice-candidate', candidate: event.candidate }
            }))
          }
        }

        pc.ondatachannel = (event) => {
          dataChannels.set(fromUserId, event.channel)
          setupDataChannel(event.channel, fromUserId)
        }
      }

      await pc.setRemoteDescription(data.offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      ws?.send(JSON.stringify({
        action: 'signal',
        targetUserId: fromUserId,
        data: { type: 'answer', answer: pc.localDescription }
      }))
    } else if (data.type === 'answer' && pc) {
      await pc.setRemoteDescription(data.answer)
      
      // Process queued ICE candidates
      const queue = iceCandidateQueues.current.get(fromUserId)
      if (queue) {
        for (const candidate of queue) {
          await pc.addIceCandidate(candidate)
        }
        iceCandidateQueues.current.delete(fromUserId)
      }
    } else if (data.type === 'ice-candidate') {
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(data.candidate)
      } else {
        // Queue ICE candidate until remote description is set
        if (!iceCandidateQueues.current.has(fromUserId)) {
          iceCandidateQueues.current.set(fromUserId, [])
        }
        iceCandidateQueues.current.get(fromUserId)!.push(data.candidate)
      }
    }
  }, [peerConnections, dataChannels, ws])

  const removePeer = useCallback((userId: string) => {
    const pc = peerConnections.get(userId)
    if (pc) {
      pc.close()
      peerConnections.delete(userId)
    }
    const dc = dataChannels.get(userId)
    if (dc) {
      dc.close()
      dataChannels.delete(userId)
    }
    setConnectedPeers(new Set([...connectedPeers].filter(id => id !== userId)))
  }, [peerConnections, dataChannels, connectedPeers, setConnectedPeers])

  return { createPeerConnection, handleSignal, removePeer, broadcast }
}
