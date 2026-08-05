-- ============================================
-- MasterDocsInnovexNow - Database Schema
-- Supabase PostgreSQL
-- ============================================

-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'developer', 'qa', 'viewer');
CREATE TYPE permission_action AS ENUM ('view', 'edit', 'delete', 'create', 'publish', 'archive');
CREATE TYPE menu_status AS ENUM ('active', 'inactive', 'draft', 'archived');
CREATE TYPE section_type AS ENUM (
  'hero_banner', 'cards_grid', 'architecture_diagram', 'table', 'code_block',
  'markdown', 'rich_text', 'image_gallery', 'video', 'download_list',
  'accordion', 'timeline', 'faq', 'api_collection', 'credentials_vault',
  'environment_variables', 'url_list', 'badge_list'
);
CREATE TYPE layout_type AS ENUM ('full_width', 'centered', 'sidebar_left', 'sidebar_right', 'grid', 'stacked');
CREATE TYPE api_method AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');
CREATE TYPE api_auth_type AS ENUM ('none', 'bearer', 'api_key', 'basic', 'oauth2');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'testing', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE env_type AS ENUM ('production', 'qa', 'development', 'staging', 'local');
CREATE TYPE file_category AS ENUM ('image', 'pdf', 'document', 'archive', 'video', 'source_code', 'config', 'other');
CREATE TYPE activity_action AS ENUM ('create', 'update', 'delete', 'publish', 'archive', 'restore', 'login', 'upload', 'export');
CREATE TYPE credential_visibility AS ENUM ('public', 'admin_only', 'role_based');

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  bio TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the application profile atomically when Supabase creates an auth user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, email_verified)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email_confirmed_at IS NOT NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.has_role(allowed user_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ANY(allowed));
$$;

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions permission_action[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions (junction)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action permission_action NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, resource, action)
);

-- Menus (sidebar navigation)
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  route TEXT,
  icon TEXT,
  description TEXT,
  status menu_status NOT NULL DEFAULT 'active',
  visibility BOOLEAN DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  permission TEXT DEFAULT 'view',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menus_parent_id ON menus(parent_id);
CREATE INDEX idx_menus_sort_order ON menus(sort_order);
CREATE INDEX idx_menus_status ON menus(status);
CREATE INDEX idx_menus_slug ON menus(slug);

-- Pages
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  layout_type layout_type NOT NULL DEFAULT 'full_width',
  status menu_status NOT NULL DEFAULT 'draft',
  visibility BOOLEAN DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slug)
);

CREATE INDEX idx_pages_menu_id ON pages(menu_id);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);

-- Sections
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  section_type section_type NOT NULL,
  layout_type layout_type NOT NULL DEFAULT 'full_width',
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  visibility BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_page_id ON sections(page_id);
CREATE INDEX idx_sections_type ON sections(section_type);
CREATE INDEX idx_sections_sort_order ON sections(sort_order);

-- Section Items (generic content for sections)
CREATE TABLE section_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  value TEXT,
  metadata JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_section_items_section_id ON section_items(section_id);

-- Cards (for cards grid sections)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  link TEXT,
  link_type TEXT DEFAULT 'internal',
  metadata JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  visibility BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_section_id ON cards(section_id);

-- Architecture Diagrams
CREATE TABLE architecture_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]',
  connections JSONB DEFAULT '[]',
  background TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables (dynamic data tables)
CREATE TABLE dynamic_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  columns JSONB NOT NULL DEFAULT '[]',
  rows JSONB NOT NULL DEFAULT '[]',
  searchable BOOLEAN DEFAULT TRUE,
  sortable BOOLEAN DEFAULT TRUE,
  filterable BOOLEAN DEFAULT TRUE,
  pagination BOOLEAN DEFAULT TRUE,
  page_size INT DEFAULT 10,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Modules
CREATE TABLE api_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  version TEXT DEFAULT '1.0.0',
  base_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  visibility BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Endpoints
CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES api_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  method api_method NOT NULL DEFAULT 'GET',
  endpoint TEXT NOT NULL,
  authorization api_auth_type NOT NULL DEFAULT 'none',
  tags TEXT[] DEFAULT '{}',
  deprecated BOOLEAN DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_endpoints_module_id ON api_endpoints(module_id);
