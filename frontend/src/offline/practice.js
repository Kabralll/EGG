import { db, allAttemptsOf } from "./db";
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
} from "./gamification";
import { toDateKey } from "./date";

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function questionPayload(q, answeredSet) {
  const topic = await db.topics.get(q.topicId);
  const subject = topic ? await db.subjects.get(topic.subjectId) : null;
  const options = await db.options.where("questionId").equals(q.id).toArray();

  return {
    id: q.id,
    statement: q.statement,
    difficulty: q.difficulty,
    grade: q.grade,
    topic: topic ? topic.name : "",
    subject: subject ? subject.name : "",
    subjectColor: subject ? subject.color : "#6366f1",
    alreadyAnswered: answeredSet.has(q.id),
    options: shuffle(options.map((o) => ({ id: o.id, text: o.text }))),
  };
}

/*
  Monta uma sessão de prática NUNCA expondo resposta correta ou explicação.
  Preferimos questões ainda não respondidas; se faltarem, completa com repetição.
*/
export async function getPracticeQuestions(userId, filters = {}) {
  const { subjectId, topicId, difficulty, stepId, limit = 10 } = filters;
  const max = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const attempts = await allAttemptsOf(userId);
  const answeredSet = new Set(attempts.map((a) => a.questionId));

  if (stepId) {
    const step = await db.trailSteps.get(Number(stepId));
    if (!step) return null;

    const trail = await db.trails.get(step.trailId);

    // Desbloqueio progressivo: a etapa 1 ou etapas após a conclusão da anterior
    const previous = await db.trailSteps
      .where("[trailId+order]")
      .equals([step.trailId, step.order - 1])
      .first();
    if (previous) {
      const done = await db.stepCompletions
        .where("[userId+stepId]")
        .equals([userId, previous.id])
        .first();
      if (!done) return { locked: true, step };
    }

    const links = await db.stepQuestions
      .where("stepId")
      .equals(step.id)
      .toArray();
    const questionIds = links.map((l) => l.questionId);

    const questions = [];
    for (const id of questionIds) {
      const q = await db.questions.get(id);
      if (q) questions.push(q);
    }

    const payload = [];
    for (const q of questions) {
      payload.push(await questionPayload(q, answeredSet));
    }

    return {
      locked: false,
      context: {
        type: "step",
        stepId: step.id,
        stepTitle: step.title,
        trailId: step.trailId,
        trailTitle: trail ? trail.title : "",
        trailIcon: trail ? trail.icon : "🛤️",
        total: questionIds.length,
      },
      questions: payload,
    };
  }

  // Filtros (iguais ao `where` do Prisma: topicId e difficulty são independentes)
  let all = await db.questions.toArray();
  if (topicId) all = all.filter((q) => q.topicId === Number(topicId));
  if (difficulty) all = all.filter((q) => q.difficulty === difficulty);

  if (!topicId && subjectId) {
    const topics = await db.topics
      .where("subjectId")
      .equals(Number(subjectId))
      .toArray();
    const topicIds = new Set(topics.map((t) => t.id));
    all = all.filter((q) => topicIds.has(q.topicId));
  }

  if (all.length === 0) return { context: null, questions: [] };

  const unanswered = shuffle(
    all.filter((q) => !answeredSet.has(q.id)).map((q) => q.id)
  );
  let selected = unanswered.slice(0, max);
  if (selected.length < max) {
    const answeredMatches = shuffle(
      all.filter((q) => answeredSet.has(q.id)).map((q) => q.id)
    ).slice(0, max - selected.length);
    selected = selected.concat(answeredMatches);
  }

  if (selected.length === 0) return { context: null, questions: [] };

  const byId = new Map(all.map((q) => [q.id, q]));
  const payload = [];
  for (const id of selected) {
    const q = byId.get(id);
    if (q) payload.push(await questionPayload(q, answeredSet));
  }

  return { context: null, questions: payload };
}

