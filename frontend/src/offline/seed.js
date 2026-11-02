import { db } from "./db";
import SEED from "../data/seed.json";
import { sha256 } from "./sha256";

// Bumpar força a mesclagem do conteúdo na próxima abertura do app.
const SEED_VERSION = 2;

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
    skinId: "classic",
    createdAt: new Date(),
  });
}

/** Compara os campos do seed com o registro local e devolve só o que mudou. */
function changedFields(existing, next) {
  const patch = {};
  for (const [key, value] of Object.entries(next)) {
    if (existing[key] !== value) patch[key] = value;
  }
  return patch;
}

/**
 * Popula/mescla o banco local com o conteúdo de `seed.json` — o mesmo conteúdo
 * que backend/prisma/seed.js cria no MySQL (disciplinas, assuntos, questões,
 * conquistas e trilhas).
 *
 * A mesclagem é incremental e não destrutiva: disciplinas, assuntos, questões,
 * conquistas, trilhas e etapas são localizados por chave/nome e atualizados no
 * lugar. Assim os IDs locais continuam os mesmos e `attempts`,
 * `stepCompletions` e `trailCompletions` nunca ficam órfãos quando novas
 * questões ou trilhas são adicionadas.
 *
 * As questões antigas não tinham `seedKey`; por isso a primeira mesclagem as
 * localiza pelo enunciado exato. A partir daí a chave fica gravada na linha.
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
      const questionIds = {}; // key do seed → id local

      // 1. Disciplinas -----------------------------------------------------
      const subjectIdByName = new Map();
      for (const subjectData of SEED.subjects) {
        const existing = await db.subjects
          .where("name")
          .equals(subjectData.name)
          .first();

        let subjectId;
        if (existing) {
          subjectId = existing.id;
          const patch = changedFields(existing, {
            icon: subjectData.icon,
            color: subjectData.color,
          });
          if (Object.keys(patch).length) {
            await db.subjects.update(subjectId, patch);
          }
        } else {
          subjectId = await db.subjects.add({
            name: subjectData.name,
            icon: subjectData.icon,
            color: subjectData.color,
          });
        }

        subjectIdByName.set(subjectData.name, subjectId);
      }

      // 2. Assuntos e questões ---------------------------------------------
      const storedQuestions = await db.questions.toArray();
      const questionBySeedKey = new Map();
      const questionsByStatement = new Map();
      for (const question of storedQuestions) {
        if (question.seedKey) questionBySeedKey.set(question.seedKey, question);
        if (!questionsByStatement.has(question.statement)) {
          questionsByStatement.set(question.statement, []);
        }
        questionsByStatement.get(question.statement).push(question);
      }

      for (const subjectData of SEED.subjects) {
        const subjectId = subjectIdByName.get(subjectData.name);

        for (const topicData of subjectData.topics) {
          const existingTopic = await db.topics
            .where("[subjectId+name]")
            .equals([subjectId, topicData.name])
            .first();
          const topicId = existingTopic
            ? existingTopic.id
            : await db.topics.add({ name: topicData.name, subjectId });

          for (const q of topicData.questions) {
            let existing = questionBySeedKey.get(q.key);
            if (!existing) {
              const candidates = questionsByStatement.get(q.statement) || [];
              existing =
                candidates.find((c) => c.topicId === topicId) ||
                (candidates.length === 1 ? candidates[0] : null);
            }

            let questionId;
            if (existing) {
              questionId = existing.id;
              const patch = changedFields(existing, {
                topicId,
                seedKey: q.key,
                statement: q.statement,
                explanation: q.explanation,
                difficulty: q.difficulty,
                grade: q.grade,
              });
              if (Object.keys(patch).length) {
                await db.questions.update(questionId, patch);
              }

              // Só cria opções quando a questão ainda não tem nenhuma.
              const optionCount = await db.options
                .where("questionId")
                .equals(questionId)
                .count();
              if (optionCount === 0) {
                await db.options.bulkAdd(
                  q.options.map((text, i) => ({
                    text,
                    isCorrect: i === q.correct,
                    questionId,
                  }))
                );
              }
            } else {
              questionId = await db.questions.add({
                seedKey: q.key,
                statement: q.statement,
                explanation: q.explanation,
                difficulty: q.difficulty,
                grade: q.grade,
                topicId,
                createdAt: new Date(),
              });

              await db.options.bulkAdd(
                q.options.map((text, i) => ({
                  text,
                  isCorrect: i === q.correct,
                  questionId,
                }))
              );
            }

            questionIds[q.key] = questionId;
          }
        }
      }

      // 3. Conquistas ------------------------------------------------------
      for (const achievement of SEED.achievements) {
        const existing = await db.achievements
          .where("code")
          .equals(achievement.code)
          .first();
        const data = {
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          metric: achievement.metric,
          threshold: achievement.threshold,
        };

        if (existing) {
          const patch = changedFields(existing, data);
          if (Object.keys(patch).length) {
            await db.achievements.update(existing.id, patch);
          }
        } else {
          await db.achievements.add({ code: achievement.code, ...data });
        }
      }

      // 4. Trilhas, etapas e ligações etapa↔questão ------------------------
      let trailOrder = 1;
      for (const trailData of SEED.trails) {
        const subjectId = subjectIdByName.get(trailData.subject);
        if (!subjectId) continue;

        const seedKey = `${trailData.subject}::${trailData.title}`;
        const subjectTrails = await db.trails
          .where("subjectId")
          .equals(subjectId)
          .toArray();
        const existing =
          subjectTrails.find((t) => t.seedKey === seedKey) ||
          subjectTrails.find((t) => !t.seedKey && t.title === trailData.title);

        const order = trailOrder++;
        const trailPayload = {
          title: trailData.title,
          description: trailData.description,
          icon: trailData.icon,
          order,
          subjectId,
          seedKey,
        };

        let trailId;
        if (existing) {
          trailId = existing.id;
          const patch = changedFields(existing, trailPayload);
          if (Object.keys(patch).length) {
            await db.trails.update(trailId, patch);
          }
        } else {
          trailId = await db.trails.add(trailPayload);
        }

        let stepOrder = 1;
        for (const stepData of trailData.steps) {
          const existingStep = await db.trailSteps
            .where("[trailId+order]")
            .equals([trailId, stepOrder])
            .first();

          let stepId;
          if (existingStep) {
            stepId = existingStep.id;
            if (existingStep.title !== stepData.title) {
              await db.trailSteps.update(stepId, { title: stepData.title });
            }
          } else {
            stepId = await db.trailSteps.add({
              trailId,
              order: stepOrder,
              title: stepData.title,
            });
          }
          stepOrder++;

          // Reconstrói apenas as ligações desta etapa (não mexe no progresso).
          const rows = stepData.questions
            .map((key) => questionIds[key])
            .filter(Boolean)
            .map((questionId) => ({ stepId, questionId }));

          await db.stepQuestions.where("stepId").equals(stepId).delete();
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
