import { db, apiError } from "./db";
import { levelFromXp } from "./gamification";
import { startOfWeek } from "./date";

/*
  Comunidade local: amizades, pequenos grupos de estudo, convites e ranking
  entre os grupos do próprio estudante.

  Tudo roda sobre o IndexedDB porque o app funciona sem servidor. Nesse modo,
  "amigos" são os outros perfis cadastrados neste aparelho — o que permite
  testar o fluxo completo trocando de conta. Os rankings usam o XP real de
  cada perfil (total e semanal), nunca dados inventados.
*/

export const MAX_GROUP_MEMBERS = 12;

function friendshipPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

function publicUser(user, weeklyXp = 0) {
  const xp = user.xp || 0;
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    xp,
    weeklyXp,
    level: levelFromXp(xp),
    streak: user.streak || 0,
    skinId: user.skinId || "classic",
  };
}

async function weeklyXpMap() {
  const from = startOfWeek();
  const transactions = await db.xpTransactions
    .where("createdAt")
    .aboveOrEqual(from)
    .toArray();
  const map = new Map();
  for (const t of transactions) {
    map.set(t.userId, (map.get(t.userId) || 0) + t.amount);
  }
  return map;
}

function relationFor(friendships, userId, otherId) {
  const [a, b] = friendshipPair(userId, otherId);
  const row = friendships.find(
    (f) => f.userAId === a && f.userBId === b
  );
  if (!row) return "none";
  if (row.status === "accepted") return "friend";
  return row.requesterId === userId ? "pending_out" : "pending_in";
}

function summarizeGroup(group, memberRows, userById, weekly, viewerId) {
  const members = memberRows
    .map((membership) => ({
      membership,
      user: userById.get(membership.userId),
    }))
    .filter((row) => row.user);

  const totalXp = members.reduce((sum, row) => sum + (row.user.xp || 0), 0);
  const weeklyXp = members.reduce(
    (sum, row) => sum + (weekly.get(row.user.id) || 0),
    0
  );
  const top = [...members].sort(
    (a, b) => (b.user.xp || 0) - (a.user.xp || 0)
  )[0];
  const myMembership = memberRows.find((m) => m.userId === viewerId);

  return {
    id: group.id,
    name: group.name,
    emoji: group.emoji || "👥",
    description: group.description || "",
    ownerId: group.ownerId,
    createdAt: group.createdAt,
    memberCount: members.length,
    totalXp,
    weeklyXp,
    averageXp:
      members.length > 0 ? Math.round(totalXp / members.length) : 0,
    topMember: top
      ? {
          id: top.user.id,
          nickname: top.user.nickname,
          xp: top.user.xp || 0,
        }
      : null,
    myRole: myMembership ? myMembership.role : null,
  };
}

