import PDFDocument from 'pdfkit';
import type { JwtUser } from '../auth/auth.types.js';
import { HttpError } from '../../shared/http-error.js';
import { ReportsRepository } from './reports.repository.js';

const repository = new ReportsRepository();

type ReportResult = { buffer: Buffer; filename: string };

function toDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function sanitizeFilename(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function weightedAverage(grades: Array<{ score: number | null; status: string; assessment: { weight: number } }>) {
  const scored = grades.filter((grade) => grade.status === 'con_nota' && grade.score !== null);
  const total = scored.reduce((sum, grade) => sum + Number(grade.score) * grade.assessment.weight, 0);
  const weights = scored.reduce((sum, grade) => sum + grade.assessment.weight, 0);
  return weights ? Number((total / weights).toFixed(1)) : null;
}

function attendanceSummary(records: Array<{ status: string }>) {
  const presente = records.filter((item) => item.status === 'presente').length;
  const ausente = records.filter((item) => item.status === 'ausente').length;
  const atrasado = records.filter((item) => item.status === 'atrasado').length;
  const total = records.length || 1;
  return { presente, ausente, atrasado, percentage: Math.round((presente / total) * 100) };
}

function addInfoRow(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.rect(x, y, width, 24).stroke('#d1d5db');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151').text(label, x + 8, y + 7, { width: 100 });
  doc.font('Helvetica').fillColor('#111827').text(value, x + 115, y + 7, { width: width - 123 });
}

function addTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc.fillColor('#f3f4f6').rect(50, y, 500, 26).fill();
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
  doc.text('Asignatura', 60, y + 8, { width: 210 });
  doc.text('Evaluaciones', 285, y + 8, { width: 100, align: 'center' });
  doc.text('Promedio', 420, y + 8, { width: 100, align: 'right' });
  doc.strokeColor('#d1d5db').rect(50, y, 500, 26).stroke();
}

function buildPdf(input: {
  studentName: string;
  rut: string;
  course: string;
  section: string;
  year: number;
  period: string;
  headTeacher: string;
  subjects: Array<{ subject: string; count: number; average: number | null }>;
  attendance: { presente: number; ausente: number; atrasado: number; percentage: number };
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(17).fillColor('#111827').text('Sistema de Intranet Colegio', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(20).text('Informe de Calificaciones', { align: 'center' });
    doc.moveDown(1.2);

    const startY = doc.y;
    addInfoRow(doc, 'Nombre', input.studentName, 50, startY, 250);
    addInfoRow(doc, 'RUT', input.rut, 300, startY, 250);
    addInfoRow(doc, 'Curso', input.course, 50, startY + 24, 250);
    addInfoRow(doc, 'Seccion', input.section, 300, startY + 24, 250);
    addInfoRow(doc, 'Ano escolar', String(input.year), 50, startY + 48, 250);
    addInfoRow(doc, 'Periodo', input.period, 300, startY + 48, 250);
    addInfoRow(doc, 'Profesor jefe', input.headTeacher, 50, startY + 72, 500);

    let y = startY + 125;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text('Calificaciones', 50, y);
    y += 24;
    addTableHeader(doc, y);
    y += 26;

    if (!input.subjects.length) {
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Sin calificaciones registradas para el periodo seleccionado.', 60, y + 10);
      y += 38;
    } else {
      input.subjects.forEach((row) => {
        doc.strokeColor('#e5e7eb').rect(50, y, 500, 26).stroke();
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(row.subject, 60, y + 8, { width: 210 });
        doc.text(String(row.count), 285, y + 8, { width: 100, align: 'center' });
        doc.font('Helvetica-Bold').fillColor(row.average !== null && row.average < 4 ? '#b91c1c' : '#111827').text(row.average === null ? '-' : row.average.toFixed(1), 420, y + 8, { width: 100, align: 'right' });
        y += 26;
      });
    }

    y += 28;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text('Resumen de asistencia', 50, y);
    y += 24;
    doc.font('Helvetica').fontSize(11).fillColor('#111827')
      .text(`Presente ${input.attendance.percentage}%`, 60, y)
      .text(`Ausente ${input.attendance.ausente}`, 220, y)
      .text(`Atrasado ${input.attendance.atrasado}`, 360, y);

    doc.fontSize(8).fillColor('#6b7280');
    doc.text(`Generado el ${new Intl.DateTimeFormat('es-CL').format(new Date())}`, 50, 745, { width: 250 });
    doc.text('Documento no oficial - solo para uso interno', 300, 745, { width: 250, align: 'right' });
    doc.end();
  });
}

export class ReportsService {
  async studentReportCard(user: JwtUser, requestedStudentId: string, periodId?: string): Promise<ReportResult> {
    const studentId = requestedStudentId === 'me' ? (await repository.findStudentByUser(user.id))?.id : requestedStudentId;
    if (!studentId) throw new HttpError(404, 'Estudiante no encontrado.');

    const [student, period] = await Promise.all([
      repository.findStudentReportData(studentId, periodId),
      periodId ? repository.findPeriod(periodId) : Promise.resolve(null)
    ]);
    if (!student) throw new HttpError(404, 'Estudiante no encontrado.');
    if (periodId && !period) throw new HttpError(404, 'Periodo academico no encontrado.');

    const enrollment = student.enrollments[0];
    if (!enrollment) throw new HttpError(404, 'El estudiante no tiene matricula activa.');

    const isSelf = student.userId === user.id;
    const isGuardian = student.guardians.some((item) => item.guardian.userId === user.id);
    const isSectionTeacher = enrollment.section.headTeacher?.userId === user.id || enrollment.section.schedules.some((schedule) => schedule.teacher.userId === user.id);
    const isManager = user.roles.some((role) => ['admin', 'director'].includes(role));
    if (!isSelf && !isGuardian && !isSectionTeacher && !isManager) throw new HttpError(403, 'No tienes permisos para descargar este boletin.');

    const attendanceRecords = period
      ? student.attendance.filter((record) => record.date >= period.startDate && record.date <= period.endDate)
      : student.attendance;
    const bySubject = new Map<string, { subject: string; grades: typeof student.grades }>();
    student.grades.forEach((grade) => {
      const current = bySubject.get(grade.assessment.subjectId) ?? { subject: grade.assessment.subject.name, grades: [] };
      current.grades.push(grade);
      bySubject.set(grade.assessment.subjectId, current);
    });
    const subjects = Array.from(bySubject.values()).map((item) => ({
      subject: item.subject,
      count: item.grades.length,
      average: weightedAverage(item.grades)
    })).sort((a, b) => a.subject.localeCompare(b.subject));

    const year = period?.year ?? enrollment.year;
    const periodName = period?.name ?? 'Todos los periodos';
    const buffer = await buildPdf({
      studentName: student.user.name,
      rut: student.rut,
      course: enrollment.section.course.name,
      section: enrollment.section.name,
      year,
      period: periodName,
      headTeacher: enrollment.section.headTeacher?.user.name ?? 'Sin asignar',
      subjects,
      attendance: attendanceSummary(attendanceRecords)
    });
    const filename = `boletin-${sanitizeFilename(student.user.name)}-${sanitizeFilename(periodName)}.pdf`;
    return { buffer, filename };
  }
}
