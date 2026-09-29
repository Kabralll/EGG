import { db, allAttemptsOf, questionSubjectMap } from "./db";
import { toDateKey, yesterdayKey } from "./date";

/*
  Núcleo de gamificação do EGG — porta direta de
  backend/src/services/gamificationService.js, agora sobre o banco local.

  Regras (iguais às do servidor):
  - XP só é concedido na PRIMEIRA tentativa de cada questão.
  - O nível é sempre derivado do XP (fonte única de verdade).
  - Streak avança 1 dia quando há atividade em dias consecutivos; reinicia em 1.
  - Desafios diários rotacionam por dia e premiam apenas uma vez por usuário/dia.
*/

export const XP_CORRECT = { facil: 10, media: 20, dificil: 30 };
export const XP_WRONG = 2;
export const XP_TRAIL_COMPLETE = 100;
export const XP_DAILY_CHALLENGE = 50;

/* --------------------------- Nível / XP --------------------------- */

// Nível L exige: 100*(L-1) + 50*(L-1)*(L-2)/2 → 0, 100, 250, 450, 700...
export function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return 100 * (level - 1) + (50 * (level - 1) * (level - 2)) / 2;
}

export function levelFromXp(xp) {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const currentLevelXp = xpRequiredForLevel(level);
  const nextLevelXp = xpRequiredForLevel(level + 1);
  const span = nextLevelXp - currentLevelXp;
  const progress = xp - currentLevelXp;
  return {
    level,
    xp,
    currentLevelXp,
    nextLevelXp,
    progress,
    span,
    percent: span > 0 ? Math.min(100, Math.round((progress / span) * 100)) : 100,
  };
}

export function computeStreak(streak, lastActiveDay, todayKey = toDateKey()) {
  if (lastActiveDay === todayKey) {
    return { streak: Math.max(streak, 1), lastActiveDay: todayKey };
  }
  if (lastActiveDay === yesterdayKey()) {
    return { streak: streak + 1, lastActiveDay: todayKey };
  }
  return { streak: 1, lastActiveDay: todayKey };
}

/* ------------------------- Desafios diários ------------------------- */

function challengeTemplateFor(dayKey) {
  // Rotação determinística: mesma data ⇒ mesmo desafio para todos
  const [y, m, d] = dayKey.split("-").map(Number);
  const seed = Math.floor(Date.UTC(y, m - 1, d) / 86400000);

  const templates = [
    { type: "ANSWER_N", title: "Responda 5 questões hoje", target: 5 },
    { type: "XP_N", title: "Ganhe 100 XP hoje", target: 100 },
    { type: "ANSWER_N_SUBJECT", target: 3 }, // título recebe a disciplina
    { type: "ACCURACY", title: "Acerte 80% em 5 questões hoje", target: 80 },
  ];

  return { ...templates[seed % templates.length], subjectOffset: seed };
}

async function withSubject(challenge) {
  if (!challenge || challenge.subjectId == null) return { ...challenge, subject: null };
  const subject = await db.subjects.get(challenge.subjectId);
  return { ...challenge, subject: subject ? subject.name : null };
}

export async function getOrCreateDailyChallenge(dayKey = toDateKey()) {
  const existing = await db.dailyChallenges.where("day").equals(dayKey).first();
  if (existing) return withSubject(existing);

  const template = challengeTemplateFor(dayKey);

  let subjectId = null;
  let title = template.title;
  if (template.type === "ANSWER_N_SUBJECT") {
    const subjects = await db.subjects.orderBy("id").toArray();
    if (subjects.length > 0) {
      const subject = subjects[template.subjectOffset % subjects.length];
      subjectId = subject.id;
      title = `${template.target} questões de ${subject.name} hoje`;
    }
  }

  let created;
  try {
    const id = await db.dailyChallenges.add({
      day: dayKey,
      type: template.type,
      title,
      target: template.target,
      subjectId,
      xpReward: XP_DAILY_CHALLENGE,
    });
    created = await db.dailyChallenges.get(id);
  } catch (error) {
    // Duas chamadas simultâneas podem disputar o índice único `day`
    // (o StrictMode do React monta os efeitos duas vezes). Não é erro:
    // outro fluxo já criou o desafio — é só relê-lo.
    if (!error || error.name !== "ConstraintError") throw error;
    created = await db.dailyChallenges.where("day").equals(dayKey).first();
    if (!created) throw error;
  }

  return withSubject(created);
}

// Progresso cru (ainda sem considerar a conclusão do próprio usuário)
export async function rawChallengeProgress(challenge, userId, dayKey = toDateKey()) {
  const dayStart = new Date(`${dayKey}T00:00:00`);

  if (challenge.type === "XP_N") {
    const txs = await db.xpTransactions.where("userId").equals(userId).toArray();
    return txs
      .filter((t) => t.createdAt >= dayStart)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  let attempts = (await allAttemptsOf(userId)).filter(
    (a) => a.createdAt >= dayStart
  );

  if (challenge.type === "ANSWER_N_SUBJECT" && challenge.subjectId != null) {
    const map = await questionSubjectMap();
    attempts = attempts.filter(
      (a) => map.get(a.questionId) === challenge.subjectId
    );
  }

  if (challenge.type === "ACCURACY") {
    if (attempts.length < 5) return 0;
    const correct = attempts.filter((a) => a.isCorrect).length;
    return Math.round((correct / attempts.length) * 100);
  }

  return attempts.length; // ANSWER_N | ANSWER_N_SUBJECT
}

export async function getDailyChallengeState(userId, dayKey = toDateKey()) {
  const challenge = await getOrCreateDailyChallenge(dayKey);
  const completion = await db.challengeCompletions
    .where("[userId+challengeId]")
    .equals([userId, challenge.id])
    .first();
  const progress = await rawChallengeProgress(challenge, userId, dayKey);

  return {
    id: challenge.id,
    day: challenge.day,
    type: challenge.type,
    title: challenge.title,
    target: challenge.target,
    xpReward: challenge.xpReward,
    subject: challenge.subject,
    progress,
    percent: Math.min(100, Math.round((progress / challenge.target) * 100)),
    completed: Boolean(completion),
    completedAt: completion ? completion.completedAt : null,
  };
}

/* --------------------------- Conquistas --------------------------- */

export async function evaluateAchievements(userId, user) {
  const attempts = await allAttemptsOf(userId);
  const [trailCompletions, challengeCompletions, achievements, unlocked] =
    await Promise.all([
      db.trailCompletions.where("userId").equals(userId).count(),
      db.challengeCompletions.where("userId").equals(userId).count(),
      db.achievements.toArray(),
      db.userAchievements.where("userId").equals(userId).toArray(),
    ]);

  const metrics = {
    QUESTIONS_ANSWERED: attempts.length,
    CORRECT_ANSWERED: attempts.filter((a) => a.isCorrect).length,
    XP: user.xp,
    STREAK: user.streak,
    TRAILS_COMPLETED: trailCompletions,
    DAILY_CHALLENGES: challengeCompletions,
    LEVEL: levelFromXp(user.xp),
  };

  const unlockedSet = new Set(unlocked.map((u) => u.achievementId));
  const toUnlock = achievements.filter(
    (a) => !unlockedSet.has(a.id) && (metrics[a.metric] ?? 0) >= a.threshold
  );

  if (toUnlock.length > 0) {
    await db.userAchievements.bulkAdd(
      toUnlock.map((a) => ({
        userId,
        achievementId: a.id,
        unlockedAt: new Date(),
      }))
    );
  }

  return toUnlock.map((a) => ({
    code: a.code,
    name: a.name,
    description: a.description,
    icon: a.icon,
  }));
}
