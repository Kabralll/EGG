import { db, apiError } from "./db";
import { toDateKey, startOfWeek } from "./date";
import { evaluateAchievements, levelProgress } from "./gamification";

/*
  Monetização do EGG — modelo freemium ("Na Casca" × "Fora da Casca").

  Este módulo é a ÚNICA fonte de verdade sobre planos e permissões:
  - planos e preços (PLANS)
  - catálogo de recursos pagos (FEATURES)
  - assinatura efetiva do usuário (getSubscription / checkFeatureAccess)
  - limites de uso diário (corações)
  - cosméticos (SKINS), desafio semanal e congelamento de sequência

  O pagamento em si é SIMULADO: não há gateway. `checkout` grava a assinatura
  no IndexedDB com validade real, para que a lógica de expiração, trial e
  cancelamento seja exercitada de ponta a ponta. Trocar por Stripe/Mercado
  Pago depois significa apenas substituir `checkout` por uma chamada ao
  servidor e remover `provider: "demo"`.
*/

/* ------------------------------- Planos ------------------------------- */

export const FREE_PLAN_ID = "free";
export const PREMIUM_PLAN_IDS = ["pro_monthly", "pro_annual"];

export const PLANS = [
  {
    id: FREE_PLAN_ID,
    name: "Na Casca",
    tagline: "Para começar a chocar o ovo",
    priceCents: 0,
    cycleDays: 0,
    trialDays: 0,
    periodLabel: "para sempre",
    highlight: false,
  },
  {
    id: "pro_monthly",
    name: "Fora da Casca",
    tagline: "Sem limites, mês a mês",
    priceCents: 990,
    cycleDays: 30,
    trialDays: 7,
    periodLabel: "por mês",
    highlight: false,
  },
  {
    id: "pro_annual",
    name: "Fora da Casca",
    tagline: "O plano de quem vai até o fim",
    priceCents: 7990,
    cycleDays: 365,
    trialDays: 7,
    periodLabel: "por ano",
    highlight: true,
    badge: "33% de economia",
  },
];

export const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export function formatBRL(cents) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Preço "equivalente mensal" — usado para comparar mensal × anual. */
export function monthlyEquivalent(plan) {
  if (!plan || !plan.cycleDays) return 0;
  return Math.round((plan.priceCents / plan.cycleDays) * 30);
}

/* ------------------------- Catálogo de recursos ------------------------- */

export const FEATURES = {
  unlimited_hearts: {
    id: "unlimited_hearts",
    name: "Corações infinitos",
    icon: "❤️",
    description:
      "Na versão gratuita você tem 5 corações por dia e cada erro consome um. No PRO, errar nunca bloqueia seus estudos.",
    freeLimit: 5,
    premiumLimit: null,
  },
  advanced_stats: {
    id: "advanced_stats",
    name: "Relatórios avançados",
    icon: "📈",
    description:
      "Gráficos de 90 dias, desempenho por assunto e histórico completo — em vez dos 14 dias do plano gratuito.",
    freeLimit: 14,
    premiumLimit: 90,
  },
  streak_freeze: {
    id: "streak_freeze",
    name: "Congelamento de sequência",
    icon: "🧊",
    description:
      "Faltou um dia? O PRO congela sua sequência automaticamente até 2 vezes por mês, sem perder o ritmo.",
    freeLimit: 0,
    premiumLimit: 2,
  },
  exclusive_skins: {
    id: "exclusive_skins",
    name: "Skins do ovo",
    icon: "🎨",
    description:
      "Personalize seu ovo com visual dourado, cósmico, neon e de dragão — e mostre no perfil.",
    freeLimit: 1,
    premiumLimit: 5,
  },
  weekly_challenge: {
    id: "weekly_challenge",
    name: "Desafio semanal PRO",
    icon: "🗓️",
    description:
      "Uma missão semanal extra com recompensa de 150 XP. Disponível só para assinantes.",
    freeLimit: 0,
    premiumLimit: 1,
  },
  no_ads: {
    id: "no_ads",
    name: "Sem anúncios",
    icon: "🚫",
    description: "Nenhum espaço publicitário na sua experiência de estudo.",
    freeLimit: 0,
    premiumLimit: 1,
  },
};

