import { db, apiError } from "./db";
import { levelFromXp } from "./gamification";

/*
  Painel administrativo local — port direto de
  backend/src/controllers/adminController.js, mas operando sobre o banco do
  próprio dispositivo (o admin edita as questões/trilhas que o app usa).
*/

/* ----------------------------- Visão geral ----------------------------- */

export async function overview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [users, students, subjects, questions, trails, attempts, xpAgg, achievements] =
    await Promise.all([
      db.users.count(),
      db.users.where("role").equals("STUDENT").count(),
      db.subjects.count(),
      db.questions.count(),
      db.trails.count(),
      db.attempts.count(),
      db.users.toArray(),
      db.userAchievements.count(),
    ]);

  const attemptsToday = (await db.attempts.toArray()).filter(
    (a) => a.createdAt >= today
  ).length;

  return {
    users,
    students,
    subjects,
    questions,
    trails,
    attempts,
    attemptsToday,
    totalXp: xpAgg.reduce((sum, u) => sum + (u.xp || 0), 0),
    achievements,
  };
}

/* ------------------------------- Usuários ------------------------------ */

export async function listUsers() {
  const users = (await db.users.toArray()).sort((a, b) => b.xp - a.xp);
  const [attempts, userAchievements] = await Promise.all([
    db.attempts.toArray(),
    db.userAchievements.toArray(),
  ]);

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    nickname: u.nickname,
    email: u.email,
    role: u.role,
    xp: u.xp,
    level: levelFromXp(u.xp),
    streak: u.streak,
    attempts: attempts.filter((a) => a.userId === u.id).length,
    achievements: userAchievements.filter((a) => a.userId === u.id).length,
    createdAt: u.createdAt,
  }));
}

export async function updateUserRole(currentUserId, id, role) {
  if (!["ADMIN", "STUDENT"].includes(role)) {
    throw apiError(400, "Papel inválido");
  }
  if (id === currentUserId) {
    throw apiError(400, "Você não pode alterar seu próprio papel");
  }

  const user = await db.users.get(id);
  if (!user) throw apiError(404, "Usuário não encontrado");

  await db.users.update(id, { role });
  return { id, role };
}

/* ------------------------- Disciplinas e assuntos ----------------------- */

export async function createSubject(body = {}) {
  const { name, icon, color } = body;
  if (!name || String(name).trim().length < 2) {
    throw apiError(400, "Informe um nome para a disciplina");
  }
  const trimmed = String(name).trim();
  if (await db.subjects.where("name").equals(trimmed).first()) {
    throw apiError(409, "Disciplina já existente");
  }
  const id = await db.subjects.add({
    name: trimmed,
    icon: icon || "📘",
    color: color || "#6366f1",
  });
  return db.subjects.get(id);
}

export async function updateSubject(id, body = {}) {
  const subject = await db.subjects.get(id);
  if (!subject) throw apiError(404, "Disciplina não encontrada");

  const data = {};
  if (body.name !== undefined) {
    const trimmed = String(body.name).trim();
    const dup = await db.subjects.where("name").equals(trimmed).first();
    if (dup && dup.id !== id) throw apiError(409, "Disciplina já existente");
    data.name = trimmed;
  }
  if (body.icon !== undefined) data.icon = body.icon;
  if (body.color !== undefined) data.color = body.color;

  await db.subjects.update(id, data);
  return db.subjects.get(id);
}

export async function deleteSubject(id) {
  const subject = await db.subjects.get(id);
  if (!subject) throw apiError(404, "Disciplina não encontrada");

  const trails = await db.trails.where("subjectId").equals(id).count();
  if (trails > 0) {
    throw apiError(400, "Exclua antes as trilhas desta disciplina");
  }

  const topics = await db.topics.where("subjectId").equals(id).toArray();
  const topicIds = topics.map((t) => t.id);
  const questions = (await db.questions.toArray()).filter((q) =>
    topicIds.includes(q.topicId)
  );
  const questionIds = questions.map((q) => q.id);

  await db.transaction(
    "rw",
    db.subjects,
    db.topics,
    db.questions,
    db.options,
    db.stepQuestions,
    db.attempts,
    async () => {
      await db.stepQuestions
        .where("questionId")
        .anyOf(questionIds)
        .delete();
      await db.options.where("questionId").anyOf(questionIds).delete();
      await db.attempts.where("questionId").anyOf(questionIds).delete();
      await db.questions.where("topicId").anyOf(topicIds).delete();
      await db.topics.where("subjectId").equals(id).delete();
      await db.subjects.delete(id);
    }
  );

  return { message: "Disciplina excluída" };
}

