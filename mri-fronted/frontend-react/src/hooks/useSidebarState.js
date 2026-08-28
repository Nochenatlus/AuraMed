import { useCallback, useEffect, useState } from 'react';

const COLLAPSE_KEY = 'auramed_sidebar_collapsed';

/** Sidebar daralt/genişlet durumu (kalıcı) + mobilde kayar panel + Ctrl/Cmd+B kısayolu. */
export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleCollapse]);

  return { collapsed, toggleCollapse, mobileOpen, setMobileOpen };
}
