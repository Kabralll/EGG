import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { updateProfile } from "../services/authService"
import { useToast } from "../context/ToastContext"
import { LoadingScreen, ProgressBar, StatCard } from "../components/ui"

export default function Profile() {
  const { profile, refreshProfile, logout } = useAuth()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: "", nickname: "" })
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) setForm({ name: profile.name, nickname: profile.nickname })
  }, [profile])

  if (!profile) return <LoadingScreen label="Carregando perfil..." />

  async function handleSave(e) {
    e.preventDefault()
    const errors = {}
    if (form.name.trim().length < 2) errors.name = "Informe seu nome"
    if (form.nickname.trim().length < 2) errors.nickname = "Escolha um apelido"
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    setFieldErrors({})
    try {
      await updateProfile({ name: form.name.trim(), nickname: form.nickname.trim() })
      await refreshProfile()
      setEditing(false)
      toast.push({ type: "success", icon: "✅", title: "Perfil atualizado!" })
    } catch (err) {
      if (err.fields) setFieldErrors(err.fields)
      else toast.push({ type: "error", icon: "⚠️", title: "Erro ao salvar", message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const stats = profile.stats

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      {/* Cabeçalho do perfil */}
      <div className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-400 via-amber-400 to-brand-500" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-900 text-3xl font-extrabold text-white shadow-md">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-extrabold text-slate-900">{profile.name}</h1>
                <p className="text-sm text-slate-500">
                  @{profile.nickname}
                  {profile.role === "ADMIN" && (
                    <span className="chip ml-2 bg-indigo-100 text-indigo-700">Admin</span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={() => setEditing(!editing)} className="btn-secondary !py-2 text-xs">
              {editing ? "Cancelar" : "✏️ Editar perfil"}
            </button>
          </div>

          {editing && (
            <form onSubmit={handleSave} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <label className="label">Nome</label>
                <input
                  className={`input ${fieldErrors.name ? "input-error" : ""}`}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <label className="label">Apelido</label>
                <input
                  className={`input ${fieldErrors.nickname ? "input-error" : ""}`}
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                />
                {fieldErrors.nickname && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.nickname}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-sm text-slate-500">{profile.email}</p>
        </div>
      </div>

      {/* Progressão */}
      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-extrabold text-white">
              {profile.progress.level}
            </span>
            <div>
              <p className="font-bold text-slate-900">Nível {profile.progress.level}</p>
              <p className="text-sm text-slate-500">
                {profile.xp} XP · próximo nível em{" "}
                <strong className="text-slate-800">
                  {Math.max(0, profile.progress.nextLevelXp - profile.xp)} XP
                </strong>
              </p>
            </div>
          </div>
          <span className="chip bg-orange-50 px-3 py-1.5 text-sm text-orange-700 ring-1 ring-orange-200">
            🔥 {profile.streak} {profile.streak === 1 ? "dia" : "dias"} de sequência
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar percent={profile.progress.percent} size="lg" label="Progresso do nível" />
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon="📝" label="Questões respondidas" value={stats.totalQuestions} />
        <StatCard
          icon="🎯"
          label="Aproveitamento"
          value={`${stats.accuracy}%`}
          hint={`${stats.correctAnswers} corretas`}
          accent="emerald"
        />
        <StatCard icon="📚" label="Disciplinas estudadas" value={stats.subjectsStudied} accent="sky" />
        <StatCard icon="🛤️" label="Trilhas concluídas" value={stats.trailsCompleted} accent="indigo" />
        <StatCard icon="🏆" label="Conquistas" value={stats.achievements} accent="amber" />
        <StatCard icon="❌" label="Erros" value={stats.wrongAnswers} accent="rose" />
      </div>

      {/* Ações */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/achievements" className="btn-secondary">
          🏆 Minhas conquistas
        </Link>
        <Link to="/stats" className="btn-secondary">
          📊 Desempenho completo
        </Link>
        <Link to="/ranking" className="btn-secondary">
          🥇 Ranking
        </Link>
        <button onClick={logout} className="btn-danger ml-auto">
          Sair da conta
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Membro desde {new Date(profile.createdAt).toLocaleDateString("pt-BR")}
      </p>
    </div>
  )
}
