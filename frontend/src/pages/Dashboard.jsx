import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getDashboard } from "../services/statsService"
import { ErrorState, LoadingScreen, ProgressBar } from "../components/ui"

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days} ${days === 1 ? "dia" : "dias"}`
}

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    try {
      setError("")
      setData(await getDashboard())
      refreshProfile()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) return <div className="mx-auto max-w-7xl px-4 py-8"><ErrorState message={error} onRetry={load} /></div>
  if (!data) return <LoadingScreen label="Montando seu dashboard..." />

  const { user, dailyChallenge, trails, recentAttempts, recentAchievements, stats, ranking, recommendation } = data
  const continueTrail = trails.inProgress[0]
  const firstName = user.name.split(" ")[0]
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Saudação + progresso */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Olá, {firstName} 👋</h1>
          <p className="mt-1 text-sm capitalize text-slate-500">{today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-orange-50 px-3 py-1.5 text-sm text-orange-700 ring-1 ring-orange-200">
            🔥 {user.streak} {user.streak === 1 ? "dia" : "dias"} de sequência
          </span>
          <span className="chip bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 ring-1 ring-indigo-200">
            🏆 {stats.achievements} conquistas
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Nível / XP */}
          <div className="card relative overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/80 via-transparent to-transparent" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-extrabold text-white shadow-md">
                  {user.progress.level}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Nível atual</p>
                  <p className="text-xl font-extrabold text-slate-900">
                    {user.progress.xp} <span className="text-sm font-bold text-slate-500">XP</span>
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>
                  Faltam{" "}
                  <strong className="text-slate-800">
                    {Math.max(0, user.progress.nextLevelXp - user.progress.xp)} XP
                  </strong>{" "}
                  para o nível {user.progress.level + 1}
                </p>
              </div>
            </div>
            <div className="relative mt-4">
              <ProgressBar percent={user.progress.percent} size="lg" label="Progresso do nível" />
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <Link to="/subjects" className="btn-primary">
                ⚡ Praticar agora
              </Link>
              <Link to="/trails" className="btn-secondary">
                🛤️ Continuar trilha
              </Link>
              <Link to="/stats" className="btn-ghost">
                📊 Meu desempenho
              </Link>
            </div>
          </div>

          {/* Desafio diário */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  📅 Desafio de hoje
                </p>
                <h3 className="mt-1 font-bold text-slate-900">{dailyChallenge.title}</h3>
                <p className="text-sm text-slate-500">
                  Recompensa: <strong className="text-brand-600">+{dailyChallenge.xpReward} XP</strong>
                </p>
              </div>
              {dailyChallenge.completed ? (
                <span className="chip bg-emerald-100 text-emerald-700">✓ Concluído</span>
              ) : (
                <span className="chip bg-amber-100 text-amber-700">
                  {dailyChallenge.progress}/{dailyChallenge.target}
                </span>
              )}
            </div>
            <div className="mt-3">
              <ProgressBar
                percent={dailyChallenge.percent}
                color={dailyChallenge.completed ? "emerald" : "amber"}
                label={
                  dailyChallenge.completed
                    ? "Desafio cumprido — volte amanhã para uma nova missão"
                    : "Progresso do desafio"
                }
              />
            </div>
            {!dailyChallenge.completed && (
              <div className="mt-3">
                <Link
                  to={
                    dailyChallenge.subject
                      ? `/subjects`
                      : "/subjects"
                  }
                  className="btn-secondary"
                >
                  Começar desafio →
                </Link>
              </div>
            )}
          </div>

          {/* Continuar / recomendação */}
          {continueTrail ? (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    🛤️ Continue de onde parou
                  </p>
                  <h3 className="mt-1 font-bold text-slate-900">
                    {continueTrail.icon} {continueTrail.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Etapa {continueTrail.completedSteps + 1} de {continueTrail.totalSteps} ·{" "}
                    {continueTrail.subject.name}
                  </p>
                </div>
                <Link
                  to={`/practice?stepId=${continueTrail.nextStepId}`}
                  className="btn-primary shrink-0"
                >
                  Continuar →
                </Link>
              </div>
              <div className="mt-3">
                <ProgressBar percent={continueTrail.percent} color="indigo" label="Progresso da trilha" />
              </div>
            </div>
          ) : (
            <RecommendationCard recommendation={recommendation} />
          )}

          {/* Últimas atividades */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Últimas atividades</h3>
              <Link to="/stats" className="text-sm font-semibold text-brand-600 hover:underline">
                Ver todas
              </Link>
            </div>
            {recentAttempts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Nenhuma questão respondida ainda.{" "}
                <Link to="/subjects" className="font-semibold text-brand-600 hover:underline">
                  Responda a primeira →
                </Link>
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {recentAttempts.map((attempt, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                        attempt.isCorrect ? "bg-emerald-100" : "bg-rose-100"
                      }`}
                    >
                      {attempt.isCorrect ? "✓" : "✕"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {attempt.statement}
                      </p>
                      <p className="text-xs text-slate-400">
                        {attempt.subject.icon} {attempt.subject.name} · {attempt.topic} ·{" "}
                        {timeAgo(attempt.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-brand-600">
                      +{attempt.xpAwarded} XP
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Números */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon="📝" value={stats.totalQuestions} label="Questões" />
            <MiniStat
              icon="🎯"
              value={`${stats.accuracy}%`}
              label="Acerto"
              hint={`${stats.correctAnswers} corretas`}
            />
            <MiniStat icon="🥇" value={ranking.position || "—"} label="Ranking" hint={`de ${ranking.total}`} />
          </div>

          {/* Recomendação (se houver trilha em andamento acima) */}
          {continueTrail && <RecommendationCard recommendation={recommendation} />}

          {/* Conquistas recentes */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Conquistas recentes</h3>
              <Link
                to="/achievements"
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Ver todas
              </Link>
            </div>
            {recentAchievements.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Responda questões para desbloquear suas primeiras conquistas.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recentAchievements.map((a) => (
                  <li
                    key={a.code}
                    className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 ring-1 ring-amber-200/70"
                  >
                    <span className="text-xl">{a.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{a.name}</p>
                      <p className="truncate text-xs text-slate-500">{a.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Trilhas disponíveis */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Trilhas</h3>
              <Link to="/trails" className="text-sm font-semibold text-brand-600 hover:underline">
                Ver todas
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {trails.suggested.slice(0, 3).map((trail) => (
                <li key={trail.id}>
                  <Link to={`/trails/${trail.id}`} className="block group">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-brand-600">
                        {trail.icon} {trail.title}
                      </p>
                      <span className="shrink-0 text-xs text-slate-400">
                        {trail.totalSteps} etapas
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{trail.subject.name}</p>
                  </Link>
                </li>
              ))}
              {trails.suggested.length === 0 && (
                <li className="text-sm text-slate-500">
                  {trails.inProgress.length > 0
                    ? "Foque em concluir as trilhas em andamento."
                    : "Todas as trilhas foram concluídas! 🎉"}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, value, label, hint }) {
  return (
    <div className="card px-3 py-4 text-center">
      <span className="text-xl">{icon}</span>
      <p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  )
}

function RecommendationCard({ recommendation }) {
  if (!recommendation) return null
  return (
    <div className="card border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
        💡 Recomendado para você
      </p>
      <h3 className="mt-1 font-bold text-slate-900">{recommendation.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{recommendation.message}</p>
      {recommendation.subject && (
        <Link
          to={`/practice?subjectId=${recommendation.subject.id}&limit=5`}
          className="btn-dark mt-3"
        >
          Praticar {recommendation.subject.name} →
        </Link>
      )}
    </div>
  )
}
