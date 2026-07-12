"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { ApiError } from "@/lib/api/types";
import { deleteRequest, get, patch, post } from "@/lib/api/client";
import type {
  Address,
  AddressListResponse,
  CreateAddressRequest,
  UpdateAddressRequest,
} from "@/lib/api/types";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";
import {
  AddressForm,
  EMPTY_ADDRESS_FORM,
  type AddressFormState,
  toAddressRequest,
} from "@/components/storefront/AddressForm";

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.join(" ") || "Something went wrong.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600"
      role="status"
      aria-label="Loading"
    />
  );
}

function Icon({
  name,
  className,
}: {
  name: "plus" | "edit" | "trash" | "star" | "check";
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
      {name === "plus" && (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      )}
      {name === "edit" && (
        <>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </>
      )}
      {name === "trash" && (
        <>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </>
      )}
      {name === "star" && <path d="M12 2l2.9 6.1L21 9l-4.5 4.3L17.6 20 12 16.9 6.4 20l1.1-6.7L3 9l6.1-.9L12 2z" />}
      {name === "check" && <polyline points="20 6 9 17 4 12" />}
    </svg>
  );
}

function Modal({
  isOpen,
  title,
  children,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6">
      <button type="button" className="fixed inset-0 bg-zinc-900/40" onClick={onClose} aria-label="Close dialog" />
      <div className="relative my-auto w-full max-w-2xl rounded-[28px] border border-zinc-200 bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { customer, logout, isAuthenticated } = useCustomerAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [defaultChangingId, setDefaultChangingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await get<AddressListResponse>("/addresses", {
          authScope: "customer",
        });
        if (cancelled) return;
        setAddresses(data);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(extractMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  function openCreate() {
    setModalMode("create");
    setEditingAddress(null);
    setForm(EMPTY_ADDRESS_FORM);
    setFormError(null);
  }

  function openEdit(address: Address) {
    setModalMode("edit");
    setEditingAddress(address);
    setForm({
      label: address.label,
      fullName: address.fullName,
      mobile: address.mobile,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
      landmark: address.landmark ?? "",
      area: address.area,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = toAddressRequest(form);
      if (modalMode === "create") {
        const created = await post<Address>("/addresses", payload, {
          authScope: "customer",
        });
        setAddresses((current) => [created, ...current.filter((address) => address.id !== created.id)]);
        setSuccessMessage("Address created.");
      } else if (modalMode === "edit" && editingAddress) {
        const updatePayload: UpdateAddressRequest = {};
        const nextPayload: CreateAddressRequest = payload;
        const currentValues = editingAddress as unknown as Record<string, unknown>;
        (Object.keys(nextPayload) as (keyof CreateAddressRequest)[]).forEach((key) => {
          if (nextPayload[key] !== currentValues[key]) {
            (updatePayload as Record<string, unknown>)[key] = nextPayload[key];
          }
        });
        const updated = await patch<Address>(`/addresses/${editingAddress.id}`, updatePayload, {
          authScope: "customer",
        });
        setAddresses((current) => current.map((address) => (address.id === updated.id ? updated : address)));
        setSuccessMessage("Address updated.");
      }
      setModalMode(null);
      setEditingAddress(null);
    } catch (error) {
      setFormError(extractMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteRequest(`/addresses/${deleteTarget.id}`, {
        authScope: "customer",
      });
      setAddresses((current) => current.filter((address) => address.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccessMessage("Address deleted.");
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDefault(address: Address) {
    setDefaultChangingId(address.id);
    setErrorMessage(null);
    try {
      const updated = await patch<Address>(`/addresses/${address.id}/default`, {}, {
        authScope: "customer",
      });
      setAddresses((current) => current.map((item) => (item.id === updated.id ? updated : { ...item, isDefault: false })));
      setSuccessMessage("Default address updated.");
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setDefaultChangingId(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Sign in to manage your account
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          You can view orders and saved addresses after signing in.
        </p>
        <Link
          href="/auth?next=/account"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <header className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
          {customer?.fullName ?? "Your profile"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Manage your addresses and keep checkout ready.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            View orders
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="space-y-4 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Delivery addresses
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">
              Saved addresses
            </h2>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add address
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
            No saved addresses yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {addresses.map((address) => (
              <article
                key={address.id}
                className={`rounded-2xl border p-4 ${
                  address.isDefault
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-950">{address.label}</p>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          <Icon name="check" className="h-3.5 w-3.5" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">{address.fullName} | {address.mobile}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {address.addressLine1}
                      {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {address.area}, {address.city}, {address.state} {address.pincode}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => void handleDefault(address)}
                        disabled={defaultChangingId === address.id}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {defaultChangingId === address.id ? <Spinner /> : <Icon name="star" className="h-3.5 w-3.5" />}
                        Make default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(address)}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      <Icon name="edit" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(address)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={modalMode !== null}
        title={modalMode === "create" ? "Add address" : "Edit address"}
        onClose={() => {
          setModalMode(null);
          setEditingAddress(null);
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <AddressForm
            form={form}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          />
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving && <Spinner />}
            {isSaving ? "Saving..." : "Save address"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        title="Delete address"
        onClose={() => setDeleteTarget(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Delete <span className="font-semibold text-zinc-950">{deleteTarget?.label}</span>?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="flex-1 rounded-full bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
