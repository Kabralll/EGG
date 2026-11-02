import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useSubscription } from "../context/SubscriptionContext"
import { useToast } from "../context/ToastContext"
import { EggAvatar, PlanCard, ProBadge } from "../components/premium"
import {
  FEATURE_LIST,
  PLANS,
  SKINS,
  formatBRL,
  monthlyEquivalent,
} from "../offline/billing"

const STATUS_LABEL = {
  free: "Plano gratuito",
  active: "Assinatura ativa",
  trialing: "Período de teste",
  canceled: "Cancelada — acesso até o fim do período",
  expired: "Assinatura expirada",
}

const FAQ = [
  {
    q: "O que acontece quando meus corações acabam?",
    a: "Você continua com acesso ao conteúdo já respondido e às estatísticas, mas não inicia novas sessões de prática até um coração regenerar (1 a cada 30 minutos) ou até assinar o Fora da Casca.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Ao cancelar, você mantém todos os benefícios até a data de renovação e depois volta automaticamente para o plano gratuito, sem perder XP, conquistas ou histórico.",
  },
  {
    q: "Meus dados e meu progresso são mantidos?",
    a: "Sim. Assinar ou cancelar não apaga nada. XP, trilhas, conquistas e sequência continuam exatamente como estão.",
  },
  {
    q: "Como funciona o congelamento de sequência?",
    a: "No PRO, se você ficar um dia sem estudar, a sequência é preservada automaticamente — até 2 vezes por mês, a partir de 3 dias consecutivos.",
  },
]

function FeatureValue({ feature, premium }) {
  if (feature.id === "unlimited_hearts") return premium ? "Ilimitados" : "5 por dia"
  if (feature.id === "advanced_stats") return premium ? "90 dias + por assunto" : "14 dias"
  if (feature.id === "streak_freeze") return premium ? "2 por mês" : "—"
  if (feature.id === "exclusive_skins") return premium ? "5 skins" : "1 skin"
  if (feature.id === "weekly_challenge") return premium ? "150 XP/semana" : "—"
  return premium ? "Incluído" : "—"
}

