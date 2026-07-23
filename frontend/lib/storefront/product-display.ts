import type { ProductVariant } from "@/lib/api/types";

export type CustomerStockTone = "success" | "warning" | "danger";

export interface VariantInventory {
  availableStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  isInStock: boolean;
}

export interface CustomerStockStatus {
  label: string;
  tone: CustomerStockTone;
  isOutOfStock: boolean;
}

export interface VariantPricing {
  price: number;
  mrp: number | null;
  hasDiscount: boolean;
  discountPercentage: number;
}

export function getVariantInventory(
  variant: ProductVariant | null | undefined,
): VariantInventory | null {
  if (!variant) return null;

  if (variant.inventory) {
    return {
      availableStock: variant.inventory.availableStock,
      reservedStock: variant.inventory.reservedStock,
      lowStockThreshold: variant.inventory.lowStockThreshold,
      isInStock: variant.inventory.isInStock,
    };
  }

  if (
    typeof variant.availableStock === "number" ||
    typeof variant.reservedStock === "number" ||
    typeof variant.lowStockThreshold === "number" ||
    typeof variant.isInStock === "boolean"
  ) {
    const availableStock = variant.availableStock ?? 0;
    return {
      availableStock,
      reservedStock: variant.reservedStock ?? 0,
      lowStockThreshold: variant.lowStockThreshold ?? 0,
      isInStock: variant.isInStock ?? availableStock > 0,
    };
  }

  return null;
}

export function getCustomerStockStatus(
  variant: ProductVariant | null | undefined,
): CustomerStockStatus {
  const inventory = getVariantInventory(variant);

  if (!variant?.isActive || !inventory || !inventory.isInStock || inventory.availableStock <= 0) {
    return { label: "Out of Stock", tone: "danger", isOutOfStock: true };
  }

  if (inventory.availableStock <= 5) {
    return {
      label: `Only ${inventory.availableStock} left`,
      tone: "warning",
      isOutOfStock: false,
    };
  }

  if (inventory.availableStock <= inventory.lowStockThreshold) {
    return { label: "Low Stock", tone: "warning", isOutOfStock: false };
  }

  return { label: "In Stock", tone: "success", isOutOfStock: false };
}

export function getVariantPricing(
  variant: ProductVariant | null | undefined,
): VariantPricing {
  const price = Number.parseFloat(variant?.price ?? "0");
  const mrp = variant?.mrp ? Number.parseFloat(variant.mrp) : null;
  const hasDiscount =
    Number.isFinite(price) &&
    typeof mrp === "number" &&
    Number.isFinite(mrp) &&
    mrp > price;

  return {
    price: Number.isFinite(price) ? price : 0,
    mrp: hasDiscount ? mrp : null,
    hasDiscount,
    discountPercentage: hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0,
  };
}

