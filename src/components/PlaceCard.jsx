import { useEffect, useState } from "react";

export default function PlaceCard({ place, tag, tags, onClose, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(place.name);
  const [note, setNote] = useState(place.note ?? "");
  const [tagId, setTagId] = useState(place.tag_id ?? "");
  const [saving, setSaving] = useState(false);

  // andere plek aangetikt? velden terugzetten en uit bewerkmodus
  useEffect(() => {
    setEditing(false);
    setName(place.name);
    setNote(place.note ?? "");
    setTagId(place.tag_id ?? "");
  }, [place.id]);

  const emo = tag?.emoji ?? "📍";
  const color = tag?.color ?? "#0f2b24";

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(place.id, {
      name: name.trim(),
      note: note.trim() || null,
      tag_id: tagId || null,
    });
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setName(place.name);
    setNote(place.note ?? "");
    setTagId(place.tag_id ?? "");
    setEditing(false);
  }

  // ── Bewerken ──────────────────────────────────────────────
  if (editing) {
    return (
      <div className="pcard">
        <span className="pcard-tag" style={{ color }}>Bewerken</span>

        <input
          className="pcard-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam"
          autoFocus
        />

        <select
          className="pcard-input"
          value={tagId}
          onChange={(e) => setTagId(e.target.value)}
        >
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
          ))}
        </select>

        <textarea
          className="pcard-input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notitie"
        />

        <div className="pcard-edit-actions">
          <button onClick={save} disabled={saving || !name.trim()}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
          <button className="ghost" onClick={cancel}>Annuleren</button>
        </div>
      </div>
    );
  }

  // ── Lezen ─────────────────────────────────────────────────
  return (
    <div className="pcard">
      <button className="pcard-x" onClick={onClose} aria-label="Sluiten">×</button>

      <span className="pcard-tag" style={{ color }}>
        {emo} {tag?.name ?? "Zonder tag"}
      </span>
      <h3>{place.name}</h3>
      {place.address && <p className="pcard-addr">{place.address}</p>}
      {place.note
        ? <p className="pcard-note">{place.note}</p>
        : <p className="pcard-none">Nog geen notitie.</p>}

      <div className="pcard-foot">
        <div className="pcard-foot-left">
          <button className="linkish" onClick={() => setEditing(true)}>Bewerken</button>
          <a
            className="pcard-route"
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Route
          </a>
        </div>
        <button className="linkish danger" onClick={() => onDelete(place.id)}>
          Verwijderen
        </button>
      </div>
    </div>
  );
}
