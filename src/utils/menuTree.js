export function buildMenuTree(menus, parentId = null) {
  return menus
    .filter((menu) => (menu.parent_id ?? null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((menu) => ({ ...menu, children: buildMenuTree(menus, menu.id) }));
}
