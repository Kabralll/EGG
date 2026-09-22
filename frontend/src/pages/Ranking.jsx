import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { getRanking } from "../services/gamificationService"
import { EmptyState, ErrorState, LoadingScreen, PageHeader } from "../components/ui"

export default function Ranking() {
  const { profile } = useAuth()
  const [scope, setScope] = useState("general")
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  async function load(currentScope = scope) {
    try {
      setError("")
      setData(await getRanking(currentScope))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load(scope)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  if (error) return <div className="mx-auto max-w-4xl px-4 py-8"><ErrorState message={error} onRetry={() => load()} /></div>
  if (!data) return <LoadingScreen label="Carregando ranking..." />

  const podium = data.entries.slice(0, 3)
  const medals = ["🥇", "🥈", "🥉"]
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Ranking"
        subtitle="Posição baseada em XP. O ranking semanal zera toda segunda-feira."
        action={
          <div className="flex overflow-hidden rounded-xl border border-slate-300">
            {[
              { key: "general", label: "Geral" },
              { key: "weekly", label: "Semanal" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  scope === s.key
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      {data.entries.length === 0 ? (
        <EmptyState
          icon="🥇"
          title={scope === "weekly" ? "Semana ainda em branco" : "Ninguém no ranking ainda"}
          message={
            scope === "weekly"
              ? "Ninguém ganhou XP nesta semana. Seja o primeiro!"
              : "Assim que alguém responder questões, o ranking aparece aqui."
          }
        />
      ) : (
        <>
          {/* Pódio */}
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {podiumOrder.map((entry) => {
              const isSecond = entry.position === 2
              const isFirst = entry.position === 1
              const mine = entry.id === profile?.id
              return (
                <div
                  key={entry.id}
                  className={`card p-3 text-center sm:p-4 ${
                    isFirst ? "border-amber-300 ring-2 ring-amber-200" : ""
                  } ${mine ? "outline outline-2 outline-brand-400" : ""}`}
                >
                  <div className="text-2xl sm:text-3xl">{medals[entry.position - 1]}</div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">
                    {entry.nickname}
                  </p>
                  <p className="text-xs text-slate-500">Nível {entry.level}</p>
                  <p className="mt-1 text-sm font-extrabold text-brand-600">
                    {scope === "weekly" ? entry.weeklyXp : entry.xp} XP
                  </p>
                  {isSecond && <span className="sr-only">2º lugar</span>}
                </div>
              )
            })}
          </div>

          {/* Lista */}
          <div className="card mt-6 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Estudante</th>
                  <th className="px-4 py-3 text-center">Nível</th>
                  <th className="px-4 py-3 text-right">
                    {scope === "weekly" ? "XP semanal" : "XP total"}
                  </th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">🔥</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={
                      entry.id === profile?.id
                        ? "bg-brand-50/70 font-semibold"
                        : "hover:bg-slate-50"
                    }
                  >
                    <td className="px-4 py-3 text-slate-500">
                      {entry.position <= 3 ? medals[entry.position - 1] : entry.position}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {entry.nickname.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate font-medium text-slate-800">
                          {entry.nickname}
                          {entry.id === profile?.id && (
                            <span className="ml-1.5 text-xs text-brand-600">(você)</span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="chip bg-indigo-100 text-indigo-700">
                        Nv {entry.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {scope === "weekly" ? entry.weeklyXp : entry.xp}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-slate-500 sm:table-cell">
                      {entry.streak}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.myPosition && (
            <p className="mt-3 text-center text-sm text-slate-500">
              Sua posição: <strong className="text-slate-800">#{data.myPosition}</strong> de{" "}
              {data.total}
            </p>
          )}
        </>
      )}
    </div>
  )
}