export async function createTopic(body = {}) {
  const { name, subjectId } = body;
  if (!name || !subjectId) throw apiError(400, "Informe nome e disciplina");
  if (!(await db.subjects.get(Number(subjectId)))) {
    throw apiError(400, "Disciplina inválida");
  }
  const trimmed = String(name).trim();
  const dup = await db.topics
    .filter((t) => t.subjectId === Number(subjectId) && t.name === trimmed)
    .first();
  if (dup) throw apiError(409, "Assunto já existente nesta disciplina");

  const id = await db.topics.add({ name: trimmed, subjectId: Number(subjectId) });
  return db.topics.get(id);
}

export async function updateTopic(id, body = {}) {
  const topic = await db.topics.get(id);
  if (!topic) throw apiError(404, "Assunto não encontrado");
  const trimmed = String(body.name || "").trim();

  const dup = await db.topics
    .filter((t) => t.subjectId === topic.subjectId && t.name === trimmed && t.id !== id)
    .first();
  if (dup) throw apiError(409, "Assunto já existente");

  await db.topics.update(id, { name: trimmed });
  return db.topics.get(id);
}

export async function deleteTopic(id) {
  const topic = await db.topics.get(id);
  if (!topic) throw apiError(404, "Assunto não encontrado");

  const questions = (await db.questions.toArray()).filter(
    (q) => q.topicId === id
  );
  const questionIds = questions.map((q) => q.id);

  await db.transaction(
    "rw",
    db.topics,
    db.questions,
    db.options,
    db.stepQuestions,
    db.attempts,
    async () => {
      await db.stepQuestions.where("questionId").anyOf(questionIds).delete();
      await db.options.where("questionId").anyOf(questionIds).delete();
      await db.attempts.where("questionId").anyOf(questionIds).delete();
      await db.questions.where("topicId").equals(id).delete();
      await db.topics.delete(id);
    }
  );

  return { message: "Assunto excluído" };
}

/* -------------------------------- Questões ----------------------------- */

export async function listQuestions(query = {}) {
  const { subjectId, topicId, difficulty, search } = query;

  let questions = await db.questions.toArray();
  const topics = await db.topics.toArray();
  const subjects = await db.subjects.toArray();
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  if (topicId) questions = questions.filter((q) => q.topicId === Number(topicId));
  else if (subjectId) {
    const ids = new Set(
      topics.filter((t) => t.subjectId === Number(subjectId)).map((t) => t.id)
    );
    questions = questions.filter((q) => ids.has(q.topicId));
  }
  if (difficulty && ["facil", "media", "dificil"].includes(difficulty)) {
    questions = questions.filter((q) => q.difficulty === difficulty);
  }
  if (search) {
    const term = String(search).toLowerCase();
    questions = questions.filter((q) => q.statement.toLowerCase().includes(term));
  }
  questions.sort((a, b) => a.id - b.id);

  const [allOptions, attempts] = await Promise.all([
    db.options.toArray(),
    db.attempts.toArray(),
  ]);
  const optionsByQuestion = new Map();
  for (const o of allOptions) {
    if (!optionsByQuestion.has(o.questionId))
      optionsByQuestion.set(o.questionId, []);
    optionsByQuestion.get(o.questionId).push(o);
  }

  return questions.map((q) => {
    const topic = topicById.get(q.topicId);
    const subject = topic ? subjectById.get(topic.subjectId) : null;
    const options = (optionsByQuestion.get(q.id) || []).sort((a, b) => a.id - b.id);
    return {
      id: q.id,
      statement: q.statement,
      explanation: q.explanation,
      difficulty: q.difficulty,
      grade: q.grade,
      topicId: q.topicId,
      topic: topic ? { id: topic.id, name: topic.name } : { id: null, name: "" },
      subject: subject
        ? { id: subject.id, name: subject.name }
        : { id: null, name: "" },
      attempts: attempts.filter((a) => a.questionId === q.id).length,
      options: options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
      })),
    };
  });
}