CREATE INDEX idx_api_endpoints_method ON api_endpoints(method);
CREATE INDEX idx_api_endpoints_endpoint ON api_endpoints(endpoint);

-- API Headers
CREATE TABLE api_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Path Params
CREATE TABLE api_path_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'string',
  description TEXT,
  required BOOLEAN DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Query Params
CREATE TABLE api_query_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'string',
  description TEXT,
  required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Request Body
CREATE TABLE api_request_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  content_type TEXT DEFAULT 'application/json',
  body JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Response Bodies
CREATE TABLE api_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  status_code INT NOT NULL,
  content_type TEXT DEFAULT 'application/json',
  body JSONB DEFAULT '{}',
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Examples
CREATE TABLE api_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  request JSONB DEFAULT '{}',
  response JSONB DEFAULT '{}',
  curl_command TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Downloads
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  version TEXT,
  category TEXT,
  platform TEXT,
  metadata JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  visibility BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credentials Vault
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  environment TEXT DEFAULT 'global',
  category TEXT,
  visibility credential_visibility NOT NULL DEFAULT 'admin_only',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Environments
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type env_type NOT NULL,
  backend_url TEXT,
  frontend_url TEXT,
  ssh_host TEXT,
  ssh_port INT DEFAULT 22,
  ssh_user TEXT,
  rds_host TEXT,
  rds_port INT,
  rds_database TEXT,
  rds_user TEXT,
  s3_bucket TEXT,
  s3_region TEXT,
  firebase_config JSONB,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  metadata JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  visibility BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files / Media
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  path TEXT NOT NULL,
  bucket TEXT DEFAULT 'media',
  category file_category DEFAULT 'other',
  mime_type TEXT,
  size_bytes BIGINT,
  width INT,
  height INT,
  alt_text TEXT,
  caption TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_bucket ON files(bucket);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page Tags (junction)
CREATE TABLE page_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, tag_id)
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action activity_action NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version History
CREATE TABLE version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_version_history_resource ON version_history(resource_type, resource_id);

-- Progress / Tasks (Kanban)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  module TEXT,
  assignee TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  eta DATE,
  version TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- System Settings (seed)
INSERT INTO settings (key, value, description, category) VALUES
  ('site_name', '"MasterDocsInnovexNow"', 'Site title', 'general'),
  ('site_description', '"Dynamic Documentation CMS"', 'Site description', 'general'),
  ('theme', '"dark"', 'UI theme', 'general'),
  ('items_per_page', '20', 'Default pagination size', 'general'),
  ('maintenance_mode', 'false', 'Maintenance mode toggle', 'general'),
  ('default_role', '"viewer"', 'Default role for new users', 'auth');

-- Default Roles
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin', 'Full system access', ARRAY['view','edit','delete','create','publish','archive'], TRUE),
  ('00000000-0000-0000-0000-000000000002', 'admin', 'Administrative access', ARRAY['view','edit','delete','create','publish','archive'], TRUE),
  ('00000000-0000-0000-0000-000000000003', 'developer', 'Developer access', ARRAY['view','edit','create'], TRUE),
  ('00000000-0000-0000-0000-000000000004', 'qa', 'QA access', ARRAY['view','edit'], TRUE),
  ('00000000-0000-0000-0000-000000000005', 'viewer', 'Read-only access', ARRAY['view'], TRUE);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_path_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_query_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Public read for active content
