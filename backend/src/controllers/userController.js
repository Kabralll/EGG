import prisma from "../lib/prisma.js"
import { levelProgress } from "../services/gamificationService.js"
import { safeUser } from "../services/authService.js"

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" })

    const [totalQuestions, correctAnswers, trailsCompleted, achievements, subjectsStudied] =
      await Promise.all([
        prisma.questionAttempt.count({ where: { userId } }),
        prisma.questionAttempt.count({ where: { userId, isCorrect: true } }),
        prisma.trailCompletion.count({ where: { userId } }),
        prisma.userAchievement.count({ where: { userId } }),
        prisma.questionAttempt.findMany({
          where: { userId },
          distinct: ["questionId"],
          select: { question: { select: { topic: { select: { subjectId: true } } } } },
        }),
      ])

    const distinctSubjects = new Set(
      subjectsStudied.map((a) => a.question.topic.subjectId)
    )

    res.json({
      ...safeUser(user),
      progress: levelProgress(user.xp),
      streak: user.streak,
      stats: {
        totalQuestions,
        correctAnswers,
        wrongAnswers: totalQuestions - correctAnswers,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        trailsCompleted,
        achievements,
        subjectsStudied: distinctSubjects.size,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id
    const { name, nickname } = req.body || {}

    const data = {}
    const errors = {}

    if (name !== undefined) {
      if (String(name).trim().length < 2) errors.name = "Informe seu nome (mínimo 2 caracteres)"
      else data.name = String(name).trim()
    }
    if (nickname !== undefined) {
      if (String(nickname).trim().length < 2)
        errors.nickname = "Escolha um apelido (mínimo 2 caracteres)"
      else data.nickname = String(nickname).trim()
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Dados inválidos", fields: errors })
    }

    const user = await prisma.user.update({ where: { id: userId }, data })
    res.json(safeUser(user))
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Dados inválidos",
        fields: { nickname: "Este apelido já está em uso" },
      })
    }
    next(error)
  }
}
