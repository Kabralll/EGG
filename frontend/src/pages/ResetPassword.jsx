import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { resetPassword } from "../services/authService"

export default function ResetPassword() {
  const { token } = useParams()
  const [form, setForm] = useState({ password: "", confirmPassword: "" })
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.")
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não conferem.")
      return
    }

    setLoading(true)
    setError("")
    try {
      await resetPassword(token, form.password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 sm:p-8">
        {done ? (
          <div className="text-center">
            <span className="text-4xl">✅</span>
            <h1 className="mt-3 text-xl font-extrabold text-slate-900">Senha alterada!</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sua senha foi redefinida com sucesso. Já pode entrar na plataforma.
            </p>
            <Link to="/login" className="btn-primary mt-6 w-full">
              Fazer login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="text-4xl">🔐</span>
              <h1 className="mt-3 text-xl font-extrabold text-slate-900">Nova senha</h1>
              <p className="mt-2 text-sm text-slate-600">Escolha uma senha segura para sua conta.</p>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="password">
                  Nova senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  placeholder="mín. 6 caracteres"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label" htmlFor="confirmPassword">
                  Confirmar nova senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  placeholder="repita a senha"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
