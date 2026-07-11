import { useRef, useState } from "react";
import { exportBackup, importBackup } from "../lib/backup";

const SWATCHES = [
  "#d1495b", "#7b4bb7", "#c07d2a", "#2a6fb0",
  "#158a6e", "#3f7d20", "#0e7c86", "#4a7a3a",
];

export default function Sidebar({
  tags,
  places,          // alles (voor het tellen per tag binnen beeld)
  visible,         // wat in beeld is én door het filter komt
  inViewIds,       // Set van ids die in het kaartbeeld liggen
  active,          // Set van geselecteerde tag-ids
  onToggleTag,
  onClearFilter,
  onSearchCity,
  onPickPlace,
  onDeletePlace,
  onHoverPlace,
  onCreateTag,
  onDeleteTag,
  onAddPlace,
  onReload,
  onNotice,
  sheet,          // 'dicht' | 'half' | 'open' (alleen mobiel)
  onSheetDrag,
  onSheetTap,
  onSignOut,
  email,
}) {
  const [city, setCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [managing, setManaging] = useState(false);
  const [newTag, setNewTag] = useState({ name: "", emoji: "", color: SWATCHES[0] });
  const [busy, setBusy] = useState("");
  const fileRef = useRef(null);

  async function doExport() {
    setBusy("export");
    try {
      const n = await exportBackup();
      onNotice?.(`${n} ${n === 1 ? "plek" : "plekken"} gedownload.`);
    } catch (e) {
      onNotice?.(e.message);
    }
    setBusy("");
  }

  async function doImport(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // zodat hetzelfde bestand opnieuw kan
    if (!file) return;

    setBusy("import");
    try {
      const r = await importBackup(file);
      await onReload?.();
      const bits = [`${r.added} toegevoegd`];
      if (r.skipped) bits.push(`${r.skipped} al aanwezig`);
      if (r.newTags) bits.push(`${r.newTags} nieuwe tags`);
      onNotice?.(bits.join(", ") + ".");
    } catch (err) {
      onNotice?.(err.message);
    }
    setBusy("");
  }

  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  async function submitCity(e) {
    e.preventDefault();
    if (!city.trim()) return;
    setSearching(true);
    await onSearchCity(city.trim());
    setSearching(false);
  }

  function submitTag(e) {
    e.preventDefault();
    if (!newTag.name.trim()) return;
    onCreateTag({
      name: newTag.name.trim(),
      emoji: newTag.emoji.trim() || "📍",
      color: newTag.color,
    });
    setNewTag({ name: "", emoji: "", color: SWATCHES[0] });
  }

  const scopeLabel = active.size
    ? [...active].map((id) => `${tagsById[id]?.emoji ?? ""} ${tagsById[id]?.name ?? ""}`).join(" · ")
    : "Alles in beeld";

  return (
    <aside className={`side sheet-${sheet}`}>
      <div
        className="grip"
        onPointerDown={onSheetDrag}
        onClick={onSheetTap}
        role="button"
        aria-label="Paneel omhoog of omlaag slepen"
      >
        <span className="grip-bar" />
      </div>

      <div className="brand">
        <div className="brand-name">
          <span className="brand-mark">📍</span>
          <h1>Mijn plekken</h1>
        </div>
        <button className="linkish" onClick={onSignOut} title={email}>
          Uitloggen
        </button>
      </div>

      <div className="top-actions">
        <button className="add-place" onClick={onAddPlace}>
          + Plek toevoegen
        </button>

        <form className="search" onSubmit={submitCity}>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ga naar een stad, bijv. Parijs"
          />
          <button type="submit" className="ghost" disabled={searching}>
            {searching ? "…" : "Ga"}
          </button>
        </form>
      </div>

      <div className="legend">
        <div className="legend-head">
          <span>Legenda — tik om te filteren</span>
          <div className="legend-actions">
            {active.size > 0 && (
              <button className="linkish" onClick={onClearFilter}>Alles</button>
            )}
            <button className="linkish" onClick={() => setManaging((v) => !v)}>
              {managing ? "Klaar" : "Tags"}
            </button>
          </div>
        </div>

        <div className="keys">
          {tags.map((t) => {
            const n = places.filter((p) => p.tag_id === t.id && inViewIds.has(p.id)).length;
            const sel = active.has(t.id);
            const dim = !sel && active.size > 0;
            return (
              <span
                key={t.id}
                className={`key${sel ? " sel" : ""}${dim ? " dim" : ""}`}
                style={sel ? { background: t.color, borderColor: t.color } : undefined}
                onClick={() => onToggleTag(t.id)}
              >
                <span className="emo">{t.emoji}</span>
                {t.name}
                <span className="count">{n}</span>
                {managing && (
                  <button
                    className="tag-del"
                    title="Tag verwijderen"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTag(t.id);
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {managing && (
          <form className="tag-form" onSubmit={submitTag}>
            <div className="tag-form-row">
              <input
                className="emoji-in"
                value={newTag.emoji}
                onChange={(e) => setNewTag({ ...newTag, emoji: e.target.value })}
                placeholder="🍜"
                maxLength={4}
              />
              <input
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="Naam van de tag"
              />
            </div>
            <div className="swatches">
              {SWATCHES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`sw${newTag.color === c ? " on" : ""}`}
                  style={{ background: c }}
                  onClick={() => setNewTag({ ...newTag, color: c })}
                  aria-label={`Kleur ${c}`}
                />
              ))}
            </div>
            <button type="submit">Tag toevoegen</button>
          </form>
        )}
      </div>

      <div className="scope">
        <span>{scopeLabel}</span>
        <b>{visible.length}</b>
      </div>

      <div className="list">
        {visible.length === 0 ? (
          <p className="empty">
            Hier in beeld staat niets{active.size ? " met deze tag" : ""}. Verschuif de kaart,
            of tik ergens om een plek toe te voegen.
          </p>
        ) : (
          visible.map((p) => {
            const t = tagsById[p.tag_id];
            return (
              <div
                key={p.id}
                className="row"
                onClick={() => onPickPlace(p)}
                onMouseEnter={() => onHoverPlace(p.id)}
                onMouseLeave={() => onHoverPlace(null)}
              >
                <span className="emo">{t?.emoji ?? "📍"}</span>
                <div className="row-body">
                  <div className="nm">{p.name}</div>
                  <div className="mt">
                    {t?.name ?? "Zonder tag"}
                    {p.address ? ` · ${p.address}` : ""}
                  </div>
                </div>
                <button
                  className="del"
                  title="Verwijderen"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePlace(p.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="side-foot">
        <button className="linkish" onClick={doExport} disabled={busy === "export"}>
          {busy === "export" ? "Bezig…" : "Exporteren"}
        </button>
        <button
          className="linkish"
          onClick={() => fileRef.current?.click()}
          disabled={busy === "import"}
        >
          {busy === "import" ? "Bezig…" : "Importeren"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={doImport}
          hidden
        />
      </div>
    </aside>
  );
}
