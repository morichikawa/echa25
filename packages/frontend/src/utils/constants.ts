export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

export const CURSOR_COLORS = [
  '#FF1744', '#00E676', '#2979FF', '#FF9100',
  '#E040FB', '#00E5FF', '#FFEA00', '#FF3D00'
]

export const WS_URL = import.meta.env.VITE_WS_URL

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}