export default function Upgrade() {
  const { profile, refreshProfile } = useAuth()
  const { plans, subscription, hearts, loading, checkout, cancel } = useSubscription()
  const toast = useToast()

  const [cycle, setCycle] = useState("annual")
  const [busy, setBusy] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)

  const planList = plans && plans.length ? plans : PLANS
  const freePlan = planList.find((p) => p.id === "free") || PLANS[0]
  const proPlan =
    planList.find((p) => p.id === (cycle === "annual" ? "pro_annual" : "pro_monthly")) ||
    PLANS[2]

  const isPremium = Boolean(subscription && subscription.isPremium)

  async function handleCheckout() {
    setBusy(true)
    try {
      await checkout(proPlan.id)
      await refreshProfile()
      toast.push({
        type: "success",
        icon: "🥚",
        title: "Bem-vindo ao Fora da Casca!",
        message: `Seu teste de ${proPlan.trialDays} dias começou agora. Aproveite sem limites.`,
        duration: 6000,
      })
    } catch (error) {
      toast.push({ type: "error", icon: "⚠️", title: "Não foi possível assinar", message: error.message })
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancelar a assinatura? Você mantém os benefícios até o fim do período.")) {
      return
    }
    setCancelBusy(true)
    try {
      await cancel()
      await refreshProfile()
      toast.push({
        type: "info",
        icon: "👋",
        title: "Assinatura cancelada",
        message: "Seu acesso PRO continua até a data de renovação.",
      })
    } catch (error) {
      toast.push({ type: "error", icon: "⚠️", title: "Erro ao cancelar", message: error.message })
    } finally {
      setCancelBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      {/* HERO */}
      <div className="text-center">
        <span className="chip bg-amber-100 text-amber-800 ring-1 ring-amber-200">
          ✦ Planos EGG
        </span>
        <div className="mt-5 flex justify-center">
          <EggAvatar
            size="xl"
            skin={
              isPremium
                ? { emoji: "🐣", gradient: "from-amber-200 via-yellow-300 to-amber-500", name: "Fora da Casca" }
                : { emoji: "🥚", gradient: "from-slate-100 via-slate-200 to-slate-400", name: "Dentro da casca" }
            }
          />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {isPremium ? "Você está fora da casca" : "Está na hora de sair da casca"}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          O plano gratuito te coloca no caminho. O{" "}
          <strong className="text-slate-900">Fora da Casca</strong> remove os limites para você
          estudar sem parar, com relatórios avançados, skins exclusivas e bônus semanais.
        </p>
        {hearts && (
          <p className="mt-3 text-sm text-slate-500">
            {hearts.unlimited ? (
              <span className="font-semibold text-emerald-600">❤️ Corações infinitos ativos</span>
            ) : (
              <>
                Você tem <strong className="text-rose-600">{hearts.hearts}/{hearts.max}</strong>{" "}
                corações hoje.
              </>
            )}
          </p>
        )}
      </div>

      {/* STATUS ATUAL */}
      {isPremium ? (
        <div className="card mt-8 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ProBadge />
                <span className="text-sm font-semibold">{subscription.plan.name}</span>
              </div>
              <span className="chip bg-white/10 text-white">
                {STATUS_LABEL[subscription.status] || subscription.status}
              </span>
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Renovação</p>
              <p className="mt-1 font-bold text-slate-900">
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
              <p className="text-xs text-slate-500">{subscription.daysLeft} dias restantes</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Valor</p>
              <p className="mt-1 font-bold text-slate-900">
                {formatBRL(subscription.plan.priceCents)}
                <span className="text-xs font-normal text-slate-500">
                  {" "}
                  {subscription.plan.periodLabel}
                </span>
              </p>
              <p className="text-xs text-slate-500">Ambiente de demonstração</p>
            </div>
            <div className="flex items-center justify-start sm:justify-end">
              <button onClick={handleCancel} disabled={cancelBusy || subscription.status === "canceled"} className="btn-secondary">
                {subscription.status === "canceled" ? "Cancelamento agendado" : cancelBusy ? "Cancelando..." : "Cancelar assinatura"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* TOGGLE */}
      <div className="mt-10 flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { id: "monthly", label: "Mensal" },
            { id: "annual", label: "Anual" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setCycle(option.id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                cycle === option.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option.label}
              {option.id === "annual" && (
                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  cycle === option.id ? "bg-[#f5d24c] text-amber-950" : "bg-amber-100 text-amber-700"
                }`}>
                  -33%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* PLANOS */}
      <div className="mx-auto mt-6 grid max-w-4xl gap-5 md:grid-cols-2">
        <PlanCard
          plan={freePlan}
          ctaLabel={isPremium ? "Cancelar assinatura PRO" : "Continuar no gratuito"}
          current={!isPremium}
          disabled={isPremium && cancelBusy}
          loading={isPremium && cancelBusy}
          onChoose={isPremium ? handleCancel : () => {}}
          footnote="5 corações/dia · 14 dias de histórico · 1 skin"
        />
        <PlanCard
          plan={proPlan}
          featured
          ctaLabel={`Começar teste grátis de ${proPlan.trialDays} dias`}
          loading={busy}
          current={isPremium}
          onChoose={handleCheckout}
          footnote={`Sem cobrança agora · cancele quando quiser`}
        />
      </div>

      <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-slate-400">
        ⚠️ Demonstração acadêmica: nenhum pagamento é processado. A assinatura é simulada e
        registrada apenas neste dispositivo. Em produção, este passo chamaria um gateway
        (Stripe / Mercado Pago) e o acesso passaria a ser validado no servidor.
      </p>

      {/* COMPARATIVO */}
      <div className="card mt-10 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">O que muda no Fora da Casca</h2>
          <p className="text-sm text-slate-500">
            Comparação direta. Tudo que você já conquistou continua com você.
          </p>
        </div>
        <div className="hidden grid-cols-[1.6fr_1fr_1fr] gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:grid">
          <span>Benefício</span>
          <span>Na Casca</span>
          <span>Fora da Casca</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {FEATURE_LIST.map((feature) => (
            <li
              key={feature.id}
              className="grid gap-1 px-5 py-3 sm:grid-cols-[1.6fr_1fr_1fr] sm:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {feature.icon} {feature.name}
                </p>
                <p className="text-xs text-slate-500">{feature.description}</p>
              </div>
              <span className="text-sm text-slate-500">
                <span className="sm:hidden">Gratuito: </span>
                {FeatureValue({ feature, premium: false })}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                <span className="sm:hidden">PRO: </span>
                {FeatureValue({ feature, premium: true })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* SKINS */}
      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Skins do seu ovo</h2>
            <p className="text-sm text-slate-500">
              Personalização exclusiva para assinantes. A skin clássica é gratuita.
            </p>
          </div>
          <Link to="/profile" className="btn-secondary !py-2 text-xs">
            Escolher skin
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-4">
          {SKINS.map((skin) => (
            <div
              key={skin.id}
              className={`flex w-28 flex-col items-center gap-2 rounded-2xl border p-3 ${
                skin.premium && !isPremium
                  ? "border-slate-200 bg-slate-50/60"
                  : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className={skin.premium && !isPremium ? "opacity-40" : ""}>
                <EggAvatar skin={skin} size="md" />
              </div>
              <p className="text-center text-xs font-semibold text-slate-700">{skin.name}</p>
              {skin.premium && !isPremium && (
                <span className="text-[10px] font-bold text-slate-400">🔒 PRO</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
          Perguntas frequentes
        </h2>
        <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2">
          {FAQ.map((item) => (
            <details key={item.q} className="card group p-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-slate-800 marker:hidden">
                <span className="mr-2 text-[#f5d24c] group-open:hidden">＋</span>
                <span className="mr-2 hidden text-[#f5d24c] group-open:inline">－</span>
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      {!isPremium && (
        <div className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-10 text-center shadow-pop">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Pronto para chocar de vez?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">
            {formatBRL(proPlan.priceCents)} {proPlan.periodLabel}
            {monthlyEquivalent(proPlan) !== proPlan.priceCents && (
              <> · equivale a {formatBRL(monthlyEquivalent(proPlan))}/mês</>
            )}
            . Teste grátis de {proPlan.trialDays} dias.
          </p>
          <button onClick={handleCheckout} disabled={busy} className="btn-primary mt-6 !px-7 !py-3 text-base">
            {busy ? "Ativando..." : "Sair da casca agora →"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Assinando como {profile?.nickname ? `@${profile.nickname}` : "sua conta"} · cancele quando quiser
          </p>
        </div>
      )}

      {loading && (
        <p className="mt-6 text-center text-xs text-slate-400">Atualizando seu plano...</p>
      )}
    </div>
  )
}
