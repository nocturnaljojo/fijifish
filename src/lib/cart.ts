/**
 * Cart state — zustand store with localStorage persistence.
 * All prices in integer cents (AUD). Quantities in whole kg.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  fishSpeciesId: string;
  fishName: string;
  priceAudCents: number;
  quantityKg: number;
  maxAvailableKg: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantityKg"> & { quantityKg?: number }) => void;
  updateQuantity: (fishSpeciesId: string, quantityKg: number) => void;
  removeItem: (fishSpeciesId: string) => void;
  clearCart: () => void;
  totalCents: () => number;
  totalKg: () => number;
  itemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (incoming) => {
        const qty = incoming.quantityKg ?? 1;
        set((state) => {
          const existing = state.items.find((i) => i.fishSpeciesId === incoming.fishSpeciesId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.fishSpeciesId === incoming.fishSpeciesId
                  ? { ...i, quantityKg: Math.min(i.maxAvailableKg, i.quantityKg + qty) }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                fishSpeciesId: incoming.fishSpeciesId,
                fishName: incoming.fishName,
                priceAudCents: incoming.priceAudCents,
                quantityKg: Math.max(1, Math.min(incoming.maxAvailableKg, qty)),
                maxAvailableKg: incoming.maxAvailableKg,
              },
            ],
          };
        });
      },

      updateQuantity: (fishSpeciesId, quantityKg) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.fishSpeciesId === fishSpeciesId
              ? { ...i, quantityKg: Math.max(1, Math.min(i.maxAvailableKg, quantityKg)) }
              : i,
          ),
        }));
      },

      removeItem: (fishSpeciesId) => {
        set((state) => ({
          items: state.items.filter((i) => i.fishSpeciesId !== fishSpeciesId),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalCents: () =>
        get().items.reduce((sum, i) => sum + i.priceAudCents * i.quantityKg, 0),

      totalKg: () =>
        get().items.reduce((sum, i) => sum + i.quantityKg, 0),

      itemCount: () => get().items.length,
    }),
    {
      name: "fijiFish-cart",
      // Only persist items — isOpen is transient UI state
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
