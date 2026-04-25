import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, Edit3, ExternalLink, FileArchive, FileSpreadsheet, FileText, Inbox, Link as LinkIcon, MapPin, Megaphone, MessageSquare, PencilRuler, Plus, Presentation, Trash2, Upload, UserRound, Users } from 'lucide-react';
import { createSubjectUnit, createUnitAssignment, deleteAssignmentSubmission, deleteSubjectUnit, deleteUnitAssignment, deleteUnitMaterial, downloadUnitMaterial, loadSubjectDetail, updateSubjectUnit, updateUnitAssignment, updateUnitAssignmentStatus, uploadAssignmentSubmission, uploadUnitMaterial } from '../api';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsyncData } from '../hooks';
import type { DocumentItem, SubjectDetailData, SubjectUnit, UnitAssignment, UnitContentItem, User } from '../types';

type CourseTab = 'curso' | 'participantes' | 'calificaciones' | 'mas';
type ModalState =
  | { type: 'unit'; mode: 'create'; unit?: undefined }
  | { type: 'unit'; mode: 'edit'; unit: SubjectUnit }
  | { type: 'material'; unit: SubjectUnit; materialType: UnitContentItem['type'] }
  | { type: 'assignment'; mode: 'create'; unit: SubjectUnit; assignment?: undefined }
  | { type: 'assignment'; mode: 'edit'; unit?: undefined; assignment: UnitAssignment }
  | { type: 'submission'; assignment: UnitAssignment }
  | { type: 'delete-unit'; unit: SubjectUnit }
  | { type: 'delete-material'; material: UnitContentItem }
  | { type: 'delete-assignment'; assignment: UnitAssignment }
  | null;
type ConfirmState =
  | { title: string; message: string; confirmLabel: string; tone?: 'danger' | 'primary'; onConfirm: () => Promise<void> }
  | null;

const emptySubjectDetail: SubjectDetailData = {
  subject: { id: '', name: '', code: '' },
  teacher: '',
  section: '',
  room: '',
  schedule: [],
  units: [],
  materials: [],
  assessments: [],
  sections: []
};

const unitFallbacks = [
  {
    duration: '3 semanas',
    outcomes: ['Reconoce conceptos base de la asignatura.', 'Relaciona contenidos con situaciones de aula.', 'Desarrolla una actividad aplicada.'],
    bibliography: ['Apuntes docentes de la asignatura', 'Bibliografia digital disponible en biblioteca']
  },
  {
    duration: '4 semanas',
    outcomes: ['Aplica procedimientos en ejercicios guiados.', 'Contrasta soluciones con criterios tecnicos.', 'Entrega evidencias de avance.'],
    bibliography: ['Material complementario Unidad 2', 'Lecturas seleccionadas por el docente']
  },
  {
    duration: '3 semanas',
    outcomes: ['Integra contenidos del curso.', 'Presenta una solucion o producto final.', 'Evalua su desempeno con pauta.'],
    bibliography: ['Documento de cierre de asignatura', 'Recursos de apoyo para evaluacion final']
  }
];

