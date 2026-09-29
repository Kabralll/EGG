import { ensureSeeded } from "./seed";
import { db, apiError } from "./db";
import * as auth from "./auth";
import * as practice from "./practice";
import * as stats from "./stats";
import * as trails from "./trails";
import * as subjectsSvc from "./subjects";
import * as admin from "./admin";
import { buildRecommendation } from "./stats";
import { getDailyChallengeState, levelProgress } from "./gamification";

/*
  Router local: mantém EXATAMENTE os mesmos caminhos que o backend Express
  expunha ("/dashboard", "/questions/practice", "/admin/questions", ...), só que
  em vez de `fetch` ele resolve tudo contra o IndexedDB do aparelho.

  Consequência: nenhum componente/página precisou ser alterado — só a camada
  `services/api.js` passou a delegar para cá.
*/

let readyPromise = null;
function ready() {
  if (!readyPromise) readyPromise = ensureSeeded();
  return readyPromise;
}

/* ------------------------------- Auth ------------------------------- */

function parseQuery(search) {
  const out = {};
  if (!search) return out;
  for (const [k, v] of new URLSearchParams(search)) out[k] = v;
  return out;
}

/** Lê o envelope local de sessão (mesma chave "token" que o app já usava). */
function currentUser() {
  const payload = auth.readToken(localStorage.getItem("token"));
  if (!payload) throw apiError(401, "Sessão inválida");
  return payload;
}

function requireUser() {
  const payload = currentUser();
  return payload.id;
}

function requireAdmin() {
  const payload = currentUser();
  if (payload.role !== "ADMIN") throw apiError(403, "Acesso restrito ao administrador");
  return payload.id;
}

/* --------------------- Recuperação de senha local --------------------- */

const RESET_TTL = 30 * 60 * 1000; // 30 minutos, igual ao backend

