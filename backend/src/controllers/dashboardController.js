import prisma from "../lib/prisma.js"
import { levelProgress } from "../services/gamificationService.js"
import { getDailyChallengeState } from "../services/gamificationService.js"
import { getTrailsProgress } from "../services/trailService.js"
import { buildStats, buildRecommendation, getPositionOf } from "../services/statsService.js"

// Visão única do dashboard: o que fazer agora, progresso e gamificação
export async function dashboard(req, res, next) {
  try {
    const userId = req.user.id

    const [user, dailyChallenge, trails, recentAttempts, recentAchievements, stats, ranking] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        getDailyChallengeState(userId),
        getTrailsProgress(userId),
        prisma.questionAttempt.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            isCorrect: true,
            xpAwarded: true,
            createdAt: true,
            question: { select: { id: true, statement: true, topic: { select: { name: true, subject: { select: { name: true, icon: true, color: true } } } } } },
          },
        }),
        prisma.userAchievement.findMany({
          where: { userId },
          orderBy: { unlockedAt: "desc" },
          take: 3,
          include: { achievement: true },
        }),
        buildStats(userId),
        getPositionOf(userId, "general"),
      ])

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" })

    const inProgress = trails.filter((t) => !t.finished && t.completedSteps > 0)
    const suggested = trails.filter((t) => !t.finished && t.completedSteps === 0)

    res.json({
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        progress: levelProgress(user.xp),
        streak: user.streak,
      },
      dailyChallenge,
      trails: { inProgress, suggested },
      recentAttempts: recentAttempts.map((a) => ({
        questionId: a.question.id,
        statement: a.question.statement,
        topic: a.question.topic.name,
        subject: a.question.topic.subject,
        isCorrect: a.isCorrect,
        xpAwarded: a.xpAwarded,
        createdAt: a.createdAt,
      })),
      recentAchievements: recentAchievements.map((ua) => ({
        code: ua.achievement.code,
        name: ua.achievement.name,
        icon: ua.achievement.icon,
        description: ua.achievement.description,
        unlockedAt: ua.unlockedAt,
      })),
      stats: {
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        accuracy: stats.accuracy,
        subjectsStudied: stats.subjectsStudied,
        trailsCompleted: stats.trailsCompleted,
        achievements: stats.achievements,
      },
      ranking: { position: ranking.position, total: ranking.total },
      recommendation: buildRecommendation(stats),
    })
  } catch (error) {
    next(error)
  }
}
