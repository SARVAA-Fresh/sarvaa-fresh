"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { ApiError } from "@/lib/api/types";
import { buildAssetUrl, get, isImageUrl, patch, post, postForm } from "@/lib/api/client";
import type {
  Setting,
  SettingCategory,
  SettingListResponse,
  SettingType,
} from "@/lib/api/types";

type TabId =
  | "store"
  | "delivery"
  | "payments"
  | "hours"
  | "social"
  | "contact"
  | "branding"
  | "system";

interface SettingField {
  key: string;
  label: string;
  type: SettingType;
  category: SettingCategory;
  defaultValue: string;
  input: "text" | "textarea" | "number" | "time" | "switch" | "color" | "image";
  description?: string;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "store", label: "Store" },
  { id: "delivery", label: "Delivery" },
  { id: "payments", label: "Payments" },
  { id: "hours", label: "Business Hours" },
  { id: "social", label: "Social" },
  { id: "contact", label: "Contact" },
  { id: "branding", label: "Branding" },
  { id: "system", label: "System" },
];

const fieldsByTab: Record<Exclude<TabId, "system">, SettingField[]> = {
  store: [
    { key: "business.name", label: "Store Name", type: "STRING", category: "BUSINESS", defaultValue: "SARVAA Fresh", input: "text" },
    { key: "business.tagline", label: "Tagline", type: "STRING", category: "BUSINESS", defaultValue: "Fresh Fruits & Vegetables", input: "text" },
    { key: "business.hero_heading", label: "Hero Heading", type: "STRING", category: "BUSINESS", defaultValue: "Fresh Fruits & Vegetables Delivered Across Sagwara", input: "text" },
    { key: "business.hero_subtitle", label: "Hero Subtitle", type: "STRING", category: "BUSINESS", defaultValue: "Handpicked every morning. Freshness guaranteed. Delivered with care from your trusted local store.", input: "textarea" },
    { key: "business.description", label: "Store Description", type: "STRING", category: "BUSINESS", defaultValue: "Fresh fruits and vegetables delivered across Sagwara.", input: "textarea" },
    { key: "business.logo_url", label: "Logo", type: "STRING", category: "BUSINESS", defaultValue: "/brand/logo.png", input: "text" },
    { key: "business.favicon_url", label: "Favicon", type: "STRING", category: "BUSINESS", defaultValue: "/brand/icon.png", input: "text" },
  ],
  delivery: [
    { key: "delivery.minimum_order_value", label: "Minimum Order Value", type: "NUMBER", category: "DELIVERY", defaultValue: "80", input: "number" },
    { key: "delivery.fee", label: "Delivery Charge", type: "NUMBER", category: "DELIVERY", defaultValue: "20", input: "number" },
    { key: "delivery.free_delivery_threshold", label: "Free Delivery Above", type: "NUMBER", category: "DELIVERY", defaultValue: "200", input: "number" },
    { key: "delivery.maximum_radius", label: "Maximum Delivery Radius (KM)", type: "NUMBER", category: "DELIVERY", defaultValue: "10", input: "number" },
    { key: "delivery.estimated_time", label: "Estimated Delivery Time", type: "STRING", category: "DELIVERY", defaultValue: "30-60 Minutes", input: "text" },
    { key: "delivery.same_day_enabled", label: "Delivery Enabled", type: "BOOLEAN", category: "DELIVERY", defaultValue: "true", input: "switch" },
  ],
  payments: [
    { key: "payment.cod_enabled", label: "Cash on Delivery", type: "BOOLEAN", category: "PAYMENT", defaultValue: "true", input: "switch" },
    { key: "payment.upi_enabled", label: "UPI", type: "BOOLEAN", category: "PAYMENT", defaultValue: "true", input: "switch" },
    { key: "payment.upi_display_name", label: "Merchant Name", type: "STRING", category: "PAYMENT", defaultValue: "SARVAA Fresh", input: "text" },
    { key: "payment.upi_id", label: "UPI ID", type: "STRING", category: "PAYMENT", defaultValue: "", input: "text" },
    { key: "payment.qr_image_url", label: "QR Image", type: "STRING", category: "PAYMENT", defaultValue: "", input: "image" },
    { key: "payment.instructions", label: "Payment Instructions", type: "STRING", category: "PAYMENT", defaultValue: "Pay with UPI and upload payment proof for verification.", input: "textarea" },
    { key: "payment.future_gateway_enabled", label: "Future Razorpay Toggle", type: "BOOLEAN", category: "PAYMENT", defaultValue: "false", input: "switch" },
  ],
  hours: [
    { key: "store.open_time", label: "Opening Time", type: "STRING", category: "STORE", defaultValue: "06:00", input: "time" },
    { key: "store.close_time", label: "Closing Time", type: "STRING", category: "STORE", defaultValue: "21:00", input: "time" },
    { key: "store.accept_orders", label: "Accept Orders", type: "BOOLEAN", category: "STORE", defaultValue: "true", input: "switch" },
    { key: "store.closed", label: "Store Closed", type: "BOOLEAN", category: "STORE", defaultValue: "false", input: "switch" },
    { key: "store.maintenance_mode", label: "Maintenance Mode", type: "BOOLEAN", category: "STORE", defaultValue: "false", input: "switch" },
    { key: "store.holiday_mode", label: "Holiday Mode", type: "BOOLEAN", category: "STORE", defaultValue: "false", input: "switch" },
    { key: "store.maintenance_message", label: "Maintenance Message", type: "STRING", category: "STORE", defaultValue: "", input: "textarea" },
  ],
  social: [
    { key: "contact.instagram_url", label: "Instagram URL", type: "STRING", category: "CONTACT", defaultValue: "https://www.instagram.com/sarvaafresh/", input: "text" },
    { key: "contact.instagram_handle", label: "Instagram Handle", type: "STRING", category: "CONTACT", defaultValue: "@sarvaafresh", input: "text" },
    { key: "contact.whatsapp_channel_url", label: "WhatsApp Channel URL", type: "STRING", category: "CONTACT", defaultValue: "https://whatsapp.com/channel/0029VbCoSLnFy72B3UiivC1k", input: "text" },
    { key: "contact.facebook_url", label: "Facebook (future)", type: "STRING", category: "CONTACT", defaultValue: "", input: "text" },
    { key: "contact.youtube_url", label: "YouTube (future)", type: "STRING", category: "CONTACT", defaultValue: "", input: "text" },
  ],
  contact: [
    { key: "contact.phone", label: "Phone", type: "STRING", category: "CONTACT", defaultValue: "", input: "text" },
    { key: "contact.support_email", label: "Support Email", type: "STRING", category: "CONTACT", defaultValue: "", input: "text" },
    { key: "business.address", label: "Store Address", type: "STRING", category: "BUSINESS", defaultValue: "", input: "textarea" },
    { key: "business.city", label: "City", type: "STRING", category: "BUSINESS", defaultValue: "Sagwara", input: "text" },
    { key: "business.state", label: "State", type: "STRING", category: "BUSINESS", defaultValue: "Rajasthan", input: "text" },
    { key: "business.pincode", label: "Pincode", type: "STRING", category: "BUSINESS", defaultValue: "", input: "text" },
    { key: "contact.delivery_area_description", label: "Delivery Area Description", type: "STRING", category: "CONTACT", defaultValue: "Sagwara, Rajasthan", input: "textarea" },
  ],
  branding: [
    { key: "business.logo_url", label: "Logo Upload", type: "STRING", category: "BUSINESS", defaultValue: "/brand/logo.png", input: "text" },
    { key: "business.favicon_url", label: "Favicon Upload", type: "STRING", category: "BUSINESS", defaultValue: "/brand/icon.png", input: "text" },
    { key: "branding.theme_color", label: "Theme Color", type: "STRING", category: "STORE", defaultValue: "#14532d", input: "color" },
    { key: "branding.accent_color", label: "Accent Color", type: "STRING", category: "STORE", defaultValue: "#4CAF50", input: "color" },
  ],
};

