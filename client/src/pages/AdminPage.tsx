import { AlertTriangle, BookOpen, Building2, CheckCircle2, ClipboardList, Edit3, Eye, EyeOff, GraduationCap, KeyRound, Link2, Plus, Search, Shield, ToggleLeft, ToggleRight, UserRound, Users, X } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  assignAdminStudentSection,
  assignAdminSubjectTeacher,
  assignAdminTeacher,
  createAdminCourse,
  createAdminGuardian,
  createAdminSection,
  createAdminStudent,
  createAdminSubject,
  createAdminTeacher,
  createAdminUser,
  linkAdminGuardianStudents,
  loadAdminBundle,
  resetAdminUserPassword,
  setAdminGuardianStatus,
  setAdminStudentStatus,
  setAdminTeacherStatus,
  setAdminUserStatus,
  updateAdminCourse,
  updateAdminGuardian,
  updateAdminSection,
  updateAdminStudent,
  updateAdminSubject,
  updateAdminTeacher,
  updateAdminUser,
  type AdminUserPayload
} from '../api';
import { PageHeader } from '../components/PageHeader';
import type { AdminBundle, AdminCourseRow, AdminGuardianRow, AdminOption, AdminSectionRow, AdminStudentRow, AdminSubjectRow, AdminTeacherRow, AdminUserRow, Role, User } from '../types';

type AdminTab = 'users' | 'students' | 'teachers' | 'guardians' | 'courses' | 'subjects' | 'assignments';
type ModalState =
  | { type: 'user'; mode: 'create' | 'edit'; row?: AdminUserRow }
  | { type: 'student'; mode: 'create' | 'edit'; row?: AdminStudentRow }
  | { type: 'teacher'; mode: 'create' | 'edit'; row?: AdminTeacherRow }
  | { type: 'guardian'; mode: 'create' | 'edit'; row?: AdminGuardianRow }
  | { type: 'course'; mode: 'create' | 'edit'; row?: AdminCourseRow }
  | { type: 'section'; mode: 'create' | 'edit'; row?: AdminSectionRow }
  | { type: 'subject'; mode: 'create' | 'edit'; row?: AdminSubjectRow };
type ConfirmState = { title: string; message: string; action: () => Promise<void>; danger?: boolean };

const tabs: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'students', label: 'Estudiantes', icon: GraduationCap },
  { id: 'teachers', label: 'Profesores', icon: BookOpen },
  { id: 'guardians', label: 'Apoderados', icon: UserRound },
  { id: 'courses', label: 'Cursos y secciones', icon: Building2 },
  { id: 'subjects', label: 'Asignaturas', icon: ClipboardList },
  { id: 'assignments', label: 'Asignaciones', icon: Link2 }
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

function SelectField({ label, name, options, defaultValue, required, placeholder = 'Sin asignar', error, help }: { label: string; name: string; options: AdminOption[]; defaultValue?: string | null; required?: boolean; placeholder?: string; error?: string; help?: string }) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={defaultValue ?? ''} required={required} className={error ? 'input-error' : undefined}>
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
    <label>
      {label}
      <select name={name} defaultValue={defaultValues} multiple size={Math.min(5, Math.max(3, options.length))}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {help && <small className="field-help">{help}</small>}
    </label>
  );
}

function getValues(form: HTMLFormElement, key: string) {
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
  const [section, setSection] = useState('');
  const [draft, setDraft] = useState<string[]>(Array.from(new Set(selectedIds)));
  const sectionOptions = useMemo(() => Array.from(new Set(students.map((student) => student.section).filter(Boolean))).sort(), [students]);
  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSection = !section || student.section === section;
      const haystack = `${student.name} ${student.email} ${student.rut} ${student.course} ${student.section}`.toLowerCase();
      return matchesSection && (!normalized || haystack.includes(normalized));
    });
  }, [query, section, students]);
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
          <label className="admin-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo, RUT o curso" /></label>
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            <option value="">Todas las secciones</option>
            {sectionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
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
                <small>{student.email} · {student.rut || 'Sin RUT'} · {student.course} {student.section}</small>
              </span>
            </label>
          ))}
          {!filteredStudents.length && <div className="admin-empty"><Search size={20} /><strong>Sin estudiantes</strong><span>No hay resultados para los filtros actuales.</span></div>}
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
      {showPassword && <PasswordInput name="password" label="Clave temporal" value={password} onChange={onPasswordChange} error={errors.password} help="Si dejas la clave vacía, se asignará demo1234." />}
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

