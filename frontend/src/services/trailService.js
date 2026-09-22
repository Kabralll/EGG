import { api } from "./api"

export function getTrails() {
  return api("/trails")
}

export function getTrail(id) {
  return api(`/trails/${id}`)
}
