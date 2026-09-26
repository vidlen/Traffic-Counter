import { create } from 'zustand';
import type { EngineState } from './lib/engine';
import type { Session } from './types';

// State UI global (bukan data survei — data survei ada di Dexie).
export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'danger';
}

interface UiState {
  updateReady: boolean;
  applyUpdate: () => void;
  setUpdate: (updateReady: boolean, applyUpdate: () => void) => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  notice: string | null; // pemberitahuan pemulihan (celah tidak aktif)
  setNotice: (notice: string | null) => void;
}

let nextToastId = 1;

export const useUi = create<UiState>((set) => ({
  updateReady: false,
  applyUpdate: () => {},
  setUpdate: (updateReady, applyUpdate) => set({ updateReady, applyUpdate }),
  notice: null,
  setNotice: (notice) => set({ notice }),
  toasts: [],
  toast: (text, tone = 'info') => {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3000);
  },
}));

export const toast = (text: string, tone?: Toast['tone']) => useUi.getState().toast(text, tone);

// Denyut mesin interval (diperbarui tiap 250 ms oleh useSessionEngine).
export interface EngineTick {
  sessionId: string;
  state: EngineState;
  now: number;
}

export const useEngine = create<{ tick: EngineTick | null }>(() => ({ tick: null }));

// Draf wizard sesi: bertahan saat pindah langkah / halaman, dibuang setelah disimpan.
interface WizardState {
  draft: Session | null;
  mode: 'new' | 'edit';
  setDraft: (draft: Session | null, mode?: 'new' | 'edit') => void;
  patch: (p: Partial<Session>) => void;
}

export const useWizard = create<WizardState>((set) => ({
  draft: null,
  mode: 'new',
  setDraft: (draft, mode = 'new') => set({ draft, mode }),
  patch: (p) => set((s) => (s.draft ? { draft: { ...s.draft, ...p } } : s)),
}));
