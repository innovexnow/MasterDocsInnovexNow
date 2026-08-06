import { z } from 'zod';

export const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  page_id: z.string().uuid(),
  section_type: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  layout_type: z.enum(['full_width', 'centered', 'sidebar_left', 'sidebar_right', 'grid', 'stacked']).default('full_width'),
  content_json: z.record<string, unknown>().optional(),
  metadata: z.record<string, unknown>().optional(),
  sort_order: z.number().int().default(0),
  visibility: z.boolean().default(true),
});

export const sectionUpdateSchema = sectionSchema.partial();

export type SectionInput = z.infer<typeof sectionSchema>;
export type SectionUpdate = z.infer<typeof sectionUpdateSchema>;
