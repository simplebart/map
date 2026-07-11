import { supabase } from "./supabase";

// ── Plekken ───────────────────────────────────────────────────

export async function fetchPlaces() {
  const { data, error } = await supabase
    .from("places")
    .select("id, name, note, address, lat, lng, tag_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPlace({ name, note, address, lat, lng, tag_id }) {
  const { data, error } = await supabase
    .from("places")
    .insert({ name, note, address, lat, lng, tag_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlace(id, patch) {
  const { data, error } = await supabase
    .from("places")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlace(id) {
  const { error } = await supabase.from("places").delete().eq("id", id);
  if (error) throw error;
}

// ── Tags ──────────────────────────────────────────────────────

export async function fetchTags() {
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, emoji, color")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTag({ name, emoji, color }) {
  const { data, error } = await supabase
    .from("tags")
    .insert({ name, emoji, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(id) {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

// ── Realtime: telefoon en laptop bijgewerkt houden ────────────
// Retourneert een functie om het abonnement weer op te zeggen.

export function subscribeToChanges(userId, onChange) {
  const channel = supabase
    .channel("plekken-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "places", filter: `user_id=eq.${userId}` },
      () => onChange("places")
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tags", filter: `user_id=eq.${userId}` },
      () => onChange("tags")
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ── Adres opzoeken bij coördinaten (gratis, geen sleutel) ─────

export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`
    );
    const d = await r.json();
    const a = d?.address ?? {};
    const street = [a.road, a.house_number].filter(Boolean).join(" ");
    const city = a.city || a.town || a.village || a.municipality;
    return [street, city].filter(Boolean).join(", ") || d?.display_name || "";
  } catch {
    return "";
  }
}

export async function searchCity(query) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  );
  const d = await r.json();
  if (!d?.[0]) return null;
  return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
}
