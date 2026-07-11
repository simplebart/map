import { useEffect, useRef, useState } from "react";

export default function AddSheet({ pending, tags, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [tagId, setTagId] = useState(tags[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      note: note.trim() || null,
      address: pending.address || null,
      tag_id: tagId || null,
    });
    setSaving(false);
  }

  return (
    <form className="sheet" onSubmit={submit}>
      <h4>Nieuwe plek</h4>
      <p className="coords">
        {pending.address
          ? pending.address
          : `${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`}
      </p>

      <div className="sheet-grid">
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam van de plek"
          required
        />
        <select value={tagId} onChange={(e) => setTagId(e.target.value)}>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.emoji} {t.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notitie — waarom is dit de moeite waard?"
      />

      <div className="sheet-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Annuleren
        </button>
      </div>
    </form>
  );
}