export const FEATURE_LIST = Object.values(FEATURES);

/* ------------------------------- Skins ------------------------------- */

export const SKINS = [
  {
    id: "classic",
    name: "Ovo Clássico",
    emoji: "🥚",
    gradient: "from-slate-100 via-slate-200 to-slate-400",
    premium: false,
  },
  {
    id: "golden",
    name: "Ovo Dourado",
    emoji: "🥚",
    gradient: "from-amber-200 via-yellow-300 to-amber-500",
    premium: true,
  },
  {
    id: "cosmic",
    name: "Ovo Cósmico",
    emoji: "🌌",
    gradient: "from-indigo-500 via-violet-600 to-slate-900",
    premium: true,
  },
  {
    id: "neon",
    name: "Ovo Neon",
    emoji: "⚡",
    gradient: "from-emerald-300 via-cyan-400 to-blue-600",
    premium: true,
  },
  {
    id: "dragon",
    name: "Ovo de Dragão",
    emoji: "🐉",
    gradient: "from-rose-400 via-red-500 to-orange-700",
    premium: true,
  },
];

export const DEFAULT_SKIN_ID = "classic";

/* --------------------------- Corações / uso --------------------------- */

export const FREE_HEARTS = 5;
/** Um coração volta a cada 30 min (em produção, 4h é o padrão do mercado). */
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const STREAK_FREEZES_PER_MONTH = 2;
export const STREAK_FREEZE_MIN_STREAK = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function dayRow(userId, day = toDateKey()) {
  return db.usageDays.where("[userId+day]").equals([userId, day]).first();
}

async function ensureDayRow(userId, day = toDateKey()) {
  const existing = await dayRow(userId, day);
  if (existing) return existing;
  try {
    const id = await db.usageDays.add({
      userId,
      day,
      hearts: FREE_HEARTS,
      adsSeen: 0,
      updatedAt: new Date(),
    });
    return db.usageDays.get(id);
  } catch {
    // Corrida entre telas que pedem os corações ao mesmo tempo: a linha já existe
    return dayRow(userId, day);
  }
}

/* ----------------------------- Assinatura ----------------------------- */

/** Converte o registro cru do banco na visão "efetiva" (com expiração). */
export function describeSubscription(raw) {
  const now = Date.now();
  const stillValid =
    Boolean(raw) &&
    raw.currentPeriodEnd != null &&
    new Date(raw.currentPeriodEnd).getTime() > now &&
    ["active", "trialing", "canceled"].includes(raw.status);

  const plan = stillValid ? PLAN_MAP[raw.planId] || PLAN_MAP.free : PLAN_MAP.free;

  return {
    planId: stillValid ? raw.planId : FREE_PLAN_ID,
    plan,
    status: stillValid ? raw.status : raw ? "expired" : "free",
    isPremium: Boolean(stillValid && raw.planId !== FREE_PLAN_ID),
    active: Boolean(stillValid),
    provider: raw ? raw.provider || null : null,
    startedAt: raw ? raw.startedAt || null : null,
    currentPeriodEnd: raw ? raw.currentPeriodEnd || null : null,
    trialEndsAt: raw ? raw.trialEndsAt || null : null,
    canceledAt: raw ? raw.canceledAt || null : null,
    daysLeft: stillValid
      ? Math.max(0, Math.ceil((new Date(raw.currentPeriodEnd).getTime() - now) / DAY_MS))
      : 0,
  };
}

export async function getSubscription(userId) {
  const raw = await db.subscriptions.where("userId").equals(userId).first();
  return describeSubscription(raw);
}

/**
 * Núcleo do paywall. Recebe a assinatura EFETIVA (já com expiração resolvida)
 * e devolve se o recurso está liberado, com limites e destino de upgrade.
 */
