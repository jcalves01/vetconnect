/* ============================================================================
   src/lib/supabase.js — SUPABASE CLIENT SINGLETON
   ----------------------------------------------------------------------------
   Unlike the Anthropic API key (api/_anthropic.js, kept server-side only),
   the Supabase URL + anon key are meant to ship to the browser. Access
   control is enforced by Postgres Row Level Security policies (see
   supabase/migrations/), not by hiding this key.
   ============================================================================ */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não estão definidas. Copia .env.example para .env.local e preenche-as (ver README.md)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
