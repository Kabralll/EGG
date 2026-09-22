import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getStats } from "../services/statsService"
import { ErrorState, LoadingScreen, PageHeader, ProgressBar, StatCard } from "../components/ui"

export default function Performance() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    try {
      setError("")
      setData(await getStats())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) return <div className="mx-auto max-w-6xl px-4 py-8"><ErrorState message={error} onRetry={load} /></div>
  if (!data) return <LoadingScreen label="Analisando seu desempenho..." />

  const maxDayXp = Math.max(1, ...data.evolution.map((d) => d.xp))
  const hasData = data.totalQuestions > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Meu desempenho"
        subtitle="Estatísticas reais calculadas a partir das suas respostas."
      />

      {!hasData ? (
        <div className="card p-8 text-center">
          <span className="text-4xl">📊</span>
          <h2 className="mt-3 font-bold text-slate-900">Ainda não há dados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Responda algumas questões e volte aqui para ver seu desempenho por disciplina,
            evolução e recomendações.
          </p>
          <Link to="/subjects" className="btn-primary mt-4 inline-flex">
            Começar a praticar
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon="📝" label="Questões" value={data.totalQuestions} accent="brand" />
            <StatCard
              icon="✅"
              label="Acertos"
              value={data.correctAnswers}
              hint={`${data.wrongAnswers} erros`}
              accent="emerald"
            />
            <StatCard
              icon="🎯"
              label="Aproveitamento"
              value={`${data.accuracy}%`}
              accent={data.accuracy >= 70 ? "emerald" : "amber"}
            />
            <StatCard icon="⚡" label="XP total" value={data.xp} hint={`Nível ${data.level}`} accent="indigo" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon="📚" label="Disciplinas" value={data.subjectsStudied} accent="sky" />
            <StatCard icon="🛤️" label="Trilhas" value={data.trailsCompleted} accent="indigo" />
            <StatCard icon="🏆" label="Conquistas" value={data.achievements} accent="amber" />
            <StatCard icon="📅" label="Desafios" value={data.challengesCompleted} accent="emerald" />
          </div>

          {/* Recomendação */}
          <div className="card border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              💡 Análise do seu desempenho
            </p>
            <h3 className="mt-1 font-bold text-slate-900">{data.recommendation.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{data.recommendation.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.recommendation.subject && (
                <Link
                  to={`/practice?subjectId=${data.recommendation.subject.id}&limit=5`}
                  className="btn-dark"
                >
                  Praticar {data.recommendation.subject.name} →
                </Link>
              )}
              {data.recommendation.strong && (
                <span className="chip bg-emerald-100 text-emerald-700">
                  💪 Melhor em {data.recommendation.strong.name} ({data.recommendation.strong.accuracy}%)
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por disciplina */}
            <div className="card p-5">
              <h3 className="section-title">Desempenho por disciplina</h3>
              <p className="text-xs text-slate-500">Percentual de acertos em cada disciplina</p>
              <ul className="mt-4 space-y-4">
                {data.subjects.map((subject) => (
                  <li key={subject.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">
                        {subject.icon} {subject.name}
                      </span>
                      <span
                        className={`font-bold ${
                          subject.accuracy >= 70
                            ? "text-emerald-600"
                            : subject.accuracy >= 50
                            ? "text-amber-600"
                            : "text-rose-600"
                        }`}
                      >
                        {subject.accuracy}%
                      </span>
                    </div>
                    <ProgressBar
                      percent={subject.accuracy}
                      size="sm"
                      color={subject.accuracy >= 70 ? "emerald" : subject.accuracy >= 50 ? "amber" : "rose"}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {subject.correct} de {subject.total} questões corretas
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Evolução */}
            <div className="card p-5">
              <h3 className="section-title">Evolução — últimos 14 dias</h3>
              <p className="text-xs text-slate-500">XP ganho por dia</p>
              <div className="mt-4 flex h-40 items-end gap-1.5">
                {data.evolution.map((day) => {
                  const height = day.xp > 0 ? Math.max(8, (day.xp / maxDayXp) * 100) : 4
                  return (
                    <div
                      key={day.day}
                      className="group relative flex-1"
                      title={`${day.label}: ${day.xp} XP`}
                    >
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          day.xp > 0
                            ? "bg-gradient-to-t from-brand-500 to-brand-400"
                            : "bg-slate-200"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                        {day.xp} XP
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>{data.evolution[0]?.label}</span>
                <span>{data.evolution[data.evolution.length - 1]?.label}</span>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {(() => {
                  const activeDays = data.evolution.filter((d) => d.xp > 0).length
                  const totalWeekXp = data.evolution.reduce((sum, d) => sum + d.xp, 0)
                  return (
                    <>
                      Você ganhou <strong className="text-slate-900">{totalWeekXp} XP</strong> nos
                      últimos 14 dias, com atividade em{" "}
                      <strong className="text-slate-900">{activeDays} dias</strong>.
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
