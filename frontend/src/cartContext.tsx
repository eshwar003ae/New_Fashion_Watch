import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine, Product } from "./types";

type CartCtx = {
  lines: CartLine[];
  add: (p: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  totalPaise: number;
  count: number;
};

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((p: Product, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i === -1) return [...prev, { product: p, qty }];
      const next = [...prev];
      next[i] = { ...next[i], qty: Math.min(p.stock, next[i].qty + qty) };
      return next;
    });
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, qty: Math.max(1, Math.min(l.product.stock, qty)) }
            : l
        )
        .filter((l) => l.qty > 0)
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const { totalPaise, count } = useMemo(() => {
    let t = 0;
    let c = 0;
    for (const l of lines) {
      t += l.product.price_paise * l.qty;
      c += l.qty;
    }
    return { totalPaise: t, count: c };
  }, [lines]);

  const value = useMemo(
    () => ({ lines, add, setQty, remove, clear, totalPaise, count }),
    [lines, add, setQty, remove, clear, totalPaise, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
