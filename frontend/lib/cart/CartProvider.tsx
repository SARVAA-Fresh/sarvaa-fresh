"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { deleteRequest, get, post } from "@/lib/api/client";
import type {
  CartListResponse,
  CartProductRef,
  CartVariantRef,
  Product,
  ProductVariant,
} from "@/lib/api/types";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";
import { getVariantInventory } from "@/lib/storefront/product-display";

const CART_STORAGE_KEY = "sarvaa-storefront-cart";
type CartStoreListener = () => void;

const EMPTY_CART_LINES: CartLine[] = [];
let cartStore: CartLine[] = EMPTY_CART_LINES;
let cartStoreBootstrapped = false;
const cartStoreListeners = new Set<CartStoreListener>();

export interface CartLine {
  key: string;
  product: CartProductRef;
  variant: CartVariantRef;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addLine: (product: Product, variant: ProductVariant, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clearCart: () => void;
  syncToBackend: () => Promise<void>;
  hydrateFromBackend: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within CartProvider");
  }
  return value;
}

function loadStoredCart(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Best effort only.
  }
}

function subscribeCartStore(listener: CartStoreListener): () => void {
  cartStoreListeners.add(listener);
  return () => {
    cartStoreListeners.delete(listener);
  };
}

function emitCartStoreChange(): void {
  cartStoreListeners.forEach((listener) => listener());
}

function setCartStore(next: CartLine[] | ((current: CartLine[]) => CartLine[])): void {
  cartStore = typeof next === "function" ? next(cartStore) : next;
  saveStoredCart(cartStore);
  emitCartStoreChange();
}

function clampQuantity(
  quantity: number,
  availableStock?: number,
  allowZero = false,
): number {
  const validQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  const minimumQuantity = Math.max(allowZero ? 0 : 1, validQuantity);
  if (allowZero && minimumQuantity === 0) return 0;
  return typeof availableStock === "number"
    ? Math.min(minimumQuantity, Math.max(1, availableStock))
    : minimumQuantity;
}

function loadCartFromStorageIntoStore(): void {
  if (typeof window === "undefined") {
    return;
  }
  cartStore = loadStoredCart();
  cartStoreBootstrapped = true;
  emitCartStoreChange();
}

function getCartSnapshot(): CartLine[] {
  return cartStore;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useCustomerAuth();
  const lines = useSyncExternalStore(
    subscribeCartStore,
    getCartSnapshot,
    () => EMPTY_CART_LINES,
  );

  useEffect(() => {
    loadCartFromStorageIntoStore();
  }, []);

  const addLine = useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      setCartStore((current) => {
        const existing = current.find((line) => line.variant.id === variant.id);
        const availableStock = getVariantInventory(variant)?.availableStock;
        if (existing) {
          const nextQuantity = clampQuantity(
            existing.quantity + quantity,
            availableStock ?? existing.variant.availableStock,
          );
          return current.map((line) =>
            line.variant.id === variant.id
              ? {
                  ...line,
                  quantity: nextQuantity,
                  variant: {
                    ...line.variant,
                    price: variant.price,
                    mrp: variant.mrp,
                    isActive: variant.isActive,
                    isDefault: variant.isDefault,
                    availableStock,
                  },
                }
            : line,
          );
        }
        const nextQuantity = clampQuantity(quantity, availableStock);
        const cartVariant: CartVariantRef = {
          id: variant.id,
          productId: variant.productId,
          sku: variant.sku,
          variantName: variant.variantName,
          unit: variant.unit,
          weight: variant.weight,
          price: variant.price,
          mrp: variant.mrp,
          isDefault: variant.isDefault,
          isActive: variant.isActive,
          availableStock,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            imageUrl: product.imageUrl,
            category: product.category,
          },
        };
        return [
          ...current,
          {
            key: variant.id,
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug,
              imageUrl: product.imageUrl,
              category: product.category,
            },
            variant: cartVariant,
            quantity: nextQuantity,
          },
        ];
      });
    },
    [],
  );

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setCartStore((current) =>
      current
        .map((line) =>
          line.variant.id === variantId
            ? {
                ...line,
                quantity: clampQuantity(quantity, line.variant.availableStock, true),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((variantId: string) => {
    setCartStore((current) => current.filter((line) => line.variant.id !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setCartStore([]);
  }, []);

  const hydrateFromBackend = useCallback(async () => {
    if (!isAuthenticated) return;
    const data = await get<CartListResponse>("/cart", {
      authScope: "customer",
    });
    const hydrated = data.items.map((item) => ({
      key: item.variant.id,
      product: item.variant.product,
      variant: {
        ...item.variant,
        price: item.unitPrice,
      },
      quantity: item.quantity,
    }));
    if (hydrated.length > 0) {
      setCartStore(hydrated);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && cartStoreBootstrapped && lines.length === 0) {
      void hydrateFromBackend();
    }
  }, [hydrateFromBackend, isAuthenticated, lines.length]);

  const syncToBackend = useCallback(async () => {
    if (!isAuthenticated) return;
    await deleteRequest("/cart", { authScope: "customer" });
    for (const line of lines) {
      await post(
        "/cart/items",
        { variantId: line.variant.id, quantity: line.quantity },
        { authScope: "customer" },
      );
    }
  }, [isAuthenticated, lines]);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number.parseFloat(line.variant.price) * line.quantity,
        0,
      ),
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount,
      subtotal,
      addLine,
      setQuantity,
      removeLine,
      clearCart,
      syncToBackend,
      hydrateFromBackend,
    }),
    [
      addLine,
      clearCart,
      hydrateFromBackend,
      itemCount,
      lines,
      removeLine,
      setQuantity,
      subtotal,
      syncToBackend,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
