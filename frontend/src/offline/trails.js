import { db } from "./db";

/*
  Trilhas e etapas — port direto de backend/src/services/trailService.js.
  Desbloqueio progressivo: a etapa N só abre quando a N-1 estiver concluída.
*/

async function trailRows() {
  const trails = await db.trails.orderBy("order").toArray();
  trails.sort((a, b) => a.order - b.order || a.id - b.id);
  return trails;
}

export async function getTrailsProgress(userId) {
  const trails = await trailRows();
  const [subjects, stepCompletions, trailCompletions] = await Promise.all([
    db.subjects.toArray(),
    db.stepCompletions.where("userId").equals(userId).toArray(),
    db.trailCompletions.where("userId").equals(userId).toArray(),
  ]);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const finishedIds = new Set(trailCompletions.map((c) => c.trailId));
  const doneByTrail = new Map();
  for (const c of stepCompletions) {
    const step = await db.trailSteps.get(c.stepId);
    if (!step) continue;
    if (!doneByTrail.has(step.trailId)) doneByTrail.set(step.trailId, new Set());
    doneByTrail.get(step.trailId).add(step.id);
  }

  const result = [];
  for (const t of trails) {
    const steps = (await db.trailSteps.where("trailId").equals(t.id).toArray()).sort(
      (a, b) => a.order - b.order
    );
    const doneIds = doneByTrail.get(t.id) || new Set();
    const completedSteps = steps.filter((s) => doneIds.has(s.id)).length;
    const finished = finishedIds.has(t.id);

    let nextStepId = null;
    for (const step of steps) {
      if (doneIds.has(step.id)) continue;
      const previous = steps.find((s) => s.order === step.order - 1);
      const previousDone = !previous || doneIds.has(previous.id);
      if (previousDone) {
        nextStepId = step.id;
        break;
      }
    }

    const subject = subjectById.get(t.subjectId);

    result.push({
      id: t.id,
      title: t.title,
      description: t.description,
      icon: t.icon,
      subject: subject
        ? { id: subject.id, name: subject.name, color: subject.color }
        : { id: null, name: "", color: "#6366f1" },
      totalSteps: steps.length,
      completedSteps,
      finished,
      percent:
        steps.length > 0
          ? Math.round((completedSteps / steps.length) * 100)
          : 0,
      nextStepId,
    });
  }

  return result;
}

export async function getTrailDetail(userId, trailId) {
  const trail = await db.trails.get(trailId);
  if (!trail) return null;

  const [subject, steps, trailCompletions] = await Promise.all([
    db.subjects.get(trail.subjectId),
    db.trailSteps.where("trailId").equals(trail.id).toArray(),
    db.trailCompletions
      .where("[userId+trailId]")
      .equals([userId, trail.id])
      .first(),
  ]);
  steps.sort((a, b) => a.order - b.order);

  const stepRows = [];
  for (const step of steps) {
    const links = await db.stepQuestions.where("stepId").equals(step.id).toArray();
    const completion = await db.stepCompletions
      .where("[userId+stepId]")
      .equals([userId, step.id])
      .first();
    const previous = steps.find((s) => s.order === step.order - 1);
    let previousDone = true;
    if (previous) {
      const pc = await db.stepCompletions
        .where("[userId+stepId]")
        .equals([userId, previous.id])
        .first();
      previousDone = Boolean(pc);
    }

    stepRows.push({
      id: step.id,
      order: step.order,
      title: step.title,
      totalQuestions: links.length,
      completed: Boolean(completion),
      unlocked: step.order === 1 || previousDone,
    });
  }

  const completedCount = stepRows.filter((s) => s.completed).length;

  return {
    id: trail.id,
    title: trail.title,
    description: trail.description,
    icon: trail.icon,
    subject: subject
      ? { id: subject.id, name: subject.name, color: subject.color }
      : { id: null, name: "", color: "#6366f1" },
    finished: Boolean(trailCompletions),
    totalSteps: stepRows.length,
    completedSteps: completedCount,
    percent:
      stepRows.length > 0 ? Math.round((completedCount / stepRows.length) * 100) : 0,
    steps: stepRows,
  };
}
