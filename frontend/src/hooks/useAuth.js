import { useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fs_user')) } catch { return null }
  })

  const login = (userData, token) => {
    localStorage.setItem('fs_user', JSON.stringify(userData))
    localStorage.setItem('fs_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('fs_user')
    localStorage.removeItem('fs_token')
    setUser(null)
  }

  return { user, login, logout }
}
