import prisma from "../lib/prisma.js"
import { levelFromXp } from "../services/gamificationService.js"
import { startOfToday } from "../utils/date.js"

/* ----------------------------- Visão geral ----------------------------- */

export async function overview(req, res, next) {
  try {
    const today = startOfToday()

    const [users, students, subjects, questions, trails, attempts, attemptsToday, xpAgg, achievements] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.subject.count(),
        prisma.question.count(),
        prisma.trail.count(),
        prisma.questionAttempt.count(),
        prisma.questionAttempt.count({ where: { createdAt: { gte: today } } }),
        prisma.user.aggregate({ _sum: { xp: true } }),
        prisma.userAchievement.count(),
      ])

    res.json({
      users,
      students,
      subjects,
      questions,
      trails,
      attempts,
      attemptsToday,
      totalXp: xpAgg._sum.xp || 0,
      achievements,
    })
  } catch (error) {
    next(error)
  }
}

/* ------------------------------- Usuários ------------------------------ */

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xp: "desc" },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        role: true,
        xp: true,
        streak: true,
        createdAt: true,
        _count: { select: { attempts: true, achievements: true } },
      },
    })

    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        email: u.email,
        role: u.role,
        xp: u.xp,
        level: levelFromXp(u.xp),
        streak: u.streak,
        attempts: u._count.attempts,
        achievements: u._count.achievements,
        createdAt: u.createdAt,
      }))
    )
  } catch (error) {
    next(error)
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const id = Number(req.params.id)
    const { role } = req.body || {}
    if (!["ADMIN", "STUDENT"].includes(role)) {
      return res.status(400).json({ error: "Papel inválido" })
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: "Você não pode alterar seu próprio papel" })
    }

    const user = await prisma.user.update({ where: { id }, data: { role } })
    res.json({ id: user.id, role: user.role })
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Usuário não encontrado" })
    next(error)
  }
}

/* ------------------------- Disciplinas e assuntos ----------------------- */

export async function createSubject(req, res, next) {
  try {
    const { name, icon, color } = req.body || {}
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: "Informe um nome para a disciplina" })
    }

    const subject = await prisma.subject.create({
      data: {
        name: String(name).trim(),
        icon: icon || "📘",
        color: color || "#6366f1",
      },
    })
    res.status(201).json(subject)
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "Disciplina já existente" })
    next(error)
  }
}

export async function updateSubject(req, res, next) {
  try {
    const id = Number(req.params.id)
    const { name, icon, color } = req.body || {}
    const data = {}
    if (name !== undefined) data.name = String(name).trim()
    if (icon !== undefined) data.icon = icon
    if (color !== undefined) data.color = color

    const subject = await prisma.subject.update({ where: { id }, data })
    res.json(subject)
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Disciplina não encontrada" })
    if (error.code === "P2002") return res.status(409).json({ error: "Disciplina já existente" })
    next(error)
  }
}

export async function deleteSubject(req, res, next) {
  try {
    await prisma.subject.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: "Disciplina excluída" })
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Disciplina não encontrada" })
    next(error)
  }
}

export async function createTopic(req, res, next) {
  try {
    const { name, subjectId } = req.body || {}
    if (!name || !subjectId) {
      return res.status(400).json({ error: "Informe nome e disciplina" })
    }

    const topic = await prisma.topic.create({
      data: { name: String(name).trim(), subjectId: Number(subjectId) },
    })
    res.status(201).json(topic)
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "Assunto já existente nesta disciplina" })
    if (error.code === "P2003") return res.status(400).json({ error: "Disciplina inválida" })
    next(error)
  }
}

export async function updateTopic(req, res, next) {
  try {
    const { name } = req.body || {}
    const topic = await prisma.topic.update({
      where: { id: Number(req.params.id) },
      data: { name: String(name).trim() },
    })
    res.json(topic)
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Assunto não encontrado" })
    if (error.code === "P2002") return res.status(409).json({ error: "Assunto já existente" })
    next(error)
  }
}

