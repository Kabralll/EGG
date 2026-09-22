import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getSubjects } from "../services/contentService"
import { EmptyState, ErrorState, LoadingScreen, PageHeader, ProgressBar } from "../components/ui"

export default function Subjects() {
  const [subjects, setSubjects] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    try {
      setError("")
      setSubjects(await getSubjects())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) return <div className="mx-auto max-w-7xl px-4 py-8"><ErrorState message={error} onRetry={load} /></div>
  if (!subjects) return <LoadingScreen label="Carregando disciplinas..." />

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Disciplinas"
        subtitle="Escolha uma disciplina para praticar questões por assunto e dificuldade."
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Nenhuma disciplina disponível"
          message="O conteúdo ainda está sendo preparado. Volte em breve."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => {
            const percent =
              subject.totalQuestions > 0
                ? Math.round((subject.answered / subject.totalQuestions) * 100)
                : 0

            return (
              <Link
                key={subject.id}
                to={`/subjects/${subject.id}`}
                className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: `${subject.color}1a` }}
                  >
                    {subject.icon}
                  </span>
                  {subject.accuracy !== null && (
                    <span
                      className={`chip ${
                        subject.accuracy >= 70
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      🎯 {subject.accuracy}%
                    </span>
                  )}
                </div>

                <h2 className="mt-3 font-bold text-slate-900 group-hover:text-brand-600">
                  {subject.name}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {subject.topicsCount} {subject.topicsCount === 1 ? "assunto" : "assuntos"} ·{" "}
                  {subject.totalQuestions} questões
                </p>

                <div className="mt-4">
                  <ProgressBar
                    percent={percent}
                    size="sm"
                    color={percent >= 100 ? "emerald" : "brand"}
                    label={`${subject.answered}/${subject.totalQuestions} respondidas`}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
