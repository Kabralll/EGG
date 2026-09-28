import { createContext, useCallback, useContext, useState } from "react"

const ToastContext = createContext(null)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (toast) => {
      const id = nextId++
      const entry = { id, ...toast }
      setToasts((current) => [...current, entry])
      setTimeout(() => dismiss(id), toast.duration || 5000)
      return id
    },
    [dismiss]
  )

  // Atalho estável: notify("mensagem", "error" | "success" | "info")
  const notify = useCallback(
    (message, type = "info") =>
      push({
        type,
        icon: type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️",
        title: message,
      }),
    [push]
  )

  return (
    <ToastContext.Provider value={{ push, dismiss, notify }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const STYLES = {
  achievement: "from-amber-500 to-orange-500 text-white",
  levelUp: "from-indigo-500 to-violet-500 text-white",
  xp: "from-emerald-500 to-teal-500 text-white",
  success: "from-emerald-500 to-green-500 text-white",
  error: "from-rose-500 to-red-500 text-white",
  info: "from-slate-700 to-slate-800 text-white",
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className={`pointer-events-auto w-full max-w-sm animate-slide-up rounded-xl px-4 py-3 text-left shadow-lg bg-gradient-to-r ${
            STYLES[toast.type] || STYLES.info
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.icon && <span className="text-2xl leading-none">{toast.icon}</span>}
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-sm opacity-90">{toast.message}</p>
              )}
            </div>
            <span className="opacity-70 hover:opacity-100">✕</span>
          </div>
        </button>
      ))}
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
