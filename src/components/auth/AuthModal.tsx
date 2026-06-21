"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Modal } from "@/components/ui";

type View = "signIn" | "signUp" | "forgot" | "signUpSent" | "forgotSent";

const INPUT_CLASSES =
  "w-full px-3 py-2 text-sm bg-surface border border-line rounded text-fg placeholder-fg-subtle focus:outline-none focus:border-accent";
const PRIMARY_BUTTON_CLASSES =
  "w-full px-3 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const LINK_CLASSES = "text-accent hover:text-accent-hover transition-colors focus-visible:outline-none focus-visible:underline";

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
  };

  return (
    <Modal isOpen onClose={onClose} labelledBy="auth-modal-title" size="sm" className="p-4">
      <div onKeyDown={handleKeyDown}>
        <h3 id="auth-modal-title" className="text-sm font-semibold text-fg mb-3">{TITLES[view]}</h3>

        {view === "signUpSent" && (
          <>
            <p className="text-xs text-fg-muted">
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
            <p className="text-xs text-fg-muted">
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

            {error && <p className="text-2xs text-red-400">{error}</p>}

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

            <div className="flex justify-between text-2xs text-fg-subtle mt-1">
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
    </Modal>
  );
}
