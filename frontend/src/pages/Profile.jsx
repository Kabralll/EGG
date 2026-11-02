import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useSubscription } from "../context/SubscriptionContext"
import { updateProfile } from "../services/authService"
import { equipSkin } from "../services/billingService"
import { useToast } from "../context/ToastContext"
import { LoadingScreen, ProgressBar, StatCard } from "../components/ui"
import { EggAvatar, HeartsChip, ProBadge } from "../components/premium"
import { formatBRL } from "../offline/billing"

export default function Profile() {
  const { profile, refreshProfile, logout } = useAuth()
  const { skins, subscription, hearts, isPremium, refresh: refreshBilling } = useSubscription()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: "", nickname: "" })
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [skinBusy, setSkinBusy] = useState(null)

  useEffect(() => {
    if (profile) setForm({ name: profile.name, nickname: profile.nickname })
  }, [profile])

  if (!profile) return <LoadingScreen label="Carregando perfil..." />

  async function handleEquipSkin(skin) {
    if (skin.equipped) return
    if (skin.premium && !isPremium) {
      toast.push({
        type: "info",
        icon: "🔒",
        title: "Skin exclusiva do Fora da Casca",
        message: "Assine o PRO para desbloquear esta e outras personalizações.",
      })
      return
    }
    setSkinBusy(skin.id)
    try {
      await equipSkin(skin.id)
      await Promise.all([refreshProfile(), refreshBilling()])
      toast.push({ type: "success", icon: skin.emoji, title: `${skin.name} equipada!` })
    } catch (err) {
      toast.push({ type: "error", icon: "⚠️", title: "Não foi possível equipar", message: err.message })
    } finally {
      setSkinBusy(null)
    }
  }

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
        <div className="h-20 bg-gradient-to-r from-brand-300 via-amber-400 to-[#f5d24c]" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <EggAvatar skin={profile.skin} size="lg" className="border-4 border-white shadow-md" />
              <div className="pb-1">
                <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold text-slate-900">
                  {profile.name}
                  {isPremium && <ProBadge />}
                </h1>
                <p className="text-sm text-slate-500">
                  @{profile.nickname}
                  {profile.role === "ADMIN" && (
                    <span className="chip ml-2 bg-indigo-100 text-indigo-700">Admin</span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={() => setEditing(!editing)} className="btn-secondary !py-2 text-xs">
              {editing ? "Cancelar" : "Editar perfil"}
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
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5d24c] text-xl font-extrabold text-white">
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

      {/* Assinatura */}
      <div className="card mt-5 overflow-hidden">
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 ${
            isPremium
              ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white"
              : "bg-gradient-to-r from-amber-50 to-orange-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{isPremium ? "🐣" : "🥚"}</span>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isPremium ? "text-amber-300" : "text-amber-600"}`}>
                Seu plano
              </p>
              <p className={`font-extrabold ${isPremium ? "text-white" : "text-slate-900"}`}>
                {isPremium ? subscription.plan.name : "Na Casca (gratuito)"}
              </p>
            </div>
            {isPremium && <ProBadge className="ml-1" />}
          </div>
          <div className="flex items-center gap-2">
            <HeartsChip hearts={hearts} />
            <Link
              to="/upgrade"
              className={`text-xs font-bold underline ${isPremium ? "text-amber-300" : "text-amber-700"}`}
            >
              {isPremium ? "Gerenciar assinatura" : "Sair da casca →"}
            </Link>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Corações</p>
            <p className="mt-1 font-bold text-slate-900">
              {hearts?.unlimited ? "Ilimitados ∞" : hearts ? `${hearts.hearts} de ${hearts.max}` : "—"}
            </p>
            <p className="text-xs text-slate-500">
              {hearts?.unlimited
                ? "Você nunca fica bloqueado por errar"
                : "1 coração regenera a cada 30 min"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isPremium ? "Renovação" : "Relatórios"}
            </p>
            <p className="mt-1 font-bold text-slate-900">
              {isPremium && subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
                : "14 dias"}
            </p>
            <p className="text-xs text-slate-500">
              {isPremium
                ? `${subscription.daysLeft} dias restantes · ${formatBRL(subscription.plan.priceCents)}${subscription.plan.periodLabel}`
                : "O PRO libera 90 dias + por assunto"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Benefícios</p>
            <p className="mt-1 font-bold text-slate-900">
              {isPremium ? "Todos ativos" : "1 de 6 disponíveis"}
            </p>
            <p className="text-xs text-slate-500">
              Skins, streak freeze, desafio semanal e mais
            </p>
          </div>
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

      {/* Skins */}
      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="section-title">Skins do ovo</h3>
            <p className="text-xs text-slate-500">
              {isPremium
                ? "Todas as skins liberadas — escolha a sua."
                : "A clássica é gratuita. As demais são exclusivas do Fora da Casca."}
            </p>
          </div>
          {!isPremium && (
            <Link to="/upgrade" className="btn-secondary !py-2 text-xs">
              Desbloquear todas →
            </Link>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {skins.map((skin) => {
            const locked = skin.premium && !isPremium
            return (
              <button
                key={skin.id}
                type="button"
                onClick={() => handleEquipSkin(skin)}
                disabled={skin.equipped || skinBusy === skin.id}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                  skin.equipped
                    ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200"
                    : locked
                    ? "border-slate-200 bg-slate-50/60 hover:border-amber-300"
                    : "border-amber-200 bg-amber-50/40 hover:border-amber-400"
                } ${skinBusy === skin.id ? "opacity-60" : ""}`}
              >
                <span className={locked ? "opacity-40" : ""}>
                  <EggAvatar skin={skin} size="md" />
                </span>
                <span className="text-xs font-semibold text-slate-700">{skin.name}</span>
                <span
                  className={`text-[10px] font-bold ${
                    skin.equipped
                      ? "text-emerald-600"
                      : locked
                      ? "text-slate-400"
                      : "text-amber-600"
                  }`}
                >
                  {skin.equipped ? "✓ Equipada" : locked ? "🔒 PRO" : skinBusy === skin.id ? "..." : "Equipar"}
                </span>
              </button>
            )
          })}
        </div>
        {skins.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">Carregando skins...</p>
        )}
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
