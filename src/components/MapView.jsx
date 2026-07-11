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
  onSelect,
  flyTo,
  hoveredId,
  me,            // { lat, lng, accuracy } of null
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const peekRef = useRef(null);
  const meRef = useRef(null);      // de blauwe stip
  const haloRef = useRef(null);    // de nauwkeurigheidscirkel

  // kaart eenmalig opzetten
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true }).setView([52.1, 5.3], 7);
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
        L.DomEvent.stopPropagation(e);   // geen "plek toevoegen" openen
        onSelect?.(p.id);
      });
      markersRef.current.set(p.id, m);
    });
  }, [places, tagsById, onHover, onSelect]);

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

  // ── Blauwe stip: waar ben ik? ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // geen locatie (meer): alles opruimen
    if (!me) {
      if (meRef.current) { map.removeLayer(meRef.current); meRef.current = null; }
      if (haloRef.current) { map.removeLayer(haloRef.current); haloRef.current = null; }
      return;
    }

    const pos = [me.lat, me.lng];

    // cirkel die de meetonnauwkeurigheid toont (in meters, schaalt met de zoom)
    if (haloRef.current) {
      haloRef.current.setLatLng(pos).setRadius(me.accuracy ?? 0);
    } else {
      haloRef.current = L.circle(pos, {
        radius: me.accuracy ?? 0,
        color: "#1d7fd6",
        weight: 1,
        opacity: 0.35,
        fillColor: "#1d7fd6",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(map);
    }

    // de stip zelf
    if (meRef.current) {
      meRef.current.setLatLng(pos);
    } else {
      meRef.current = L.marker(pos, {
        icon: L.divIcon({
          className: "",
          html: '<div class="me-dot"><span class="me-pulse"></span></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        interactive: false,
        zIndexOffset: -100,   // onder je eigen plekken
      }).addTo(map);
    }
  }, [me]);

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
