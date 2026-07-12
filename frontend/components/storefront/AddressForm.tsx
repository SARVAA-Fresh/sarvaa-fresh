"use client";

import type { CreateAddressRequest } from "@/lib/api/types";

export interface AddressFormState {
  label: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export const EMPTY_ADDRESS_FORM: AddressFormState = {
  label: "",
  fullName: "",
  mobile: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export function toAddressRequest(
  form: AddressFormState,
): CreateAddressRequest {
  return {
    label: form.label.trim(),
    fullName: form.fullName.trim(),
    mobile: form.mobile.trim(),
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2.trim() || undefined,
    landmark: form.landmark.trim() || undefined,
    area: form.area.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    isDefault: form.isDefault,
  };
}

export function AddressForm({
  form,
  onChange,
  disabled,
}: {
  form: AddressFormState;
  onChange: (patch: Partial<AddressFormState>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Label" value={form.label} onChange={(value) => onChange({ label: value })} disabled={disabled} />
      <Field label="Full name" value={form.fullName} onChange={(value) => onChange({ fullName: value })} disabled={disabled} />
      <Field label="Mobile" value={form.mobile} onChange={(value) => onChange({ mobile: value })} disabled={disabled} />
      <Field label="Address line 1" value={form.addressLine1} onChange={(value) => onChange({ addressLine1: value })} disabled={disabled} />
      <Field label="Address line 2" value={form.addressLine2} onChange={(value) => onChange({ addressLine2: value })} disabled={disabled} />
      <Field label="Landmark" value={form.landmark} onChange={(value) => onChange({ landmark: value })} disabled={disabled} />
      <Field label="Area" value={form.area} onChange={(value) => onChange({ area: value })} disabled={disabled} />
      <Field label="City" value={form.city} onChange={(value) => onChange({ city: value })} disabled={disabled} />
      <Field label="State" value={form.state} onChange={(value) => onChange({ state: value })} disabled={disabled} />
      <Field label="Pincode" value={form.pincode} onChange={(value) => onChange({ pincode: value })} disabled={disabled} />
      <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(event) => onChange({ isDefault: event.target.checked })}
          disabled={disabled}
          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30"
        />
        <span className="text-sm font-medium text-zinc-700">Set as default</span>
      </label>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100"
      />
    </label>
  );
}
