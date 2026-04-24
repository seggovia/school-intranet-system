import { z } from 'zod';

export const createAttendanceSchema = z.object({
  enrollmentId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  date: z.coerce.date(),
  status: z.enum(['presente', 'ausente', 'atrasado', 'justificado']),
  note: z.string().trim().max(240).optional()
});

export const bulkAttendanceSchema = z.object({
  date: z.coerce.date(),
  records: z.array(z.object({
    enrollmentId: z.string().trim().min(1),
    studentId: z.string().trim().min(1),
    status: z.enum(['presente', 'ausente', 'atrasado', 'justificado']),
    note: z.string().trim().max(240).optional()
  })).min(1)
});

export const updateAttendanceSchema = z.object({
  status: z.enum(['presente', 'ausente', 'atrasado', 'justificado']),
  note: z.string().trim().max(240).optional()
});

export const attendanceIdParamSchema = z.object({
  id: z.string().trim().min(1)
});