export async function deleteTopic(req, res, next) {
  try {
    await prisma.topic.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: "Assunto excluído" })
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Assunto não encontrado" })
    next(error)
  }
}

/* -------------------------------- Questões ----------------------------- */

export async function listQuestions(req, res, next) {
  try {
    const { subjectId, topicId, difficulty, search } = req.query
    const where = {
      ...(topicId ? { topicId: Number(topicId) } : {}),
      ...(!topicId && subjectId ? { topic: { subjectId: Number(subjectId) } } : {}),
      ...(difficulty && ["facil", "media", "dificil"].includes(difficulty) ? { difficulty } : {}),
      ...(search ? { statement: { contains: String(search) } } : {}),
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { id: "asc" },
      include: {
        options: { orderBy: { id: "asc" } },
        topic: { include: { subject: { select: { id: true, name: true } } } },
        _count: { select: { attempts: true } },
      },
    })

    res.json(
      questions.map((q) => ({
        id: q.id,
        statement: q.statement,
        explanation: q.explanation,
        difficulty: q.difficulty,
        grade: q.grade,
        topicId: q.topicId,
        topic: { id: q.topic.id, name: q.topic.name },
        subject: q.topic.subject,
        attempts: q._count.attempts,
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      }))
    )
  } catch (error) {
    next(error)
  }
}

function validateQuestionPayload(body) {
  const errors = {}
  if (!body.statement || String(body.statement).trim().length < 10)
    errors.statement = "Enunciado muito curto"
  if (!body.explanation || String(body.explanation).trim().length < 5)
    errors.explanation = "Informe uma explicação"
  if (!body.topicId) errors.topicId = "Selecione o assunto"
  if (!["facil", "media", "dificil"].includes(body.difficulty))
    errors.difficulty = "Dificuldade inválida"

  const options = Array.isArray(body.options) ? body.options : []
  if (options.length < 2 || options.length > 6)
    errors.options = "A questão deve ter entre 2 e 6 alternativas"
  else if (options.filter((o) => o && String(o.text || "").trim()).length !== options.length)
    errors.options = "Todas as alternativas precisam de texto"
  else if (options.filter((o) => o.isCorrect).length !== 1)
    errors.options = "Marque exatamente uma alternativa como correta"

  return errors
}

export async function createQuestion(req, res, next) {
  try {
    const body = req.body || {}
    const errors = validateQuestionPayload(body)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Dados inválidos", fields: errors })
    }

    const question = await prisma.question.create({
      data: {
        statement: String(body.statement).trim(),
        explanation: String(body.explanation).trim(),
        difficulty: body.difficulty,
        grade: body.grade || "Ensino Médio",
        topicId: Number(body.topicId),
        options: {
          create: body.options.map((o) => ({
            text: String(o.text).trim(),
            isCorrect: Boolean(o.isCorrect),
          })),
        },
      },
    })
    res.status(201).json(question)
  } catch (error) {
    if (error.code === "P2003") return res.status(400).json({ error: "Assunto inválido" })
    next(error)
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    const errors = validateQuestionPayload(body)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Dados inválidos", fields: errors })
    }

    await prisma.$transaction([
      prisma.question.update({
        where: { id },
        data: {
          statement: String(body.statement).trim(),
          explanation: String(body.explanation).trim(),
          difficulty: body.difficulty,
          grade: body.grade || "Ensino Médio",
          topicId: Number(body.topicId),
        },
      }),
      prisma.option.deleteMany({ where: { questionId: id } }),
      prisma.option.createMany({
        data: body.options.map((o) => ({
          text: String(o.text).trim(),
          isCorrect: Boolean(o.isCorrect),
          questionId: id,
        })),
      }),
    ])

    res.json({ id, updated: true })
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Questão não encontrada" })
    next(error)
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    await prisma.question.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: "Questão excluída" })
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Questão não encontrada" })
    next(error)
  }
}

/* -------------------------------- Trilhas ------------------------------ */

