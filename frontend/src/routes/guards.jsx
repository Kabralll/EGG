import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { LoadingScreen } from "../components/ui"

// Área logada: exige sessão válida
export function PrivateRoute() {
  const { profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen label="Verificando sessão..." />
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Páginas públicas que só fazem sentido deslogado (login, cadastro, landing)
export function PublicOnlyRoute() {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen label="Verificando sessão..." />
  if (profile) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

// Painel administrativo
export function AdminRoute() {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen label="Verificando permissões..." />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== "ADMIN") return <Navigate to="/dashboard" replace />
  return <Outlet />
}
