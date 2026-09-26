import { useRef, useState } from 'react';

/** Tombol yang harus ditahan `ms` milidetik (mencegah selesai sesi tidak sengaja). */
export function HoldButton({
  label,
  onDone,
  ms = 2000,
}: {
  label: string;
  onDone: () => void;
  ms?: number;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = () => {
    clearTimeout(timer.current);
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      onDone();
    }, ms);
  };
  const cancel = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };
  return (
    <button
      type="button"
      className="btn btn-danger relative h-14 w-full overflow-hidden"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && start()}
      onKeyUp={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-ink/30"
        style={{
          transform: `scaleX(${holding ? 1 : 0})`,
          transition: holding ? `transform ${ms}ms linear` : 'none',
        }}
      />
      <span className="relative">{label}</span>
    </button>
  );
}
