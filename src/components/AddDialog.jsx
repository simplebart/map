import { useEffect, useRef, useState } from "react";
import { searchAddress } from "../lib/api";

/**
 * Twee manieren om hier binnen te komen:
 *  - preset = null            → je zoekt zelf een adres op
 *  - preset = { lat, lng, address } → je klikte op de kaart, adres al ingevuld
 */
export default function AddDialog({ preset, tags, onSave, onCancel }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [spot, setSpot] = useState(preset ?? null); // gekozen locatie

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [tagId, setTagId] = useState(tags[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const firstRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // zoeken terwijl je typt, met een korte pauze zodat we Nominatim niet plagen
  useEffect(() => {
    if (spot || query.trim().length < 3) {
      setHits([]);
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        setHits(await searchAddress(query.trim()));
      } catch {
        setHits([]);
      }
      setSearching(false);
    }, 450);
    return () => clearTimeout(debounce.current);
  }, [query, spot]);

  function choose(hit) {
    setSpot({ lat: hit.lat, lng: hit.lng, address: hit.address });
    // de naam van de plek is vaak precies wat je zocht — vast invullen scheelt typen
    if (!name) setName(hit.label ?? "");
    setHits([]);
  }

  async function submit(e) {
    e.preventDefault();
    if (!spot || !name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      note: note.trim() || null,
      address: spot.address || null,
      tag_id: tagId || null,
      lat: spot.lat,
      lng: spot.lng,
    });
    setSaving(false);
  }

  return (
    <div className="modal-veil" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>Plek toevoegen</h2>
          <button type="button" className="x" onClick={onCancel} aria-label="Sluiten">
            ×
          </button>
        </div>

        {/* ── Stap 1: waar is het? ── */}
        {!spot ? (
          <div className="find">
            <label htmlFor="q">Adres of naam</label>
            <input
              id="q"
              ref={firstRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bijv. Oudegracht 12 Utrecht, of Le Baratin Parijs"
              autoComplete="off"
            />
            {searching && <p className="finding">Zoeken…</p>}

            {hits.length > 0 && (
              <ul className="hits">
                {hits.map((h, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => choose(h)}>
                      <span className="hit-name">{h.label}</span>
                      <span className="hit-addr">{h.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!searching && query.trim().length >= 3 && hits.length === 0 && (
              <p className="finding">
                Niets gevonden. Probeer het adres vollediger, of sluit dit venster en tik de
                plek direct op de kaart aan.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* ── Stap 2: wat is het? ── */}
            <div className="chosen">
              <div>
                <span className="chosen-label">Gekozen locatie</span>
                <p className="chosen-addr">
                  {spot.address || `${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}`}
                </p>
              </div>
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  setSpot(null);
                  setQuery("");
                }}
              >
                Wijzigen
              </button>
            </div>

            <div className="modal-grid">
              <div>
                <label htmlFor="nm">Naam</label>
                <input
                  id="nm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hoe noem je deze plek?"
                  required
                />
              </div>
              <div>
                <label htmlFor="tg">Tag</label>
                <select id="tg" value={tagId} onChange={(e) => setTagId(e.target.value)}>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.emoji} {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor="nt">Notitie</label>
            <textarea
              id="nt"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Waarom is dit de moeite waard?"
            />

            <div className="modal-actions">
              <button type="submit" disabled={saving || !name.trim()}>
                {saving ? "Opslaan…" : "Opslaan"}
              </button>
              <button type="button" className="ghost" onClick={onCancel}>
                Annuleren
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
