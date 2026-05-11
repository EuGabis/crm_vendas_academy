import { create } from 'zustand';
import { todayDate } from '@/data/seed-data';

export interface FiltersState {
  year: number;
  month: number; // 0-11
  sellerId: string | 'all';
  setMonth: (year: number, month: number) => void;
  setSeller: (sellerId: string | 'all') => void;
}

export const useFilters = create<FiltersState>((set) => ({
  year: todayDate.getFullYear(),
  month: todayDate.getMonth(),
  sellerId: 'all',
  setMonth: (year, month) => set({ year, month }),
  setSeller: (sellerId) => set({ sellerId }),
}));
