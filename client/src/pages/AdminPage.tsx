import { AlertTriangle, BookOpen, Building2, CheckCircle2, ClipboardList, Edit3, GraduationCap, KeyRound, Link2, Plus, Search, Shield, ToggleLeft, ToggleRight, UserRound, Users } from 'lucide-react';
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

function SelectField({ label, name, options, defaultValue, required }: { label: string; name: string; options: AdminOption[]; defaultValue?: string | null; required?: boolean }) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={defaultValue ?? ''} required={required}>
        <option value="">Sin asignar</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}{option.meta ? ` · ${option.meta}` : ''}</option>
        ))}
      </select>
    </label>
  );
}

function MultiSelectField({ label, name, options, defaultValues = [] }: { label: string; name: string; options: AdminOption[]; defaultValues?: string[] }) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={defaultValues} multiple size={Math.min(5, Math.max(3, options.length))}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function getValues(form: HTMLFormElement, key: string) {
  return Array.from(form.querySelectorAll<HTMLSelectElement>(`select[name="${key}"] option:checked`)).map((option) => option.value).filter(Boolean);
}

type UserLikeRow = Partial<AdminUserRow> | Partial<AdminStudentRow> | Partial<AdminTeacherRow> | Partial<AdminGuardianRow>;

function UserFields({ role, row, options }: { role?: Role; row?: UserLikeRow; options: AdminBundle['summary']['options'] }) {
  const names = splitName(row?.name);
  return (
    <>
      <label>Nombre<input name="name" defaultValue={names.name} required /></label>
      <label>Apellido<input name="lastName" defaultValue={names.lastName} /></label>
      <label>Correo<input name="email" type="email" defaultValue={row?.email} required /></label>
      {!role && (
        <label>Rol
          <select name="role" defaultValue={(row as AdminUserRow | undefined)?.role ?? 'student'} required>
            {options.roles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      )}
      <label>Area / especialidad<input name="department" defaultValue={(row as AdminUserRow | undefined)?.department ?? (row as AdminTeacherRow | undefined)?.specialty ?? ''} /></label>
      <label>Clave temporal<input name="password" type="password" placeholder="demo1234 si se deja vacio" /></label>
      {(role === 'student' || role === undefined) && <label>RUT / identificador<input name="rut" defaultValue={(row as AdminStudentRow | undefined)?.rut ?? ''} /></label>}
      {role === 'teacher' && <label>Codigo docente<input name="rut" defaultValue={(row as AdminTeacherRow | undefined)?.employeeCode ?? ''} /></label>}
      {role === 'student' && <label>Fecha nacimiento<input name="birthDate" type="date" defaultValue={(row as AdminStudentRow | undefined)?.birthDate ?? ''} /></label>}
      {role === 'student' && <SelectField label="Seccion" name="sectionId" options={options.sections} defaultValue={(row as AdminStudentRow | undefined)?.sectionId} />}
      {role === 'guardian' && <label>Telefono<input name="phone" defaultValue={(row as AdminGuardianRow | undefined)?.phone ?? ''} /></label>}
      {role === 'guardian' && <MultiSelectField label="Estudiantes vinculados" name="studentIds" options={options.students} defaultValues={(row as AdminGuardianRow | undefined)?.students?.map((item) => item.id)} />}
    </>
  );
}

function EntityModal({ modal, options, onClose, onSaved }: { modal: ModalState; options: AdminBundle['summary']['options']; onClose: () => void; onSaved: (message: string) => void }) {
  const title = `${modal.mode === 'create' ? 'Crear' : 'Editar'} ${modal.type === 'user' ? 'usuario' : modal.type === 'student' ? 'estudiante' : modal.type === 'teacher' ? 'profesor' : modal.type === 'guardian' ? 'apoderado' : modal.type === 'course' ? 'curso' : modal.type === 'section' ? 'seccion' : 'asignatura'}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const baseUser: AdminUserPayload = {
      name: String(fd.get('name') ?? ''),
      lastName: String(fd.get('lastName') ?? ''),
      email: String(fd.get('email') ?? ''),
      role: String(fd.get('role') ?? ''),
      department: String(fd.get('department') ?? ''),
      password: String(fd.get('password') ?? '') || undefined,
      rut: String(fd.get('rut') ?? '') || undefined,
      phone: String(fd.get('phone') ?? '') || undefined,
      birthDate: String(fd.get('birthDate') ?? '') || undefined,
      sectionId: String(fd.get('sectionId') ?? '') || undefined,
      studentIds: getValues(form, 'studentIds')
    };

    if (modal.type === 'user') modal.mode === 'create' ? await createAdminUser(baseUser) : await updateAdminUser(modal.row!.id, baseUser);
    if (modal.type === 'student') modal.mode === 'create' ? await createAdminStudent(baseUser) : await updateAdminStudent(modal.row!.id, baseUser);
    if (modal.type === 'teacher') modal.mode === 'create' ? await createAdminTeacher(baseUser) : await updateAdminTeacher(modal.row!.id, baseUser);
    if (modal.type === 'guardian') modal.mode === 'create' ? await createAdminGuardian(baseUser) : await updateAdminGuardian(modal.row!.id, baseUser);
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
    onSaved('Cambios guardados correctamente.');
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-modal" onSubmit={submit}>
        <header>
          <div><span>Administracion</span><h2>{title}</h2></div>
          <button type="button" onClick={onClose}>x</button>
        </header>
        <div className="admin-form-grid">
          {modal.type === 'user' && <UserFields row={modal.row} options={options} />}
          {modal.type === 'student' && <UserFields role="student" row={modal.row} options={options} />}
          {modal.type === 'teacher' && <UserFields role="teacher" row={modal.row} options={options} />}
          {modal.type === 'guardian' && <UserFields role="guardian" row={modal.row} options={options} />}
          {modal.type === 'course' && <><label>Curso<input name="name" defaultValue={modal.row?.name} required /></label><SelectField label="Nivel" name="levelId" options={options.levels} defaultValue={modal.row?.levelId} required /></>}
          {modal.type === 'section' && <><label>Seccion<input name="name" defaultValue={modal.row?.name} required /></label><SelectField label="Curso" name="courseId" options={options.courses} defaultValue={modal.row?.courseId} required /><SelectField label="Profesor jefe" name="teacherId" options={options.teachers} defaultValue={modal.row?.teacherId} /><SelectField label="Sala" name="classroomId" options={options.classrooms} defaultValue={modal.row?.classroomId} /></>}
          {modal.type === 'subject' && <><label>Asignatura<input name="name" defaultValue={modal.row?.name} required /></label><label>Codigo<input name="code" defaultValue={modal.row?.code} required /></label><MultiSelectField label="Cursos" name="courseIds" options={options.courses} defaultValues={modal.row?.courses?.map((item) => item.id)} /><MultiSelectField label="Secciones" name="sectionIds" options={options.sections} defaultValues={modal.row?.sections?.map((item) => item.id)} /><MultiSelectField label="Profesores" name="teacherIds" options={options.teachers} defaultValues={modal.row?.teachers?.map((item) => item.id)} /></>}
        </div>
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">Guardar</button></footer>
      </form>
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
  if (!rows.length) return <div className="admin-empty">{empty}</div>;
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

          {tab === 'users' && <AdminTable rows={filtered as AdminUserRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{roleLabels[row.role]}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'user', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('usuario', row.name, row.isActive, () => setAdminUserStatus(row.id, !row.isActive))}>{row.isActive ? <ToggleRight /> : <ToggleLeft />} {row.isActive ? 'Desactivar' : 'Activar'}</button><button onClick={() => setConfirm({ title: 'Resetear clave', message: `La clave temporal sera ${bundle.summary.temporaryPassword}.`, action: async () => { await resetAdminUserPassword(row.id); done('Clave temporal restablecida.'); } })}><KeyRound size={16} />Reset clave</button></>}</div></>} />}

          {tab === 'students' && <AdminTable rows={filtered as AdminStudentRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.course} · {row.section}</span><span>{row.guardians.length ? row.guardians.map((item) => item.name).join(', ') : 'Sin apoderado'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'student', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('estudiante', row.name, row.isActive, () => setAdminStudentStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'teachers' && <AdminTable rows={filtered as AdminTeacherRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.specialty}</span><span>{row.subjects.map((item) => item.name).join(', ') || 'Sin asignaturas'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'teacher', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('profesor', row.name, row.isActive, () => setAdminTeacherStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'guardians' && <AdminTable rows={filtered as AdminGuardianRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.email}</small></div><span>{row.phone || 'Sin telefono'}</span><span>{row.students.map((item) => item.name).join(', ') || 'Sin estudiantes'}</span><StatusBadge active={row.isActive} /><div className="admin-row-actions">{canManage && <><button onClick={() => setModal({ type: 'guardian', mode: 'edit', row })}><Edit3 size={16} />Editar</button><button onClick={() => statusAction('apoderado', row.name, row.isActive, () => setAdminGuardianStatus(row.id, !row.isActive))}>{row.isActive ? 'Desactivar' : 'Activar'}</button></>}</div></>} />}

          {tab === 'courses' && <AdminTable rows={filtered as Array<AdminCourseRow | AdminSectionRow>} render={(row) => 'level' in row ? <><div><strong>{row.name}</strong><small>Curso · {row.level}</small></div><span>{row.sections} secciones</span><span>{row.students} estudiantes</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'course', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></> : <><div><strong>{row.name}</strong><small>Seccion · {row.course}</small></div><span>{row.teacher}</span><span>{row.classroom} · {row.students} estudiantes</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'section', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></>} />}

          {tab === 'subjects' && <AdminTable rows={filtered as AdminSubjectRow[]} render={(row) => <><div><strong>{row.name}</strong><small>{row.code}</small></div><span>{row.teachers.map((item) => item.name).join(', ') || 'Sin profesor'}</span><span>{row.sections.map((item) => `${item.course} ${item.name}`).join(', ') || 'Sin seccion'}</span><div className="admin-row-actions">{canManage && <button onClick={() => setModal({ type: 'subject', mode: 'edit', row })}><Edit3 size={16} />Editar</button>}</div></>} />}

          {tab === 'assignments' && <AssignmentsPanel options={options} onSaved={done} />}
        </main>
      </section>

      {modal && <EntityModal modal={modal} options={options} onClose={() => setModal(null)} onSaved={done} />}
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
