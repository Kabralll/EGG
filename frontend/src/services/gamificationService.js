import { api } from "./api"

export function getAchievements() {
  return api("/achievements")
}

export function getDailyChallenge() {
  return api("/daily-challenge")
}

export function getRanking(scope = "general") {
  return api(`/ranking?scope=${scope}`)
}
