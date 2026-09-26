import { useUi } from '../store';

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((x) => (
        <div
          key={x.id}
          className={`max-w-md rounded-xl px-4 py-3 text-center text-base font-semibold shadow-[0_8px_24px_rgb(23_25_27/0.18)] ${
            x.tone === 'danger' ? 'bg-danger text-canvas' : 'bg-ink text-canvas'
          }`}
        >
          {x.text}
        </div>
      ))}
    </div>
  );
}
