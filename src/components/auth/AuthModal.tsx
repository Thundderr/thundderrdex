"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type View = "signIn" | "signUp" | "forgot" | "signUpSent" | "forgotSent";

const INPUT_CLASSES =
  "w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500";
const PRIMARY_BUTTON_CLASSES =
  "w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors";
const LINK_CLASSES = "text-blue-400 hover:text-blue-300 transition-colors";

const TITLES: Record<View, string> = {
  signIn: "Sign in",
  signUp: "Create account",
  forgot: "Reset password",
  signUpSent: "Check your email",
  forgotSent: "Check your email",
};

interface Props {
  onClose: () => void;
}

export function AuthModal({ onClose }: Props) {
  const [view, setView] = useState<View>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchView = (next: View) => {
    setView(next);
    setError(null);
    setPassword("");
    setConfirm("");
  };

  const handleSignIn = async () => {
    if (!supabase || pending) return;
    const trimmed = email.trim();
    if (!trimmed || !password) return;
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    setPending(false);
    if (err) {
      setError(
        err.code === "email_not_confirmed"
          ? "Please verify your email first — check your inbox for the confirmation link."
          : err.message
      );
      return;
    }
    onClose();
  };

  const handleSignUp = async () => {
    if (!supabase || pending) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
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
    const { data, error: err } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    // Supabase returns a user with no identities when the email is taken.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists.");
      return;
    }
    setView("signUpSent");
  };

  const handleForgot = async () => {
    if (!supabase || pending) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: window.location.origin,
    });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    setView("forgotSent");
  };

  const submit =
    view === "signIn" ? handleSignIn : view === "signUp" ? handleSignUp : view === "forgot" ? handleForgot : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && submit) void submit();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg p-4 max-w-sm mx-4 shadow-xl border border-slate-700 w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3 className="text-sm font-semibold text-white mb-3">{TITLES[view]}</h3>

        {view === "signUpSent" && (
          <>
            <p className="text-xs text-slate-300">
              We sent a confirmation link to <span className="text-white">{email.trim()}</span>. Click it to verify
              your account, then sign in.
            </p>
            <button onClick={() => switchView("signIn")} className={`${PRIMARY_BUTTON_CLASSES} mt-3`}>
              Back to sign in
            </button>
          </>
        )}

        {view === "forgotSent" && (
          <>
            <p className="text-xs text-slate-300">
              If an account exists for <span className="text-white">{email.trim()}</span>, a password reset link is on
              its way.
            </p>
            <button onClick={() => switchView("signIn")} className={`${PRIMARY_BUTTON_CLASSES} mt-3`}>
              Back to sign in
            </button>
          </>
        )}

        {(view === "signIn" || view === "signUp" || view === "forgot") && (
          <div className="flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email..."
              className={INPUT_CLASSES}
              autoFocus
              autoComplete="email"
            />
            {view !== "forgot" && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={view === "signUp" ? "Password (min 8 characters)..." : "Password..."}
                className={INPUT_CLASSES}
                autoComplete={view === "signUp" ? "new-password" : "current-password"}
              />
            )}
            {view === "signUp" && (
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password..."
                className={INPUT_CLASSES}
                autoComplete="new-password"
              />
            )}

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            <button onClick={() => submit && void submit()} disabled={pending} className={`${PRIMARY_BUTTON_CLASSES} mt-1`}>
              {pending
                ? view === "signIn"
                  ? "Signing in..."
                  : view === "signUp"
                    ? "Creating account..."
                    : "Sending..."
                : view === "signIn"
                  ? "Sign in"
                  : view === "signUp"
                    ? "Create account"
                    : "Send reset link"}
            </button>

            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              {view === "signIn" && (
                <>
                  <button onClick={() => switchView("signUp")} className={LINK_CLASSES}>
                    Create account
                  </button>
                  <button onClick={() => switchView("forgot")} className={LINK_CLASSES}>
                    Forgot password?
                  </button>
                </>
              )}
              {(view === "signUp" || view === "forgot") && (
                <button onClick={() => switchView("signIn")} className={LINK_CLASSES}>
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
