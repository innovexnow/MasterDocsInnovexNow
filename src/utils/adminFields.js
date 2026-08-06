export const relationFields = {
  parent_id: { table: 'menus', label: 'title' },
  page_id: { table: 'pages', label: 'title' },
  section_id: { table: 'sections', label: 'title' },
  card_id: { table: 'content_cards', label: 'title' },
  diagram_id: { table: 'architecture_diagrams', label: 'title' },
  source_node_id: { table: 'architecture_nodes', label: 'title' },
  target_node_id: { table: 'architecture_nodes', label: 'title' },
  application_id: { table: 'api_applications', label: 'name' },
  module_id: { table: 'api_modules', label: 'title' },
  milestone_id: { table: 'milestones', label: 'title' },
};

const fieldOptions = {
  audience: ['public', 'authenticated', 'admin'],
  layout_type: ['full_width', 'centered', 'sidebar_left', 'sidebar_right', 'grid', 'stacked', 'horizontal', 'vertical', 'flow'],
  section_type: ['hero_banner', 'cards_grid', 'architecture_diagram', 'table', 'code_block', 'markdown', 'rich_text', 'image_gallery', 'download_list', 'accordion', 'timeline', 'faq', 'api_collection', 'credentials_vault', 'environment_variables', 'url_list', 'badge_list'],
  direction: ['forward', 'backward', 'bidirectional'],
  connection_type: ['http', 'event', 'data', 'dependency', 'default'],
  auth_requirement: ['none', 'bearer', 'api_key', 'basic', 'oauth2'],
  method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  visibility: ['true', 'false'],
};

const resourceOptions = {
  'menus.status': ['active', 'inactive', 'draft', 'archived'],
  'pages.status': ['active', 'inactive', 'draft', 'archived'],
  'milestones.status': ['not_started', 'in_progress', 'completed', 'blocked'],
  'tasks.status': ['todo', 'in_progress', 'testing', 'done', 'cancelled'],
  'tasks.priority': ['low', 'medium', 'high', 'critical'],
  'environments.type': ['production', 'qa', 'development', 'staging', 'local'],
};

export function getFieldOptions(resource, field) {
  return resourceOptions[`${resource}.${field}`] || fieldOptions[field] || null;
}

export function validateArchitectureConnection(connection, nodeCount) {
  if (nodeCount < 2) return 'Add at least two nodes before creating a connection.';
  if (!connection.source_node_id || !connection.target_node_id) return 'Select both a source and a target node.';
  if (connection.source_node_id === connection.target_node_id) return 'Source and target must be different nodes.';
  return '';
}
