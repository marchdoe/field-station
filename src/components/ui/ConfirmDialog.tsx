import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      className="m-auto backdrop:bg-black/50 bg-surface-1 border border-border-default rounded-xl p-0 max-w-md w-full shadow-xl"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          )}
          <div>
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-text-primary">
              {title}
            </h3>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              variant === "danger"
                ? "bg-danger text-white hover:bg-danger/90"
                : "bg-accent text-white hover:bg-accent/90",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
