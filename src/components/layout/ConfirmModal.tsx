"use client";

import { Modal } from "@/components/ui";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning";
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger",
}: Props) {
  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 text-white"
      : "bg-yellow-600 hover:bg-yellow-500 text-white";

  return (
    <Modal isOpen={isOpen} onClose={onCancel} labelledBy="confirm-modal-title" size="sm" className="p-6">
      <h2 id="confirm-modal-title" className="mb-2 text-lg font-semibold text-fg">
        {title}
      </h2>
      <p className="mb-6 text-sm text-fg-muted">{message}</p>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg bg-surface-hover px-4 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${confirmButtonClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
