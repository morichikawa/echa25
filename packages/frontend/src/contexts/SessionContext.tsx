import { createContext, useContext, useState, ReactNode } from 'react'
import { SessionState } from '../types'

interface SessionContextType extends SessionState {
  setSession: (session: SessionState) => void
}

const SessionContext = createContext<SessionContextType | null>(null)

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<SessionState>({
    roomId: '',
    nickname: '',
    userId: '',
    myColor: ''
  })

  return (
    <SessionContext.Provider value={{ ...session, setSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within SessionProvider')
  return context
}
