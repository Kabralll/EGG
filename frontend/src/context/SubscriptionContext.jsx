import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useAuth } from "./AuthContext"
import * as billingService from "../services/billingService"

/*
  Estado global de assinatura/corações. Centraliza o que o paywall precisa:
  - plano efetivo (com expiração resolvida no servidor/local)
  - corações e regeneração
  - skins, desafio semanal e congelamentos
  - `hasFeature(name)` para gates rápidos na UI
*/

const SubscriptionContext = createContext(null)

const EMPTY = {
  subscription: null,
  hearts: null,
  skins: [],
  weeklyChallenge: null,
  streakFreeze: null,
  plans: [],
  features: [],
}

export function SubscriptionProvider({ children }) {
  const { profile } = useAuth()
  const [overview, setOverview] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!profile) {
      if (mounted.current) setOverview(EMPTY)
      return null
    }
    setLoading(true)
    try {
      const data = await billingService.getBillingOverview()
      if (mounted.current) setOverview({ ...EMPTY, ...data })
      return data
    } catch {
      return null
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** Gate rápido: premium para recursos exclusivos, corações para praticar. */
  const hasFeature = useCallback(
    (name) => {
      const subscription = overview.subscription
      if (!subscription) return false
      if (name === "unlimited_hearts") {
        if (overview.hearts && overview.hearts.unlimited) return true
        return Boolean(overview.hearts && overview.hearts.hearts > 0)
      }
      if (name === "advanced_stats") {
        return subscription.isPremium === true
      }
      return subscription.isPremium === true
    },
    [overview]
  )

  const checkout = useCallback(
    async (planId) => {
      const subscription = await billingService.checkout(planId)
      await refresh()
      return subscription
    },
    [refresh]
  )

  const cancel = useCallback(async () => {
    const subscription = await billingService.cancelSubscription()
    await refresh()
    return subscription
  }, [refresh])

  const value = {
    ...overview,
    loading,
    refresh,
    hasFeature,
    checkout,
    cancel,
    isPremium: Boolean(overview.subscription && overview.subscription.isPremium),
  }

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}
