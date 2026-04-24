import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  status: z.enum(['vigente', 'revision', 'archivado']).default('vigente'),
  fileUrl: z.string().trim().url().optional()
});

export const createDocumentCategorySchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const createSubjectMaterialSchema = z.object({
  subjectId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(160),
  fileUrl: z.string().trim().url().optional()
});
