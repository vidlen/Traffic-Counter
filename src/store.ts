import { create } from 'zustand';

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
