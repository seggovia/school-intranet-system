import { z } from 'zod';

export const userPreferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  language: z.enum(['es', 'en']),
  notifications: z.object({
    email: z.boolean(),
    academic: z.boolean(),
    tickets: z.boolean()
  })
});

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
