import { z } from 'zod';

export const pageSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  layout_type: z.enum(['full_width', 'centered', 'sidebar_left', 'sidebar_right', 'grid', 'stacked']).default('full_width'),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).default('draft'),
  visibility: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  metadata: z.record<string, unknown>().optional(),
});

export const pageUpdateSchema = pageSchema.partial();

export type PageInput = z.infer<typeof pageSchema>;
export type PageUpdate = z.infer<typeof pageUpdateSchema>;
