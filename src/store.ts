import { create } from 'zustand';

// State UI global (bukan data survei — data survei ada di Dexie).
interface UiState {
  updateReady: boolean;
  applyUpdate: () => void;
  setUpdate: (updateReady: boolean, applyUpdate: () => void) => void;
}

export const useUi = create<UiState>((set) => ({
  updateReady: false,
  applyUpdate: () => {},
  setUpdate: (updateReady, applyUpdate) => set({ updateReady, applyUpdate }),
}));
