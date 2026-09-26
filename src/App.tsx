import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { Outlet, useMatch } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Toasts } from './components/Toasts';
import { useSessionEngine } from './hooks/useCounterSession';
import { useSettings } from './hooks/useSettings';
import { t } from './i18n/id';
import { db } from './lib/db';
import { useUi } from './store';

// Kerangka semua halaman: service worker (update hanya lewat banner di Beranda),
// mesin interval sesi aktif, tema, banner Mode uji, pemberitahuan pemulihan, toast.
export function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const setUpdate = useUi((s) => s.setUpdate);
  const settings = useSettings();
  const testActive = useLiveQuery(() =>
    db.sessions
      .where('status')
      .anyOf('BERJALAN', 'MENUNGGU')
      .filter((s) => s.testMode)
      .count(),
  );
  useSessionEngine();
  // Layar hitung punya badge MODE UJI sendiri di bar atas.
  const counter = useMatch('/sesi/:id');
  const onCounter = !!counter && counter.params.id !== 'baru';

  useEffect(() => {
    setUpdate(needRefresh, () => void updateServiceWorker(true));
  }, [needRefresh, updateServiceWorker, setUpdate]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme === 'GELAP' ? 'dark' : 'light';
  }, [settings.theme]);

  return (
    <>
      <Outlet />
      {(settings.testMode || !!testActive) && !onCounter && (
        <div className="pointer-events-none fixed top-[env(safe-area-inset-top)] left-1/2 z-50 -translate-x-1/2 rounded-b-lg bg-danger px-3 py-0.5 text-xs font-bold tracking-[0.2em] text-canvas">
          {t.counter.testBanner}
        </div>
      )}
      <Notice />
      <Toasts />
    </>
  );
}

function Notice() {
  const { notice, setNotice } = useUi();
  if (!notice) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-40 mx-auto max-w-xl px-3"
    >
      <div className="rounded-xl border border-ink/20 bg-terputus p-4 text-ink shadow-[0_12px_32px_rgb(23_25_27/0.25)]">
        <p className="font-medium">{notice}</p>
        <button className="btn btn-primary mt-3 w-full" onClick={() => setNotice(null)}>
          {t.counter.dismiss}
        </button>
      </div>
    </div>
  );
}
