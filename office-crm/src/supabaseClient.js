import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

export let supabaseInitError = null;
let client = null;

if (supabaseConfigured) {
  try {
    client = createClient(url, key);
  } catch (e) {
    supabaseInitError = e?.message || String(e);
  }
} else {
  supabaseInitError = "VITE_SUPABASE_URL یا VITE_SUPABASE_ANON_KEY تنظیم نشده است.";
}

export const supabase = client;
