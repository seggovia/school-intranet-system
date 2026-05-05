import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, Edit3, ExternalLink, FileArchive, FileSpreadsheet, FileText, Inbox, Link as LinkIcon, MapPin, Megaphone, MessageSquare, PencilRuler, Plus, Presentation, Trash2, Upload, UserRound, Users } from 'lucide-react';
import { addAssignmentComment, addSubmissionComment, api, createSubjectUnit, createUnitAssignment, deleteAssignmentSubmission, deleteSubmissionComment, deleteSubmissionFiles, deleteSubjectUnit, deleteUnitAssignment, deleteUnitMaterial, downloadAssignmentSubmission, downloadSubmissionFile as downloadSubmissionFileApi, downloadUnitMaterial, loadAssignmentSubmissions, loadSubjectDetail, reviewAssignmentSubmission, updateSubjectUnit, updateUnitAssignment, updateUnitAssignmentStatus, uploadAssignmentSubmissionFiles, uploadUnitMaterial } from '../api';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsyncData } from '../hooks';
import type { AssignmentSubmissionReviewRow, DocumentItem, SubjectDetailData, SubjectUnit, UnitAssignment, UnitContentItem, User } from '../types';

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
type AcademicPeriodOption = { id: string; name: string; year: number; startDate: string; endDate: string; isActive: boolean };
type SubjectAssessmentWithPeriod = SubjectDetailData['assessments'][number] & { periodId?: string | null; period?: { id: string; name: string } | null };

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

function isFallbackUnit(unit: SubjectUnit, subjectId: string) {
  return unit.id.startsWith(`${subjectId}-u`);
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

function reviewStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    entregado: 'Entregado',
    enviado: 'Entregado',
    atrasado: 'Atrasado',
    revisado: 'Revisado',
    devuelto: 'Devuelto'
  };
  return labels[String(status ?? 'pendiente')] ?? 'Pendiente';
}

function reviewStatusClass(status?: string | null) {
  const value = status === 'enviado' ? 'entregado' : String(status ?? 'pendiente');
  if (['revisado', 'entregado', 'devuelto', 'atrasado'].includes(value)) return value;
  return 'pendiente';
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
  canReview,
  canSubmit,
  onOpenAssignment,
  onEditAssignment,
  onReviewAssignment,
  onToggleAssignmentStatus,
  onDeleteAssignment,
  onSubmitAssignment: _onSubmitAssignment
}: {
  assignment: UnitAssignment;
  canEdit: boolean;
  canReview: boolean;
  canSubmit: boolean;
  onOpenAssignment: (assignment: UnitAssignment) => void;
  onEditAssignment: (assignment: UnitAssignment) => void;
  onReviewAssignment: (assignment: UnitAssignment) => void;
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
        {canReview && <button className="primary-button" onClick={() => onReviewAssignment(assignment)}><ClipboardCheck size={17} /> Revisar</button>}
        {canEdit && <button className="secondary-button" onClick={() => onToggleAssignmentStatus(assignment)}><Clock size={17} /> {assignment.status === 'cerrado' ? 'Reabrir' : 'Cerrar'}</button>}
        {canEdit && <button className="danger-button" onClick={() => onDeleteAssignment(assignment)}><Trash2 size={17} /> Eliminar</button>}
        <button className="secondary-button" onClick={() => onOpenAssignment(assignment)}><ExternalLink size={17} /> Abrir</button>
      </div>
    </article>
  );
}

