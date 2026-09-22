import { NavLink } from "react-router-dom"

const TABS = [
  { to: "/admin", label: "Visão geral", icon: "📈", end: true },
  { to: "/admin/questions", label: "Questões", icon: "❓" },
  { to: "/admin/subjects", label: "Disciplinas", icon: "📚" },
  { to: "/admin/trails", label: "Trilhas", icon: "🛤️" },
  { to: "/admin/users", label: "Usuários", icon: "👥" },
]

export default function AdminLayout({ title, subtitle, action, children }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-500">
          ⚙️ Área administrativa
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  )
}
