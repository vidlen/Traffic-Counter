import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Toasts } from './components/Toasts';
import { useUi } from './store';

// Kerangka semua halaman: registrasi service worker (update hanya lewat banner di Beranda).
export function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const setUpdate = useUi((s) => s.setUpdate);

  useEffect(() => {
    setUpdate(needRefresh, () => void updateServiceWorker(true));
  }, [needRefresh, updateServiceWorker, setUpdate]);

  return (
    <>
      <Outlet />
      <Toasts />
    </>
  );
}
