import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { getSubject } from "../services/contentService"
import { ErrorState, LoadingScreen, ProgressBar } from "../components/ui"

export default function SubjectDetail() {
  const { id } = useParams()
  const [subject, setSubject] = useState(null)
  const [error, setError] = useState("")
  const [difficulty, setDifficulty] = useState("")

  async function load() {
    try {
      setError("")
      setSubject(await getSubject(id))
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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  if (!subject) return <LoadingScreen label="Carregando disciplina..." />

  const percent =
    subject.totalQuestions > 0 ? Math.round((subject.answered / subject.totalQuestions) * 100) : 0
  const practiceBase = `/practice?subjectId=${subject.id}&limit=10`

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <Link to="/subjects" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
        ← Disciplinas
      </Link>

      {/* Cabeçalho */}
      <div className="card mt-3 overflow-hidden">
        <div
          className="h-2 w-full"
          style={{ backgroundColor: subject.color }}
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
              style={{ backgroundColor: `${subject.color}1a` }}
            >
              {subject.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {subject.name}
              </h1>
              <p className="text-sm text-slate-500">
                {subject.topics.length} {subject.topics.length === 1 ? "assunto" : "assuntos"} ·{" "}
                {subject.totalQuestions} questões · {subject.answered} respondidas
                {subject.answered > 0 && (
                  <>
                    {" "}
                    · <strong>{subject.correct} corretas</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <ProgressBar
              percent={percent}
              size="lg"
              label="Progresso na disciplina"
            />
          </div>

          {/* Ações de prática */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link to={practiceBase} className="btn-primary">
              ⚡ Praticar esta disciplina
            </Link>
            <div className="flex overflow-hidden rounded-xl border border-slate-300">
              {[
                { value: "facil", label: "Fácil" },
                { value: "media", label: "Média" },
                { value: "dificil", label: "Difícil" },
              ].map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`px-3.5 py-2 text-sm font-semibold transition ${
                    difficulty === d.value
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {difficulty && (
              <Link
                to={`${practiceBase}&difficulty=${difficulty}`}
                className="btn-dark"
              >
                Praticar {difficulty === "facil" ? "fáceis" : difficulty === "media" ? "médias" : "difíceis"} →
              </Link>
            )}
          </div>
          {difficulty && (
            <p className="mt-2 text-xs text-slate-400">
              Dica: selecione a dificuldade e clique na seta para uma sessão focada.
            </p>
          )}
        </div>
      </div>

      {/* Assuntos */}
      <h2 className="section-title mt-8 mb-3">Assuntos</h2>
      <div className="space-y-3">
        {subject.topics.map((topic) => {
          const topicPercent =
            topic.totalQuestions > 0 ? Math.round((topic.answered / topic.totalQuestions) * 100) : 0
          const done = topic.totalQuestions > 0 && topic.answered === topic.totalQuestions

          return (
            <div key={topic.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{topic.name}</p>
                  {done && <span className="chip bg-emerald-100 text-emerald-700">✓ concluído</span>}
                </div>
                <p className="text-xs text-slate-500">
                  {topic.totalQuestions} questões · {topic.answered} respondidas ·{" "}
                  {topic.correct} corretas
                </p>
                <div className="mt-2 max-w-md">
                  <ProgressBar percent={topicPercent} size="sm" color={done ? "emerald" : "brand"} />
                </div>
              </div>
              <Link
                to={`/practice?topicId=${topic.id}&limit=10`}
                className="btn-secondary shrink-0"
              >
                Praticar assunto
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
