import { AlertTriangle, BookOpen, Building2, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Edit3, Eye, EyeOff, GraduationCap, KeyRound, Link2, Plus, Search, Shield, ToggleLeft, ToggleRight, Trash2, UserRound, Users, X } from 'lucide-react';
import AdminUsersSection from './admin/AdminUsersSection';
import AdminStudentsSection from './admin/AdminStudentsSection';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { History } from 'lucide-react';
import {
  assignAdminStudentSection,
  assignAdminSubjectTeacher,
  assignAdminTeacher,
  clearAdminStudentSection,
  createAdminClassroom,
  createAdminCourse,
  createAdminGuardian,
  createAdminSchedule,
  createAdminSection,
  createAdminStudent,
  createAdminSubject,
  createAdminTeacher,
  createAdminUser,
  deleteAdminClassroom,
  deleteAdminSchedule,
  deleteAdminSection,
  linkAdminGuardianStudents,
  loadAdminAudit,
  loadAdminBundle,
  removeAdminTeacherAssignment,
  resetAdminUserPassword,
  setAdminGuardianStatus,
  setAdminClassroomStatus,
  setAdminCourseStatus,
  setAdminSectionStatus,
  setAdminScheduleStatus,
  setAdminStudentStatus,
  setAdminTeacherStatus,
  setAdminUserStatus,
  updateAdminClassroom,
  updateAdminCourse,
  updateAdminGuardian,
  updateAdminSchedule,
  updateAdminSection,
  updateAdminStudent,
  updateAdminSubject,
  updateAdminTeacher,
  updateAdminUser,
  unlinkAdminGuardianStudent,
  api,
  type AdminSchedulePayload,
  type AdminUserPayload
} from '../api';
import { normalizeApiError, shouldShowApiErrorModal, type NormalizedApiError } from '../api-error';
import { ApiErrorModal } from '../components/ApiErrorModal';
import { DataTable, type Column } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import type { AdminBundle, AdminClassroomRow, AdminCourseRow, AdminGuardianRow, AdminOption, AdminScheduleRow, AdminSectionRow, AdminStudentRow, AdminSubjectRow, AdminTeacherRow, AdminUserRow, AuditLogRow, Role, User } from '../types';

type AdminTab = 'users' | 'students' | 'teachers' | 'guardians' | 'subjects' | 'audit' | 'academic-courses' | 'academic-sections' | 'academic-classrooms' | 'academic-schedules' | 'academic-periods' | 'assignments-teachers' | 'assignments-students' | 'assignments-guardians' | 'assignments-subjects';
type ModalState =
  | { type: 'user'; mode: 'create' | 'edit'; row?: AdminUserRow }
  | { type: 'student'; mode: 'create' | 'edit'; row?: AdminStudentRow }
  | { type: 'teacher'; mode: 'create' | 'edit'; row?: AdminTeacherRow }
  | { type: 'guardian'; mode: 'create' | 'edit'; row?: AdminGuardianRow }
  | { type: 'course'; mode: 'create' | 'edit'; row?: AdminCourseRow }
  | { type: 'section'; mode: 'create' | 'edit'; row?: AdminSectionRow }
  | { type: 'classroom'; mode: 'create' | 'edit'; row?: AdminClassroomRow }
  | { type: 'subject'; mode: 'create' | 'edit'; row?: AdminSubjectRow };
type ConfirmState = { title: string; message: string; action: () => Promise<void>; danger?: boolean };
type ResetPasswordTarget = { id: string; name: string } | null;
type StudentObservationRow = { id: string; studentId: string; student?: string; author: string; section: string | null; body: string; type: 'positiva' | 'negativa' | 'neutral'; date: string; isVisible: boolean; createdAt: string };

const tabs: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'students', label: 'Estudiantes', icon: GraduationCap },
  { id: 'teachers', label: 'Profesores', icon: BookOpen },
  { id: 'guardians', label: 'Apoderados', icon: UserRound },
  { id: 'subjects', label: 'Asignaturas', icon: ClipboardList },
  { id: 'audit', label: 'Auditoría', icon: History }
];

const academicTabs: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: 'academic-courses', label: 'Cursos', icon: Building2 },
  { id: 'academic-sections', label: 'Secciones', icon: GraduationCap },
  { id: 'academic-classrooms', label: 'Salas', icon: ClipboardList },
  { id: 'academic-schedules', label: 'Horarios', icon: ClipboardList },
  { id: 'academic-periods', label: 'Períodos', icon: ClipboardList }
];

const weekdayOptions = [
  { id: '1', label: 'Lunes' },
  { id: '2', label: 'Martes' },
  { id: '3', label: 'Miercoles' },
  { id: '4', label: 'Jueves' },
  { id: '5', label: 'Viernes' },
  { id: '6', label: 'Sabado' },
  { id: '0', label: 'Domingo' }
];

const assignmentTabs: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: 'assignments-teachers', label: 'Profesores', icon: BookOpen },
  { id: 'assignments-students', label: 'Estudiantes', icon: GraduationCap },
  { id: 'assignments-guardians', label: 'Apoderados', icon: UserRound },
  { id: 'assignments-subjects', label: 'Responsables', icon: Link2 }
];

const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  director: 'Director',
  teacher: 'Profesor',
  student: 'Estudiante',
  guardian: 'Apoderado',
  inspector: 'Inspector'
};

function splitName(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length <= 1) return { name: parts[0] ?? name, lastName: '' };
  return { name: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? '' };
}

function textIncludes(value: unknown, query: string) {
  return JSON.stringify(value).toLowerCase().includes(query.toLowerCase());
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`admin-status ${active ? 'active' : 'inactive'}`}>{active ? 'Activo' : 'Inactivo'}</span>;
}

function SelectField({ label, name, options, defaultValue, required, placeholder = 'Sin asignar', error, help, onChange }: { label: string; name: string; options: AdminOption[]; defaultValue?: string | null; required?: boolean; placeholder?: string; error?: string; help?: string; onChange?: (value: string) => void }) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={defaultValue ?? ''} aria-required={required} className={error ? 'input-error' : undefined} onChange={(event) => onChange?.(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}{option.meta ? ` · ${option.meta}` : ''}</option>
        ))}
      </select>
      {help && <small className="field-help">{help}</small>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function MultiSelectField({ label, name, options, defaultValues = [], help }: { label: string; name: string; options: AdminOption[]; defaultValues?: string[]; help?: string }) {
  return (
    <div className="checkbox-field">
      <span>{label}</span>
      <div className="checkbox-list">
        {options.map((option) => (
          <label key={option.id} className="checkbox-option">
            <input type="checkbox" name={name} value={option.id} defaultChecked={defaultValues.includes(option.id)} />
            <span>{option.label}{option.meta ? <small>{option.meta}</small> : null}</span>
          </label>
        ))}
      </div>
      {help && <small className="field-help">{help}</small>}
    </div>
  );
}

function getValues(form: HTMLFormElement, key: string) {
  const checked = Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${key}"]:checked`)).map((input) => input.value);
  if (checked.length) return checked.filter(Boolean);
  return Array.from(form.querySelectorAll<HTMLSelectElement>(`select[name="${key}"] option:checked`)).map((option) => option.value).filter(Boolean);
}

type UserLikeRow = Partial<AdminUserRow> | Partial<AdminStudentRow> | Partial<AdminTeacherRow> | Partial<AdminGuardianRow>;
type UserFormErrors = Partial<Record<'name' | 'lastName' | 'email' | 'role' | 'password' | 'confirmPassword' | 'rut' | 'phone' | 'birthDate' | 'sectionId' | 'department', string>>;
type AdminUserClientErrors = { nombre?: string; apellido?: string; correo?: string; password?: string; rol?: string };
const inlineFieldErrorStyle = { color: '#dc2626', fontSize: 12 };

function roleFromModal(modal: ModalState): Role | '' {
  if (modal.type === 'student') return 'student';
  if (modal.type === 'teacher') return 'teacher';
  if (modal.type === 'guardian') return 'guardian';
  if (modal.type === 'user') return modal.row?.role ?? '';
  return 'student';
}

function isRole(value: string): value is Role {
  return ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'].includes(value);
}

function PasswordInput({ name, label, value, onChange, error, help, placeholder = 'Mínimo 6 caracteres' }: { name: string; label: string; value: string; onChange: (value: string) => void; error?: string; help?: string; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="password-field">
      {label}
      <span>
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className={error ? 'input-error' : undefined}
        />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error && <span className="field-error" style={inlineFieldErrorStyle}>{error}</span>}
      {help && <small className="field-help">{help}</small>}
    </label>
  );
}

