import { create } from 'zustand';

interface ChildStore {
  selectedChildId: string | null;
  setSelectedChild: (id: string | null) => void;
}

export const useChildStore = create<ChildStore>((set) => ({
  selectedChildId: null,
  setSelectedChild: (id) => set({ selectedChildId: id }),
}));
