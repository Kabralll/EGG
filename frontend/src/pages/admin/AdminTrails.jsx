import React, { useEffect, useState, useCallback } from "react";
import { getTrailsAdmin, createTrail, updateTrail, deleteTrail, getQuestions } from "../../services/adminService";
import { getSubjects } from "../../services/contentService";
import { Spinner, EmptyState, PageHeader } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { Modal } from "./AdminSubjects";

const ICONS = ["🛤️", "🚀", "🧩", "🎯", "📈", "🔭", "⚗️", "🗺️", "💡", "🏅"];

function emptyTrail() {
  return { title: "", description: "", icon: ICONS[0], subjectId: "", steps: [{ title: "", questionIds: [] }] };
}

export default function AdminTrails() {
  const { notify } = useToast();
  const [trails, setTrails] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([getTrailsAdmin(), getSubjects()]);
      setTrails(t);
      setSubjects(s);
    } catch (e) { notify(e.message, "error"); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const setStep = (i, patch) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

  const save = async (e) => {
    e.preventDefault();
    if (form.steps.some((s) => !s.title.trim())) return notify("Toda etapa precisa de um nome.", "error");
    if (form.steps.some((s) => s.questionIds.length === 0)) return notify("Toda etapa precisa de ao menos uma questão.", "error");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon,
        subjectId: Number(form.subjectId),
        steps: form.steps.map((s) => ({ title: s.title.trim(), questionIds: s.questionIds.map(Number) })),
        ...(form.order !== undefined ? { order: Number(form.order) } : {}),
      };
      if (form.id) await updateTrail(form.id, payload);
      else await createTrail(payload);
      notify("Trilha salva com sucesso.", "success");
      setForm(null);
      load();
    } catch (err) {
      const firstField = err.fields && Object.values(err.fields)[0];
      notify(firstField || err.message, "error");
    } finally { setSaving(false); }
  };

  const remove = async (t) => {
    if (!window.confirm(`Excluir a trilha "${t.title}"? Conclusões de estudantes também serão removidas.`)) return;
    try {
      await deleteTrail(t.id);
      notify("Trilha excluída.", "success");
      load();
    } catch (e) { notify(e.message, "error"); }
  };

  if (loading) return <Spinner size="lg" label="Carregando trilhas..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilhas"
        subtitle={`${trails.length} trilha(s) cadastrada(s)`}
        action={<button className="btn-primary" onClick={() => setForm(emptyTrail())}>+ Nova trilha</button>}
      />

      {trails.length === 0 && (
        <EmptyState
          title="Nenhuma trilha"
          message="Crie a primeira trilha de estudos com etapas e questões."
          action={<button className="btn-primary" onClick={() => setForm(emptyTrail())}>+ Nova trilha</button>}
        />
      )}

      <div className="space-y-4">
        {trails.map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${t.subject?.color || "#f97316"}1a` }}>{t.icon}</span>
                <div>
                  <h2 className="font-bold">{t.title}</h2>
                  <p className="text-xs text-slate-500">{t.description}</p>
                  <p className="text-xs text-slate-400">
                    {t.subject?.name} · {t.steps?.length || 0} etapa(s) · {t.completions ?? 0} conclusão(ões)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-outline text-xs"
                  onClick={() => setForm({
                    id: t.id,
                    order: t.order,
                    title: t.title,
                    description: t.description || "",
                    icon: t.icon || ICONS[0],
                    subjectId: t.subject?.id || "",
                    steps: (t.steps || []).length
                      ? t.steps.map((s) => ({ title: s.title, questionIds: s.questionIds || [] }))
                      : [{ title: "", questionIds: [] }],
                  })}>
                  Editar
                </button>
                <button className="btn-outline text-xs !border-red-200 !text-red-500" onClick={() => remove(t)}>Excluir</button>
              </div>
            </div>

            <ol className="mt-4 space-y-2 border-l-2 border-slate-100 pl-4">
              {(t.steps || []).length === 0 && <li className="text-xs text-slate-400">Nenhuma etapa.</li>}
              {(t.steps || []).map((st) => (
                <li key={st.id ?? st.order} className="relative">
                  <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-brand-500" />
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-semibold">{st.order}. {st.title}</span>
                    <span className="ml-2 text-xs text-slate-500">{(st.questionIds || []).length} questão(ões)</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {form && (
        <Modal title={form.id ? "Editar trilha" : "Nova trilha"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <label className="mb-1 block text-sm font-medium">Título * <span className="text-xs text-slate-400">(mín. 3 caracteres)</span></label>
              <input className="input" required minLength={3} value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descrição * <span className="text-xs text-slate-400">(mín. 5 caracteres)</span></label>
              <textarea className="input min-h-[70px]" required minLength={5} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Disciplina *</label>
                <select className="input" required value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ic) => (
                    <button type="button" key={ic} aria-label={`Ícone ${ic}`}
                      className={`h-9 w-9 rounded-lg text-lg ${form.icon === ic ? "bg-brand-500" : "bg-slate-100"}`}
                      onClick={() => setForm({ ...form, icon: ic })}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Etapas * <span className="text-xs text-slate-400">(ordem exibida ao estudante)</span></label>
                <button type="button" className="text-sm font-semibold text-brand-600 hover:underline"
                  onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { title: "", questionIds: [] }] }))}>
                  + Etapa
                </button>
              </div>

              <div className="space-y-3">
                {form.steps.map((st, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                      <input className="input" placeholder="Nome da etapa" value={st.title} required
                        onChange={(e) => setStep(i, { title: e.target.value })} />
                      {form.steps.length > 1 && (
                        <button type="button" className="shrink-0 text-slate-400 hover:text-red-500"
                          aria-label="Remover etapa"
                          onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))}>✕</button>
                      )}
                    </div>
                    <QuestionPicker selected={st.questionIds} subjects={subjects}
                      onChange={(ids) => setStep(i, { questionIds: ids })} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar trilha"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function QuestionPicker({ selected, onChange, subjects }) {
  const [subjectId, setSubjectId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = {};
    if (subjectId) params.subjectId = subjectId;
    getQuestions(params)
      .then((res) => { if (active) setQuestions(res); })
      .catch(() => { if (active) setQuestions([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subjectId]);

  return (
    <div className="mt-2">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select className="input !w-auto !py-1.5 text-sm" value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Todas as disciplinas</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-xs text-slate-500">{selected.length} questão(ões) selecionada(s)</span>
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {loading ? (
          <Spinner size="sm" label="Carregando questões..." />
        ) : questions.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhuma questão disponível.</p>
        ) : questions.map((q) => (
          <label key={q.id} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
            <input type="checkbox" className="mt-1 shrink-0 accent-orange-500" checked={selected.includes(q.id)}
              onChange={(e) => onChange(e.target.checked ? [...selected, q.id] : selected.filter((x) => x !== q.id))} />
            <span className="line-clamp-2 text-slate-700">
              {q.statement}
              <span className="ml-1 text-xs text-slate-400">({q.subject?.name})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
