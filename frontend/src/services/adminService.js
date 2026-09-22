import { api } from "./api"

/* Visão geral e usuários */
export function getOverview() {
  return api("/admin/overview")
}

export function getUsers() {
  return api("/admin/users")
}

export function setUserRole(userId, role) {
  return api(`/admin/users/${userId}/role`, { method: "PATCH", body: { role } })
}

/* Disciplinas */
export function createSubject(data) {
  return api("/admin/subjects", { method: "POST", body: data })
}

export function updateSubject(id, data) {
  return api(`/admin/subjects/${id}`, { method: "PATCH", body: data })
}

export function deleteSubject(id) {
  return api(`/admin/subjects/${id}`, { method: "DELETE" })
}

/* Assuntos */
export function createTopic(data) {
  return api("/admin/topics", { method: "POST", body: data })
}

export function updateTopic(id, data) {
  return api(`/admin/topics/${id}`, { method: "PATCH", body: data })
}

export function deleteTopic(id) {
  return api(`/admin/topics/${id}`, { method: "DELETE" })
}

/* Questões */
export function getQuestions(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value)
  })
  const qs = query.toString()
  return api(`/admin/questions${qs ? `?${qs}` : ""}`)
}

export function createQuestion(data) {
  return api("/admin/questions", { method: "POST", body: data })
}

export function updateQuestion(id, data) {
  return api(`/admin/questions/${id}`, { method: "PATCH", body: data })
}

export function deleteQuestion(id) {
  return api(`/admin/questions/${id}`, { method: "DELETE" })
}

/* Trilhas */
export function getTrailsAdmin() {
  return api("/admin/trails")
}

export function createTrail(data) {
  return api("/admin/trails", { method: "POST", body: data })
}

export function updateTrail(id, data) {
  return api(`/admin/trails/${id}`, { method: "PATCH", body: data })
}

export function deleteTrail(id) {
  return api(`/admin/trails/${id}`, { method: "DELETE" })
}
