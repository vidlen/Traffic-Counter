import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/id';
import { deleteSession } from '../lib/sessionActions';
import { toast } from '../store';
import type { Session } from '../types';

const th = t.home;

/** Konfirmasi hapus dengan mengetik nama lokasi. Pasang `key={session.id}` di induk. */
export function DeleteSessionDialog({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState('');
  useEffect(() => ref.current?.showModal(), []);

  const ok = text.trim().toLowerCase() === session.location.trim().toLowerCase();
  const remove = async () => {
    await deleteSession(session.id);
    toast(th.deleted);
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl bg-surface p-5 text-ink backdrop:bg-ink/60"
    >
      <h2 className="text-lg font-semibold">{th.deleteTitle}</h2>
      <p className="mt-2 text-ink-2">{th.deleteBody(session.location)}</p>
      <input
        className="input mt-4"
        aria-label={t.wizard.location}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-5 flex gap-2">
        <button className="btn btn-secondary flex-1" onClick={() => ref.current?.close()}>
          {th.cancel}
        </button>
        <button className="btn btn-danger flex-1" disabled={!ok} onClick={() => void remove()}>
          {th.deleteConfirm}
        </button>
      </div>
    </dialog>
  );
}
