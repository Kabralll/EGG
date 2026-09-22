import { useEffect, useState } from "react"
import { getUsers, setUserRole } from "../../services/adminService"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ErrorState, LoadingScreen } from "../../components/ui"
import AdminLayout from "./AdminLayout"

export default function AdminUsers() {
  const { profile } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(null)

  async function load() {
    try {
      setError("")
      setUsers(await getUsers())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleRole(user) {
    const newRole = user.role === "ADMIN" ? "STUDENT" : "ADMIN"
    setBusy(user.id)
    try {
      await setUserRole(user.id, newRole)
      setUsers((current) =>
        current.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      )
      toast.push({ type: "success", icon: "✅", title: `${user.nickname} agora é ${newRole === "ADMIN" ? "administrador" : "estudante"}` })
    } catch (err) {
      toast.push({ type: "error", icon: "⚠️", title: "Erro", message: err.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminLayout title="Usuários" subtitle="Estudantes e administradores da plataforma.">
      {error && <ErrorState message={error} onRetry={load} />}
      {!users && !error && <LoadingScreen label="Carregando usuários..." />}

      {users && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3 text-center">Nível</th>
                <th className="px-4 py-3 text-right">XP</th>
                <th className="px-4 py-3 text-center">🔥</th>
                <th className="px-4 py-3 text-center">Questões</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-400">
                      @{user.nickname} · {user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`chip ${
                        user.role === "ADMIN"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {user.role === "ADMIN" ? "Admin" : "Estudante"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{user.level}</td>
                  <td className="px-4 py-3 text-right font-bold text-brand-600">{user.xp}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{user.streak}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{user.attempts}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={busy === user.id || user.id === profile?.id}
                      title={
                        user.id === profile?.id
                          ? "Você não pode alterar seu próprio papel"
                          : user.role === "ADMIN"
                          ? "Remover admin"
                          : "Tornar admin"
                      }
                      className="btn-ghost !px-2 !py-1 text-xs"
                    >
                      {busy === user.id
                        ? "..."
                        : user.role === "ADMIN"
                        ? "Remover admin"
                        : "Tornar admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
