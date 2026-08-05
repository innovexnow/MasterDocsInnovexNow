import { supabase } from '../lib/supabase.js';

function client() {
  if (!supabase) throw new Error('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  return supabase;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data ?? [];
}

export async function getNavigation() {
  return unwrap(await client().from('menus').select('*, pages(id,slug,title)').eq('visibility', true).eq('status', 'active').order('sort_order'));
}

export async function getPage(slug) {
  const page = unwrap(await client().from('pages').select('*').eq('slug', slug).eq('visibility', true).maybeSingle());
  if (!page?.id) return null;
  const sections = unwrap(await client().from('sections').select('*, cards(*), dynamic_tables(*), architecture_diagrams(*), section_items(*)').eq('page_id', page.id).eq('visibility', true).order('sort_order'));
  return { ...page, sections };
}

export async function searchContent(query) {
  const term = query.trim();
  if (!term) return [];
  const [pages, endpoints, downloads] = await Promise.all([
    client().from('pages').select('id,title,slug,description').or(`title.ilike.%${term}%,description.ilike.%${term}%`).limit(8),
    client().from('api_endpoints').select('id,title,endpoint,method,description').or(`title.ilike.%${term}%,endpoint.ilike.%${term}%`).limit(8),
    client().from('downloads').select('id,title,description,file_url').or(`title.ilike.%${term}%,description.ilike.%${term}%`).limit(8),
  ]);
  return [...unwrap(pages).map((x) => ({ ...x, kind: 'Page' })), ...unwrap(endpoints).map((x) => ({ ...x, kind: 'API' })), ...unwrap(downloads).map((x) => ({ ...x, kind: 'Download' }))];
}

export async function adminList(table) {
  const ordered = new Set(['menus', 'pages', 'sections', 'cards', 'api_modules', 'api_endpoints', 'downloads', 'environments', 'tasks']);
  let query = client().from(table).select('*');
  if (ordered.has(table)) query = query.order('sort_order', { ascending: true });
  else if (table === 'settings') query = query.order('updated_at', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  return unwrap(await query);
}

export async function saveRecord(table, record) {
  const payload = Object.fromEntries(Object.entries(record).filter(([, value]) => value !== ''));
  return unwrap(await client().from(table).upsert(payload).select().single());
}

export async function deleteRecord(table, id) {
  unwrap(await client().from(table).delete().eq('id', id));
}

export async function uploadFile(file, category = 'other') {
  const db = client();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${crypto.randomUUID()}/${safeName}`;
  const { error: uploadError } = await db.storage.from('media').upload(path, file);
  if (uploadError) throw uploadError;
  const { data: urlData } = db.storage.from('media').getPublicUrl(path);
  return saveRecord('files', { name: safeName, original_name: file.name, path, bucket: 'media', category, mime_type: file.type, size_bytes: file.size, metadata: { public_url: urlData.publicUrl } });
}

export async function signIn(email, password) {
  return unwrap(await client().auth.signInWithPassword({ email, password }));
}

export async function signOut() {
  return unwrap(await client().auth.signOut());
}
