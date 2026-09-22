import { api } from "./api"

export function getSubjects() {
  return api("/subjects")
}

export function getSubject(id) {
  return api(`/subjects/${id}`)
}
