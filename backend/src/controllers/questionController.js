import * as questionService from "../services/questionService.js"

// Sessão de prática — nunca expõe resposta correta ou explicação
export async function practice(req, res, next) {
  try {
    const { subjectId, topicId, difficulty, stepId, limit } = req.query

    if (difficulty && !["facil", "media", "dificil"].includes(difficulty)) {
      return res.status(400).json({ error: "Dificuldade inválida" })
    }

    const result = await questionService.getPracticeQuestions(req.user.id, {
      subjectId,
      topicId,
      difficulty,
      stepId,
      limit,
    })

    if (!result) return res.status(404).json({ error: "Etapa não encontrada" })
    if (result.locked)
      return res.status(403).json({ error: "Complete a etapa anterior para desbloquear esta." })

    res.json(result)
  } catch (error) {
    next(error)
  }
}

// Responde uma questão — validação e gamificação no servidor
export async function answer(req, res, next) {
  try {
    const questionId = Number(req.params.id)
    const optionId = Number(req.body?.optionId)

    if (!Number.isInteger(questionId) || !Number.isInteger(optionId)) {
      return res.status(400).json({ error: "Requisição inválida" })
    }

    const result = await questionService.answerQuestion(req.user.id, questionId, optionId)
    if (result.error) return res.status(result.status).json({ error: result.error })

    res.json(result)
  } catch (error) {
    next(error)
  }
}
