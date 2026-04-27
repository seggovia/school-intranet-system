import { z } from 'zod';

export const attendanceStatusSchema = z.enum(['presente', 'ausente', 'atrasado', 'justificado']);

export const attendanceRecordsQuerySchema = z.object({
  sectionId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  date: z.coerce.date()
});

export const bulkAttendanceSchema = z.object({
  sectionId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  date: z.coerce.date(),
  records: z.array(z.object({
    studentId: z.string().trim().min(1),
    status: attendanceStatusSchema,
    note: z.string().trim().max(240).optional().or(z.literal('').transform(() => undefined))
  })).min(1)
});
