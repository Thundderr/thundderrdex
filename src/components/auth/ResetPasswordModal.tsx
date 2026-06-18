"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

const INPUT_CLASSES =
  "w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500";
const PRIMARY_BUTTON_CLASSES =
  "w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors";

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
    if (e.key === "Escape") close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={close}>
      <div
        className="bg-slate-800 rounded-lg p-4 max-w-sm mx-4 shadow-xl border border-slate-700 w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3 className="text-sm font-semibold text-white mb-3">Set a new password</h3>

        {done ? (
          <>
            <p className="text-xs text-slate-300">Your password has been updated.</p>
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
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <button onClick={() => void handleSubmit()} disabled={pending} className={`${PRIMARY_BUTTON_CLASSES} mt-1`}>
              {pending ? "Updating..." : "Update password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