export async function listTrailsAdmin(req, res, next) {
  try {
    const trails = await prisma.trail.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      include: {
        subject: { select: { id: true, name: true } },
        steps: {
          orderBy: { order: "asc" },
          include: { questions: { select: { questionId: true } } },
        },
        _count: { select: { completions: true } },
      },
    })

    res.json(
      trails.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        icon: t.icon,
        order: t.order,
        subject: t.subject,
        completions: t._count.completions,
        steps: t.steps.map((s) => ({
          id: s.id,
          order: s.order,
          title: s.title,
          questionIds: s.questions.map((q) => q.questionId),
        })),
      }))
    )
  } catch (error) {
    next(error)
  }
}

function validateTrailPayload(body) {
  const errors = {}
  if (!body.title || String(body.title).trim().length < 3) errors.title = "Título muito curto"
  if (!body.description || String(body.description).trim().length < 5)
    errors.description = "Informe uma descrição"
  if (!body.subjectId) errors.subjectId = "Selecione a disciplina"

  const steps = Array.isArray(body.steps) ? body.steps : []
  if (steps.length === 0) errors.steps = "Adicione ao menos uma etapa"
  else if (steps.some((s) => !s.title || !Array.isArray(s.questionIds) || s.questionIds.length === 0))
    errors.steps = "Cada etapa precisa de um título e ao menos uma questão"
  else if (steps.flatMap((s) => s.questionIds).some((id) => !Number.isInteger(Number(id))))
    errors.steps = "Lista de questões inválida"

  return errors
}

export async function createTrail(req, res, next) {
  try {
    const body = req.body || {}
    const errors = validateTrailPayload(body)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Dados inválidos", fields: errors })
    }

    const trail = await prisma.$transaction(async (tx) => {
      const created = await tx.trail.create({
        data: {
          title: String(body.title).trim(),
          description: String(body.description).trim(),
          icon: body.icon || "🛤️",
          subjectId: Number(body.subjectId),
          order: (await tx.trail.count()) + 1,
        },
      })

      let order = 1
      for (const step of body.steps) {
        const createdStep = await tx.trailStep.create({
          data: { trailId: created.id, order: order++, title: String(step.title).trim() },
        })
        await tx.trailStepQuestion.createMany({
          data: step.questionIds.map((qid) => ({
            stepId: createdStep.id,
            questionId: Number(qid),
          })),
        })
      }

      return created
    })

    res.status(201).json(trail)
  } catch (error) {
    if (error.code === "P2003") return res.status(400).json({ error: "Disciplina ou questão inválida" })
    next(error)
  }
}

export async function updateTrail(req, res, next) {
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    const errors = validateTrailPayload(body)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Dados inválidos", fields: errors })
    }

    const existing = await prisma.trail.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: "Trilha não encontrada" })

    await prisma.$transaction(async (tx) => {
      await tx.trail.update({
        where: { id },
        data: {
          title: String(body.title).trim(),
          description: String(body.description).trim(),
          icon: body.icon || existing.icon,
          subjectId: Number(body.subjectId),
          ...(body.order !== undefined ? { order: Number(body.order) } : {}),
        },
      })

      // Recria as etapas (apaga conclusões antigas das etapas removidas)
      await tx.trailStep.deleteMany({ where: { trailId: id } })

      let order = 1
      for (const step of body.steps) {
        const createdStep = await tx.trailStep.create({
          data: { trailId: id, order: order++, title: String(step.title).trim() },
        })
        await tx.trailStepQuestion.createMany({
          data: step.questionIds.map((qid) => ({
            stepId: createdStep.id,
            questionId: Number(qid),
          })),
        })
      }
    })

    res.json({ id, updated: true })
  } catch (error) {
    if (error.code === "P2003") return res.status(400).json({ error: "Disciplina ou questão inválida" })
    next(error)
  }
}

export async function deleteTrail(req, res, next) {
  try {
    await prisma.trail.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: "Trilha excluída" })
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Trilha não encontrada" })
    next(error)
  }
}
