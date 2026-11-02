import { Link } from "react-router-dom"
import { formatBRL, monthlyEquivalent } from "../offline/billing"

/* Peças de UI compartilhadas entre paywall, navbar, dashboard e perfil. */

const EGG_SIZES = {
  xs: "h-8 w-8 text-base",
  sm: "h-11 w-11 text-xl",
  md: "h-16 w-16 text-3xl",
  lg: "h-24 w-24 text-5xl",
  xl: "h-32 w-32 text-6xl",
}

const EGG_SHAPE = {
  borderRadius: "50% 50% 46% 46% / 62% 62% 38% 38%",
}

export function EggAvatar({ skin, size = "md", className = "" }) {
  const current = skin || {
    emoji: "🥚",
    gradient: "from-slate-100 via-slate-200 to-slate-400",
    name: "Ovo Clássico",
  }
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center bg-gradient-to-br ${current.gradient} shadow-inner ring-1 ring-black/5 ${EGG_SIZES[size] || EGG_SIZES.md} ${className}`}
      style={EGG_SHAPE}
      title={current.name}
      aria-label={current.name}
    >
      <span className="drop-shadow-sm">{current.emoji}</span>
    </span>
  )
}

function formatCountdown(ms) {
  if (!ms || ms <= 0) return "agora"
  const minutes = Math.ceil(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}min`
}

export function HeartsChip({ hearts, to = "/upgrade" }) {
  if (!hearts) return null

  if (hearts.unlimited) {
    return (
      <span
        className="chip bg-rose-50 text-rose-600 ring-1 ring-rose-200"
        title="Corações infinitos no plano Fora da Casca"
      >
        ❤️ ∞
      </span>
    )
  }

  const hint =
    hearts.hearts < hearts.max
      ? `Próximo coração em ${formatCountdown(hearts.nextInMs)}`
      : "Corações cheios — cada erro consome 1"

  return (
    <Link
      to={to}
      title={hint}
      className={`chip ring-1 transition hover:brightness-95 ${
        hearts.hearts > 0
          ? "bg-rose-50 text-rose-600 ring-rose-200"
          : "bg-rose-100 text-rose-700 ring-rose-300"
      }`}
    >
      ❤️ {hearts.hearts}/{hearts.max}
    </Link>
  )
}

export function ProBadge({ className = "" }) {
  return (
    <span
      className={`chip bg-gradient-to-r from-amber-300 to-[#f5d24c] text-amber-950 ring-1 ring-amber-300 ${className}`}
      title="Assinante Fora da Casca"
    >
      ✦ PRO
    </span>
  )
}

export function FeatureRow({ icon, label, included, hint }) {
  return (
    <li className="flex items-start gap-2.5 py-2">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          included ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        {included ? "✓" : "🔒"}
      </span>
      <div className="min-w-0">
        <p className={`text-sm ${included ? "text-slate-700" : "text-slate-400"}`}>
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </li>
  )
}

export function PaywallCard({
  icon = "🔒",
  title,
  description,
  bullets = [],
  cta = "Ver planos Fora da Casca",
  to = "/upgrade",
  compact = false,
}) {
  return (
    <div
      className={`card relative overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
      <div className="relative">
        <span className="text-3xl">{icon}</span>
        <h3 className={`mt-2 font-extrabold text-slate-900 ${compact ? "text-base" : "text-lg"}`}>
          {title}
        </h3>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        {bullets.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {bullets.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="text-emerald-600">✓</span>
                {item}
              </li>
            ))}
          </ul>
        )}
        <Link to={to} className="btn-primary mt-4 w-full sm:w-auto">
          {cta} →
        </Link>
      </div>
    </div>
  )
}

export function PlanCard({
  plan,
  ctaLabel,
  onChoose,
  featured = false,
  loading = false,
  current = false,
  disabled = false,
  footnote,
}) {
  const monthly = monthlyEquivalent(plan)
  const isFree = plan.priceCents === 0

  return (
    <div
      className={`card relative flex h-full flex-col overflow-hidden p-6 ${
        featured
          ? "border-transparent bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-pop ring-2 ring-[#f5d24c]"
          : ""
      }`}
    >
      {plan.badge && (
        <span className="absolute right-4 top-4 rounded-full bg-[#f5d24c] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-950">
          {plan.badge}
        </span>
      )}

      <p className={`text-xs font-bold uppercase tracking-widest ${featured ? "text-amber-300" : "text-slate-400"}`}>
        {isFree ? "Gratuito" : "Assinatura"}
      </p>
      <h3 className={`mt-1 text-xl font-extrabold ${featured ? "text-white" : "text-slate-900"}`}>
        {plan.name}
      </h3>
      <p className={`mt-1 text-sm ${featured ? "text-slate-300" : "text-slate-500"}`}>
        {plan.tagline}
      </p>

      <div className="mt-5 flex items-end gap-1.5">
        <span className={`text-3xl font-extrabold ${featured ? "text-white" : "text-slate-900"}`}>
          {isFree ? formatBRL(0) : formatBRL(plan.priceCents)}
        </span>
        <span className={`pb-1 text-xs ${featured ? "text-slate-400" : "text-slate-500"}`}>
          {plan.periodLabel}
        </span>
      </div>
      <p className={`mt-1 h-4 text-xs ${featured ? "text-slate-400" : "text-slate-400"}`}>
        {!isFree && monthly !== plan.priceCents ? `≈ ${formatBRL(monthly)}/mês` : ""}
      </p>

      {plan.trialDays > 0 && (
        <p className={`mt-3 text-xs font-semibold ${featured ? "text-amber-300" : "text-emerald-600"}`}>
          ✓ {plan.trialDays} dias grátis para testar
        </p>
      )}

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={onChoose}
          disabled={loading || disabled || current}
          className={`w-full ${featured ? "btn-primary" : "btn-secondary"}`}
        >
          {current ? "Seu plano atual" : loading ? "Processando..." : ctaLabel}
        </button>
        {footnote && (
          <p className={`mt-2 text-center text-[11px] ${featured ? "text-slate-400" : "text-slate-400"}`}>
            {footnote}
          </p>
        )}
      </div>
    </div>
  )
}
