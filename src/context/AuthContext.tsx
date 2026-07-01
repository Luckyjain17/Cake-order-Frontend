import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AdminUser } from '@/types'

interface AuthContextType {
  admin: AdminUser | null
  token: string | null
  login: (token: string, admin: AdminUser) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false
    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  } catch {
    return true
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('cake_admin_token')
    if (t === 'null' || t === 'undefined' || !t || isTokenExpired(t)) {
      localStorage.removeItem('cake_admin_token')
      localStorage.removeItem('cake_admin_user')
      return null
    }
    return t
  })
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('cake_admin_user') || 'null')
    } catch {
      return null
    }
  })

  const login = (t: string, a: AdminUser) => {
    localStorage.setItem('cake_admin_token', t)
    localStorage.setItem('cake_admin_user', JSON.stringify(a))
    setToken(t)
    setAdmin(a)
  }

  const logout = () => {
    localStorage.removeItem('cake_admin_token')
    localStorage.removeItem('cake_admin_user')
    setToken(null)
    setAdmin(null)
  }

  const isAuth = !!token && !isTokenExpired(token)

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, isAuthenticated: isAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
