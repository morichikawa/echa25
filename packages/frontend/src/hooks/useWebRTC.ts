import { useCallback, useRef } from 'react'
import { useWebRTC as useWebRTCContext } from '../contexts/WebRTCContext'
import { RTC_CONFIG } from '../utils/constants'

export const useWebRTC = (ws: WebSocket | null, myUserId: string) => {
  const { peerConnections, dataChannels, setConnectedPeers, broadcast } = useWebRTCContext()
  const iceCandidateQueues = useRef(new Map<string, RTCIceCandidateInit[]>())
  const connectionAttempts = useRef(new Map<string, number>())

  const createPeerConnection = useCallback((userId: string) => {
    // Skip if already connected via data channel
    if (dataChannels.has(userId) && dataChannels.get(userId)?.readyState === 'open') {
      console.log(`✅ Already connected to ${userId}, skipping`)
      return
    }
    
    if (peerConnections.has(userId)) {
      console.log(`⚠️ Connection already exists for ${userId}, closing and recreating`)
      const existingPc = peerConnections.get(userId)
      if (existingPc) {
        existingPc.close()
        peerConnections.delete(userId)
      }
      const existingDc = dataChannels.get(userId)
      if (existingDc) {
        existingDc.close()
        dataChannels.delete(userId)
      }
    }

    const attempts = connectionAttempts.current.get(userId) || 0
    connectionAttempts.current.set(userId, attempts + 1)
    console.log(`🔗 Creating peer connection to ${userId} (attempt ${attempts + 1})`)

    const pc = new RTCPeerConnection(RTC_CONFIG)
    peerConnections.set(userId, pc)

    pc.onicecandidate = (event) => {
      if (event.candidate && ws) {
        console.log(`🧊 Sending ICE candidate to ${userId}`)
        ws.send(JSON.stringify({
          action: 'signal',
          targetUserId: userId,
          data: { type: 'ice-candidate', candidate: event.candidate }
        }))
      } else if (!event.candidate) {
        console.log(`✅ ICE gathering complete for ${userId}`)
      }
    }

    pc.ondatachannel = (event) => {
      dataChannels.set(userId, event.channel)
      setupDataChannel(event.channel, userId)
    }

    if (myUserId < userId) {
      console.log(`📞 Creating offer for ${userId} (I am initiator)`)
      const dc = pc.createDataChannel('draw')
      dataChannels.set(userId, dc)
      setupDataChannel(dc, userId)

      pc.createOffer().then(offer => {
        console.log(`📤 Setting local description (offer) for ${userId}`)
        return pc.setLocalDescription(offer)
      }).then(() => {
        console.log(`📤 Sending offer to ${userId}`)
        ws?.send(JSON.stringify({
          action: 'signal',
          targetUserId: userId,
          data: { type: 'offer', offer: pc.localDescription }
        }))
      })
    } else {
      console.log(`⏳ Waiting for offer from ${userId} (they are initiator)`)
    }
  }, [peerConnections, dataChannels, ws, myUserId])

  const setupDataChannel = (dc: RTCDataChannel, userId: string) => {
    dc.onopen = () => {
      console.log('✅ WebRTC connected:', userId)
      setConnectedPeers(prev => new Set([...prev, userId]))
    }
    dc.onclose = () => {
      console.log('❌ WebRTC disconnected:', userId)
      setConnectedPeers(prev => new Set([...prev].filter(id => id !== userId)))
    }
    dc.onerror = () => {
      console.error('❌ WebRTC error for:', userId)
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
    console.log(`📨 Received ${data.type} from ${fromUserId}`)
    let pc = peerConnections.get(fromUserId)

    if (data.type === 'offer') {
      if (!pc) {
        console.log(`🔗 Creating peer connection for incoming offer from ${fromUserId}`)
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

      console.log(`📥 Setting remote description (offer) from ${fromUserId}`)
      await pc.setRemoteDescription(data.offer)
      console.log(`📞 Creating answer for ${fromUserId}`)
      const answer = await pc.createAnswer()
      console.log(`📤 Setting local description (answer) for ${fromUserId}`)
      await pc.setLocalDescription(answer)

      console.log(`📤 Sending answer to ${fromUserId}`)
      ws?.send(JSON.stringify({
        action: 'signal',
        targetUserId: fromUserId,
        data: { type: 'answer', answer: pc.localDescription }
      }))
    } else if (data.type === 'answer' && pc) {
      console.log(`📥 Setting remote description (answer) from ${fromUserId}`)
      await pc.setRemoteDescription(data.answer)
      
      // Process queued ICE candidates
      const queue = iceCandidateQueues.current.get(fromUserId)
      if (queue) {
        console.log(`🧊 Processing ${queue.length} queued ICE candidates for ${fromUserId}`)
        for (const candidate of queue) {
          await pc.addIceCandidate(candidate)
        }
        iceCandidateQueues.current.delete(fromUserId)
      }
    } else if (data.type === 'ice-candidate') {
      if (pc && pc.remoteDescription) {
        console.log(`🧊 Adding ICE candidate from ${fromUserId}`)
        await pc.addIceCandidate(data.candidate)
      } else {
        console.log(`🧊 Queueing ICE candidate from ${fromUserId} (no remote description yet)`)
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
    setConnectedPeers(prev => new Set([...prev].filter(id => id !== userId)))
  }, [peerConnections, dataChannels, setConnectedPeers])

  return { createPeerConnection, handleSignal, removePeer, broadcast }
}