function StudentPickerModal({ students, selectedIds, onCancel, onConfirm, setConfirm }: { students: AdminStudentRow[]; selectedIds: string[]; onCancel: () => void; onConfirm: (ids: string[]) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [section, setSection] = useState('');
  const [draft, setDraft] = useState<string[]>(Array.from(new Set(selectedIds)));
  const courseOptions = useMemo(() => Array.from(new Set(students.map((student) => student.course).filter(Boolean))).sort(), [students]);
  const sectionOptions = useMemo(() => Array.from(new Set(students.filter((student) => !course || student.course === course).map((student) => student.section).filter(Boolean))).sort(), [course, students]);
  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesCourse = !course || student.course === course;
      const matchesSection = !section || student.section === section;
      const haystack = `${student.name} ${student.email} ${student.rut} ${student.course} ${student.section}`.toLowerCase();
      return matchesCourse && matchesSection && (!normalized || haystack.includes(normalized));
    });
  }, [course, query, section, students]);
  const selectedStudents = students.filter((student) => draft.includes(student.id));
  const dirty = draft.slice().sort().join('|') !== selectedIds.slice().sort().join('|');

  function requestClose() {
    if (!dirty) return onCancel();
    confirmAction(setConfirm, {
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      danger: true,
      action: async () => onCancel()
    });
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function toggle(id: string) {
    setDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section className="student-picker-modal">
        <header>
          <div>
            <span>Apoderados</span>
            <h2>Seleccionar estudiantes</h2>
          </div>
          <button type="button" onClick={requestClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="student-picker-tools">
          <label>
            Curso
            <select value={course} onChange={(event) => { setCourse(event.target.value); setSection(''); }}>
              <option value="">Todos los cursos</option>
              {courseOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Sección
            <select value={section} onChange={(event) => setSection(event.target.value)}>
              <option value="">Todas las secciones</option>
              {sectionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="admin-search student-picker-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo o RUT" /></label>
        </div>
        <div className="selected-student-strip">
          {selectedStudents.length ? selectedStudents.map((student) => (
            <button key={student.id} type="button" onClick={() => toggle(student.id)}>
              {student.name}<X size={14} />
            </button>
          )) : <span>Sin estudiantes seleccionados</span>}
        </div>
        <div className="student-picker-list">
          {filteredStudents.map((student) => (
            <label key={student.id} className="student-picker-row">
              <input type="checkbox" checked={draft.includes(student.id)} onChange={() => toggle(student.id)} />
              <span>
                <strong>{student.name}</strong>
                <small>{student.email}</small>
                <small>RUT / identificador: {student.rut || 'Sin registro'}</small>
                <small>{student.course} · {student.section}</small>
              </span>
            </label>
          ))}
          {!filteredStudents.length && <div className="admin-empty"><Search size={20} /><strong>Sin estudiantes</strong><span>No se encontraron estudiantes con esos filtros.</span></div>}
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={requestClose}>Cancelar</button>
          <button type="button" className="primary-button" onClick={() => onConfirm(Array.from(new Set(draft)))}>Confirmar selección</button>
        </footer>
      </section>
    </div>
  );
}

function UserFields({
  role,
  row,
  options,
  students,
  selectedStudentIds,
  onOpenStudentPicker,
  canChangeRole = false,
  showPassword = true,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  errors = {},
  onRoleChange
}: {
  role: Role | '';
  row?: UserLikeRow;
  options: AdminBundle['summary']['options'];
  students: AdminStudentRow[];
  selectedStudentIds: string[];
  onOpenStudentPicker: () => void;
  canChangeRole?: boolean;
  showPassword?: boolean;
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  errors?: UserFormErrors;
  onRoleChange?: (role: Role) => void;
}) {
  const names = splitName(row?.name);
  const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id));
  return (
    <>
      <fieldset className="admin-form-section">
        <legend>Datos personales</legend>
        <label>Nombre<input name="name" defaultValue={names.name} autoComplete="off" placeholder="Nombre del usuario" className={errors.name ? 'input-error' : undefined} />{errors.name && <span className="field-error" style={inlineFieldErrorStyle}>{errors.name}</span>}</label>
        <label>Apellido<input name="lastName" defaultValue={names.lastName} autoComplete="off" placeholder="Apellido" className={errors.lastName ? 'input-error' : undefined} />{errors.lastName && <span className="field-error" style={inlineFieldErrorStyle}>{errors.lastName}</span>}</label>
      </fieldset>
      <fieldset className="admin-form-section">
        <legend>Acceso</legend>
        <label>Correo<input name="email" type="email" defaultValue={row?.email ?? ''} autoComplete="new-email" placeholder="correo@colegio.cl" spellCheck={false} className={errors.email ? 'input-error' : undefined} />{errors.email && <span className="field-error" style={inlineFieldErrorStyle}>{errors.email}</span>}</label>
      {canChangeRole && (
        <label>Rol
          <select name="role" value={role} onChange={(event) => isRole(event.target.value) && onRoleChange?.(event.target.value)} className={errors.role ? 'input-error' : undefined}>
            <option value="">Selecciona un rol</option>
            {options.roles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          {errors.role && <span className="field-error" style={inlineFieldErrorStyle}>{errors.role}</span>}
        </label>
      )}
      {showPassword && <PasswordInput name="password" label="Contraseña" value={password} onChange={onPasswordChange} error={errors.password} />}
      {showPassword && <PasswordInput name="confirmPassword" label="Repetir contraseña" value={confirmPassword} onChange={onConfirmPasswordChange} error={errors.confirmPassword} placeholder="Repite la contraseña" />}
      </fieldset>
      {role && (
        <fieldset className="admin-form-section">
          <legend>Datos según rol</legend>
          {role === 'teacher' && <label>Área / especialidad<input name="department" defaultValue={(row as AdminUserRow | undefined)?.department ?? (row as AdminTeacherRow | undefined)?.specialty ?? ''} autoComplete="off" placeholder="Ej: Matemática" className={errors.department ? 'input-error' : undefined} />{errors.department && <span className="field-error">{errors.department}</span>}</label>}
          {role === 'student' && <label>RUT / identificador<input name="rut" defaultValue={(row as AdminStudentRow | undefined)?.rut ?? ''} autoComplete="off" placeholder="Ej: 12.345.678-9" className={errors.rut ? 'input-error' : undefined} />{errors.rut && <span className="field-error">{errors.rut}</span>}</label>}
          {role === 'teacher' && <label>Código docente<input name="rut" defaultValue={(row as AdminTeacherRow | undefined)?.employeeCode ?? ''} autoComplete="off" placeholder="Código docente" className={errors.rut ? 'input-error' : undefined} />{errors.rut && <span className="field-error">{errors.rut}</span>}</label>}
          {role === 'student' && <label>Fecha nacimiento<input name="birthDate" type="date" defaultValue={(row as AdminStudentRow | undefined)?.birthDate ?? ''} autoComplete="off" className={errors.birthDate ? 'input-error' : undefined} />{errors.birthDate && <span className="field-error">{errors.birthDate}</span>}</label>}
          {role === 'student' && <SelectField label="Sección" name="sectionId" options={options.sections} defaultValue={(row as AdminStudentRow | undefined)?.sectionId} placeholder="Selecciona una sección" error={errors.sectionId} />}
          {role === 'guardian' && <label>RUT / identificador<input name="rut" defaultValue={(row as AdminGuardianRow | undefined)?.rut ?? ''} autoComplete="off" placeholder="Ej: 11.111.111-1" className={errors.rut ? 'input-error' : undefined} />{errors.rut && <span className="field-error">{errors.rut}</span>}</label>}
          {role === 'guardian' && <label className="compact-field">Teléfono<input name="phone" defaultValue={(row as AdminGuardianRow | undefined)?.phone ?? ''} autoComplete="off" placeholder="+56 9 1234 5678" className={errors.phone ? 'input-error' : undefined} />{errors.phone && <span className="field-error">{errors.phone}</span>}</label>}
          {role === 'guardian' && (
            <div className="guardian-student-field">
              <span>Estudiantes vinculados</span>
              <button type="button" className="secondary-button" onClick={onOpenStudentPicker}><Users size={16} />Seleccionar estudiantes</button>
              <div className="selected-student-list">
                {selectedStudents.length ? selectedStudents.map((student) => <span key={student.id}>{student.name}</span>) : <small className="field-help">Sin estudiantes vinculados. Puedes vincularlos ahora o desde Asignaciones.</small>}
              </div>
              {selectedStudentIds.map((id) => <input key={id} type="hidden" name="studentIds" value={id} />)}
            </div>
          )}
          {['admin', 'director', 'inspector'].includes(role) && <p className="field-help admin-role-note">Este rol no requiere datos académicos adicionales.</p>}
        </fieldset>
      )}
    </>
  );
}

function mapAdminUserClientErrors(errors: AdminUserClientErrors): UserFormErrors {
  return {
    name: errors.nombre,
    lastName: errors.apellido,
    email: errors.correo,
    password: errors.password,
    role: errors.rol
  };
}

function EntityModal({ modal, options, students, onClose, onSaved, setConfirm, onApiError, onResetPassword }: { modal: ModalState; options: AdminBundle['summary']['options']; students: AdminStudentRow[]; onClose: () => void; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void; onApiError: (error: unknown) => void; onResetPassword: (target: NonNullable<ResetPasswordTarget>) => void }) {
  const title = `${modal.mode === 'create' ? 'Crear' : 'Editar'} ${modal.type === 'user' ? 'usuario' : modal.type === 'student' ? 'estudiante' : modal.type === 'teacher' ? 'profesor' : modal.type === 'guardian' ? 'apoderado' : modal.type === 'course' ? 'curso' : modal.type === 'section' ? 'sección' : modal.type === 'classroom' ? 'sala' : 'asignatura'}`;
  const [selectedRole, setSelectedRole] = useState<Role | ''>(roleFromModal(modal));
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [userFormErrors, setUserFormErrors] = useState<AdminUserClientErrors>({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    modal.type === 'guardian' ? modal.row?.students?.map((item) => item.id) ?? [] : []
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const displayedFieldErrors = modal.type === 'user' ? { ...fieldErrors, ...mapAdminUserClientErrors(userFormErrors) } : fieldErrors;
  const hasFieldErrors = Object.keys(fieldErrors).length > 0 || Object.keys(userFormErrors).length > 0;
  const submitting = saving;
  const resetUserTarget = modal.mode === 'edit' && ['user', 'student', 'teacher', 'guardian'].includes(modal.type)
    ? {
        id: modal.type === 'user' ? modal.row?.id ?? '' : (modal.row as AdminStudentRow | AdminTeacherRow | AdminGuardianRow | undefined)?.userId ?? '',
        name: modal.row?.name ?? 'usuario'
      }
    : null;

  function requestClose() {
    if (!dirty) {
      onClose();
      return;
    }
    confirmAction(setConfirm, {
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      danger: true,
      action: async () => onClose()
    });
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function validateUserPayload(payload: AdminUserPayload, requireRole: boolean, requirePassword: boolean) {
    const nextErrors: UserFormErrors = {};
    if (!payload.name.trim()) nextErrors.name = 'El nombre es obligatorio.';
    if (!payload.lastName?.trim()) nextErrors.lastName = 'El apellido es obligatorio.';
    if (!payload.email.trim()) nextErrors.email = 'El correo es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) nextErrors.email = 'Ingresa un correo válido.';
    if (requireRole && !payload.role) nextErrors.role = 'Selecciona un rol.';
    if (requirePassword && !payload.password) nextErrors.password = 'La contraseña es obligatoria.';
    if (payload.password && payload.password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    if (requirePassword && !confirmPassword) nextErrors.confirmPassword = 'Repite la contraseña.';
    if (payload.password && payload.password !== confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    if (payload.role === 'student') {
      if (!payload.rut) nextErrors.rut = 'El RUT es obligatorio.';
      if (!payload.birthDate) nextErrors.birthDate = 'La fecha de nacimiento es obligatoria.';
      if (!payload.sectionId) nextErrors.sectionId = 'Selecciona una sección.';
    }
    if (payload.role === 'teacher') {
      if (!payload.rut) nextErrors.rut = 'El código docente es obligatorio.';
      if (!payload.department?.trim()) nextErrors.department = 'El área o especialidad es obligatoria.';
    }
    if (payload.role === 'guardian') {
      if (!payload.rut) nextErrors.rut = 'El RUT es obligatorio.';
      if (!payload.phone) nextErrors.phone = 'El teléfono es obligatorio.';
    }
    if (payload.rut && (payload.rut.length < 5 || payload.rut.length > 30)) nextErrors.rut = 'Debe tener entre 5 y 30 caracteres.';
    if (payload.phone && !/^(?:\+?56\s?)?(?:9\s?)?\d{4}\s?\d{4}$/.test(payload.phone.replace(/[()-]/g, '').trim())) nextErrors.phone = 'Usa un teléfono chileno válido.';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateAdminUserForm(payload: AdminUserPayload, requirePassword: boolean) {
    const nextErrors: AdminUserClientErrors = {};
    const name = payload.name.trim();
    const lastName = payload.lastName?.trim() ?? '';
    const email = payload.email.trim();

    if (!name) nextErrors.nombre = 'El nombre es obligatorio.';
    else if (name.length < 2) nextErrors.nombre = 'El nombre debe tener al menos 2 caracteres.';
    if (!lastName) nextErrors.apellido = 'El apellido es obligatorio.';
    else if (lastName.length < 2) nextErrors.apellido = 'El apellido debe tener al menos 2 caracteres.';
    if (!email) nextErrors.correo = 'El correo es obligatorio.';
    else {
      const atIndex = email.indexOf('@');
      const dotAfterAt = atIndex >= 0 && email.indexOf('.', atIndex + 1) > atIndex + 1;
      if (atIndex <= 0 || !dotAfterAt) nextErrors.correo = 'Ingresa un correo válido.';
    }
    if (!payload.role) nextErrors.rol = 'Selecciona un rol.';
    if (requirePassword) {
      if (!payload.password) nextErrors.password = 'La contraseña es obligatoria.';
      else if (payload.password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setUserFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function cleanUserPayload(payload: AdminUserPayload): AdminUserPayload {
    const role = payload.role;
    const cleaned: AdminUserPayload = {
      name: payload.name.trim(),
      lastName: payload.lastName?.trim() || undefined,
      email: payload.email.trim(),
      role,
      password: payload.password?.trim() || undefined
    };
    if (role === 'teacher') {
      cleaned.department = payload.department?.trim() || undefined;
      cleaned.rut = payload.rut?.trim() || undefined;
    }
    if (role === 'student') {
      cleaned.rut = payload.rut?.trim() || undefined;
      cleaned.birthDate = payload.birthDate || undefined;
      cleaned.sectionId = payload.sectionId || undefined;
    }
    if (role === 'guardian') {
      cleaned.phone = payload.phone?.trim() || undefined;
      cleaned.rut = payload.rut?.trim() || undefined;
      cleaned.studentIds = payload.studentIds ?? [];
    }
    return cleaned;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const form = event.currentTarget;
    const fd = new FormData(form);
    const role = modal.type === 'user' ? selectedRole : roleFromModal(modal);
    const baseUser: AdminUserPayload = {
      name: String(fd.get('name') ?? ''),
      lastName: String(fd.get('lastName') ?? ''),
      email: String(fd.get('email') ?? ''),
      role,
      department: String(fd.get('department') ?? ''),
      password: password || undefined,
      rut: String(fd.get('rut') ?? '') || undefined,
      phone: String(fd.get('phone') ?? '') || undefined,
      birthDate: String(fd.get('birthDate') ?? '') || undefined,
      sectionId: String(fd.get('sectionId') ?? '') || undefined,
      studentIds: selectedStudentIds
    };

    if (modal.type === 'user' && !validateAdminUserForm(baseUser, modal.mode === 'create')) return;
    if (['user', 'student', 'teacher', 'guardian'].includes(modal.type) && !validateUserPayload(baseUser, modal.type === 'user', modal.mode === 'create')) return;
    const cleanedUser = cleanUserPayload(baseUser);

    const save = async () => {
      try {
      setSaving(true);
      if (modal.type === 'user') modal.mode === 'create' ? await createAdminUser(cleanedUser) : await updateAdminUser(modal.row!.id, cleanedUser);
      if (modal.type === 'student') modal.mode === 'create' ? await createAdminStudent(cleanedUser) : await updateAdminStudent(modal.row!.id, cleanedUser);
      if (modal.type === 'teacher') modal.mode === 'create' ? await createAdminTeacher(cleanedUser) : await updateAdminTeacher(modal.row!.id, cleanedUser);
      if (modal.type === 'guardian') modal.mode === 'create' ? await createAdminGuardian(cleanedUser) : await updateAdminGuardian(modal.row!.id, cleanedUser);
      if (modal.type === 'course') {
        const payload = { name: String(fd.get('name') ?? ''), levelId: String(fd.get('levelId') ?? '') };
        modal.mode === 'create' ? await createAdminCourse(payload) : await updateAdminCourse(modal.row!.id, payload);
      }
      if (modal.type === 'section') {
        const payload = { name: String(fd.get('name') ?? ''), courseId: String(fd.get('courseId') ?? ''), teacherId: String(fd.get('teacherId') ?? '') || undefined, classroomId: String(fd.get('classroomId') ?? '') || undefined };
        modal.mode === 'create' ? await createAdminSection(payload) : await updateAdminSection(modal.row!.id, payload);
      }
      if (modal.type === 'classroom') {
        const payload = { name: String(fd.get('name') ?? ''), capacity: Number(fd.get('capacity') ?? 0), type: String(fd.get('type') ?? 'aula') as AdminClassroomRow['type'], floor: Number(fd.get('floor') ?? 1) };
        modal.mode === 'create' ? await createAdminClassroom(payload) : await updateAdminClassroom(modal.row!.id, payload);
      }
      if (modal.type === 'subject') {
        const payload = { name: String(fd.get('name') ?? ''), code: String(fd.get('code') ?? ''), courseIds: getValues(form, 'courseIds'), sectionIds: getValues(form, 'sectionIds'), teacherIds: getValues(form, 'teacherIds') };
        modal.mode === 'create' ? await createAdminSubject(payload) : await updateAdminSubject(modal.row!.id, payload);
      }
      const userModal = ['user', 'student', 'teacher', 'guardian'].includes(modal.type);
      if (userModal && modal.mode === 'create') onSaved('Usuario creado correctamente.');
      else if (userModal) onSaved('Usuario actualizado correctamente');
      else if (modal.type === 'course') onSaved(modal.mode === 'create' ? 'Curso creado correctamente.' : 'Curso actualizado correctamente.');
      else if (modal.type === 'section') onSaved(modal.mode === 'create' ? 'Sección creada correctamente.' : 'Sección actualizada correctamente.');
      else if (modal.type === 'classroom') onSaved(modal.mode === 'create' ? 'Sala creada correctamente.' : 'Sala actualizada correctamente.');
      else if (modal.type === 'subject') onSaved(modal.mode === 'create' ? 'Asignatura creada correctamente.' : 'Asignatura actualizada correctamente.');
      else onSaved('Cambios guardados correctamente.');
      } catch (err) {
        const apiError = normalizeApiError(err);
        if (apiError.kind === 'validation') {
          setFieldErrors((current) => ({ ...current, ...apiError.fieldErrors }));
          setFormError(Object.keys(apiError.fieldErrors).length ? '' : apiError.message);
        } else {
          onApiError(apiError);
        }
      } finally {
        setSaving(false);
      }
    };

    if (['course', 'section', 'classroom'].includes(modal.type)) {
      confirmAction(setConfirm, {
        title: modal.mode === 'create' ? `Crear ${modal.type === 'course' ? 'curso' : modal.type === 'section' ? 'sección' : 'sala'}` : `Guardar cambios de ${modal.type === 'course' ? 'curso' : modal.type === 'section' ? 'sección' : 'sala'}`,
        message: modal.type === 'section' && modal.mode === 'edit' ? 'Confirma el cambio. Si modificas curso, profesor jefe o sala, la sección conservará sus estudiantes actuales.' : 'Confirma que quieres guardar estos cambios.',
        action: save
      });
      return;
    }

    await save();
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <form className="admin-modal" onSubmit={submit} autoComplete="off" noValidate onInput={() => { setDirty(true); if (hasFieldErrors) { setFieldErrors({}); setUserFormErrors({}); } if (formError) setFormError(''); }}>
        <input className="admin-autofill-decoy" type="text" name="fake-username" autoComplete="username" tabIndex={-1} aria-hidden="true" />
        <input className="admin-autofill-decoy" type="password" name="fake-password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" />
        <header>
          <div><span>Administración</span><h2>{title}</h2></div>
          <button type="button" onClick={requestClose}>x</button>
        </header>
        <div className="admin-form-grid">
          {modal.type === 'user' && <UserFields role={selectedRole} row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} canChangeRole showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={displayedFieldErrors} onRoleChange={(role) => { setSelectedRole(role); setSelectedStudentIds([]); setPassword(''); setConfirmPassword(''); setFieldErrors({}); setUserFormErrors({}); setFormError(''); }} />}
          {modal.type === 'student' && <UserFields role="student" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'teacher' && <UserFields role="teacher" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'guardian' && <UserFields role="guardian" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'course' && (
            <>
              <label>Curso<input name="name" defaultValue={modal.row?.name} required placeholder="Ej: 1 Medio" /></label>
              <SelectField label="Nivel" name="levelId" options={options.levels} defaultValue={modal.row?.levelId} placeholder="Selecciona un nivel" required />
              {modal.mode === 'edit' && <p className="field-help full-span">Las secciones asociadas se gestionan desde Gestión académica &gt; Secciones.</p>}
            </>
          )}
          {modal.type === 'section' && <><label>Sección<input name="name" defaultValue={modal.row?.name} required placeholder="Ej: A" /></label><SelectField label="Curso" name="courseId" options={options.courses} defaultValue={modal.row?.courseId} placeholder="Selecciona un curso" required /><SelectField label="Profesor jefe" name="teacherId" options={options.teachers} defaultValue={modal.row?.teacherId} placeholder="Sin profesor jefe" /><SelectField label="Sala" name="classroomId" options={options.classrooms} defaultValue={modal.row?.classroomId} placeholder="Sin sala" />{modal.row?.students ? <p className="field-help full-span">Esta sección tiene {modal.row.students} estudiantes. Si cambias el curso, revisa que la matrícula siga correspondiendo.</p> : null}</>}
          {modal.type === 'classroom' && <><label>Sala<input name="name" defaultValue={modal.row?.name} required placeholder="Ej: Sala 308" /></label><SelectField label="Tipo" name="type" options={[{ id: 'aula', label: 'Aula' }, { id: 'laboratorio', label: 'Laboratorio' }, { id: 'biblioteca', label: 'Biblioteca' }, { id: 'gimnasio', label: 'Gimnasio' }, { id: 'otro', label: 'Otro' }]} defaultValue={modal.row?.type ?? 'aula'} required /><label>Piso<input name="floor" type="number" min="0" max="30" defaultValue={modal.row?.floor ?? 1} required /></label><label>Capacidad<input name="capacity" type="number" min="1" defaultValue={modal.row?.capacity ?? 30} required /></label></>}
          {modal.type === 'subject' && <><label>Asignatura<input name="name" defaultValue={modal.row?.name} required /></label><label>Código<input name="code" defaultValue={modal.row?.code} required /></label><MultiSelectField label="Cursos" name="courseIds" options={options.courses} defaultValues={modal.row?.courses?.map((item) => item.id)} /><MultiSelectField label="Secciones" name="sectionIds" options={options.sections} defaultValues={modal.row?.sections?.map((item) => item.id)} /><MultiSelectField label="Profesores" name="teacherIds" options={options.teachers} defaultValues={modal.row?.teachers?.map((item) => item.id)} /></>}
        </div>
        {formError && <p className="admin-modal-error">{formError}</p>}
        <footer>
          {resetUserTarget?.id && <button type="button" className="secondary-button" onClick={() => onResetPassword(resetUserTarget)}><KeyRound size={16} />Restablecer contraseña</button>}
          <button type="button" className="secondary-button" onClick={requestClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={submitting || hasFieldErrors}>
            {submitting
              ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6 }} />Guardando...</>
              : modal.type === 'course' ? 'Guardar curso' : modal.type === 'section' ? 'Guardar sección' : modal.type === 'classroom' ? 'Guardar sala' : modal.type === 'subject' ? 'Guardar asignatura' : 'Guardar usuario'}
          </button>
        </footer>
      </form>
      {studentPickerOpen && <StudentPickerModal students={students} selectedIds={selectedStudentIds} onCancel={() => setStudentPickerOpen(false)} onConfirm={(ids) => { setSelectedStudentIds(ids); setStudentPickerOpen(false); }} setConfirm={setConfirm} />}
    </div>
  );
}

function ConfirmDialog({ confirm, onClose, onApiError }: { confirm: ConfirmState; onClose: () => void; onApiError: (error: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [busy, onClose]);
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="admin-confirm">
        <AlertTriangle />
        <h2>{confirm.title}</h2>
        <p>{confirm.message}</p>
        <div><button className="secondary-button" onClick={onClose}>Cancelar</button><button className={confirm.danger ? 'danger-button' : 'primary-button'} disabled={busy} onClick={async () => { try { setBusy(true); await confirm.action(); onClose(); } catch (err) { onClose(); onApiError(err); } finally { setBusy(false); } }}>{confirm.title === 'Cambios sin guardar' ? 'Salir sin guardar' : 'Confirmar'}</button></div>
      </section>
    </div>
  );
}

function ResetPasswordModal({ target, onClose, onSaved, setConfirm, onApiError }: { target: NonNullable<ResetPasswordTarget>; onClose: () => void; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void; onApiError: (error: unknown) => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Pick<UserFormErrors, 'password' | 'confirmPassword'>>({});
  const [saving, setSaving] = useState(false);
  const dirty = Boolean(password || confirmPassword);

  function requestClose() {
    if (!dirty) {
      onClose();
      return;
    }
    confirmAction(setConfirm, {
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      danger: true,
      action: async () => onClose()
    });
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Pick<UserFormErrors, 'password' | 'confirmPassword'> = {};
    if (!password) nextErrors.password = 'La nueva contraseña es obligatoria.';
    else if (password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Repite la contraseña.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      setSaving(true);
      await resetAdminUserPassword(target.id, password);
      onSaved('Contraseña actualizada correctamente.');
    } catch (err) {
      const apiError = normalizeApiError(err);
      if (apiError.kind === 'validation') setErrors({ password: apiError.message });
      else onApiError(apiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <form className="admin-modal reset-password-modal" onSubmit={submit} noValidate autoComplete="off" onInput={() => setErrors({})}>
        <header><div><span>Administración</span><h2>Restablecer contraseña</h2></div><button type="button" onClick={requestClose}>x</button></header>
        <div className="admin-form-grid">
          <p className="field-help full-span">Define una nueva contraseña para {target.name}.</p>
          <PasswordInput name="newPassword" label="Nueva contraseña" value={password} onChange={setPassword} error={errors.password} />
          <PasswordInput name="repeatPassword" label="Repetir contraseña" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirmPassword} placeholder="Repite la contraseña" />
        </div>
        <footer><button type="button" className="secondary-button" onClick={requestClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar nueva contraseña'}</button></footer>
      </form>
    </div>
  );
}

function StudentObservationsModal({ student, onClose, onApiError }: { student: AdminStudentRow; onClose: () => void; onApiError: (error: unknown) => void }) {
  const [rows, setRows] = useState<StudentObservationRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function reload() {
    const { data } = await api.get<StudentObservationRow[]>('/observations', { params: { studentId: student.id } });
    setRows(data);
  }

  useEffect(() => { reload().catch(onApiError); }, [student.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      studentId: student.id,
      sectionId: student.sectionId || undefined,
      body: String(form.get('body') ?? '').trim(),
      type: String(form.get('type') ?? 'neutral'),
      date: String(form.get('date') ?? new Date().toISOString().slice(0, 10)),
      isVisible: form.get('isVisible') === 'on'
    };
    if (payload.body.length < 5) return setError('La anotación debe tener al menos 5 caracteres.');
    try {
      setSaving(true);
      await api.post('/observations', payload);
      event.currentTarget.reset();
      await reload();
    } catch (err) {
      const apiError = normalizeApiError(err);
      if (apiError.kind === 'validation') setError(apiError.message);
      else onApiError(apiError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/observations/${id}`);
      await reload();
    } catch (err) {
      onApiError(err);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="admin-modal">
        <header><div><span>Estudiante</span><h2>Anotaciones de {student.name}</h2></div><button type="button" onClick={onClose} disabled={saving}>x</button></header>
        <div className="admin-form-grid">
          <form className="full-span admin-form-grid" onSubmit={submit} noValidate>
            <label>Tipo<select name="type" defaultValue="neutral"><option value="positiva">Positiva</option><option value="negativa">Negativa</option><option value="neutral">Neutral</option></select></label>
            <label>Fecha<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} max={new Date().toISOString().slice(0, 10)} /></label>
            <label className="checkbox-option"><input name="isVisible" type="checkbox" defaultChecked /><span>Visible para estudiante/apoderado</span></label>
            <label className="full-span">Nueva anotación<textarea name="body" rows={4} maxLength={500} placeholder="Describe la observación del estudiante" required /></label>
            {error && <p className="admin-modal-error full-span">{error}</p>}
            <footer className="full-span"><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Nueva anotación'}</button></footer>
          </form>
        </div>
        <div className="notification-list">
          {rows.map((row) => (
            <article key={row.id} className="notification-item">
              <div>
                <span className={`priority-badge ${row.type === 'positiva' ? 'normal' : row.type === 'negativa' ? 'urgente' : 'alta'}`}>{row.type}</span>
                <strong>{row.author}</strong>
                <p>{row.body}</p>
                <small>{row.date} · {row.section ?? student.section} · {row.isVisible ? 'Visible' : 'Interna'}</small>
              </div>
              <button type="button" onClick={() => remove(row.id)} disabled={saving} aria-label="Eliminar anotación"><Trash2 size={16} /></button>
            </article>
          ))}
          {!rows.length && <div className="notification-empty"><ClipboardList size={22} /><strong>Sin anotaciones</strong><span>No hay anotaciones registradas para este estudiante.</span></div>}
        </div>
      </section>
    </div>
  );
}

function AdminTable<T extends { id: string }>({ rows, render, empty = 'Sin registros', headers }: { rows: T[]; render: (row: T) => ReactNode; empty?: string; headers?: string[] }) {
  const { page, total, setPage, visible } = usePagedRows(rows, 10);
  if (!rows.length) return <div className="admin-empty"><Search size={22} /><strong>{empty}</strong><span>Ajusta la búsqueda o crea un nuevo registro.</span></div>;
  return <>{headers?.length ? <div className="admin-table-header">{headers.map((header) => <span key={header}>{header}</span>)}</div> : null}<div className="admin-table-list">{visible.map((row) => <article key={row.id} className="admin-table-card">{render(row)}</article>)}</div><Pager page={page} total={total} onPage={setPage} /></>;
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  if (total <= 1) return null;
  return <div className="assignment-pager"><button className="secondary-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button><span>Página {page} de {total}</span><button className="secondary-button" disabled={page >= total} onClick={() => onPage(page + 1)}>Siguiente</button></div>;
}

function usePagedRows<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { if (page > total) setPage(total); }, [page, total]);
  return { page, total, setPage, visible: rows.slice((page - 1) * pageSize, page * pageSize) };
}

function confirmAction(setConfirm: (confirm: ConfirmState | null) => void, input: ConfirmState) {
  setConfirm(input);
}

function CoursesSectionsPage({ bundle, canManage, setModal, setConfirm, onSaved }: { bundle: AdminBundle; canManage: boolean; setModal: (modal: ModalState) => void; setConfirm: (confirm: ConfirmState | null) => void; onSaved: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(bundle.courses.slice(0, 2).map((course) => [course.id, true])));
  const filteredCourses = bundle.courses.filter((course) => textIncludes(course, query) || bundle.sections.some((section) => section.courseId === course.id && textIncludes(section, query)));

  function confirmDeleteSection(section: AdminSectionRow) {
    confirmAction(setConfirm, {
      title: 'Eliminar sección',
      message: section.students ? `La sección ${section.course} ${section.name} tiene ${section.students} estudiantes. Debes quitar esos estudiantes antes de eliminarla.` : `Confirma que quieres eliminar la sección ${section.course} ${section.name}.`,
      danger: true,
      action: async () => {
        if (!window.confirm(`¿Eliminar la sección ${section.course} ${section.name}? Esta acción no se puede deshacer.`)) return;
        await deleteAdminSection(section.id);
        onSaved('Sección eliminada correctamente.');
      }
    });
  }

  function confirmDeleteClassroom(classroom: AdminClassroomRow) {
    confirmAction(setConfirm, {
      title: 'Eliminar sala',
      message: classroom.sections || classroom.schedules ? `La sala ${classroom.name} está en uso. Debes quitarla de secciones u horarios antes de eliminarla.` : `Confirma que quieres eliminar la sala ${classroom.name}.`,
      danger: true,
      action: async () => {
        if (!window.confirm(`¿Eliminar la sala ${classroom.name}? Esta acción no se puede deshacer.`)) return;
        await deleteAdminClassroom(classroom.id);
        onSaved('Sala eliminada correctamente.');
      }
    });
  }

  return (
    <div className="course-admin-view">
      <header className="assignment-header">
        <div><h2>Cursos, secciones y salas</h2><p>Administra niveles, paralelos, profesores jefe y espacios físicos.</p></div>
        {canManage && <div className="course-actions"><button className="secondary-button" onClick={() => setModal({ type: 'classroom', mode: 'create' })}><Plus size={17} />Crear sala</button><button className="primary-button" onClick={() => setModal({ type: 'course', mode: 'create' })}><Plus size={17} />Crear curso</button></div>}
      </header>

      <div className="assignment-filters labelled-filters">
        <label className="admin-search"><span>Buscar curso o sección</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, nivel, sección, sala o profesor" /></div></label>
      </div>

      <div className="course-card-list">
        {filteredCourses.map((course) => {
          const sections = bundle.sections.filter((section) => section.courseId === course.id);
          const isOpen = expanded[course.id] ?? false;
          return (
            <article key={course.id} className="course-card">
              <div className="course-card-header">
                <button type="button" className="course-main-button" onClick={() => setExpanded((current) => ({ ...current, [course.id]: !isOpen }))}>
                  <span className="course-toggle">{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                  <div><strong>{course.name}</strong><small>{course.level}</small></div>
                  <span>{course.sections} secciones</span>
                  <span>{course.students} estudiantes</span>
                </button>
                {canManage && <button type="button" className="secondary-button" onClick={() => setModal({ type: 'course', mode: 'edit', row: course })}><Edit3 size={15} />Editar</button>}
              </div>
              {isOpen && (
                <div className="section-list">
                  {sections.length ? sections.map((section) => (
                    <div key={section.id} className="section-row">
                      <span><strong>{section.name}</strong><small>Sección</small></span>
                      <span><strong>{section.teacher}</strong><small>Profesor jefe</small></span>
                      <span><strong>{section.classroom}</strong><small>Sala</small></span>
                      <span><strong>{section.students}</strong><small>Estudiantes</small></span>
                      {canManage && <div className="admin-row-actions"><button onClick={() => setModal({ type: 'section', mode: 'edit', row: section })}><Edit3 size={15} />Editar</button><button className="danger-button" onClick={() => confirmDeleteSection(section)}><Trash2 size={15} />Eliminar</button></div>}
                    </div>
                  )) : <div className="admin-empty compact"><Search size={18} /><strong>Sin secciones</strong><span>Crea secciones desde el modal de curso o con una sección nueva.</span></div>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!filteredCourses.length && <div className="admin-empty"><Search size={22} /><strong>Sin cursos</strong><span>No se encontraron cursos con esos filtros.</span></div>}

      <section className="classroom-section">
        <header className="assignment-header compact-header"><div><h3>Salas</h3><p>Capacidad y tipo de espacio disponible.</p></div>{canManage && <button className="secondary-button" onClick={() => setModal({ type: 'classroom', mode: 'create' })}><Plus size={16} />Nueva sala</button>}</header>
        <div className="classroom-grid">
          {bundle.classrooms.map((classroom) => (
            <article key={classroom.id} className="classroom-card">
              <div><strong>{classroom.name}</strong><small>{classroom.type}</small></div>
              <span>{classroom.capacity} cupos</span>
              <span>{classroom.sections} secciones</span>
              {canManage && <div className="admin-row-actions"><button onClick={() => setModal({ type: 'classroom', mode: 'edit', row: classroom })}><Edit3 size={15} />Editar</button><button className="danger-button" onClick={() => confirmDeleteClassroom(classroom)}><Trash2 size={15} />Eliminar</button></div>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

type CourseLevelGroup = 'basic' | 'middle';

function courseLevelGroup(course: AdminCourseRow): CourseLevelGroup {
  const text = `${course.name} ${course.level}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return text.includes('medio') || text.includes('media') ? 'middle' : 'basic';
}

function courseSchoolOrder(course: AdminCourseRow) {
  const match = course.name.match(/\d+/);
  const grade = match ? Number(match[0]) : 99;
  return (courseLevelGroup(course) === 'basic' ? 0 : 100) + grade;
}

function CourseGroup({ title, rows, open, onToggle, canManage, onEdit, onToggleStatus }: { title: string; rows: AdminCourseRow[]; open: boolean; onToggle: () => void; canManage: boolean; onEdit: (course: AdminCourseRow) => void; onToggleStatus: (course: AdminCourseRow) => void }) {
  const { page, total, setPage, visible } = usePagedRows(rows, 10);
  return (
    <section className={`course-level-group ${open ? 'open' : ''}`}>
      <button type="button" className="course-level-toggle" onClick={onToggle} aria-expanded={open}>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span>{title}</span>
        <small>{rows.length} cursos</small>
      </button>
      {open && (
        <div className="course-level-content">
          <div className="course-table">
            <div className="course-table-row head"><span>Curso</span><span>Nivel</span><span>Secciones</span><span>Estudiantes</span><span>Estado</span><span>Acciones</span></div>
            {visible.map((course) => (
              <article key={course.id} className="course-table-row">
                <span><strong>{course.name}</strong><small>Curso</small></span>
                <span><strong>{course.level}</strong><small>Nivel</small></span>
                <span>{course.sections} secciones</span>
                <span>{course.students} estudiantes</span>
                <StatusBadge active={course.isActive} />
                {canManage && <div className="admin-row-actions"><button onClick={() => onEdit(course)}><Edit3 size={15} />Editar</button><button className={course.isActive ? 'danger-button' : 'secondary-button'} onClick={() => onToggleStatus(course)}>{course.isActive ? 'Desactivar' : 'Activar'}</button></div>}
              </article>
            ))}
          </div>
          {!rows.length && <div className="admin-empty compact"><Search size={18} /><strong>Sin cursos</strong><span>No hay cursos en este grupo con los filtros actuales.</span></div>}
          <Pager page={page} total={total} onPage={setPage} />
        </div>
      )}
    </section>
  );
}

function AcademicCoursesPage({ bundle, canManage, setModal, setConfirm, onSaved }: { bundle: AdminBundle; canManage: boolean; setModal: (modal: ModalState) => void; setConfirm: (confirm: ConfirmState | null) => void; onSaved: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | CourseLevelGroup>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sectionsFilter, setSectionsFilter] = useState<'all' | 'with' | 'without'>('all');
  const [openGroups, setOpenGroups] = useState<Record<CourseLevelGroup, boolean>>({ basic: true, middle: true });
  const rows = bundle.courses
    .filter((course) => textIncludes([course.name], query))
    .filter((course) => levelFilter === 'all' || courseLevelGroup(course) === levelFilter)
    .filter((course) => statusFilter === 'all' || (statusFilter === 'active' ? course.isActive : !course.isActive))
    .filter((course) => sectionsFilter === 'all' || (sectionsFilter === 'with' ? course.sections > 0 : course.sections === 0))
    .sort((a, b) => courseSchoolOrder(a) - courseSchoolOrder(b) || a.name.localeCompare(b.name, 'es'));
  const basicRows = rows.filter((course) => courseLevelGroup(course) === 'basic');
  const middleRows = rows.filter((course) => courseLevelGroup(course) === 'middle');
  const hasFilters = Boolean(query || levelFilter !== 'all' || statusFilter !== 'all' || sectionsFilter !== 'all');
  const resetFilters = () => {
    setQuery('');
    setLevelFilter('all');
    setStatusFilter('all');
    setSectionsFilter('all');
  };
  const toggle = (course: AdminCourseRow) => confirmAction(setConfirm, {
    title: `${course.isActive ? 'Desactivar' : 'Activar'} curso`,
    message: course.isActive && course.sections ? `El curso ${course.name} tiene secciones asociadas. Si hay estudiantes activos, el backend bloqueará la acción.` : `Confirma que quieres ${course.isActive ? 'desactivar' : 'activar'} ${course.name}.`,
    danger: course.isActive,
    action: async () => { await setAdminCourseStatus(course.id, !course.isActive); onSaved(course.isActive ? 'Curso desactivado correctamente.' : 'Curso activado correctamente.'); }
  });
  return (
    <div className="course-admin-view">
      <header className="assignment-header"><div><h2>Cursos</h2><p>Lista cursos por orden escolar, nivel, secciones y matrícula total.</p></div>{canManage && <button className="primary-button" onClick={() => setModal({ type: 'course', mode: 'create' })}><Plus size={17} />Crear curso</button>}</header>
      <div className="assignment-filters labelled-filters course-filters">
        <label className="admin-search"><span>Buscar curso</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre del curso" /></div></label>
        <label>Nivel<select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as typeof levelFilter)}><option value="all">Todos</option><option value="basic">Básica</option><option value="middle">Media</option></select></label>
        <label>Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
        <label>Secciones<select value={sectionsFilter} onChange={(event) => setSectionsFilter(event.target.value as typeof sectionsFilter)}><option value="all">Todos</option><option value="with">Con secciones</option><option value="without">Sin secciones</option></select></label>
        <button type="button" className="secondary-button" onClick={resetFilters} disabled={!hasFilters}>Limpiar filtros</button>
      </div>
      <div className="course-level-list">
        <CourseGroup title="Educación Básica" rows={basicRows} open={openGroups.basic} onToggle={() => setOpenGroups((current) => ({ ...current, basic: !current.basic }))} canManage={canManage} onEdit={(course) => setModal({ type: 'course', mode: 'edit', row: course })} onToggleStatus={toggle} />
        <CourseGroup title="Educación Media" rows={middleRows} open={openGroups.middle} onToggle={() => setOpenGroups((current) => ({ ...current, middle: !current.middle }))} canManage={canManage} onEdit={(course) => setModal({ type: 'course', mode: 'edit', row: course })} onToggleStatus={toggle} />
      </div>
      {!rows.length && <div className="admin-empty"><Search size={22} /><strong>Sin cursos</strong><span>No se encontraron cursos con esos filtros.</span></div>}
    </div>
  );
}

function AcademicSectionsPage({ bundle, canManage, setModal, setConfirm, onSaved }: { bundle: AdminBundle; canManage: boolean; setModal: (modal: ModalState) => void; setConfirm: (confirm: ConfirmState | null) => void; onSaved: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [courseId, setCourseId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const rows = bundle.sections.filter((section) => {
    const course = bundle.courses.find((item) => item.id === section.courseId);
    return textIncludes(section, query) && (!courseId || section.courseId === courseId) && (!levelId || course?.levelId === levelId) && (!classroomId || section.classroomId === classroomId) && (!teacherId || section.teacherId === teacherId);
  });
  const { page, total, setPage, visible } = usePagedRows(rows, 10);
  const toggle = (section: AdminSectionRow) => confirmAction(setConfirm, { title: `${section.isActive ? 'Desactivar' : 'Activar'} sección`, message: section.isActive && section.students ? `La sección ${section.course} ${section.name} tiene ${section.students} estudiantes. El backend bloqueará la acción si corresponde.` : `Confirma que quieres ${section.isActive ? 'desactivar' : 'activar'} la sección ${section.course} ${section.name}.`, danger: section.isActive, action: async () => { await setAdminSectionStatus(section.id, !section.isActive); onSaved(section.isActive ? 'Sección desactivada correctamente.' : 'Sección activada correctamente.'); } });
  const remove = (section: AdminSectionRow) => confirmAction(setConfirm, { title: 'Eliminar sección', message: section.students ? `La sección ${section.course} ${section.name} tiene ${section.students} estudiantes. Debes quitar esos estudiantes antes de eliminarla.` : `Confirma que quieres eliminar la sección ${section.course} ${section.name}.`, danger: true, action: async () => { if (!window.confirm(`¿Eliminar la sección ${section.course} ${section.name}? Esta acción no se puede deshacer.`)) return; await deleteAdminSection(section.id); onSaved('Sección eliminada correctamente.'); } });
  return <div className="course-admin-view"><header className="assignment-header"><div><h2>Secciones</h2><p>Gestiona curso, profesor jefe, sala y cantidad de estudiantes.</p></div>{canManage && <button className="primary-button" onClick={() => setModal({ type: 'section', mode: 'create' })}><Plus size={17} />Crear sección</button>}</header><div className="assignment-filters labelled-filters grid-filters"><label className="admin-search"><span>Búsqueda</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sección, curso, sala o profesor" /></div></label><SelectField label="Curso" name="filterCourse" options={bundle.summary.options.courses} defaultValue={courseId} placeholder="Todos los cursos" onChange={setCourseId} /><SelectField label="Nivel" name="filterLevel" options={bundle.summary.options.levels} defaultValue={levelId} placeholder="Todos los niveles" onChange={setLevelId} /><SelectField label="Sala" name="filterRoom" options={bundle.summary.options.classrooms} defaultValue={classroomId} placeholder="Todas las salas" onChange={setClassroomId} /><SelectField label="Profesor jefe" name="filterTeacher" options={bundle.summary.options.teachers} defaultValue={teacherId} placeholder="Todos los profesores" onChange={setTeacherId} /></div><div className="section-list standalone"><div className="section-row head"><span>Sección</span><span>Profesor jefe</span><span>Sala</span><span>Estudiantes</span><span>Estado</span><span>Acciones</span></div>{visible.map((section) => <div key={section.id} className="section-row"><span><strong>{section.course} {section.name}</strong><small>Sección</small></span><span><strong>{section.teacher}</strong><small>Profesor jefe</small></span><span><strong>{section.classroom}</strong><small>Sala</small></span><span><strong>{section.students}</strong><small>Estudiantes</small></span><StatusBadge active={section.isActive} />{canManage && <div className="admin-row-actions"><button onClick={() => setModal({ type: 'section', mode: 'edit', row: section })}><Edit3 size={15} />Editar</button><button className={section.isActive ? 'danger-button' : 'secondary-button'} onClick={() => toggle(section)}>{section.isActive ? 'Desactivar' : 'Activar'}</button><button className="danger-button" onClick={() => remove(section)}><Trash2 size={15} />Eliminar</button></div>}</div>)}</div>{!rows.length && <div className="admin-empty"><Search size={22} /><strong>Sin secciones</strong><span>No se encontraron secciones con esos filtros.</span></div>}<Pager page={page} total={total} onPage={setPage} /></div>;
}

function AcademicClassroomsPage({ bundle, canManage, setModal, setConfirm, onSaved }: { bundle: AdminBundle; canManage: boolean; setModal: (modal: ModalState) => void; setConfirm: (confirm: ConfirmState | null) => void; onSaved: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [floor, setFloor] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [minCapacity, setMinCapacity] = useState('');
  const floorOptions = Array.from(new Set(bundle.classrooms.map((classroom) => classroom.floor).filter((item) => item !== undefined && item !== null))).sort((a, b) => a - b);
  const rows = bundle.classrooms.filter((classroom) => textIncludes([classroom.name, classroom.type, classroom.capacity, classroom.floor], query) && (!type || classroom.type === type) && (!floor || String(classroom.floor) === floor) && (status === 'all' || (status === 'active' ? classroom.isActive : !classroom.isActive)) && (!minCapacity || classroom.capacity >= Number(minCapacity)));
  const { page, total, setPage, visible } = usePagedRows(rows, 10);
  const toggle = (classroom: AdminClassroomRow) => confirmAction(setConfirm, { title: `${classroom.isActive ? 'Desactivar' : 'Activar'} sala`, message: classroom.isActive && (classroom.sections || classroom.schedules) ? `La sala ${classroom.name} está en uso. El backend bloqueará la acción si corresponde.` : `Confirma que quieres ${classroom.isActive ? 'desactivar' : 'activar'} ${classroom.name}.`, danger: classroom.isActive, action: async () => { await setAdminClassroomStatus(classroom.id, !classroom.isActive); onSaved(classroom.isActive ? 'Sala desactivada correctamente.' : 'Sala activada correctamente.'); } });
  const remove = (classroom: AdminClassroomRow) => confirmAction(setConfirm, { title: 'Eliminar sala', message: classroom.sections || classroom.schedules ? `La sala ${classroom.name} está en uso. Debes quitarla de secciones u horarios antes de eliminarla.` : `Confirma que quieres eliminar la sala ${classroom.name}.`, danger: true, action: async () => { if (!window.confirm(`¿Eliminar la sala ${classroom.name}? Esta acción no se puede deshacer.`)) return; await deleteAdminClassroom(classroom.id); onSaved('Sala eliminada correctamente.'); } });
  return <div className="course-admin-view"><header className="assignment-header"><div><h2>Salas</h2><p>Administra espacios físicos, piso, capacidad y tipo.</p></div>{canManage && <button className="primary-button" onClick={() => setModal({ type: 'classroom', mode: 'create' })}><Plus size={17} />Crear sala</button>}</header><div className="assignment-filters labelled-filters classroom-filters"><label className="admin-search"><span>Buscar sala</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, tipo o capacidad" /></div></label><label>Tipo<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos los tipos</option><option value="aula">Aula</option><option value="laboratorio">Laboratorio</option><option value="biblioteca">Biblioteca</option><option value="gimnasio">Gimnasio</option><option value="otro">Otro</option></select></label><label>Piso<select value={floor} onChange={(event) => setFloor(event.target.value)}><option value="">Todos los pisos</option>{floorOptions.map((item) => <option key={item} value={item}>Piso {item}</option>)}</select></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option><option value="active">Activas</option><option value="inactive">Inactivas</option></select></label><label>Capacidad mínima<input type="number" min="1" value={minCapacity} onChange={(event) => setMinCapacity(event.target.value)} placeholder="Ej: 30" /></label></div><div className="classroom-table"><div className="classroom-row head"><span>Sala</span><span>Tipo</span><span>Piso</span><span>Capacidad</span><span>Secciones asociadas</span><span>Estado</span><span>Acciones</span></div>{visible.map((classroom) => <div key={classroom.id} className="classroom-row"><span><strong>{classroom.name}</strong><small>{classroom.schedules} horarios</small></span><span>{classroom.type}</span><span>Piso {classroom.floor}</span><span>{classroom.capacity} cupos</span><span>{classroom.sections}</span><StatusBadge active={classroom.isActive} />{canManage && <div className="admin-row-actions"><button onClick={() => setModal({ type: 'classroom', mode: 'edit', row: classroom })}><Edit3 size={15} />Editar</button><button className={classroom.isActive ? 'danger-button' : 'secondary-button'} onClick={() => toggle(classroom)}>{classroom.isActive ? 'Desactivar' : 'Activar'}</button><button className="danger-button" onClick={() => remove(classroom)}><Trash2 size={15} />Eliminar</button></div>}</div>)}</div>{!rows.length && <div className="admin-empty"><Search size={22} /><strong>Sin salas</strong><span>No se encontraron salas con esos filtros.</span></div>}<Pager page={page} total={total} onPage={setPage} /></div>;
}

type AcademicPeriodRow = { id: string; name: string; year: number; startDate: string; endDate: string; isActive: boolean; assessments: number; createdAt: string };

function AcademicPeriodsPage({ canManage, setConfirm, onSaved, onApiError }: { canManage: boolean; setConfirm: (confirm: ConfirmState | null) => void; onSaved: (message: string) => void; onApiError: (error: unknown) => void }) {
  const [rows, setRows] = useState<AcademicPeriodRow[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AcademicPeriodRow | null>(null);
  const [creating, setCreating] = useState(false);
  const filtered = rows.filter((period) => textIncludes([period.name, period.year, period.startDate, period.endDate, period.isActive ? 'activo' : 'inactivo'], query));
  const { page, total, setPage, visible } = usePagedRows(filtered, 10);

  async function reload() {
    const { data } = await api.get<AcademicPeriodRow[]>('/periods');
    setRows(data);
  }

  useEffect(() => { reload().catch(onApiError); }, []);

  function remove(period: AcademicPeriodRow) {
    confirmAction(setConfirm, {
      title: 'Eliminar periodo',
      message: period.assessments ? `El periodo ${period.name} tiene ${period.assessments} evaluaciones asociadas y el backend bloqueara la eliminacion.` : `Confirma que quieres eliminar ${period.name}.`,
      danger: true,
      action: async () => {
        await api.delete(`/periods/${period.id}`);
        await reload();
        onSaved('Periodo eliminado correctamente.');
      }
    });
  }

  return (
    <div className="course-admin-view">
      <header className="assignment-header"><div><h2>Periodos academicos</h2><p>Define trimestres o periodos para filtrar evaluaciones y promedios.</p></div>{canManage && <button className="primary-button" onClick={() => setCreating(true)}><Plus size={17} />Crear periodo</button>}</header>
      <div className="assignment-filters labelled-filters"><label className="admin-search"><span>Buscar periodo</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, año o estado" /></div></label></div>
      <div className="section-list standalone"><div className="section-row head"><span>Periodo</span><span>Año</span><span>Inicio</span><span>Termino</span><span>Evaluaciones</span><span>Estado</span><span>Acciones</span></div>{visible.map((period) => <div key={period.id} className="section-row"><span><strong>{period.name}</strong><small>Periodo academico</small></span><span>{period.year}</span><span>{period.startDate}</span><span>{period.endDate}</span><span>{period.assessments}</span><StatusBadge active={period.isActive} />{canManage && <div className="admin-row-actions"><button onClick={() => setEditing(period)}><Edit3 size={15} />Editar</button><button className="danger-button" onClick={() => remove(period)}><Trash2 size={15} />Eliminar</button></div>}</div>)}</div>
      {!filtered.length && <div className="admin-empty"><Search size={22} /><strong>Sin periodos</strong><span>No se encontraron periodos academicos.</span></div>}
      <Pager page={page} total={total} onPage={setPage} />
      {(creating || editing) && <PeriodModal row={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null); }} onSaved={async (message) => { setCreating(false); setEditing(null); await reload(); onSaved(message); }} onApiError={onApiError} />}
    </div>
  );
}

function PeriodModal({ row, onClose, onSaved, onApiError }: { row?: AcademicPeriodRow; onClose: () => void; onSaved: (message: string) => void; onApiError: (error: unknown) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const fd = new FormData(event.currentTarget);
    const payload = {
      name: String(fd.get('name') ?? '').trim(),
      year: Number(fd.get('year') ?? new Date().getFullYear()),
      startDate: String(fd.get('startDate') ?? ''),
      endDate: String(fd.get('endDate') ?? ''),
      isActive: fd.get('isActive') === 'on'
    };
    if (!payload.name || !payload.startDate || !payload.endDate) return setError('Completa nombre, inicio y termino.');
    try {
      setSaving(true);
      row ? await api.patch(`/periods/${row.id}`, payload) : await api.post('/periods', payload);
      onSaved(row ? 'Periodo actualizado correctamente.' : 'Periodo creado correctamente.');
    } catch (err) {
      const apiError = normalizeApiError(err);
      if (apiError.kind === 'validation') setError(apiError.message);
      else onApiError(apiError);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <form className="admin-modal" onSubmit={submit} noValidate>
        <header><div><span>Gestion academica</span><h2>{row ? 'Editar periodo' : 'Crear periodo'}</h2></div><button type="button" onClick={onClose} disabled={saving}>x</button></header>
        <div className="admin-form-grid">
          <label>Nombre<input name="name" defaultValue={row?.name ?? ''} placeholder="1er Trimestre 2026" required /></label>
          <label>Año<input name="year" type="number" min="2000" max="2100" defaultValue={row?.year ?? 2026} required /></label>
          <label>Inicio<input name="startDate" type="date" defaultValue={row?.startDate ?? ''} required /></label>
          <label>Termino<input name="endDate" type="date" defaultValue={row?.endDate ?? ''} required /></label>
          <label className="checkbox-option"><input name="isActive" type="checkbox" defaultChecked={row?.isActive ?? true} /><span>Activo</span></label>
        </div>
        {error && <p className="admin-modal-error">{error}</p>}
        <footer><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar periodo'}</button></footer>
      </form>
    </div>
  );
}

function ScheduleModal({ row, bundle, onClose, onSaved, onApiError, setConfirm }: { row?: AdminScheduleRow; bundle: AdminBundle; onClose: () => void; onSaved: (message: string) => void; onApiError: (error: unknown) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const title = row ? 'Editar horario' : 'Crear horario';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const fd = new FormData(event.currentTarget);
    const payload: AdminSchedulePayload = {
      teacherId: String(fd.get('teacherId') ?? ''),
      sectionId: String(fd.get('sectionId') ?? ''),
      subjectId: String(fd.get('subjectId') ?? ''),
      classroomId: String(fd.get('classroomId') ?? ''),
      weekday: Number(fd.get('weekday') ?? -1),
      startsAt: String(fd.get('startsAt') ?? ''),
      endsAt: String(fd.get('endsAt') ?? '')
    };
    if (!payload.teacherId) return setError('Selecciona un profesor.');
    if (!payload.sectionId) return setError('Selecciona un curso/sección.');
    if (!payload.subjectId) return setError('Selecciona una asignatura.');
    if (!payload.classroomId) return setError('Selecciona una sala.');
    if (Number.isNaN(payload.weekday) || payload.weekday < 0) return setError('Selecciona un día.');
    if (!payload.startsAt || !payload.endsAt || payload.startsAt >= payload.endsAt) return setError('La hora de inicio debe ser menor que la hora de término.');
    try {
      setSaving(true);
      row ? await updateAdminSchedule(row.id, payload) : await createAdminSchedule(payload);
      onSaved(row ? 'Horario actualizado correctamente.' : 'Horario creado correctamente.');
    } catch (err) {
      const apiError = normalizeApiError(err);
      if (apiError.kind === 'validation') setError(apiError.message);
      else onApiError(apiError);
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (!dirty) {
      onClose();
      return;
    }
    confirmAction(setConfirm, {
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      danger: true,
      action: async () => onClose()
    });
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <form className="admin-modal schedule-modal" onSubmit={submit} noValidate onInput={() => { setDirty(true); setError(''); }}>
        <header><div><span>Gestión académica</span><h2>{title}</h2></div><button type="button" onClick={requestClose}>x</button></header>
        <div className="admin-form-grid">
          <SelectField label="Profesor" name="teacherId" options={bundle.summary.options.teachers} defaultValue={row?.teacherId} placeholder="Selecciona un profesor" required />
          <SelectField label="Curso/sección" name="sectionId" options={bundle.summary.options.sections} defaultValue={row?.sectionId} placeholder="Selecciona una sección" required />
          <SelectField label="Asignatura" name="subjectId" options={bundle.summary.options.subjects} defaultValue={row?.subjectId} placeholder="Selecciona una asignatura" required />
          <SelectField label="Sala" name="classroomId" options={bundle.summary.options.classrooms} defaultValue={row?.classroomId} placeholder="Selecciona una sala" required />
          <SelectField label="Día" name="weekday" options={weekdayOptions} defaultValue={row ? String(row.weekday) : undefined} placeholder="Selecciona un día" required />
          <label>Hora inicio<input name="startsAt" type="time" defaultValue={row?.startsAt ?? ''} required /></label>
          <label>Hora término<input name="endsAt" type="time" defaultValue={row?.endsAt ?? ''} required /></label>
        </div>
        {error && <p className="admin-modal-error">{error}</p>}
        <footer><button type="button" className="secondary-button" onClick={requestClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar horario'}</button></footer>
      </form>
    </div>
  );
}

function AcademicSchedulesPage({ bundle, canManage, onSaved, setConfirm, onApiError }: { bundle: AdminBundle; canManage: boolean; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void; onApiError: (error: unknown) => void }) {
  const [query, setQuery] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [weekday, setWeekday] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<AdminScheduleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = bundle.schedules.filter((schedule) =>
    textIncludes([schedule.weekdayName, schedule.startsAt, schedule.endsAt, schedule.course, schedule.section, schedule.subject, schedule.teacher, schedule.classroom, schedule.isActive ? 'activo' : 'inactivo'], query) &&
    (!sectionId || schedule.sectionId === sectionId) &&
    (!teacherId || schedule.teacherId === teacherId) &&
    (!subjectId || schedule.subjectId === subjectId) &&
    (!classroomId || schedule.classroomId === classroomId) &&
    (!weekday || String(schedule.weekday) === weekday) &&
    (status === 'all' || (status === 'active' ? schedule.isActive : !schedule.isActive))
  );
  const { page, total, setPage, visible } = usePagedRows(rows, 10);
  const hasFilters = Boolean(query || sectionId || teacherId || subjectId || classroomId || weekday || status !== 'all');
  const resetFilters = () => {
    setQuery('');
    setSectionId('');
    setTeacherId('');
    setSubjectId('');
    setClassroomId('');
    setWeekday('');
    setStatus('all');
  };
  const toggle = (schedule: AdminScheduleRow) => confirmAction(setConfirm, {
    title: `${schedule.isActive ? 'Desactivar' : 'Activar'} horario`,
    message: `Confirma que quieres ${schedule.isActive ? 'desactivar' : 'activar'} ${schedule.subject} de ${schedule.weekdayName} ${schedule.startsAt}-${schedule.endsAt}.`,
    danger: schedule.isActive,
    action: async () => { await setAdminScheduleStatus(schedule.id, !schedule.isActive); onSaved(schedule.isActive ? 'Horario desactivado correctamente.' : 'Horario activado correctamente.'); }
  });
  const remove = (schedule: AdminScheduleRow) => confirmAction(setConfirm, {
    title: 'Eliminar horario',
    message: `Confirma que quieres eliminar ${schedule.subject} de ${schedule.weekdayName} ${schedule.startsAt}-${schedule.endsAt}.`,
    danger: true,
    action: async () => {
      if (!window.confirm(`¿Eliminar el horario de ${schedule.subject} el ${schedule.weekdayName} ${schedule.startsAt}-${schedule.endsAt}? Esta acción no se puede deshacer.`)) return;
      await deleteAdminSchedule(schedule.id);
      onSaved('Horario eliminado correctamente.');
    }
  });

  return (
    <div className="course-admin-view">
      <header className="assignment-header"><div><h2>Horarios</h2><p>Administra clases por profesor, sección, asignatura, sala, día y bloque horario.</p></div>{canManage && <button className="primary-button" onClick={() => setCreating(true)}><Plus size={17} />Crear horario</button>}</header>
      <div className="assignment-filters labelled-filters schedule-filters">
        <label className="admin-search"><span>Búsqueda</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por curso, profesor, asignatura o sala" /></div></label>
        <label>Curso/sección<select value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="">Todos</option>{bundle.sections.map((section) => <option key={section.id} value={section.id}>{section.course} {section.name}</option>)}</select></label>
        <label>Profesor<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">Todos</option>{bundle.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
        <label>Asignatura<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Todas</option>{bundle.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
        <label>Sala<select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}><option value="">Todas</option>{bundle.classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></label>
        <label>Día<select value={weekday} onChange={(event) => setWeekday(event.target.value)}><option value="">Todos</option>{weekdayOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label>
        <button type="button" className="secondary-button" onClick={resetFilters} disabled={!hasFilters}>Limpiar filtros</button>
      </div>
      <div className="schedule-table">
        <div className="schedule-row head"><span>Día</span><span>Hora</span><span>Curso/sección</span><span>Asignatura</span><span>Profesor</span><span>Sala</span><span>Estado</span><span>Acciones</span></div>
        {visible.map((schedule) => <div key={schedule.id} className="schedule-row"><span><strong>{schedule.weekdayName}</strong></span><span>{schedule.startsAt} - {schedule.endsAt}</span><span>{schedule.course} {schedule.section}</span><span>{schedule.subject}</span><span>{schedule.teacher}</span><span>{schedule.classroom}</span><StatusBadge active={schedule.isActive} />{canManage && <div className="admin-row-actions"><button onClick={() => setEditing(schedule)}><Edit3 size={15} />Editar</button><button className={schedule.isActive ? 'danger-button' : 'secondary-button'} onClick={() => toggle(schedule)}>{schedule.isActive ? 'Desactivar' : 'Activar'}</button><button className="danger-button" onClick={() => remove(schedule)}><Trash2 size={15} />Eliminar</button></div>}</div>)}
      </div>
      {!rows.length && <div className="admin-empty"><Search size={22} /><strong>Sin horarios</strong><span>No se encontraron horarios con esos filtros.</span></div>}
      <Pager page={page} total={total} onPage={setPage} />
      {(creating || editing) && <ScheduleModal row={editing ?? undefined} bundle={bundle} onClose={() => { setCreating(false); setEditing(null); }} onSaved={(message) => { setCreating(false); setEditing(null); onSaved(message); }} onApiError={onApiError} setConfirm={setConfirm} />}
    </div>
  );
}

const auditActionLabels: Record<string, string> = {
  LOGIN_SUCCESS: 'Login exitoso',
  LOGIN_FAILED: 'Login fallido',
  LOGOUT: 'Logout',
  GRADE_BULK_UPDATED: 'Notas masivas',
  REQUEST_STATUS_CHANGED: 'Cambio solicitud',
  create: 'Creación',
  update: 'Edición',
  activate: 'Activación',
  deactivate: 'Desactivación',
  delete: 'Eliminación',
  assign: 'Asignación',
  unassign: 'Desasignación',
  password_change: 'Cambio de contraseña'
};

const auditEntityLabels: Record<string, string> = {
  User: 'Usuario',
  Grade: 'Calificación',
  Request: 'Solicitud',
  user: 'Usuario',
  student: 'Estudiante',
  teacher: 'Profesor',
  guardian: 'Apoderado',
  course: 'Curso',
  section: 'Sección',
  classroom: 'Sala',
  schedule: 'Horario',
  subject: 'Asignatura',
  student_section: 'Estudiante-sección',
  teacher_assignment: 'Asignación docente',
  guardian_students: 'Apoderado-estudiantes',
  subject_teacher: 'Responsable asignatura'
};

function auditActionTone(action: string) {
  if (action.startsWith('LOGIN')) return { background: '#dbeafe', color: '#1d4ed8' };
  if (action.startsWith('GRADE')) return { background: '#ccfbf1', color: '#0f766e' };
  if (action.startsWith('REQUEST')) return { background: '#fef3c7', color: '#92400e' };
  if (action.includes('DELETE') || action === 'delete') return { background: '#fee2e2', color: '#991b1b' };
  return { background: '#e7eef5', color: '#334155' };
}

function AuditActionBadge({ action }: { action: string }) {
  return <span className="badge" style={auditActionTone(action)}>{auditActionLabels[action] ?? action}</span>;
}

function AuditUserCell({ row }: { row: AuditLogRow }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {row.user?.avatar ? <img src={row.user.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto' }} /> : <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', background: '#e7eef5', color: '#334155', fontWeight: 900, flex: '0 0 auto' }}>{(row.user?.name ?? 'S').slice(0, 1)}</span>}
      <span style={{ display: 'grid', minWidth: 0 }}>
        <strong>{row.user?.name ?? 'Sistema'}</strong>
        <small>{row.user?.email ?? row.userId ?? 'Sin usuario'}</small>
      </span>
    </span>
  );
}

function AuditPage({ users, onApiError }: { users: AdminUserRow[]; onApiError: (error: unknown) => void }) {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AuditLogRow | null>(null);
  const hasFilters = Boolean(query || userId || action || entity || from || to);
  const columns: Column<AuditLogRow>[] = [
    { header: 'Timestamp', render: (row) => new Date(row.createdAt).toLocaleString('es-CL') },
    { header: 'Usuario', render: (row) => <AuditUserCell row={row} /> },
    { header: 'Acción', render: (row) => <AuditActionBadge action={row.action} /> },
    { header: 'Entidad', render: (row) => <span>{auditEntityLabels[row.entity] ?? row.entity}<small>{row.entityId}</small></span> },
    { header: 'Descripción', render: (row) => row.description },
    { header: 'IP', render: (row) => row.ipAddress ?? 'Sin registro' },
    { header: 'Detalle', render: (row) => <button className="secondary-button" onClick={() => setDetail(row)}><Eye size={15} />Ver</button> }
  ];

  useEffect(() => {
    setLoading(true);
    loadAdminAudit({ page, pageSize, search: query || undefined, userId: userId || undefined, action: action || undefined, entity: entity || undefined, from: from || undefined, to: to || undefined })
      .then((data) => {
        setRows(data.rows);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(onApiError)
      .finally(() => setLoading(false));
  }, [action, entity, from, onApiError, page, pageSize, query, to, userId]);

  function resetFilters() {
    setQuery('');
    setUserId('');
    setAction('');
    setEntity('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div className="audit-page">
      <header className="assignment-header">
        <div><h2>Auditoría</h2><p>Revisa acciones administrativas, responsables, fechas y contexto técnico.</p></div>
        <span className="audit-count">{total} eventos</span>
      </header>
      <div className="assignment-filters labelled-filters audit-filters">
        <label className="admin-search"><span>Búsqueda</span><div><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por email, acción, entidad o descripción" /></div></label>
        <label>Usuario<select value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1); }}><option value="">Todos</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></label>
        <label>Acción<select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option value="">Todas</option>{Object.entries(auditActionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Entidad<select value={entity} onChange={(event) => { setEntity(event.target.value); setPage(1); }}><option value="">Todas</option>{Object.entries(auditEntityLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Desde<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
        <label>Hasta<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
        <button type="button" className="secondary-button" onClick={resetFilters} disabled={!hasFilters}>Limpiar filtros</button>
      </div>
      <DataTable rows={rows} columns={columns} pageSize={Math.max(rows.length, 1)} emptyLabel={loading ? 'Cargando eventos' : 'Sin eventos'} />
      <Pager page={page} total={totalPages} onPage={setPage} />
      {detail && <AuditDetailModal row={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function AuditDetailModal({ row, onClose }: { row: AuditLogRow; onClose: () => void }) {
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <section className="audit-detail-modal">
        <header><div><span>Evento de auditoría</span><h2>{auditActionLabels[row.action] ?? row.action}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></header>
        <div className="audit-detail-grid">
          <span><small>Fecha</small><strong>{new Date(row.createdAt).toLocaleString('es-CL')}</strong></span>
          <span><small>Usuario</small><strong>{row.user?.name ?? 'Sistema'}</strong></span>
          <span><small>Entidad</small><strong>{auditEntityLabels[row.entity] ?? row.entity}</strong></span>
          <span><small>ID entidad</small><strong>{row.entityId}</strong></span>
          <span><small>IP</small><strong>{row.ipAddress ?? 'Sin registro'}</strong></span>
          <span><small>Navegador</small><strong>{row.userAgent ?? 'Sin registro'}</strong></span>
        </div>
        <p>{row.description}</p>
        <pre>{JSON.stringify(row.metadata ?? {}, null, 2)}</pre>
      </section>
    </div>
  );
}

export function AdminPage({ user }: { user: User }) {
  const [bundle, setBundle] = useState<AdminBundle | null>(null);
  const [tab, setTab] = useState<AdminTab>('users');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('');
  const [studentSectionFilter, setStudentSectionFilter] = useState('');
  const [studentGuardianFilter, setStudentGuardianFilter] = useState<'all' | 'with' | 'without'>('all');
  const [teacherSpecialtyFilter, setTeacherSpecialtyFilter] = useState('');
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState('');
  const [guardianLinksFilter, setGuardianLinksFilter] = useState<'all' | 'with' | 'without'>('all');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [resetTarget, setResetTarget] = useState<ResetPasswordTarget>(null);
  const [observationStudent, setObservationStudent] = useState<AdminStudentRow | null>(null);
  const [academicOpen, setAcademicOpen] = useState(true);
  const [assignmentsOpen, setAssignmentsOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<NormalizedApiError | null>(null);
  const canManage = ['admin', 'director'].includes(user.primaryRole);
  const canInspect = user.primaryRole === 'inspector';

  async function refresh() {
    setBundle(await loadAdminBundle());
  }

  useEffect(() => { refresh().catch(handleApiError); }, []);
  useEffect(() => {
    if (!notice && !error) return;
    const timer = window.setTimeout(() => { setNotice(null); setError(null); }, 4200);
    return () => window.clearTimeout(timer);
  }, [notice, error]);

  function done(message: string) {
    setModal(null);
    setNotice(message);
    setApiError(null);
    refresh().catch(handleApiError);
  }

  function handleApiError(error: unknown) {
    const normalized = normalizeApiError(error);
    if (normalized.kind === 'validation' && !shouldShowApiErrorModal(normalized)) {
      setError(normalized.message);
      return;
    }
    setApiError(normalized);
    if (normalized.kind === 'unauthorized') {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('school-session-expired')), 1200);
    }
  }

  const visibleTabs = useMemo(() => (canInspect && !canManage ? tabs.filter((item) => ['students'].includes(item.id)) : tabs), [canInspect, canManage]);
  const isAssignmentTab = tab.startsWith('assignments-');
  const isAcademicTab = tab.startsWith('academic-');
  const usesCustomView = isAssignmentTab || isAcademicTab || tab === 'audit';
  const filtered = useMemo(() => {
    if (!bundle) return [];
    const source = tab === 'users' ? bundle.users : tab === 'students' ? bundle.students : tab === 'teachers' ? bundle.teachers : tab === 'guardians' ? bundle.guardians : tab === 'subjects' ? bundle.subjects : [];
    return source.filter((row: unknown) => textIncludes(row, query)).filter((row: unknown) => {
      if (status === 'all' || !('isActive' in (row as object))) return true;
      return status === 'active' ? (row as { isActive?: boolean }).isActive : !(row as { isActive?: boolean }).isActive;
    }).filter((row: unknown) => {
      if (tab === 'users' && roleFilter) return (row as AdminUserRow).role === roleFilter;
      if (tab === 'students') {
        const student = row as AdminStudentRow;
        return (!studentCourseFilter || student.course === studentCourseFilter) &&
          (!studentSectionFilter || student.sectionId === studentSectionFilter) &&
          (studentGuardianFilter === 'all' || (studentGuardianFilter === 'with' ? student.guardians.length > 0 : student.guardians.length === 0));
      }
      if (tab === 'teachers') {
        const teacher = row as AdminTeacherRow;
        return (!teacherSpecialtyFilter || teacher.specialty === teacherSpecialtyFilter) &&
          (!teacherSubjectFilter || teacher.subjects.some((subject) => subject.id === teacherSubjectFilter));
      }
      if (tab === 'guardians') {
        const guardian = row as AdminGuardianRow;
        return guardianLinksFilter === 'all' || (guardianLinksFilter === 'with' ? guardian.students.length > 0 : guardian.students.length === 0);
      }
      return true;
    });
  }, [bundle, guardianLinksFilter, query, roleFilter, status, studentCourseFilter, studentGuardianFilter, studentSectionFilter, tab, teacherSpecialtyFilter, teacherSubjectFilter]);

  function exportUsersCsv() {
    const headers = ['Nombre', 'Apellido', 'Email', 'Rol', 'Estado', 'Última actividad'];
    const rows = (filtered as AdminUserRow[]).map((user) => {
      const { name, lastName } = splitName(user.name);
      const roleLabel = roleLabels[user.role] ?? user.role;
      const lastActivity = 'lastActivity' in user && typeof user.lastActivity === 'string'
        ? user.lastActivity
        : 'updatedAt' in user && typeof user.updatedAt === 'string'
          ? user.updatedAt
          : '-';
      return [name, lastName, user.email ?? '', roleLabel, user.isActive ? 'Activo' : 'Inactivo', String(lastActivity)];
    });
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!['admin', 'director', 'inspector'].includes(user.primaryRole)) {
    return <div className="page-stack"><PageHeader eyebrow="Administración" title="Acceso restringido" description="Tu rol no tiene acceso al CRUD administrativo." /></div>;
  }

  if (!bundle) return <div className="page-stack"><PageHeader eyebrow="Administración" title="Cargando panel" description="Preparando usuarios, cursos, secciones y asignaciones." /></div>;

  const options = bundle.summary.options;
  const summaryCards = [
    ['Usuarios', bundle.summary.users, Users],
    ['Activos', bundle.summary.activeUsers, CheckCircle2],
    ['Estudiantes', bundle.summary.students, GraduationCap],
    ['Profesores', bundle.summary.teachers, BookOpen],
    ['Cursos', bundle.summary.courses, Building2],
    ['Asignaturas', bundle.summary.subjects, ClipboardList]
  ] as const;

  const statusAction = (entity: string, name: string, active: boolean, action: () => Promise<unknown>) => setConfirm({
    title: `${active ? 'Desactivar' : 'Activar'} ${entity}`,
    message: `Confirma que quieres ${active ? 'desactivar' : 'activar'} a ${name}.`,
    danger: active,
    action: async () => {
      if (active && !window.confirm(`¿Desactivar a ${name}? El usuario no podrá iniciar sesión.`)) return;
      await action();
      done('Estado actualizado correctamente.');
    }
  });

  function editUserRow(row: AdminUserRow) {
    if (!bundle) return;
    if (row.role === 'student' && row.studentId) {
      const student = bundle.students.find((item) => item.id === row.studentId);
      if (student) return setModal({ type: 'student', mode: 'edit', row: student });
    }
    if (row.role === 'teacher' && row.teacherId) {
      const teacher = bundle.teachers.find((item) => item.id === row.teacherId);
      if (teacher) return setModal({ type: 'teacher', mode: 'edit', row: teacher });
    }
    if (row.role === 'guardian' && row.guardianId) {
      const guardian = bundle.guardians.find((item) => item.id === row.guardianId);
      if (guardian) return setModal({ type: 'guardian', mode: 'edit', row: guardian });
    }
    return setModal({ type: 'user', mode: 'edit', row });
  }

  function handleToggleUser(row: AdminUserRow) {
    statusAction('usuario', row.name, row.isActive, () => setAdminUserStatus(row.id, !row.isActive));
  }

  function handleResetPassword(row: AdminUserRow) {
    setResetTarget({ id: row.id, name: row.name });
  }

  function handleToggleStudent(row: AdminStudentRow) {
    statusAction('estudiante', row.name, row.isActive, () => setAdminStudentStatus(row.id, !row.isActive));
  }

  const specialtyOptions = Array.from(new Set(bundle.teachers.map((teacher) => teacher.specialty).filter(Boolean))).sort();
  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setRoleFilter('');
    setStudentCourseFilter('');
    setStudentSectionFilter('');
    setStudentGuardianFilter('all');
    setTeacherSpecialtyFilter('');
    setTeacherSubjectFilter('');
    setGuardianLinksFilter('all');
  };

  return (
    <div className="page-stack admin-page">
      <PageHeader eyebrow="Administración" title="Panel de estructura escolar" description="Gestiona usuarios, estudiantes, docentes, apoderados, cursos, secciones, asignaturas y relaciones académicas." />
      {notice && <div className="admin-notice success" onClick={() => setNotice(null)}><span>{notice}</span><button type="button" aria-label="Cerrar"><X size={16} /></button></div>}
      {error && <div className="admin-notice error" onClick={() => setError(null)}><span>{error}</span><button type="button" aria-label="Cerrar"><X size={16} /></button></div>}

      <section className="admin-summary-grid">
        {summaryCards.map(([label, value, Icon]) => <article key={label} className="admin-summary-card"><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>)}
      </section>

      <section className="admin-workspace">
        <aside className="admin-tabs">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><Icon size={18} />{item.label}</button>;
          })}
          {canManage && <div className={`admin-tab-group ${academicOpen ? 'open' : ''}`}>
            <button type="button" className="admin-tab-parent" onClick={() => setAcademicOpen((current) => !current)}>
              <span><Building2 size={18} />Gestión académica</span>
              {academicOpen ? <ChevronDown className="submenu-arrow" size={16} /> : <ChevronRight className="submenu-arrow" size={16} />}
            </button>
            <div className="admin-submenu">
              {academicTabs.map((item) => {
                const Icon = item.icon;
                return <button key={item.id} className={tab === item.id ? 'active nested' : 'nested'} onClick={() => setTab(item.id)}><Icon size={16} />{item.label}</button>;
              })}
            </div>
          </div>}
          {canManage && <div className={`admin-tab-group ${assignmentsOpen ? 'open' : ''}`}>
            <button type="button" className="admin-tab-parent" onClick={() => setAssignmentsOpen((current) => !current)}>
              <span><Link2 size={18} />Asignaciones</span>
              {assignmentsOpen ? <ChevronDown className="submenu-arrow" size={16} /> : <ChevronRight className="submenu-arrow" size={16} />}
            </button>
            <div className="admin-submenu">
              {assignmentTabs.map((item) => {
                const Icon = item.icon;
                return <button key={item.id} className={tab === item.id ? 'active nested' : 'nested'} onClick={() => setTab(item.id)}><Icon size={16} />{item.label}</button>;
              })}
            </div>
          </div>}
        </aside>

        <main className="admin-panel">
          {!usesCustomView && <div className="admin-toolbar admin-filterbar">
            <label className="admin-search"><span>Búsqueda</span><div><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'users' ? 'Buscar por nombre, correo o rol' : tab === 'students' ? 'Buscar por nombre, correo o RUT' : tab === 'teachers' ? 'Buscar por nombre, correo o código' : tab === 'guardians' ? 'Buscar por nombre, correo, RUT o teléfono' : 'Buscar por nombre o código'} /></div></label>
            {tab === 'users' && <label>Rol<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">Todos los roles</option>{bundle.summary.options.roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select></label>}
            {tab === 'students' && <><label>Curso<select value={studentCourseFilter} onChange={(event) => { setStudentCourseFilter(event.target.value); setStudentSectionFilter(''); }}><option value="">Todos los cursos</option>{bundle.courses.map((course) => <option key={course.id} value={course.name}>{course.name}</option>)}</select></label><label>Sección<select value={studentSectionFilter} onChange={(event) => setStudentSectionFilter(event.target.value)}><option value="">Todas las secciones</option>{bundle.sections.filter((section) => !studentCourseFilter || section.course === studentCourseFilter).map((section) => <option key={section.id} value={section.id}>{section.course} {section.name}</option>)}</select></label><label>Apoderado<select value={studentGuardianFilter} onChange={(event) => setStudentGuardianFilter(event.target.value as typeof studentGuardianFilter)}><option value="all">Todos</option><option value="with">Con apoderado</option><option value="without">Sin apoderado</option></select></label></>}
            {tab === 'teachers' && <><label>Área<select value={teacherSpecialtyFilter} onChange={(event) => setTeacherSpecialtyFilter(event.target.value)}><option value="">Todas las áreas</option>{specialtyOptions.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}</select></label><label>Asignatura<select value={teacherSubjectFilter} onChange={(event) => setTeacherSubjectFilter(event.target.value)}><option value="">Todas las asignaturas</option>{bundle.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label></>}
            {tab === 'guardians' && <label>Vínculos<select value={guardianLinksFilter} onChange={(event) => setGuardianLinksFilter(event.target.value as typeof guardianLinksFilter)}><option value="all">Todos</option><option value="with">Con estudiantes</option><option value="without">Sin estudiantes</option></select></label>}
            {['users', 'students', 'teachers', 'guardians'].includes(tab) && <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label>}
            {tab === 'users' && <button type="button" className="secondary-button" onClick={exportUsersCsv}>Exportar CSV</button>}
            <button type="button" className="secondary-button" onClick={resetFilters}>Limpiar filtros</button>
            {canManage && <button className="primary-button" onClick={() => setModal({ type: tab === 'students' ? 'student' : tab === 'teachers' ? 'teacher' : tab === 'guardians' ? 'guardian' : tab === 'subjects' ? 'subject' : 'user', mode: 'create' })}><Plus size={18} />Crear</button>}
          </div>}

          {tab === 'users' && (
            <AdminUsersSection
              users={filtered as AdminUserRow[]}
              roleLabels={roleLabels}
              canManage={canManage}
              onEdit={editUserRow}
              onToggleStatus={handleToggleUser}
              onResetPassword={handleResetPassword}
            />
          )}

          {tab === 'students' && (
            <AdminStudentsSection
              students={filtered as AdminStudentRow[]}
              canManage={canManage}
              onOpenObservations={(row) => setObservationStudent(row)}
              onEdit={(row) => setModal({ type: 'student', mode: 'edit', row })}
              onToggleStatus={handleToggleStudent}
            />
          )}

          {tab === 'teachers' && <AdminTable headers={['Profesor', 'Área', 'Asignaturas', 'Estado', 'Acciones']} rows={filtered as AdminTeacherRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.specialty}</span><span>{row.subjects.map((item) => item.name).join(', ') || 'Sin asignaturas'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'teacher', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('profesor', row.name, row.isActive, () => setAdminTeacherStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'guardians' && <AdminTable headers={['Apoderado', 'RUT', 'Teléfono', 'Estudiantes', 'Estado', 'Acciones']} rows={filtered as AdminGuardianRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.rut || 'Sin RUT'}</span><span>{row.phone || 'Sin teléfono'}</span><span>{row.students.map((item) => item.name).join(', ') || 'Sin estudiantes'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'guardian', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('apoderado', row.name, row.isActive, () => setAdminGuardianStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'academic-courses' && <AcademicCoursesPage bundle={bundle} canManage={canManage} setModal={setModal} setConfirm={setConfirm} onSaved={done} />}
          {tab === 'academic-sections' && <AcademicSectionsPage bundle={bundle} canManage={canManage} setModal={setModal} setConfirm={setConfirm} onSaved={done} />}
          {tab === 'academic-classrooms' && <AcademicClassroomsPage bundle={bundle} canManage={canManage} setModal={setModal} setConfirm={setConfirm} onSaved={done} />}
          {tab === 'academic-schedules' && <AcademicSchedulesPage bundle={bundle} canManage={canManage} onSaved={done} setConfirm={setConfirm} onApiError={handleApiError} />}
          {tab === 'academic-periods' && <AcademicPeriodsPage canManage={canManage} setConfirm={setConfirm} onSaved={done} onApiError={handleApiError} />}

          {tab === 'subjects' && <AdminTable headers={['Asignatura', 'Profesores', 'Secciones', 'Acciones']} rows={filtered as AdminSubjectRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.code}</small></div><span>{row.teachers.map((item) => item.name).join(', ') || 'Sin profesor'}</span><span>{row.sections.map((item) => `${item.course} ${item.name}`).join(', ') || 'Sin sección'}</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'subject', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></>} />}
          {tab === 'audit' && <AuditPage users={bundle.users} onApiError={handleApiError} />}

          {tab === 'assignments-teachers' && <AssignmentsTeachersPage bundle={bundle} onSaved={done} setConfirm={setConfirm} />}
          {tab === 'assignments-students' && <AssignmentsStudentsPage bundle={bundle} onSaved={done} setConfirm={setConfirm} />}
          {tab === 'assignments-guardians' && <AssignmentsGuardiansPage bundle={bundle} onSaved={done} setConfirm={setConfirm} />}
          {tab === 'assignments-subjects' && <AssignmentsSubjectsPage bundle={bundle} onSaved={done} setConfirm={setConfirm} onApiError={handleApiError} />}
        </main>
      </section>

      {modal && <EntityModal modal={modal} options={options} students={bundle.students} onClose={() => setModal(null)} onSaved={done} setConfirm={setConfirm} onApiError={handleApiError} onResetPassword={setResetTarget} />}
      {resetTarget && <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} onSaved={(message) => { setResetTarget(null); done(message); }} setConfirm={setConfirm} onApiError={handleApiError} />}
      {observationStudent && <StudentObservationsModal student={observationStudent} onClose={() => setObservationStudent(null)} onApiError={handleApiError} />}
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} onApiError={handleApiError} />}
      {apiError && <ApiErrorModal error={apiError} onClose={() => setApiError(null)} />}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .admin-page .page-header,
          .admin-page .page-header > *,
          .admin-page .page-header h1,
          .admin-page .page-header p {
            max-width: 100%;
            overflow-wrap: break-word;
            word-break: break-word;
          }

          .admin-page .admin-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-page .admin-summary-card {
            min-width: 0;
          }

          .admin-page .admin-filterbar {
            display: flex;
            flex-wrap: wrap;
            align-items: stretch;
          }

          .admin-page .admin-filterbar > label {
            flex: 1 1 100%;
            min-width: 0;
          }

          .admin-page .admin-filterbar > button {
            flex: 1 1 48%;
          }

          .admin-page .admin-tabs {
            position: relative;
            z-index: 1;
          }
        }
      `}</style>
    </div>
  );
}

function assignmentMatch(values: unknown[], query: string) {
  const text = values.join(' ').toLowerCase();
  return !query.trim() || text.includes(query.trim().toLowerCase());
}

function AssignmentsTeachersPage({ bundle, onSaved, setConfirm }: { bundle: AdminBundle; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const rows = bundle.teachers.flatMap((teacher) => teacher.subjects.flatMap((subject) =>
    (teacher.sections.length ? teacher.sections : [{ id: '', name: 'Sin sección', course: 'Sin curso' }]).map((section) => ({ id: `${teacher.id}-${subject.id}-${section.id || 'none'}`, teacher, subject, section }))
  )).filter((row) =>
    assignmentMatch([row.teacher.name, row.teacher.email, row.teacher.employeeCode, row.subject.name, row.section.course, row.section.name], query) &&
    (!course || row.section.course === course) &&
    (!sectionId || row.section.id === sectionId) &&
    (!subjectId || row.subject.id === subjectId)
  );
  const total = Math.max(1, Math.ceil(rows.length / 10));
  const visible = rows.slice((page - 1) * 10, page * 10);

  async function remove(row: typeof rows[number]) {
    confirmAction(setConfirm, {
      title: 'Eliminar asignación',
      message: `Confirma que quieres quitar a ${row.teacher.name} de ${row.subject.name}${row.section.name !== 'Sin sección' ? ` en ${row.section.course} ${row.section.name}` : ''}.`,
      danger: true,
      action: async () => {
        await removeAdminTeacherAssignment({ teacherId: row.teacher.id, subjectId: row.subject.id, sectionId: row.section.id || undefined });
        onSaved('Asignación docente eliminada.');
      }
    });
  }

  return (
    <div className="assignment-page">
      <header className="assignment-header"><div><h2>Asignaciones de profesores</h2><p>Asigna docentes a asignaturas y secciones.</p></div><button className="primary-button" onClick={() => setOpen(true)}><Plus size={17} />Asignar profesor</button></header>
      <div className="assignment-filters"><label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por profesor, correo, RUT o asignatura" /></label><select value={course} onChange={(event) => setCourse(event.target.value)}><option value="">Todos los cursos</option>{bundle.courses.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><select value={sectionId} onChange={(event) => setSectionId(event.target.value)}><option value="">Todas las secciones</option>{bundle.sections.filter((item) => !course || item.course === course).map((item) => <option key={item.id} value={item.id}>{item.course} {item.name}</option>)}</select><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Todas las asignaturas</option>{bundle.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="assignment-table"><div className="assignment-row head"><span>Profesor</span><span>Asignatura</span><span>Curso</span><span>Sección</span><span>Acciones</span></div>{visible.map((row) => <div key={row.id} className="assignment-row"><span><strong>{row.teacher.name}</strong><small>{row.teacher.email}</small></span><span>{row.subject.name}</span><span>{row.section.course}</span><span>{row.section.name}</span><span><button className="secondary-button" onClick={() => setOpen(true)}><Edit3 size={15} />Editar</button><button className="danger-button" onClick={() => remove(row)}>Eliminar</button></span></div>)}</div>
      {!rows.length && <div className="admin-empty"><Search size={20} /><strong>Sin asignaciones</strong><span>No se encontraron profesores con esos filtros.</span></div>}
      <Pager page={page} total={total} onPage={setPage} />
      {open && <TeacherAssignmentModal bundle={bundle} setConfirm={setConfirm} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onSaved('Asignación docente guardada.'); }} />}
    </div>
  );
}

function TeacherAssignmentModal({ bundle, setConfirm, onClose, onSaved }: { bundle: AdminBundle; setConfirm: (confirm: ConfirmState | null) => void; onClose: () => void; onSaved: () => void }) {
  const [dirty, setDirty] = useState(false);
  function requestClose() {
    if (!dirty) return onClose();
    confirmAction(setConfirm, {
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      danger: true,
      action: async () => onClose()
    });
  }
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const teacherId = String(fd.get('teacherId'));
    const subjectIds = getValues(form, 'subjectIds');
    const sectionIds = getValues(form, 'sectionIds');
    if (!teacherId || !subjectIds.length || !sectionIds.length) return;
    confirmAction(setConfirm, {
      title: 'Guardar asignación docente',
      message: `Confirma ${subjectIds.length} asignatura(s) y ${sectionIds.length} sección(es) para el profesor seleccionado.`,
      action: async () => {
        await assignAdminTeacher(teacherId, { subjectIds, sectionIds });
        onSaved();
      }
    });
  }
  return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><form className="admin-modal assignment-modal" onSubmit={submit} noValidate onInput={() => setDirty(true)} onChange={() => setDirty(true)}><header><div><span>Asignaciones</span><h2>Asignar profesor</h2></div><button type="button" onClick={requestClose}>x</button></header><div className="admin-form-grid"><SelectField label="Profesor" name="teacherId" options={bundle.summary.options.teachers} required placeholder="Selecciona un profesor" /><MultiSelectField label="Asignaturas" name="subjectIds" options={bundle.summary.options.subjects} help="Selecciona una o más asignaturas." /><MultiSelectField label="Secciones" name="sectionIds" options={bundle.summary.options.sections} help="Selecciona una o más secciones." /></div><footer><button type="button" className="secondary-button" onClick={requestClose}>Cancelar</button><button className="primary-button">Guardar asignación</button></footer></form></div>;
}

function AssignmentsStudentsPage({ bundle, onSaved, setConfirm }: { bundle: AdminBundle; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [section, setSection] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const filtered = bundle.students.filter((student) => assignmentMatch([student.name, student.email, student.rut], query) && (!course || student.course === course) && (!section || student.sectionId === section));
  const total = Math.max(1, Math.ceil(filtered.length / 10));
  const visible = filtered.slice((page - 1) * 10, page * 10);
  const selectedAvailable = selected.filter((id) => bundle.students.find((student) => student.id === id && !student.sectionId));
  const assignedLabel = (student: AdminStudentRow) => `${student.course} ${student.section}`.trim();
  function explainAssigned(student: AdminStudentRow) {
    setConfirm({
      title: 'Estudiante ya asignado',
      message: `${student.name} ya está asignado a ${assignedLabel(student)}. Quita la sección actual antes de asignarlo a otra.`,
      action: async () => undefined
    });
  }
  async function assign() {
    if (!targetSection || !selectedAvailable.length) return;
    const section = bundle.sections.find((item) => item.id === targetSection);
    confirmAction(setConfirm, {
      title: 'Asignar estudiantes',
      message: `Confirma que quieres asignar ${selectedAvailable.length} estudiante(s) a ${section ? `${section.course} ${section.name}` : 'la sección seleccionada'}.`,
      action: async () => {
        await Promise.all(selectedAvailable.map((id) => assignAdminStudentSection(id, targetSection)));
        setSelected([]);
        onSaved('Estudiantes asignados a sección.');
      }
    });
  }
  async function clear() {
    if (!selected.length) return;
    confirmAction(setConfirm, {
      title: 'Quitar sección',
      message: `Confirma que quieres quitar la sección a ${selected.length} estudiante(s).`,
      danger: true,
      action: async () => {
        await Promise.all(selected.map(clearAdminStudentSection));
        setSelected([]);
        onSaved('Sección quitada correctamente.');
      }
    });
  }
  return <div className="assignment-page"><header className="assignment-header"><div><h2>Asignación de estudiantes</h2><p>Selecciona solo estudiantes sin sección. Los estudiantes ya asignados quedan bloqueados para evitar conflictos.</p></div></header><div className="assignment-filters"><select value={course} onChange={(e) => { setCourse(e.target.value); setSection(''); }}><option value="">Todos los cursos</option>{bundle.courses.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><select value={section} onChange={(e) => setSection(e.target.value)}><option value="">Todas las secciones</option>{bundle.sections.filter((item) => !course || item.course === course).map((item) => <option key={item.id} value={item.id}>{item.course} {item.name}</option>)}</select><label className="admin-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o RUT" /></label></div><div className="assignment-bulkbar"><select value={targetSection} onChange={(e) => setTargetSection(e.target.value)}><option value="">Selecciona sección destino</option>{bundle.sections.map((item) => <option key={item.id} value={item.id}>{item.course} {item.name}</option>)}</select><button className="primary-button" disabled={!selectedAvailable.length || !targetSection} onClick={assign}>Asignar a sección</button><button className="secondary-button" disabled={!selected.length} onClick={clear}>Quitar de sección</button><span>{selectedAvailable.length} disponibles seleccionados</span></div><div className="student-picker-list assignment-student-list">{visible.map((student) => {
    const assigned = Boolean(student.sectionId);
    return <label key={student.id} className={`student-picker-row ${assigned ? 'disabled assigned' : ''}`} onClick={(event) => { if (assigned) { event.preventDefault(); explainAssigned(student); } }}><input type="checkbox" disabled={assigned} checked={selected.includes(student.id)} onChange={() => setSelected((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} /><span><strong>{student.name}</strong><small>{student.email}</small><small>RUT / identificador: {student.rut}</small><small>{assigned ? `Asignado a ${assignedLabel(student)}` : 'Sin sección asignada'}</small></span></label>;
  })}</div>{!filtered.length && <div className="admin-empty"><Search size={20} /><strong>Sin estudiantes</strong><span>No se encontraron estudiantes con esos filtros.</span></div>}<Pager page={page} total={total} onPage={setPage} /></div>;
}

function AssignmentsGuardiansPage({ bundle, onSaved, setConfirm }: { bundle: AdminBundle; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [query, setQuery] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const guardians = bundle.guardians.filter((guardian) => assignmentMatch([guardian.name, guardian.email, guardian.rut, guardian.phone, guardian.isActive ? 'activo' : 'inactivo', guardian.students.length], query));
  const { page, total, setPage, visible } = usePagedRows(guardians, 10);
  const guardian = bundle.guardians.find((item) => item.id === guardianId);
  async function save(ids: string[]) {
    if (!guardian) return;
    confirmAction(setConfirm, {
      title: 'Vincular estudiantes',
      message: `Confirma que quieres dejar ${ids.length} estudiante(s) vinculado(s) a ${guardian.name}.`,
      action: async () => {
        await linkAdminGuardianStudents(guardian.id, { studentIds: ids, relationship: 'Apoderado' });
        setPickerOpen(false);
        onSaved('Estudiante vinculado correctamente.');
      }
    });
  }
  async function unlink(studentId: string) {
    if (!guardian) return;
    const student = guardian.students.find((item) => item.id === studentId);
    confirmAction(setConfirm, {
      title: 'Desvincular estudiante',
      message: `Confirma que quieres desvincular ${student?.name ?? 'este estudiante'} de ${guardian.name}.`,
      danger: true,
      action: async () => {
        await unlinkAdminGuardianStudent({ guardianId: guardian.id, studentId });
        onSaved('Estudiante desvinculado.');
      }
    });
  }
  return (
    <div className="assignment-page">
      <header className="assignment-header">
        <div><h2>Apoderado → estudiantes</h2><p>Busca y selecciona un apoderado desde la lista para administrar sus vínculos.</p></div>
        <button className="primary-button" disabled={!guardian} onClick={() => setPickerOpen(true)}><Plus size={17} />Agregar estudiantes</button>
      </header>
      <div className="assignment-filters guardian-assignment-filters">
        <label className="admin-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar apoderado por nombre, correo, RUT o teléfono" /></label>
      </div>
      <div className="guardian-assignment-layout">
        <section className="guardian-list-panel">
          <div className="guardian-list-head"><strong>Apoderados</strong><span>{guardians.length} disponibles</span></div>
          <div className="guardian-card-list">
            {visible.map((item) => (
              <button type="button" key={item.id} className={`guardian-option-card ${guardianId === item.id ? 'selected' : ''}`} onClick={() => { setGuardianId(item.id); setDetailOpen(true); }}>
                <span><strong>{item.name}</strong><small>{item.email}</small></span>
                <span><small>RUT / identificador</small><strong>{item.rut || 'Sin registro'}</strong></span>
                <span><small>Teléfono</small><strong>{item.phone || 'Sin teléfono'}</strong></span>
                <span><small>Estudiantes</small><strong>{item.students.length}</strong></span>
                <StatusBadge active={item.isActive} />
              </button>
            ))}
          </div>
          {!guardians.length && <div className="admin-empty compact"><Search size={18} /><strong>Sin apoderados</strong><span>No se encontraron apoderados con esos filtros.</span></div>}
        </section>
        <Pager page={page} total={total} onPage={setPage} />
      </div>
      {!guardian && <div className="admin-empty"><Users size={20} /><strong>Selecciona un apoderado</strong><span>Selecciona un apoderado para vincular estudiantes.</span></div>}
      {detailOpen && guardian && <GuardianDetailModal guardian={guardian} students={bundle.students} onClose={() => setDetailOpen(false)} onAdd={() => setPickerOpen(true)} onUnlink={unlink} />}
      {pickerOpen && guardian && <StudentPickerModal students={bundle.students} selectedIds={guardian.students.map((item) => item.id)} onCancel={() => setPickerOpen(false)} onConfirm={save} setConfirm={setConfirm} />}
    </div>
  );
}

function GuardianDetailModal({ guardian, students, onClose, onAdd, onUnlink }: { guardian: AdminGuardianRow; students: AdminStudentRow[]; onClose: () => void; onAdd: () => void; onUnlink: (studentId: string) => void }) {
  const linked = guardian.students.map((item) => ({ ...item, student: students.find((student) => student.id === item.id) }));
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <section className="guardian-detail-modal">
        <header>
          <div>
            <span>Apoderado</span>
            <h2>{guardian.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="guardian-detail-summary">
          <span><small>Correo</small><strong>{guardian.email}</strong></span>
          <span><small>RUT / identificador</small><strong>{guardian.rut || 'Sin registro'}</strong></span>
          <span><small>Teléfono</small><strong>{guardian.phone || 'Sin teléfono'}</strong></span>
          <StatusBadge active={guardian.isActive} />
        </div>
        <div className="guardian-detail-actions">
          <strong>{guardian.students.length} estudiantes vinculados</strong>
          <button className="primary-button" onClick={onAdd}><Plus size={17} />Agregar estudiantes</button>
        </div>
        <div className="guardian-linked-list">
          {linked.map(({ student, relationship, id, name }) => (
            <article key={id} className="guardian-linked-row">
              <span><strong>{student?.name ?? name}</strong><small>{student?.email ?? 'Sin correo'}</small></span>
              <span><small>RUT</small><strong>{student?.rut || 'Sin registro'}</strong></span>
              <span><small>Curso</small><strong>{student?.course || 'Sin curso'}</strong></span>
              <span><small>Sección</small><strong>{student?.section || 'Sin sección'}</strong></span>
              <span><small>Relación</small><strong>{relationship}</strong></span>
              <button className="danger-button" onClick={() => onUnlink(id)}>Desvincular</button>
            </article>
          ))}
          {!linked.length && <div className="admin-empty compact"><Users size={20} /><strong>Sin estudiantes vinculados</strong><span>Agrega estudiantes para este apoderado.</span></div>}
        </div>
      </section>
    </div>
  );
}

type SubjectResponsibleRow = {
  id: string;
  subject: AdminSubjectRow;
  section: AdminSubjectRow['sections'][number];
  teacher: AdminSubjectRow['teachers'][number] | undefined;
};

function SubjectResponsibleModal({ row, teachers, setConfirm, onClose, onSaved, onApiError }: { row: SubjectResponsibleRow; teachers: AdminTeacherRow[]; setConfirm: (confirm: ConfirmState | null) => void; onClose: () => void; onSaved: () => void; onApiError: (error: unknown) => void }) {
  const [teacherId, setTeacherId] = useState(row.teacher?.id ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const currentTeacherId = row.teacher?.id ?? '';
  const hasChanged = teacherId !== currentTeacherId;

  function requestClose() {
    if (!hasChanged) {
      onClose();
      return;
    }
    confirmAction(setConfirm, {
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      danger: true,
      action: async () => onClose()
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!row.subject.id) {
      setError('La asignatura es requerida.');
      return;
    }
    if (!row.section.id) {
      setError('El curso / sección es requerido.');
      return;
    }
    if (!teacherId) {
      setError('Selecciona un profesor responsable.');
      return;
    }
    if (!hasChanged) {
      setError('No hay cambios para guardar.');
      return;
    }
    try {
      setSaving(true);
      await assignAdminSubjectTeacher(row.subject.id, { teacherId, sectionId: row.section.id });
      onSaved();
    } catch (err) {
      const apiError = normalizeApiError(err);
      if (apiError.kind === 'validation') setError(apiError.message);
      else onApiError(apiError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <form className="admin-modal responsible-modal" onSubmit={submit} noValidate>
        <header>
          <div><span>Asignaciones</span><h2>Editar responsable</h2></div>
          <button type="button" onClick={requestClose}>x</button>
        </header>
        <div className="responsible-modal-body">
          <div className="responsible-summary">
            <span><small>Asignatura</small><strong>{row.subject.name}</strong></span>
            <span><small>Curso / sección</small><strong>{row.section.course} {row.section.name}</strong></span>
            <span><small>Profesor responsable actual</small><strong>{row.teacher?.name ?? 'Sin responsable'}</strong></span>
          </div>
          <label>
            Nuevo profesor responsable
            <select value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setError(''); }} required className={error && !teacherId ? 'input-error' : undefined}>
              <option value="">Selecciona un profesor</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.email ? ` · ${teacher.email}` : ''}</option>)}
            </select>
          </label>
          {!hasChanged && <small className="field-help">Selecciona un profesor distinto para guardar cambios.</small>}
          {error && <p className="admin-modal-error">{error}</p>}
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={requestClose}>Cancelar</button>
          <button className="primary-button" disabled={saving || !teacherId || !hasChanged}>{saving ? 'Guardando...' : 'Guardar responsable'}</button>
        </footer>
      </form>
    </div>
  );
}

function AssignmentsSubjectsPage({ bundle, onSaved, setConfirm, onApiError }: { bundle: AdminBundle; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void; onApiError: (error: unknown) => void }) {
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [editingRow, setEditingRow] = useState<SubjectResponsibleRow | null>(null);
  const rows = bundle.subjects.flatMap((subject) => subject.sections.map((section) => ({ id: `${subject.id}-${section.id}`, subject, section, teacher: subject.teachers[0] }))).filter((row) => assignmentMatch([row.subject.name, row.section.course, row.section.name, row.teacher?.name ?? ''], query) && (!course || row.section.course === course) && (!subjectFilter || row.subject.id === subjectFilter) && (!teacherFilter || row.teacher?.id === teacherFilter));
  const { page, total, setPage, visible } = usePagedRows(rows, 10);
  const hasFilters = Boolean(course || subjectFilter || teacherFilter || query);
  const resetFilters = () => {
    setCourse('');
    setSubjectFilter('');
    setTeacherFilter('');
    setQuery('');
    setPage(1);
  };

  return <div className="assignment-page"><header className="assignment-header"><div><h2>Responsables de asignatura</h2><p>Define el profesor responsable por asignatura y sección.</p></div></header><div className="assignment-filters responsible-filters"><select value={course} onChange={(e) => { setCourse(e.target.value); setPage(1); }}><option value="">Todos los cursos</option>{bundle.courses.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}><option value="">Todas las asignaturas</option>{bundle.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={teacherFilter} onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}><option value="">Todos los profesores</option>{bundle.teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="admin-search"><Search size={17} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar por asignatura, curso, sección o profesor" /></label><button type="button" className="secondary-button" onClick={resetFilters} disabled={!hasFilters}>Limpiar filtros</button></div><div className="assignment-table"><div className="assignment-row head subject"><span>Asignatura</span><span>Curso / sección</span><span>Profesor responsable</span><span>Acciones</span></div>{visible.map((row) => <div key={row.id} className="assignment-row subject"><span>{row.subject.name}</span><span>{row.section.course} {row.section.name}</span><span>{row.teacher?.name ?? 'Sin responsable'}</span><span><button className="secondary-button" onClick={() => setEditingRow(row)}><Edit3 size={15} />Editar</button></span></div>)}</div>{!rows.length && <div className="admin-empty"><Search size={20} /><strong>Sin responsables</strong><span>No hay responsables que coincidan con los filtros actuales.</span></div>}<Pager page={page} total={total} onPage={setPage} />{editingRow && <SubjectResponsibleModal row={editingRow} teachers={bundle.teachers} setConfirm={setConfirm} onClose={() => setEditingRow(null)} onSaved={() => { setEditingRow(null); onSaved('Responsable actualizado correctamente.'); }} onApiError={onApiError} />}</div>;
}

