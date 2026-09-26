import { Link } from 'react-router';
import { BrandMark } from '../components/BrandMark';
import { t } from '../i18n/id';
import { useUi } from '../store';

export function Home() {
  const { updateReady, applyUpdate } = useUi();
  return (
    <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <BrandMark className="size-11" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{t.app.name}</h1>
          <p className="truncate text-sm text-muted">{t.app.tagline}</p>
        </div>
      </header>

      {updateReady && (
        <div className="card mt-6 flex items-center justify-between gap-3 p-3 pl-4">
          <p className="font-medium">{t.pwa.updateReady}</p>
          <button className="btn btn-accent" onClick={applyUpdate}>
            {t.pwa.reload}
          </button>
        </div>
      )}

      <button className="btn btn-primary mt-6 h-16 w-full text-lg" disabled>
        <span className="text-2xl leading-none text-accent">+</span>
        {t.home.newSession}
      </button>

      <section className="mt-8 rounded-xl border border-dashed border-line-strong px-5 py-8 text-center">
        <h2 className="font-semibold">{t.home.emptyTitle}</h2>
        <p className="mx-auto mt-1 max-w-[32ch] text-sm text-muted">{t.home.emptyBody}</p>
      </section>

      <nav className="card mt-8 divide-y divide-line">
        {[
          ['/klasifikasi', t.nav.classifications],
          ['/pengaturan', t.nav.settings],
          ['/panduan-install', t.nav.install],
        ].map(([to, label]) => (
          <Link key={to} to={to} className="flex min-h-14 items-center justify-between px-4">
            <span className="font-medium">{label}</span>
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