export function evaluateFeatureAccess(subscription, featureName, context = {}) {
  const feature = FEATURES[featureName];
  if (!feature) throw apiError(400, `Recurso desconhecido: ${featureName}`);

  const premium = Boolean(subscription && subscription.isPremium);
  const base = {
    feature: featureName,
    plan: subscription ? subscription.planId : FREE_PLAN_ID,
    requiredPlan: "pro_monthly",
    upgradeUrl: "/upgrade",
  };

  if (premium) {
    return {
      ...base,
      allowed: true,
      reason: null,
      limit: feature.premiumLimit,
      used: context.used ?? 0,
      remaining: feature.premiumLimit == null ? Infinity : null,
    };
  }

  if (featureName === "unlimited_hearts") {
    const hearts = context.hearts ?? FREE_HEARTS;
    const allowed = hearts > 0;
    return {
      ...base,
      allowed,
      reason: allowed ? null : "limit_reached",
      limit: FREE_HEARTS,
      used: FREE_HEARTS - hearts,
      remaining: hearts,
    };
  }

  if (featureName === "advanced_stats") {
    return {
      ...base,
      allowed: false,
      reason: "premium_only",
      limit: FEATURES.advanced_stats.freeLimit,
      used: 0,
      remaining: 0,
    };
  }

  if (featureName === "streak_freeze" || featureName === "weekly_challenge" || featureName === "no_ads") {
    return {
      ...base,
      allowed: false,
      reason: "premium_only",
      limit: 0,
      used: 0,
      remaining: 0,
    };
  }

  if (featureName === "exclusive_skins") {
    return {
      ...base,
      allowed: false,
      reason: "premium_only",
      limit: FEATURES.exclusive_skins.freeLimit,
      used: 1,
      remaining: 0,
    };
  }

  return { ...base, allowed: false, reason: "premium_only", limit: 0, used: 0, remaining: 0 };
}

/**
 * API pedida pelo produto: `checkFeatureAccess(userId, "advanced_stats")`.
 * Resolve a assinatura + os dados de uso e devolve o veredito.
 */
export async function checkFeatureAccess(userId, featureName) {
  const subscription = await getSubscription(userId);

  if (featureName === "unlimited_hearts") {
    const hearts = await getHeartsState(userId);
    return {
      ...evaluateFeatureAccess(subscription, featureName, {
        hearts: hearts.unlimited ? Infinity : hearts.hearts,
      }),
      subscription,
      hearts,
    };
  }

  if (featureName === "streak_freeze") {
    const freeze = await getStreakFreezeState(userId);
    return {
      ...evaluateFeatureAccess(subscription, featureName, { used: freeze.used }),
      subscription,
      streakFreeze: freeze,
    };
  }

  return { ...evaluateFeatureAccess(subscription, featureName), subscription };
}

/* ------------------------------- Corações ------------------------------- */

export async function getHeartsState(userId) {
  const subscription = await getSubscription(userId);

  if (subscription.isPremium) {
    return {
      unlimited: true,
      hearts: null,
      max: null,
      percent: 100,
      nextInMs: 0,
      plan: subscription.planId,
    };
  }

  const row = await ensureDayRow(userId);
  let hearts = Math.min(FREE_HEARTS, row.hearts ?? FREE_HEARTS);
  let updatedAt = new Date(row.updatedAt || Date.now()).getTime();

  // Regeneração preguiçosa: 1 coração a cada HEART_REGEN_MS, sem cron.
  const regen = Math.floor((Date.now() - updatedAt) / HEART_REGEN_MS);
  if (regen > 0 && hearts < FREE_HEARTS) {
    hearts = Math.min(FREE_HEARTS, hearts + regen);
    updatedAt += regen * HEART_REGEN_MS;
    await db.usageDays.update(row.id, { hearts, updatedAt: new Date(updatedAt) });
  }

  return {
    unlimited: false,
    hearts,
    max: FREE_HEARTS,
    percent: Math.round((hearts / FREE_HEARTS) * 100),
    nextInMs: hearts < FREE_HEARTS ? Math.max(0, updatedAt + HEART_REGEN_MS - Date.now()) : 0,
    plan: subscription.planId,
  };
}

