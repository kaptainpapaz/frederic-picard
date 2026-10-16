/**
 * Schémas des formulaires publics. Règle H3 : les messages sont des CLÉS de traduction,
 * résolues côté client par le composant qui affiche l'erreur.
 */
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'forms.errors.required').max(120, 'forms.errors.tooLong'),
  email: z.string().trim().email('forms.errors.email'),
  subject: z.string().trim().min(1, 'forms.errors.required').max(80, 'forms.errors.tooLong'),
  message: z.string().trim().min(10, 'forms.errors.tooShort').max(4000, 'forms.errors.tooLong'),
  // Champ invisible anti-robot : doit rester vide.
  website: z.string().max(0, 'forms.errors.spam').optional(),
})
export type ContactInput = z.infer<typeof contactSchema>

export const orderSchema = z.object({
  tirageId: z.string().min(1, 'forms.errors.required'),
  name: z.string().trim().min(1, 'forms.errors.required').max(120, 'forms.errors.tooLong'),
  email: z.string().trim().email('forms.errors.email'),
  message: z.string().trim().max(2000, 'forms.errors.tooLong'),
  website: z.string().max(0, 'forms.errors.spam').optional(),
})
export type OrderInput = z.infer<typeof orderSchema>

/** Transforme les erreurs Zod en { champ: cléDeTraduction }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
