"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EMPTY_CART, STORE, normalisePromo, type CartDto } from "@/lib/kinoo";

type ToastItem = { id: number; message: string };

type CartContextValue = {
  cart: CartDto;
  ready: boolean;
  busy: number | null;
  isOpen: boolean;
  area: string;
  promo: string;
  openCart: () => void;
  closeCart: () => void;
  refresh: () => Promise<void>;
  addItem: (productId: number, name?: string) => Promise<void>;
  increment: (productId: number) => Promise<void>;
  decrement: (productId: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
  setArea: (area: string) => void;
  notify: (message: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartBody = {
  action: "add" | "increment" | "decrement" | "remove" | "clear";
  productId?: number;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartDto>(EMPTY_CART);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [area, setAreaState] = useState<string>(STORE.areas[0]);
  const [promo, setPromoState] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  const notify = useCallback((message: string) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((current) => [...current.slice(-2), { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2400);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      const data = (await response.json()) as { ok: boolean; cart?: CartDto };
      if (data.ok && data.cart) setCart(data.cart);
    } catch {
      /* cart is best-effort on first paint */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      const savedArea = window.localStorage.getItem("kinoo_area");
      if (savedArea && STORE.areas.includes(savedArea as (typeof STORE.areas)[number])) {
        setAreaState(savedArea);
      }
      const savedPromo = window.localStorage.getItem("kinoo_promo");
      if (savedPromo) setPromoState(normalisePromo(savedPromo));
    } catch {
      /* ignore storage restrictions */
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mutate = useCallback(
    async (body: CartBody, successMessage?: string) => {
      setBusy(body.productId ?? 0);
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as {
          ok: boolean;
          cart?: CartDto;
          error?: string;
        };

        if (!response.ok || !data.ok || !data.cart) {
          notify(data.error ?? "Could not update your cart.");
          return;
        }

        setCart(data.cart);
        if (successMessage) notify(successMessage);
      } catch {
        notify("Network issue — please try again.");
      } finally {
        setBusy(null);
      }
    },
    [notify],
  );

  const addItem = useCallback(
    async (productId: number, name?: string) => {
      await mutate({ action: "add", productId }, name ? `${name} added to bag` : "Added to bag");
    },
    [mutate],
  );

  const increment = useCallback(
    async (productId: number) => {
      await mutate({ action: "increment", productId });
    },
    [mutate],
  );

  const decrement = useCallback(
    async (productId: number) => {
      await mutate({ action: "decrement", productId });
    },
    [mutate],
  );

  const removeItem = useCallback(
    async (productId: number) => {
      await mutate({ action: "remove", productId }, "Removed from bag");
    },
    [mutate],
  );

  const applyPromo = useCallback(
    (code: string) => {
      const next = normalisePromo(code);
      if (next !== STORE.promoCode) {
        notify("That promo code is not valid.");
        return false;
      }
      setPromoState(next);
      try {
        window.localStorage.setItem("kinoo_promo", next);
      } catch {
        /* ignore */
      }
      notify(`Promo ${STORE.promoCode} applied — 10% off!`);
      return true;
    },
    [notify],
  );

  const clearPromo = useCallback(() => {
    setPromoState("");
    try {
      window.localStorage.removeItem("kinoo_promo");
    } catch {
      /* ignore */
    }
  }, []);

  const setArea = useCallback(
    (next: string) => {
      setAreaState(next);
      try {
        window.localStorage.setItem("kinoo_area", next);
      } catch {
        /* ignore */
      }
      notify(`Delivering to ${next}, Dhaka`);
    },
    [notify],
  );

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      busy,
      isOpen,
      area,
      promo,
      openCart,
      closeCart,
      refresh,
      addItem,
      increment,
      decrement,
      removeItem,
      applyPromo,
      clearPromo,
      setArea,
      notify,
    }),
    [
      cart,
      ready,
      busy,
      isOpen,
      area,
      promo,
      openCart,
      closeCart,
      refresh,
      addItem,
      increment,
      decrement,
      removeItem,
      applyPromo,
      clearPromo,
      setArea,
      notify,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div className="k-toast" key={toast.id}>
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            {toast.message}
          </div>
        ))}
      </div>
    </CartContext.Provider>
  );
}

export function useKinoo(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useKinoo must be used inside CartProvider");
  return context;
}
