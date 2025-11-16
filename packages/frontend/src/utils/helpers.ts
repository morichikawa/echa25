import { CURSOR_COLORS } from './constants'

export const getRandomColor = (): string => {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
}

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
