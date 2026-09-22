import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { getTrail } from "../services/trailService"
import { ErrorState, LoadingScreen, ProgressBar } from "../components/ui"

export default function TrailDetail() {
  const { id } = useParams()
  const [trail, setTrail] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    try {
      setError("")
      setTrail(await getTrail(id))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  if (!trail) return <LoadingScreen label="Carregando trilha..." />

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link to="/trails" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
        ← Trilhas
      </Link>

      {/* Cabeçalho */}
      <div className="card mt-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="text-5xl">{trail.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {trail.title}
              </h1>
              {trail.finished && (
                <span className="chip bg-emerald-100 text-emerald-700">✓ Concluída</span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold" style={{ color: trail.subject.color }}>
              {trail.subject.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{trail.description}</p>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar
            percent={trail.percent}
            size="lg"
            color={trail.finished ? "emerald" : "indigo"}
            label={`${trail.completedSteps} de ${trail.totalSteps} etapas concluídas`}
          />
        </div>

        {trail.finished && (
          <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            🎉 Você já concluiu esta trilha! Pode revisar as etapas quantas vezes quiser.
          </div>
        )}
      </div>

      {/* Etapas */}
      <h2 className="section-title mt-8 mb-3">Etapas</h2>
      <ol className="relative space-y-4 border-l-2 border-dashed border-slate-200 pl-6 ml-3">
        {trail.steps.map((step) => {
          const state = step.completed ? "done" : step.unlocked ? "current" : "locked"

          return (
            <li key={step.id} className="relative">
              {/* marcador */}
              <span
                className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-4 ring-slate-50 ${
                  state === "done"
                    ? "bg-emerald-500 text-white"
                    : state === "current"
                    ? "bg-brand-500 text-white"
                    : "bg-slate-300 text-white"
                }`}
              >
                {state === "done" ? "✓" : state === "current" ? step.order : "🔒"}
              </span>

              <div
                className={`card p-4 ${
                  state === "locked" ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500">
                      {step.totalQuestions}{" "}
                      {step.totalQuestions === 1 ? "questão" : "questões"}
                      {state === "done" && " · concluída"}
                      {state === "locked" && " · complete a etapa anterior para desbloquear"}
                    </p>
                  </div>

                  {state === "done" ? (
                    <Link
                      to={`/practice?stepId=${step.id}`}
                      className="btn-secondary !py-2 text-xs"
                    >
                      Revisar
                    </Link>
                  ) : state === "current" ? (
                    <Link to={`/practice?stepId=${step.id}`} className="btn-primary !py-2 text-xs">
                      {step === trail.steps.find((s) => s.unlocked && !s.completed)
                        ? "Começar etapa →"
                        : "Praticar →"}
                    </Link>
                  ) : (
                    <span className="chip bg-slate-100 text-slate-400">🔒 Bloqueada</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/dashboard" className="btn-ghost">
          ← Dashboard
        </Link>
        <Link to="/trails" className="btn-secondary">
          Ver todas as trilhas
        </Link>
      </div>
    </div>
  )
}
