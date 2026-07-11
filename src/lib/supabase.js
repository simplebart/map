import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase-gegevens ontbreken. Kopieer .env.example naar .env en vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in."
  );
}

export const supabase = createClient(url, key);
