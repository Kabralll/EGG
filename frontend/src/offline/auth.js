import { db, apiError, allAttemptsOf } from "./db";
import { levelProgress } from "./gamification";
import { sha256 } from "./sha256";

/*
  Autenticação e perfil 100% locais — substitui backend/src/services/authService.js
  e backend/src/controllers/userController.js.

  - sem servidor, sem JWT, sem bcrypt, sem e-mail: o "token" é apenas um
    envelope local guardado em localStorage (mesma chave "token" que o app
    já usava), e a senha fica guardada como hash SHA-256 com sal por perfil.
  - vários perfis podem coexistir no mesmo aparelho (troca de conta continua
    funcionando pelo e-mail).
*/

/** Senha → hash hexa com sal fixo por perfil. */
export function hashPassword(password, salt) {
  return sha256(`${salt}::${password}`);
}

/** Texto UTF-8 → base64url (para o envelope do token). */
function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ------------------------------- Token ------------------------------- */

const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias, igual ao JWT do backend

export function signToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + TOKEN_TTL,
  };
  return `local.${b64urlEncode(JSON.stringify(payload))}`;
}

export function readToken(token) {
  if (!token || !token.startsWith("local.")) return null;
  try {
    const payload = JSON.parse(b64urlDecode(token.slice(6)));
    if (!payload || typeof payload.id !== "number") return null;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ----------------------------- Usuários ----------------------------- */

export function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    role: user.role,
    xp: user.xp,
    streak: user.streak,
    createdAt: user.createdAt,
  };
}

function validateRegister(data) {
  const errors = {};
  const name = (data.name || "").trim();
  const nickname = (data.nickname || "").trim();
  const email = (data.email || "").trim();

  if (name.length < 2) errors.name = "Informe seu nome (mínimo 2 caracteres)";
  if (nickname.length < 2)
    errors.nickname = "Escolha um apelido (mínimo 2 caracteres)";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "E-mail inválido";
  if (!data.password || data.password.length < 6)
    errors.password = "A senha precisa ter pelo menos 6 caracteres";

  return errors;
}

export async function login(email, password) {
  if (!email || !password) {
    throw apiError(400, "Informe e-mail e senha");
  }

  const user = await db.users
    .where("email")
    .equals(String(email).trim())
    .first();
  // Mensagem genérica: não revela se o e-mail existe
  if (!user) throw apiError(401, "E-mail ou senha inválidos");

  const hash = hashPassword(password, user.salt);
  if (hash !== user.password) {
    throw apiError(401, "E-mail ou senha inválidos");
  }

  return { token: signToken(user), user: safeUser(user) };
}

export async function register(data) {
  const errors = validateRegister(data);
  if (Object.keys(errors).length > 0) {
    throw apiError(400, "Dados inválidos", errors);
  }

  const email = data.email.trim();

  const emailTaken = await db.users.where("email").equals(email).first();
  if (emailTaken) {
    throw apiError(409, "Dados inválidos", {
      email: "Este e-mail já está cadastrado",
    });
  }
  const nickTaken = await db.users
    .where("nickname")
    .equals(data.nickname.trim())
    .first();
  if (nickTaken) {
    throw apiError(409, "Dados inválidos", {
      nickname: "Este apelido já está em uso",
    });
  }

  const salt = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const id = await db.users.add({
    name: data.name.trim(),
    nickname: data.nickname.trim(),
    email,
    password: hashPassword(data.password, salt),
    salt,
    role: "STUDENT",
    xp: 0,
    streak: 0,
    lastActiveDay: null,
    createdAt: new Date(),
  });

  const user = await db.users.get(id);
  return { token: signToken(user), user: safeUser(user) };
}

/* ------------------------------ Perfil ------------------------------ */

export async function getProfile(userId) {
  const user = await db.users.get(userId);
  if (!user) throw apiError(404, "Usuário não encontrado");

  const [attempts, questions, topics, trailsCompleted, achievements] =
    await Promise.all([
      allAttemptsOf(userId),
      db.questions.toArray(),
      db.topics.toArray(),
      db.trailCompletions.where("userId").equals(userId).count(),
      db.userAchievements.where("userId").equals(userId).count(),
    ]);

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const totalQuestions = attempts.length;
  const correctAnswers = attempts.filter((a) => a.isCorrect).length;

  const distinctSubjects = new Set();
  for (const a of attempts) {
    const q = questionById.get(a.questionId);
    const topic = q ? topicById.get(q.topicId) : null;
    if (topic) distinctSubjects.add(topic.subjectId);
  }

  return {
    ...safeUser(user),
    progress: levelProgress(user.xp),
    streak: user.streak,
    stats: {
      totalQuestions,
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      accuracy:
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0,
      trailsCompleted,
      achievements,
      subjectsStudied: distinctSubjects.size,
    },
  };
}

export async function updateProfile(userId, body = {}) {
  const data = {};
  const errors = {};

  if (body.name !== undefined) {
    if (String(body.name).trim().length < 2)
      errors.name = "Informe seu nome (mínimo 2 caracteres)";
    else data.name = String(body.name).trim();
  }
  if (body.nickname !== undefined) {
    if (String(body.nickname).trim().length < 2)
      errors.nickname = "Escolha um apelido (mínimo 2 caracteres)";
    else data.nickname = String(body.nickname).trim();
  }

  if (Object.keys(errors).length > 0) {
    throw apiError(400, "Dados inválidos", errors);
  }

  if (data.nickname) {
    const taken = await db.users
      .where("nickname")
      .equals(data.nickname)
      .first();
    if (taken && taken.id !== userId) {
      throw apiError(409, "Dados inválidos", {
        nickname: "Este apelido já está em uso",
      });
    }
  }

  await db.users.update(userId, data);
  return safeUser(await db.users.get(userId));
}
