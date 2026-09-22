import prisma from "../lib/prisma.js"

// Lista disciplinas com contagem de questões e progresso do usuário
export async function listSubjects(req, res, next) {
  try {
    const userId = req.user.id

    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        topics: {
          orderBy: { name: "asc" },
          include: { _count: { select: { questions: true } } },
        },
        _count: { select: { topics: true } },
      },
    })

    const attempts = await prisma.questionAttempt.findMany({
      where: { userId },
      select: { isCorrect: true, question: { select: { topic: { select: { subjectId: true } } } } },
    })

    const progress = {}
    for (const a of attempts) {
      const id = a.question.topic.subjectId
      if (!progress[id]) progress[id] = { answered: 0, correct: 0 }
      progress[id].answered += 1
      if (a.isCorrect) progress[id].correct += 1
    }

    res.json(
      subjects.map((s) => {
        const totalQuestions = s.topics.reduce((sum, t) => sum + t._count.questions, 0)
        const p = progress[s.id] || { answered: 0, correct: 0 }
        return {
          id: s.id,
          name: s.name,
          icon: s.icon,
          color: s.color,
          topicsCount: s._count.topics,
          totalQuestions,
          answered: p.answered,
          correct: p.correct,
          accuracy: p.answered > 0 ? Math.round((p.correct / p.answered) * 100) : null,
          topics: s.topics.map((t) => ({ id: t.id, name: t.name })),
        }
      })
    )
  } catch (error) {
    next(error)
  }
}

// Detalhe da disciplina: assuntos com contagens e desempenho por assunto
export async function getSubject(req, res, next) {
  try {
    const subjectId = Number(req.params.id)
    const userId = req.user.id

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { topics: { orderBy: { name: "asc" }, include: { questions: { select: { id: true } } } } },
    })
    if (!subject) return res.status(404).json({ error: "Disciplina não encontrada" })

    const attempts = await prisma.questionAttempt.findMany({
      where: { userId, question: { topic: { subjectId } } },
      select: { questionId: true, isCorrect: true },
    })
    const answeredIds = new Set(attempts.map((a) => a.questionId))
    const correctIds = new Set(attempts.filter((a) => a.isCorrect).map((a) => a.questionId))

    const totalQuestions = subject.topics.reduce((sum, t) => sum + t.questions.length, 0)

    res.json({
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      color: subject.color,
      totalQuestions,
      answered: answeredIds.size,
      correct: correctIds.size,
      topics: subject.topics.map((t) => ({
        id: t.id,
        name: t.name,
        totalQuestions: t.questions.length,
        answered: t.questions.filter((q) => answeredIds.has(q.id)).length,
        correct: t.questions.filter((q) => correctIds.has(q.id)).length,
      })),
    })
  } catch (error) {
    next(error)
  }
}
