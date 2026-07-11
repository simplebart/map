import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, configError } from "./lib/supabase";
import {
  fetchPlaces, createPlace, deletePlace,
  fetchTags, createTag, deleteTag,
  subscribeToChanges, reverseGeocode, searchCity,
} from "./lib/api";
import Auth from "./components/Auth";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import AddDialog from "./components/AddDialog";
import PlaceCard from "./components/PlaceCard";

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  const [places, setPlaces] = useState([]);
  const [tags, setTags] = useState([]);
  const [active, setActive] = useState(new Set());
  const [bounds, setBounds] = useState(null);

  const [adding, setAdding] = useState(false);
  const [preset, setPreset] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [me, setMe] = useState(null);   // eigen locatie
  const centeredOnce = useRef(false);   // kaart maar één keer naar je toe
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (configError) { setBooting(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (what = "both") => {
    try {
      if (what === "both" || what === "tags") setTags(await fetchTags());
      if (what === "both" || what === "places") setPlaces(await fetchPlaces());
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { if (session) load("both"); }, [session, load]);

  useEffect(() => {
    if (!session?.user?.id) return;
    return subscribeToChanges(session.user.id, (what) => load(what));
  }, [session, load]);

  // ── Eigen locatie volgen ────────────────────────────────────
  // watchPosition i.p.v. getCurrentPosition: de stip loopt mee terwijl je wandelt.
  useEffect(() => {
    if (!session || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setMe(next);
        // alleen de allereerste meting brengt de kaart naar je toe
        if (!centeredOnce.current) {
          centeredOnce.current = true;
          setFlyTo({ lat: next.lat, lng: next.lng, zoom: 14, key: Date.now() });
        }
      },
      () => setMe(null),          // geweigerd of mislukt: geen stip, verder geen drama
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [session]);

  const tagsById = useMemo(
    () => Object.fromEntries(tags.map((t) => [t.id, t])), [tags]);

  const inViewIds = useMemo(() => {
    if (!bounds) return new Set(places.map((p) => p.id));
    return new Set(places.filter((p) => bounds.contains([p.lat, p.lng])).map((p) => p.id));
  }, [places, bounds]);

  // markers: alles dat door het tagfilter komt
  const filtered = useMemo(
    () => (active.size === 0 ? places : places.filter((p) => active.has(p.tag_id))),
    [places, active]);

  // lijst: door het filter én in het kaartbeeld
  const visible = useMemo(
    () => filtered.filter((p) => inViewIds.has(p.id)), [filtered, inViewIds]);

  const selected = useMemo(
    () => places.find((p) => p.id === selectedId) ?? null, [places, selectedId]);

  const toggleTag = (id) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function openAdd() { setPreset(null); setAdding(true); }

  async function addHere({ lat, lng }) {
    setPreset({ lat, lng, address: "" });
    setAdding(true);
    const address = await reverseGeocode(lat, lng);
    setPreset((p) => (p && p.lat === lat ? { ...p, address } : p));
  }

  function locateMe() {
    // de stip weet meestal al waar we zijn — dan meteen erheen
    if (me) {
      setFlyTo({ lat: me.lat, lng: me.lng, zoom: 16, key: Date.now() });
      return;
    }
    if (!navigator.geolocation) { setError("Deze browser kan je locatie niet bepalen."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMe({ lat, lng, accuracy: pos.coords.accuracy });
        setFlyTo({ lat, lng, zoom: 16, key: Date.now() });
      },
      () => setError("Kon je locatie niet bepalen. Sta je locatie toe in je browser?")
    );
  }

  async function savePlace(form) {
    try {
      await createPlace(form);
      setAdding(false);
      setPreset(null);
      setFlyTo({ lat: form.lat, lng: form.lng, zoom: 16, key: Date.now() });
      await load("places");
    } catch (e) { setError(e.message); }
  }

  async function removePlace(id) {
    if (id === selectedId) setSelectedId(null);
    setPlaces((ps) => ps.filter((p) => p.id !== id));
    try { await deletePlace(id); }
    catch (e) { setError(e.message); load("places"); }
  }

  async function addTag(t) {
    try { await createTag(t); await load("tags"); }
    catch (e) { setError(e.message); }
  }

  async function removeTag(id) {
    try {
      await deleteTag(id);
      setActive((prev) => { const n = new Set(prev); n.delete(id); return n; });
      await load("both");
    } catch (e) { setError(e.message); }
  }

  async function goToCity(q) {
    const hit = await searchCity(q);
    if (hit) setFlyTo({ ...hit, zoom: 13, key: Date.now() });
    else setError(`Geen plaats gevonden voor "${q}".`);
  }

  if (configError) return <div className="boot">{configError}</div>;
  if (booting) return <div className="boot">Even laden…</div>;
  if (!session) return <Auth />;

  return (
    <div className="app">
      <Sidebar
        tags={tags}
        places={places}
        visible={visible}
        inViewIds={inViewIds}
        active={active}
        onToggleTag={toggleTag}
        onClearFilter={() => setActive(new Set())}
        onSearchCity={goToCity}
        onPickPlace={(p) => {
          setFlyTo({ lat: p.lat, lng: p.lng, zoom: 16, key: Date.now() });
          setSelectedId(p.id);
        }}
        onDeletePlace={removePlace}
        onHoverPlace={setHoveredId}
        onCreateTag={addTag}
        onDeleteTag={removeTag}
        onAddPlace={openAdd}
        onReload={() => load("both")}
        onNotice={setNotice}
        onSignOut={() => supabase.auth.signOut()}
        email={session.user.email}
      />

      <MapView
        places={filtered}
        tagsById={tagsById}
        onMapClick={addHere}
        onViewChange={setBounds}
        onHover={setHoveredId}
        onSelect={setSelectedId}
        me={me}
        flyTo={flyTo}
        hoveredId={hoveredId}
      />

      <button className="locate" onClick={locateMe} title="Ga naar mijn locatie">⌖</button>

      {selected && (
        <PlaceCard
          place={selected}
          tag={tagsById[selected.tag_id]}
          onClose={() => setSelectedId(null)}
          onDelete={(id) => { removePlace(id); setSelectedId(null); }}
        />
      )}

      {adding && (
        <AddDialog
          preset={preset}
          tags={tags}
          onSave={savePlace}
          onCancel={() => { setAdding(false); setPreset(null); }}
        />
      )}

      {error && (
        <div className="toast" onClick={() => setError("")}>
          {error} <span className="toast-x">×</span>
        </div>
      )}

      {notice && (
        <div className="toast ok" onClick={() => setNotice("")}>
          {notice} <span className="toast-x">×</span>
        </div>
      )}
    </div>
  );
}
