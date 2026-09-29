import { db } from "./db";
import SEED from "../data/seed.json";
import { sha256 } from "./sha256";

// Bumpar força a reimportação do conteúdo na próxima abertura do app.
const SEED_VERSION = 1;

/*
  Conta administrativa local — mesmo par que o seed do backend cria e que a
  tela de login já anuncia ("admin: admin@egg.com / admin123"). Sem ela o
  painel admin ficaria inalcançável no app offline.
*/
async function ensureAdmin() {
  const email = "admin@egg.com";
  const existing = await db.users.where("email").equals(email).first();
  if (existing) return;

  const salt = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await db.users.add({
    name: "Administrador",
    nickname: "admin",
    email,
    password: sha256(`${salt}::admin123`),
    salt,
    role: "ADMIN",
    xp: 0,
    streak: 0,
    lastActiveDay: null,
    createdAt: new Date(),
  });
}

/*
  Popula o banco local com o conteúdo inicial — o mesmo conteúdo que
  backend/prisma/seed.js cria no MySQL (disciplinas, assuntos, questões,
  conquistas e trilhas), extraído para frontend/src/data/seed.json.

  Idempotente: só roda se a flag "seeded" não existir. Os IDs são gerados
  localmente pelo Dexie (`++id`) e as ligações trilha↔etapa↔questão são
  reconstruídas a partir das chaves (`q.key`) do seed.
*/
export async function ensureSeeded() {
  const flag = await db.meta.get("seeded");
  if (flag && flag.value === SEED_VERSION) {
    await ensureAdmin();
    return false;
  }

  await db.transaction(
    "rw",
    db.subjects,
    db.topics,
    db.questions,
    db.options,
    db.achievements,
    db.trails,
    db.trailSteps,
    db.stepQuestions,
    db.meta,
    async () => {
      // Conteúdo novo ⇒ zera só as tabelas de conteúdo (mantém usuários/progresso)
      await db.stepQuestions.clear();
      await db.trailSteps.clear();
      await db.trails.clear();
      await db.options.clear();
      await db.questions.clear();
      await db.topics.clear();
      await db.subjects.clear();
      await db.achievements.clear();

      const questionIds = {}; // key → id local

      for (const subjectData of SEED.subjects) {
        const subjectId = await db.subjects.add({
          name: subjectData.name,
          icon: subjectData.icon,
          color: subjectData.color,
        });

        for (const topicData of subjectData.topics) {
          const topicId = await db.topics.add({
            name: topicData.name,
            subjectId,
          });

          for (const q of topicData.questions) {
            const questionId = await db.questions.add({
              statement: q.statement,
              explanation: q.explanation,
              difficulty: q.difficulty,
              grade: q.grade,
              topicId,
              createdAt: new Date(),
            });
            questionIds[q.key] = questionId;

            await db.options.bulkAdd(
              q.options.map((text, i) => ({
                text,
                isCorrect: i === q.correct,
                questionId,
              }))
            );
          }
        }
      }

      await db.achievements.bulkAdd(
        SEED.achievements.map((a) => ({
          code: a.code,
          name: a.name,
          description: a.description,
          icon: a.icon,
          metric: a.metric,
          threshold: a.threshold,
        }))
      );

      let trailOrder = 1;
      for (const trailData of SEED.trails) {
        const subject = await db.subjects
          .where("name")
          .equals(trailData.subject)
          .first();
        if (!subject) continue;

        const trailId = await db.trails.add({
          title: trailData.title,
          description: trailData.description,
          icon: trailData.icon,
          order: trailOrder++,
          subjectId: subject.id,
        });

        let stepOrder = 1;
        for (const stepData of trailData.steps) {
          const stepId = await db.trailSteps.add({
            trailId,
            order: stepOrder++,
            title: stepData.title,
          });

          const rows = stepData.questions
            .map((key) => questionIds[key])
            .filter(Boolean)
            .map((questionId) => ({ stepId, questionId }));

          if (rows.length) await db.stepQuestions.bulkPut(rows);
        }
      }

      await db.meta.put({ key: "seeded", value: SEED_VERSION });
    }
  );

  await ensureAdmin();
  return true;
}

export const seedStats = {
  subjects: SEED.subjects.length,
  topics: SEED.subjects.reduce((n, s) => n + s.topics.length, 0),
  questions: SEED.subjects.reduce(
    (n, s) => n + s.topics.reduce((m, t) => m + t.questions.length, 0),
    0
  ),
  achievements: SEED.achievements.length,
  trails: SEED.trails.length,
};
