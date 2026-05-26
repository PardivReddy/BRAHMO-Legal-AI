/**
 * @module lib/supabase
 * @description Supabase client initialization for BRAHMO Legal AI.
 * Exports a typed public client and a server-side admin client.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Environment validation
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let publicClient: SupabaseClient<any> | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Public (anon) client — safe for client-side & server components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Typed Supabase client using the anonymous/public key.
 * Suitable for use in both client-side and server-side code where
 * Row Level Security (RLS) policies apply.
 */
// Use a lazy proxy so importing API routes during build does not require runtime env vars.
export const supabase: SupabaseClient<any> = new Proxy({} as SupabaseClient<any>, {
  get(_target, property, receiver) {
    const value = Reflect.get(getPublicClient(), property, receiver);
    return typeof value === 'function' ? value.bind(getPublicClient()) : value;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin client — server-side only, bypasses RLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Supabase admin client using the service role key.
 * This client bypasses RLS — use **only** in server-side code
 * (API routes, server actions, background jobs).
 *
 * @returns A typed Supabase admin client
 * @throws If SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function getAdminClient(): SupabaseClient<any> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[BRAHMO] Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
        'The admin client can only be used server-side. ' +
        'Set it in .env.local to your Supabase service role key.'
    );
  }

  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getPublicClient(): SupabaseClient<any> {
  if (!SUPABASE_URL) {
    throw new Error(
      '[BRAHMO] Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
        'Set it in .env.local to your Supabase project URL.'
    );
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      '[BRAHMO] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
        'Set it in .env.local to your Supabase anonymous/public key.'
    );
  }

  if (!publicClient) {
    publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return publicClient;
}

export default supabase;
