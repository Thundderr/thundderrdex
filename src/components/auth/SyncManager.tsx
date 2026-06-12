"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { startSync, stopSync } from "@/lib/sync/syncEngine";
import { useAuthStore } from "@/stores/authStore";
import { ResetPasswordModal } from "./ResetPasswordModal";

// Bridges Supabase auth events to the auth store and the sync engine.
// Renders nothing except the password-recovery modal when needed.
export function SyncManager() {
  const recoveryMode = useAuthStore((s) => s.recoveryMode);

  useEffect(() => {
    if (!supabase) {
      useAuthStore.getState().setAuth("signedOut", null);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const { setAuth, setRecoveryMode } = useAuthStore.getState();
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      if (session?.user) {
        setAuth("signedIn", {
          id: session.user.id,
          email: session.user.email ?? "",
        });
        // Deferred: supabase-js can deadlock if its own APIs are called
        // synchronously inside an onAuthStateChange callback.
        const userId = session.user.id;
        setTimeout(() => void startSync(userId), 0);
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        stopSync();
        setAuth("signedOut", null);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopSync();
    };
  }, []);

  return recoveryMode ? <ResetPasswordModal /> : null;
}