export async function getSocialOverview(userId) {
  const [users, friendships, groups, memberships, invites, weekly] =
    await Promise.all([
      db.users.toArray(),
      db.friendships.toArray(),
      db.studyGroups.toArray(),
      db.groupMembers.toArray(),
      db.groupInvites.toArray(),
      weeklyXpMap(),
    ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const me = userById.get(userId);
  if (!me) throw apiError(404, "Usuário não encontrado");

  const students = users.filter((u) => u.role === "STUDENT");

  const accepted = friendships.filter(
    (f) =>
      f.status === "accepted" &&
      (f.userAId === userId || f.userBId === userId)
  );
  const friendIds = new Set(
    accepted.map((f) => (f.userAId === userId ? f.userBId : f.userAId))
  );

  const friends = students
    .filter((u) => friendIds.has(u.id))
    .map((u) => publicUser(u, weekly.get(u.id) || 0))
    .sort((a, b) => b.xp - a.xp || a.nickname.localeCompare(b.nickname, "pt-BR"));

  const incomingRows = friendships
    .filter((f) => f.status === "pending" && f.addresseeId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const incoming = [];
  for (const row of incomingRows) {
    const user = userById.get(row.requesterId);
    if (!user) continue;
    incoming.push({
      id: row.id,
      createdAt: row.createdAt,
      user: publicUser(user, weekly.get(user.id) || 0),
    });
  }

  const outgoingRows = friendships
    .filter((f) => f.status === "pending" && f.requesterId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const outgoing = [];
  for (const row of outgoingRows) {
    const user = userById.get(row.addresseeId);
    if (!user) continue;
    outgoing.push({
      id: row.id,
      createdAt: row.createdAt,
      user: publicUser(user, weekly.get(user.id) || 0),
    });
  }

  const relatedIds = new Set();
  for (const row of friendships) {
    if (row.userAId === userId) relatedIds.add(row.userBId);
    if (row.userBId === userId) relatedIds.add(row.userAId);
  }
  const suggestions = students
    .filter((u) => u.id !== userId && !relatedIds.has(u.id))
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, 8)
    .map((u) => publicUser(u, weekly.get(u.id) || 0));

  const myMemberships = memberships.filter((m) => m.userId === userId);
  const myGroupIds = new Set(myMemberships.map((m) => m.groupId));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const invitesByGroup = new Map();
  for (const invite of invites) {
    if (!invitesByGroup.has(invite.groupId)) invitesByGroup.set(invite.groupId, 0);
    invitesByGroup.set(invite.groupId, invitesByGroup.get(invite.groupId) + 1);
  }

  const groupSummaries = groups
    .filter((g) => myGroupIds.has(g.id))
    .map((group) => ({
      ...summarizeGroup(
        group,
        memberships.filter((m) => m.groupId === group.id),
        userById,
        weekly,
        userId
      ),
      pendingInvites: invitesByGroup.get(group.id) || 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  const groupInvites = invites
    .filter((i) => i.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((invite) => {
      const group = groupById.get(invite.groupId);
      const from = userById.get(invite.fromUserId);
      if (!group) return null;
      return {
        id: invite.id,
        createdAt: invite.createdAt,
        group: {
          id: group.id,
          name: group.name,
          emoji: group.emoji || "👥",
          description: group.description || "",
          memberCount: memberships.filter((m) => m.groupId === group.id).length,
        },
        from: from ? publicUser(from, weekly.get(from.id) || 0) : null,
      };
    })
    .filter(Boolean);

  return {
    me: publicUser(me, weekly.get(userId) || 0),
    stats: {
      friends: friends.length,
      incomingRequests: incoming.length,
      groups: groupSummaries.length,
      groupInvites: groupInvites.length,
    },
    friends,
    incoming,
    outgoing,
    suggestions,
    groups: groupSummaries,
    groupInvites,
  };
}

/**
 * Ranking local apenas com os grupos do próprio estudante. O XP é real:
 * soma do XP de todos os integrantes (geral) ou do XP ganho na semana.
 */
export async function getGroupRanking(userId, scope = "general") {
  const { groups } = await getSocialOverview(userId);
  const weekly = scope === "weekly";

  const entries = [...groups]
    .sort(
      (a, b) =>
        (weekly ? b.weeklyXp - a.weeklyXp : b.totalXp - a.totalXp) ||
        b.averageXp - a.averageXp ||
        a.name.localeCompare(b.name, "pt-BR")
    )
    .map((group, index) => ({ position: index + 1, ...group }));

  return {
    scope: weekly ? "weekly" : "general",
    total: entries.length,
    entries,
  };
}

export async function searchStudents(userId, query) {
  const [users, friendships, weekly] = await Promise.all([
    db.users.toArray(),
    db.friendships.toArray(),
    weeklyXpMap(),
  ]);
  const q = String(query || "").trim().toLowerCase();

  const results = users
    .filter((u) => u.role === "STUDENT" && u.id !== userId)
    .filter((u) => {
      if (!q) return true;
      return (
        u.nickname.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const score = (u) => {
        const nickname = u.nickname.toLowerCase();
        const name = u.name.toLowerCase();
        if (nickname === q) return 0;
        if (nickname.startsWith(q)) return 1;
        if (name.startsWith(q)) return 2;
        return 3;
      };
      return (
        score(a) - score(b) ||
        (b.xp || 0) - (a.xp || 0) ||
        a.nickname.localeCompare(b.nickname, "pt-BR")
      );
    })
    .slice(0, 12);

  return results.map((u) => ({
    ...publicUser(u, weekly.get(u.id) || 0),
    relation: relationFor(friendships, userId, u.id),
  }));
}

export async function sendFriendRequest(userId, targetId) {
  const id = Number(targetId);
  if (!Number.isInteger(id) || id === userId) {
    throw apiError(400, "Escolha outro estudante para adicionar.");
  }

  const target = await db.users.get(id);
  if (!target || target.role !== "STUDENT") {
    throw apiError(404, "Estudante não encontrado.");
  }

  const [a, b] = friendshipPair(userId, id);
  const existing = await db.friendships
    .where("[userAId+userBId]")
    .equals([a, b])
    .first();

  if (existing) {
    if (existing.status === "accepted") {
      throw apiError(409, "Vocês já são amigos.");
    }
    if (existing.requesterId === userId) {
      throw apiError(409, "Pedido já enviado. Aguarde a resposta.");
    }
    // O outro já tinha convidado você: aceitar reciprocamente é o fluxo
    // esperado e evita dois pedidos cruzados.
    await db.friendships.update(existing.id, {
      status: "accepted",
      respondedAt: new Date(),
    });
    return { message: "Pedido aceito: vocês agora são amigos!" };
  }

  await db.friendships.add({
    userAId: a,
    userBId: b,
    requesterId: userId,
    addresseeId: id,
    status: "pending",
    createdAt: new Date(),
    respondedAt: null,
  });

  return { message: "Pedido de amizade enviado." };
}

export async function cancelFriendRequest(userId, friendshipId) {
  const request = await db.friendships.get(Number(friendshipId));
  if (!request || request.status !== "pending") {
    throw apiError(404, "Pedido de amizade não encontrado.");
  }
  if (request.requesterId !== userId) {
    throw apiError(403, "Você só pode cancelar pedidos que enviou.");
  }

  await db.friendships.delete(request.id);
  return { message: "Pedido cancelado." };
}

export async function respondFriendRequest(userId, friendshipId, action) {  const request = await db.friendships.get(Number(friendshipId));
  if (!request || request.status !== "pending") {
    throw apiError(404, "Pedido de amizade não encontrado.");
  }
  if (request.addresseeId !== userId) {
    throw apiError(403, "Este pedido não é para você.");
  }

  if (action === "accept") {
    await db.friendships.update(request.id, {
      status: "accepted",
      respondedAt: new Date(),
    });
    return { message: "Amizade aceita!" };
  }

  if (action === "decline") {
    await db.friendships.delete(request.id);
    return { message: "Pedido recusado." };
  }

  throw apiError(400, "Ação inválida.");
}

export async function removeFriend(userId, friendId) {
  const [a, b] = friendshipPair(userId, Number(friendId));
  const friendship = await db.friendships
    .where("[userAId+userBId]")
    .equals([a, b])
    .first();

  if (!friendship || friendship.status !== "accepted") {
    throw apiError(404, "Amizade não encontrada.");
  }

  await db.friendships.delete(friendship.id);
  return { message: "Amizade removida." };
}

export async function createGroup(userId, data) {
  const user = await db.users.get(userId);
  if (!user || user.role !== "STUDENT") {
    throw apiError(403, "Apenas estudantes podem criar grupos.");
  }

  const name = String(data?.name || "").trim();
  if (name.length < 3 || name.length > 40) {
    throw apiError(400, "O nome do grupo precisa ter entre 3 e 40 caracteres.");
  }

  const description = String(data?.description || "").trim().slice(0, 160);
  const emoji = String(data?.emoji || "👥").trim().slice(0, 8) || "👥";
  const now = new Date();

  const groupId = await db.studyGroups.add({
    name,
    description,
    emoji,
    ownerId: userId,
    createdAt: now,
  });

  await db.groupMembers.add({
    groupId,
    userId,
    role: "OWNER",
    joinedAt: now,
  });

  return {
    id: groupId,
    name,
    description,
    emoji,
    ownerId: userId,
    message: "Grupo criado! Agora convide seus amigos.",
  };
}

export async function getGroupDetail(userId, groupId, scope = "general") {
  const id = Number(groupId);
  const group = await db.studyGroups.get(id);
  if (!group) throw apiError(404, "Grupo não encontrado.");

  const [users, memberships, invites, friendships, weekly] = await Promise.all([
    db.users.toArray(),
    db.groupMembers.where("groupId").equals(id).toArray(),
    db.groupInvites.where("groupId").equals(id).toArray(),
    db.friendships.toArray(),
    weeklyXpMap(),
  ]);

  const myMembership = memberships.find((m) => m.userId === userId);
  if (!myMembership) {
    throw apiError(403, "Você não participa deste grupo.");
  }

  const userById = new Map(users.map((u) => [u.id, u]));
  const summary = summarizeGroup(
    group,
    memberships,
    userById,
    weekly,
    userId
  );

  const rankedScope = scope === "weekly" ? "weekly" : "general";
  const members = memberships
    .map((membership) => {
      const user = userById.get(membership.userId);
      if (!user) return null;
      return {
        id: user.id,
        nickname: user.nickname,
        name: user.name,
        role: membership.role,
        joinedAt: membership.joinedAt,
        xp: user.xp || 0,
        weeklyXp: weekly.get(user.id) || 0,
        level: levelFromXp(user.xp || 0),
        streak: user.streak || 0,
        isMe: user.id === userId,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      rankedScope === "weekly"
        ? b.weeklyXp - a.weeklyXp || b.xp - a.xp
        : b.xp - a.xp || a.nickname.localeCompare(b.nickname, "pt-BR")
    )
    .map((member, index) => ({ position: index + 1, ...member }));

  const memberIds = new Set(memberships.map((m) => m.userId));
  const invitedIds = new Set(invites.map((i) => i.userId));
  const friendIds = new Set(
    friendships
      .filter(
        (f) =>
          f.status === "accepted" &&
          (f.userAId === userId || f.userBId === userId)
      )
      .map((f) => (f.userAId === userId ? f.userBId : f.userAId))
  );

  const inviteCandidates = users
    .filter(
      (u) =>
        u.role === "STUDENT" &&
        friendIds.has(u.id) &&
        !memberIds.has(u.id) &&
        !invitedIds.has(u.id)
    )
    .map((u) => publicUser(u, weekly.get(u.id) || 0))
    .sort((a, b) => b.xp - a.xp);

  const pendingInvites = invites
    .map((invite) => {
      const user = userById.get(invite.userId);
      const from = userById.get(invite.fromUserId);
      if (!user) return null;
      return {
        id: invite.id,
        createdAt: invite.createdAt,
        user: publicUser(user, weekly.get(user.id) || 0),
        from: from ? publicUser(from, weekly.get(from.id) || 0) : null,
      };
    })
    .filter(Boolean);

  return {
    ...summary,
    scope: rankedScope,
    members,
    inviteCandidates,
    pendingInvites,
    canManage: group.ownerId === userId,
    isOwner: group.ownerId === userId,
    myRole: myMembership.role,
    maxMembers: MAX_GROUP_MEMBERS,
  };
}

export async function inviteToGroup(userId, groupId, targetId) {
  const id = Number(groupId);
  const target = Number(targetId);
  const group = await db.studyGroups.get(id);
  if (!group) throw apiError(404, "Grupo não encontrado.");
  if (!Number.isInteger(target) || target === userId) {
    throw apiError(400, "Escolha um amigo para convidar.");
  }

  const membership = await db.groupMembers
    .where("[groupId+userId]")
    .equals([id, userId])
    .first();
  if (!membership) {
    throw apiError(403, "Você não participa deste grupo.");
  }

  const targetUser = await db.users.get(target);
  if (!targetUser || targetUser.role !== "STUDENT") {
    throw apiError(404, "Estudante não encontrado.");
  }

  const [a, b] = friendshipPair(userId, target);
  const friendship = await db.friendships
    .where("[userAId+userBId]")
    .equals([a, b])
    .first();
  if (!friendship || friendship.status !== "accepted") {
    throw apiError(403, "Só é possível convidar pessoas que são suas amigas.");
  }

  const alreadyMember = await db.groupMembers
    .where("[groupId+userId]")
    .equals([id, target])
    .first();
  if (alreadyMember) {
    throw apiError(409, "Esta pessoa já participa do grupo.");
  }

  const existingInvite = await db.groupInvites
    .where("[groupId+userId]")
    .equals([id, target])
    .first();
  if (existingInvite) {
    throw apiError(409, "Convite já enviado para esta pessoa.");
  }

  const memberCount = await db.groupMembers
    .where("groupId")
    .equals(id)
    .count();
  if (memberCount >= MAX_GROUP_MEMBERS) {
    throw apiError(
      409,
      `O grupo já atingiu o limite de ${MAX_GROUP_MEMBERS} integrantes.`
    );
  }

  await db.groupInvites.add({
    groupId: id,
    userId: target,
    fromUserId: userId,
    createdAt: new Date(),
  });

  return { message: `Convite enviado para ${targetUser.nickname}.` };
}

export async function respondGroupInvite(userId, inviteId, action) {
  const invite = await db.groupInvites.get(Number(inviteId));
  if (!invite || invite.userId !== userId) {
    throw apiError(404, "Convite não encontrado.");
  }

  if (action === "decline") {
    await db.groupInvites.delete(invite.id);
    return { message: "Convite recusado." };
  }

  if (action !== "accept") {
    throw apiError(400, "Ação inválida.");
  }

  const group = await db.studyGroups.get(invite.groupId);
  if (!group) {
    await db.groupInvites.delete(invite.id);
    throw apiError(404, "O grupo não existe mais.");
  }

  const alreadyMember = await db.groupMembers
    .where("[groupId+userId]")
    .equals([invite.groupId, userId])
    .first();
  if (alreadyMember) {
    await db.groupInvites.delete(invite.id);
    return { message: "Você já participa deste grupo." };
  }

  const memberCount = await db.groupMembers
    .where("groupId")
    .equals(invite.groupId)
    .count();
  if (memberCount >= MAX_GROUP_MEMBERS) {
    throw apiError(
      409,
      `O grupo já atingiu o limite de ${MAX_GROUP_MEMBERS} integrantes.`
    );
  }

  await db.groupMembers.add({
    groupId: invite.groupId,
    userId,
    role: "MEMBER",
    joinedAt: new Date(),
  });
  await db.groupInvites.delete(invite.id);

  return {
    message: `Você entrou no grupo ${group.name}!`,
    groupId: group.id,
  };
}

export async function leaveGroup(userId, groupId) {
  const id = Number(groupId);
  const group = await db.studyGroups.get(id);
  if (!group) throw apiError(404, "Grupo não encontrado.");

  const membership = await db.groupMembers
    .where("[groupId+userId]")
    .equals([id, userId])
    .first();
  if (!membership) {
    throw apiError(404, "Você não participa deste grupo.");
  }

  await db.groupMembers.delete(membership.id);

  if (group.ownerId === userId) {
    const others = (
      await db.groupMembers.where("groupId").equals(id).toArray()
    ).sort(
      (a, b) => new Date(a.joinedAt) - new Date(b.joinedAt) || a.id - b.id
    );

    if (others.length === 0) {
      await db.groupInvites.where("groupId").equals(id).delete();
      await db.studyGroups.delete(id);
      return { message: "Você saiu e o grupo foi encerrado.", deleted: true };
    }

    const next = others[0];
    await db.studyGroups.update(id, { ownerId: next.userId });
    await db.groupMembers.update(next.id, { role: "OWNER" });
    return {
      message: "Você saiu do grupo. A liderança passou para outro integrante.",
      deleted: false,
    };
  }

  return { message: "Você saiu do grupo.", deleted: false };
}

export async function removeGroupMember(ownerId, groupId, memberId) {
  const id = Number(groupId);
  const member = Number(memberId);
  const group = await db.studyGroups.get(id);
  if (!group) throw apiError(404, "Grupo não encontrado.");
  if (group.ownerId !== ownerId) {
    throw apiError(403, "Apenas o líder pode remover integrantes.");
  }
  if (member === ownerId) {
    throw apiError(400, "O líder não pode remover a própria conta.");
  }

  const membership = await db.groupMembers
    .where("[groupId+userId]")
    .equals([id, member])
    .first();
  if (!membership) {
    throw apiError(404, "Integrante não encontrado.");
  }

  await db.groupMembers.delete(membership.id);
  return { message: "Integrante removido do grupo." };
}

export async function deleteGroup(userId, groupId) {
  const id = Number(groupId);
  const group = await db.studyGroups.get(id);
  if (!group) throw apiError(404, "Grupo não encontrado.");
  if (group.ownerId !== userId) {
    throw apiError(403, "Apenas o líder pode excluir o grupo.");
  }

  await db.groupInvites.where("groupId").equals(id).delete();
  await db.groupMembers.where("groupId").equals(id).delete();
  await db.studyGroups.delete(id);

  return { message: "Grupo excluído." };
}
