import { useEffect, useState } from 'react';
import { fetchPublicMenu } from '@/lib/supabase-menu';
import type { PublicMenu } from './menu-data';

export type MenuLoadStatus = 'loading' | 'ready' | 'error';

export function usePublicMenu() {
  const [menu, setMenu] = useState<PublicMenu>({ categories: [], dishes: [] });
  const [status, setStatus] = useState<MenuLoadStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    fetchPublicMenu(attempt > 0)
      .then((result) => {
        if (!active) return;
        setMenu(result);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Could not load the published AURELIA menu:', error);
        setMenu({ categories: [], dishes: [] });
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => setAttempt((current) => current + 1);
  return { ...menu, status, retry };
}