CREATE POLICY "Public can view active menus" ON menus FOR SELECT USING (status = 'active' AND visibility = TRUE);
CREATE POLICY "Public can view active pages" ON pages FOR SELECT USING (status = 'active' AND visibility = TRUE);
CREATE POLICY "Public can view active sections" ON sections FOR SELECT USING (visibility = TRUE);
CREATE POLICY "Public can view active cards" ON cards FOR SELECT USING (visibility = TRUE);
CREATE POLICY "Public can view active downloads" ON downloads FOR SELECT USING (visibility = TRUE);
CREATE POLICY "Public can view active environments" ON environments FOR SELECT USING (visibility = TRUE);
CREATE POLICY "Public can view active api modules" ON api_modules FOR SELECT USING (visibility = TRUE);
CREATE POLICY "Public can view active api endpoints" ON api_endpoints FOR SELECT USING (TRUE);
CREATE POLICY "Public can view active tasks" ON tasks FOR SELECT USING (TRUE);
CREATE POLICY "Public can view safe section items" ON section_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM sections s WHERE s.id = section_id AND s.visibility = TRUE AND s.section_type <> 'credentials_vault')
);
CREATE POLICY "Public can view dynamic tables" ON dynamic_tables FOR SELECT USING (
  EXISTS (SELECT 1 FROM sections s WHERE s.id = section_id AND s.visibility = TRUE)
);
CREATE POLICY "Public can view architecture diagrams" ON architecture_diagrams FOR SELECT USING (
  EXISTS (SELECT 1 FROM sections s WHERE s.id = section_id AND s.visibility = TRUE)
);
CREATE POLICY "Public can view api details" ON api_headers FOR SELECT USING (TRUE);
CREATE POLICY "Public can view api path params" ON api_path_params FOR SELECT USING (TRUE);
CREATE POLICY "Public can view api query params" ON api_query_params FOR SELECT USING (TRUE);
CREATE POLICY "Public can view api request bodies" ON api_request_bodies FOR SELECT USING (TRUE);
CREATE POLICY "Public can view api responses" ON api_responses FOR SELECT USING (TRUE);
CREATE POLICY "Public can view api examples" ON api_examples FOR SELECT USING (TRUE);

-- Admin full access
CREATE POLICY "Admins can manage menus" ON menus FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage pages" ON pages FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage sections" ON sections FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage cards" ON cards FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage downloads" ON downloads FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage credentials" ON credentials FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage environments" ON environments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage api" ON api_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage api endpoints" ON api_endpoints FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage files" ON files FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage tasks" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- Admin access for all page-builder and governance resources.
CREATE POLICY "Admins can manage section items" ON section_items FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage dynamic tables" ON dynamic_tables FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage diagrams" ON architecture_diagrams FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage api headers" ON api_headers FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage api path params" ON api_path_params FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage api query params" ON api_query_params FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage api request bodies" ON api_request_bodies FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage api responses" ON api_responses FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage api examples" ON api_examples FOR ALL USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can manage roles" ON roles FOR ALL USING (public.has_role(ARRAY['super_admin']::user_role[]));
CREATE POLICY "Admins can view activity" ON activity_logs FOR SELECT USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can view audits" ON audit_logs FOR SELECT USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can view versions" ON version_history FOR SELECT USING (public.has_role(ARRAY['super_admin','admin']::user_role[]));

-- Creation rights use the application role, not Supabase's JWT role
-- (auth.role() only returns "authenticated" or "anon").
CREATE POLICY "Editors can create menus" ON menus FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));
CREATE POLICY "Editors can create pages" ON pages FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));
CREATE POLICY "Editors can create sections" ON sections FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));
CREATE POLICY "Editors can create cards" ON cards FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));
CREATE POLICY "Editors can create downloads" ON downloads FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));
CREATE POLICY "Admins can create credentials" ON credentials FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Admins can create environments" ON environments FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin']::user_role[]));
CREATE POLICY "Editors can create api" ON api_modules FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));
CREATE POLICY "Editors can create files" ON files FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));
CREATE POLICY "Editors can create tasks" ON tasks FOR INSERT WITH CHECK (public.has_role(ARRAY['super_admin','admin','developer']::user_role[]));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

-- Supabase Storage bucket used by the CMS file manager.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', TRUE, 104857600)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read documentation media" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Editors can upload documentation media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media' AND public.has_role(ARRAY['super_admin','admin','developer']::user_role[])
);

CREATE POLICY "Admins can update documentation media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'media' AND public.has_role(ARRAY['super_admin','admin']::user_role[])
);

CREATE POLICY "Admins can delete documentation media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media' AND public.has_role(ARRAY['super_admin','admin']::user_role[])
);
