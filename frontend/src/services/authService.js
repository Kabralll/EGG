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
  const data = await api("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  })
  // Modo offline: não há caixa de entrada para receber o link, então o token é
  // gerado localmente e o app leva o usuário direto para a tela de redefinição.
  if (data && data.localToken && data.localToken !== "") {
    window.location.assign(`/reset-password/${data.localToken}`)
  }
  return data
}

export async function resetPassword(token, password) {
  return api("/auth/reset-password", {
    method: "POST",
    body: { token, password },
    auth: false,
  })
}
