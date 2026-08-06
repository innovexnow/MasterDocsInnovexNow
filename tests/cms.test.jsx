import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SectionRenderer from '../src/components/SectionRenderer.jsx';
import { buildMenuTree } from '../src/utils/menuTree.js';
import ArchitectureWorkspace from '../src/components/architecture/ArchitectureWorkspace.jsx';
import { vi } from 'vitest';
import { getFieldOptions, relationFields, validateArchitectureConnection } from '../src/utils/adminFields.js';

vi.mock('../src/services/cms.js', async () => {
  const actual = await vi.importActual('../src/services/cms.js');
  return { ...actual, getArchitectureCatalog: vi.fn().mockResolvedValue([]) };
});

describe('dynamic CMS primitives', () => {
  it('creates unlimited ordered menu nesting without mutating records', () => {
    const menus = [
      { id: 'child', parent_id: 'root', title: 'Child', sort_order: 0 },
      { id: 'second', parent_id: null, title: 'Second', sort_order: 2 },
      { id: 'root', parent_id: null, title: 'Root', sort_order: 1 },
      { id: 'grandchild', parent_id: 'child', title: 'Grandchild', sort_order: 0 },
    ];
    const tree = buildMenuTree(menus);
    expect(tree.map((item) => item.id)).toEqual(['root', 'second']);
    expect(tree[0].children[0].children[0].id).toBe('grandchild');
    expect(menus[0]).not.toHaveProperty('children');
  });

  it('renders a configured section from content JSON', () => {
    render(<SectionRenderer section={{ id: 'one', title: 'Notice', section_type: 'notice', content_json: { text: 'Database-driven message' } }}/>);
    expect(screen.getByText('Database-driven message')).toBeInTheDocument();
  });

  it('handles unknown section types without breaking the page', () => {
    render(<SectionRenderer section={{ id: 'two', title: 'Future block', section_type: 'future_block', content_json: {} }}/>);
    expect(screen.getByText(/Unsupported section type/)).toBeInTheDocument();
  });

  it('shows a useful architecture preview when the database is empty', async () => {
    render(<ArchitectureWorkspace/>);
    expect(await screen.findByRole('heading', { name: 'No architecture sections yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Architecture Builder' })).toHaveAttribute('href', '/admin/architecture');
  });

  it('prevents invalid architecture connections before they reach PostgreSQL', () => {
    expect(validateArchitectureConnection({ source_node_id: 'one', target_node_id: 'one' }, 2)).toMatch(/different nodes/i);
    expect(validateArchitectureConnection({ source_node_id: 'one', target_node_id: 'two' }, 2)).toBe('');
    expect(validateArchitectureConnection({}, 1)).toMatch(/at least two nodes/i);
  });

  it('uses record selectors for UUID relationship fields', () => {
    expect(relationFields.parent_id).toEqual({ table: 'menus', label: 'title' });
    expect(relationFields.page_id).toEqual({ table: 'pages', label: 'title' });
    expect(relationFields.source_node_id.table).toBe('architecture_nodes');
  });

  it('provides safe controlled choices for CMS enum fields', () => {
    expect(getFieldOptions('menus', 'audience')).toContain('public');
    expect(getFieldOptions('api_endpoints', 'method')).toContain('PATCH');
    expect(getFieldOptions('tasks', 'status')).toContain('in_progress');
  });
});