/*
  Responde uma questão: valida localmente, concede XP apenas na primeira
  tentativa e dispara streak, desafio diário, etapas, trilhas e conquistas.
*/
export async function answerQuestion(userId, questionId, optionId) {
  const question = await db.questions.get(questionId);
  if (!question) return { error: "Questão não encontrada", status: 404 };

  const options = await db.options.where("questionId").equals(question.id).toArray();
  const option = options.find((o) => o.id === optionId);
  if (!option) return { error: "Alternativa inválida", status: 400 };

  const user = await db.users.get(userId);
  if (!user) return { error: "Usuário não encontrado", status: 404 };

  const existing = await db.attempts
    .where("[userId+questionId]")
    .equals([userId, questionId])
    .first();

  const isCorrect = option.isCorrect;
  const correctOption = options.find((o) => o.isCorrect);
  const levelBefore = levelProgress(user.xp).level;
  const dayKey = toDateKey();

  const events = {
    xpBreakdown: { base: 0, trail: 0, challenge: 0 },
    newAchievements: [],
    stepCompleted: null,
    trailCompleted: null,
    challengeCompleted: false,
  };

  let repeat = false;

  if (existing) {
    // Repetição para estudo: feedback da seleção atual, sem XP e sem estatísticas
    repeat = true;
  } else {
    const baseXp = isCorrect
      ? XP_CORRECT[question.difficulty] ?? 20
      : XP_WRONG;

    const TX_TABLES = [
      db.attempts,
      db.users,
      db.xpTransactions,
      db.dailyChallenges,
      db.challengeCompletions,
      db.stepCompletions,
      db.trailCompletions,
      db.trailSteps,
      db.stepQuestions,
      db.trails,
      db.userAchievements,
      db.achievements,
      db.questions,
      db.options,
      db.topics,
      db.subjects,
    ];

    // Criado FORA da transação: se houver disputa pelo índice único `day`,
    // só o desafio falha — a resposta da questão não é perdida.
    const challenge = await getOrCreateDailyChallenge(dayKey);

    await db.transaction("rw", TX_TABLES, async () => {
      const topic = await db.topics.get(question.topicId);

      await db.attempts.add({
        userId,
        questionId,
        optionId,
        isCorrect,
        xpAwarded: baseXp,
        createdAt: new Date(),
      });

      const nextStreak = computeStreak(user.streak, user.lastActiveDay, dayKey);

      await db.users.update(userId, {
        xp: user.xp + baseXp,
        streak: nextStreak.streak,
        lastActiveDay: nextStreak.lastActiveDay,
      });
      await db.xpTransactions.add({
        userId,
        amount: baseXp,
        reason: isCorrect ? "question_correct" : "question_wrong",
        detail: topic ? topic.name : null,
        createdAt: new Date(),
      });
      events.xpBreakdown.base = baseXp;

      /* Desafio diário */
      const progress = await rawChallengeProgress(challenge, userId, dayKey);
      if (progress >= challenge.target) {
        const done = await db.challengeCompletions
          .where("[userId+challengeId]")
          .equals([userId, challenge.id])
          .first();
        if (!done) {
          await db.challengeCompletions.add({
            userId,
            challengeId: challenge.id,
            xpAwarded: challenge.xpReward,
            completedAt: new Date(),
          });
          const fresh = await db.users.get(userId);
          await db.users.update(userId, { xp: fresh.xp + challenge.xpReward });
          await db.xpTransactions.add({
            userId,
            amount: challenge.xpReward,
            reason: "daily_challenge",
            detail: challenge.title,
            createdAt: new Date(),
          });
          events.challengeCompleted = true;
          events.xpBreakdown.challenge = challenge.xpReward;
        }
      }

      /* Etapas e trilhas que contêm esta questão */
      const links = await db.stepQuestions
        .where("questionId")
        .equals(questionId)
        .toArray();

      const evaluatedTrails = new Set();
      for (const link of links) {
        const step = await db.trailSteps.get(link.stepId);
        if (!step) continue;

        const stepLinks = await db.stepQuestions
          .where("stepId")
          .equals(step.id)
          .toArray();
        const stepQuestionIds = stepLinks.map((l) => l.questionId);

        const answeredCount = (
          await Promise.all(
            stepQuestionIds.map((qid) =>
              db.attempts
                .where("[userId+questionId]")
                .equals([userId, qid])
                .first()
            )
          )
        ).filter(Boolean).length;

        if (answeredCount < stepQuestionIds.length) continue;

        const stepDone = await db.stepCompletions
          .where("[userId+stepId]")
          .equals([userId, step.id])
          .first();
        if (!stepDone) {
          await db.stepCompletions.add({
            userId,
            stepId: step.id,
            completedAt: new Date(),
          });
          const trail = await db.trails.get(step.trailId);
          events.stepCompleted = {
            stepId: step.id,
            stepTitle: step.title,
            trailId: step.trailId,
            trailTitle: trail ? trail.title : "",
            trailIcon: trail ? trail.icon : "🛤️",
          };
        }

        if (evaluatedTrails.has(step.trailId)) continue;
        evaluatedTrails.add(step.trailId);

        const allSteps = await db.trailSteps
          .where("trailId")
          .equals(step.trailId)
          .toArray();
        const doneSteps = (
          await Promise.all(
            allSteps.map((s) =>
              db.stepCompletions
                .where("[userId+stepId]")
                .equals([userId, s.id])
                .first()
            )
          )
        ).filter(Boolean).length;

        if (doneSteps < allSteps.length) continue;

        const trailDone = await db.trailCompletions
          .where("[userId+trailId]")
          .equals([userId, step.trailId])
          .first();
        if (!trailDone) {
          const trail = await db.trails.get(step.trailId);
          await db.trailCompletions.add({
            userId,
            trailId: step.trailId,
            xpAwarded: XP_TRAIL_COMPLETE,
            completedAt: new Date(),
          });
          const fresh = await db.users.get(userId);
          await db.users.update(userId, { xp: fresh.xp + XP_TRAIL_COMPLETE });
          await db.xpTransactions.add({
            userId,
            amount: XP_TRAIL_COMPLETE,
            reason: "trail_complete",
            detail: trail ? trail.title : null,
            createdAt: new Date(),
          });
          events.xpBreakdown.trail = XP_TRAIL_COMPLETE;
          events.trailCompleted = {
            trailId: step.trailId,
            title: trail ? trail.title : "",
            icon: trail ? trail.icon : "🛤️",
            xp: XP_TRAIL_COMPLETE,
          };
        }
      }

      /* Conquistas — avaliadas com todo o XP já concedido */
      const fresh = await db.users.get(userId);
      events.newAchievements = await evaluateAchievements(userId, fresh);
    });

    const after = await db.users.get(userId);
    user.xp = after.xp;
    user.streak = after.streak;
  }

  const freshUser = repeat ? await db.users.get(userId) : user;
  const progress = levelProgress(freshUser.xp);
  const dailyChallenge = await getDailyChallengeState(userId, dayKey);

  return {
    repeat,
    isCorrect,
    correctOptionId: correctOption.id,
    correctOptionText: correctOption.text,
    explanation: question.explanation,
    xpAwarded:
      events.xpBreakdown.base +
      events.xpBreakdown.trail +
      events.xpBreakdown.challenge,
    xpBreakdown: events.xpBreakdown,
    levelUp: progress.level > levelBefore,
    progress,
    streak: freshUser.streak,
    newAchievements: events.newAchievements,
    stepCompleted: events.stepCompleted,
    trailCompleted: events.trailCompleted,
    challengeCompleted: events.challengeCompleted,
    dailyChallenge,
  };
}
