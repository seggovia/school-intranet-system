import { FormEvent, useState } from 'react';
import { createGradebookEvaluation, updateGradebookEvaluation, type GradebookEvaluationPayload } from '../api';
import type { EvaluationType, GradebookEvaluation } from '../types';

const evaluationOptions: Array<{ value: EvaluationType; label: string }> = [
  { value: 'prueba', label: 'Prueba' },
  { value: 'tarea', label: 'Tarea' },
  { value: 'control', label: 'Control' },
  { value: 'trabajo', label: 'Trabajo' }
];

export function EvaluationModal({
  evaluation,
  sectionId,
  subjectId,
  onClose,
  onSaved
}: {
  evaluation?: GradebookEvaluation;
  sectionId: string;
  subjectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(event.currentTarget);
    const title = String(fd.get('title') ?? '').trim();
    const weight = Number(fd.get('weight') ?? 0);

    if (!title) {
      setError('El nombre de la evaluación es obligatorio.');
      setSaving(false);
      return;
    }

    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      setError('La ponderación debe estar entre 0 y 100.');
      setSaving(false);
      return;
    }

    const payload: GradebookEvaluationPayload = {
      title,
      sectionId,
      subjectId,
      date: String(fd.get('date') ?? ''),
      weight,
      type: String(fd.get('type') ?? 'prueba')
    };

    try {
      if (evaluation) await updateGradebookEvaluation(evaluation.id, payload);
      else await createGradebookEvaluation(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la evaluación.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <form className="admin-modal gradebook-evaluation-modal" onSubmit={submit} noValidate>
        <header>
          <div><span>Gradebook</span><h2>{evaluation ? 'Editar evaluación' : 'Nueva evaluación'}</h2></div>
          <button type="button" onClick={onClose} disabled={saving}>x</button>
        </header>
        <div className="admin-form-grid">
          <label>Nombre<input name="title" defaultValue={evaluation?.title} required placeholder="Ej: Prueba unidad 1" /></label>
          <label>Tipo
            <select name="type" defaultValue={evaluationOptions.some((option) => option.value === evaluation?.type) ? evaluation?.type : 'prueba'}>
              {evaluationOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label>Fecha<input name="date" type="date" defaultValue={evaluation?.date ?? new Date().toISOString().slice(0, 10)} required /></label>
          <label>Ponderación (%)<input name="weight" type="number" min="0" max="100" step="1" defaultValue={evaluation?.weight ?? 0} required /></label>
        </div>
        {error && <p className="admin-modal-error">{error}</p>}
        <footer><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar evaluación'}</button></footer>
      </form>
    </div>
  );
}
