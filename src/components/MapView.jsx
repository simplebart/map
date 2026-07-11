import { useEffect, useRef } from "react";
import L from "leaflet";

const TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const ATTRIB = '&copy; OpenStreetMap, &copy; CARTO';

function pinIcon(tag) {
  const emo = tag?.emoji ?? "📍";
  const color = tag?.color ?? "#0f2b24";
  return L.divIcon({
    className: "",
    html: `<div class="pin" style="background:${color}">${emo}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/**
 * places  — al gefilterd op tag door de parent
 * tagsById — lookup voor emoji/kleur
 * onMapClick(latlng) — nieuwe plek toevoegen
 * onViewChange(bounds) — parent scopet lijst en tellingen op wat in beeld is
 * flyTo — {lat, lng, zoom, key} : verander de key om opnieuw te vliegen
 * hoveredId — id vanuit de lijst, om de peek te tonen
 */
export default function MapView({
  places,
  tagsById,
  onMapClick,
  onViewChange,
  onHover,
  flyTo,
  hoveredId,
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const peekRef = useRef(null);

  // kaart eenmalig opzetten
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true }).setView([52.0907, 5.1214], 13);
    L.tileLayer(TILES, { attribution: ATTRIB, maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    const emit = () => onViewChange?.(map.getBounds());
    map.on("moveend zoomend", emit);
    map.on("movestart", () => hidePeek());
    map.on("click", (e) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    emit();

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers hertekenen als plekken of tags wijzigen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();

    places.forEach((p) => {
      const tag = tagsById[p.tag_id];
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(tag) }).addTo(map);
      m.on("mouseover", () => {
        showPeek(p, tag);
        onHover?.(p.id);
      });
      m.on("mouseout", () => {
        hidePeek();
        onHover?.(null);
      });
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 16), { duration: 0.7 });
        showPeek(p, tag);
      });
      markersRef.current.set(p.id, m);
    });
  }, [places, tagsById, onHover]);

  // peek tonen als de lijst hovert
  useEffect(() => {
    if (!hoveredId) return;
    const p = places.find((x) => x.id === hoveredId);
    if (p) showPeek(p, tagsById[p.tag_id]);
    else hidePeek();
  }, [hoveredId, places, tagsById]);

  // van buitenaf naar een punt vliegen (stad zoeken, lijst aanklikken)
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 14, { duration: 1 });
  }, [flyTo]);

  function showPeek(p, tag) {
    const map = mapRef.current;
    const peek = peekRef.current;
    if (!map || !peek) return;

    const emo = tag?.emoji ?? "📍";
    const color = tag?.color ?? "#0f2b24";
    peek.innerHTML = `
      <span class="peek-tag" style="color:${color}">${emo} ${tag?.name ?? "Zonder tag"}</span>
      <h3>${escapeHtml(p.name)}</h3>
      ${p.address ? `<p class="peek-addr">${escapeHtml(p.address)}</p>` : ""}
      ${
        p.note
          ? `<p class="peek-note">${escapeHtml(p.note)}</p>`
          : `<p class="peek-none">Nog geen notitie.</p>`
      }`;

    const box = elRef.current.getBoundingClientRect();
    const pt = map.latLngToContainerPoint([p.lat, p.lng]);
    let x = pt.x + 22;
    let y = pt.y - 30;
    if (x + 240 > box.width) x = pt.x - 250;
    if (y < 8) y = 8;
    if (y + 140 > box.height) y = box.height - 148;
    peek.style.left = `${x}px`;
    peek.style.top = `${y}px`;
    peek.classList.add("on");
  }

  function hidePeek() {
    peekRef.current?.classList.remove("on");
  }

  return (
    <div className="mapwrap">
      <div ref={elRef} className="map" />
      <div ref={peekRef} className="peek" />
    </div>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}
