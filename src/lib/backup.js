import { supabase } from "./supabase";
import { fetchPlaces, fetchTags } from "./api";

const FORMAT = "mijn-plekken/v1";

// ── Exporteren ────────────────────────────────────────────────
// Alles in één JSON-bestand. Tags zitten er volledig in (niet alleen hun id),
// zodat de backup op zichzelf staat en ook zonder database te lezen is.

export async function exportBackup() {
  const [tags, places] = await Promise.all([fetchTags(), fetchPlaces()]);
  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  const payload = {
    format: FORMAT,
    exported_at: new Date().toISOString(),
    tags: tags.map(({ name, emoji, color }) => ({ name, emoji, color })),
    places: places.map((p) => ({
      name: p.name,
      note: p.note,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      tag: tagsById[p.tag_id]?.name ?? null, // op naam, niet op id
    })),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  download(`mijn-plekken-${stamp}.json`, JSON.stringify(payload, null, 2));
  return payload.places.length;
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Importeren ────────────────────────────────────────────────
// Voegt toe, overschrijft niets. Tags worden op naam gekoppeld; bestaat een tag
// nog niet, dan wordt hij aangemaakt. Plekken die er qua naam + coördinaten al
// zijn, worden overgeslagen — zo kun je hetzelfde bestand twee keer importeren
// zonder dubbele plekken te krijgen.

export async function importBackup(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Dit bestand is geen geldige JSON.");
  }

  if (data?.format !== FORMAT || !Array.isArray(data.places)) {
    throw new Error("Dit lijkt geen backup van Mijn plekken te zijn.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  if (!user_id) throw new Error("Je bent niet ingelogd.");

  // 1. Tags: bestaande hergebruiken, ontbrekende aanmaken
  const existingTags = await fetchTags();
  const byName = new Map(existingTags.map((t) => [t.name.toLowerCase(), t]));

  const missing = (data.tags ?? []).filter((t) => !byName.has(t.name?.toLowerCase()));
  if (missing.length) {
    const { data: made, error } = await supabase
      .from("tags")
      .insert(missing.map((t) => ({
        user_id,
        name: t.name,
        emoji: t.emoji || "📍",
        color: t.color || "#0f2b24",
      })))
      .select();
    if (error) throw error;
    made.forEach((t) => byName.set(t.name.toLowerCase(), t));
  }

  // 2. Plekken: dubbele overslaan
  const existingPlaces = await fetchPlaces();
  const seen = new Set(
    existingPlaces.map((p) => key(p.name, p.lat, p.lng))
  );

  const rows = data.places
    .filter((p) => p?.name && Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .filter((p) => !seen.has(key(p.name, p.lat, p.lng)))
    .map((p) => ({
      user_id,
      name: p.name,
      note: p.note ?? null,
      address: p.address ?? null,
      lat: p.lat,
      lng: p.lng,
      tag_id: p.tag ? byName.get(p.tag.toLowerCase())?.id ?? null : null,
    }));

  if (rows.length) {
    const { error } = await supabase.from("places").insert(rows);
    if (error) throw error;
  }

  return {
    added: rows.length,
    skipped: data.places.length - rows.length,
    newTags: missing.length,
  };
}

// coördinaten afronden: dezelfde plek twee keer opgeslagen wijkt vaak
// een paar meter af, en dat willen we niet als "nieuw" tellen
const key = (name, lat, lng) =>
  `${String(name).trim().toLowerCase()}@${lat.toFixed(4)},${lng.toFixed(4)}`;
