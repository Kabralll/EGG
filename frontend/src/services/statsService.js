import { api } from "./api"

export function getDashboard() {
  return api("/dashboard")
}

export function getStats() {
  return api("/stats")
}
