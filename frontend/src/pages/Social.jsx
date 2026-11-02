import { useEffect, useMemo, useState } from "react"
import { useToast } from "../context/ToastContext"
import {
  cancelFriendRequest,
  createGroup,
  deleteGroup,
  getGroup,
  getGroupRanking,
  getSocialOverview,
  inviteToGroup,
  leaveGroup,
  removeFriend,
  removeGroupMember,
  respondFriendRequest,
  respondGroupInvite,
  searchStudents,
  sendFriendRequest,
} from "../services/socialService"
import {
  EmptyState,
  ErrorState,
  LoadingScreen,
  PageHeader,
  StatCard,
} from "../components/ui"

const TABS = [
  { id: "friends", label: "Amigos", icon: "🤝" },
  { id: "groups", label: "Grupos", icon: "👥" },
  { id: "ranking", label: "Ranking de grupos", icon: "🏆" },
]

const EMOJIS = ["👥", "📚", "🚀", "🧠", "🔥", "🌱", "🎯", "💡"]
const MEDALS = ["🥇", "🥈", "🥉"]
const fmt = (value) => new Intl.NumberFormat("pt-BR").format(value || 0)

function initial(name) {
  return (name || "?").trim().charAt(0).toUpperCase()
}

function Avatar({ user, size = "md" }) {
  const sizes = {
    sm: "h-9 w-9 text-sm",
    md: "h-11 w-11 text-base",
    lg: "h-14 w-14 text-xl",
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-amber-100 to-orange-200 font-extrabold text-amber-900 ring-1 ring-amber-300/70 ${sizes[size]}`}
      aria-hidden="true"
    >
      {initial(user?.nickname || user?.name)}
    </span>
  )
}

function LevelBadge({ level }) {
  return (
    <span className="chip bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
      Nv {level}
    </span>
  )
}

function Tab({
  active,
  onClick,
  children,
  count,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex items-center gap-2 whitespace-nowrap px-1 pb-3 text-sm font-semibold transition ${
        active
          ? "text-slate-900"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
      {count > 0 && (
        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
          {count}
        </span>
      )}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#f5d24c]" />
      )}
    </button>
  )
}

function ScopeToggle({ scope, onChange, labels = ["Geral", "Semana"] }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      {["general", "weekly"].map((item, index) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            scope === item
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {labels[index]}
        </button>
      ))}
    </div>
  )
}

function FriendRow({ user, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{user.nickname}</p>
        <p className="truncate text-xs text-slate-500">
          {user.name} · ⚡ {fmt(user.xp)} XP · 🔥 {user.streak}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LevelBadge level={user.level} />
        {children}
      </div>
    </div>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="section-title">{children}</h2>
      {action}
    </div>
  )
}

export default function Social() {
  const toast = useToast()

  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("friends")
  const [busy, setBusy] = useState("")

  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const [rankingScope, setRankingScope] = useState("general")
  const [ranking, setRanking] = useState(null)
  const [rankingLoading, setRankingLoading] = useState(false)

  const [form, setForm] = useState({ name: "", emoji: "👥", description: "" })
  const [creating, setCreating] = useState(false)

  const [openGroupId, setOpenGroupId] = useState(null)
  const [groupDetail, setGroupDetail] = useState(null)
  const [detailError, setDetailError] = useState("")
  const [detailVersion, setDetailVersion] = useState(0)
  const [memberScope, setMemberScope] = useState("general")

  const notify = (type, title, message) =>
    toast.push({ type, title, message, icon: type === "error" ? "⚠️" : "✅" })

  async function load() {
    try {
      setError("")
      setData(await getSocialOverview())
    } catch (err) {
      setError(err.message)
    }
  }

  function openGroup(groupId, scope = "general") {
    setGroupDetail(null)
    setDetailError("")
    setMemberScope(scope)
    setOpenGroupId(groupId)
  }

  useEffect(() => {
    load()
  }, [])

  // Busca de estudantes (com pequeno debounce para não consultar a cada tecla)
  useEffect(() => {
    const term = search.trim()
    if (!term) {
      setSearchResults([])
      setSearching(false)
      return undefined
    }

    let active = true
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await searchStudents(term)
        if (active) setSearchResults(results)
      } catch (err) {
        if (active) notify("error", "Busca indisponível", err.message)
      } finally {
        if (active) setSearching(false)
      }
    }, 280)

    return () => {
      active = false
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, data])

  // Ranking de grupos só é carregado quando a aba está aberta
  useEffect(() => {
    if (tab !== "ranking") return undefined
    let active = true
    setRankingLoading(true)
    getGroupRanking(rankingScope)
      .then((result) => {
        if (active) setRanking(result)
      })
      .catch((err) => {
        if (active) notify("error", "Ranking indisponível", err.message)
      })
      .finally(() => {
        if (active) setRankingLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, rankingScope, data])

  // Detalhe do grupo (reabre sempre que o escopo ou os dados mudam)
  useEffect(() => {
    if (!openGroupId) {
      setGroupDetail(null)
      return undefined
    }
    let active = true
    setDetailError("")
    getGroup(openGroupId, memberScope)
      .then((detail) => {
        if (active) setGroupDetail(detail)
      })
      .catch((err) => {
        if (active) setDetailError(err.message)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openGroupId, memberScope, data, detailVersion])

  // Fecha o modal com Esc
  useEffect(() => {
    if (!openGroupId) return undefined
    const onKey = (event) => {
      if (event.key === "Escape") setOpenGroupId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openGroupId])

  const incomingCount = data?.stats.incomingRequests || 0
  const groupInviteCount = data?.stats.groupInvites || 0

  const tabCounts = {
    friends: incomingCount,
    groups: groupInviteCount,
    ranking: 0,
  }

  const friendIds = useMemo(
    () => new Set((data?.friends || []).map((friend) => friend.id)),
    [data]
  )

  async function run(key, action, success) {
    setBusy(key)
    try {
      const result = await action()
      notify("success", success, result?.message)
      await load()
      return result
    } catch (err) {
      notify("error", "Não foi possível concluir", err.message)
      return null
    } finally {
      setBusy("")
    }
  }

  async function handleFriendRequest(targetId) {
    await run(
      `request:${targetId}`,
      () => sendFriendRequest(targetId),
      "Pedido de amizade"
    )
  }

  async function handleFriendResponse(id, action) {
    await run(
      `friend-response:${id}`,
      () => respondFriendRequest(id, action),
      action === "accept" ? "Amizade aceita" : "Pedido recusado"
    )
  }

  async function handleCancelRequest(id) {
    await run(
      `cancel-request:${id}`,
      () => cancelFriendRequest(id),
      "Pedido cancelado"
    )
  }

  async function handleRemoveFriend(friend) {
    if (!window.confirm(`Remover ${friend.nickname} da sua lista de amigos?`)) return
    await run(
      `remove-friend:${friend.id}`,
      () => removeFriend(friend.id),
      "Amizade removida"
    )
  }

  async function handleCreateGroup(event) {
    event.preventDefault()
    if (form.name.trim().length < 3) {
      notify("error", "Nome muito curto", "Use pelo menos 3 caracteres.")
      return
    }
    setCreating(true)
    try {
      const result = await createGroup(form)
      notify("success", "Grupo criado!", result.message)
      setForm({ name: "", emoji: "👥", description: "" })
      await load()
      setTab("groups")
      openGroup(result.id)
    } catch (err) {
      notify("error", "Não foi possível criar", err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleInvite(targetId) {
    await run(
      `invite:${targetId}`,
      () => inviteToGroup(openGroupId, targetId),
      "Convite enviado"
    )
  }

  async function handleGroupInvite(inviteId, action) {
    const result = await run(
      `group-invite:${inviteId}`,
      () => respondGroupInvite(inviteId, action),
      action === "accept" ? "Convite aceito" : "Convite recusado"
    )
    if (result && action === "accept" && result.groupId) {
      setTab("groups")
      openGroup(result.groupId)
    }
  }

  async function handleLeaveGroup() {
    if (!window.confirm("Sair deste grupo? Se você for o líder, a liderança passa para outro integrante.")) return
    const result = await run(
      `leave:${openGroupId}`,
      () => leaveGroup(openGroupId),
      "Você saiu do grupo"
    )
    if (result) setOpenGroupId(null)
  }

  async function handleRemoveMember(member) {
    if (!window.confirm(`Remover ${member.nickname} do grupo?`)) return
    await run(
      `remove-member:${member.id}`,
      () => removeGroupMember(openGroupId, member.id),
      "Integrante removido"
    )
  }

  async function handleDeleteGroup() {
    if (!window.confirm("Excluir este grupo? Todos os integrantes e convites serão removidos.")) return
    const result = await run(
      `delete-group:${openGroupId}`,
      () => deleteGroup(openGroupId),
      "Grupo excluído"
    )
    if (result) setOpenGroupId(null)
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  if (!data) return <LoadingScreen label="Carregando comunidade..." />

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Comunidade"
        subtitle="Faça amizade, monte pequenos grupos de estudo e dispute o ranking local com quem estuda com você."
      />

      <div className="card mb-5 flex flex-wrap items-center gap-3 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <span className="text-2xl">📱</span>
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-900">
          <span className="font-bold">Como funcionam os amigos aqui:</span> o EGG roda
          offline neste aparelho, então seus amigos são os outros perfis de estudante
          cadastrados nele. Para testar pedidos e convites, entre com outra conta e
          volte para a sua — o progresso e os rankings usam o XP real de cada perfil.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="🤝" label="Amigos" value={data.stats.friends} accent="emerald" />
        <StatCard
          icon="📨"
          label="Pedidos recebidos"
          value={data.stats.incomingRequests}
          accent="amber"
        />
        <StatCard icon="👥" label="Seus grupos" value={data.stats.groups} accent="indigo" />
        <StatCard
          icon="✉️"
          label="Convites de grupo"
          value={data.stats.groupInvites}
          accent="rose"
        />
      </div>

      <div className="mb-5 flex gap-5 overflow-x-auto border-b border-slate-200">
        {TABS.map((item) => (
          <Tab
            key={item.id}
            active={tab === item.id}
            onClick={() => setTab(item.id)}
            count={tabCounts[item.id]}
          >
            <span>{item.icon}</span>
            {item.label}
          </Tab>
        ))}
      </div>

      {/* ------------------------------- AMIGOS ------------------------------- */}
      {tab === "friends" && (
        <div className="space-y-6">
          {data.incoming.length > 0 && (
            <section className="card border-amber-200 p-5">
              <SectionTitle>Pedidos de amizade</SectionTitle>
              <div className="space-y-2">
                {data.incoming.map((request) => (
                  <FriendRow key={request.id} user={request.user}>
                    <button
                      type="button"
                      className="btn-success !px-3 !py-1.5 text-xs"
                      disabled={busy === `friend-response:${request.id}`}
                      onClick={() => handleFriendResponse(request.id, "accept")}
                    >
                      Aceitar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      disabled={busy === `friend-response:${request.id}`}
                      onClick={() => handleFriendResponse(request.id, "decline")}
                    >
                      Recusar
                    </button>
                  </FriendRow>
                ))}
              </div>
            </section>
          )}

          <section className="card p-5">
            <SectionTitle>Encontrar estudantes</SectionTitle>
            <div className="relative">
              <input
                className="input pl-10"
                placeholder="Busque por apelido ou nome..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar estudantes"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
            </div>

            {search.trim() ? (
              <div className="mt-3 space-y-2">
                {searching && (
                  <p className="py-3 text-center text-sm text-slate-500">Buscando...</p>
                )}
                {!searching && searchResults.length === 0 && (
                  <p className="py-3 text-center text-sm text-slate-500">
                    Nenhum estudante encontrado neste aparelho.
                  </p>
                )}
                {!searching &&
                  searchResults.map((student) => (
                    <FriendRow key={student.id} user={student}>
                      {student.relation === "friend" ? (
                        <span className="chip bg-emerald-100 text-emerald-700">Amigos</span>
                      ) : student.relation === "pending_out" ? (
                        <span className="chip bg-slate-100 text-slate-500">Pendente</span>
                      ) : student.relation === "pending_in" ? (
                        <button
                          type="button"
                          className="btn-success !px-3 !py-1.5 text-xs"
                          disabled={busy === `request:${student.id}`}
                          onClick={() => handleFriendRequest(student.id)}
                        >
                          Aceitar pedido
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary !px-3 !py-1.5 text-xs"
                          disabled={busy === `request:${student.id}`}
                          onClick={() => handleFriendRequest(student.id)}
                        >
                          + Adicionar
                        </button>
                      )}
                    </FriendRow>
                  ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Digite um nome ou apelido para buscar entre os perfis deste aparelho.
              </p>
            )}
          </section>

          <section>
            <SectionTitle
              action={
                <span className="text-xs text-slate-400">
                  {data.friends.length} {data.friends.length === 1 ? "amigo" : "amigos"}
                </span>
              }
            >
              Sua lista de amigos
            </SectionTitle>

            {data.friends.length === 0 ? (
              <EmptyState
                icon="🤝"
                title="Sua lista ainda está vazia"
                message="Busque outro estudante cadastrado neste aparelho e envie um pedido de amizade."
              />
            ) : (
              <div className="space-y-2">
                {data.friends.map((friend) => (
                  <FriendRow key={friend.id} user={friend}>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                      disabled={busy === `remove-friend:${friend.id}`}
                      onClick={() => handleRemoveFriend(friend)}
                    >
                      Remover
                    </button>
                  </FriendRow>
                ))}
              </div>
            )}
          </section>

          {data.outgoing.length > 0 && (
            <section className="card p-5">
              <SectionTitle>Pedidos enviados</SectionTitle>
              <div className="space-y-2">
                {data.outgoing.map((request) => (
                  <FriendRow key={request.id} user={request.user}>
                    <span className="chip bg-amber-100 text-amber-700">Aguardando</span>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                      disabled={busy === `cancel-request:${request.id}`}
                      onClick={() => handleCancelRequest(request.id)}
                    >
                      Cancelar
                    </button>
                  </FriendRow>
                ))}
              </div>
            </section>
          )}

          {data.suggestions.length > 0 && (
            <section className="card p-5">
              <SectionTitle>Sugestões de estudo</SectionTitle>
              <div className="space-y-2">
                {data.suggestions.slice(0, 5).map((student) => (
                  <FriendRow key={student.id} user={student}>
                    <button
                      type="button"
                      className="btn-primary !px-3 !py-1.5 text-xs"
                      disabled={busy === `request:${student.id}`}
                      onClick={() => handleFriendRequest(student.id)}
                    >
                      + Adicionar
                    </button>
                  </FriendRow>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------- GRUPOS ------------------------------- */}
      {tab === "groups" && (
        <div className="space-y-6">
          {data.groupInvites.length > 0 && (
            <section className="card border-amber-200 p-5">
              <SectionTitle>Convites para grupos</SectionTitle>
              <div className="space-y-2">
                {data.groupInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl ring-1 ring-amber-200">
                      {invite.group.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {invite.group.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Convite de {invite.from?.nickname || "um amigo"} ·{" "}
                        {invite.group.memberCount} integrantes
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-success !px-3 !py-1.5 text-xs"
                        disabled={busy === `group-invite:${invite.id}`}
                        onClick={() => handleGroupInvite(invite.id, "accept")}
                      >
                        Entrar
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                        disabled={busy === `group-invite:${invite.id}`}
                        onClick={() => handleGroupInvite(invite.id, "decline")}
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card p-5">
            <SectionTitle>Criar um grupo</SectionTitle>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm((value) => ({ ...value, emoji }))}
                    aria-pressed={form.emoji === emoji}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition ${
                      form.emoji === emoji
                        ? "bg-amber-100 ring-2 ring-[#f5d24c]"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  placeholder="Nome do grupo (3 a 40 caracteres)"
                  maxLength={40}
                  value={form.name}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, name: event.target.value }))
                  }
                />
                <input
                  className="input"
                  placeholder="Descrição curta (opcional)"
                  maxLength={160}
                  value={form.description}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, description: event.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Até 12 integrantes. Só amigos podem ser convidados.
                </p>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || form.name.trim().length < 3}
                >
                  {creating ? "Criando..." : "Criar grupo"}
                </button>
              </div>
            </form>
          </section>

          <section>
            <SectionTitle>Seus grupos</SectionTitle>
            {data.groups.length === 0 ? (
              <EmptyState
                icon="👥"
                title="Nenhum grupo ainda"
                message="Crie um grupo e convide seus amigos para estudar e competir em equipe."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => openGroup(group.id)}
                    className="card group p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-2xl ring-1 ring-slate-200">
                        {group.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-bold text-slate-900 group-hover:text-[#f5d24c]">
                            {group.name}
                          </p>
                          {group.myRole === "OWNER" && (
                            <span className="chip bg-amber-100 text-amber-700">Líder</span>
                          )}
                        </div>
                        <p className="line-clamp-1 text-xs text-slate-500">
                          {group.description || "Sem descrição"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {group.memberCount}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Integrantes
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {fmt(group.totalXp)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          XP total
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-emerald-600">
                          +{fmt(group.weeklyXp)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          XP na semana
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="truncate text-slate-500">
                        {group.topMember
                          ? `Destaque: ${group.topMember.nickname}`
                          : "Sem integrantes"}
                      </span>
                      <span className="shrink-0 font-semibold text-[#f5d24c]">
                        Abrir grupo →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* -------------------------- RANKING DE GRUPOS -------------------------- */}
      {tab === "ranking" && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Ranking local de grupos</h2>
              <p className="text-xs text-slate-500">
                Soma do XP real dos integrantes dos seus grupos.
              </p>
            </div>
            <ScopeToggle scope={rankingScope} onChange={setRankingScope} />
          </div>

          {rankingLoading && !ranking ? (
            <LoadingScreen label="Calculando ranking..." />
          ) : !ranking || ranking.entries.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="Ainda não há grupos para ranquear"
              message="Crie um grupo e convide amigos para começar a disputa."
              action={
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setTab("groups")}
                >
                  Criar grupo
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {ranking.entries.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => openGroup(group.id, rankingScope)}
                  className={`card flex w-full items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop ${
                    group.position === 1
                      ? "border-amber-300 bg-gradient-to-r from-amber-50 to-white"
                      : ""
                  }`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl ring-1 ring-slate-200">
                    {group.position <= 3 ? MEDALS[group.position - 1] : group.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">
                      {group.position <= 3 && <span className="mr-1.5">{group.emoji}</span>}
                      {group.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {group.memberCount} integrantes · média {fmt(group.averageXp)} XP
                      {group.myRole === "OWNER" ? " · seu grupo (líder)" : " · seu grupo"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-extrabold text-slate-900">
                      {fmt(rankingScope === "weekly" ? group.weeklyXp : group.totalXp)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      {rankingScope === "weekly" ? "XP na semana" : "XP total"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------- MODAL DO GRUPO ---------------------------- */}
      {openGroupId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpenGroupId(null)}
          role="presentation"
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-pop sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do grupo"
            onClick={(event) => event.stopPropagation()}
          >
            {detailError ? (
              <div>
                <ErrorState
                  message={detailError}
                  onRetry={() => {
                    setDetailError("")
                    setGroupDetail(null)
                    setDetailVersion((value) => value + 1)
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary mt-3 w-full"
                  onClick={() => setOpenGroupId(null)}
                >
                  Fechar
                </button>
              </div>
            ) : !groupDetail ? (
              <LoadingScreen label="Abrindo grupo..." />
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-3xl ring-1 ring-slate-200">
                    {groupDetail.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {groupDetail.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {groupDetail.description || "Sem descrição"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {groupDetail.memberCount}/{groupDetail.maxMembers} integrantes ·
                      criado em{" "}
                      {new Date(groupDetail.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost !px-2.5 !py-1.5"
                    onClick={() => setOpenGroupId(null)}
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  <div>
                    <p className="text-lg font-extrabold text-slate-900">
                      {groupDetail.memberCount}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Integrantes
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-slate-900">
                      {fmt(groupDetail.totalXp)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      XP total
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-emerald-600">
                      +{fmt(groupDetail.weeklyXp)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      XP na semana
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="section-title">Ranking do grupo</h3>
                  <ScopeToggle
                    scope={memberScope}
                    onChange={setMemberScope}
                    labels={["XP total", "Na semana"]}
                  />
                </div>

                <div className="mt-2 space-y-2">
                  {groupDetail.members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                        member.isMe
                          ? "border-amber-200 bg-amber-50/60"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <span className="w-7 shrink-0 text-center text-sm font-extrabold text-slate-400">
                        {member.position <= 3 ? MEDALS[member.position - 1] : member.position}
                      </span>
                      <Avatar user={member} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {member.nickname}
                          {member.isMe && (
                            <span className="ml-1.5 text-xs font-medium text-amber-600">
                              (você)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          Nv {member.level} · 🔥 {member.streak} · ⚡ {fmt(member.xp)} XP
                          {member.role === "OWNER" ? " · líder" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-extrabold text-slate-900">
                          {fmt(
                            memberScope === "weekly" ? member.weeklyXp : member.xp
                          )}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          {memberScope === "weekly" ? "XP semana" : "XP total"}
                        </p>
                      </div>
                      {groupDetail.canManage && !member.isMe && (
                        <button
                          type="button"
                          className="btn-ghost !px-2 !py-1 text-xs text-rose-600 hover:bg-rose-50"
                          disabled={busy === `remove-member:${member.id}`}
                          onClick={() => handleRemoveMember(member)}
                          title="Remover do grupo"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <h3 className="section-title">Convidar amigos</h3>
                  {groupDetail.inviteCandidates.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {friendIds.size === 0
                        ? "Adicione amigos na aba Amigos para poder convidá-los."
                        : "Todos os seus amigos já estão no grupo ou têm convite pendente."}
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {groupDetail.inviteCandidates.map((friend) => (
                        <FriendRow key={friend.id} user={friend}>
                          <button
                            type="button"
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                            disabled={busy === `invite:${friend.id}`}
                            onClick={() => handleInvite(friend.id)}
                          >
                            Convidar
                          </button>
                        </FriendRow>
                      ))}
                    </div>
                  )}
                </div>

                {groupDetail.pendingInvites.length > 0 && (
                  <div className="mt-5">
                    <h3 className="section-title">Convites pendentes</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {groupDetail.pendingInvites.map((invite) => (
                        <span
                          key={invite.id}
                          className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        >
                          {invite.user.nickname}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={busy === `leave:${groupDetail.id}`}
                    onClick={handleLeaveGroup}
                  >
                    Sair do grupo
                  </button>
                  {groupDetail.isOwner && (
                    <button
                      type="button"
                      className="btn-danger text-sm"
                      disabled={busy === `delete-group:${groupDetail.id}`}
                      onClick={handleDeleteGroup}
                    >
                      Excluir grupo
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
