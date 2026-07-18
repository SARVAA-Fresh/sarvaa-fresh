"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api/types";
import { buildAssetUrl, get, isImageUrl, post, postForm } from "@/lib/api/client";
import type {
  Address,
  AddressListResponse,
  CreateOrderRequest,
  Payment,
  PaymentMethod,
  PublicSettings,
} from "@/lib/api/types";
import { useCart } from "@/lib/cart/CartProvider";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";
import {
  AddressForm,
  EMPTY_ADDRESS_FORM,
  type AddressFormState,
  toAddressRequest,
} from "@/components/storefront/AddressForm";
import {
  calculateDeliveryPolicy,
  normalizeSettings,
  storeStatusMessage,
} from "@/lib/settings/settings";

function formatMoney(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return "Rs. 0.00";
  return `Rs. ${numeric.toFixed(2)}`;
}

function Spinner() {
  return (
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"
      role="status"
      aria-label="Loading"
    />
  );
}

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.join(" ") || "Something went wrong.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

function Icon({
  name,
  className,
}: {
  name: "check" | "upload" | "coin" | "address" | "plus";
  className?: string;
}) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  return (
    <svg {...common}>
      {name === "check" && <polyline points="20 6 9 17 4 12" />}
      {name === "upload" && (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </>
      )}
      {name === "coin" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M9 12h6a2 2 0 0 0 0-4h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />
        </>
      )}
      {name === "address" && (
        <>
          <path d="M12 21s6-4.5 6-11a6 6 0 0 0-12 0c0 6.5 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2.25" />
        </>
      )}
      {name === "plus" && (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      )}
    </svg>
  );
}

