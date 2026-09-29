import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError("Preencha e-mail e senha.")
      return
    }

    setLoading(true)
    setError("")
    try {
      await login(form)
      navigate(location.state?.from || "/dashboard", { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
            <img src="/img/EggoLogo.png" alt="EggoLogo" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            Bem-vindo de volta
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Entre para continuar sua jornada de estudos.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="voce@email.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <Link to="/forgot-password" className="text-[#f5d24c] hover:underline">
            Esqueci minha senha
          </Link>
          <p className="text-slate-500">
            Ainda não tem conta?{" "}
            <Link to="/register" className="font-semibold text-[#f5d24c] hover:underline">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Dica de demonstração — admin: admin@egg.com / admin123
      </p>
    </div>
  )
}
