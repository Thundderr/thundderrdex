import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Both vars must be set for accounts/sync to be available. Without them the
// app still works fully with local-only state and the sign-in UI is hidden.
export const isSupabaseConfigured = Boolean(url && anonKey);

// detectSessionInUrl is what makes the email-verification and
// password-recovery links work in this pure client-side app: Supabase
// redirects back with tokens in the URL hash and the client consumes them.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
