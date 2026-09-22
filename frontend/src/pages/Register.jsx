import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const INITIAL = { name: "", nickname: "", email: "", password: "", confirmPassword: "" }

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
    setFieldErrors({})
  }

  function validate() {
    const errors = {}
    if (form.name.trim().length < 2) errors.name = "Informe seu nome"
    if (form.nickname.trim().length < 2) errors.nickname = "Escolha um apelido"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "E-mail inválido"
    if (form.password.length < 6) errors.password = "Mínimo de 6 caracteres"
    if (form.password !== form.confirmPassword) errors.confirmPassword = "As senhas não conferem"
    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      await register({
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err.message)
      if (err.fields) setFieldErrors(err.fields)
    } finally {
      setLoading(false)
    }
  }

  const err = (name) =>
    fieldErrors[name] && (
      <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors[name]}</p>
    )

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl">
            🥚
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            Crie sua conta
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Comece a ganhar XP já na primeira questão.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              className={`input ${fieldErrors.name ? "input-error" : ""}`}
              placeholder="Como devem te chamar"
              value={form.name}
              onChange={handleChange}
            />
            {err("name")}
          </div>

          <div>
            <label className="label" htmlFor="nickname">
              Apelido (exibido no ranking)
            </label>
            <input
              id="nickname"
              name="nickname"
              className={`input ${fieldErrors.nickname ? "input-error" : ""}`}
              placeholder="seu_apelido"
              value={form.nickname}
              onChange={handleChange}
            />
            {err("nickname")}
          </div>

          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`input ${fieldErrors.email ? "input-error" : ""}`}
              placeholder="voce@email.com"
              value={form.email}
              onChange={handleChange}
            />
            {err("email")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className={`input ${fieldErrors.password ? "input-error" : ""}`}
                placeholder="mín. 6 caracteres"
                value={form.password}
                onChange={handleChange}
              />
              {err("password")}
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`input ${fieldErrors.confirmPassword ? "input-error" : ""}`}
                placeholder="repita a senha"
                value={form.confirmPassword}
                onChange={handleChange}
              />
              {err("confirmPassword")}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? "Criando conta..." : "Criar conta e começar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
