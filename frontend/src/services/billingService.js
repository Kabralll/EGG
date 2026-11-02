import { api } from "./api"

/*
  Camada de serviço da monetização. Mesmos caminhos que o backend Express
  exporia; no modo local são resolvidos pelo `offline/billing.js`.
*/

export function getBillingOverview() {
  return api("/billing/overview")
}

export function getSubscription() {
  return api("/billing/subscription")
}

export function checkout(planId) {
  return api("/billing/checkout", { method: "POST", body: { planId } })
}

export function cancelSubscription() {
  return api("/billing/cancel", { method: "POST" })
}

export function checkAccess(feature) {
  return api(`/billing/access?feature=${encodeURIComponent(feature)}`)
}

export function getHearts() {
  return api("/billing/hearts")
}

export function listSkins() {
  return api("/billing/skins")
}

export function equipSkin(skinId) {
  return api(`/billing/skins/${skinId}/equip`, { method: "POST" })
}

export function getWeeklyChallenge() {
  return api("/billing/weekly-challenge")
}

export function claimWeeklyChallenge() {
  return api("/billing/weekly-challenge/claim", { method: "POST" })
}

export function trackPaywallEvent(event, meta = {}) {
  return api("/billing/events", { method: "POST", body: { event, meta } })
}
