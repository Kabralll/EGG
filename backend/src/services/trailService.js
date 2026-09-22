import prisma from "../lib/prisma.js"

export async function getTrailsProgress(userId) {
  const trails = await prisma.trail.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: {
      subject: true,
      steps: { orderBy: { order: "asc" }, select: { id: true, order: true } },
      completions: { where: { userId }, take: 1 },
    },
  })

  const completions = await prisma.stepCompletion.findMany({
    where: { userId, step: { trailId: { in: trails.map((t) => t.id) } } },
    select: { stepId: true, step: { select: { trailId: true, order: true } } },
  })

  const completedByTrail = new Map()
  for (const c of completions) {
    const trailId = c.step.trailId
    if (!completedByTrail.has(trailId)) completedByTrail.set(trailId, new Set())
    completedByTrail.get(trailId).add(c.stepId)
  }

  return trails.map((t) => {
    const doneIds = completedByTrail.get(t.id) || new Set()
    const completedSteps = t.steps.filter((s) => doneIds.has(s.id)).length
    const finished = t.completions.length > 0

    let nextStepId = null
    for (const step of t.steps) {
      if (doneIds.has(step.id)) continue
      const previous = t.steps.find((s) => s.order === step.order - 1)
      const previousDone = !previous || doneIds.has(previous.id)
      if (previousDone) {
        nextStepId = step.id
        break
      }
    }

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      icon: t.icon,
      subject: { id: t.subject.id, name: t.subject.name, color: t.subject.color },
      totalSteps: t.steps.length,
      completedSteps,
      finished,
      percent: Math.round((completedSteps / t.steps.length) * 100),
      nextStepId,
    }
  })
}

export async function getTrailDetail(userId, trailId) {
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    include: {
      subject: true,
      steps: {
        orderBy: { order: "asc" },
        include: {
          questions: { select: { questionId: true } },
          completions: { where: { userId }, take: 1 },
        },
      },
      completions: { where: { userId }, take: 1 },
    },
  })
  if (!trail) return null

  const steps = trail.steps.map((step) => {
    const completed = step.completions.length > 0
    const previous = trail.steps.find((s) => s.order === step.order - 1)
    const unlocked = step.order === 1 || (previous && previous.completions.length > 0)
    return {
      id: step.id,
      order: step.order,
      title: step.title,
      totalQuestions: step.questions.length,
      completed,
      unlocked,
    }
  })

  const completedCount = steps.filter((s) => s.completed).length

  return {
    id: trail.id,
    title: trail.title,
    description: trail.description,
    icon: trail.icon,
    subject: { id: trail.subject.id, name: trail.subject.name, color: trail.subject.color },
    finished: trail.completions.length > 0,
    totalSteps: steps.length,
    completedSteps: completedCount,
    percent: Math.round((completedCount / steps.length) * 100),
    steps,
  }
}
