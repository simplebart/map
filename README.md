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

### Inloggen met wachtwoord

Onder **Authentication → Providers → Email**: zet **Enable email provider** aan.

Wil je meteen kunnen inloggen zonder eerst je mailadres te bevestigen, zet dan
**Confirm email** uit. Handig als je de enige gebruiker bent. Laat je 'm aan, dan
krijg je na registreren eerst een bevestigingsmail — en dan moet je Site URL onder
**Authentication → URL Configuration** wél op je Vercel-domein staan.

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
    Auth.jsx          inloggen en registreren met wachtwoord
    MapView.jsx       Leaflet-kaart, emoji-markers, hover-kaartje
    Sidebar.jsx       legenda/filter, lijst, tagbeheer
    AddDialog.jsx     venster: adres zoeken, dan naam/tag/notitie
  App.jsx             sessie, data, realtime, filterlogica
supabase/schema.sql   tabellen, RLS, starttags
```

**Filteren.** `App.jsx` houdt twee dingen apart: `filtered` (alles dat door het
tagfilter komt, ook buiten beeld — dat zijn de markers) en `visible` (dat plus in
het kaartbeeld — dat is de lijst en de tellingen). De kaart geeft bij elke
beweging zijn `bounds` door.

**Sync.** `subscribeToChanges` luistert op Postgres-wijzigingen in je eigen rijen.
Voeg je op je telefoon iets toe, dan ververst je laptop vanzelf.

**Plek toevoegen.** Twee wegen naar hetzelfde venster: de knop **+ Plek toevoegen**
(je zoekt een adres of naam op) of een tik op de kaart (locatie staat dan al vast,
adres wordt erbij gezocht). Op de telefoon is de ⌖-knop het snelst: die pakt je
huidige positie.

**Adressen.** Zoeken en omgekeerd opzoeken gaat via Nominatim (OpenStreetMap,
gratis, geen sleutel). De fair-use-limiet is ongeveer één verzoek per seconde,
vandaar de korte pauze tijdens het typen. Bij zwaar gebruik wil je een eigen
instance of een andere provider.

## Volgende stappen

- Foto's bij een plek (Supabase Storage)
- Plekken bewerken (nu alleen toevoegen en verwijderen)
- Wachtwoord vergeten (`supabase.auth.resetPasswordForEmail`)
- Een lijst delen met iemand anders
- Zoeken op naam binnen je eigen plekken
- Offline werken (service worker + cache)
