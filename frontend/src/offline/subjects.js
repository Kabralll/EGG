import { db, allAttemptsOf } from "./db";

/*
  Disciplinas — port direto de backend/src/controllers/subjectController.js.
*/

export async function listSubjects(userId) {
  const [subjects, topics, attempts, questions] = await Promise.all([
    db.subjects.orderBy("name").toArray(),
    db.topics.toArray(),
    allAttemptsOf(userId),
    db.questions.toArray(),
  ]);

  const questionsByTopic = new Map();
  for (const q of questions) {
    if (!questionsByTopic.has(q.topicId)) questionsByTopic.set(q.topicId, []);
    questionsByTopic.get(q.topicId).push(q);
  }

  // answered/correct por disciplina, a partir do relacionamento question → topic
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const progress = {};
  for (const a of attempts) {
    const q = questionById.get(a.questionId);
    const topic = q ? topicById.get(q.topicId) : null;
    if (!topic) continue;
    const id = topic.subjectId;
    if (!progress[id]) progress[id] = { answered: 0, correct: 0 };
    progress[id].answered += 1;
    if (a.isCorrect) progress[id].correct += 1;
  }

  return subjects.map((s) => {
    const ownTopics = topics
      .filter((t) => t.subjectId === s.id)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    const totalQuestions = ownTopics.reduce(
      (sum, t) => sum + (questionsByTopic.get(t.id) || []).length,
      0
    );
    const p = progress[s.id] || { answered: 0, correct: 0 };

    return {
      id: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color,
      topicsCount: ownTopics.length,
      totalQuestions,
      answered: p.answered,
      correct: p.correct,
      accuracy: p.answered > 0 ? Math.round((p.correct / p.answered) * 100) : null,
      topics: ownTopics.map((t) => ({ id: t.id, name: t.name })),
    };
  });
}

export async function getSubject(subjectId, userId) {
  const subject = await db.subjects.get(subjectId);
  if (!subject) return null;

  const [topics, attempts, questions] = await Promise.all([
    db.topics.where("subjectId").equals(subjectId).toArray(),
    allAttemptsOf(userId),
    db.questions.toArray(),
  ]);
  topics.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const answeredIds = new Set();
  const correctIds = new Set();
  for (const a of attempts) {
    const q = questionById.get(a.questionId);
    const topic = q ? topicById.get(q.topicId) : null;
    if (!topic) continue;
    answeredIds.add(a.questionId);
    if (a.isCorrect) correctIds.add(a.questionId);
  }

  const questionsByTopic = new Map();
  for (const q of questions) {
    if (!questionsByTopic.has(q.topicId)) questionsByTopic.set(q.topicId, []);
    questionsByTopic.get(q.topicId).push(q);
  }

  const totalQuestions = topics.reduce(
    (sum, t) => sum + (questionsByTopic.get(t.id) || []).length,
    0
  );

  return {
    id: subject.id,
    name: subject.name,
    icon: subject.icon,
    color: subject.color,
    totalQuestions,
    answered: answeredIds.size,
    correct: correctIds.size,
    topics: topics.map((t) => {
      const qs = questionsByTopic.get(t.id) || [];
      return {
        id: t.id,
        name: t.name,
        totalQuestions: qs.length,
        answered: qs.filter((q) => answeredIds.has(q.id)).length,
        correct: qs.filter((q) => correctIds.has(q.id)).length,
      };
    }),
  };
}
