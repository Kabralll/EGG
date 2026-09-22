import { useState } from "react"
import { Link } from "react-router-dom"
import { forgotPassword } from "../services/authService"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) {
      setError("Informe seu e-mail.")
      return
    }

    setLoading(true)
    setError("")
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <span className="text-4xl">📬</span>
            <h1 className="mt-3 text-xl font-extrabold text-slate-900">Verifique seu e-mail</h1>
            <p className="mt-2 text-sm text-slate-600">
              Se existir uma conta associada a <strong>{email}</strong>, enviaremos um link para
              redefinir sua senha (válido por 30 minutos).
            </p>
            <Link to="/login" className="btn-primary mt-6 w-full">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="text-4xl">🔑</span>
              <h1 className="mt-3 text-xl font-extrabold text-slate-900">Recuperar senha</h1>
              <p className="mt-2 text-sm text-slate-600">
                Informe o e-mail da sua conta e enviaremos as instruções.
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
                  type="email"
                  className="input"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                {loading ? "Enviando..." : "Enviar instruções"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              Lembrou a senha?{" "}
              <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
