import type { DeliveryPolicy, PublicSettings } from "@/lib/api/types";

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  business: {
    name: "SARVAA Fresh",
    tagline: "Fresh Fruits & Vegetables",
    heroHeading: "Fresh Fruits & Vegetables Delivered Across Sagwara",
    heroSubtitle:
      "Handpicked every morning. Freshness guaranteed. Delivered with care from your trusted local store.",
    logoUrl: "/brand/logo.png",
    faviconUrl: "/brand/icon.png",
    city: "Sagwara",
    state: "Rajasthan",
    country: "India",
    description: "Fresh fruits and vegetables delivered across Sagwara.",
  },
  contact: {
  },
  delivery: {
    fee: 20,
    freeDeliveryThreshold: 200,
    minimumOrderValue: 80,
    maximumRadius: 10,
    estimatedTime: "30-60 Minutes",
    sameDayEnabled: true,
  },
  payment: {
    codEnabled: true,
    upiEnabled: true,
    futureGatewayEnabled: false,
    availableMethods: ["COD", "UPI"],
  },
  store: {
    openTime: "06:00",
    closeTime: "21:00",
    acceptOrders: true,
    storeClosed: false,
    holidayMode: false,
    maintenanceMode: false,
  },
  branding: {
    themeColor: "#14532d",
    accentColor: "#4CAF50",
  },
  system: {
    storeVersion: "MVP",
    environment: "development",
  },
};

function mergeGroup<T extends Record<string, unknown>>(
  fallback: T,
  incoming: Partial<T> | undefined,
): T {
  return { ...fallback, ...(incoming ?? {}) };
}

export function normalizeSettings(
  settings: PublicSettings | null | undefined,
): PublicSettings {
  return {
    business: mergeGroup(DEFAULT_PUBLIC_SETTINGS.business, settings?.business),
    contact: mergeGroup(DEFAULT_PUBLIC_SETTINGS.contact, settings?.contact),
    delivery: mergeGroup(DEFAULT_PUBLIC_SETTINGS.delivery, settings?.delivery),
    payment: {
      ...DEFAULT_PUBLIC_SETTINGS.payment,
      ...(settings?.payment ?? {}),
      availableMethods:
        settings?.payment?.availableMethods ??
        DEFAULT_PUBLIC_SETTINGS.payment.availableMethods,
    },
    store: mergeGroup(DEFAULT_PUBLIC_SETTINGS.store, settings?.store),
    branding: mergeGroup(
      DEFAULT_PUBLIC_SETTINGS.branding ?? {},
      settings?.branding,
    ),
    system: mergeGroup(DEFAULT_PUBLIC_SETTINGS.system ?? {}, settings?.system),
  };
}

export function isStoreOrderingDisabled(settings: PublicSettings): boolean {
  return (
    settings.store.acceptOrders === false ||
    settings.store.storeClosed === true ||
    settings.store.holidayMode === true ||
    settings.store.maintenanceMode === true
  );
}

export function storeStatusMessage(settings: PublicSettings): string | null {
  if (settings.store.maintenanceMode) {
    return (
      settings.store.maintenanceMessage ||
      "Store is under maintenance. You can browse, but checkout is paused."
    );
  }
  if (settings.store.holidayMode) {
    return "Store is on holiday today. You can browse, but checkout is paused.";
  }
  if (settings.store.storeClosed) {
    return "Store is currently closed. You can browse, but checkout is paused.";
  }
  if (settings.store.acceptOrders === false) {
    return "Online ordering is currently paused. You can browse, but checkout is disabled.";
  }
  return null;
}

export function calculateDeliveryPolicy(
  subtotal: number,
  settings: PublicSettings,
): DeliveryPolicy {
  const minimumOrderValue = Number(settings.delivery.minimumOrderValue ?? 80);
  const deliveryFee = Number(settings.delivery.fee ?? 20);
  const freeDeliveryThreshold = Number(
    settings.delivery.freeDeliveryThreshold ?? 200,
  );
  const deliveryEnabled = settings.delivery.sameDayEnabled !== false;
  const checkoutDisabled =
    subtotal < minimumOrderValue || !deliveryEnabled || isStoreOrderingDisabled(settings);
  const amountToMinimum = Math.max(0, minimumOrderValue - subtotal);
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const deliveryCharge =
    deliveryEnabled && subtotal >= minimumOrderValue && subtotal < freeDeliveryThreshold
      ? deliveryFee
      : 0;

  let message = "Congratulations! FREE Delivery unlocked.";
  if (!deliveryEnabled) {
    message = "Delivery is currently unavailable.";
  } else if (subtotal < minimumOrderValue) {
    message = `Add Rs. ${amountToMinimum.toFixed(2)} more to reach minimum order.`;
  } else if (subtotal < freeDeliveryThreshold) {
    message = `Add Rs. ${amountToFreeDelivery.toFixed(2)} more for FREE delivery.`;
  }

  return {
    minimumOrderValue,
    deliveryFee,
    freeDeliveryThreshold,
    deliveryEnabled,
    deliveryCharge,
    checkoutDisabled,
    amountToMinimum,
    amountToFreeDelivery,
    message,
  };
}

export function formatStoreHours(settings: PublicSettings): string {
  const open = settings.store.openTime || "06:00";
  const close = settings.store.closeTime || "21:00";
  return `${formatTime(open)} – ${formatTime(close)}`;
}

function formatTime(value: string): string {
  const [hoursRaw, minutesRaw = "00"] = value.split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  if (!Number.isFinite(hours)) {
    return value;
  }
  const minutes = minutesRaw.padStart(2, "0").slice(0, 2);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${period}`;
}
