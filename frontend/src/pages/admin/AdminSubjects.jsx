import React, { useEffect, useState } from "react";
import {
  createSubject, updateSubject, deleteSubject,
  createTopic, updateTopic, deleteTopic,
} from "../../services/adminService";
import { getSubjects } from "../../services/contentService";
import { Spinner, EmptyState, PageHeader } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

const ICONS = ["📘", "🧮", "🔬", "🌍", "📖", "🧠", "⏱️", "🎵", "🎨", "💻", "📐", "⚗️"];
const COLORS = ["#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"];

export default function AdminSubjects() {
  const { notify } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectForm, setSubjectForm] = useState(null);
  const [topicForm, setTopicForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSubjects(await getSubjects());
    } catch (e) { notify(e.message, "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const saveSubject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: subjectForm.name.trim(), icon: subjectForm.icon, color: subjectForm.color };
      if (subjectForm.id) await updateSubject(subjectForm.id, payload);
      else await createSubject(payload);
      notify("Disciplina salva.", "success");
      setSubjectForm(null);
      load();
    } catch (err) { notify(err.message, "error"); }
    finally { setSaving(false); }
  };

  const saveTopic = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (topicForm.id) await updateTopic(topicForm.id, { name: topicForm.name.trim() });
      else await createTopic({ name: topicForm.name.trim(), subjectId: Number(topicForm.subjectId) });
      notify("Assunto salvo.", "success");
      setTopicForm(null);
      load();
    } catch (err) { notify(err.message, "error"); }
    finally { setSaving(false); }
  };

  const removeSubject = async (s) => {
    if (!window.confirm(`Excluir "${s.name}"? Assuntos, questões e tentativas vinculadas serão removidos. Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteSubject(s.id);
      notify("Disciplina excluída.", "success");
      load();
    } catch (e) { notify(e.message, "error"); }
  };

  const removeTopic = async (t) => {
    if (!window.confirm(`Excluir o assunto "${t.name}"? Questões e tentativas vinculadas serão removidas.`)) return;
    try {
      await deleteTopic(t.id);
      notify("Assunto excluído.", "success");
      load();
    } catch (e) { notify(e.message, "error"); }
  };

  if (loading) return <Spinner size="lg" label="Carregando disciplinas..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disciplinas & Assuntos"
        subtitle={`${subjects.length} disciplina(s) cadastrada(s)`}
        action={
          <button className="btn-primary"
            onClick={() => setSubjectForm({ name: "", icon: ICONS[0], color: COLORS[0] })}>
            + Nova disciplina
          </button>
        }
      />

      {subjects.length === 0 && (
        <EmptyState
          title="Nenhuma disciplina"
          message="Execute o seed do banco ou crie a primeira disciplina."
          action={<button className="btn-primary" onClick={() => setSubjectForm({ name: "", icon: ICONS[0], color: COLORS[0] })}>+ Nova disciplina</button>}
        />
      )}

      <div className="space-y-4">
        {subjects.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: `${s.color}1a` }}>{s.icon}</span>
                <div>
                  <h2 className="font-bold">{s.name}</h2>
                  <p className="text-xs text-slate-500">
                    {s.topics.length} assunto(s) · {s.totalQuestions} questão(ões)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-outline text-xs" onClick={() => setTopicForm({ name: "", subjectId: s.id })}>
                  + Assunto
                </button>
                <button className="btn-outline text-xs"
                  onClick={() => setSubjectForm({ id: s.id, name: s.name, icon: s.icon, color: s.color })}>
                  Editar
                </button>
                <button className="btn-outline text-xs !border-red-200 !text-red-500" onClick={() => removeSubject(s)}>
                  Excluir
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {s.topics.length === 0 && <span className="text-xs text-slate-400">Nenhum assunto ainda.</span>}
              {s.topics.map((t) => (
                <span key={t.id} className="chip bg-slate-100 text-slate-700">
                  {t.name}
                  <button className="ml-1 text-slate-400 hover:text-brand-600" title="Editar assunto"
                    onClick={() => setTopicForm({ id: t.id, name: t.name, subjectId: s.id })}>✎</button>
                  <button className="ml-1 text-slate-400 hover:text-red-500" title="Excluir assunto"
                    onClick={() => removeTopic(t)}>✕</button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {subjectForm && (
        <Modal title={subjectForm.id ? "Editar disciplina" : "Nova disciplina"} onClose={() => setSubjectForm(null)}>
          <form onSubmit={saveSubject} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <input className="input" required minLength={2} value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((ic) => (
                  <button type="button" key={ic} aria-label={`Ícone ${ic}`}
                    className={`h-9 w-9 rounded-lg text-lg ${subjectForm.icon === ic ? "bg-brand-500" : "bg-slate-100"}`}
                    onClick={() => setSubjectForm({ ...subjectForm, icon: ic })}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cor</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <button type="button" key={c} aria-label={`Cor ${c}`}
                    className={`h-8 w-8 rounded-full ${subjectForm.color === c ? "ring-2 ring-slate-900 ring-offset-2" : ""}`}
                    style={{ backgroundColor: c }} onClick={() => setSubjectForm({ ...subjectForm, color: c })} />
                ))}
                <input type="color" className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                  value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setSubjectForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </Modal>
      )}

      {topicForm && (
        <Modal title={topicForm.id ? "Editar assunto" : "Novo assunto"} onClose={() => setTopicForm(null)}>
          <form onSubmit={saveTopic} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <input className="input" required minLength={2} value={topicForm.name}
                onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setTopicForm(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4"
      role="dialog" aria-modal="true">
      <div className="card my-8 w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
