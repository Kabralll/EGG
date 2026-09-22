import { createContext, useCallback, useContext, useEffect, useState } from "react"
import * as authService from "../services/authService"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!authService.hasToken()) {
      setProfile(null)
      return null
    }
    try {
      const data = await authService.getProfile()
      setProfile(data)
      return data
    } catch {
      authService.clearSession()
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    async function init() {
      await refreshProfile()
      setLoading(false)
    }
    init()
  }, [refreshProfile])

  const login = useCallback(
    async (form) => {
      await authService.login(form)
      return refreshProfile()
    },
    [refreshProfile]
  )

  const register = useCallback(
    async (form) => {
      await authService.register(form)
      return refreshProfile()
    },
    [refreshProfile]
  )

  const logout = useCallback(() => {
    authService.clearSession()
    setProfile(null)
    window.location.assign("/")
  }, [])

  return (
    <AuthContext.Provider
      value={{ profile, loading, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
