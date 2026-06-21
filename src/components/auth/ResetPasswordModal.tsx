"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Modal } from "@/components/ui";

const INPUT_CLASSES =
  "w-full px-3 py-2 text-sm bg-surface border border-line rounded text-fg placeholder-fg-subtle focus:outline-none focus:border-accent";
const PRIMARY_BUTTON_CLASSES =
  "w-full px-3 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// Shown when the user arrives via a password-reset email link (Supabase
// fires PASSWORD_RECOVERY and signs them in with a recovery session).
export function ResetPasswordModal() {
  const setRecoveryMode = useAuthStore((s) => s.setRecoveryMode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const close = () => setRecoveryMode(false);

  const handleSubmit = async () => {
    if (!supabase || pending) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !done) void handleSubmit();
  };

  return (
    <Modal isOpen onClose={close} labelledBy="reset-pw-title" size="sm" className="p-4" dismissOnBackdrop={false}>
      <div onKeyDown={handleKeyDown}>
        <h3 id="reset-pw-title" className="text-sm font-semibold text-fg mb-3">Set a new password</h3>

        {done ? (
          <>
            <p className="text-xs text-fg-muted">Your password has been updated.</p>
            <button onClick={close} className={`${PRIMARY_BUTTON_CLASSES} mt-3`}>
              Done
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)..."
              className={INPUT_CLASSES}
              autoFocus
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password..."
              className={INPUT_CLASSES}
              autoComplete="new-password"
            />
            {error && <p className="text-2xs text-red-400">{error}</p>}
            <button onClick={() => void handleSubmit()} disabled={pending} className={`${PRIMARY_BUTTON_CLASSES} mt-1`}>
              {pending ? "Updating..." : "Update password"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
