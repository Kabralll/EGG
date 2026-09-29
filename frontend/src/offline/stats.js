import { db, allAttemptsOf } from "./db";
import { levelProgress, levelFromXp } from "./gamification";
import { toDateKey, startOfWeek } from "./date";

/*
  Estatísticas, evolução e recomendações — tudo calculado sobre dados locais.
  Port direto de backend/src/services/statsService.js.
*/

/** Carrega o relacionamento question → topic → subject de uma vez só. */
async function contentIndex() {
  const [questions, topics, subjects] = await Promise.all([
    db.questions.toArray(),
    db.topics.toArray(),
    db.subjects.toArray(),
  ]);
  return {
    questionById: new Map(questions.map((q) => [q.id, q])),
    topicById: new Map(topics.map((t) => [t.id, t])),
    subjects,
  };
}

export async function buildStats(userId) {
  const [attempts, idx] = await Promise.all([
    allAttemptsOf(userId),
    contentIndex(),
  ]);
  const { questionById, topicById, subjects } = idx;

  const total = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;

  // Agregado por disciplina
  const bySubject = new Map();
  for (const attempt of attempts) {
    const question = questionById.get(attempt.questionId);
    const topic = question ? topicById.get(question.topicId) : null;
    const subject = topic
      ? subjects.find((s) => s.id === topic.subjectId)
      : null;
    if (!subject) continue;

    if (!bySubject.has(subject.id)) {
      bySubject.set(subject.id, {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        color: subject.color,
        total: 0,
        correct: 0,
      });
    }
    const entry = bySubject.get(subject.id);
    entry.total += 1;
    if (attempt.isCorrect) entry.correct += 1;
  }

  const subjectList = [...bySubject.values()]
    .map((s) => ({ ...s, accuracy: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => b.total - a.total);

  // Evolução: últimos 14 dias de XP
  const transactions = await db.xpTransactions.where("userId").equals(userId).toArray();
  const from = daysAgo(13);
  const recent = transactions.filter((t) => t.createdAt >= from);

  const days = [];
  const dayMap = new Map();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    const entry = {
      day: key,
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      xp: 0,
    };
    dayMap.set(key, entry);
    days.push(entry);
  }
  for (const t of recent) {
    const entry = dayMap.get(toDateKey(t.createdAt));
    if (entry) entry.xp += t.amount;
  }

  const [trailsCompleted, achievements, challengesCompleted, user] =
    await Promise.all([
      db.trailCompletions.where("userId").equals(userId).count(),
      db.userAchievements.where("userId").equals(userId).count(),
      db.challengeCompletions.where("userId").equals(userId).count(),
      db.users.get(userId),
    ]);

  const allSubjects = subjects
    .map((s) => ({ id: s.id, name: s.name, icon: s.icon, color: s.color }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const xp = user ? user.xp : 0;

  return {
    totalQuestions: total,
    correctAnswers: correct,
    wrongAnswers: total - correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    subjectsStudied: subjectList.length,
    subjects: subjectList,
    allSubjects,
    evolution: days,
    trailsCompleted,
    achievements,
    challengesCompleted,
    xp,
    ...levelProgress(xp),
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/*
  Recomendação baseada em desempenho real:
  - pior disciplina com amostra mínima → "pratique X"
  - melhor disciplina → "seu ponto forte"
*/
export function buildRecommendation(stats) {
  const withSample = stats.subjects.filter((s) => s.total >= 3);
  const studiedIds = new Set(stats.subjects.map((s) => s.id));
  const untested = (stats.allSubjects || []).filter((s) => !studiedIds.has(s.id));

  if (withSample.length === 0) {
    const first = untested[0] || stats.allSubjects?.[0] || null;
    return {
      type: "start",
      title: first ? `Comece por ${first.name}` : "Comece a estudar agora",
      message:
        stats.totalQuestions === 0
          ? "Você ainda não respondeu nenhuma questão. Responda algumas para receber XP e descobrir seus pontos fortes."
          : "Continue praticando para que a plataforma possa analisar seu desempenho por disciplina.",
      subject: first,
    };
  }

  const sorted = [...withSample].sort((a, b) => a.accuracy - b.accuracy);
  const weakest = sorted[0];
  const strongest = [...withSample].sort((a, b) => b.accuracy - a.accuracy)[0];

  // Desempenho fraco em alguma disciplina ⇒ recomenda praticá-la
  if (weakest.accuracy < 70) {
    return {
      type: "practice",
      title: `Que tal praticar ${weakest.name}?`,
      message: `Seu aproveitamento em ${weakest.name} é de ${weakest.accuracy}%. Uma sessão de questões hoje ajuda a virar o jogo.`,
      subject: {
        id: weakest.id,
        name: weakest.name,
        icon: weakest.icon,
        color: weakest.color,
      },
      strong: { name: strongest.name, accuracy: strongest.accuracy },
    };
  }

  // Tudo bem? Convida a explorar disciplinas ainda não praticadas
  if (untested.length > 0) {
    return {
      type: "explore",
      title: `Você ainda não praticou ${untested[0].name}`,
      message: `${untested[0].name} ainda está inédita para você. Responda algumas questões para ampliar seu desempenho e ganhar XP.`,
      subject: untested[0],
      strong: { name: strongest.name, accuracy: strongest.accuracy },
    };
  }

  return {
    type: "practice",
    title: `Mantenha o ritmo em ${weakest.name}`,
    message: `${weakest.name} tem o menor aproveitamento entre as disciplinas que você pratica (${weakest.accuracy}%). Reforce para chegar a 100%.`,
    subject: {
      id: weakest.id,
      name: weakest.name,
      icon: weakest.icon,
      color: weakest.color,
    },
    strong: { name: strongest.name, accuracy: strongest.accuracy },
  };
}

export async function getUserStatsFull(userId) {
  const stats = await buildStats(userId);
  return { ...stats, recommendation: buildRecommendation(stats) };
}

/* ------------------------------ Ranking ------------------------------ */

export async function getRanking(scope = "general") {
  const users = (await db.users.toArray())
    .filter((u) => u.role === "STUDENT")
    .map((u) => ({
      id: u.id,
      nickname: u.nickname,
      name: u.name,
      xp: u.xp,
      streak: u.streak,
    }));

  let ranked;
  if (scope === "weekly") {
    const weekStart = startOfWeek();
    const transactions = await db.xpTransactions.toArray();
    const weeklyXp = new Map();
    for (const t of transactions) {
      if (t.createdAt < weekStart) continue;
      weeklyXp.set(t.userId, (weeklyXp.get(t.userId) || 0) + t.amount);
    }
    ranked = users
      .map((u) => ({ ...u, weeklyXp: weeklyXp.get(u.id) || 0 }))
      .filter((u) => u.weeklyXp > 0)
      .sort((a, b) => b.weeklyXp - a.weeklyXp);
  } else {
    ranked = [...users].sort((a, b) => b.xp - a.xp);
  }

  return ranked.map((u, i) => ({
    position: i + 1,
    id: u.id,
    nickname: u.nickname,
    level: levelFromXp(u.xp),
    xp: u.xp,
    weeklyXp: u.weeklyXp ?? null,
    streak: u.streak,
  }));
}

export async function getPositionOf(userId, scope = "general") {
  const ranking = await getRanking(scope);
  const mine = ranking.find((r) => r.id === userId);
  return { position: mine ? mine.position : null, total: ranking.length };
}