function linesToList(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function scheduleSummary(subject: SubjectDetailData) {
  if (!subject.schedule.length) return 'Horario por confirmar';
  return subject.schedule.map((item) => `${item.weekdayName} ${item.startsAt}-${item.endsAt}`).join(' · ');
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha definida';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha definida';
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function dueTone(value?: string | null) {
  if (!value) return 'pending';
  return new Date(value).getTime() < Date.now() ? 'closed' : 'open';
}

function isAssignmentClosed(assignment: UnitAssignment) {
  return assignment.status === 'cerrado' || dueTone(assignment.dueDate) === 'closed';
}

function safeFilename(title: string, fallback = 'material') {
  return (title || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || fallback;
}

function dateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function timeInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toTimeString().slice(0, 5);
}

function contentIcon(type: UnitContentItem['type']) {
  if (type === 'presentacion') return Presentation;
  if (type === 'guia') return FileText;
  if (type === 'documento') return FileArchive;
  if (type === 'link') return LinkIcon;
  return BookOpen;
}

function materialIcon(material: DocumentItem | UnitContentItem) {
  const text = 'title' in material ? material.title.toLowerCase() : '';
  const type = 'type' in material ? material.type : '';
  if (type === 'presentacion' || text.includes('ppt')) return Presentation;
  if (text.includes('xls')) return FileSpreadsheet;
  if (text.includes('doc')) return FileArchive;
  if (text.includes('link') || text.includes('enlace')) return LinkIcon;
  return FileText;
}

function materialKind(material: DocumentItem | UnitContentItem) {
  if ('type' in material) {
    if (material.type === 'presentacion') return 'PPT';
    if (material.type === 'guia') return 'PDF';
    if (material.type === 'documento') return 'DOC';
    if (material.type === 'link') return 'Link';
    return 'Archivo';
  }
  const title = material.title.toLowerCase();
  if (title.includes('ppt')) return 'PPT';
  if (title.includes('xls')) return 'XLS';
  if (title.includes('doc')) return 'DOC';
  if (title.includes('link') || title.includes('enlace')) return 'Link';
  return 'PDF';
}

function UnitMaterialRow({ item, onOpen }: { item: DocumentItem | UnitContentItem; onOpen: (item: DocumentItem | UnitContentItem) => void }) {
  const Icon = materialIcon(item);
  const isLink = 'fileUrl' in item && item.fileUrl && item.fileUrl !== '#';

  return (
    <button type="button" className="classroom-material-row" onClick={() => onOpen(item)} disabled={!isLink}>
      <span className="material-icon"><Icon size={20} /></span>
      <span>
        <strong>{item.title}</strong>
        <small>{materialKind(item)} · {'fileUrl' in item ? item.updatedAt : item.status}</small>
      </span>
      <em>{isLink ? 'Abrir' : 'Sin archivo'}</em>
    </button>
  );
}

function UnitMaterialListItem({
  item,
  canEdit,
  onOpen,
  onDelete
}: {
  item: UnitContentItem;
  canEdit: boolean;
  onOpen: (item: DocumentItem | UnitContentItem) => void;
  onDelete: (material: UnitContentItem) => void;
}) {
  return (
    <div className="material-row-wrap">
      <UnitMaterialRow item={item} onOpen={onOpen} />
      {canEdit && Boolean(item.owner) && (
        <button className="danger-button compact-danger" onClick={() => onDelete(item)}>
          <Trash2 size={15} /> Eliminar
        </button>
      )}
    </div>
  );
}

function AssignmentBoxRow({
  assignment,
  canEdit,
  canSubmit,
  onOpenAssignment,
  onEditAssignment,
  onToggleAssignmentStatus,
  onDeleteAssignment,
  onSubmitAssignment
}: {
  assignment: UnitAssignment;
  canEdit: boolean;
  canSubmit: boolean;
  onOpenAssignment: (assignment: UnitAssignment) => void;
  onEditAssignment: (assignment: UnitAssignment) => void;
  onToggleAssignmentStatus: (assignment: UnitAssignment) => void;
  onDeleteAssignment: (assignment: UnitAssignment) => void;
  onSubmitAssignment: (assignment: UnitAssignment) => void;
}) {
  const tone = isAssignmentClosed(assignment) ? 'closed' : dueTone(assignment.dueDate);
  const isClosed = isAssignmentClosed(assignment);
  const hasSubmission = Boolean(assignment.submissionItems?.length);
  const statusLabel = hasSubmission && canSubmit ? 'Entregado' : isClosed ? 'Cerrado' : assignment.status;

  if (isClosed && canSubmit) {
    return (
      <article className="assignment-box-row closed-student-box">
        <div className="assignment-box-icon"><Inbox size={24} /></div>
        <div className="assignment-box-main">
          <div className="assignment-title-row">
            <strong>{assignment.title}</strong>
            <span className="assignment-status closed">Cerrado</span>
          </div>
          <p>{assignment.description}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="assignment-box-row">
      <div className="assignment-box-icon"><Inbox size={24} /></div>
      <div className="assignment-box-main">
        <div className="assignment-title-row">
          <strong>{assignment.title}</strong>
          <span className={`assignment-status ${hasSubmission && canSubmit ? 'submitted' : tone}`}>{statusLabel}</span>
        </div>
        <p>{assignment.description}</p>
        <dl className="assignment-dates">
          <div><dt>Apertura</dt><dd>{formatDateTime(assignment.openedAt)}</dd></div>
          <div><dt>Cierre</dt><dd>{formatDateTime(assignment.dueDate)}</dd></div>
          <div><dt>Enviados</dt><dd>{assignment.submissions}</dd></div>
        </dl>
      </div>
      <div className="assignment-actions">
        {canEdit && <button className="secondary-button" onClick={() => onEditAssignment(assignment)}><Edit3 size={17} /> Editar</button>}
        {canEdit && <button className="secondary-button" onClick={() => onToggleAssignmentStatus(assignment)}><Clock size={17} /> {assignment.status === 'cerrado' ? 'Reabrir' : 'Cerrar'}</button>}
        {canEdit && <button className="danger-button" onClick={() => onDeleteAssignment(assignment)}><Trash2 size={17} /> Eliminar</button>}
        <button className="secondary-button" onClick={() => onOpenAssignment(assignment)}><ExternalLink size={17} /> Abrir</button>
        {canSubmit && <button className="primary-button" disabled={isClosed} onClick={() => onSubmitAssignment(assignment)}><Upload size={17} /> {hasSubmission ? 'Reemplazar' : 'Agregar entrega'}</button>}
      </div>
    </article>
  );
}

function AssignmentDetail({
  assignment,
  canEdit,
  canSubmit,
  onBack,
  onSubmitAssignment,
  onEditAssignment,
  onToggleAssignmentStatus,
  onDeleteAssignment,
  onDeleteSubmission
}: {
  assignment: UnitAssignment;
  canEdit: boolean;
  canSubmit: boolean;
  onBack: () => void;
  onSubmitAssignment: (assignment: UnitAssignment) => void;
  onEditAssignment: (assignment: UnitAssignment) => void;
  onToggleAssignmentStatus: (assignment: UnitAssignment) => void;
  onDeleteAssignment: (assignment: UnitAssignment) => void;
  onDeleteSubmission: (assignment: UnitAssignment) => void;
}) {
  const tone = isAssignmentClosed(assignment) ? 'closed' : dueTone(assignment.dueDate);
  const isClosed = isAssignmentClosed(assignment);
  const ownSubmission = assignment.submissionItems?.[0];

  if (isClosed && !canEdit) {
    return (
      <section className="assignment-detail-panel closed-student-detail">
        <div className="assignment-detail-top">
          <button className="secondary-button" onClick={onBack}>Volver</button>
          <span className="assignment-status closed">Cerrado</span>
        </div>
        <div>
          <span className="eyebrow">Buzon de entrega</span>
          <h3>{assignment.title}</h3>
          <p>{assignment.description}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="assignment-detail-panel">
      <div className="assignment-detail-top">
        <button className="secondary-button" onClick={onBack}>Volver</button>
        <span className={`assignment-status ${tone}`}>{isClosed ? 'Cerrado' : assignment.status}</span>
      </div>
      <div>
        <span className="eyebrow">Buzon de entrega</span>
        <h3>{assignment.title}</h3>
        <p>{assignment.description}</p>
      </div>
      <div className="deadline-strip">
        <span><Clock size={17} /> Fecha limite</span>
        <strong>{formatDateTime(assignment.dueDate)}</strong>
      </div>
      <h4>Estado de la entrega</h4>
      <div className="submission-status-table">
        <span>Estado de la entrega</span><strong>{ownSubmission ? 'Enviado para calificar' : 'No enviado'}</strong>
        <span>Estado de la calificacion</span><strong>Sin calificar</strong>
        <span>Tiempo restante</span><strong>{isClosed ? 'El buzon ya cerro' : `Disponible hasta ${formatDateTime(assignment.dueDate)}`}</strong>
        <span>Archivos enviados</span><strong>{ownSubmission?.originalName ?? 'Sin archivo enviado'}</strong>
        <span>Comentarios</span><strong>{ownSubmission?.comment || 'Sin comentarios'}</strong>
      </div>
      {!canEdit && (
        <div className="assignment-detail-actions">
          {ownSubmission && !isClosed && <button className="danger-button" onClick={() => onDeleteSubmission(assignment)}><Trash2 size={17} /> Quitar entrega</button>}
          <button className="primary-button" disabled={isClosed} onClick={() => onSubmitAssignment(assignment)}>
            <Upload size={17} /> {ownSubmission ? 'Reemplazar archivo' : 'Agregar entrega'}
          </button>
        </div>
      )}
      {canEdit && (
        <div className="assignment-detail-actions">
          <button className="secondary-button" onClick={() => onEditAssignment(assignment)}><Edit3 size={17} /> Editar buzon</button>
          <button className="secondary-button" onClick={() => onToggleAssignmentStatus(assignment)}><Clock size={17} /> {assignment.status === 'cerrado' ? 'Reabrir buzon' : 'Cerrar buzon'}</button>
          <button className="danger-button" onClick={() => onDeleteAssignment(assignment)}><Trash2 size={17} /> Eliminar buzon</button>
        </div>
      )}
      {canEdit && (
        <div className="teacher-submission-list">
          <strong>Entregas recibidas</strong>
          {assignment.submissionItems?.length ? assignment.submissionItems.map((item) => (
            <span key={item.id}>{item.student} - {item.originalName ?? 'Archivo enviado'} - {formatDateTime(item.submittedAt)}</span>
          )) : <span>Sin entregas registradas.</span>}
        </div>
      )}
      {!canSubmit && !canEdit && <p className="assignment-muted">Este buzon ya no acepta nuevos archivos.</p>}
    </section>
  );
}

function ConfirmDialog({
  confirm,
  busy,
  onClose
}: {
  confirm: ConfirmState;
  busy: boolean;
  onClose: () => void;
}) {
  if (!confirm) return null;

  return (
    <div className="classroom-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Confirmacion</span>
            <h2>{confirm.title}</h2>
          </div>
        </header>
        <p>{confirm.message}</p>
        <footer>
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button
            type="button"
            className={confirm.tone === 'danger' ? 'danger-button' : 'primary-button'}
            disabled={busy}
            onClick={confirm.onConfirm}
          >
            {busy ? 'Procesando...' : confirm.confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ClassroomModal({
  modal,
  subject,
  busy,
  error,
  onClose,
  onSubmit
}: {
  modal: ModalState;
  subject: SubjectDetailData;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!modal) return null;
  const isConfirm = modal.type === 'delete-unit' || modal.type === 'delete-material' || modal.type === 'delete-assignment';
  const title =
    modal.type === 'unit' ? (modal.mode === 'create' ? 'Nueva unidad' : 'Editar unidad')
      : modal.type === 'material' ? 'Agregar material'
        : modal.type === 'assignment' ? (modal.mode === 'create' ? 'Crear buzon de entrega' : 'Editar buzon de entrega')
          : modal.type === 'submission' ? 'Subir entrega al buzon'
            : modal.type === 'delete-unit' ? 'Eliminar unidad'
              : modal.type === 'delete-material' ? 'Eliminar material'
                : 'Eliminar buzon';
  const unit = modal.type === 'unit' ? modal.unit : undefined;

  return (
    <div className="classroom-modal-backdrop" role="presentation" onClick={onClose}>
      <form className="classroom-editor-modal" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">{subject.subject.name}</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>x</button>
        </header>

        {modal.type === 'unit' && (
          <div className="editor-form-grid">
            <label>Nombre de unidad<input name="title" defaultValue={unit?.title ?? `Unidad ${subject.units.length + 1}`} required /></label>
            <label>Duracion estimada<input name="duration" defaultValue={unit?.duration ?? '3 semanas'} /></label>
            <label className="wide-field">Antecedentes<textarea name="description" defaultValue={unit?.description ?? ''} required rows={4} /></label>
            <label className="wide-field">Aprendizajes esperados<textarea name="outcomes" defaultValue={(unit?.outcomes ?? []).join('\n')} rows={4} /></label>
            <label className="wide-field">Bibliografia<textarea name="bibliography" defaultValue={(unit?.bibliography ?? []).join('\n')} rows={4} /></label>
          </div>
        )}

        {modal.type === 'material' && (
          <div className="editor-form-grid">
            <label>Unidad<input value={modal.unit.title} disabled /></label>
            <label>Tipo
              <select name="type" defaultValue={modal.materialType === 'presentacion' ? 'presentacion' : 'guia'}>
                <option value="presentacion">PPT</option>
                <option value="guia">Documento</option>
                <option value="documento">Archivo complementario</option>
              </select>
            </label>
            <label className="wide-field">Titulo del material<input name="title" defaultValue={`${materialKind({ id: 'tmp', type: modal.materialType, title: '', status: '' })} - ${modal.unit.title}`} required /></label>
            <label className="wide-field">Archivo<input name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" required /></label>
          </div>
        )}

        {modal.type === 'assignment' && (
          <div className="editor-form-grid">
            <label className="wide-field">Nombre del buzon<input name="title" defaultValue={modal.mode === 'edit' ? modal.assignment.title : `Buzon de entrega - ${modal.unit.title}`} required /></label>
            <label>Dia limite<input name="dueDate" type="date" defaultValue={dateInputValue(modal.assignment?.dueDate)} required /></label>
            <label>Hora limite<input name="dueTime" type="time" defaultValue={timeInputValue(modal.assignment?.dueDate)} required /></label>
            <label className="wide-field">Instrucciones<textarea name="description" defaultValue={modal.assignment?.description ?? 'Sube aqui el archivo final solicitado en la guia del docente.'} required rows={5} /></label>
          </div>
        )}

        {modal.type === 'submission' && (
          <div className="editor-form-grid">
            <div className="submission-deadline wide-field">
              <span><Clock size={16} /> Fecha y hora limite</span>
              <strong>{formatDateTime(modal.assignment.dueDate)}</strong>
            </div>
            <label className="wide-field">Documento de entrega<input name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" required /></label>
            <label className="wide-field">Comentario para el docente<textarea name="comment" rows={4} /></label>
          </div>
        )}

        {isConfirm && (
          <div className="confirm-copy">
            <strong>{modal.type === 'delete-unit' ? modal.unit.title : modal.type === 'delete-material' ? modal.material.title : modal.assignment.title}</strong>
            <p>{modal.type === 'delete-unit' ? 'Se eliminaran tambien sus materiales y buzones asociados.' : modal.type === 'delete-material' ? 'Este material dejara de estar disponible para la unidad.' : 'Se eliminara el buzon y las entregas recibidas.'}</p>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <footer>
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className={isConfirm ? 'danger-button' : 'primary-button'} disabled={busy}>{busy ? 'Guardando...' : isConfirm ? 'Eliminar' : 'Guardar'}</button>
        </footer>
      </form>
    </div>
  );
}

function UnitContent({
  unit,
  index,
  subject,
  canEdit,
  extraMaterials,
  onAddMaterial,
  onCreateSubmission,
  onEditAssignment,
  onToggleAssignmentStatus,
  onDeleteAssignment,
  onDeleteSubmission,
  onSubmitAssignment,
  onEditUnit,
  onDeleteUnit,
  onDeleteMaterial,
  onOpenMaterial
}: {
  unit: SubjectUnit;
  index: number;
  subject: SubjectDetailData;
  canEdit: boolean;
  extraMaterials: UnitContentItem[];
  onAddMaterial: (unit: SubjectUnit, type: UnitContentItem['type']) => void;
  onCreateSubmission: (unit: SubjectUnit) => void;
  onEditAssignment: (assignment: UnitAssignment) => void;
  onToggleAssignmentStatus: (assignment: UnitAssignment) => void;
  onDeleteAssignment: (assignment: UnitAssignment) => void;
  onDeleteSubmission: (assignment: UnitAssignment) => void;
  onSubmitAssignment: (assignment: UnitAssignment) => void;
  onEditUnit: (unit: SubjectUnit) => void;
  onDeleteUnit: (unit: SubjectUnit) => void;
  onDeleteMaterial: (material: UnitContentItem) => void;
  onOpenMaterial: (item: DocumentItem | UnitContentItem) => void;
}) {
  const fallback = unitFallbacks[index] ?? unitFallbacks[0];
  const baseMaterials = unit.contents.length ? unit.contents : [
    { id: `${unit.id}-ppt`, type: 'presentacion', title: `PPT ${unit.title}`, status: 'disponible' },
    { id: `${unit.id}-guia`, type: 'guia', title: `Guia ${unit.title}`, status: 'disponible' }
  ] satisfies UnitContentItem[];
  const unitMaterials = [...baseMaterials, ...extraMaterials];
  const assignments = unit.assignments ?? [];
  const canSubmit = !canEdit;
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId);

  return (
    <article className="classroom-unit-card">
      <header>
        <div>
          <span className="eyebrow">{subject.subject.name}</span>
          <h2>{unit.title}</h2>
        </div>
        {canEdit && (
          <div className="teacher-action-row">
            <button className="secondary-button" onClick={() => onEditUnit(unit)}><Edit3 size={17} /> Editar unidad</button>
            <button className="danger-button" onClick={() => onDeleteUnit(unit)}><Trash2 size={17} /> Eliminar</button>
          </div>
        )}
      </header>

      <section className="unit-info-block">
        <h3>Antecedentes</h3>
        <p>{unit.description || `Modulo de trabajo de ${subject.subject.name} para ${subject.section}.`}</p>
        <div className="unit-facts">
          <span><CalendarDays size={17} /> Duracion estimada <strong>{fallback.duration}</strong></span>
          <span><UserRound size={17} /> Docente <strong>{subject.teacher}</strong></span>
        </div>
      </section>

      <section className="unit-info-block">
        <h3>Aprendizajes esperados</h3>
        <ul>
          {fallback.outcomes.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="unit-info-block">
        <h3>Bibliografia</h3>
        <ul>
          {fallback.bibliography.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="unit-info-block">
        <div className="section-heading-row">
          <h3>Materiales del docente</h3>
          {canEdit && (
            <div className="teacher-action-row">
              <button className="text-button" onClick={() => onAddMaterial(unit, 'presentacion')}><Presentation size={16} /> Agregar PPT</button>
              <button className="text-button" onClick={() => onAddMaterial(unit, 'guia')}><FileText size={16} /> Agregar documento</button>
            </div>
          )}
        </div>
        <div className="classroom-material-list">
          {unitMaterials.map((item) => (
            <UnitMaterialListItem key={item.id} item={item} canEdit={canEdit} onOpen={onOpenMaterial} onDelete={onDeleteMaterial} />
          ))}
        </div>
      </section>

      <section className="unit-info-block">
        <div className="section-heading-row">
          <h3>Buzones de entrega</h3>
          {canEdit && <button className="text-button" onClick={() => onCreateSubmission(unit)}><Inbox size={16} /> Crear buzon</button>}
        </div>
        {selectedAssignment ? (
          <AssignmentDetail
            assignment={selectedAssignment}
            canEdit={canEdit}
            canSubmit={canSubmit}
            onBack={() => setSelectedAssignmentId('')}
            onSubmitAssignment={onSubmitAssignment}
            onEditAssignment={onEditAssignment}
            onToggleAssignmentStatus={onToggleAssignmentStatus}
            onDeleteAssignment={onDeleteAssignment}
            onDeleteSubmission={onDeleteSubmission}
          />
        ) : assignments.length ? (
          <div className="assignment-box-list">
            {assignments.map((assignment) => (
              <AssignmentBoxRow
                key={assignment.id}
                assignment={assignment}
                canEdit={canEdit}
                canSubmit={canSubmit}
                onOpenAssignment={(item) => setSelectedAssignmentId(item.id)}
                onEditAssignment={onEditAssignment}
                onToggleAssignmentStatus={onToggleAssignmentStatus}
                onDeleteAssignment={onDeleteAssignment}
                onSubmitAssignment={onSubmitAssignment}
              />
            ))}
          </div>
        ) : (
          <div className="student-upload-space">
            <div>
              <strong>Sin buzones activos</strong>
              <span>El docente puede crear un buzon con fecha y hora limite cuando corresponda recibir archivos.</span>
            </div>
          </div>
        )}
      </section>
    </article>
  );
}

export function SubjectDetailPage({ user }: { user: User }) {
  const { id } = useParams();
  const [reloadKey, setReloadKey] = useState(0);
  const loader = useCallback(() => id ? loadSubjectDetail(id) : Promise.resolve(emptySubjectDetail), [id, reloadKey]);
  const { data: subject, loading, error } = useAsyncData(loader, emptySubjectDetail);
  const [activeTab, setActiveTab] = useState<CourseTab>('curso');
  const [activeUnit, setActiveUnit] = useState('inicio');
  const [notice, setNotice] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [indexCollapsed, setIndexCollapsed] = useState(false);
  const canManageCourse = ['admin', 'director', 'teacher'].includes(user.primaryRole);
  const canEditCourse = canManageCourse && editMode;
  const canCommunicate = ['student', 'guardian', 'teacher', 'admin', 'director'].includes(user.primaryRole);
  const students = useMemo(() => {
    const seen = new Set<string>();
    return subject.sections.flatMap((section) => section.students).filter((student) => {
      if (seen.has(student.id)) return false;
      seen.add(student.id);
      return true;
    });
  }, [subject.sections]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  }

  function reloadDetail() {
    setReloadKey((value) => value + 1);
  }

  function toggleEditMode() {
    setEditMode((current) => {
      const next = !current;
      showNotice(next ? 'Modo edicion activado.' : 'Modo lectura activado.');
      return next;
    });
  }

  function communicate() {
    if (!subject.subject?.id) return;
    showNotice(`Canal de comunicacion preparado para ${subject.section}.`);
  }

  async function addCourseMaterial() {
    if (!subject.subject?.id) return;
    const unit = subject.units.find((item) => item.id === activeUnit) ?? subject.units[0];
    if (!unit) return;
    setModal({ type: 'material', unit, materialType: 'guia' });
  }

  function addUnitMaterial(unit: SubjectUnit, type: UnitContentItem['type']) {
    setModal({ type: 'material', unit, materialType: type });
  }

  function createSubmission(unit: SubjectUnit) {
    setModal({ type: 'assignment', mode: 'create', unit });
  }

  function editAssignment(assignment: UnitAssignment) {
    setModal({ type: 'assignment', mode: 'edit', assignment });
  }

  function deleteAssignment(assignment: UnitAssignment) {
    setModal({ type: 'delete-assignment', assignment });
  }

  async function toggleAssignmentStatus(assignment: UnitAssignment) {
    const nextStatus = assignment.status === 'cerrado' ? 'activo' : 'cerrado';
    setConfirm({
      title: nextStatus === 'cerrado' ? 'Cerrar buzon' : 'Reabrir buzon',
      message: nextStatus === 'cerrado'
        ? 'Al cerrar este buzon los estudiantes no podran subir, reemplazar ni quitar entregas.'
        : 'Al reabrir este buzon los estudiantes podran volver a modificar sus entregas hasta la fecha limite.',
      confirmLabel: nextStatus === 'cerrado' ? 'Cerrar buzon' : 'Reabrir buzon',
      tone: nextStatus === 'cerrado' ? 'danger' : 'primary',
      onConfirm: async () => {
        await applyAssignmentStatus(assignment, nextStatus);
      }
    });
  }

  async function applyAssignmentStatus(assignment: UnitAssignment, nextStatus: 'activo' | 'cerrado') {
    setSaving(true);
    try {
      await updateUnitAssignmentStatus(assignment.id, nextStatus);
      showNotice(nextStatus === 'cerrado' ? 'Buzon cerrado.' : 'Buzon reabierto.');
      setConfirm(null);
      reloadDetail();
    } catch {
      showNotice('No se pudo actualizar el estado del buzon.');
    } finally {
      setSaving(false);
    }
  }

  function editUnit(unit: SubjectUnit) {
    setModal({ type: 'unit', mode: 'edit', unit });
  }

  function deleteUnit(unit: SubjectUnit) {
    setModal({ type: 'delete-unit', unit });
  }

  function deleteMaterial(material: UnitContentItem) {
    setModal({ type: 'delete-material', material });
  }

  function createUnit() {
    if (!subject.subject?.id) return;
    setModal({ type: 'unit', mode: 'create' });
  }

  function sendSubmission(assignment: UnitAssignment) {
    setModal({ type: 'submission', assignment });
  }

  async function removeSubmission(assignment: UnitAssignment) {
    setConfirm({
      title: 'Quitar entrega',
      message: 'Se quitara el archivo enviado para este buzon. Podras subir otro mientras el buzon siga abierto.',
      confirmLabel: 'Quitar entrega',
      tone: 'danger',
      onConfirm: async () => {
        await applyRemoveSubmission(assignment);
      }
    });
  }

  async function applyRemoveSubmission(assignment: UnitAssignment) {
    setSaving(true);
    try {
      await deleteAssignmentSubmission(assignment.id);
      showNotice('Entrega quitada.');
      setConfirm(null);
      reloadDetail();
    } catch {
      showNotice('No se pudo quitar la entrega.');
    } finally {
      setSaving(false);
    }
  }

  async function openMaterial(item: DocumentItem | UnitContentItem) {
    if (!('fileUrl' in item) || !item.fileUrl || item.fileUrl === '#') {
      showNotice('Este material aun no tiene archivo disponible.');
      return;
    }
    try {
      const downloaded = item.fileUrl.includes('/api/materials/') ? await downloadUnitMaterial(item.id) : null;
      if (downloaded) {
        const url = URL.createObjectURL(downloaded.blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloaded.filename ?? safeFilename(item.title, 'material');
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      window.open(item.fileUrl, '_blank', 'noopener,noreferrer');
    } catch {
      showNotice('No se pudo abrir el material.');
    }
  }

  async function handleModalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setModalError('');
    try {
      if (modal.type === 'unit') {
        const payload = {
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? ''),
          duration: String(form.get('duration') ?? ''),
          outcomes: linesToList(form.get('outcomes')),
          bibliography: linesToList(form.get('bibliography')),
          order: modal.mode === 'create' ? subject.units.length + 1 : undefined
        };
        const unit = modal.mode === 'create'
          ? await createSubjectUnit(subject.subject.id, payload)
          : await updateSubjectUnit(modal.unit.id, payload);
        setActiveUnit(unit.id);
        showNotice(modal.mode === 'create' ? 'Unidad creada.' : 'Unidad actualizada.');
      }
      if (modal.type === 'material') {
        const file = form.get('file');
        if (!(file instanceof File) || file.size === 0) {
          throw new Error('Archivo requerido');
        }
        await uploadUnitMaterial(modal.unit.id, {
          title: String(form.get('title') ?? ''),
          type: String(form.get('type') ?? modal.materialType),
          file
        });
        showNotice('Material subido.');
      }
      if (modal.type === 'assignment') {
        const dueDate = String(form.get('dueDate') ?? '');
        const dueTime = String(form.get('dueTime') ?? '');
        const payload = {
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? ''),
          dueDate: dueDate && dueTime ? `${dueDate}T${dueTime}:00` : undefined
        };
        if (modal.mode === 'create') {
          await createUnitAssignment(modal.unit.id, payload);
          showNotice('Buzon creado.');
        } else {
          await updateUnitAssignment(modal.assignment.id, payload);
          showNotice('Buzon actualizado.');
        }
      }
      if (modal.type === 'submission') {
        const file = form.get('file');
        if (!(file instanceof File) || file.size === 0) {
          throw new Error('Archivo requerido');
        }
        await uploadAssignmentSubmission(modal.assignment.id, {
          file,
          comment: String(form.get('comment') ?? '') || undefined
        });
        showNotice('Entrega enviada.');
      }
      if (modal.type === 'delete-unit') {
        await deleteSubjectUnit(modal.unit.id);
        setActiveUnit('inicio');
        showNotice('Unidad eliminada.');
      }
      if (modal.type === 'delete-material') {
        await deleteUnitMaterial(modal.material.id);
        showNotice('Material eliminado.');
      }
      if (modal.type === 'delete-assignment') {
        await deleteUnitAssignment(modal.assignment.id);
        showNotice('Buzon eliminado.');
      }
      setModal(null);
      reloadDetail();
    } catch {
      setModalError('No se pudo completar la accion. Revisa que el backend activo sea el actualizado.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando aula virtual..." />;
  if (error) return <ErrorState />;
  if (!subject.subject?.id) return <EmptyState title="Asignatura no encontrada" description="No hay informacion visible para tu rol." />;

  const selectedUnit = subject.units.find((unit) => unit.id === activeUnit);

  return (
    <div className="classroom-page campus-classroom">
      <header className="campus-coursebar">
        <div className="campus-coursebrand">
          <Link className="course-schedule-link" to="/calendario"><CalendarDays size={18} /> Horario semanal</Link>
          <strong>{subject.subject.name}</strong>
        </div>
        <div className="campus-course-actions">
          {canCommunicate && <button className="secondary-button" onClick={communicate}><MessageSquare size={17} /> Comunicarse</button>}
          {canManageCourse && <button className={editMode ? 'primary-button' : 'secondary-button'} onClick={toggleEditMode}><PencilRuler size={17} /> {editMode ? 'Salir de edicion' : 'Modo edicion'}</button>}
          {canEditCourse && <button className="secondary-button" onClick={createUnit}><Plus size={17} /> Nueva unidad</button>}
          {canEditCourse && <button className="primary-button" onClick={addCourseMaterial}><Plus size={17} /> Agregar material</button>}
        </div>
      </header>
      {notice && <div className="classroom-notice">{notice}</div>}
      {canManageCourse && editMode && (
        <div className="edit-mode-strip">
          <PencilRuler size={18} />
          <span>Estas editando el aula. Puedes agregar materiales, crear buzones de entrega, editar unidades o marcar eliminaciones.</span>
        </div>
      )}

      <nav className="classroom-top-tabs" aria-label="Navegacion de asignatura">
        {[
          ['curso', 'Curso'],
          ['participantes', 'Participantes'],
          ['calificaciones', 'Calificaciones'],
          ['mas', 'Mas']
        ].map(([value, label]) => (
          <button key={value} className={activeTab === value ? 'active' : ''} onClick={() => setActiveTab(value as CourseTab)}>{label}</button>
        ))}
      </nav>

      <div className={`classroom-layout ${indexCollapsed ? 'index-collapsed' : ''}`}>
        <aside className="classroom-index">
          <div className="index-header">
            <button aria-label={indexCollapsed ? 'Mostrar contenidos' : 'Ocultar contenidos'} onClick={() => setIndexCollapsed((value) => !value)}>
              {indexCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <strong>Contenidos</strong>
          </div>
          {!indexCollapsed && (
            <>
              <button className={activeUnit === 'inicio' ? 'active' : ''} onClick={() => { setActiveTab('curso'); setActiveUnit('inicio'); }}>Inicio</button>
              {subject.units.map((unit) => (
                <div className="index-unit" key={unit.id}>
                  <button className={activeUnit === unit.id ? 'active' : ''} onClick={() => { setActiveTab('curso'); setActiveUnit(unit.id); }}>{unit.title}</button>
                  {unit.contents.map((item) => {
                    const Icon = contentIcon(item.type);
                    return (
                      <button className="index-child" key={item.id} onClick={() => { setActiveTab('curso'); setActiveUnit(unit.id); }}>
                        <Icon size={14} /> {item.title}
                      </button>
                    );
                  })}
                  {(unit.assignments ?? []).map((assignment) => (
                    <button className="index-child" key={assignment.id} onClick={() => { setActiveTab('curso'); setActiveUnit(unit.id); }}>
                      <Inbox size={14} /> {assignment.title}
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </aside>

        <main className="classroom-main">
          <section className="course-document-header">
            <div>
              <span className="eyebrow">{subject.subject.code} · {subject.section}</span>
              <h1>{subject.subject.name}</h1>
            </div>
            <div className="classroom-meta">
              <span><UserRound size={16} /> {subject.teacher}</span>
              <span><MapPin size={16} /> {subject.room}</span>
              <span><CalendarDays size={16} /> {scheduleSummary(subject)}</span>
            </div>
          </section>

          {activeTab === 'curso' && (
            <>
              <div className="classroom-unit-tabs">
                <button className={activeUnit === 'inicio' ? 'active' : ''} onClick={() => setActiveUnit('inicio')}>Inicio</button>
                {subject.units.map((unit) => <button key={unit.id} className={activeUnit === unit.id ? 'active' : ''} onClick={() => setActiveUnit(unit.id)}>{unit.title}</button>)}
              </div>

              {activeUnit === 'inicio' ? (
                <article className="classroom-welcome">
                  <div>
                    <span className="eyebrow">Inicio del curso</span>
                    <h2>Material de trabajo y ruta de aprendizaje</h2>
                    <p>Revisa las unidades, descarga recursos y sigue las actividades publicadas por el docente para {subject.section}.</p>
                  </div>
                  <div className="classroom-overview-grid">
                    <span><Users size={18} /> Participantes <strong>{students.length || 'Por confirmar'}</strong></span>
                    <span><ClipboardCheck size={18} /> Evaluaciones <strong>{subject.assessments.length}</strong></span>
                    <span><FileText size={18} /> Materiales <strong>{subject.materials.length + subject.units.flatMap((unit) => unit.contents).length}</strong></span>
                    <span><Inbox size={18} /> Buzones <strong>{subject.units.flatMap((unit) => unit.assignments ?? []).length}</strong></span>
                  </div>
                  <section className="unit-info-block">
                    <div className="section-heading-row">
                      <h3>Materiales recientes</h3>
                      {canEditCourse && <button className="text-button" onClick={addCourseMaterial}><Plus size={16} /> Agregar material</button>}
                    </div>
                    <div className="classroom-material-list">
                      {subject.units.flatMap((unit) => unit.contents).slice(0, 5).map((item) => (
                        <UnitMaterialListItem key={item.id} item={item} canEdit={canEditCourse} onOpen={openMaterial} onDelete={deleteMaterial} />
                      ))}
                    </div>
                  </section>
                </article>
              ) : selectedUnit ? (
                <UnitContent
                  unit={selectedUnit}
                  index={subject.units.findIndex((unit) => unit.id === selectedUnit.id)}
                  subject={subject}
                  canEdit={canEditCourse}
                  extraMaterials={[]}
                  onAddMaterial={addUnitMaterial}
                  onCreateSubmission={createSubmission}
                  onEditAssignment={editAssignment}
                  onToggleAssignmentStatus={toggleAssignmentStatus}
                  onDeleteAssignment={deleteAssignment}
                  onDeleteSubmission={removeSubmission}
                  onSubmitAssignment={sendSubmission}
                  onEditUnit={editUnit}
                  onDeleteUnit={deleteUnit}
                  onDeleteMaterial={deleteMaterial}
                  onOpenMaterial={openMaterial}
                />
              ) : null}
            </>
          )}

          {activeTab === 'participantes' && (
            <article className="classroom-unit-card">
              <header><div><span className="eyebrow">Curso</span><h2>Participantes</h2></div></header>
              {students.length ? (
                <div className="participant-list">
                  {students.map((student) => <span key={student.id}><Users size={17} /> {student.name}</span>)}
                </div>
              ) : <EmptyState title="Sin participantes visibles" />}
            </article>
          )}

          {activeTab === 'calificaciones' && (
            <article className="classroom-unit-card">
              <header><div><span className="eyebrow">Seguimiento</span><h2>Calificaciones</h2></div></header>
              {subject.assessments.length ? (
                <div className="grade-list">
                  {subject.assessments.map((assessment) => (
                    <span key={assessment.id}>
                      <ClipboardCheck size={18} />
                      <strong>{assessment.title}</strong>
                      <small>{assessment.date} · {assessment.grades} notas registradas</small>
                    </span>
                  ))}
                </div>
              ) : <EmptyState title="Sin calificaciones visibles" description="Las evaluaciones apareceran cuando el docente las publique." />}
            </article>
          )}

          {activeTab === 'mas' && (
            <article className="classroom-unit-card">
              <header><div><span className="eyebrow">Herramientas</span><h2>Mas opciones</h2></div></header>
              <div className="classroom-tool-grid">
                <button><Megaphone size={18} /> Comunicaciones</button>
                <button><ExternalLink size={18} /> Biblioteca digital</button>
                <button><Download size={18} /> Descargar programa</button>
                {canManageCourse && <button onClick={toggleEditMode}><PencilRuler size={18} /> {editMode ? 'Terminar edicion' : 'Editar aula'}</button>}
              </div>
            </article>
          )}
        </main>
      </div>

      <footer className="campus-footer">
        <strong>Aula Virtual Institucional</strong>
        <span>Servicios de estudiantes</span>
        <span>Ayuda y contacto</span>
      </footer>

      <ClassroomModal
        modal={modal}
        subject={subject}
        busy={saving}
        error={modalError}
        onClose={() => {
          if (!saving) {
            setModal(null);
            setModalError('');
          }
        }}
        onSubmit={handleModalSubmit}
      />
      <ConfirmDialog
        confirm={confirm}
        busy={saving}
        onClose={() => {
          if (!saving) setConfirm(null);
        }}
      />
    </div>
  );
}