function validateQuestionPayload(body) {
  const errors = {};
  if (!body.statement || String(body.statement).trim().length < 10)
    errors.statement = "Enunciado muito curto";
  if (!body.explanation || String(body.explanation).trim().length < 5)
    errors.explanation = "Informe uma explicação";
  if (!body.topicId) errors.topicId = "Selecione o assunto";
  if (!["facil", "media", "dificil"].includes(body.difficulty))
    errors.difficulty = "Dificuldade inválida";

  const options = Array.isArray(body.options) ? body.options : [];
  if (options.length < 2 || options.length > 6)
    errors.options = "A questão deve ter entre 2 e 6 alternativas";
  else if (options.filter((o) => o && String(o.text || "").trim()).length !== options.length)
    errors.options = "Todas as alternativas precisam de texto";
  else if (options.filter((o) => o.isCorrect).length !== 1)
    errors.options = "Marque exatamente uma alternativa como correta";

  return errors;
}

export async function createQuestion(body = {}) {
  const errors = validateQuestionPayload(body);
  if (Object.keys(errors).length > 0) {
    throw apiError(400, "Dados inválidos", errors);
  }
  if (!(await db.topics.get(Number(body.topicId)))) {
    throw apiError(400, "Assunto inválido");
  }

  const id = await db.questions.add({
    statement: String(body.statement).trim(),
    explanation: String(body.explanation).trim(),
    difficulty: body.difficulty,
    grade: body.grade || "Ensino Médio",
    topicId: Number(body.topicId),
    createdAt: new Date(),
  });
  await db.options.bulkAdd(
    body.options.map((o) => ({
      text: String(o.text).trim(),
      isCorrect: Boolean(o.isCorrect),
      questionId: id,
    }))
  );
  return db.questions.get(id);
}

export async function updateQuestion(id, body = {}) {
  const question = await db.questions.get(id);
  if (!question) throw apiError(404, "Questão não encontrada");

  const errors = validateQuestionPayload(body);
  if (Object.keys(errors).length > 0) {
    throw apiError(400, "Dados inválidos", errors);
  }
  if (!(await db.topics.get(Number(body.topicId)))) {
    throw apiError(400, "Assunto inválido");
  }

  await db.transaction("rw", db.questions, db.options, async () => {
    await db.questions.update(id, {
      statement: String(body.statement).trim(),
      explanation: String(body.explanation).trim(),
      difficulty: body.difficulty,
      grade: body.grade || "Ensino Médio",
      topicId: Number(body.topicId),
    });
    await db.options.where("questionId").equals(id).delete();
    await db.options.bulkAdd(
      body.options.map((o) => ({
        text: String(o.text).trim(),
        isCorrect: Boolean(o.isCorrect),
        questionId: id,
      }))
    );
  });

  return { id, updated: true };
}

export async function deleteQuestion(id) {
  if (!(await db.questions.get(id))) {
    throw apiError(404, "Questão não encontrada");
  }
  await db.transaction(
    "rw",
    db.questions,
    db.options,
    db.stepQuestions,
    db.attempts,
    async () => {
      await db.stepQuestions.where("questionId").equals(id).delete();
      await db.attempts.where("questionId").equals(id).delete();
      await db.options.where("questionId").equals(id).delete();
      await db.questions.delete(id);
    }
  );
  return { message: "Questão excluída" };
}

/* -------------------------------- Trilhas ------------------------------ */

export async function listTrailsAdmin() {
  const trails = (await db.trails.toArray()).sort(
    (a, b) => a.order - b.order || a.id - b.id
  );
  const [subjects, steps, links, completions] = await Promise.all([
    db.subjects.toArray(),
    db.trailSteps.toArray(),
    db.stepQuestions.toArray(),
    db.trailCompletions.toArray(),
  ]);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  return trails.map((t) => {
    const ownSteps = steps
      .filter((s) => s.trailId === t.id)
      .sort((a, b) => a.order - b.order);
    const subject = subjectById.get(t.subjectId);
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      icon: t.icon,
      order: t.order,
      subject: subject
        ? { id: subject.id, name: subject.name }
        : { id: null, name: "" },
      completions: completions.filter((c) => c.trailId === t.id).length,
      steps: ownSteps.map((s) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        questionIds: links
          .filter((l) => l.stepId === s.id)
          .map((l) => l.questionId),
      })),
    };
  });
}

