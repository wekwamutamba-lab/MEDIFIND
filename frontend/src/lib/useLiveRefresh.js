import { useEffect, useRef } from 'react';

// Keeps a page's figures up to date while it is open: calls refresh() every `ms`
// while the tab is visible, and straight away when someone comes back to the tab.
// So a sale made on New Sale (on this or another computer) shows on the dashboard
// and Sales charts without reloading the page.
export default function useLiveRefresh(refresh, ms = 30000) {
  const fn = useRef(refresh);
  const last = useRef(0);

  useEffect(() => {
    fn.current = refresh;
  });

  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      // coming back to the tab fires two events; refresh once
      if (Date.now() - last.current < 3000) return;
      last.current = Date.now();
      fn.current();
    };
    const id = setInterval(run, ms);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [ms]);
}
