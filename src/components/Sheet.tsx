import { type ReactNode, useEffect, useRef } from 'react';

/** Bottom sheet dengan <dialog> bawaan (fokus, Esc, backdrop). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-xl rounded-t-xl bg-surface p-0 text-ink backdrop:bg-ink/55"
    >
      <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
