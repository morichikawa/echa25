export interface Layer {
  id: string
  name: string
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  visible: boolean
  zIndex: number
}

export interface Member {
  userId: string
  nickname: string
  color: string
  isHost: boolean
}

export interface DrawingData {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  size: number
  tool: 'pen' | 'eraser'
  layerId: string
}

export interface CursorData {
  type: 'cursor'
  x: number
  y: number
  color: string
}

export interface WebSocketMessage {
  type: 'joined' | 'user-joined' | 'user-left' | 'signal'
  userId?: string
  isHost?: boolean
  members?: Member[]
  user?: Member
  fromUserId?: string
  data?: any
}

export interface SessionState {
  roomId: string
  nickname: string
  userId: string
  myColor: string
}
