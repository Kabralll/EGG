import { api } from "./api"

/* Amizades, grupos de estudo e ranking local entre grupos. */

export function getSocialOverview() {
  return api("/social/overview")
}

export function searchStudents(query) {
  return api(`/social/search?q=${encodeURIComponent(query || "")}`)
}

export function sendFriendRequest(targetId) {
  return api("/social/friends/requests", {
    method: "POST",
    body: { targetId },
  })
}

export function respondFriendRequest(requestId, action) {
  return api(`/social/friends/requests/${requestId}/respond`, {
    method: "POST",
    body: { action },
  })
}

export function cancelFriendRequest(requestId) {
  return api(`/social/friends/requests/${requestId}`, { method: "DELETE" })
}

export function removeFriend(friendId) {
  return api(`/social/friends/${friendId}`, { method: "DELETE" })
}

export function createGroup(data) {
  return api("/social/groups", { method: "POST", body: data })
}

export function getGroup(groupId, scope = "general") {
  return api(`/social/groups/${groupId}?scope=${scope}`)
}

export function getGroupRanking(scope = "general") {
  return api(`/social/groups/ranking?scope=${scope}`)
}

export function inviteToGroup(groupId, targetId) {
  return api(`/social/groups/${groupId}/invites`, {
    method: "POST",
    body: { targetId },
  })
}

export function respondGroupInvite(inviteId, action) {
  return api(`/social/groups/invites/${inviteId}/respond`, {
    method: "POST",
    body: { action },
  })
}

export function leaveGroup(groupId) {
  return api(`/social/groups/${groupId}/leave`, { method: "POST" })
}

export function removeGroupMember(groupId, memberId) {
  return api(`/social/groups/${groupId}/members/${memberId}`, {
    method: "DELETE",
  })
}

export function deleteGroup(groupId) {
  return api(`/social/groups/${groupId}`, { method: "DELETE" })
}
