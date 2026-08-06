import { z } from 'zod';

export const menuSchema = z.object({
  id: z.string().uuid().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  page_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200),
  route: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  audience: z.enum(['public', 'authenticated', 'admin']).default('public'),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).default('active'),
  visibility: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  permission: z.string().default('view'),
  metadata: z.record<string, unknown>().optional(),
});

export const menuUpdateSchema = menuSchema.partial();

export type MenuInput = z.infer<typeof menuSchema>;
export type MenuUpdate = z.infer<typeof menuUpdateSchema>;