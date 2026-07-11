# Mijn plekken

Je eigen kaart met opgeslagen plekken, getagd met emoji en kleur. Gesynchroniseerd
tussen telefoon en laptop. Draait op Vite + React + Leaflet + Supabase, en is
gratis te hosten op Vercel.

Filter je op een tag, dan toont de lijst alleen de plekken met die tag **in het
huidige kaartbeeld**. Sta je in Parijs en filter je op 🍽️ Restaurant, dan zie je je
Parijse restaurants — niet die uit Utrecht.

---

## 1. Supabase opzetten

1. Maak een project aan op [supabase.com](https://supabase.com).
2. Open de **SQL Editor**, plak de inhoud van `supabase/schema.sql` en run het.
   Dit maakt de tabellen, zet Row Level Security aan, en geeft elke nieuwe
   gebruiker een set starttags.
3. Ga naar **Project Settings → API** en kopieer de `Project URL` en de `anon public` key.

> **Row Level Security is de beveiliging.** De database is direct vanuit de browser
> bereikbaar, dus zonder de policies uit `schema.sql` kan iedereen met je publieke
> sleutel alle plekken van alle gebruikers lezen. Het script zet ze aan — sla die
> stap niet over.

### Inloglinks laten werken

Onder **Authentication → URL Configuration**: zet je Site URL op je Vercel-domein
en voeg `http://localhost:5173` toe aan de Redirect URLs, zodat inloggen ook lokaal werkt.

## 2. Lokaal draaien

```bash
npm install
cp .env.example .env    # vul je Supabase-url en anon key in
npm run dev
```

## 3. Naar GitHub en Vercel

```bash
git init
git add .
git commit -m "Eerste versie"
git remote add origin git@github.com:jouwnaam/mijn-plekken.git
git push -u origin main
```

Importeer de repo op [vercel.com](https://vercel.com). Vercel herkent Vite vanzelf.
Zet onder **Settings → Environment Variables** dezelfde twee waarden:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Elke push naar `main` deployt automatisch.

> De anon key mag gewoon in de frontend staan — die is publiek bedoeld. De
> **service_role** key hoort daar nooit; die geeft volledige toegang en negeert RLS.

## 4. Op je telefoon zetten

Het is een PWA. Open de site in Safari of Chrome op je telefoon, kies "Zet op
beginscherm", en hij opent schermvullend als een app. Geen App Store, geen
ontwikkelaarsaccount, geen abonnement.

Zet nog wel even een `icon-192.png` en `icon-512.png` in `public/` — die staan al
in het manifest.

---

## Hoe het in elkaar zit

```
src/
  lib/supabase.js     client
  lib/api.js          alle CRUD + realtime + adres opzoeken
  components/
    Auth.jsx          inloggen via magic link
    MapView.jsx       Leaflet-kaart, emoji-markers, hover-kaartje
    Sidebar.jsx       legenda/filter, lijst, tagbeheer
    AddSheet.jsx      nieuwe plek opslaan
  App.jsx             sessie, data, realtime, filterlogica
supabase/schema.sql   tabellen, RLS, starttags
```

**Filteren.** `App.jsx` houdt twee dingen apart: `filtered` (alles dat door het
tagfilter komt, ook buiten beeld — dat zijn de markers) en `visible` (dat plus in
het kaartbeeld — dat is de lijst en de tellingen). De kaart geeft bij elke
beweging zijn `bounds` door.

**Sync.** `subscribeToChanges` luistert op Postgres-wijzigingen in je eigen rijen.
Voeg je op je telefoon iets toe, dan ververst je laptop vanzelf.

**Adressen.** Bij het toevoegen wordt het adres automatisch opgezocht via
Nominatim (OpenStreetMap, gratis, geen sleutel). Bij zwaar gebruik wil je daar een
eigen instance of een andere provider voor — de gratis instance heeft een
fair-use-limiet van ongeveer één verzoek per seconde.

## Volgende stappen

- Foto's bij een plek (Supabase Storage)
- Plekken bewerken (nu alleen toevoegen en verwijderen)
- Een lijst delen met iemand anders
- Zoeken op naam binnen je eigen plekken
- Offline werken (service worker + cache)
