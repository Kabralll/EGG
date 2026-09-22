const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000"

/*
  Camada única de acesso à API.
  - injeta o token automaticamente
  - normaliza erros (message + fields de validação)
  - desloga em caso de 401 fora do fluxo de login
*/
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const token = localStorage.getItem("token")
  const headers = { "Content-Type": "application/json" }
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
    // Sessão expirada em área logada → limpa e manda para o login
    if (res.status === 401 && auth && !path.startsWith("/auth")) {
      localStorage.removeItem("token")
      if (window.location.pathname !== "/login") {
        window.location.assign("/login")
      }
    }

    const error = new Error(data?.error || "Erro inesperado. Tente novamente.")
    error.status = res.status
    error.fields = data?.fields
    throw error
  }

  return data
}

export { BASE_URL }
