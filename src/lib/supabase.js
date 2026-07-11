import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const looksValid = typeof url === "string" && /^https?:\/\//.test(url);

export const configError = !looksValid || !key
  ? "Supabase-gegevens ontbreken of kloppen niet. Zet VITE_SUPABASE_URL (inclusief https://) en VITE_SUPABASE_ANON_KEY in Vercel onder Settings → Environment Variables, en deploy opnieuw."
  : null;

export const supabase = configError ? null : createClient(url, key);
