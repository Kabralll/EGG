import { useEffect, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import AppRoutes from "../routes/AppRoutes"
import useBackButton from "../hooks/useBackButton"

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password"]

function isPublicPath(pathname) {
  const lower = pathname.toLowerCase()
  return (
    PUBLIC_PATHS.includes(lower) || lower.startsWith("/reset-password/")
  )
}

const APP_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/subjects", label: "Disciplinas", icon: "📚" },
  { to: "/trails", label: "Trilhas", icon: "🛤️" },
  { to: "/achievements", label: "Conquistas", icon: "🏆" },
  { to: "/ranking", label: "Ranking", icon: "🥇" },
  { to: "/stats", label: "Desempenho", icon: "📊" },
]

function Logo({ to = "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg shadow-sm">
        <img src="/img/EggoLogo.png" alt="EggoLogo" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-slate-900">EGG</span>
        <span className="hidden text-[10px] font-medium tracking-wide text-slate-400 sm:block">
          Educação Geral Gamificada
        </span>
      </span>
    </Link>
  )
}

function XPChip({ profile }) {
  if (!profile) return null
  return (
    <Link
      to="/dashboard"
      className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-50 to-amber-50 px-3 py-1.5 text-xs font-bold text-brand-700 ring-1 ring-brand-200 sm:flex"
      title={`${profile.xp} XP — Nível ${profile.progress.level}`}
    >
      ⚡ {profile.xp} XP
      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">
        Nv {profile.progress.level}
      </span>
    </Link>
  )
}

function PublicNavbar() {
  const { profile } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo to={profile ? "/dashboard" : "/"} />
        <div className="flex items-center gap-2">
          {profile ? (
            <Link to="/dashboard" className="btn-primary">
              Abrir plataforma
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link to="/register" className="btn-primary">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function AppNavbar({ profile, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Botão "voltar" do Android fecha o menu antes de navegar/sair
  useEffect(() => {
    const closeMenu = () => setMenuOpen(false)
    window.addEventListener("egg:close-menu", closeMenu)
    return () => window.removeEventListener("egg:close-menu", closeMenu)
  }, [])

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-[#f5d24c] text-white" : "text-slate-600 hover:bg-slate-100"
    }`

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        {/* Desktop */}
        <nav className="hidden items-center gap-1 lg:flex">
          {APP_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          {profile?.role === "ADMIN" && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {profile && <XPChip profile={profile} />}
          {profile && (
            <Link
              to="/profile"
              className="hidden h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white ring-2 ring-transparent transition hover:ring-[#f5d24c] sm:flex"
              title={profile.name}
            >
              {profile.name.charAt(0).toUpperCase()}
            </Link>
          )}
          <button
            onClick={onLogout}
            className="btn-ghost hidden !px-2.5 sm:flex"
            title="Sair da conta"
          >
            ↩
          </button>

          {/* Mobile: menu */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn-ghost !px-2.5 lg:hidden"
            aria-label="Abrir menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Painel mobile */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-slate-200 bg-white shadow-pop animate-fade-in lg:hidden"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
            <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{profile?.name}</p>
                <p className="text-xs text-slate-500">
                  Nível {profile?.progress.level} · ⚡ {profile?.xp} XP · 🔥 {profile?.streak}{" "}
                  {profile?.streak === 1 ? "dia" : "dias"}
                </p>
              </div>
              <Link to="/profile" onClick={closeMenu} className="btn-secondary !py-1.5 text-xs">
                Perfil
              </Link>
            </div>
            {APP_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                    isActive ? "bg-brand-50 text-[#f5d24c]" : "text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                <span>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
            {profile?.role === "ADMIN" && (
              <NavLink
                to="/admin"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>⚙️</span> Administração
              </NavLink>
            )}
            <button onClick={onLogout} className="btn-secondary mt-2 w-full">
              Sair da conta
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-[#081927] pb-safe text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl">
              <img src="/img/EggoLogo.png" alt="EggoLogo" />
            </span>
            <span className="text-lg font-extrabold text-white">EGG</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            <span className="font-semibold text-[#f5d24c]">E</span>ducação{" "}
            <span className="font-semibold text-[#f5d24c]">G</span>eral{" "}
            <span className="font-semibold text-[#f5d24c]">G</span>amificada — estudo que vira
            progressão.
          </p>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Plataforma</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/dashboard" className="hover:text-[#f5d24c]">Dashboard</Link></li>
            <li><Link to="/subjects" className="hover:text-[#f5d24c]">Disciplinas</Link></li>
            <li><Link to="/trails" className="hover:text-[#f5d24c]">Trilhas</Link></li>
            <li><Link to="/ranking" className="hover:text-[#f5d24c]">Ranking</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Acesso</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/login" className="hover:text-[#f5d24c]">Entrar</Link></li>
            <li><Link to="/register" className="hover:text-[#f5d24c]">Criar conta</Link></li>
            <li><Link to="/forgot-password" className="hover:text-[#f5d24c]">Recuperar senha</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Equipe</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="https://github.com/Enzo-Giuliano" target="_blank" rel="noreferrer" className="hover:text-[#f5d24c]">
                Enzo Giuliano
              </a>
            </li>
            <li>
              <a href="https://github.com/Kabralll" target="_blank" rel="noreferrer" className="hover:text-[#f5d24c]">
                Gustavo Cabral
              </a>
            </li>
            <li>
              <a href="https://github.com/GugaNicacio" target="_blank" rel="noreferrer" className="hover:text-[#f5d24c]">
                Gustavo Nicácio
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © 2026 EGG — ETEC Zona Leste · Projeto acadêmico de gamificação no estudo
      </div>
    </footer>
  )
}

export default function Layout() {
  const location = useLocation()
  const { profile, logout } = useAuth()
  const isPublic = isPublicPath(location.pathname)

  // Botão Voltar do Android: volta a rota e só fecha o app na tela inicial
  useBackButton()

  return (
    <div className="flex min-h-screen flex-col">
      {isPublic ? <PublicNavbar /> : <AppNavbar profile={profile} onLogout={logout} />}

      <main className={`flex-1 ${isPublic ? "pb-safe" : ""}`}>
        <AppRoutes />
      </main>

      {!isPublic && <Footer />}
    </div>
  )
}
