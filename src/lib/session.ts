const SESSION_KEY = 'thrillo_session'
const INACTIVE_LIMIT = 2 * 60 * 60 * 1000 // 2 hours in ms

export interface UserSession {
  email: string
  name: string
  role: string
  loginTime: number
  lastActive: number
}

export function saveSession(email: string, name: string, role: string) {
  const session: UserSession = {
    email,
    name,
    role,
    loginTime: Date.now(),
    lastActive: Date.now()
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const session: UserSession = JSON.parse(raw)
    const now = Date.now()

    // Check if inactive for more than 2 hours
    if (now - session.lastActive > INACTIVE_LIMIT) {
      clearSession()
      return null
    }

    // Update last active time
    session.lastActive = now
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function touchSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    const session = JSON.parse(raw)
    session.lastActive = Date.now()
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // silent
  }
}