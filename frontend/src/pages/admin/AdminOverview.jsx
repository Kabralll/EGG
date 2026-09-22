import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getOverview } from "../../services/adminService"
import { ErrorState, LoadingScreen, StatCard } from "../../components/ui"
import AdminLayout from "./AdminLayout"

export default function AdminOverview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    try {
      setError("")
      setData(await getOverview())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) return <AdminLayout title="Visão geral"><ErrorState message={error} onRetry={load} /></AdminLayout>
  if (!data) return <AdminLayout title="Visão geral"><LoadingScreen /></AdminLayout>

  return (
    <AdminLayout
      title="Visão geral"
      subtitle="Panorama da plataforma em tempo real."
      action={
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/questions" className="btn-primary">
            + Nova questão
          </Link>
          <Link to="/admin/trails" className="btn-secondary">
            + Nova trilha
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="👥" label="Usuários" value={data.users} hint={`${data.students} estudantes`} accent="sky" />
        <StatCard icon="❓" label="Questões" value={data.questions} accent="brand" />
        <StatCard icon="📚" label="Disciplinas" value={data.subjects} accent="indigo" />
        <StatCard icon="🛤️" label="Trilhas" value={data.trails} accent="amber" />
        <StatCard icon="📝" label="Respostas totais" value={data.attempts} accent="emerald" />
        <StatCard icon="⚡" label="Respostas hoje" value={data.attemptsToday} accent="brand" />
        <StatCard icon="🏆" label="Conquistas dadas" value={data.achievements} accent="amber" />
        <StatCard icon="💰" label="XP distribuído" value={data.totalXp.toLocaleString("pt-BR")} accent="indigo" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/admin/questions" className="card p-5 transition hover:shadow-pop">
          <span className="text-2xl">❓</span>
          <h3 className="mt-2 font-bold text-slate-900">Gerenciar questões</h3>
          <p className="mt-1 text-sm text-slate-500">
            Criar, editar e excluir questões com alternativas e explicações.
          </p>
        </Link>
        <Link to="/admin/subjects" className="card p-5 transition hover:shadow-pop">
          <span className="text-2xl">📚</span>
          <h3 className="mt-2 font-bold text-slate-900">Disciplinas e assuntos</h3>
          <p className="mt-1 text-sm text-slate-500">
            Organizar o conteúdo por disciplina e assunto.
          </p>
        </Link>
        <Link to="/admin/users" className="card p-5 transition hover:shadow-pop">
          <span className="text-2xl">👥</span>
          <h3 className="mt-2 font-bold text-slate-900">Usuários</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ver estudantes, níveis, XP e gerenciar papéis.
          </p>
        </Link>
      </div>
    </AdminLayout>
  )
}
