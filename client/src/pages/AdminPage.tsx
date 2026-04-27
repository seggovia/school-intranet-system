import { AlertTriangle, BookOpen, Building2, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Edit3, Eye, EyeOff, GraduationCap, KeyRound, Link2, Plus, Search, Shield, ToggleLeft, ToggleRight, Trash2, UserRound, Users, X } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  assignAdminStudentSection,
  assignAdminSubjectTeacher,
  assignAdminTeacher,
  clearAdminStudentSection,
  createAdminClassroom,
  createAdminCourse,
  createAdminGuardian,
  createAdminSection,
  createAdminStudent,
  createAdminSubject,
  createAdminTeacher,
  createAdminUser,
  deleteAdminClassroom,
  deleteAdminSection,
  linkAdminGuardianStudents,
  loadAdminBundle,
  removeAdminTeacherAssignment,
  resetAdminUserPassword,
  setAdminGuardianStatus,
  setAdminStudentStatus,
  setAdminTeacherStatus,
  setAdminUserStatus,
  updateAdminClassroom,
  updateAdminCourse,
  updateAdminGuardian,
  updateAdminSection,
  updateAdminStudent,
  updateAdminSubject,
  updateAdminTeacher,
  updateAdminUser,
  unlinkAdminGuardianStudent,
  type AdminUserPayload
} from '../api';
import { PageHeader } from '../components/PageHeader';
import type { AdminBundle, AdminClassroomRow, AdminCourseRow, AdminGuardianRow, AdminOption, AdminSectionRow, AdminStudentRow, AdminSubjectRow, AdminTeacherRow, AdminUserRow, Role, User } from '../types';

type AdminTab = 'users' | 'students' | 'teachers' | 'guardians' | 'courses' | 'subjects' | 'assignments-teachers' | 'assignments-students' | 'assignments-guardians' | 'assignments-subjects';
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

const tabs: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'students', label: 'Estudiantes', icon: GraduationCap },
  { id: 'teachers', label: 'Profesores', icon: BookOpen },
  { id: 'guardians', label: 'Apoderados', icon: UserRound },
  { id: 'courses', label: 'Cursos y secciones', icon: Building2 },
  { id: 'subjects', label: 'Asignaturas', icon: ClipboardList }
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
  return { name: parts.slice(0, 2).join(' ') || name, lastName: parts.slice(2).join(' ') };
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
      <select name={name} defaultValue={defaultValue ?? ''} required={required} className={error ? 'input-error' : undefined} onChange={(event) => onChange?.(event.target.value)}>
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
type UserFormErrors = Partial<Record<'name' | 'email' | 'role' | 'password' | 'confirmPassword' | 'rut' | 'phone', string>>;

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
      {error && <span className="field-error">{error}</span>}
      {help && <small className="field-help">{help}</small>}
    </label>
  );
}

