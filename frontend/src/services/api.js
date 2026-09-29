import { localApi } from "../offline/localApi"

/*
  Camada única de acesso aos dados.

  ── Modo "local" (PADRÃO) — 100% offline ────────────────────────────────
  Nada de servidor: `localApi` resolve os MESMOS caminhos que o backend
  Express expunha ("/dashboard", "/questions/practice", "/admin/questions"...)
  contra o IndexedDB do próprio aparelho (frontend/src/offline/*).
  Consequência: nenhum componente/página precisou mudar.

  ── Modo "http" (legado) ────────────────────────────────────────────────
  REACT_APP_DATA_MODE=http volta ao `fetch` de antes: no dev pelo proxy do
  CRA, no build pela produção com IP fixo.

  Configure em .env / .env.production.
*/
export const MODE = process.env.REACT_APP_DATA_MODE || "local"
export const BASE_URL = process.env.REACT_APP_API_URL || ""

/* Erros com o mesmo formato que o backend devolvia: message + fields. */
function toError(data, status) {
  const error = new Error((data && data.error) || "Erro inesperado. Tente novamente.")
  error.status = status
  error.fields = data && data.fields
  return error
}

/* Sessão expirada em área logada → limpa e manda para o login. */
function clearExpiredSession(path, auth) {
  if (auth && !path.startsWith("/auth")) {
    localStorage.removeItem("token")
    if (window.location.pathname !== "/login") {
      window.location.assign("/login")
    }
  }
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const options = { method, body, auth }

  if (MODE !== "http") {
    try {
      return await localApi(path, options)
    } catch (error) {
      if (error && error.status === 401) clearExpiredSession(path, auth)
      throw error
    }
  }

  const headers = {
    "Content-Type": "application/json",
    // O proxy do CRA (dev) só repassa para o backend requisições GET cujo
    // `Accept` NÃO contenha "text/html" — sem isto, um GET da API poderia
    // receber o index.html do SPA em vez da resposta da API.
    Accept: "application/json",
  }
  const token = localStorage.getItem("token")
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error("Não foi possível conectar ao servidor")
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    /* resposta sem JSON */
  }

  if (!res.ok) {
    clearExpiredSession(path, auth)
    throw toError(data, res.status)
  }

  return data
}