/** Consome 1 coração (só no plano gratuito). Nunca lança: devolve o estado. */
export async function consumeHeart(userId) {
  const subscription = await getSubscription(userId);
  if (subscription.isPremium) {
    return { ...(await getHeartsState(userId)), consumed: false, blocked: false };
  }

  const state = await getHeartsState(userId);
  if (state.hearts <= 0) {
    return { ...state, consumed: false, blocked: true };
  }

  const row = await ensureDayRow(userId);
  await db.usageDays.update(row.id, {
    hearts: state.hearts - 1,
    updatedAt: new Date(),
  });

  return { ...(await getHeartsState(userId)), consumed: true, blocked: false };
}

/* -------------------------- Assinatura (ação) -------------------------- */

export async function checkout(userId, planId) {
  const plan = PLAN_MAP[planId];
  if (!plan || plan.id === FREE_PLAN_ID) {
    throw apiError(400, "Escolha um plano válido para continuar");
  }

  const existing = await db.subscriptions.where("userId").equals(userId).first();
  const now = new Date();
  const trialDays = plan.trialDays || 0;
  const trialEndsAt = trialDays ? new Date(now.getTime() + trialDays * DAY_MS) : null;
  const currentPeriodEnd = new Date(now.getTime() + (trialDays + plan.cycleDays) * DAY_MS);

  const record = {
    userId,
    planId: plan.id,
    status: trialDays ? "trialing" : "active",
    provider: "demo",
    priceCents: plan.priceCents,
    currency: "BRL",
    startedAt: existing ? existing.startedAt : now,
    currentPeriodEnd,
    trialEndsAt,
    canceledAt: null,
    updatedAt: now,
  };

  if (existing) await db.subscriptions.update(existing.id, record);
  else await db.subscriptions.add(record);

  await trackPaywallEvent(userId, "checkout_complete", { planId: plan.id });
  return getSubscription(userId);
}

export async function cancelSubscription(userId) {
  const raw = await db.subscriptions.where("userId").equals(userId).first();
  if (!raw) throw apiError(404, "Nenhuma assinatura ativa");
  await db.subscriptions.update(raw.id, {
    status: "canceled",
    canceledAt: new Date(),
    updatedAt: new Date(),
  });
  await trackPaywallEvent(userId, "subscription_canceled", { planId: raw.planId });
  return getSubscription(userId);
}

/* -------------------------------- Skins -------------------------------- */

export async function listSkins(userId) {
  const [subscription, user] = await Promise.all([
    getSubscription(userId),
    db.users.get(userId),
  ]);
  const equippedId = (user && user.skinId) || DEFAULT_SKIN_ID;

  return SKINS.map((skin) => ({
    ...skin,
    unlocked: !skin.premium || subscription.isPremium,
    equipped: skin.id === equippedId && (!skin.premium || subscription.isPremium),
  }));
}

export async function equipSkin(userId, skinId) {
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin) throw apiError(400, "Skin inválida");

  if (skin.premium) {
    const access = await checkFeatureAccess(userId, "exclusive_skins");
    if (!access.allowed) {
      throw apiError(403, "Skins exclusivas são um benefício do plano Fora da Casca");
    }
  }

  await db.users.update(userId, { skinId });
  await trackPaywallEvent(userId, "skin_equipped", { skinId });
  return skin;
}

export async function getEquippedSkin(userId) {
  const [subscription, user] = await Promise.all([
    getSubscription(userId),
    db.users.get(userId),
  ]);
  const equipped = SKINS.find((s) => s.id === ((user && user.skinId) || DEFAULT_SKIN_ID));
  if (!equipped) return SKINS[0];
  if (equipped.premium && !subscription.isPremium) return SKINS[0];
  return equipped;
}

/* --------------------------- Desafio semanal --------------------------- */

export const WEEKLY_CHALLENGE = {
  title: "25 questões nesta semana",
  description: "Feche 25 questões entre segunda e domingo para faturar o bônus PRO.",
  target: 25,
  xpReward: 150,
};

