import { create } from 'zustand';

const NOW = new Date();

export interface FiltersState {
  year: number;
  month: number; // 0-11
  sellerId: string | 'all';
  setMonth: (year: number, month: number) => void;
  setSeller: (sellerId: string | 'all') => void;
}

export const useFilters = create<FiltersState>((set) => ({
  year: NOW.getFullYear(),
  month: NOW.getMonth(),
  sellerId: 'all',
  setMonth: (year, month) => set({ year, month }),
  setSeller: (sellerId) => set({ sellerId }),
}));