const systemDiagnostics = [
  ["Store Version", "MVP"],
  ["Environment", process.env.NODE_ENV ?? "development"],
  ["API Health", "Available via /health"],
  ["Database Status", "Available via backend health check"],
  ["Redis Status", "Available via backend health check"],
  ["Storage Usage", "Local uploads configured"],
];

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) return error.messages.join(" ");
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function settingValue(settings: Setting[], field: SettingField): string {
  return settings.find((setting) => setting.key === field.key)?.value ?? field.defaultValue;
}

function extractUploadUrl(uploaded: { url?: string } | string): string {
  return typeof uploaded === "string" ? uploaded : uploaded.url ?? "";
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("store");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await get<SettingListResponse>("/admin/settings?limit=200", {
          authScope: "admin",
        });
        if (cancelled) return;
        setSettings(data.items);
        setDrafts(Object.fromEntries(data.items.map((setting) => [setting.key, setting.value])));
      } catch (error) {
        if (!cancelled) setErrorMessage(extractMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFields = useMemo(
    () => (activeTab === "system" ? [] : fieldsByTab[activeTab]),
    [activeTab],
  );

  async function saveField(field: SettingField): Promise<void> {
    const existing = settings.find((setting) => setting.key === field.key);
    const value = drafts[field.key] ?? field.defaultValue;
    if (field.input === "image" && value && !isImageUrl(value)) {
      throw new Error(`${field.label} must be an uploaded image URL.`);
    }
    if (existing) {
      const updated = await patch<Setting>(
        `/admin/settings/${existing.id}`,
        { value, type: field.type },
        { authScope: "admin" },
      );
      setSettings((current) =>
        current.map((setting) => (setting.id === updated.id ? updated : setting)),
      );
      return;
    }
    const created = await post<Setting>(
      "/admin/settings",
      {
        key: field.key,
        value,
        type: field.type,
        category: field.category,
        isEditable: true,
        isPublic: field.category !== "SYSTEM",
      },
      { authScope: "admin" },
    );
    setSettings((current) => [...current, created]);
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (
        activeTab === "payments" &&
        drafts["payment.upi_enabled"] === "true" &&
        (!drafts["payment.upi_display_name"]?.trim() ||
          !drafts["payment.upi_id"]?.trim())
      ) {
        setErrorMessage("Merchant Name and UPI ID are required when UPI is enabled.");
        return;
      }
      for (const field of activeFields) {
        await saveField(field);
      }
      setSuccessMessage("Settings saved successfully.");
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImageUpload(field: SettingField, file: File | null): Promise<void> {
    if (!file) return;
    setUploadingKey(field.key);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const uploaded = await postForm<{ url?: string } | string>(
        "/admin/settings/upload",
        formData,
        { authScope: "admin" },
      );
      const uploadUrl = extractUploadUrl(uploaded);
      if (!isImageUrl(uploadUrl)) {
        throw new Error("Upload did not return a valid image URL.");
      }
      setDrafts((current) => ({ ...current, [field.key]: uploadUrl }));
      setSuccessMessage("Image uploaded. Save settings to publish it.");
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Business Controls
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Manage store content, delivery policy, payment availability, social links, and operational status from one place.
          </p>
        </div>
        {activeTab !== "system" && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600" />
          </div>
        ) : activeTab === "system" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {systemDiagnostics.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-950">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {activeFields.map((field) => {
              const value = drafts[field.key] ?? settingValue(settings, field);
              const commonClass =
                "mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
              return (
                <label key={field.key} className={field.input === "textarea" ? "lg:col-span-2" : ""}>
                  <span className="text-sm font-semibold text-zinc-900">{field.label}</span>
                  {field.input === "textarea" ? (
                    <textarea
                      value={value}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      rows={3}
                      className={commonClass}
                    />
                  ) : field.input === "switch" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDrafts((current) => ({
                          ...current,
                          [field.key]: value === "true" ? "false" : "true",
                        }))
                      }
                      className={`mt-2 inline-flex min-w-24 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                        value === "true"
                          ? "bg-emerald-700 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {value === "true" ? "ON" : "OFF"}
                    </button>
                  ) : field.input === "image" ? (
                    <div className="mt-2 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      {isImageUrl(value) ? (
                        <Image
                          src={buildAssetUrl(value) ?? value}
                          alt={`${field.label} preview`}
                          width={320}
                          height={320}
                          className="h-40 w-full rounded-lg border border-zinc-200 bg-white object-contain"
                        />
                      ) : (
                        <div className="grid h-32 place-items-center rounded-lg border border-dashed border-zinc-300 bg-white text-sm text-zinc-500">
                          No QR image uploaded
                        </div>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            void handleImageUpload(field, event.target.files?.[0] ?? null)
                          }
                          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                        />
                        {value && (
                          <button
                            type="button"
                            onClick={() =>
                              setDrafts((current) => ({ ...current, [field.key]: "" }))
                            }
                            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {uploadingKey === field.key && (
                        <p className="text-sm font-medium text-emerald-700">Uploading...</p>
                      )}
                    </div>
                  ) : (
                    <input
                      type={field.input}
                      value={value}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className={commonClass}
                    />
                  )}
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
