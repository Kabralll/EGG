import { Link } from "react-router-dom"

const FEATURES = [
  {
    icon: "⚡",
    title: "XP e níveis",
    text: "Cada questão respondida rende XP. Suba de nível, desbloqueie marcos e sinta a evolução em tempo real.",
  },
  {
    icon: "🛤️",
    title: "Trilhas guiadas",
    text: "Sequências de etapas com desbloqueio progressivo: do conceito básico ao desafio final.",
  },
  {
    icon: "📅",
    title: "Desafio diário",
    text: "Uma missão nova todos os dias com recompensa em XP e sequência de estudos para manter o ritmo.",
  },
  {
    icon: "🏆",
    title: "Conquistas reais",
    text: "Badges desbloqueadas pelas suas ações: primeiros acertos, sequências, trilhas e muito mais.",
  },
  {
    icon: "🥇",
    title: "Ranking",
    text: "Dispute a posição no ranking geral e semanal com outros estudantes da plataforma.",
  },
  {
    icon: "📊",
    title: "Desempenho real",
    text: "Estatísticas por disciplina, evolução diária e recomendações baseadas no seu desempenho.",
  },
]

const STEPS = [
  {
    n: "1",
    title: "Responda questões",
    text: "Escolha uma disciplina, um assunto ou uma etapa de trilha e responda questões com correção imediata e explicação.",
  },
  {
    n: "2",
    title: "Ganhe XP e soba de nível",
    text: "Acertos rendem mais XP conforme a dificuldade. Erros também ensinam: você vê a explicação e evolui na próxima.",
  },
  {
    n: "3",
    title: "Complete trilhas e desafios",
    text: "Feche etapas, conclua trilhas, cumpra o desafio do dia e observe conquistas, streak e ranking crescerem.",
  },
]

const SUBJECTS = [
  { icon: "📐", name: "Matemática" },
  { icon: "✍️", name: "Língua Portuguesa" },
  { icon: "🏛️", name: "História" },
  { icon: "🌍", name: "Geografia" },
  { icon: "⚛️", name: "Física" },
  { icon: "🧪", name: "Química" },
  { icon: "🧬", name: "Biologia" },
]

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.12),transparent_55%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              🎮 Plataforma de estudos gamificada
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Estudar pode ser como{" "}
              <span className="bg-gradient-to-r from-brand-500 to-amber-500 bg-clip-text text-transparent">
                subir de nível
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              O EGG transforma o estudo do Ensino Fundamental e Médio em uma jornada de progressão:
              responda questões, ganhe XP, complete trilhas e desbloqueie conquistas — tudo
              enquanto se prepara para provas, vestibulares e ENEM.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary !px-6 !py-3 text-base">
                Criar conta grátis →
              </Link>
              <Link to="/login" className="btn-secondary !px-6 !py-3 text-base">
                Já estudo aqui
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <span>✓ 58+ questões comentadas</span>
              <span>✓ 5 trilhas completas</span>
              <span>✓ Sem custo</span>
            </div>
          </div>

          {/* Mock visual */}
          <div className="relative hidden lg:block">
            <div className="card animate-pop p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                    A
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Ana</p>
                    <p className="text-xs text-slate-500">Nível 4 · 🔥 6 dias seguidos</p>
                  </div>
                </div>
                <span className="chip bg-brand-50 text-brand-700">⚡ 520 XP</span>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Progresso para o nível 5</span>
                  <span className="font-semibold text-slate-700">74%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2.5 w-[74%] rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
                </div>
              </div>
            </div>

            <div className="card absolute -bottom-6 -left-6 w-64 animate-slide-up p-4">
              <p className="text-sm font-bold text-emerald-600">✅ Resposta correta!</p>
              <p className="mt-1 text-xs text-slate-500">Função afim · questão média</p>
              <p className="mt-2 text-sm font-extrabold text-slate-900">+20 XP ganhos</p>
            </div>

            <div className="card absolute -top-6 -right-4 w-56 animate-pop p-4">
              <p className="text-lg">🏆 Nova conquista!</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Em ritmo de estudo</p>
              <p className="text-xs text-slate-500">10 questões respondidas</p>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Como funciona
            </h2>
            <p className="mt-3 text-slate-600">
              Estude como sempre estudou — com questões de verdade. A plataforma cuida de transformar
              isso em progressão.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="card relative p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 font-extrabold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Tudo o que você precisa para manter o ritmo
          </h2>
          <p className="mt-3 text-slate-600">
            Gamificação de verdade — conectada aos seus estudos, não decorativa.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="card p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
            >
              <span className="text-3xl">{feature.icon}</span>
              <h3 className="mt-3 font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DISCIPLINAS */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              6º do Fundamental ao 3º do Ensino Médio
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Conteúdo organizado por disciplina, assunto e dificuldade.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {SUBJECTS.map((subject) => (
              <span
                key={subject.name}
                className="card flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                <span>{subject.icon}</span>
                {subject.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-12 text-center shadow-pop sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.25),transparent_60%)]" />
          <h2 className="relative text-3xl font-extrabold tracking-tight text-white">
            Pronto para transformar seu estudo em progressão?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-slate-300">
            Crie sua conta em menos de um minuto e responda sua primeira questão agora mesmo.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary !px-7 !py-3 text-base">
              Começar agora
            </Link>
            <Link
              to="/login"
              className="btn !border !border-white/30 !bg-white/10 px-7 py-3 text-base text-white hover:!bg-white/20"
            >
              Entrar com minha conta
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