function StudentPickerModal({ students, selectedIds, onCancel, onConfirm }: { students: AdminStudentRow[]; selectedIds: string[]; onCancel: () => void; onConfirm: (ids: string[]) => void }) {
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

  function toggle(id: string) {
    setDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <section className="student-picker-modal">
        <header>
          <div>
            <span>Apoderados</span>
            <h2>Seleccionar estudiantes</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cerrar"><X size={18} /></button>
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
          <button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button>
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
        <label>Nombre<input name="name" defaultValue={names.name} required autoComplete="off" placeholder="Nombre del usuario" className={errors.name ? 'input-error' : undefined} />{errors.name && <span className="field-error">{errors.name}</span>}</label>
        <label>Apellido<input name="lastName" defaultValue={names.lastName} autoComplete="off" placeholder="Apellido" /></label>
      </fieldset>
      <fieldset className="admin-form-section">
        <legend>Acceso</legend>
        <label>Correo<input name="email" type="email" defaultValue={row?.email ?? ''} required autoComplete="new-email" placeholder="correo@colegio.cl" spellCheck={false} className={errors.email ? 'input-error' : undefined} />{errors.email && <span className="field-error">{errors.email}</span>}</label>
      {canChangeRole && (
        <label>Rol
          <select name="role" value={role} onChange={(event) => isRole(event.target.value) && onRoleChange?.(event.target.value)} required className={errors.role ? 'input-error' : undefined}>
            <option value="">Selecciona un rol</option>
            {options.roles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          {errors.role && <span className="field-error">{errors.role}</span>}
        </label>
      )}
      {showPassword && <PasswordInput name="password" label="Contraseña" value={password} onChange={onPasswordChange} error={errors.password} help="Si dejas la contraseña vacía, se asignará demo1234." />}
      {showPassword && password && <PasswordInput name="confirmPassword" label="Repetir contraseña" value={confirmPassword} onChange={onConfirmPasswordChange} error={errors.confirmPassword} placeholder="Repite la contraseña" />}
      </fieldset>
      {role && (
        <fieldset className="admin-form-section">
          <legend>Datos según rol</legend>
          {role === 'teacher' && <label>Área / especialidad<input name="department" defaultValue={(row as AdminUserRow | undefined)?.department ?? (row as AdminTeacherRow | undefined)?.specialty ?? ''} autoComplete="off" placeholder="Ej: Matemática" /></label>}
          {role === 'student' && <label>RUT / identificador<input name="rut" defaultValue={(row as AdminStudentRow | undefined)?.rut ?? ''} autoComplete="off" placeholder="Ej: 12.345.678-9" className={errors.rut ? 'input-error' : undefined} />{errors.rut && <span className="field-error">{errors.rut}</span>}</label>}
          {role === 'teacher' && <label>Código docente<input name="rut" defaultValue={(row as AdminTeacherRow | undefined)?.employeeCode ?? ''} autoComplete="off" placeholder="Opcional" className={errors.rut ? 'input-error' : undefined} />{errors.rut && <span className="field-error">{errors.rut}</span>}</label>}
          {role === 'student' && <label>Fecha nacimiento<input name="birthDate" type="date" defaultValue={(row as AdminStudentRow | undefined)?.birthDate ?? ''} autoComplete="off" /></label>}
          {role === 'student' && <SelectField label="Sección" name="sectionId" options={options.sections} defaultValue={(row as AdminStudentRow | undefined)?.sectionId} placeholder="Selecciona una sección" />}
          {role === 'guardian' && <label className="compact-field">Teléfono<input name="phone" defaultValue={(row as AdminGuardianRow | undefined)?.phone ?? ''} autoComplete="off" placeholder="+56 9 1234 5678" className={errors.phone ? 'input-error' : undefined} />{errors.phone && <span className="field-error">{errors.phone}</span>}</label>}
          {role === 'guardian' && (
            <div className="guardian-student-field">
              <span>Estudiantes vinculados</span>
              <button type="button" className="secondary-button" onClick={onOpenStudentPicker}><Users size={16} />Seleccionar estudiantes</button>
              <div className="selected-student-list">
                {selectedStudents.length ? selectedStudents.map((student) => <span key={student.id}>{student.name}</span>) : <small className="field-help">Opcional. Puedes vincularlos ahora o desde Asignaciones.</small>}
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

function EntityModal({ modal, options, students, onClose, onSaved, setConfirm }: { modal: ModalState; options: AdminBundle['summary']['options']; students: AdminStudentRow[]; onClose: () => void; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const title = `${modal.mode === 'create' ? 'Crear' : 'Editar'} ${modal.type === 'user' ? 'usuario' : modal.type === 'student' ? 'estudiante' : modal.type === 'teacher' ? 'profesor' : modal.type === 'guardian' ? 'apoderado' : modal.type === 'course' ? 'curso' : modal.type === 'section' ? 'sección' : modal.type === 'classroom' ? 'sala' : 'asignatura'}`;
  const [selectedRole, setSelectedRole] = useState<Role | ''>(roleFromModal(modal));
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    modal.type === 'guardian' ? modal.row?.students?.map((item) => item.id) ?? [] : []
  );
  const [courseSections, setCourseSections] = useState<Array<{ id: string; name: string; teacherId: string; classroomId: string }>>([]);
  const [saving, setSaving] = useState(false);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  function validateUserPayload(payload: AdminUserPayload, requireRole: boolean) {
    const nextErrors: UserFormErrors = {};
    if (!payload.name.trim()) nextErrors.name = 'Nombre requerido';
    if (!payload.email.trim()) nextErrors.email = 'Correo requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) nextErrors.email = 'Correo inválido';
    if (requireRole && !payload.role) nextErrors.role = 'Rol requerido';
    if (payload.password && payload.password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    if (payload.password && payload.password !== confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    if (payload.rut && (payload.rut.length < 5 || payload.rut.length > 30)) nextErrors.rut = 'Debe tener entre 5 y 30 caracteres';
    if (payload.phone && !/^(?:\+?56\s?)?(?:9\s?)?\d{4}\s?\d{4}$/.test(payload.phone.replace(/[()-]/g, '').trim())) nextErrors.phone = 'Usa un teléfono chileno válido';
    setFieldErrors(nextErrors);
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

    if (['user', 'student', 'teacher', 'guardian'].includes(modal.type) && !validateUserPayload(baseUser, modal.type === 'user')) return;
    const cleanedUser = cleanUserPayload(baseUser);

    const save = async () => {
      try {
      setSaving(true);
      if (modal.type === 'user') modal.mode === 'create' ? await createAdminUser(cleanedUser) : await updateAdminUser(modal.row!.id, cleanedUser);
      if (modal.type === 'student') modal.mode === 'create' ? await createAdminStudent(cleanedUser) : await updateAdminStudent(modal.row!.id, cleanedUser);
      if (modal.type === 'teacher') modal.mode === 'create' ? await createAdminTeacher(cleanedUser) : await updateAdminTeacher(modal.row!.id, cleanedUser);
      if (modal.type === 'guardian') modal.mode === 'create' ? await createAdminGuardian(cleanedUser) : await updateAdminGuardian(modal.row!.id, cleanedUser);
      if (modal.type === 'course') {
        const sections = courseSections.map((section) => ({
          name: section.name.trim(),
          teacherId: section.teacherId || undefined,
          classroomId: section.classroomId || undefined
        })).filter((section) => section.name);
        const duplicate = sections.find((section, index) => sections.findIndex((item) => item.name.toLowerCase() === section.name.toLowerCase()) !== index);
        if (duplicate) {
          setFormError('La sección no puede repetirse dentro del curso.');
          return;
        }
        const payload = { name: String(fd.get('name') ?? ''), levelId: String(fd.get('levelId') ?? ''), sections: modal.mode === 'create' ? sections : undefined };
        modal.mode === 'create' ? await createAdminCourse(payload) : await updateAdminCourse(modal.row!.id, payload);
      }
      if (modal.type === 'section') {
        const payload = { name: String(fd.get('name') ?? ''), courseId: String(fd.get('courseId') ?? ''), teacherId: String(fd.get('teacherId') ?? '') || undefined, classroomId: String(fd.get('classroomId') ?? '') || undefined };
        modal.mode === 'create' ? await createAdminSection(payload) : await updateAdminSection(modal.row!.id, payload);
      }
      if (modal.type === 'classroom') {
        const payload = { name: String(fd.get('name') ?? ''), capacity: Number(fd.get('capacity') ?? 0), type: String(fd.get('type') ?? 'aula') as AdminClassroomRow['type'] };
        modal.mode === 'create' ? await createAdminClassroom(payload) : await updateAdminClassroom(modal.row!.id, payload);
      }
      if (modal.type === 'subject') {
        const payload = { name: String(fd.get('name') ?? ''), code: String(fd.get('code') ?? ''), courseIds: getValues(form, 'courseIds'), sectionIds: getValues(form, 'sectionIds'), teacherIds: getValues(form, 'teacherIds') };
        modal.mode === 'create' ? await createAdminSubject(payload) : await updateAdminSubject(modal.row!.id, payload);
      }
      const userModal = ['user', 'student', 'teacher', 'guardian'].includes(modal.type);
      if (userModal && modal.mode === 'create') onSaved(`Usuario creado correctamente${cleanedUser.password ? '' : '. Contraseña: demo1234'}`);
      else if (userModal) onSaved('Usuario actualizado correctamente');
      else onSaved('Cambios guardados correctamente.');
      } catch (err) {
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        setFormError(message ?? 'No se pudieron guardar los cambios.');
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
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-modal" onSubmit={submit} autoComplete="off" onInput={() => { if (hasFieldErrors) setFieldErrors({}); if (formError) setFormError(''); }}>
        <input className="admin-autofill-decoy" type="text" name="fake-username" autoComplete="username" tabIndex={-1} aria-hidden="true" />
        <input className="admin-autofill-decoy" type="password" name="fake-password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" />
        <header>
          <div><span>Administración</span><h2>{title}</h2></div>
          <button type="button" onClick={onClose}>x</button>
        </header>
        <div className="admin-form-grid">
          {modal.type === 'user' && <UserFields role={selectedRole} row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} canChangeRole password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} onRoleChange={(role) => { setSelectedRole(role); setSelectedStudentIds([]); setPassword(''); setConfirmPassword(''); setFieldErrors({}); setFormError(''); }} />}
          {modal.type === 'student' && <UserFields role="student" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'teacher' && <UserFields role="teacher" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'guardian' && <UserFields role="guardian" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'course' && (
            <>
              <label>Curso<input name="name" defaultValue={modal.row?.name} required placeholder="Ej: 1 Medio" /></label>
              <SelectField label="Nivel" name="levelId" options={options.levels} defaultValue={modal.row?.levelId} placeholder="Selecciona un nivel" required />
              {modal.mode === 'create' && (
                <fieldset className="admin-form-section full-span course-section-editor">
                  <legend>Secciones iniciales</legend>
                  <p className="field-help">Opcional. Puedes crear paralelos como A, B o C y asignar profesor jefe o sala desde el inicio.</p>
                  {courseSections.map((section, index) => (
                    <div className="course-section-row" key={section.id}>
                      <label>Sección<input value={section.name} onChange={(event) => setCourseSections((items) => items.map((item) => item.id === section.id ? { ...item, name: event.target.value } : item))} placeholder="A" /></label>
                      <SelectField label="Profesor jefe" name={`sectionTeacher-${index}`} options={options.teachers} defaultValue={section.teacherId} onChange={(value) => setCourseSections((items) => items.map((item) => item.id === section.id ? { ...item, teacherId: value } : item))} />
                      <SelectField label="Sala" name={`sectionClassroom-${index}`} options={options.classrooms} defaultValue={section.classroomId} onChange={(value) => setCourseSections((items) => items.map((item) => item.id === section.id ? { ...item, classroomId: value } : item))} />
                      <button type="button" className="danger-button icon-only" onClick={() => setCourseSections((items) => items.filter((item) => item.id !== section.id))}><X size={16} /></button>
                    </div>
                  ))}
                  <button type="button" className="secondary-button fit-button" onClick={() => setCourseSections((items) => [...items, { id: crypto.randomUUID(), name: '', teacherId: '', classroomId: '' }])}><Plus size={16} />Agregar sección</button>
                </fieldset>
              )}
            </>
          )}
          {modal.type === 'section' && <><label>Sección<input name="name" defaultValue={modal.row?.name} required placeholder="Ej: A" /></label><SelectField label="Curso" name="courseId" options={options.courses} defaultValue={modal.row?.courseId} placeholder="Selecciona un curso" required /><SelectField label="Profesor jefe" name="teacherId" options={options.teachers} defaultValue={modal.row?.teacherId} placeholder="Sin profesor jefe" /><SelectField label="Sala" name="classroomId" options={options.classrooms} defaultValue={modal.row?.classroomId} placeholder="Sin sala" />{modal.row?.students ? <p className="field-help full-span">Esta sección tiene {modal.row.students} estudiantes. Si cambias el curso, revisa que la matrícula siga correspondiendo.</p> : null}</>}
          {modal.type === 'classroom' && <><label>Sala<input name="name" defaultValue={modal.row?.name} required placeholder="Ej: Sala 308" /></label><label>Capacidad<input name="capacity" type="number" min="1" defaultValue={modal.row?.capacity ?? 30} required /></label><SelectField label="Tipo" name="type" options={[{ id: 'aula', label: 'Aula' }, { id: 'laboratorio', label: 'Laboratorio' }, { id: 'biblioteca', label: 'Biblioteca' }, { id: 'gimnasio', label: 'Gimnasio' }, { id: 'otro', label: 'Otro' }]} defaultValue={modal.row?.type ?? 'aula'} required /></>}
          {modal.type === 'subject' && <><label>Asignatura<input name="name" defaultValue={modal.row?.name} required /></label><label>Código<input name="code" defaultValue={modal.row?.code} required /></label><MultiSelectField label="Cursos" name="courseIds" options={options.courses} defaultValues={modal.row?.courses?.map((item) => item.id)} /><MultiSelectField label="Secciones" name="sectionIds" options={options.sections} defaultValues={modal.row?.sections?.map((item) => item.id)} /><MultiSelectField label="Profesores" name="teacherIds" options={options.teachers} defaultValues={modal.row?.teachers?.map((item) => item.id)} /></>}
        </div>
        {formError && <p className="admin-modal-error">{formError}</p>}
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || hasFieldErrors}>{saving ? 'Guardando...' : modal.type === 'course' ? 'Guardar curso' : modal.type === 'section' ? 'Guardar sección' : modal.type === 'classroom' ? 'Guardar sala' : modal.type === 'subject' ? 'Guardar asignatura' : 'Guardar usuario'}</button></footer>
      </form>
      {studentPickerOpen && <StudentPickerModal students={students} selectedIds={selectedStudentIds} onCancel={() => setStudentPickerOpen(false)} onConfirm={(ids) => { setSelectedStudentIds(ids); setStudentPickerOpen(false); }} />}
    </div>
  );
}

function ConfirmDialog({ confirm, onClose }: { confirm: ConfirmState; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <section className="admin-confirm">
        <AlertTriangle />
        <h2>{confirm.title}</h2>
        <p>{confirm.message}</p>
        <div><button className="secondary-button" onClick={onClose}>Cancelar</button><button className={confirm.danger ? 'danger-button' : 'primary-button'} disabled={busy} onClick={async () => { setBusy(true); await confirm.action(); onClose(); }}>Confirmar</button></div>
      </section>
    </div>
  );
}

function AdminTable<T extends { id: string }>({ rows, render, empty = 'Sin registros' }: { rows: T[]; render: (row: T) => ReactNode; empty?: string }) {
  if (!rows.length) return <div className="admin-empty"><Search size={22} /><strong>{empty}</strong><span>Ajusta la búsqueda o crea un nuevo registro.</span></div>;
  return <div className="admin-table-list">{rows.map((row) => <article key={row.id} className="admin-table-card">{render(row)}</article>)}</div>;
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  if (total <= 1) return null;
  return <div className="assignment-pager"><button className="secondary-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button><span>Página {page} de {total}</span><button className="secondary-button" disabled={page >= total} onClick={() => onPage(page + 1)}>Siguiente</button></div>;
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

export function AdminPage({ user }: { user: User }) {
  const [bundle, setBundle] = useState<AdminBundle | null>(null);
  const [tab, setTab] = useState<AdminTab>('users');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [assignmentsOpen, setAssignmentsOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = ['admin', 'director'].includes(user.primaryRole);
  const canInspect = user.primaryRole === 'inspector';

  async function refresh() {
    setBundle(await loadAdminBundle());
  }

  useEffect(() => { refresh().catch(() => setError('No se pudo cargar el panel administrativo.')); }, []);

  function done(message: string) {
    setModal(null);
    setNotice(message);
    refresh().catch(() => setError('No se pudo actualizar la informacion.'));
  }

  const visibleTabs = useMemo(() => (canInspect && !canManage ? tabs.filter((item) => ['students', 'courses'].includes(item.id)) : tabs), [canInspect, canManage]);
  const isAssignmentTab = tab.startsWith('assignments-');
  const usesCustomView = isAssignmentTab || tab === 'courses';
  const filtered = useMemo(() => {
    if (!bundle) return [];
    const source = tab === 'users' ? bundle.users : tab === 'students' ? bundle.students : tab === 'teachers' ? bundle.teachers : tab === 'guardians' ? bundle.guardians : tab === 'courses' ? [...bundle.courses, ...bundle.sections] : tab === 'subjects' ? bundle.subjects : [];
    return source.filter((row: unknown) => textIncludes(row, query)).filter((row: unknown) => {
      if (status === 'all' || !('isActive' in (row as object))) return true;
      return status === 'active' ? (row as { isActive?: boolean }).isActive : !(row as { isActive?: boolean }).isActive;
    });
  }, [bundle, query, status, tab]);

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
    action: async () => { await action(); done('Estado actualizado correctamente.'); }
  });

  return (
    <div className="page-stack admin-page">
      <PageHeader eyebrow="Administración" title="Panel de estructura escolar" description="Gestiona usuarios, estudiantes, docentes, apoderados, cursos, secciones, asignaturas y relaciones académicas." />
      {notice && <div className="admin-notice success" onClick={() => setNotice(null)}>{notice}</div>}
      {error && <div className="admin-notice error" onClick={() => setError(null)}>{error}</div>}

      <section className="admin-summary-grid">
        {summaryCards.map(([label, value, Icon]) => <article key={label} className="admin-summary-card"><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>)}
      </section>

      <section className="admin-workspace">
        <aside className="admin-tabs">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><Icon size={18} />{item.label}</button>;
          })}
          {canManage && <div className="admin-tab-group">
            <button type="button" className={`admin-tab-parent ${isAssignmentTab ? 'active' : ''}`} onClick={() => setAssignmentsOpen((current) => !current)}>
              <span><Link2 size={18} />Asignaciones</span>
              {assignmentsOpen ? <ChevronDown className="submenu-arrow" size={16} /> : <ChevronRight className="submenu-arrow" size={16} />}
            </button>
            {assignmentsOpen && assignmentTabs.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} className={tab === item.id ? 'active nested' : 'nested'} onClick={() => setTab(item.id)}><Icon size={16} />{item.label}</button>;
            })}
          </div>}
        </aside>

        <main className="admin-panel">
          {!usesCustomView && <div className="admin-toolbar">
            <label className="admin-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo, curso o estado" /></label>
            {['users', 'students', 'teachers', 'guardians'].includes(tab) && <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>}
            {canManage && <button className="primary-button" onClick={() => setModal({ type: tab === 'students' ? 'student' : tab === 'teachers' ? 'teacher' : tab === 'guardians' ? 'guardian' : tab === 'subjects' ? 'subject' : 'user', mode: 'create' })}><Plus size={18} />Crear</button>}
          </div>}

          {tab === 'users' && <AdminTable rows={filtered as AdminUserRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{roleLabels[row.role]}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'user', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('usuario', row.name, row.isActive, () => setAdminUserStatus(row.id, !row.isActive))}>{row.isActive ? <ToggleRight /> : <ToggleLeft />} {row.isActive ? 'Desactivar' : 'Activar'}</button><button onClick={() => setConfirm({ title: 'Resetear contraseña', message: `Confirma el reseteo de contraseña para ${row.name}.`, action: async () => { const result = await resetAdminUserPassword(row.id); done(`Contraseña: ${result.temporaryPassword}`); } })}><KeyRound size={16} />Reset contraseña</button></>}</div></>} />}

          {tab === 'students' && <AdminTable rows={filtered as AdminStudentRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.course} · {row.section}</span><span>{row.guardians.length ? row.guardians.map((item) => item.name).join(', ') : 'Sin apoderado'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'student', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('estudiante', row.name, row.isActive, () => setAdminStudentStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'teachers' && <AdminTable rows={filtered as AdminTeacherRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.specialty}</span><span>{row.subjects.map((item) => item.name).join(', ') || 'Sin asignaturas'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'teacher', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('profesor', row.name, row.isActive, () => setAdminTeacherStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'guardians' && <AdminTable rows={filtered as AdminGuardianRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.phone || 'Sin teléfono'}</span><span>{row.students.map((item) => item.name).join(', ') || 'Sin estudiantes'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'guardian', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('apoderado', row.name, row.isActive, () => setAdminGuardianStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'courses' && <CoursesSectionsPage bundle={bundle} canManage={canManage} setModal={setModal} setConfirm={setConfirm} onSaved={done} />}

          {tab === 'subjects' && <AdminTable rows={filtered as AdminSubjectRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.code}</small></div><span>{row.teachers.map((item) => item.name).join(', ') || 'Sin profesor'}</span><span>{row.sections.map((item) => `${item.course} ${item.name}`).join(', ') || 'Sin sección'}</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'subject', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></>} />}

          {tab === 'assignments-teachers' && <AssignmentsTeachersPage bundle={bundle} onSaved={done} setConfirm={setConfirm} />}
          {tab === 'assignments-students' && <AssignmentsStudentsPage bundle={bundle} onSaved={done} setConfirm={setConfirm} />}
          {tab === 'assignments-guardians' && <AssignmentsGuardiansPage bundle={bundle} onSaved={done} setConfirm={setConfirm} />}
          {tab === 'assignments-subjects' && <AssignmentsSubjectsPage bundle={bundle} onSaved={done} setConfirm={setConfirm} />}
        </main>
      </section>

      {modal && <EntityModal modal={modal} options={options} students={bundle.students} onClose={() => setModal(null)} onSaved={done} setConfirm={setConfirm} />}
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />}
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
  const total = Math.max(1, Math.ceil(rows.length / 8));
  const visible = rows.slice((page - 1) * 8, page * 8);

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
  return <div className="admin-modal-backdrop"><form className="admin-modal assignment-modal" onSubmit={submit}><header><div><span>Asignaciones</span><h2>Asignar profesor</h2></div><button type="button" onClick={onClose}>x</button></header><div className="admin-form-grid"><SelectField label="Profesor" name="teacherId" options={bundle.summary.options.teachers} required placeholder="Selecciona un profesor" /><MultiSelectField label="Asignaturas" name="subjectIds" options={bundle.summary.options.subjects} help="Selecciona una o más asignaturas." /><MultiSelectField label="Secciones" name="sectionIds" options={bundle.summary.options.sections} help="Selecciona una o más secciones." /></div><footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button">Guardar asignación</button></footer></form></div>;
}

function AssignmentsStudentsPage({ bundle, onSaved, setConfirm }: { bundle: AdminBundle; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [section, setSection] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const filtered = bundle.students.filter((student) => assignmentMatch([student.name, student.email, student.rut], query) && (!course || student.course === course) && (!section || student.sectionId === section));
  const total = Math.max(1, Math.ceil(filtered.length / 8));
  const visible = filtered.slice((page - 1) * 8, page * 8);
  async function assign() {
    if (!targetSection || !selected.length) return;
    const section = bundle.sections.find((item) => item.id === targetSection);
    confirmAction(setConfirm, {
      title: 'Asignar estudiantes',
      message: `Confirma que quieres asignar ${selected.length} estudiante(s) a ${section ? `${section.course} ${section.name}` : 'la sección seleccionada'}.`,
      action: async () => {
        await Promise.all(selected.map((id) => assignAdminStudentSection(id, targetSection)));
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
  return <div className="assignment-page"><header className="assignment-header"><div><h2>Asignación de estudiantes</h2><p>Selecciona estudiantes y muévelos a una sección.</p></div></header><div className="assignment-filters"><select value={course} onChange={(e) => { setCourse(e.target.value); setSection(''); }}><option value="">Todos los cursos</option>{bundle.courses.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><select value={section} onChange={(e) => setSection(e.target.value)}><option value="">Todas las secciones</option>{bundle.sections.filter((item) => !course || item.course === course).map((item) => <option key={item.id} value={item.id}>{item.course} {item.name}</option>)}</select><label className="admin-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o RUT" /></label></div><div className="assignment-bulkbar"><select value={targetSection} onChange={(e) => setTargetSection(e.target.value)}><option value="">Selecciona sección destino</option>{bundle.sections.map((item) => <option key={item.id} value={item.id}>{item.course} {item.name}</option>)}</select><button className="primary-button" disabled={!selected.length || !targetSection} onClick={assign}>Asignar a sección</button><button className="secondary-button" disabled={!selected.length} onClick={clear}>Quitar de sección</button><span>{selected.length} seleccionados</span></div><div className="student-picker-list assignment-student-list">{visible.map((student) => <label key={student.id} className="student-picker-row"><input type="checkbox" checked={selected.includes(student.id)} onChange={() => setSelected((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} /><span><strong>{student.name}</strong><small>{student.email}</small><small>RUT / identificador: {student.rut}</small><small>{student.course} · {student.section}</small></span></label>)}</div>{!filtered.length && <div className="admin-empty"><Search size={20} /><strong>Sin estudiantes</strong><span>No se encontraron estudiantes con esos filtros.</span></div>}<Pager page={page} total={total} onPage={setPage} /></div>;
}

function AssignmentsGuardiansPage({ bundle, onSaved, setConfirm }: { bundle: AdminBundle; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [query, setQuery] = useState('');
  const [guardianId, setGuardianId] = useState(bundle.guardians[0]?.id ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const guardians = bundle.guardians.filter((guardian) => assignmentMatch([guardian.name, guardian.email, guardian.phone], query));
  const guardian = bundle.guardians.find((item) => item.id === guardianId) ?? guardians[0];
  async function save(ids: string[]) {
    if (!guardian) return;
    confirmAction(setConfirm, {
      title: 'Vincular estudiantes',
      message: `Confirma que quieres dejar ${ids.length} estudiante(s) vinculado(s) a ${guardian.name}.`,
      action: async () => {
        await linkAdminGuardianStudents(guardian.id, { studentIds: ids, relationship: 'Apoderado' });
        setPickerOpen(false);
        onSaved('Estudiantes vinculados al apoderado.');
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
  return <div className="assignment-page"><header className="assignment-header"><div><h2>Apoderado → estudiantes</h2><p>Primero selecciona el apoderado. Luego usa “Agregar estudiantes” para abrir el selector con checkbox y confirmar los vínculos.</p></div>{guardian && <button className="primary-button" onClick={() => setPickerOpen(true)}><Plus size={17} />Agregar estudiantes</button>}</header><div className="assignment-filters"><label className="admin-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar apoderado por nombre, correo o RUT" /></label><select value={guardian?.id ?? ''} onChange={(e) => setGuardianId(e.target.value)}>{guardians.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></div>{guardian ? <div className="assignment-table"><div className="assignment-row head"><span>Estudiante</span><span>Relación</span><span>Acciones</span></div>{guardian.students.map((student) => <div key={student.id} className="assignment-row guardian"><span>{student.name}</span><span>{student.relationship}</span><span><button className="danger-button" onClick={() => unlink(student.id)}>Desvincular</button></span></div>)}</div> : <div className="admin-empty"><Search size={20} /><strong>Sin apoderados</strong><span>No se encontraron apoderados con esos filtros.</span></div>}{guardian && !guardian.students.length && <div className="admin-empty"><Users size={20} /><strong>Sin estudiantes vinculados</strong><span>Agrega estudiantes para este apoderado.</span></div>}{pickerOpen && guardian && <StudentPickerModal students={bundle.students} selectedIds={guardian.students.map((item) => item.id)} onCancel={() => setPickerOpen(false)} onConfirm={save} />}</div>;
}

function AssignmentsSubjectsPage({ bundle, onSaved, setConfirm }: { bundle: AdminBundle; onSaved: (message: string) => void; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const rows = bundle.subjects.flatMap((subject) => subject.sections.map((section) => ({ id: `${subject.id}-${section.id}`, subject, section, teacher: subject.teachers[0] }))).filter((row) => assignmentMatch([row.subject.name, row.section.course, row.teacher?.name ?? ''], query) && (!course || row.section.course === course) && (!subjectId || row.subject.id === subjectId) && (!teacherId || row.teacher?.id === teacherId));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const subject = String(fd.get('subjectId'));
    const teacher = String(fd.get('teacherId'));
    const section = String(fd.get('sectionId') || '') || undefined;
    confirmAction(setConfirm, {
      title: 'Cambiar responsable',
      message: 'Confirma la asignación del profesor responsable para esta asignatura.',
      action: async () => {
        await assignAdminSubjectTeacher(subject, { teacherId: teacher, sectionId: section });
        onSaved('Responsable de asignatura actualizado.');
      }
    });
  }
  return <div className="assignment-page"><header className="assignment-header"><div><h2>Responsables de asignatura</h2><p>Define el profesor responsable por asignatura y sección.</p></div></header><form className="assignment-inline-form" onSubmit={submit}><SelectField label="Asignatura" name="subjectId" options={bundle.summary.options.subjects} required /><SelectField label="Curso / sección" name="sectionId" options={bundle.summary.options.sections} /><SelectField label="Profesor responsable" name="teacherId" options={bundle.summary.options.teachers} required /><button className="primary-button">Guardar responsable</button></form><div className="assignment-filters"><select value={course} onChange={(e) => setCourse(e.target.value)}><option value="">Todos los cursos</option>{bundle.courses.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Todas las asignaturas</option>{bundle.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">Todos los profesores</option>{bundle.teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="admin-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o RUT" /></label></div><div className="assignment-table"><div className="assignment-row head"><span>Asignatura</span><span>Curso</span><span>Profesor responsable</span><span>Acciones</span></div>{rows.map((row) => <div key={row.id} className="assignment-row subject"><span>{row.subject.name}</span><span>{row.section.course} {row.section.name}</span><span>{row.teacher?.name ?? 'Sin responsable'}</span><span><button className="secondary-button">Editar</button></span></div>)}</div>{!rows.length && <div className="admin-empty"><Search size={20} /><strong>Sin responsables</strong><span>No se encontraron responsables con esos filtros.</span></div>}</div>;
}

