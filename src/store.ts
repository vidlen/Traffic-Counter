import { create } from 'zustand';
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
}

let nextToastId = 1;

export const useUi = create<UiState>((set) => ({
  updateReady: false,
  applyUpdate: () => {},
  setUpdate: (updateReady, applyUpdate) => set({ updateReady, applyUpdate }),
  toasts: [],
  toast: (text, tone = 'info') => {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3000);
  },
}));

export const toast = (text: string, tone?: Toast['tone']) => useUi.getState().toast(text, tone);

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
