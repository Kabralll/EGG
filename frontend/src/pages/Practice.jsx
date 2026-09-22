import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { answerQuestion, getPractice } from "../services/practiceService"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { difficultyLabel, difficultyStyle, EmptyState, ErrorState, ProgressBar, Spinner } from "../components/ui"

const LETTERS = ["A", "B", "C", "D", "E", "F"]

export default function Practice() {
  const [searchParams] = useSearchParams()
  const { refreshProfile } = useAuth()
  const toast = useToast()

  const params = useMemo(
    () => ({
      subjectId: searchParams.get("subjectId") || undefined,
      topicId: searchParams.get("topicId") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      stepId: searchParams.get("stepId") || undefined,
      limit: searchParams.get("limit") || undefined,
    }),
    [searchParams]
  )

  const [state, setState] = useState({ loading: true, error: null, questions: [], context: null })
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [session, setSession] = useState({
    correct: 0,
    wrong: 0,
    xp: 0,
    achievements: [],
    levelUp: false,
    stepCompleted: null,
    trailCompleted: null,
    challengeCompleted: false,
  })

  const load = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }))
      const data = await getPractice(params)
      setState({ loading: false, error: null, questions: data.questions, context: data.context })
      setIndex(0)
      setSelected(null)
      setResult(null)
      setSession({
        correct: 0,
        wrong: 0,
        xp: 0,
        achievements: [],
        levelUp: false,
        stepCompleted: null,
        trailCompleted: null,
        challengeCompleted: false,
      })
    } catch (err) {
      setState({ loading: false, error: err.message, questions: [], context: null })
    }
  }, [params])

  useEffect(() => {
    load()
  }, [load])

  const questions = state.questions
  const finished = !state.loading && !state.error && questions.length > 0 && index >= questions.length
  const question = questions[index]

  async function handleConfirm() {
    if (!question || selected === null || submitting) return
    setSubmitting(true)
    try {
      const data = await answerQuestion(question.id, selected)
      setResult(data)

      setSession((s) => ({
        correct: s.correct + (data.isCorrect ? 1 : 0),
        wrong: s.wrong + (data.isCorrect ? 0 : 1),
        xp: s.xp + data.xpAwarded,
        achievements: [...s.achievements, ...data.newAchievements],
        levelUp: s.levelUp || data.levelUp,
        stepCompleted: data.stepCompleted || s.stepCompleted,
        trailCompleted: data.trailCompleted || s.trailCompleted,
        challengeCompleted: s.challengeCompleted || data.challengeCompleted,
      }))

      // Feedbacks imediatos
      if (data.xpAwarded > 0 && !data.repeat) {
        toast.push({
          type: "xp",
          icon: "⚡",
          title: `+${data.xpAwarded} XP`,
          message: data.isCorrect ? "Resposta correta!" : "Bom esforço — cada tentativa ensina.",
          duration: 3000,
        })
      }
      data.newAchievements.forEach((a) =>
        toast.push({
          type: "achievement",
          icon: a.icon,
          title: `Conquista desbloqueada: ${a.name}`,
          message: a.description,
          duration: 6000,
        })
      )
      if (data.levelUp) {
        toast.push({
          type: "levelUp",
          icon: "🎉",
          title: `Subiu para o nível ${data.progress.level}!`,
          message: `Continue estudando para alcançar ${data.progress.nextLevelXp} XP.`,
          duration: 6000,
        })
      }
      if (data.trailCompleted) {
        toast.push({
          type: "achievement",
          icon: data.trailCompleted.icon || "🛤️",
          title: `Trilha concluída: ${data.trailCompleted.title}`,
          message: `+${data.trailCompleted.xp} XP de bônus!`,
          duration: 7000,
        })
      }
      if (data.challengeCompleted) {
        toast.push({
          type: "achievement",
          icon: "📅",
          title: "Desafio diário concluído!",
          message: `+${data.dailyChallenge.xpReward} XP — volte amanhã para a próxima missão.`,
          duration: 6000,
        })
      }

      refreshProfile()
    } catch (err) {
      toast.push({ type: "error", icon: "⚠️", title: "Não foi possível registrar", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  function handleNext() {
    setSelected(null)
    setResult(null)
    setIndex((i) => i + 1)
  }

  /* ---------- Estados ---------- */

  if (state.loading) return <Spinner size="lg" label="Preparando suas questões..." />

  if (state.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <ErrorState message={state.error} onRetry={load} />
        <div className="mt-4 text-center">
          <Link to="/trails" className="btn-secondary">
            ← Voltar às trilhas
          </Link>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          icon="🎉"
          title="Tudo respondido por aqui!"
          message="Você já respondeu todas as questões deste filtro. Escolha outra disciplina ou assunto para continuar ganhando XP."
          action={
            <div className="flex gap-2">
              <Link to="/subjects" className="btn-primary">
                Escolher disciplina
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                Voltar ao dashboard
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  /* ---------- Resumo final ---------- */
  if (finished) {
    const total = session.correct + session.wrong
    const acc = total > 0 ? Math.round((session.correct / total) * 100) : 0
    const trail = session.trailCompleted
    const step = session.stepCompleted

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="card animate-pop overflow-hidden text-center">
          <div className="bg-gradient-to-br from-brand-500 to-amber-500 px-6 py-8 text-white">
            <p className="text-5xl">{acc >= 70 ? "🏆" : acc >= 40 ? "💪" : "📚"}</p>
            <h1 className="mt-3 text-2xl font-extrabold">
              {acc >= 70 ? "Sessão concluída!" : "Boa tentativa!"}
            </h1>
            <p className="mt-1 text-sm text-white/90">
              {acc >= 70
                ? "Você mandou bem. Continue assim!"
                : "Cada questão errada é uma chance de aprender."}
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
            <div className="p-4">
              <p className="text-2xl font-extrabold text-emerald-600">{session.correct}</p>
              <p className="text-xs font-medium text-slate-500">Acertos</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-extrabold text-rose-500">{session.wrong}</p>
              <p className="text-xs font-medium text-slate-500">Erros</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-extrabold text-brand-600">+{session.xp}</p>
              <p className="text-xs font-medium text-slate-500">XP ganho</p>
            </div>
          </div>

          <div className="space-y-3 p-5 text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Aproveitamento
              </p>
              <div className="mt-1.5">
                <ProgressBar percent={acc} color={acc >= 70 ? "emerald" : "amber"} size="md" />
              </div>
            </div>

            {step && (
              <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800 ring-1 ring-indigo-100">
                ✅ Etapa concluída: <strong>{step.stepTitle}</strong>
                {state.context && (
                  <Link to={`/trails/${step.trailId}`} className="ml-1 font-semibold underline">
                    Ver trilha
                  </Link>
                )}
              </div>
            )}
            {trail && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                🎉 Você concluiu a trilha <strong>{trail.icon} {trail.title}</strong> e ganhou{" "}
                <strong>+{trail.xp} XP</strong>!
              </div>
            )}
            {session.achievements.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Novas conquistas
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {session.achievements.map((a, i) => (
                    <span
                      key={i}
                      className="chip bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 ring-1 ring-amber-200"
                    >
                      {a.icon} {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {session.levelUp && (
              <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 text-sm font-bold text-white">
                🎉 Você subiu de nível nesta sessão!
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-center">
            <button onClick={load} className="btn-primary">
              Praticar de novo
            </button>
            <Link
              to={state.context ? `/trails/${state.context.trailId}` : "/subjects"}
              className="btn-secondary"
            >
              {state.context ? "Voltar à trilha" : "Outra disciplina"}
            </Link>
            <Link to="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Questão ---------- */
  const answered = result !== null
  const progressPercent = ((index + (answered ? 1 : 0)) / questions.length) * 100

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Cabeçalho da sessão */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {state.context ? (
              <span className="chip bg-indigo-100 text-indigo-700">
                {state.context.trailIcon} {state.context.trailTitle} · {state.context.stepTitle}
              </span>
            ) : (
              <span className="chip bg-brand-100 text-brand-700">⚡ Sessão de prática</span>
            )}
            <span className="text-slate-500">
              Questão {index + 1} de {questions.length}
            </span>
          </div>
          <span className="chip bg-emerald-100 text-emerald-700">
            +{session.xp} XP nesta sessão
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar percent={progressPercent} size="sm" />
        </div>
      </div>

      {/* Cartão da questão */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="chip bg-white text-slate-600 ring-1 ring-slate-200">
              {question.subject}
            </span>
            <span className="chip bg-white text-slate-500 ring-1 ring-slate-200">{question.topic}</span>
            <span className={`chip ${difficultyStyle(question.difficulty)}`}>
              {difficultyLabel(question.difficulty)}
            </span>
            <span className="chip bg-white text-slate-400 ring-1 ring-slate-200">{question.grade}</span>
            {question.alreadyAnswered && (
              <span className="chip bg-slate-200 text-slate-500">já respondida</span>
            )}
          </div>
          <p className="text-base font-medium leading-relaxed text-slate-800 sm:text-lg">
            {question.statement}
          </p>
        </div>

        <div className="space-y-2.5 p-5">
          {question.options.map((option, i) => {
            const isSelected = selected === option.id
            let style = "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
            let letterStyle = "bg-slate-100 text-slate-600"

            if (answered) {
              if (option.id === result.correctOptionId) {
                style = "border-emerald-400 bg-emerald-50"
                letterStyle = "bg-emerald-500 text-white"
              } else if (isSelected) {
                style = "border-rose-400 bg-rose-50"
                letterStyle = "bg-rose-500 text-white"
              } else {
                style = "border-slate-100 bg-white opacity-60"
              }
            } else if (isSelected) {
              style = "border-brand-500 bg-brand-50 ring-2 ring-brand-500/30"
              letterStyle = "bg-brand-500 text-white"
            }

            return (
              <button
                key={option.id}
                type="button"
                disabled={answered}
                onClick={() => setSelected(option.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${style} ${
                  !answered && "cursor-pointer"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${letterStyle}`}
                >
                  {LETTERS[i]}
                </span>
                <span className="text-sm font-medium text-slate-700 sm:text-base">
                  {option.text}
                </span>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div className="border-t border-slate-100 p-5">
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                result.isCorrect
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {result.isCorrect ? (
                <>
                  ✅ Resposta correta!{" "}
                  {result.xpAwarded > 0 && <span>· +{result.xpAwarded} XP</span>}
                  {result.repeat && <span> · questão já respondida (sem XP)</span>}
                </>
              ) : (
                <>
                  ❌ Ainda não — a resposta correta é:{" "}
                  <strong>{result.correctOptionText}</strong>
                </>
              )}
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                💡 Explicação
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{result.explanation}</p>
            </div>

            {/* Eventos de progressão */}
            <div className="mt-3 flex flex-wrap gap-2">
              {result.levelUp && (
                <span className="chip bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
                  🎉 Nível {result.progress.level}!
                </span>
              )}
              {result.newAchievements.map((a) => (
                <span
                  key={a.code}
                  className="chip bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 ring-1 ring-amber-200"
                >
                  {a.icon} {a.name}
                </span>
              ))}
              {result.stepCompleted && (
                <span className="chip bg-indigo-100 text-indigo-700">
                  ✅ Etapa: {result.stepCompleted.stepTitle}
                </span>
              )}
              {result.trailCompleted && (
                <span className="chip bg-amber-100 text-amber-800">
                  🎉 Trilha concluída: {result.trailCompleted.title} +{result.trailCompleted.xp} XP
                </span>
              )}
              {result.challengeCompleted && (
                <span className="chip bg-emerald-100 text-emerald-700">
                  📅 Desafio diário completo +{result.dailyChallenge.xpReward} XP
                </span>
              )}
              {!result.repeat && result.xpBreakdown.trail > 0 && (
                <span className="chip bg-brand-100 text-brand-700">+{result.xpBreakdown.trail} XP trilha</span>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={handleNext} className="btn-primary">
                {index + 1 === questions.length ? "Ver resultado →" : "Próxima questão →"}
              </button>
            </div>
          </div>
        )}

        {/* Ação antes de responder */}
        {!answered && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400">
              {selected === null ? "Selecione uma alternativa" : "Pronto para confirmar"}
            </p>
            <button
              onClick={handleConfirm}
              disabled={selected === null || submitting}
              className="btn-primary"
            >
              {submitting ? "Verificando..." : "Confirmar resposta"}
            </button>
          </div>
        )}
      </div>

      {/* Progresso das questões em miniatura */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          let bg = "bg-slate-200"
          if (i < index) bg = "bg-emerald-400"
          if (i === index) bg = answered ? (result.isCorrect ? "bg-emerald-500" : "bg-rose-400") : "bg-brand-500"
          return <span key={q.id} className={`h-1.5 w-6 rounded-full ${bg}`} />
        })}
      </div>
    </div>
  )
}
