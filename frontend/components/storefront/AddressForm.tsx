
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
  label: "Home",
  fullName: "",
  mobile: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  area: "",
  city: "",
  state: "Rajasthan",
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

export function validateAddressForm(
  form: AddressFormState,
): Partial<Record<keyof AddressFormState, string>> {
  const errors: Partial<Record<keyof AddressFormState, string>> = {};
  const value = toAddressRequest(form);

  if (!value.label) errors.label = "Choose an address label.";
  if (!value.fullName) errors.fullName = "Enter the recipient's full name.";

  if (!/^[6-9]\d{9}$/.test(value.mobile)) {
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  }

  if (!value.addressLine1) {
    errors.addressLine1 = "Enter your house number and street.";
  }
  if (!value.area) errors.area = "Enter your area or locality.";
  if (!value.city) errors.city = "Enter your city.";
  if (!value.state) errors.state = "Enter your state.";

  if (!/^\d{6}$/.test(value.pincode)) {
    errors.pincode = "Enter a valid 6-digit pincode.";
  }

  return errors;
}

export function AddressForm({
  form,
  onChange,
  disabled,
  errors = {},
}: {
  form: AddressFormState;
  onChange: (patch: Partial<AddressFormState>) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof AddressFormState, string>>;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div>
        <span className="mb-2 block text-sm font-semibold text-zinc-800">
          Address type <span className="text-red-600">*</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(["Home", "Work", "Other"] as const).map((label) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ label })}
              aria-pressed={form.label === label}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                form.label === label
                  ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                  : "border-zinc-300 bg-white text-zinc-700"
              } disabled:opacity-60`}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.label && <ErrorText>{errors.label}</ErrorText>}
      </div>

      <Field
        label="Full name"
        required
        autoComplete="name"
        value={form.fullName}
        error={errors.fullName}
        onChange={(fullName) => onChange({ fullName })}
        disabled={disabled}
      />

      <Field
        label="Mobile number"
        required
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={10}
        placeholder="10-digit mobile number"
        value={form.mobile}
        error={errors.mobile}
        onChange={(mobile) =>
          onChange({ mobile: mobile.replace(/\D/g, "").slice(0, 10) })
        }
        disabled={disabled}
      />

      <Field
        label="House number and street"
        required
        autoComplete="address-line1"
        placeholder="House no., street, building"
        value={form.addressLine1}
        error={errors.addressLine1}
        onChange={(addressLine1) => onChange({ addressLine1 })}
        disabled={disabled}
      />

      <Field
        label="Area / locality"
        required
        autoComplete="address-level3"
        placeholder="Area or colony"
        value={form.area}
        error={errors.area}
        onChange={(area) => onChange({ area })}
        disabled={disabled}
      />

      <Field
        label="Landmark"
        optional
        placeholder="Nearby shop, temple, or landmark"
        value={form.landmark}
        onChange={(landmark) => onChange({ landmark })}
        disabled={disabled}
      />

      <Field
        label="Address line 2"
        optional
        autoComplete="address-line2"
        placeholder="Apartment, floor, etc."
        value={form.addressLine2}
        onChange={(addressLine2) => onChange({ addressLine2 })}
        disabled={disabled}
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="City"
          required
          autoComplete="address-level2"
          value={form.city}
          error={errors.city}
          onChange={(city) => onChange({ city })}
          disabled={disabled}
        />
        <Field
          label="State"
          required
          autoComplete="address-level1"
          value={form.state}
          error={errors.state}
          onChange={(state) => onChange({ state })}
          disabled={disabled}
        />
      </div>

      <Field
        label="Pincode"
        required
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        placeholder="6-digit pincode"
        value={form.pincode}
        error={errors.pincode}
        onChange={(pincode) =>
          onChange({ pincode: pincode.replace(/\D/g, "").slice(0, 6) })
        }
        disabled={disabled}
      />

      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(event) => onChange({ isDefault: event.target.checked })}
          disabled={disabled}
          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30"
        />
        <span className="text-sm text-zinc-700">Save as my default address</span>
      </label>

      <p className="text-xs text-zinc-500">
        Fields marked <span className="font-semibold text-red-600">*</span> are required.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  required = false,
  optional = false,
  error,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  error?: string;
  type?: "text" | "tel";
  inputMode?: "text" | "numeric";
  autoComplete?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = `address-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-800">
        {label}{" "}
        {required && <span className="text-red-600">*</span>}
        {optional && <span className="text-xs font-normal text-zinc-500">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`block min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 py-3 text-base text-zinc-900 outline-none focus:ring-2 disabled:bg-zinc-100 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
            : "border-zinc-300 focus:border-emerald-600 focus:ring-emerald-600/20"
        }`}
      />
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({
  children,
  id,
}: {
  children: string;
  id?: string;
}) {
  return (
    <p id={id} className="mt-1 text-xs font-medium text-red-600" role="alert">
      {children}
    </p>
  );
}
