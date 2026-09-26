import { useEffect, useState } from 'react';

export interface StorageStatus {
  persisted?: boolean; // undefined = browser tidak memberi informasi
  usage?: number;
  quota?: number;
}

async function load(): Promise<StorageStatus> {
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : undefined;
  const est = navigator.storage?.estimate ? await navigator.storage.estimate() : undefined;
  return { persisted, usage: est?.usage, quota: est?.quota };
}

/** Status penyimpanan persisten + pemakaian ruang (untuk Pengaturan dan peringatan di Beranda). */
export function useStorageStatus() {
  const [state, setState] = useState<StorageStatus>({});
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    void load().then((v) => alive && setState(v));
    return () => {
      alive = false;
    };
  }, [version]);
  const nearlyFull = !!state.quota && (state.usage ?? 0) / state.quota > 0.8;
  const request = async () => {
    if (navigator.storage?.persist) await navigator.storage.persist();
    setVersion((v) => v + 1);
  };
  return { ...state, nearlyFull, request };
}
