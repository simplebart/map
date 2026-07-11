export default function PlaceCard({ place, tag, onClose, onDelete }) {
  const emo = tag?.emoji ?? "📍";
  const color = tag?.color ?? "#0f2b24";

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
        <a
          className="pcard-route"
          href={`https://www.openstreetmap.org/directions?to=${place.lat},${place.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          Route
        </a>
        <button className="linkish danger" onClick={() => onDelete(place.id)}>
          Verwijderen
        </button>
      </div>
    </div>
  );
}