function EntityModal({ modal, options, students, onClose, onSaved }: { modal: ModalState; options: AdminBundle['summary']['options']; students: AdminStudentRow[]; onClose: () => void; onSaved: (message: string) => void }) {
  const title = `${modal.mode === 'create' ? 'Crear' : 'Editar'} ${modal.type === 'user' ? 'usuario' : modal.type === 'student' ? 'estudiante' : modal.type === 'teacher' ? 'profesor' : modal.type === 'guardian' ? 'apoderado' : modal.type === 'course' ? 'curso' : modal.type === 'section' ? 'seccion' : 'asignatura'}`;
  const [selectedRole, setSelectedRole] = useState<Role | ''>(roleFromModal(modal));
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(modal.type === 'guardian' ? modal.row?.students?.map((item) => item.id) ?? [] : []);
  const [saving, setSaving] = useState(false);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  function validateUserPayload(payload: AdminUserPayload, requireRole: boolean) {
    const nextErrors: UserFormErrors = {};
    if (!payload.name.trim()) nextErrors.name = 'Nombre requerido';
    if (!payload.email.trim()) nextErrors.email = 'Correo requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) nextErrors.email = 'Correo inválido';
    if (requireRole && !payload.role) nextErrors.role = 'Rol requerido';
    if (payload.password && payload.password.length < 6) nextErrors.password = 'La clave debe tener al menos 6 caracteres';
    if (payload.password && payload.password !== confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    if (payload.rut && (payload.rut.length < 5 || payload.rut.length > 30)) nextErrors.rut = 'Debe tener entre 5 y 30 caracteres';
    if (payload.phone && !/^[+\d\s()-]{7,30}$/.test(payload.phone)) nextErrors.phone = 'Usa un teléfono válido';
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

    try {
      setSaving(true);
      if (modal.type === 'user') modal.mode === 'create' ? await createAdminUser(cleanedUser) : await updateAdminUser(modal.row!.id, cleanedUser);
      if (modal.type === 'student') modal.mode === 'create' ? await createAdminStudent(cleanedUser) : await updateAdminStudent(modal.row!.id, cleanedUser);
      if (modal.type === 'teacher') modal.mode === 'create' ? await createAdminTeacher(cleanedUser) : await updateAdminTeacher(modal.row!.id, cleanedUser);
      if (modal.type === 'guardian') modal.mode === 'create' ? await createAdminGuardian(cleanedUser) : await updateAdminGuardian(modal.row!.id, cleanedUser);
      if (modal.type === 'course') {
        const payload = { name: String(fd.get('name') ?? ''), levelId: String(fd.get('levelId') ?? '') || undefined };
        modal.mode === 'create' ? await createAdminCourse(payload) : await updateAdminCourse(modal.row!.id, payload);
      }
      if (modal.type === 'section') {
        const payload = { name: String(fd.get('name') ?? ''), courseId: String(fd.get('courseId') ?? ''), teacherId: String(fd.get('teacherId') ?? '') || undefined, classroomId: String(fd.get('classroomId') ?? '') || undefined };
        modal.mode === 'create' ? await createAdminSection(payload) : await updateAdminSection(modal.row!.id, payload);
      }
      if (modal.type === 'subject') {
        const payload = { name: String(fd.get('name') ?? ''), code: String(fd.get('code') ?? ''), courseIds: getValues(form, 'courseIds'), sectionIds: getValues(form, 'sectionIds'), teacherIds: getValues(form, 'teacherIds') };
        modal.mode === 'create' ? await createAdminSubject(payload) : await updateAdminSubject(modal.row!.id, payload);
      }
      const userModal = ['user', 'student', 'teacher', 'guardian'].includes(modal.type);
      if (userModal && modal.mode === 'create') onSaved(`Usuario creado correctamente${cleanedUser.password ? '' : '. Clave temporal: demo1234'}`);
      else if (userModal) onSaved('Usuario actualizado correctamente');
      else onSaved('Cambios guardados correctamente.');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setFormError(message ?? 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-modal" onSubmit={submit} autoComplete="off" onInput={() => { if (hasFieldErrors) setFieldErrors({}); if (formError) setFormError(''); }}>
        <input className="admin-autofill-decoy" type="text" name="fake-username" autoComplete="username" tabIndex={-1} aria-hidden="true" />
        <input className="admin-autofill-decoy" type="password" name="fake-password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" />
        <header>
          <div><span>Administracion</span><h2>{title}</h2></div>
          <button type="button" onClick={onClose}>x</button>
        </header>
        <div className="admin-form-grid">
          {modal.type === 'user' && <UserFields role={selectedRole} row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} canChangeRole password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} onRoleChange={(role) => { setSelectedRole(role); setSelectedStudentIds([]); setPassword(''); setConfirmPassword(''); setFieldErrors({}); setFormError(''); }} />}
          {modal.type === 'student' && <UserFields role="student" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'teacher' && <UserFields role="teacher" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'guardian' && <UserFields role="guardian" row={modal.row} options={options} students={students} selectedStudentIds={selectedStudentIds} onOpenStudentPicker={() => setStudentPickerOpen(true)} showPassword={modal.mode === 'create'} password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} errors={fieldErrors} />}
          {modal.type === 'course' && <><label>Curso<input name="name" defaultValue={modal.row?.name} required /></label><SelectField label="Nivel" name="levelId" options={options.levels} defaultValue={modal.row?.levelId} required /></>}
          {modal.type === 'section' && <><label>Seccion<input name="name" defaultValue={modal.row?.name} required /></label><SelectField label="Curso" name="courseId" options={options.courses} defaultValue={modal.row?.courseId} required /><SelectField label="Profesor jefe" name="teacherId" options={options.teachers} defaultValue={modal.row?.teacherId} /><SelectField label="Sala" name="classroomId" options={options.classrooms} defaultValue={modal.row?.classroomId} /></>}
          {modal.type === 'subject' && <><label>Asignatura<input name="name" defaultValue={modal.row?.name} required /></label><label>Codigo<input name="code" defaultValue={modal.row?.code} required /></label><MultiSelectField label="Cursos" name="courseIds" options={options.courses} defaultValues={modal.row?.courses?.map((item) => item.id)} /><MultiSelectField label="Secciones" name="sectionIds" options={options.sections} defaultValues={modal.row?.sections?.map((item) => item.id)} /><MultiSelectField label="Profesores" name="teacherIds" options={options.teachers} defaultValues={modal.row?.teachers?.map((item) => item.id)} /></>}
        </div>
        {formError && <p className="admin-modal-error">{formError}</p>}
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || hasFieldErrors}>{saving ? 'Guardando...' : 'Guardar usuario'}</button></footer>
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

export function AdminPage({ user }: { user: User }) {
  const [bundle, setBundle] = useState<AdminBundle | null>(null);
  const [tab, setTab] = useState<AdminTab>('users');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
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
  const filtered = useMemo(() => {
    if (!bundle) return [];
    const source = tab === 'users' ? bundle.users : tab === 'students' ? bundle.students : tab === 'teachers' ? bundle.teachers : tab === 'guardians' ? bundle.guardians : tab === 'courses' ? [...bundle.courses, ...bundle.sections] : tab === 'subjects' ? bundle.subjects : [];
    return source.filter((row: unknown) => textIncludes(row, query)).filter((row: unknown) => {
      if (status === 'all' || !('isActive' in (row as object))) return true;
      return status === 'active' ? (row as { isActive?: boolean }).isActive : !(row as { isActive?: boolean }).isActive;
    });
  }, [bundle, query, status, tab]);

  if (!['admin', 'director', 'inspector'].includes(user.primaryRole)) {
    return <div className="page-stack"><PageHeader eyebrow="Administracion" title="Acceso restringido" description="Tu rol no tiene acceso al CRUD administrativo." /></div>;
  }

  if (!bundle) return <div className="page-stack"><PageHeader eyebrow="Administracion" title="Cargando panel" description="Preparando usuarios, cursos, secciones y asignaciones." /></div>;

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
      <PageHeader eyebrow="Administracion" title="Panel de estructura escolar" description="Gestiona usuarios, estudiantes, docentes, apoderados, cursos, secciones, asignaturas y relaciones academicas." />
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
        </aside>

        <main className="admin-panel">
          <div className="admin-toolbar">
            <label className="admin-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo, curso o estado" /></label>
            {['users', 'students', 'teachers', 'guardians'].includes(tab) && <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>}
            {canManage && tab !== 'assignments' && <button className="primary-button" onClick={() => setModal({ type: tab === 'students' ? 'student' : tab === 'teachers' ? 'teacher' : tab === 'guardians' ? 'guardian' : tab === 'courses' ? 'course' : tab === 'subjects' ? 'subject' : 'user', mode: 'create' })}><Plus size={18} />Crear</button>}
          </div>

          {tab === 'users' && <AdminTable rows={filtered as AdminUserRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{roleLabels[row.role]}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'user', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('usuario', row.name, row.isActive, () => setAdminUserStatus(row.id, !row.isActive))}>{row.isActive ? <ToggleRight /> : <ToggleLeft />} {row.isActive ? 'Desactivar' : 'Activar'}</button><button onClick={() => setConfirm({ title: 'Resetear clave', message: `Confirma el reseteo de clave para ${row.name}.`, action: async () => { const result = await resetAdminUserPassword(row.id); done(`Clave temporal: ${result.temporaryPassword}`); } })}><KeyRound size={16} />Reset clave</button></>}</div></>} />}

          {tab === 'students' && <AdminTable rows={filtered as AdminStudentRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.course} · {row.section}</span><span>{row.guardians.length ? row.guardians.map((item) => item.name).join(', ') : 'Sin apoderado'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'student', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('estudiante', row.name, row.isActive, () => setAdminStudentStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'teachers' && <AdminTable rows={filtered as AdminTeacherRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.specialty}</span><span>{row.subjects.map((item) => item.name).join(', ') || 'Sin asignaturas'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'teacher', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('profesor', row.name, row.isActive, () => setAdminTeacherStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'guardians' && <AdminTable rows={filtered as AdminGuardianRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.phone || 'Sin telefono'}</span><span>{row.students.map((item) => item.name).join(', ') || 'Sin estudiantes'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'guardian', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('apoderado', row.name, row.isActive, () => setAdminGuardianStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'courses' && <AdminTable rows={filtered as Array<AdminCourseRow | AdminSectionRow>} render={(row) => 'level' in row ? <><div><strong>{row.name}</strong><small>Curso · {row.level}</small></div><span>{row.sections} secciones</span><span>{row.students} estudiantes</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'course', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></> : <><div><strong>{row.name}</strong><small>Seccion · {row.course}</small></div><span>{row.teacher}</span><span>{row.classroom} · {row.students} estudiantes</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'section', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></>} />}

          {tab === 'subjects' && <AdminTable rows={filtered as AdminSubjectRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.code}</small></div><span>{row.teachers.map((item) => item.name).join(', ') || 'Sin profesor'}</span><span>{row.sections.map((item) => `${item.course} ${item.name}`).join(', ') || 'Sin seccion'}</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'subject', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></>} />}

          {tab === 'assignments' && <AssignmentsPanel options={options} onSaved={done} />}
        </main>
      </section>

      {modal && <EntityModal modal={modal} options={options} students={bundle.students} onClose={() => setModal(null)} onSaved={done} />}
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function AssignmentsPanel({ options, onSaved }: { options: AdminBundle['summary']['options']; onSaved: (message: string) => void }) {
  async function submitTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await assignAdminTeacher(String(new FormData(form).get('teacherId')), { subjectIds: getValues(form, 'subjectIds'), sectionIds: getValues(form, 'sectionIds') });
    onSaved('Asignacion docente guardada.');
  }
  async function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await assignAdminStudentSection(String(fd.get('studentId')), String(fd.get('sectionId')));
    onSaved('Estudiante asignado a seccion.');
  }
  async function submitGuardian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    await linkAdminGuardianStudents(String(fd.get('guardianId')), { studentIds: getValues(form, 'studentIds'), relationship: String(fd.get('relationship') || 'Apoderado') });
    onSaved('Vinculo apoderado-estudiante actualizado.');
  }
  async function submitSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await assignAdminSubjectTeacher(String(fd.get('subjectId')), { teacherId: String(fd.get('teacherId')), sectionId: String(fd.get('sectionId') || '') || undefined });
    onSaved('Asignatura actualizada.');
  }

  return (
    <div className="admin-assignment-grid">
      <form onSubmit={submitTeacher} className="admin-relation-card"><h3>Profesor {'>'} asignatura {'>'} seccion</h3><SelectField label="Profesor" name="teacherId" options={options.teachers} required /><MultiSelectField label="Asignaturas" name="subjectIds" options={options.subjects} /><MultiSelectField label="Secciones" name="sectionIds" options={options.sections} /><button className="primary-button">Guardar relacion</button></form>
      <form onSubmit={submitStudent} className="admin-relation-card"><h3>Estudiante {'>'} seccion</h3><SelectField label="Estudiante" name="studentId" options={options.students} required /><SelectField label="Seccion" name="sectionId" options={options.sections} required /><button className="primary-button">Asignar estudiante</button></form>
      <form onSubmit={submitGuardian} className="admin-relation-card"><h3>Apoderado {'>'} estudiantes</h3><SelectField label="Apoderado" name="guardianId" options={options.guardians} required /><MultiSelectField label="Estudiantes" name="studentIds" options={options.students} /><label>Relacion<input name="relationship" defaultValue="Apoderado" /></label><button className="primary-button">Vincular</button></form>
      <form onSubmit={submitSubject} className="admin-relation-card"><h3>Asignatura {'>'} responsable</h3><SelectField label="Asignatura" name="subjectId" options={options.subjects} required /><SelectField label="Profesor" name="teacherId" options={options.teachers} required /><SelectField label="Seccion" name="sectionId" options={options.sections} /><button className="primary-button">Asignar responsable</button></form>
    </div>
  );
}