function validateTrailPayload(body) {
  const errors = {};
  if (!body.title || String(body.title).trim().length < 3)
    errors.title = "Título muito curto";
  if (!body.description || String(body.description).trim().length < 5)
    errors.description = "Informe uma descrição";
  if (!body.subjectId) errors.subjectId = "Selecione a disciplina";

  const steps = Array.isArray(body.steps) ? body.steps : [];
  if (steps.length === 0) errors.steps = "Adicione ao menos uma etapa";
  else if (steps.some((s) => !s.title || !Array.isArray(s.questionIds) || s.questionIds.length === 0))
    errors.steps = "Cada etapa precisa de um título e ao menos uma questão";
  else if (steps.flatMap((s) => s.questionIds).some((id) => !Number.isInteger(Number(id))))
    errors.steps = "Lista de questões inválida";

  return errors;
}

async function writeSteps(trailId, steps) {
  let order = 1;
  for (const step of steps) {
    const stepId = await db.trailSteps.add({
      trailId,
      order: order++,
      title: String(step.title).trim(),
    });
    await db.stepQuestions.bulkPut(
      step.questionIds.map((qid) => ({
        stepId,
        questionId: Number(qid),
      }))
    );
  }
}

export async function createTrail(body = {}) {
  const errors = validateTrailPayload(body);
  if (Object.keys(errors).length > 0) {
    throw apiError(400, "Dados inválidos", errors);
  }
  if (!(await db.subjects.get(Number(body.subjectId)))) {
    throw apiError(400, "Disciplina ou questão inválida");
  }

  const trailId = await db.trails.add({
    title: String(body.title).trim(),
    description: String(body.description).trim(),
    icon: body.icon || "🛤️",
    subjectId: Number(body.subjectId),
    order: (await db.trails.count()) + 1,
  });
  await writeSteps(trailId, body.steps);
  return db.trails.get(trailId);
}

export async function updateTrail(id, body = {}) {
  const existing = await db.trails.get(id);
  if (!existing) throw apiError(404, "Trilha não encontrada");

  const errors = validateTrailPayload(body);
  if (Object.keys(errors).length > 0) {
    throw apiError(400, "Dados inválidos", errors);
  }
  if (!(await db.subjects.get(Number(body.subjectId)))) {
    throw apiError(400, "Disciplina ou questão inválida");
  }

  const oldSteps = await db.trailSteps.where("trailId").equals(id).toArray();

  await db.transaction(
    "rw",
    db.trails,
    db.trailSteps,
    db.stepQuestions,
    db.stepCompletions,
    async () => {
      await db.trails.update(id, {
        title: String(body.title).trim(),
        description: String(body.description).trim(),
        icon: body.icon || existing.icon,
        subjectId: Number(body.subjectId),
        ...(body.order !== undefined ? { order: Number(body.order) } : {}),
      });

      // Recria as etapas (apaga conclusões antigas das etapas removidas)
      const oldIds = oldSteps.map((s) => s.id);
      await db.stepCompletions.where("stepId").anyOf(oldIds).delete();
      await db.stepQuestions.where("stepId").anyOf(oldIds).delete();
      await db.trailSteps.where("trailId").equals(id).delete();

      await writeSteps(id, body.steps);
    }
  );

  return { id, updated: true };
}

export async function deleteTrail(id) {
  if (!(await db.trails.get(id))) throw apiError(404, "Trilha não encontrada");

  const steps = await db.trailSteps.where("trailId").equals(id).toArray();
  const stepIds = steps.map((s) => s.id);

  await db.transaction(
    "rw",
    db.trails,
    db.trailSteps,
    db.stepQuestions,
    db.stepCompletions,
    db.trailCompletions,
    async () => {
      await db.stepQuestions.where("stepId").anyOf(stepIds).delete();
      await db.stepCompletions.where("stepId").anyOf(stepIds).delete();
      await db.trailSteps.where("trailId").equals(id).delete();
      await db.trailCompletions.where("trailId").equals(id).delete();
      await db.trails.delete(id);
    }
  );

  return { message: "Trilha excluída" };
}