export async function getWeeklyChallenge(userId) {
  const weekStart = startOfWeek();
  const weekKey = toDateKey(weekStart);
  const [subscription, attempts, claim] = await Promise.all([
    getSubscription(userId),
    db.attempts.where("userId").equals(userId).toArray(),
    db.weeklyClaims.where("[userId+weekKey]").equals([userId, weekKey]).first(),
  ]);

  const progress = attempts.filter((a) => new Date(a.createdAt) >= weekStart).length;
  const completed = progress >= WEEKLY_CHALLENGE.target;

  return {
    ...WEEKLY_CHALLENGE,
    weekKey,
    progress: Math.min(progress, WEEKLY_CHALLENGE.target),
    rawProgress: progress,
    percent: Math.min(100, Math.round((progress / WEEKLY_CHALLENGE.target) * 100)),
    completed,
    claimed: Boolean(claim),
    locked: !subscription.isPremium,
    plan: subscription.planId,
  };
}

export async function claimWeeklyChallenge(userId) {
  const access = await checkFeatureAccess(userId, "weekly_challenge");
  if (!access.allowed) throw apiError(403, "O desafio semanal é exclusivo do plano PRO");

  const challenge = await getWeeklyChallenge(userId);
  if (challenge.claimed) throw apiError(409, "Você já resgatou o desafio desta semana");
  if (!challenge.completed) {
    throw apiError(
      400,
      `Faltam ${WEEKLY_CHALLENGE.target - challenge.rawProgress} questões para concluir o desafio`
    );
  }

  const user = await db.users.get(userId);
  if (!user) throw apiError(404, "Usuário não encontrado");

  await db.transaction(
    "rw",
    db.weeklyClaims,
    db.users,
    db.xpTransactions,
    async () => {
      await db.weeklyClaims.add({
        userId,
        weekKey: challenge.weekKey,
        xpAwarded: WEEKLY_CHALLENGE.xpReward,
        claimedAt: new Date(),
      });
      await db.users.update(userId, { xp: user.xp + WEEKLY_CHALLENGE.xpReward });
      await db.xpTransactions.add({
        userId,
        amount: WEEKLY_CHALLENGE.xpReward,
        reason: "weekly_challenge",
        detail: challenge.title,
        createdAt: new Date(),
      });
    }
  );

  const fresh = await db.users.get(userId);
  const newAchievements = await evaluateAchievements(userId, fresh);

  return {
    xpAwarded: WEEKLY_CHALLENGE.xpReward,
    progress: levelProgress(fresh.xp),
    newAchievements,
  };
}

/* --------------------------- Streak freeze --------------------------- */

function monthKey(date = new Date()) {
  return toDateKey(date).slice(0, 7);
}

export async function getStreakFreezeState(userId) {
  const [subscription, used] = await Promise.all([
    getSubscription(userId),
    db.streakFreezes.where("[userId+monthKey]").equals([userId, monthKey()]).count(),
  ]);

  const limit = subscription.isPremium ? STREAK_FREEZES_PER_MONTH : 0;
  return {
    allowed: subscription.isPremium,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    monthKey: monthKey(),
    plan: subscription.planId,
  };
}

/** Marca o uso de um congelamento (chamado quando a sequência seria perdida). */
export async function consumeStreakFreeze(userId) {
  const state = await getStreakFreezeState(userId);
  if (!state.allowed || state.remaining <= 0) {
    return { used: false, ...state };
  }
  await db.streakFreezes.add({
    userId,
    monthKey: state.monthKey,
    createdAt: new Date(),
  });
  return { used: true, ...(await getStreakFreezeState(userId)) };
}

/* ---------------------------- Funil do paywall ---------------------------- */

export async function trackPaywallEvent(userId, event, meta = {}) {
  try {
    await db.paywallEvents.add({ userId, event, meta, createdAt: new Date() });
  } catch {
    /* telemetria local nunca deve quebrar o fluxo */
  }
}

/* --------------------------- Visão consolidada --------------------------- */

export async function getBillingOverview(userId) {
  const [subscription, hearts, skins, weeklyChallenge, streakFreeze] = await Promise.all([
    getSubscription(userId),
    getHeartsState(userId),
    listSkins(userId),
    getWeeklyChallenge(userId),
    getStreakFreezeState(userId),
  ]);

  return {
    subscription,
    hearts,
    skins,
    weeklyChallenge,
    streakFreeze,
    plans: PLANS,
    features: FEATURE_LIST,
    freeHearts: FREE_HEARTS,
    heartRegenMs: HEART_REGEN_MS,
  };
}
