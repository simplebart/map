import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  fetchPlaces, createPlace, deletePlace,
  fetchTags, createTag, deleteTag,
  subscribeToChanges, reverseGeocode, searchCity,
} from "./lib/api";
import Auth from "./components/Auth";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import AddSheet from "./components/AddSheet";

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  const [places, setPlaces] = useState([]);
  const [tags, setTags] = useState([]);
  const [active, setActive] = useState(new Set());   // gefilterde tag-ids
  const [bounds, setBounds] = useState(null);        // huidig kaartbeeld
  const [pending, setPending] = useState(null);      // nieuwe plek in de maak
  const [flyTo, setFlyTo] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [error, setError] = useState("");

  // ── Sessie ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Data laden ──────────────────────────────────────────────
  const load = useCallback(async (what = "both") => {
    try {
      if (what === "both" || what === "tags") setTags(await fetchTags());
      if (what === "both" || what === "places") setPlaces(await fetchPlaces());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    load("both");
  }, [session, load]);

  // ── Realtime: telefoon ↔ laptop ─────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    const unsub = subscribeToChanges(session.user.id, (what) => load(what));
    return unsub;
  }, [session, load]);

  // ── Afgeleide data ──────────────────────────────────────────
  const tagsById = useMemo(
    () => Object.fromEntries(tags.map((t) => [t.id, t])),
    [tags]
  );

  const inViewIds = useMemo(() => {
    if (!bounds) return new Set(places.map((p) => p.id));
    return new Set(
      places.filter((p) => bounds.contains([p.lat, p.lng])).map((p) => p.id)
    );
  }, [places, bounds]);

  // markers: alles dat door het tagfilter komt (ook buiten beeld)
  const filtered = useMemo(
    () => (active.size === 0 ? places : places.filter((p) => active.has(p.tag_id))),
    [places, active]
  );

  // lijst: door het filter én in het kaartbeeld
  const visible = useMemo(
    () => filtered.filter((p) => inViewIds.has(p.id)),
    [filtered, inViewIds]
  );

  // ── Acties ──────────────────────────────────────────────────
  const toggleTag = (id) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function handleMapClick({ lat, lng }) {
    setPending({ lat, lng, address: "" });
    const address = await reverseGeocode(lat, lng);
    setPending((p) => (p && p.lat === lat ? { ...p, address } : p));
  }

  async function savePlace(form) {
    try {
      await createPlace({ ...form, lat: pending.lat, lng: pending.lng });
      setPending(null);
      await load("places");
    } catch (e) {
      setError(e.message);
    }
  }

  async function removePlace(id) {
    setPlaces((ps) => ps.filter((p) => p.id !== id)); // meteen weg in de UI
    try {
      await deletePlace(id);
    } catch (e) {
      setError(e.message);
      load("places");
    }
  }

  async function addTag(t) {
    try {
      await createTag(t);
      await load("tags");
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeTag(id) {
    try {
      await deleteTag(id);
      setActive((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load("both"); // plekken verliezen hun tag_id
    } catch (e) {
      setError(e.message);
    }
  }

  async function goToCity(q) {
    const hit = await searchCity(q);
    if (hit) setFlyTo({ ...hit, zoom: 13, key: Date.now() });
    else setError(`Geen plaats gevonden voor "${q}".`);
  }

  // "waar ik nu ben" — op de telefoon de snelste manier om iets toe te voegen
  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setFlyTo({ lat, lng, zoom: 16, key: Date.now() });
        handleMapClick({ lat, lng });
      },
      () => setError("Kon je locatie niet bepalen.")
    );
  }

  // ── Render ──────────────────────────────────────────────────
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
        onPickPlace={(p) => setFlyTo({ lat: p.lat, lng: p.lng, zoom: 16, key: Date.now() })}
        onDeletePlace={removePlace}
        onHoverPlace={setHoveredId}
        onCreateTag={addTag}
        onDeleteTag={removeTag}
        onSignOut={() => supabase.auth.signOut()}
        email={session.user.email}
      />

      <MapView
        places={filtered}
        tagsById={tagsById}
        onMapClick={handleMapClick}
        onViewChange={setBounds}
        onHover={setHoveredId}
        flyTo={flyTo}
        hoveredId={hoveredId}
      />

      <button className="locate" onClick={locateMe} title="Voeg toe waar ik nu ben">
        ⌖
      </button>

      {pending && (
        <AddSheet
          pending={pending}
          tags={tags}
          onSave={savePlace}
          onCancel={() => setPending(null)}
        />
      )}

      {error && (
        <div className="toast" onClick={() => setError("")}>
          {error} <span className="toast-x">×</span>
        </div>
      )}
    </div>
  );
}
