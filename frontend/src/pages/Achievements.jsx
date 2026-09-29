import { useEffect, useState } from "react"
import { getAchievements } from "../services/gamificationService"
import { ErrorState, LoadingScreen, PageHeader, ProgressBar } from "../components/ui"

export default function Achievements() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("all")

  async function load() {
    try {
      setError("")
      setData(await getAchievements())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) return <div className="mx-auto max-w-5xl px-4 py-8"><ErrorState message={error} onRetry={load} /></div>
  if (!data) return <LoadingScreen label="Carregando conquistas..." />

  const filtered = data.achievements.filter((a) =>
    filter === "all" ? true : filter === "unlocked" ? a.unlocked : !a.unlocked
  )
  const percent = data.total > 0 ? (data.unlockedCount / data.total) * 100 : 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Conquistas"
        subtitle="Badges desbloqueadas de verdade pelas suas ações na plataforma."
      />

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">
              {data.unlockedCount}
              <span className="text-base font-bold text-slate-400">/{data.total}</span>
            </p>
            <p className="text-sm text-slate-500">conquistas desbloqueadas</p>
          </div>
          <div className="w-full max-w-xs">
            <ProgressBar percent={percent} color="amber" label="Progresso geral" />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { key: "all", label: "Todas" },
          { key: "unlocked", label: "Desbloqueadas" },
          { key: "locked", label: "Bloqueadas" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`btn !py-2 text-xs ${
              filter === f.key
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            className={`card relative overflow-hidden p-4 ${
              a.unlocked ? "border-amber-200 bg-gradient-to-br from-white to-amber-50/60" : ""
            }`}
          >
            {a.unlocked && (
              <span className="absolute right-0 top-0 h-1.5 w-full bg-gradient-to-r from-amber-400 to-brand-500" />
            )}
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                  a.unlocked ? "bg-amber-100" : "bg-slate-100 grayscale"
                }`}
              >
                {a.unlocked ? a.icon : "🔒"}
              </span>
              <div className="min-w-0">
                <p className={`font-bold ${a.unlocked ? "text-slate-900" : "text-slate-500"}`}>
                  {a.name}
                </p>
                <p className="text-xs text-slate-500">{a.description}</p>
                {a.unlocked && a.unlockedAt && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-600">
                    Desbloqueada em{" "}
                    {new Date(a.unlockedAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {!a.unlocked && (
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Meta: {a.threshold.toLocaleString("pt-BR")}{" "}
                    {{
                      QUESTIONS_ANSWERED: "questões",
                      CORRECT_ANSWERED: "acertos",
                      XP: "XP",
                      STREAK: "dias seguidos",
                      TRAILS_COMPLETED: "trilhas",
                      DAILY_CHALLENGES: "desafios",
                      LEVEL: "nível",
                    }[a.metric] || ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Nenhuma conquista neste filtro.
        </p>
      )}
    </div>
  )
}
