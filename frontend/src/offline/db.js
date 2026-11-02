import Dexie from "dexie";

/*
  Banco de dados 100% local (IndexedDB via Dexie).

  Por que Dexie e não @capacitor-community/sqlite:
  - é JavaScript puro → funciona igual no navegador de teste e no WebView do
    app, sem plugin nativo, sem `cap sync` de plugin e sem Android Studio para
    validar;
  - o volume de dados é pequeno (centenas de questões no seed) — nada justifica
    a complexidade de SQLite nativo;
  - sobrevive a reload/fechamento do app, que é o que importa num app offline.

  A estrutura espelha os modelos do Prisma (backend/prisma/schema.prisma).

  v2: adiciona os índices `questionId` (attempts), `stepId` (stepCompletions),
  `trailId` (trailCompletions) e `threshold` (achievements) — todos usados por
  `.where()`/`.orderBy()` e que, sem índice, derrubavam a página com
  "KeyPath ... is not indexed".

  v3: monetização. `subscriptions` (plano/validade), `entitlements`
  (desbloqueios avulsos), `usageDays` (corações por dia), `weeklyClaims`
  (desafio semanal PRO), `streakFreezes` (congelamentos usados no mês) e
  `paywallEvents` (funil do paywall).

  v4: comunidade. `friendships` (pedidos/amizades), `studyGroups` (grupos),
  `groupMembers` (integrantes) e `groupInvites` (convites para grupos).
*/

export const db = new Dexie("egg_offline");

db.version(2).stores({
  // conteúdo (populado pelo seed no primeiro acesso)
  subjects: "++id, &name",
  topics: "++id, subjectId, [subjectId+name]",
  questions: "++id, topicId, difficulty, createdAt",
  options: "++id, questionId",
  achievements: "++id, &code, metric, threshold",
  trails: "++id, subjectId, order",
  trailSteps: "++id, trailId, [trailId+order]",
  stepQuestions: "[stepId+questionId], stepId, questionId",

  // contas e progresso (ficam no aparelho)
  users: "++id, &email, &nickname, role, xp",
  attempts: "++id, userId, questionId, [userId+questionId], createdAt",
  xpTransactions: "++id, userId, createdAt",
  stepCompletions: "++id, userId, stepId, [userId+stepId]",
  trailCompletions: "++id, userId, trailId, [userId+trailId]",
  userAchievements: "++id, userId, [userId+achievementId]",
  dailyChallenges: "++id, &day",
  challengeCompletions: "++id, userId, [userId+challengeId]",

  // controle interno (flag de seed, versão, etc.)
  meta: "key",
});

db.version(3).stores({
  // conteúdo
  subjects: "++id, &name",
  topics: "++id, subjectId, [subjectId+name]",
  questions: "++id, topicId, difficulty, createdAt",
  options: "++id, questionId",
  achievements: "++id, &code, metric, threshold",
  trails: "++id, subjectId, order",
  trailSteps: "++id, trailId, [trailId+order]",
  stepQuestions: "[stepId+questionId], stepId, questionId",

  // contas e progresso
  users: "++id, &email, &nickname, role, xp",
  attempts: "++id, userId, questionId, [userId+questionId], createdAt",
  xpTransactions: "++id, userId, createdAt",
  stepCompletions: "++id, userId, stepId, [userId+stepId]",
  trailCompletions: "++id, userId, trailId, [userId+trailId]",
  userAchievements: "++id, userId, [userId+achievementId]",
  dailyChallenges: "++id, &day",
  challengeCompletions: "++id, userId, [userId+challengeId]",

  // monetização
  subscriptions: "++id, &userId, status, planId, currentPeriodEnd",
  entitlements: "++id, userId, [userId+feature]",
  usageDays: "++id, userId, &[userId+day]",
  weeklyClaims: "++id, userId, &[userId+weekKey]",
  streakFreezes: "++id, userId, [userId+monthKey]",
  paywallEvents: "++id, userId, event, createdAt",

  // controle interno
  meta: "key",
});

db.version(4).stores({
  // conteúdo
  subjects: "++id, &name",
  topics: "++id, subjectId, [subjectId+name]",
  questions: "++id, topicId, difficulty, createdAt",
  options: "++id, questionId",
  achievements: "++id, &code, metric, threshold",
  trails: "++id, subjectId, order",
  trailSteps: "++id, trailId, [trailId+order]",
  stepQuestions: "[stepId+questionId], stepId, questionId",

  // contas e progresso
  users: "++id, &email, &nickname, role, xp",
  attempts: "++id, userId, questionId, [userId+questionId], createdAt",
  xpTransactions: "++id, userId, createdAt",
  stepCompletions: "++id, userId, stepId, [userId+stepId]",
  trailCompletions: "++id, userId, trailId, [userId+trailId]",
  userAchievements: "++id, userId, [userId+achievementId]",
  dailyChallenges: "++id, &day",
  challengeCompletions: "++id, userId, [userId+challengeId]",

  // monetização
  subscriptions: "++id, &userId, status, planId, currentPeriodEnd",
  entitlements: "++id, userId, [userId+feature]",
  usageDays: "++id, userId, &[userId+day]",
  weeklyClaims: "++id, userId, &[userId+weekKey]",
  streakFreezes: "++id, userId, [userId+monthKey]",
  paywallEvents: "++id, userId, event, createdAt",

  // comunidade
  friendships: "++id, userAId, userBId, requesterId, addresseeId, status, &[userAId+userBId]",
  studyGroups: "++id, ownerId, createdAt",
  groupMembers: "++id, groupId, userId, &[groupId+userId]",
  groupInvites: "++id, groupId, userId, fromUserId, &[groupId+userId]",

  // controle interno
  meta: "key",
});

/* Pequenos helpers usados por vários módulos */

export async function allAttemptsOf(userId) {
  return db.attempts.where("userId").equals(userId).toArray();
}

/** questionId -> subjectId (passa por question → topic → subject). */
export async function questionSubjectMap() {
  const [topics, questions] = await Promise.all([
    db.topics.toArray(),
    db.questions.toArray(),
  ]);
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const map = new Map();
  for (const q of questions) {
    const topic = topicById.get(q.topicId);
    if (topic) map.set(q.id, topic.subjectId);
  }
  return map;
}

/** Dispara um erro com o mesmo formato que a API HTTP devolvia. */
export function apiError(status, message, fields) {
  const error = new Error(message);
  error.status = status;
  if (fields) error.fields = fields;
  return error;
}
