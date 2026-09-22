import React, { useEffect, useState, useCallback } from "react";
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from "../../services/adminService";
import { getSubjects } from "../../services/contentService";
import { Spinner, EmptyState, PageHeader, difficultyLabel, difficultyStyle } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

const GRADES = ["6º ano", "7º ano", "8º ano", "9º ano", "1º EM", "2º EM", "3º EM"];
const DIFFICULTIES = ["facil", "media", "dificil"];

function emptyForm(subjects) {
  return {
    statement: "",
    explanation: "",
    subjectId: subjects[0]?.id || "",
    topicId: "",
    difficulty: "media",
    grade: "9º ano",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
}

export default function AdminQuestions() {
  const { notify } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ subjectId: "", topicId: "", difficulty: "", search: "" });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      setItems(await getQuestions(params));
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const topicList = subjects.find((s) => s.id === Number(filters.subjectId))?.topics
    || subjects.find((s) => s.id === filters.subjectId)?.topics
    || [];

  const openNew = () => setForm(emptyForm(subjects));

  const openEdit = (q) => {
    const subject = subjects.find((s) => s.topics.some((t) => t.id === q.topicId));
    setForm({
      id: q.id,
      statement: q.statement,
      explanation: q.explanation || "",
      subjectId: subject?.id || "",
      topicId: q.topicId,
      difficulty: q.difficulty,
      grade: GRADES.includes(q.grade) ? q.grade : "9º ano",
      options: (q.options.length >= 2 ? q.options : [...q.options, { text: "", isCorrect: false }, { text: "", isCorrect: false }])
        .slice(0, 6)
        .map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
    });
  };

  const setOpt = (i, patch) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) }));

  const save = async (e) => {
    e.preventDefault();
    if (form.options.some((o) => !o.text.trim())) return notify("Preencha todas as alternativas.", "error");
    if (form.options.filter((o) => o.isCorrect).length !== 1) return notify("Marque exatamente uma alternativa como correta.", "error");
    setSaving(true);
    try {
      const payload = {
        statement: form.statement.trim(),
        explanation: form.explanation.trim(),
        topicId: Number(form.topicId),
        difficulty: form.difficulty,
        grade: form.grade,
        options: form.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
      };
      if (form.id) await updateQuestion(form.id, payload);
      else await createQuestion(payload);
      notify("Questão salva com sucesso.", "success");
      setForm(null);
      load();
    } catch (err) {
      const firstField = err.fields && Object.values(err.fields)[0];
      notify(firstField || err.message, "error");
    } finally { setSaving(false); }
  };

  const remove = async (q) => {
    if (!window.confirm("Excluir esta questão? Tentativas vinculadas também serão removidas.")) return;
    try {
      await deleteQuestion(q.id);
      notify("Questão excluída.", "success");
      load();
    } catch (e) { notify(e.message, "error"); }
  };

  const formTopics = subjects.find((s) => s.id === Number(form?.subjectId))?.topics || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Questões"
        subtitle={`${items.length} questão(ões) exibida(s)`}
        action={<button className="btn-primary" onClick={openNew}>+ Nova questão</button>}
      />

      <div className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="input"
          placeholder="Buscar enunciado..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select className="input" value={filters.subjectId}
          onChange={(e) => setFilters({ ...filters, subjectId: e.target.value, topicId: "" })}>
          <option value="">Todas as disciplinas</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" value={filters.topicId}
          onChange={(e) => setFilters({ ...filters, topicId: e.target.value })}>
          <option value="">Todos os assuntos</option>
          {topicList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input" value={filters.difficulty}
          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
          <option value="">Todas as dificuldades</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{difficultyLabel(d)}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner size="lg" label="Carregando questões..." />
        ) : items.length === 0 ? (
          <EmptyState
            title="Nenhuma questão encontrada"
            message="Ajuste os filtros ou crie uma nova questão."
            action={<button className="btn-primary" onClick={openNew}>+ Nova questão</button>}
          />
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="p-4">Enunciado</th>
                <th className="p-4">Disciplina / Assunto</th>
                <th className="p-4">Dificuldade</th>
                <th className="p-4">Ano</th>
                <th className="p-4">Tentativas</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="max-w-md p-4">
                    <p className="line-clamp-2 text-slate-700">{q.statement}</p>
                  </td>
                  <td className="p-4 text-slate-600">
                    {q.subject?.name || "—"}
                    <span className="block text-xs text-slate-400">{q.topic?.name}</span>
                  </td>
                  <td className="p-4"><span className={`chip text-xs ${difficultyStyle(q.difficulty)}`}>{difficultyLabel(q.difficulty)}</span></td>
                  <td className="p-4 text-slate-600">{q.grade}</td>
                  <td className="p-4 text-slate-600">{q.attempts ?? 0}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button className="mr-3 font-semibold text-brand-600 hover:underline" onClick={() => openEdit(q)}>Editar</button>
                    <button className="font-semibold text-red-500 hover:underline" onClick={() => remove(q)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4">
          <form onSubmit={save} className="card my-8 w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{form.id ? "Editar questão" : "Nova questão"}</h2>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setForm(null)} aria-label="Fechar">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Enunciado * <span className="text-xs text-slate-400">(mín. 10 caracteres)</span></label>
                <textarea className="input min-h-[100px]" value={form.statement} required
                  onChange={(e) => setForm({ ...form, statement: e.target.value })} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Disciplina *</label>
                  <select className="input" required value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value, topicId: "" })}>
                    <option value="">Selecione...</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Assunto *</label>
                  <select className="input" required value={form.topicId}
                    onChange={(e) => setForm({ ...form, topicId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {formTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Dificuldade *</label>
                  <select className="input" value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{difficultyLabel(d)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Ano escolar *</label>
                  <select className="input" value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Alternativas * (selecione a correta)</label>
                <div className="space-y-2">
                  {form.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correctOption" checked={o.isCorrect}
                        onChange={() => setForm((f) => ({ ...f, options: f.options.map((x, idx) => ({ ...x, isCorrect: idx === i })) }))}
                        className="h-4 w-4 shrink-0 accent-orange-500" aria-label={`Marcar alternativa ${i + 1} como correta`} />
                      <input className="input" placeholder={`Alternativa ${i + 1}`} value={o.text} required
                        onChange={(e) => setOpt(i, { text: e.target.value })} />
                      {form.options.length > 2 && (
                        <button type="button" className="shrink-0 text-slate-400 hover:text-red-500"
                          onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))}
                          aria-label={`Remover alternativa ${i + 1}`}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                {form.options.length < 6 && (
                  <button type="button" className="mt-2 text-sm font-semibold text-brand-600 hover:underline"
                    onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: "", isCorrect: false }] }))}>
                    + Adicionar alternativa
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Explicação * <span className="text-xs text-slate-400">(exibida após a resposta, mín. 5 caracteres)</span></label>
                <textarea className="input min-h-[80px]" value={form.explanation} required
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Salvando..." : "Salvar questão"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