function SubmissionComments({
  comments,
  canWrite,
  onAdd,
  onDelete
}: {
  comments: NonNullable<AssignmentSubmissionReviewRow['submission']>['comments'];
  canWrite: boolean;
  onAdd: (body: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState('');
  const [removing, setRemoving] = useState<string[]>([]);
  const safeComments = comments ?? [];

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    await onAdd(body);
    setDraft('');
  }

  async function removeComment(commentId: string) {
    setRemoving((current) => [...current, commentId]);
    window.setTimeout(async () => {
      await onDelete(commentId);
      setRemoving((current) => current.filter((id) => id !== commentId));
    }, 220);
  }

  return (
    <div className="submission-comment-thread">
      <div className="comment-thread-title">
        <strong>Comentarios ({safeComments.length})</strong>
      </div>
      {safeComments.length ? (
        <div className="comment-list">
          {safeComments.map((comment) => (
            <article key={comment.id} className={`comment-item ${removing.includes(comment.id) ? 'comment-removing' : ''}`}>
              <div className="comment-avatar">{comment.author.slice(0, 2).toUpperCase()}</div>
              <div>
                <header>
                  <strong>{comment.author}</strong>
                  <span>{comment.createdAt ? formatDateTime(comment.createdAt) : ''}</span>
                  <button type="button" aria-label="Borrar comentario" onClick={() => removeComment(comment.id)}><Trash2 size={15} /></button>
                </header>
                <p>{comment.body}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="assignment-muted">Sin comentarios.</p>
      )}
      {canWrite && (
        <form className="comment-compose" onSubmit={submitComment}>
          <textarea rows={3} value={draft} placeholder="Agregar un comentario..." onChange={(event) => setDraft(event.target.value)} />
          <div>
            <button type="button" className="text-button" onClick={() => setDraft('')}>Cancelar</button>
            <button type="submit" className="secondary-button" disabled={!draft.trim()}>Guardar comentario</button>
          </div>
        </form>
      )}
    </div>
  );
}

function AssignmentDetail({
  assignment,
  canEdit,
  canReview,
  canSubmit,
  onBack,
  onSubmitAssignment,
  onEditAssignment,
  onReviewAssignment,
  onToggleAssignmentStatus,
  onDeleteAssignment,
  onDeleteSubmission,
  onDeleteSubmissionFiles,
  onAddSubmissionComment,
  onDeleteSubmissionComment
}: {
  assignment: UnitAssignment;
  canEdit: boolean;
  canReview: boolean;
  canSubmit: boolean;
  onBack: () => void;
  onSubmitAssignment: (assignment: UnitAssignment) => void;
  onEditAssignment: (assignment: UnitAssignment) => void;
  onReviewAssignment: (assignment: UnitAssignment) => void;
  onToggleAssignmentStatus: (assignment: UnitAssignment) => void;
  onDeleteAssignment: (assignment: UnitAssignment) => void;
  onDeleteSubmission: (assignment: UnitAssignment) => void;
  onDeleteSubmissionFiles: (assignment: UnitAssignment, fileIds: string[]) => void;
  onAddSubmissionComment: (assignment: UnitAssignment, comment: string) => Promise<void> | void;
  onDeleteSubmissionComment: (commentId: string) => Promise<void> | void;
}) {
  const tone = isAssignmentClosed(assignment) ? 'closed' : dueTone(assignment.dueDate);
  const isClosed = isAssignmentClosed(assignment);
  const ownSubmission = assignment.submissionItems?.[0];
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [editingDelivery, setEditingDelivery] = useState(false);

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
      {canSubmit && !editingDelivery && (
        <>
          <h4>Estado de la entrega</h4>
          <div className="submission-status-table">
            <span>Estado de la entrega</span><strong>{ownSubmission ? 'Enviado para calificar' : 'No enviado'}</strong>
            <span>Estado de revision</span><strong>{ownSubmission ? reviewStatusLabel(ownSubmission.status) : 'Sin entrega'}</strong>
            <span>Nota</span><strong>{ownSubmission?.grade ?? 'Sin nota'}</strong>
            <span>Tiempo restante</span><strong>{isClosed ? 'El buzon ya cerro' : `Disponible hasta ${formatDateTime(assignment.dueDate)}`}</strong>
            <span>Archivos enviados</span><strong>{ownSubmission?.files?.map((file) => file.originalName).join(', ') || ownSubmission?.originalName || 'Sin archivo enviado'}</strong>
            <span>Comentarios</span>
            <strong className="submission-comments-cell">{ownSubmission?.comments?.length ?? 0} comentario(s)</strong>
          </div>
          <SubmissionComments
            comments={ownSubmission?.comments}
            canWrite={!isClosed}
            onAdd={(body) => onAddSubmissionComment(assignment, body)}
            onDelete={onDeleteSubmissionComment}
          />
        </>
      )}
      {canSubmit && !editingDelivery && (
        <div className="assignment-detail-actions">
          <button className="primary-button" disabled={isClosed} onClick={() => ownSubmission ? setEditingDelivery(true) : onSubmitAssignment(assignment)}>
            <Edit3 size={17} /> {ownSubmission ? 'Editar entrega' : 'Agregar entrega'}
          </button>
        </div>
      )}
      {ownSubmission && canSubmit && editingDelivery && (
        <div className="submission-file-editor">
          <div className="assignment-detail-top">
            <strong>Editar entrega</strong>
            <button className="secondary-button" onClick={() => setEditingDelivery(false)}>Volver al detalle</button>
          </div>
          {(ownSubmission.files?.length ? ownSubmission.files : [{ id: ownSubmission.id, originalName: ownSubmission.originalName ?? 'Archivo enviado' }]).map((file) => (
            <label key={file.id} className="submission-file-check">
              <input
                type="checkbox"
                checked={selectedFiles.includes(file.id)}
                disabled={isClosed}
                onChange={(event) => {
                  setSelectedFiles((current) => event.target.checked ? [...current, file.id] : current.filter((id) => id !== file.id));
                }}
              />
              <span>{file.originalName}</span>
            </label>
          ))}
          {!isClosed && (
            <div className="assignment-detail-actions">
              <button className="danger-button" disabled={!selectedFiles.length} onClick={() => onDeleteSubmissionFiles(assignment, selectedFiles)}>
                <Trash2 size={17} /> Eliminar seleccionados
              </button>
              <button className="primary-button" onClick={() => onSubmitAssignment(assignment)}><Upload size={17} /> Subir nuevos archivos</button>
            </div>
          )}
        </div>
      )}
      {canEdit && (
        <div className="assignment-detail-actions">
          <button className="secondary-button" onClick={() => onEditAssignment(assignment)}><Edit3 size={17} /> Editar buzon</button>
          <button className="secondary-button" onClick={() => onToggleAssignmentStatus(assignment)}><Clock size={17} /> {assignment.status === 'cerrado' ? 'Reabrir buzon' : 'Cerrar buzon'}</button>
          <button className="danger-button" onClick={() => onDeleteAssignment(assignment)}><Trash2 size={17} /> Eliminar buzon</button>
        </div>
      )}
      {canReview && (
        <div className="assignment-detail-actions">
          <button className="primary-button" onClick={() => onReviewAssignment(assignment)}><ClipboardCheck size={17} /> Revisar entregas</button>
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
            <label className="wide-field">Documentos de entrega<input name="files" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.png,.jpg,.jpeg" multiple required /></label>
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

function ReviewSubmissionsModal({
  assignment,
  rows,
  busy,
  error,
  onClose,
  onDownload,
  onSave,
  onComment
}: {
  assignment: UnitAssignment | null;
  rows: AssignmentSubmissionReviewRow[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onDownload: (row: AssignmentSubmissionReviewRow) => void;
  onSave: (row: AssignmentSubmissionReviewRow, event: FormEvent<HTMLFormElement>) => void;
  onComment: (row: AssignmentSubmissionReviewRow, body: string) => Promise<void> | void;
}) {
  if (!assignment) return null;

  return (
    <div className="classroom-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="review-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Revision de entregas</span>
            <h2>{assignment.title}</h2>
            <p>{assignment.description}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>x</button>
        </header>
        {error && <p className="form-error">{error}</p>}
        <div className="review-submission-list">
          {rows.map((row) => (
            <form key={row.studentId} className="review-submission-row" onSubmit={(event) => onSave(row, event)}>
              <div className="review-student-cell">
                <strong>{row.student}</strong>
                <span className={`review-badge ${reviewStatusClass(row.status)}`}>{reviewStatusLabel(row.status)}</span>
                <small>{row.submission?.originalName ?? 'Sin archivo entregado'}</small>
                {row.submission && <small>{row.submission.comments?.length ?? 0} comentario(s)</small>}
              </div>
              <label>Estado
                <select name="status" defaultValue={row.submission?.status === 'enviado' ? 'entregado' : row.status} disabled={!row.submission}>
                  <option value="pendiente">Pendiente</option>
                  <option value="entregado">Entregado</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="revisado">Revisado</option>
                  <option value="devuelto">Devuelto</option>
                </select>
              </label>
              <label>Nota
                <input name="grade" type="number" min="1" max="7" step="0.1" defaultValue={row.submission?.grade ?? ''} placeholder="1.0 - 7.0" disabled={!row.submission} />
              </label>
              <div className="review-row-actions">
                <button type="button" className="secondary-button" onClick={() => onDownload(row)} disabled={!row.submission}>
                  <Download size={16} /> Descargar
                </button>
                <button type="submit" className="primary-button" disabled={busy || !row.submission}>
                  <ClipboardCheck size={16} /> Guardar
                </button>
              </div>
              <div className="review-thread-preview">
                <strong>Comentarios</strong>
                {row.submission?.comments?.length ? (
                  <div>
                    {row.submission.comments.map((comment) => (
                      <p key={comment.id}><b>{comment.author}:</b> {comment.body}</p>
                    ))}
                  </div>
                ) : (
                  <span>Sin comentarios.</span>
                )}
                {row.submission && <ReviewCommentComposer busy={busy} onSubmit={(body) => onComment(row, body)} />}
              </div>
            </form>
          ))}
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={onClose}>Cerrar</button>
        </footer>
      </section>
    </div>
  );
}

function ReviewCommentComposer({
  busy,
  onSubmit
}: {
  busy: boolean;
  onSubmit: (body: string) => Promise<void> | void;
}) {
  const [body, setBody] = useState('');

  async function sendComment() {
    const value = body.trim();
    if (!value) return;
    await onSubmit(value);
    setBody('');
  }

  return (
    <div className="review-comment-composer">
      <textarea rows={2} value={body} placeholder="Escribir comentario..." onChange={(event) => setBody(event.target.value)} />
      <button type="button" className="secondary-button" disabled={busy || !body.trim()} onClick={sendComment}>Enviar comentario</button>
    </div>
  );
}

function ReviewSavedModal({
  open,
  busy,
  onContinue,
  onCloseReview
}: {
  open: boolean;
  busy: boolean;
  onContinue: () => void;
  onCloseReview: () => void;
}) {
  if (!open) return null;

  return (
    <div className="classroom-modal-backdrop" role="presentation" onClick={onContinue}>
      <div className="confirm-modal success-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Revision guardada</span>
            <h2>Guardado correctamente</h2>
          </div>
        </header>
        <p>La nota, estado y comentario quedaron registrados para este estudiante.</p>
        <footer>
          <button className="secondary-button" disabled={busy} onClick={onContinue}>Seguir revisando</button>
          <button className="primary-button" disabled={busy} onClick={onCloseReview}>Cerrar revision de entregas</button>
        </footer>
      </div>
    </div>
  );
}

function UnitContent({
  unit,
  index,
  subject,
  canEdit,
  canReview,
  canSubmit,
  extraMaterials,
  onAddMaterial,
  onCreateSubmission,
  onEditAssignment,
  onReviewAssignment,
  onToggleAssignmentStatus,
  onDeleteAssignment,
  onDeleteSubmission,
  onDeleteSubmissionFiles,
  onAddSubmissionComment,
  onDeleteSubmissionComment,
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
  canReview: boolean;
  canSubmit: boolean;
  extraMaterials: UnitContentItem[];
  onAddMaterial: (unit: SubjectUnit, type: UnitContentItem['type']) => void;
  onCreateSubmission: (unit: SubjectUnit) => void;
  onEditAssignment: (assignment: UnitAssignment) => void;
  onReviewAssignment: (assignment: UnitAssignment) => void;
  onToggleAssignmentStatus: (assignment: UnitAssignment) => void;
  onDeleteAssignment: (assignment: UnitAssignment) => void;
  onDeleteSubmission: (assignment: UnitAssignment) => void;
  onDeleteSubmissionFiles: (assignment: UnitAssignment, fileIds: string[]) => void;
  onAddSubmissionComment: (assignment: UnitAssignment, comment: string) => Promise<void> | void;
  onDeleteSubmissionComment: (commentId: string) => Promise<void> | void;
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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId);

  return (
    <article id={`unit-${unit.id}`} className="classroom-unit-card">
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

      <section id={`unit-${unit.id}-antecedentes`} className="unit-info-block">
        <h3>Antecedentes</h3>
        <p>{unit.description || `Modulo de trabajo de ${subject.subject.name} para ${subject.section}.`}</p>
        <div className="unit-facts">
          <span><CalendarDays size={17} /> Duracion estimada <strong>{fallback.duration}</strong></span>
          <span><UserRound size={17} /> Docente <strong>{subject.teacher}</strong></span>
        </div>
      </section>

      <section id={`unit-${unit.id}-aprendizajes`} className="unit-info-block">
        <h3>Aprendizajes esperados</h3>
        <ul>
          {fallback.outcomes.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section id={`unit-${unit.id}-bibliografia`} className="unit-info-block">
        <h3>Bibliografia</h3>
        <ul>
          {fallback.bibliography.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section id={`unit-${unit.id}-materiales`} className="unit-info-block">
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

      <section id={`unit-${unit.id}-entregables`} className="unit-info-block">
        <div className="section-heading-row">
          <h3>Buzones de entrega</h3>
          {canEdit && <button className="text-button" onClick={() => onCreateSubmission(unit)}><Inbox size={16} /> Crear buzon</button>}
        </div>
        {selectedAssignment ? (
          <AssignmentDetail
            assignment={selectedAssignment}
            canEdit={canEdit}
            canReview={canReview}
            canSubmit={canSubmit}
            onBack={() => setSelectedAssignmentId('')}
            onSubmitAssignment={onSubmitAssignment}
            onEditAssignment={onEditAssignment}
            onReviewAssignment={onReviewAssignment}
            onToggleAssignmentStatus={onToggleAssignmentStatus}
            onDeleteAssignment={onDeleteAssignment}
            onDeleteSubmission={onDeleteSubmission}
            onDeleteSubmissionFiles={onDeleteSubmissionFiles}
            onAddSubmissionComment={onAddSubmissionComment}
            onDeleteSubmissionComment={onDeleteSubmissionComment}
          />
        ) : assignments.length ? (
          <div className="assignment-box-list">
            {assignments.map((assignment) => (
              <AssignmentBoxRow
                key={assignment.id}
                assignment={assignment}
                canEdit={canEdit}
                canReview={canReview}
                canSubmit={canSubmit}
                onOpenAssignment={(item) => setSelectedAssignmentId(item.id)}
                onEditAssignment={onEditAssignment}
                onReviewAssignment={onReviewAssignment}
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
  const [reviewError, setReviewError] = useState('');
  const [reviewAssignment, setReviewAssignment] = useState<UnitAssignment | null>(null);
  const [reviewRows, setReviewRows] = useState<AssignmentSubmissionReviewRow[]>([]);
  const [reviewSavedOpen, setReviewSavedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [indexCollapsed, setIndexCollapsed] = useState(true);
  const [activeIndexTarget, setActiveIndexTarget] = useState('course-start');
  const [periods, setPeriods] = useState<AcademicPeriodOption[]>([]);
  const [assessmentPeriod, setAssessmentPeriod] = useState('');
  const canManageCourse = ['admin', 'director', 'teacher'].includes(user.primaryRole);
  const canEditCourse = canManageCourse && editMode;
  const canReviewCourse = canManageCourse;
  const canSubmitCourse = ['student', 'guardian'].includes(user.primaryRole);
  const canCommunicate = ['student', 'guardian', 'teacher', 'admin', 'director'].includes(user.primaryRole);
  const students = useMemo(() => {
    const seen = new Set<string>();
    return subject.sections.flatMap((section) => section.students).filter((student) => {
      if (seen.has(student.id)) return false;
      seen.add(student.id);
      return true;
    });
  }, [subject.sections]);
  const filteredAssessments = useMemo(() => {
    const assessments = subject.assessments as SubjectAssessmentWithPeriod[];
    return assessments.filter((assessment) => !assessmentPeriod || assessment.periodId === assessmentPeriod);
  }, [assessmentPeriod, subject.assessments]);

  useEffect(() => {
    api.get<AcademicPeriodOption[]>('/periods').then((response) => {
      setPeriods(response.data.filter((item) => item.isActive));
    }).catch(() => undefined);
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  }

  function reloadDetail() {
    setReloadKey((value) => value + 1);
  }

  function goToCourseSection(unitId: string, sectionId?: string) {
    setActiveTab('curso');
    setActiveUnit(unitId);
    setActiveIndexTarget(unitId === 'inicio' ? 'course-start' : sectionId ?? `unit-${unitId}`);
    window.setTimeout(() => {
      const targetId = unitId === 'inicio' ? 'course-start' : sectionId ?? `unit-${unitId}`;
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  useEffect(() => {
    if (activeTab !== 'curso') return undefined;
    const ids = activeUnit === 'inicio'
      ? ['course-start']
      : [
          `unit-${activeUnit}`,
          `unit-${activeUnit}-antecedentes`,
          `unit-${activeUnit}-aprendizajes`,
          `unit-${activeUnit}-bibliografia`,
          `unit-${activeUnit}-materiales`,
          `unit-${activeUnit}-entregables`
        ];
    const elements = ids.map((item) => document.getElementById(item)).filter((item): item is HTMLElement => Boolean(item));
    if (!elements.length) return undefined;
    let frame = 0;
    const topOffset = 246;
    const activationBand = 80;
    function updateActiveSection() {
      frame = 0;
      const ranked = elements.map((element) => ({
        id: element.id,
        top: element.getBoundingClientRect().top
      }));
      const passed = ranked.filter((item) => item.top <= topOffset + activationBand);
      const next = passed.length
        ? passed.reduce((closest, item) => item.top > closest.top ? item : closest).id
        : ranked.reduce((closest, item) => Math.abs(item.top - topOffset) < Math.abs(closest.top - topOffset) ? item : closest).id;
      setActiveIndexTarget((current) => current === next ? current : next);
    }
    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    }
    updateActiveSection();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [activeTab, activeUnit]);

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

  async function reviewAssignmentModal(assignment: UnitAssignment) {
    setReviewAssignment(assignment);
    setReviewRows([]);
    setReviewError('');
    setSaving(true);
    try {
      setReviewRows(await loadAssignmentSubmissions(assignment.id));
    } catch {
      setReviewError('No se pudo cargar la lista de entregas.');
    } finally {
      setSaving(false);
    }
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

  async function removeSubmissionFiles(assignment: UnitAssignment, fileIds: string[]) {
    const submission = assignment.submissionItems?.[0];
    if (!submission) return;
    setConfirm({
      title: 'Eliminar archivos',
      message: `Se eliminaran ${fileIds.length} archivo(s) seleccionados de esta entrega.`,
      confirmLabel: 'Eliminar archivos',
      tone: 'danger',
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteSubmissionFiles(submission.id, fileIds);
          showNotice('Archivos eliminados.');
          setConfirm(null);
          reloadDetail();
        } catch {
          showNotice('No se pudieron eliminar los archivos.');
        } finally {
          setSaving(false);
        }
      }
    });
  }

  async function addSubmissionThreadComment(assignment: UnitAssignment, comment: string) {
    const submission = assignment.submissionItems?.[0];
    setSaving(true);
    try {
      if (submission) {
        await addSubmissionComment(submission.id, comment.trim());
      } else {
        await addAssignmentComment(assignment.id, comment.trim());
      }
      showNotice('Comentario guardado.');
      reloadDetail();
    } catch {
      showNotice('No se pudo guardar el comentario.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubmissionThreadComment(commentId: string) {
    setSaving(true);
    try {
      await deleteSubmissionComment(commentId);
      showNotice('Comentario eliminado.');
      reloadDetail();
    } catch {
      showNotice('No se pudo eliminar el comentario.');
    } finally {
      setSaving(false);
    }
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

  async function downloadSubmissionFile(row: AssignmentSubmissionReviewRow) {
    if (!row.submission) return;
    try {
      const firstFile = row.submission.files?.[0];
      const downloaded = firstFile ? await downloadSubmissionFileApi(firstFile.id) : await downloadAssignmentSubmission(row.submission.id);
      const url = URL.createObjectURL(downloaded.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloaded.filename ?? row.submission.originalName ?? safeFilename(row.student, 'entrega');
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setReviewError('No se pudo descargar la entrega.');
    }
  }

  async function saveSubmissionReview(row: AssignmentSubmissionReviewRow, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row.submission || !reviewAssignment) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setReviewError('');
    try {
      const gradeValue = String(form.get('grade') ?? '').trim();
      await reviewAssignmentSubmission(row.submission.id, {
        status: String(form.get('status') ?? row.status),
        grade: gradeValue ? Number(gradeValue) : null,
        comment: null
      });
      setReviewRows(await loadAssignmentSubmissions(reviewAssignment.id));
      setReviewSavedOpen(true);
      reloadDetail();
    } catch {
      setReviewError('No se pudo guardar la revision. Revisa nota, estado y permisos.');
    } finally {
      setSaving(false);
    }
  }

  async function sendReviewThreadComment(row: AssignmentSubmissionReviewRow, body: string) {
    if (!row.submission || !reviewAssignment) return;
    setSaving(true);
    setReviewError('');
    try {
      await addSubmissionComment(row.submission.id, body);
      setReviewRows(await loadAssignmentSubmissions(reviewAssignment.id));
      reloadDetail();
    } catch {
      setReviewError('No se pudo agregar el comentario para este estudiante.');
    } finally {
      setSaving(false);
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
        const targetUnit = isFallbackUnit(modal.unit, subject.subject.id)
          ? await createSubjectUnit(subject.subject.id, {
            title: modal.unit.title,
            description: modal.unit.description || `Contenidos de trabajo para ${subject.subject.name}.`,
            duration: modal.unit.duration,
            outcomes: modal.unit.outcomes ?? [],
            bibliography: modal.unit.bibliography ?? []
          })
          : modal.unit;
        await uploadUnitMaterial(targetUnit.id, {
          title: String(form.get('title') ?? ''),
          type: String(form.get('type') ?? modal.materialType),
          file
        });
        setActiveUnit(targetUnit.id);
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
        const files = form.getAll('files').filter((file): file is File => file instanceof File && file.size > 0);
        if (!files.length) throw new Error('Archivo requerido');
        await uploadAssignmentSubmissionFiles(modal.assignment.id, {
          files,
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
      <div className="classroom-sticky-nav">
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
      </div>
      {notice && <div className="classroom-notice">{notice}</div>}
      {canManageCourse && editMode && (
        <div className="edit-mode-strip">
          <PencilRuler size={18} />
          <span>Estas editando el aula. Puedes agregar materiales, crear buzones de entrega, editar unidades o marcar eliminaciones.</span>
        </div>
      )}

      <div className={`classroom-layout ${indexCollapsed ? 'index-collapsed' : ''}`}>
        <aside className="classroom-index">
          <div className="index-header">
            <button
              aria-label={indexCollapsed ? 'Abrir indice' : 'Cerrar indice'}
              aria-describedby="index-toggle-tooltip"
              onClick={() => setIndexCollapsed((value) => !value)}
            >
              {indexCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <span id="index-toggle-tooltip" className="index-tooltip" role="tooltip">
              {indexCollapsed ? 'Abrir indice' : 'Cerrar indice'}
            </span>
            <strong>Contenidos</strong>
          </div>
          {!indexCollapsed && (
            <>
              <button className={activeUnit === 'inicio' ? 'active' : ''} onClick={() => goToCourseSection('inicio')}>Inicio</button>
              {subject.units.map((unit) => (
                <div className="index-unit" key={unit.id}>
                  <button className={activeUnit === unit.id ? 'active' : ''} onClick={() => goToCourseSection(unit.id)}>{unit.title}</button>
                  <button className={`index-child ${activeIndexTarget === `unit-${unit.id}-antecedentes` ? 'active' : ''}`} onClick={() => goToCourseSection(unit.id, `unit-${unit.id}-antecedentes`)}><BookOpen size={14} /> Antecedentes</button>
                  <button className={`index-child ${activeIndexTarget === `unit-${unit.id}-aprendizajes` ? 'active' : ''}`} onClick={() => goToCourseSection(unit.id, `unit-${unit.id}-aprendizajes`)}><ClipboardCheck size={14} /> Aprendizajes esperados</button>
                  <button className={`index-child ${activeIndexTarget === `unit-${unit.id}-bibliografia` ? 'active' : ''}`} onClick={() => goToCourseSection(unit.id, `unit-${unit.id}-bibliografia`)}><FileText size={14} /> Bibliografia</button>
                  <button className={`index-child ${activeIndexTarget === `unit-${unit.id}-materiales` ? 'active' : ''}`} onClick={() => goToCourseSection(unit.id, `unit-${unit.id}-materiales`)}><FileArchive size={14} /> Materiales</button>
                  {unit.contents.map((item) => {
                    const Icon = contentIcon(item.type);
                    return (
                      <button className={`index-child ${activeIndexTarget === `unit-${unit.id}-materiales` ? 'active' : ''}`} key={item.id} onClick={() => goToCourseSection(unit.id, `unit-${unit.id}-materiales`)}>
                        <Icon size={14} /> {item.title}
                      </button>
                    );
                  })}
                  {(unit.assignments ?? []).map((assignment) => (
                    <button className={`index-child ${activeIndexTarget === `unit-${unit.id}-entregables` ? 'active' : ''}`} key={assignment.id} onClick={() => goToCourseSection(unit.id, `unit-${unit.id}-entregables`)}>
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
                <button className={activeUnit === 'inicio' ? 'active' : ''} onClick={() => goToCourseSection('inicio')}>Inicio</button>
                {subject.units.map((unit) => <button key={unit.id} className={activeUnit === unit.id ? 'active' : ''} onClick={() => goToCourseSection(unit.id)}>{unit.title}</button>)}
              </div>

              {activeUnit === 'inicio' ? (
                <article id="course-start" className="classroom-welcome">
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
                  canReview={canReviewCourse}
                  canSubmit={canSubmitCourse}
                  extraMaterials={[]}
                  onAddMaterial={addUnitMaterial}
                  onCreateSubmission={createSubmission}
                  onEditAssignment={editAssignment}
                  onReviewAssignment={reviewAssignmentModal}
                  onToggleAssignmentStatus={toggleAssignmentStatus}
                  onDeleteAssignment={deleteAssignment}
                  onDeleteSubmission={removeSubmission}
                  onDeleteSubmissionFiles={removeSubmissionFiles}
                  onAddSubmissionComment={addSubmissionThreadComment}
                  onDeleteSubmissionComment={deleteSubmissionThreadComment}
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
              <label className="classroom-filter-label">Periodo
                <select value={assessmentPeriod} onChange={(event) => setAssessmentPeriod(event.target.value)}>
                  <option value="">Todos</option>
                  {periods.map((periodItem) => <option key={periodItem.id} value={periodItem.id}>{periodItem.name}</option>)}
                </select>
              </label>
              {subject.assessments.length ? (
                <div className="grade-list">
                  {filteredAssessments.map((assessment) => (
                    <span key={assessment.id}>
                      <ClipboardCheck size={18} />
                      <strong>{assessment.title}</strong>
                      <small>{assessment.date} · {assessment.period?.name ?? 'Sin periodo'} · {assessment.grades} notas registradas</small>
                    </span>
                  ))}
                </div>
              ) : <EmptyState title="Sin calificaciones visibles" description="Las evaluaciones apareceran cuando el docente las publique." />}
              {subject.assessments.length > 0 && !filteredAssessments.length && <EmptyState title="Sin evaluaciones en este periodo" />}
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
      <ReviewSubmissionsModal
        assignment={reviewAssignment}
        rows={reviewRows}
        busy={saving}
        error={reviewError}
        onClose={() => {
          if (!saving) {
            setReviewAssignment(null);
            setReviewRows([]);
            setReviewError('');
          }
        }}
        onDownload={downloadSubmissionFile}
        onSave={saveSubmissionReview}
        onComment={sendReviewThreadComment}
      />
      <ReviewSavedModal
        open={reviewSavedOpen}
        busy={saving}
        onContinue={() => setReviewSavedOpen(false)}
        onCloseReview={() => {
          setReviewSavedOpen(false);
          setReviewAssignment(null);
          setReviewRows([]);
          setReviewError('');
          window.setTimeout(() => {
            document.getElementById(`unit-${activeUnit}-entregables`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }}
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
