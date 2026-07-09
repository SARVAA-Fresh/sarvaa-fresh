"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/types";
import { deleteRequest, get, patch, post } from "@/lib/api/client";
import type {
  Category,
  CategoryListResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/lib/api/types";

type StatusFilter = "all" | "active" | "inactive";

type ModalMode = "create" | "edit" | null;

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

const INITIAL_FORM_STATE: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
};

const LIMIT = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-5 w-5 border-2" : "h-10 w-10 border-4";
  return (
    <div
      className={`${sizeClasses} animate-spin rounded-full border-zinc-200 border-t-emerald-600`}
      role="status"
      aria-label="Loading"
    />
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isActive
          ? "bg-emerald-50 text-emerald-800"
          : "bg-zinc-100 text-zinc-600",
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.length > 0
      ? error.messages.join(" ")
      : "Something went wrong.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

function buildQueryString(
  page: number,
  search: string,
  statusFilter: StatusFilter,
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(LIMIT));
  if (search.trim()) {
    params.set("search", search.trim());
  }
  if (statusFilter === "active") {
    params.set("isActive", "true");
  } else if (statusFilter === "inactive") {
    params.set("isActive", "false");
  }
  params.set("sortBy", "updatedAt");
  params.set("sortOrder", "desc");
  return `?${params.toString()}`;
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold text-zinc-900"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(INITIAL_FORM_STATE);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);

  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requestIdRef = useRef<number>(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const fetchCategories = useCallback(
    async (requestId: number, targetPage: number) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const query = buildQueryString(targetPage, searchQuery, statusFilter);
        const data = await get<CategoryListResponse>(`/categories${query}`);
        if (requestIdRef.current !== requestId) {
          return;
        }
        setCategories(data.items);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setErrorMessage(extractErrorMessage(error));
        setCategories([]);
        setTotalPages(0);
        setTotal(0);
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [searchQuery, statusFilter],
  );

  const triggerFetch = useCallback((targetPage: number) => {
    const requestId = ++requestIdRef.current;
    void fetchCategories(requestId, targetPage);
  }, [fetchCategories]);

  useEffect(() => {
    triggerFetch(1);
  }, [triggerFetch]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  useEffect(() => {
    triggerFetch(1);
  }, [searchQuery, statusFilter, triggerFetch]);

  useEffect(() => {
    triggerFetch(page);
  }, [page, triggerFetch]);

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleRetry() {
    triggerFetch(page);
  }

  function openCreateModal() {
    setForm(INITIAL_FORM_STATE);
    setSlugManuallyEdited(false);
    setFormError(null);
    setEditingCategory(null);
    setModalMode("create");
  }

  function openEditModal(category: Category) {
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      isActive: category.isActive,
    });
    setSlugManuallyEdited(false);
    setFormError(null);
    setEditingCategory(category);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setFormError(null);
    setSlugManuallyEdited(false);
    setEditingCategory(null);
  }

  function handleNameChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, name: value };
      if (modalMode === "create" && !slugManuallyEdited) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  }

  function handleSlugChange(value: string) {
    setForm((prev) => ({ ...prev, slug: value }));
    if (modalMode === "create") {
      setSlugManuallyEdited(true);
    }
  }

  function validateForm(): string | null {
    if (!form.name.trim()) {
      return "Name is required.";
    }
    if (!form.slug.trim()) {
      return "Slug is required.";
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      return "Slug may only contain lowercase letters, numbers, and hyphens.";
    }
    return null;
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !modalMode) return;

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload: CreateCategoryRequest = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
    };

    try {
      if (modalMode === "create") {
        await post<Category>("/categories", payload);
        setSuccessMessage("Category created successfully.");
      } else if (modalMode === "edit" && editingCategory) {
        const updatePayload: UpdateCategoryRequest = {};
        if (payload.name !== editingCategory.name) updatePayload.name = payload.name;
        if (payload.slug !== editingCategory.slug) updatePayload.slug = payload.slug;
        if (payload.description !== (editingCategory.description ?? undefined)) {
          updatePayload.description = payload.description;
        }
        if (payload.isActive !== editingCategory.isActive) {
          updatePayload.isActive = payload.isActive;
        }
        await patch<Category>(`/categories/${editingCategory.id}`, updatePayload);
        setSuccessMessage("Category updated successfully.");
      }
      closeModal();
      triggerFetch(page);
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openDeleteModal(category: Category) {
    setDeletingCategory(category);
    setDeleteError(null);
  }

  function closeDeleteModal() {
    setDeletingCategory(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deletingCategory || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteRequest<Category>(`/categories/${deletingCategory.id}`);
      setSuccessMessage("Category deleted successfully.");
      closeDeleteModal();
      const nextPage =
        categories.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      triggerFetch(nextPage);
    } catch (error) {
      setDeleteError(extractErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  const hasFilters = searchQuery || statusFilter !== "all";

  return (
    <div className="space-y-6">
      {successMessage && (
        <div
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          {successMessage}
          <button
            type="button"
            onClick={clearSuccess}
            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100"
            aria-label="Dismiss"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Catalog
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage product categories shown across the storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
        >
          <PlusIcon className="h-4 w-4" />
          Add category
        </button>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search categories…"
              className="block w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["all", "active", "inactive"] as StatusFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleStatusChange(value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  statusFilter === value
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {value === "all" && "All"}
                {value === "active" && "Active"}
                {value === "inactive" && "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
            <Spinner />
            <p className="mt-4 text-sm text-zinc-600">Loading categories…</p>
          </div>
        ) : errorMessage ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircleIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Could not load categories
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-600">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              Retry
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm">
              <InboxIcon className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-900">
              {hasFilters ? "No matching categories" : "No categories yet"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-600">
              {hasFilters
                ? "Try adjusting your search or filter to find what you’re looking for."
                : "Get started by adding your first product category."}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                <PlusIcon className="h-4 w-4" />
                Add category
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Slug</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="bg-white transition-colors hover:bg-zinc-50/50"
                    >
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {category.name}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {category.slug}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {category.description?.trim() || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge isActive={category.isActive} />
                      </td>
                      <td className="px-5 py-3 text-zinc-500">
                        {formatDate(category.updatedAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(category)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                          >
                            <EditIcon className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(category)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-zinc-100 md:hidden">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white p-4 transition-colors hover:bg-zinc-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {category.name}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        /{category.slug}
                      </p>
                    </div>
                    <StatusBadge isActive={category.isActive} />
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">
                    {category.description?.trim() || "—"}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <span>Updated {formatDate(category.updatedAt)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(category)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <EditIcon className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(category)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 font-medium text-red-700 transition-colors hover:bg-red-50"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-4">
                <p className="text-xs text-zinc-500">
                  Showing {categories.length} of {total} categories
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === "create" ? "Add category" : "Edit category"}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div
              className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}
          <div>
            <label
              htmlFor="category-name"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="category-name"
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100"
              placeholder="e.g. Fresh Vegetables"
            />
          </div>
          <div>
            <label
              htmlFor="category-slug"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              id="category-slug"
              type="text"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100"
              placeholder="fresh-vegetables"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
          <div>
            <label
              htmlFor="category-description"
              className="mb-1.5 block text-sm font-medium text-zinc-700"
            >
              Description
            </label>
            <textarea
              id="category-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              disabled={isSubmitting}
              rows={3}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100"
              placeholder="Short description of the category"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30"
            />
            <span className="text-sm font-medium text-zinc-700">
              Category is active
            </span>
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting
                ? "Saving…"
                : modalMode === "create"
                  ? "Create category"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingCategory !== null}
        onClose={closeDeleteModal}
        title="Delete category"
      >
        <div className="space-y-4">
          {deleteError && (
            <div
              className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {deleteError}
            </div>
          )}
          <p className="text-sm text-zinc-600">
            Are you sure you want to delete{" "}
            <strong className="text-zinc-900">
              {deletingCategory?.name}
            </strong>
            ?
          </p>
          <p className="text-sm text-zinc-600">
            This will remove the category from the active category list. This
            action cannot be undone from the admin panel.
          </p>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting && <Spinner size="sm" />}
              {isDeleting ? "Deleting…" : "Delete category"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