export default function CheckoutPage() {
  const { isAuthenticated } = useCustomerAuth();
  const { lines, subtotal, clearCart, syncToBackend } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] =
    useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    payment: Payment | null;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofSuccess, setProofSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicSettings>(() =>
    normalizeSettings(null),
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const data = await get<PublicSettings>("/settings/public", {
          skipAuth: true,
        });
        if (!cancelled) {
          const nextSettings = normalizeSettings(data);
          setSettings(nextSettings);
          const methods = nextSettings.payment.availableMethods;
          if (methods.length > 0 && !methods.includes(paymentMethod)) {
            setPaymentMethod(methods[0]);
          }
        }
      } catch {
        if (!cancelled) setSettings(normalizeSettings(null));
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [paymentMethod]);

  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      if (!isAuthenticated) {
        setIsLoadingAddresses(false);
        return;
      }
      setIsLoadingAddresses(true);
      setAddressError(null);
      try {
        const data = await get<AddressListResponse>("/addresses", {
          authScope: "customer",
        });
        if (cancelled) return;
        setAddresses(data);
        const defaultAddress = data.find((address) => address.isDefault) ?? data[0] ?? null;
        setSelectedAddressId(defaultAddress?.id ?? "");
      } catch (error) {
        if (cancelled) return;
        setAddressError(extractMessage(error));
        setAddresses([]);
      } finally {
        if (!cancelled) setIsLoadingAddresses(false);
      }
    }

    void loadAddresses();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (proofPreview) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );
  const deliveryPolicy = calculateDeliveryPolicy(subtotal, settings);
  const statusMessage = storeStatusMessage(settings);
  const availablePaymentMethods = settings.payment.availableMethods.length
    ? settings.payment.availableMethods
    : [];
  const payableTotal = subtotal + deliveryPolicy.deliveryCharge;
  const noPaymentMethods = availablePaymentMethods.length === 0;
  const placedOrderQrImageUrl =
    placedOrder?.payment?.qrImageUrl && isImageUrl(placedOrder.payment.qrImageUrl)
      ? placedOrder.payment.qrImageUrl
      : settings.payment.qrImageUrl && isImageUrl(settings.payment.qrImageUrl)
        ? settings.payment.qrImageUrl
        : null;

  async function handleCreateAddress() {
    const payload = toAddressRequest(addressForm);
    if (!payload.label || !payload.fullName || !payload.mobile || !payload.addressLine1 || !payload.area || !payload.city || !payload.state || !payload.pincode) {
      setAddressError("Please fill out the address fields.");
      return;
    }
    setIsSavingAddress(true);
    setAddressError(null);
    try {
      const created = await post<Address>("/addresses", payload, {
        authScope: "customer",
      });
      setAddresses((current) => [created, ...current.filter((address) => address.id !== created.id)]);
      setSelectedAddressId(created.id);
      setAddressForm(EMPTY_ADDRESS_FORM);
    } catch (error) {
      setAddressError(extractMessage(error));
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handlePlaceOrder() {
    if (!isAuthenticated) return;
    if (!selectedAddressId) {
      setPlaceError("Please select or create a delivery address.");
      return;
    }
    if (lines.length === 0) {
      setPlaceError("Your cart is empty.");
      return;
    }
    if (deliveryPolicy.checkoutDisabled) {
      setPlaceError(statusMessage ?? deliveryPolicy.message);
      return;
    }
    if (noPaymentMethods) {
      setPlaceError("No payment method is currently available. Please contact the store.");
      return;
    }
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPlaceError("Selected payment method is currently unavailable.");
      return;
    }

    setIsPlacingOrder(true);
    setPlaceError(null);
    setProofSuccess(null);

    try {
      await syncToBackend();
      const order = await post<{ id: string; orderNumber: string }>("/orders", {
        addressId: selectedAddressId,
      } satisfies CreateOrderRequest, {
        authScope: "customer",
      });
      const payment = await post<Payment>(
        `/payments/order/${order.id}`,
        { paymentMethod },
        { authScope: "customer" },
      );
      setPlacedOrder({ orderId: order.id, orderNumber: order.orderNumber, payment });
      clearCart();
    } catch (error) {
      setPlaceError(extractMessage(error));
    } finally {
      setIsPlacingOrder(false);
    }
  }

  async function handleProofUpload() {
    if (!placedOrder || !proofFile) {
      setProofError("Choose a proof image first.");
      return;
    }
    setIsUploadingProof(true);
    setProofError(null);
    try {
      const formData = new FormData();
      formData.set("proof", proofFile);
      await postForm<Payment>(
        `/payments/order/${placedOrder.orderId}/proof`,
        formData,
        { authScope: "customer" },
      );
      setProofSuccess("Payment proof uploaded. Verification is in progress.");
    } catch (error) {
      setProofError(extractMessage(error));
    } finally {
      setIsUploadingProof(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Sign in to continue
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          We&apos;ll use your account to place the order and save your delivery
          address.
        </p>
        <Link
          href="/auth?next=/checkout"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (lines.length === 0 && !placedOrder) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Your cart is empty
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Add a product before coming back to checkout.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Browse products
        </Link>
      </div>
    );
  }

  if (placedOrder) {
    return (
      <div className="space-y-6 pb-6">
        <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Icon name="check" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Order placed
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                {placedOrder.orderNumber}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Your order has been created. If you selected UPI, upload the
                payment proof below so verification can begin.
              </p>
            </div>
          </div>
        </section>

        {placedOrder.payment?.paymentMethod === "UPI" && (
          <section className="grid gap-4 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                UPI payment
              </p>
              <h2 className="text-xl font-semibold text-zinc-950">
                Complete the payment
              </h2>
              <p className="text-sm text-zinc-600">
                Complete the UPI payment, then upload the receipt image here.
              </p>
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-600">Merchant</span>
                  <span className="text-right font-semibold text-zinc-950">
                    {placedOrder.payment.merchantName || settings.payment.upiDisplayName || "Not configured"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-zinc-600">UPI ID</span>
                  <span className="break-all text-right font-semibold text-zinc-950">
                    {placedOrder.payment.upiId || settings.payment.upiId || "Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Amount</span>
                  <span className="font-semibold text-zinc-950">
                    {formatMoney(placedOrder.payment.amount)}
                  </span>
                </div>
                {(placedOrder.payment.paymentInstructions || settings.payment.instructions) && (
                  <p className="mt-3 rounded-xl bg-white p-3 text-zinc-600">
                    {placedOrder.payment.paymentInstructions || settings.payment.instructions}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(placedOrder.payment.upiId || settings.payment.upiId) && (
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard?.writeText(
                          placedOrder.payment?.upiId || settings.payment.upiId || "",
                        )
                      }
                      className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      Copy UPI ID
                    </button>
                  )}
                  {placedOrder.payment.paymentUrl && (
                    <a
                      href={placedOrder.payment.paymentUrl}
                      className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Open UPI Intent
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-zinc-200 p-4">
              {placedOrderQrImageUrl && (
                <div className="rounded-2xl bg-white p-3 text-center">
                  <img
                    src={buildAssetUrl(placedOrderQrImageUrl) ?? placedOrderQrImageUrl}
                    alt="UPI payment QR code"
                    className="mx-auto h-48 w-48 rounded-xl object-contain"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Scan on desktop or open the UPI link on mobile.
                  </p>
                </div>
              )}
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-700">
                  Upload proof
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (proofPreview) {
                      URL.revokeObjectURL(proofPreview);
                    }
                    setProofFile(file);
                    setProofPreview(file ? URL.createObjectURL(file) : null);
                    setProofError(null);
                    setProofSuccess(null);
                  }}
                  className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700"
                />
              </label>
              {proofPreview && (
                <img
                  src={proofPreview}
                  alt="Payment proof preview"
                  className="aspect-video w-full rounded-2xl border border-zinc-200 object-cover"
                />
              )}
              {proofError && (
                <p className="text-sm text-red-700">{proofError}</p>
              )}
              {proofSuccess && (
                <p className="text-sm text-emerald-700">{proofSuccess}</p>
              )}
              <button
                type="button"
                onClick={() => void handleProofUpload()}
                disabled={isUploadingProof || !proofFile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isUploadingProof ? <Spinner /> : <Icon name="upload" className="h-4 w-4" />}
                {isUploadingProof ? "Uploading..." : "Upload proof"}
              </button>
            </div>
          </section>
        )}

        {placedOrder.payment?.paymentMethod === "COD" && (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">
              Cash on delivery confirmed
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Your order is ready and will be paid for on delivery.
            </p>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            View orders
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Icon name="address" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Delivery address
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                Choose where to deliver
              </h1>
            </div>
          </div>

          {isLoadingAddresses ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : addressError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {addressError}
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                      selectedAddressId === address.id
                        ? "border-emerald-300 bg-emerald-50/50"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="mt-1 h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-600/30"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-zinc-950">
                            {address.label}
                          </p>
                          {address.isDefault && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-600">
                          {address.fullName} | {address.mobile}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                          {address.landmark ? `, ${address.landmark}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {address.area}, {address.city}, {address.state} {address.pincode}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">Add a new address</p>
                <div className="mt-4">
                  <AddressForm
                    form={addressForm}
                    onChange={(patch) =>
                      setAddressForm((current) => ({ ...current, ...patch }))
                    }
                    disabled={isSavingAddress}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreateAddress()}
                  disabled={isSavingAddress}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isSavingAddress ? <Spinner /> : <Icon name="plus" className="h-4 w-4" />}
                  Save address
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Payment method
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {noPaymentMethods ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:col-span-2">
                No payment method is currently available. Please contact the store.
              </div>
            ) : availablePaymentMethods.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  paymentMethod === method
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <p className="font-semibold text-zinc-950">{method}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {method === "COD"
                    ? "Pay when the order arrives."
                    : "Pay with UPI and upload the proof image."}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Order summary
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">Review</h2>
        </div>

        <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm">
          {lines.map((line) => (
            <div key={line.key} className="flex items-center justify-between gap-3">
              <span className="truncate text-zinc-600">
                {line.product.name} x {line.quantity}
              </span>
              <span className="font-medium text-zinc-950">
                {formatMoney(Number.parseFloat(line.variant.price) * line.quantity)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
            <span className="text-zinc-600">Subtotal</span>
            <span className="text-base font-semibold text-zinc-950">
              {formatMoney(subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Delivery</span>
            <span className="font-medium text-zinc-950">
              {deliveryPolicy.deliveryCharge > 0
                ? formatMoney(deliveryPolicy.deliveryCharge)
                : "FREE"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
            <span className="font-semibold text-zinc-700">Total</span>
            <span className="text-base font-bold text-zinc-950">
              {formatMoney(payableTotal)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {statusMessage ?? deliveryPolicy.message}
        </div>

        {selectedAddress && (
          <div className="rounded-2xl border border-zinc-200 p-4 text-sm">
            <p className="font-semibold text-zinc-950">Delivering to</p>
            <p className="mt-1 text-zinc-600">{selectedAddress.label}</p>
            <p className="mt-1 text-zinc-600">{selectedAddress.fullName}</p>
          </div>
        )}

        {placeError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {placeError}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handlePlaceOrder()}
          disabled={isPlacingOrder || lines.length === 0 || deliveryPolicy.checkoutDisabled || noPaymentMethods}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPlacingOrder ? <Spinner /> : <Icon name="coin" className="h-4 w-4" />}
          {isPlacingOrder ? "Placing order..." : "Place order"}
        </button>
      </aside>
    </div>
  );
}
