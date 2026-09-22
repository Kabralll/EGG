import prisma from "../lib/prisma.js"
import {
  XP_CORRECT,
  XP_WRONG,
  XP_TRAIL_COMPLETE,
  levelProgress,
  computeStreak,
  getOrCreateDailyChallenge,
  rawChallengeProgress,
  evaluateAchievements,
  getDailyChallengeState,
} from "./gamificationService.js"
import { toDateKey } from "../utils/date.js"

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/*
  Monta uma sessão de prática NUNCA expondo resposta correta ou explicação.
  Preferimos questões ainda não respondidas; se faltarem, completa com repetição.
*/
export async function getPracticeQuestions(userId, filters = {}) {
  const { subjectId, topicId, difficulty, stepId, limit = 10 } = filters
  const max = Math.min(Math.max(Number(limit) || 10, 1), 20)

  if (stepId) {
    const step = await prisma.trailStep.findUnique({
      where: { id: Number(stepId) },
      include: {
        trail: { include: { subject: true } },
        questions: {
          include: { question: { include: { topic: true } } },
          orderBy: { questionId: "asc" },
        },
      },
    })
    if (!step) return null

    // Desbloqueio progressivo: a etapa 1 ou etapas após a conclusão da anterior
    const previous = await prisma.trailStep.findFirst({
      where: { trailId: step.trailId, order: step.order - 1 },
      include: { completions: { where: { userId }, take: 1 } },
    })
    if (previous && previous.completions.length === 0) {
      return { locked: true, step }
    }

    const questionIds = step.questions.map((q) => q.questionId)
    const attempts = await prisma.questionAttempt.findMany({
      where: { userId, questionId: { in: questionIds } },
      select: { questionId: true },
    })
    const answered = new Set(attempts.map((a) => a.questionId))

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { options: true, topic: { include: { subject: true } } },
    })

    return {
      locked: false,
      context: {
        type: "step",
        stepId: step.id,
        stepTitle: step.title,
        trailId: step.trail.id,
        trailTitle: step.trail.title,
        trailIcon: step.trail.icon,
        total: questionIds.length,
      },
      questions: questions.map((q) => ({
        id: q.id,
        statement: q.statement,
        difficulty: q.difficulty,
        grade: q.grade,
        topic: q.topic.name,
        subject: q.topic.subject.name,
        subjectColor: q.topic.subject.color,
        alreadyAnswered: answered.has(q.id),
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      })),
    }
  }

  const where = {
    ...(topicId ? { topicId: Number(topicId) } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(!topicId && subjectId ? { topic: { subjectId: Number(subjectId) } } : {}),
  }

  const attempts = await prisma.questionAttempt.findMany({
    where: { userId },
    select: { questionId: true },
  })
  const answered = new Set(attempts.map((a) => a.questionId))

  const all = await prisma.question.findMany({
    where,
    select: { id: true },
  })

  const unanswered = shuffle(all.filter((q) => !answered.has(q.id)).map((q) => q.id))
  let selected = unanswered.slice(0, max)
  if (selected.length < max) {
    const answeredMatches = shuffle(
      all.filter((q) => answered.has(q.id)).map((q) => q.id)
    ).slice(0, max - selected.length)
    selected = selected.concat(answeredMatches)
  }

  if (selected.length === 0) return { context: null, questions: [] }

  const questions = await prisma.question.findMany({
    where: { id: { in: selected } },
    include: { options: true, topic: { include: { subject: true } } },
  })

  const byId = Object.fromEntries(questions.map((q) => [q.id, q]))

  return {
    context: null,
    questions: selected.map((id) => {
      const q = byId[id]
      return {
        id: q.id,
        statement: q.statement,
        difficulty: q.difficulty,
        grade: q.grade,
        topic: q.topic.name,
        subject: q.topic.subject.name,
        subjectColor: q.topic.subject.color,
        alreadyAnswered: answered.has(q.id),
        options: shuffle(q.options.map((o) => ({ id: o.id, text: o.text }))),
      }
    }),
  }
}

