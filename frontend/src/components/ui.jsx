/* Componentes básicos de UI reutilizados em toda a plataforma */

export function Spinner({ size = "md", label }) {
  const sizes = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-12 w-12" }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2 border-slate-200 border-t-brand-500`}
      />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  )
}

export function LoadingScreen({ label = "Carregando..." }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  )
}

export function EmptyState({ icon = "📭", title, message, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-3 font-bold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="text-4xl">⚠️</span>
      <h3 className="mt-3 font-bold text-slate-800">Algo deu errado</h3>
      <p className="mt-1 text-sm text-slate-500">{message || "Tente novamente em instantes."}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function ProgressBar({ percent = 0, color = "brand", size = "md", label }) {
  const barColor =
    {
      brand: "from-[#f5d24c] to-[#f5d24c]",
      emerald: "from-emerald-400 to-emerald-600",
      indigo: "from-indigo-400 to-indigo-600",
      rose: "from-rose-400 to-rose-600",
      sky: "from-sky-400 to-sky-600",
    }[color] || "from-brand-400 to-brand-600"
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2"

  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className="font-semibold text-slate-700">{Math.round(percent)}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-slate-200 ${height}`}>
        <div
          className={`${height} rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}

export function StatCard({ icon, label, value, hint, accent = "brand" }) {
  const accents = {
    brand: "bg-[#f5d24c] text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <div className="card flex items-center gap-3 p-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
          accents[accent] || accents.brand
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-xl font-bold text-slate-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function difficultyLabel(d) {
  return { facil: "Fácil", media: "Média", dificil: "Difícil" }[d] || d
}

export function difficultyStyle(d) {
  return {
    facil: "bg-emerald-100 text-emerald-700",
    media: "bg-amber-100 text-amber-700",
    dificil: "bg-rose-100 text-rose-700",
  }[d] || "bg-slate-100 text-slate-600"
}
