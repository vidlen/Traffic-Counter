import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { t } from '../i18n/id';

export function AppBar({
  title,
  backTo = '/',
  right,
}: {
  title: string;
  backTo?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-1 px-2">
        <Link
          to={backTo}
          className="btn btn-ghost min-h-11 w-11 px-0 text-xl"
          aria-label={t.common.back}
        >
          ←
        </Link>
        <h1 className="flex-1 truncate text-lg font-semibold tracking-tight">{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