/*
  Responde uma questão: valida no servidor, concede XP apenas na primeira
  tentativa e dispara streak, desafio diário, etapas, trilhas e conquistas.
*/
export async function answerQuestion(userId, questionId, optionId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true, topic: { include: { subject: true } } },
  })
  if (!question) return { error: "Questão não encontrada", status: 404 }

  const option = question.options.find((o) => o.id === optionId)
  if (!option) return { error: "Alternativa inválida", status: 400 }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: "Usuário não encontrado", status: 404 }

  const existing = await prisma.questionAttempt.findUnique({
    where: { userId_questionId: { userId, questionId } },
  })

  const isCorrect = option.isCorrect
  const correctOption = question.options.find((o) => o.isCorrect)
  const levelBefore = levelProgress(user.xp).level
  const dayKey = toDateKey()

  const events = {
    xpBreakdown: { base: 0, trail: 0, challenge: 0 },
    newAchievements: [],
    stepCompleted: null,
    trailCompleted: null,
    challengeCompleted: false,
  }

  let repeat = false
  let streak = user.streak

  if (existing) {
    // Repetição para estudo: feedback da seleção atual, sem XP e sem alterar estatísticas
    repeat = true
  } else {
    const baseXp = isCorrect ? XP_CORRECT[question.difficulty] ?? 20 : XP_WRONG

    const result = await prisma.$transaction(async (tx) => {
      await tx.questionAttempt.create({
        data: { userId, questionId, optionId, isCorrect, xpAwarded: baseXp },
      })

      const nextStreak = computeStreak(user.streak, user.lastActiveDay, dayKey)
      streak = nextStreak.streak

      await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: baseXp },
          streak: nextStreak.streak,
          lastActiveDay: nextStreak.lastActiveDay,
        },
      })
      await tx.xpTransaction.create({
        data: {
          userId,
          amount: baseXp,
          reason: isCorrect ? "question_correct" : "question_wrong",
          detail: question.topic.name,
        },
      })
      events.xpBreakdown.base = baseXp

      /* Desafio diário */
      const challenge = await getOrCreateDailyChallenge(dayKey, tx)
      const progress = await rawChallengeProgress(challenge, userId, dayKey, tx)
      if (progress >= challenge.target) {
        const done = await tx.dailyChallengeCompletion.findUnique({
          where: { userId_challengeId: { userId, challengeId: challenge.id } },
          select: { id: true },
        })
        if (!done) {
          await tx.dailyChallengeCompletion.create({
            data: { userId, challengeId: challenge.id, xpAwarded: challenge.xpReward },
          })
          await tx.user.update({
            where: { id: userId },
            data: { xp: { increment: challenge.xpReward } },
          })
          await tx.xpTransaction.create({
            data: {
              userId,
              amount: challenge.xpReward,
              reason: "daily_challenge",
              detail: challenge.title,
            },
          })
          events.challengeCompleted = true
          events.xpBreakdown.challenge = challenge.xpReward
        }
      }

      /* Etapas e trilhas que contêm esta questão */
      const links = await tx.trailStepQuestion.findMany({
        where: { questionId },
        select: { stepId: true, step: { include: { trail: true, questions: true } } },
      })

      const evaluatedTrails = new Set()
      for (const link of links) {
        const step = link.step
        const stepQuestionIds = step.questions.map((q) => q.questionId)
        const answeredCount = await tx.questionAttempt.count({
          where: { userId, questionId: { in: stepQuestionIds } },
        })
        if (answeredCount < stepQuestionIds.length) continue

        const stepDone = await tx.stepCompletion.findUnique({
          where: { userId_stepId: { userId, stepId: step.id } },
          select: { id: true },
        })
        if (!stepDone) {
          await tx.stepCompletion.create({ data: { userId, stepId: step.id } })
          events.stepCompleted = {
            stepId: step.id,
            stepTitle: step.title,
            trailId: step.trail.id,
            trailTitle: step.trail.title,
            trailIcon: step.trail.icon,
          }
        }

        if (evaluatedTrails.has(step.trailId)) continue
        evaluatedTrails.add(step.trailId)

        const allSteps = await tx.trailStep.findMany({
          where: { trailId: step.trailId },
          select: { id: true },
        })
        const doneSteps = await tx.stepCompletion.count({
          where: { userId, stepId: { in: allSteps.map((s) => s.id) } },
        })
        if (doneSteps < allSteps.length) continue

        const trailDone = await tx.trailCompletion.findUnique({
          where: { userId_trailId: { userId, trailId: step.trailId } },
          select: { id: true },
        })
        if (!trailDone) {
          await tx.trailCompletion.create({
            data: { userId, trailId: step.trailId, xpAwarded: XP_TRAIL_COMPLETE },
          })
          await tx.user.update({
            where: { id: userId },
            data: { xp: { increment: XP_TRAIL_COMPLETE } },
          })
          await tx.xpTransaction.create({
            data: {
              userId,
              amount: XP_TRAIL_COMPLETE,
              reason: "trail_complete",
              detail: step.trail.title,
            },
          })
          events.xpBreakdown.trail = XP_TRAIL_COMPLETE
          events.trailCompleted = {
            trailId: step.trail.id,
            title: step.trail.title,
            icon: step.trail.icon,
            xp: XP_TRAIL_COMPLETE,
          }
        }
      }

      /* Conquistas — avaliadas com todo o XP já concedido */
      const fresh = await tx.user.findUnique({ where: { id: userId } })
      events.newAchievements = await evaluateAchievements(tx, userId, fresh)
      return fresh
    })

    user.xp = result.xp
    user.streak = result.streak
  }

  if (repeat) {
    // Avalia conquitas mesmo em repetição (nada muda, mas mantém consistência)
    events.newAchievements = []
  }

  const freshUser = repeat
    ? await prisma.user.findUnique({ where: { id: userId } })
    : user

  const progress = levelProgress(freshUser.xp)
  const dailyChallenge = await getDailyChallengeState(userId, dayKey)

  return {
    repeat,
    isCorrect,
    correctOptionId: correctOption.id,
    correctOptionText: correctOption.text,
    explanation: question.explanation,
    xpAwarded: events.xpBreakdown.base + events.xpBreakdown.trail + events.xpBreakdown.challenge,
    xpBreakdown: events.xpBreakdown,
    levelUp: progress.level > levelBefore,
    progress,
    streak: freshUser.streak,
    newAchievements: events.newAchievements,
    stepCompleted: events.stepCompleted,
    trailCompleted: events.trailCompleted,
    challengeCompleted: events.challengeCompleted,
    dailyChallenge,
  }
}
