import prisma from "../lib/prisma.js"
import { toDateKey, yesterdayKey } from "../utils/date.js"

/*
  Núcleo de gamificação do EGG.
  Regras:
  - XP só é concedido na PRIMEIRA tentativa de cada questão (unique userId+questionId).
  - O nível é sempre derivado do XP (fonte única de verdade).
  - Streak avança 1 dia quando há atividade em dias consecutivos; reinicia em 1 após buraco.
  - Desafios diários rotacionam por dia e premiam apenas uma vez por usuário/dia.
*/

export const XP_CORRECT = { facil: 10, media: 20, dificil: 30 }
export const XP_WRONG = 2
export const XP_TRAIL_COMPLETE = 100
export const XP_DAILY_CHALLENGE = 50

// Nível L exige: 100*(L-1) + 50*(L-1)*(L-2)/2 → 0, 100, 250, 450, 700...
export function xpRequiredForLevel(level) {
  if (level <= 1) return 0
  return 100 * (level - 1) + (50 * (level - 1) * (level - 2)) / 2
}

export function levelFromXp(xp) {
  let level = 1
  while (xpRequiredForLevel(level + 1) <= xp) level += 1
  return level
}

export function levelProgress(xp) {
  const level = levelFromXp(xp)
  const currentLevelXp = xpRequiredForLevel(level)
  const nextLevelXp = xpRequiredForLevel(level + 1)
  const span = nextLevelXp - currentLevelXp
  const progress = xp - currentLevelXp
  return {
    level,
    xp,
    currentLevelXp,
    nextLevelXp,
    progress,
    span,
    percent: span > 0 ? Math.min(100, Math.round((progress / span) * 100)) : 100,
  }
}

export function computeStreak(streak, lastActiveDay, todayKey = toDateKey()) {
  if (lastActiveDay === todayKey) {
    return { streak: Math.max(streak, 1), lastActiveDay: todayKey }
  }
  if (lastActiveDay === yesterdayKey()) {
    return { streak: streak + 1, lastActiveDay: todayKey }
  }
  return { streak: 1, lastActiveDay: todayKey }
}

/* ------------------------- Desafios diários ------------------------- */

function challengeTemplateFor(dayKey) {
  // Rotação determinística: mesma data ⇒ mesmo desafio para todos
  const [y, m, d] = dayKey.split("-").map(Number)
  const seed = Math.floor(Date.UTC(y, m - 1, d) / 86400000) // dias desde 1970

  const templates = [
    { type: "ANSWER_N", title: "Responda 5 questões hoje", target: 5 },
    { type: "XP_N", title: "Ganhe 100 XP hoje", target: 100 },
    { type: "ANSWER_N_SUBJECT", target: 3 }, // título recebe a disciplina
    { type: "ACCURACY", title: "Acerte 80% em 5 questões hoje", target: 80 },
  ]

  const template = { ...templates[seed % templates.length], subjectOffset: seed }
  return template
}

export async function getOrCreateDailyChallenge(dayKey = toDateKey(), client = prisma) {
  const existing = await client.dailyChallenge.findUnique({
    where: { day: dayKey },
    include: { subject: true },
  })
  if (existing) return existing

  const template = challengeTemplateFor(dayKey)

  let subjectId = null
  let title = template.title
  if (template.type === "ANSWER_N_SUBJECT") {
    const subjects = await client.subject.findMany({ orderBy: { id: "asc" } })
    const subject = subjects[template.subjectOffset % subjects.length]
    subjectId = subject.id
    title = `${template.target} questões de ${subject.name} hoje`
  }

  return client.dailyChallenge.create({
    data: {
      day: dayKey,
      type: template.type,
      title,
      target: template.target,
      subjectId,
      xpReward: XP_DAILY_CHALLENGE,
    },
    include: { subject: true },
  })
}

// Progresso cru (ainda sem considerar a conclusão do próprio usuário)
// `client` permite rodar dentro de uma transação (vê dados não commitados)
export async function rawChallengeProgress(challenge, userId, dayKey = toDateKey(), client = prisma) {
  const dayStart = new Date(`${dayKey}T00:00:00`)

  if (challenge.type === "XP_N") {
    const agg = await client.xpTransaction.aggregate({
      where: { userId, createdAt: { gte: dayStart } },
      _sum: { amount: true },
    })
    return agg._sum.amount || 0
  }

  const attempts = await client.questionAttempt.findMany({
    where: {
      userId,
      createdAt: { gte: dayStart },
      ...(challenge.type === "ANSWER_N_SUBJECT"
        ? { question: { topic: { subjectId: challenge.subjectId } } }
        : {}),
    },
    select: { isCorrect: true },
  })

  if (challenge.type === "ACCURACY") {
    if (attempts.length < 5) return 0
    const correct = attempts.filter((a) => a.isCorrect).length
    return Math.round((correct / attempts.length) * 100)
  }

  return attempts.length // ANSWER_N | ANSWER_N_SUBJECT
}

export async function getDailyChallengeState(userId, dayKey = toDateKey()) {
  const challenge = await getOrCreateDailyChallenge(dayKey)
  const completion = await prisma.dailyChallengeCompletion.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  })
  const progress = await rawChallengeProgress(challenge, userId, dayKey)

  return {
    id: challenge.id,
    day: challenge.day,
    type: challenge.type,
    title: challenge.title,
    target: challenge.target,
    xpReward: challenge.xpReward,
    subject: challenge.subject ? challenge.subject.name : null,
    progress,
    percent: Math.min(100, Math.round((progress / challenge.target) * 100)),
    completed: Boolean(completion),
    completedAt: completion ? completion.completedAt : null,
  }
}

/* --------------------------- Conquistas --------------------------- */

export async function evaluateAchievements(tx, userId, user) {
  const metrics = {
    QUESTIONS_ANSWERED: await tx.questionAttempt.count({ where: { userId } }),
    CORRECT_ANSWERED: await tx.questionAttempt.count({
      where: { userId, isCorrect: true },
    }),
    XP: user.xp,
    STREAK: user.streak,
    TRAILS_COMPLETED: await tx.trailCompletion.count({ where: { userId } }),
    DAILY_CHALLENGES: await tx.dailyChallengeCompletion.count({ where: { userId } }),
    LEVEL: levelFromXp(user.xp),
  }

  const achievements = await tx.achievement.findMany({
    include: { userAchievements: { where: { userId }, take: 1 } },
  })

  const toUnlock = achievements.filter(
    (a) => a.userAchievements.length === 0 && (metrics[a.metric] ?? 0) >= a.threshold
  )

  if (toUnlock.length > 0) {
    await tx.userAchievement.createMany({
      data: toUnlock.map((a) => ({ userId, achievementId: a.id })),
      skipDuplicates: true,
    })
  }

  return toUnlock.map((a) => ({
    code: a.code,
    name: a.name,
    description: a.description,
    icon: a.icon,
  }))
}
