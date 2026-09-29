import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getTrails } from "../services/trailService"
import { EmptyState, ErrorState, LoadingScreen, PageHeader, ProgressBar } from "../components/ui"

export default function Trails() {
  const [trails, setTrails] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    try {
      setError("")
      setTrails(await getTrails())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) return <div className="mx-auto max-w-7xl px-4 py-8"><ErrorState message={error} onRetry={load} /></div>
  if (!trails) return <LoadingScreen label="Carregando trilhas..." />

  const completed = trails.filter((t) => t.finished).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Trilhas de aprendizado"
        subtitle={
          trails.length > 0
            ? `${completed} de ${trails.length} concluídas · etapas com desbloqueio progressivo, do básico ao desafio final.`
            : "Sequências organizadas de atividades por tema."
        }
      />

      {trails.length === 0 ? (
        <EmptyState
          icon="🛤️"
          title="Nenhuma trilha disponível"
          message="As trilhas estarão disponíveis em breve."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trails.map((trail) => {
            const status = trail.finished
              ? "Concluída"
              : trail.completedSteps > 0
              ? "Em andamento"
              : "Não iniciada"

            return (
              <Link
                key={trail.id}
                to={`/trails/${trail.id}`}
                className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900 group-hover:text-[#f5d24c]">
                        {trail.icon} {trail.title}
                      </h2>
                      <span
                        className={`chip ${
                          trail.finished
                            ? "bg-emerald-100 text-emerald-700"
                            : trail.completedSteps > 0
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-xs font-semibold"
                      style={{ color: trail.subject.color }}
                    >
                      {trail.subject.name} · {trail.totalSteps} etapas
                    </p>
                  </div>
                  <span className="text-3xl">{trail.icon}</span>
                </div>

                <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
                  {trail.description}
                </p>

                <div className="mt-4">
                  <ProgressBar
                    percent={trail.percent}
                    color={trail.finished ? "emerald" : "indigo"}
                    label={`${trail.completedSteps}/${trail.totalSteps} etapas`}
                  />
                </div>

                <span className="mt-3 text-sm font-semibold text-[#f5d24c]">
                  {trail.finished
                    ? "Revisar trilha →"
                    : trail.completedSteps > 0
                    ? "Continuar →"
                    : "Começar →"}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
