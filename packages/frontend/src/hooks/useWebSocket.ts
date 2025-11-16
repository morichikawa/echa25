import { useEffect, useRef, useCallback } from 'react'
import { WS_URL } from '../utils/constants'
import { WebSocketMessage } from '../types'

export const useWebSocket = (
  roomId: string,
  nickname: string,
  color: string,
  onMessage: (data: WebSocketMessage) => void
) => {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'join',
        roomId,
        nickname,
        color
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      onMessageRef.current(data)
    }

    ws.onclose = () => {}

    return () => {
      ws.close()
    }
  }, [roomId, nickname, color])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  return { ws: wsRef.current, sendMessage }
}