async function forgotPassword(email) {
  const user = email
    ? await db.users.where("email").equals(String(email).trim()).first()
    : null;

  if (!user) {
    // Mesma postura do backend: não revela se a conta existe
    return { message: "Se o e-mail existir, enviaremos as instruções." };
  }

  const localToken = `local.${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  await db.meta.put({
    key: `reset:${localToken}`,
    value: { userId: user.id, exp: Date.now() + RESET_TTL },
  });

  return {
    message: "Instruções geradas.",
    // Não existe e-mail no modo offline: o app leva direto para a tela nova.
    localToken,
  };
}

async function resetPassword(token, password) {
  if (!password || String(password).length < 6) {
    throw apiError(400, "A senha precisa ter pelo menos 6 caracteres");
  }
  const entry = await db.meta.get(`reset:${token}`);
  if (!entry || !entry.value || entry.value.exp < Date.now()) {
    throw apiError(400, "Link expirado ou inválido");
  }

  const user = await db.users.get(entry.value.userId);
  if (!user) throw apiError(400, "Link expirado ou inválido");

  const salt = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await db.users.update(user.id, {
    salt,
    password: auth.hashPassword(password, salt),
  });
  await db.meta.delete(`reset:${token}`);

  return { message: "Senha redefinida com sucesso." };
}

/* ------------------------------ Dashboard ------------------------------ */

async function buildDashboard(userId) {
  const [
    user,
    dailyChallenge,
    trailList,
    attempts,
    recentAchievementsRows,
    statsData,
    rankingPosition,
  ] = await Promise.all([
    db.users.get(userId),
    getDailyChallengeState(userId),
    trails.getTrailsProgress(userId),
    db.attempts.where("userId").equals(userId).toArray(),
    db.userAchievements.where("userId").equals(userId).toArray(),
    stats.buildStats(userId),
    stats.getPositionOf(userId, "general"),
  ]);

  if (!user) throw apiError(404, "Usuário não encontrado");

  // Últimas 5 tentativas, mais recente primeiro
  const recent = [...attempts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const [questions, topics, achievements, subjectsList] = await Promise.all([
    db.questions.toArray(),
    db.topics.toArray(),
    db.achievements.toArray(),
    db.subjects.toArray(),
  ]);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const achievementById = new Map(achievements.map((a) => [a.id, a]));
  const subjectById = new Map(subjectsList.map((s) => [s.id, s]));

  const recentAttempts = recent.map((a) => {
    const q = questionById.get(a.questionId);
    const topic = q ? topicById.get(q.topicId) : null;
    const subject = topic ? subjectById.get(topic.subjectId) : null;
    return {
      questionId: a.questionId,
      statement: q ? q.statement : "",
      topic: topic ? topic.name : "",
      subject: subject
        ? {
            name: subject.name,
            icon: subject.icon,
            color: subject.color,
          }
        : { name: "", icon: "📘", color: "#6366f1" },
      isCorrect: a.isCorrect,
      xpAwarded: a.xpAwarded,
      createdAt: a.createdAt,
    };
  });

  const recentAchievements = [...recentAchievementsRows]
    .sort((a, b) => b.unlockedAt - a.unlockedAt)
    .slice(0, 3)
    .map((ua) => {
    const a = achievementById.get(ua.achievementId);
    return {
      code: a ? a.code : "",
      name: a ? a.name : "",
      icon: a ? a.icon : "",
      description: a ? a.description : "",
      unlockedAt: ua.unlockedAt,
    };
  });

  const inProgress = trailList.filter((t) => !t.finished && t.completedSteps > 0);
  const suggested = trailList.filter((t) => !t.finished && t.completedSteps === 0);

  return {
    user: {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      progress: levelProgress(user.xp),
      streak: user.streak,
    },
    dailyChallenge,
    trails: { inProgress, suggested },
    recentAttempts,
    recentAchievements,
    stats: {
      totalQuestions: statsData.totalQuestions,
      correctAnswers: statsData.correctAnswers,
      accuracy: statsData.accuracy,
      subjectsStudied: statsData.subjectsStudied,
      trailsCompleted: statsData.trailsCompleted,
      achievements: statsData.achievements,
    },
    ranking: { position: rankingPosition.position, total: rankingPosition.total },
    recommendation: buildRecommendation(statsData),
  };
}

/* ------------------------------ Conquistas ------------------------------ */

async function listAchievements(userId) {
  const [achievements, unlocked] = await Promise.all([
    db.achievements.orderBy("threshold").toArray(),
    db.userAchievements.where("userId").equals(userId).toArray(),
  ]);
  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return {
    total: achievements.length,
    unlockedCount: unlocked.length,
    achievements: achievements.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,
      metric: a.metric,
      threshold: a.threshold,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) || null,
    })),
  };
}

/* -------------------------------- Router -------------------------------- */

export async function localApi(path, { method = "GET", body, auth: withAuth = true } = {}) {
  await ready();

  const qIdx = path.indexOf("?");
  const pathname = qIdx === -1 ? path : path.slice(0, qIdx);
  const query = parseQuery(qIdx === -1 ? "" : path.slice(qIdx + 1));

  /* ---------------------------- públicas ---------------------------- */
  if (method === "POST" && pathname === "/auth/login") {
    return auth.login(body?.email, body?.password);
  }
  if (method === "POST" && pathname === "/auth/register") {
    return auth.register(body || {});
  }
  if (method === "POST" && pathname === "/auth/forgot-password") {
    return forgotPassword(body?.email);
  }
  if (method === "POST" && pathname === "/auth/reset-password") {
    return resetPassword(body?.token, body?.password);
  }

  if (!withAuth) {
    throw apiError(404, `Rota não encontrada: ${pathname}`);
  }

  const userId = requireUser();

  /* --------------------------- conteúdo --------------------------- */
  if (method === "GET" && pathname === "/subjects") {
    return subjectsSvc.listSubjects(userId);
  }
  let m = pathname.match(/^\/subjects\/(\d+)$/);
  if (method === "GET" && m) {
    const data = await subjectsSvc.getSubject(Number(m[1]), userId);
    if (!data) throw apiError(404, "Disciplina não encontrada");
    return data;
  }

  if (method === "GET" && pathname === "/trails") {
    return trails.getTrailsProgress(userId);
  }
  m = pathname.match(/^\/trails\/(\d+)$/);
  if (method === "GET" && m) {
    const data = await trails.getTrailDetail(userId, Number(m[1]));
    if (!data) throw apiError(404, "Trilha não encontrada");
    return data;
  }

  /* -------------------------- gamificação -------------------------- */
  if (method === "GET" && pathname === "/achievements") {
    return listAchievements(userId);
  }
  if (method === "GET" && pathname === "/daily-challenge") {
    return getDailyChallengeState(userId);
  }
  if (method === "GET" && pathname === "/ranking") {
    const scope = query.scope === "weekly" ? "weekly" : "general";
    const [entries, mine] = await Promise.all([
      stats.getRanking(scope),
      stats.getPositionOf(userId, scope),
    ]);
    return { scope, total: entries.length, myPosition: mine.position, entries };
  }

  /* ---------------------------- prática ---------------------------- */
  if (method === "GET" && pathname === "/questions/practice") {
    const result = await practice.getPracticeQuestions(userId, query);
    if (!result) throw apiError(404, "Etapa não encontrada");
    if (result.locked) {
      throw apiError(403, "Complete a etapa anterior para desbloquear esta.");
    }
    return result;
  }
  m = pathname.match(/^\/questions\/(\d+)\/answer$/);
  if (method === "POST" && m) {
    const result = await practice.answerQuestion(
      userId,
      Number(m[1]),
      body?.optionId
    );
    if (result.error) throw apiError(result.status || 400, result.error);
    return result;
  }

  /* --------------------------- estatísticas --------------------------- */
  if (method === "GET" && pathname === "/dashboard") {
    return buildDashboard(userId);
  }
  if (method === "GET" && pathname === "/stats") {
    return stats.getUserStatsFull(userId);
  }

  /* ------------------------------ perfil ------------------------------ */
  if (method === "GET" && pathname === "/user") {
    return auth.getProfile(userId);
  }
  if (method === "PATCH" && pathname === "/user") {
    return auth.updateProfile(userId, body || {});
  }

  /* ------------------------------- admin ------------------------------- */
  if (pathname.startsWith("/admin/")) {
    const adminId = requireAdmin();

    if (method === "GET" && pathname === "/admin/overview") return admin.overview();
    if (method === "GET" && pathname === "/admin/users") return admin.listUsers();
    m = pathname.match(/^\/admin\/users\/(\d+)\/role$/);
    if (method === "PATCH" && m) {
      return admin.updateUserRole(adminId, Number(m[1]), body?.role);
    }

    if (method === "POST" && pathname === "/admin/subjects") {
      return admin.createSubject(body || {});
    }
    m = pathname.match(/^\/admin\/subjects\/(\d+)$/);
    if (method === "PATCH" && m) return admin.updateSubject(Number(m[1]), body || {});
    if (method === "DELETE" && m) return admin.deleteSubject(Number(m[1]));

    if (method === "POST" && pathname === "/admin/topics") {
      return admin.createTopic(body || {});
    }
    m = pathname.match(/^\/admin\/topics\/(\d+)$/);
    if (method === "PATCH" && m) return admin.updateTopic(Number(m[1]), body || {});
    if (method === "DELETE" && m) return admin.deleteTopic(Number(m[1]));

    if (method === "GET" && pathname === "/admin/questions") {
      return admin.listQuestions(query);
    }
    if (method === "POST" && pathname === "/admin/questions") {
      return admin.createQuestion(body || {});
    }
    m = pathname.match(/^\/admin\/questions\/(\d+)$/);
    if (method === "PATCH" && m) return admin.updateQuestion(Number(m[1]), body || {});
    if (method === "DELETE" && m) return admin.deleteQuestion(Number(m[1]));

    if (method === "GET" && pathname === "/admin/trails") return admin.listTrailsAdmin();
    if (method === "POST" && pathname === "/admin/trails") {
      return admin.createTrail(body || {});
    }
    m = pathname.match(/^\/admin\/trails\/(\d+)$/);
    if (method === "PATCH" && m) return admin.updateTrail(Number(m[1]), body || {});
    if (method === "DELETE" && m) return admin.deleteTrail(Number(m[1]));
  }

  throw apiError(404, `Rota não encontrada: ${method} ${pathname}`);
}
