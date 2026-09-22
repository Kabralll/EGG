import prisma from "../lib/prisma.js"

// Todas as conquistas + estado de desbloqueio do usuário
export async function listAchievements(req, res, next) {
  try {
    const userId = req.user.id

    const [achievements, unlocked] = await Promise.all([
      prisma.achievement.findMany({ orderBy: { threshold: "asc" } }),
      prisma.userAchievement.findMany({ where: { userId } }),
    ])

    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]))

    res.json({
      total: achievements.length,
      unlockedCount: unlocked.length,
      achievements: achievements.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        metric: a.metric,
        threshold: a.threshold,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) || null,
      })),
    })
  } catch (error) {
    next(error)
  }
}
