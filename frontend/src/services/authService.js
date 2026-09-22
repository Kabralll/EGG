import { api } from "./api"

export function setSession(token) {
  localStorage.setItem("token", token)
}

export function clearSession() {
  localStorage.removeItem("token")
}

export function hasToken() {
  return Boolean(localStorage.getItem("token"))
}

export async function login(form) {
  const data = await api("/auth/login", { method: "POST", body: form, auth: false })
  setSession(data.token)
  return data.user
}

export async function register(form) {
  const data = await api("/auth/register", { method: "POST", body: form, auth: false })
  setSession(data.token)
  return data.user
}

export async function getProfile() {
  return api("/user")
}

export async function updateProfile(form) {
  return api("/user", { method: "PATCH", body: form })
}

export async function forgotPassword(email) {
  return api("/auth/forgot-password", { method: "POST", body: { email }, auth: false })
}

export async function resetPassword(token, password) {
  return api("/auth/reset-password", {
    method: "POST",
    body: { token, password },
    auth: false,
  })
}
