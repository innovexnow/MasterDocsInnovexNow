import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { buildMenuTree } from '../../utils/menuTree.js';
import type { Database } from '../../types/database';

type MenuRow = Database['public']['Tables']['menus']['Row'];

function Branch({ item, depth = 0 }: { item: MenuRow; depth?: number }) {
  const target = item.route || `/docs/${item.page?.slug || item.slug}`;
  return (
    <>
      <Link
        className="nav-item dynamic-nav"
        style={{ paddingLeft: 20 + depth * 16 }}
        to={target}
      >
        <span className="icon">{item.icon || '📄'}</span>
        <span className="nav-text">{item.title}</span>
      </Link>
      {item.children.map((child) => (
        <Branch key={child.id} item={child} depth={depth + 1} />
      ))}
    </>
  );
}

interface DynamicSidebarProps {
  menus?: MenuRow[];
  settings?: Record<string, unknown>;
}

export default function DynamicSidebar({
  menus: menusProp,
  settings: settingsProp,
}: DynamicSidebarProps) {
  const tree = useMemo(
    () => buildMenuTree(menusProp ?? []),
    [menusProp]
  );

  const settings = settingsProp ?? {};

  return (
    <nav className="sidebar">
      <h1>
        ⬡ {settings.site_name || 'RestroDocs'}{' '}
        <span>{settings.version_badge || 'v2.0'}</span>
      </h1>
      <div className="db-status">
        <span className="sync-dot online" />
        <span>{settings.database_status_label || 'DB: Supabase'}</span>
      </div>

      {tree.map((item) => (
        <Branch key={item.id} item={item} />
      ))}
    </nav>
  );
}
