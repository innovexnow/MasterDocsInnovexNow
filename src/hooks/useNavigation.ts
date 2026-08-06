import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { buildMenuTree } from '../utils/menuTree.js';
import type { Database } from '../types/database';

type MenuRow = Database['public']['Tables']['menus']['Row'];
type SettingsRow = Database['public']['Tables']['settings']['Row'];

interface NavigationData {
  menus: MenuRow[];
  menuTree: MenuRow[];
  settings: Record<string, unknown>;
  loading: boolean;
  error: string | null;
}

export function useNavigation() {
  const [data, setData] = useState<NavigationData>({
    menus: [],
    menuTree: [],
    settings: {},
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
      const [menusResult, settingsResult] = await Promise.all([
        supabase
          .from('menus')
          .select('*, page:pages!menus_page_id_fkey(id,slug,title)')
          .eq('visibility', true)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('sort_order'),
        supabase
          .from('settings')
          .select('key,value')
          .in('key', [
            'site_name',
            'site_description',
            'version_badge',
            'database_status_label',
            'footer_text',
            'default_theme',
            'maintenance_mode',
            'logo',
            'favicon',
          ]),
      ]);

      if (menusResult.error) throw menusResult.error;
      if (settingsResult.error) throw settingsResult.error;

      const settings = Object.fromEntries(
        settingsResult.data.map((row) => [row.key, row.value])
      );

      const menus = menusResult.data ?? [];
      const menuTree = buildMenuTree(menus);

      setData({
        menus,
        menuTree,
        settings,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setData((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, refetch: load };
}