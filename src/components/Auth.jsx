import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [mode, setMode] = useState("in");        // "in" = inloggen, "up" = account maken
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (mode === "up" && password.length < 8) {
      setError("Kies een wachtwoord van minstens 8 tekens.");
      return;
    }

    setBusy(true);
    const creds = { email: email.trim(), password };

    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds);

    setBusy(false);

    if (error) {
      setError(translate(error.message));
      return;
    }

    // Staat "Confirm email" nog aan in Supabase, dan is er nog geen sessie.
    if (mode === "up" && !data.session) {
      setNotice("Account aangemaakt. Bevestig je mailadres via de mail die we net stuurden, en log daarna in.");
      setMode("in");
    }
    // Anders zet onAuthStateChange in App.jsx de sessie en zijn we binnen.
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-mark">📍</div>
        <h1>Mijn plekken</h1>
        <p className="auth-lede">Je eigen kaart, op je telefoon en je laptop.</p>

        <form onSubmit={submit}>
          <label htmlFor="email">Mailadres</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="jij@voorbeeld.nl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="pw">Wachtwoord</label>
          <input
            id="pw"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder={mode === "up" ? "Minstens 8 tekens" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={busy}>
            {busy ? "Even geduld…" : mode === "in" ? "Inloggen" : "Account maken"}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}

        <p className="auth-switch">
          {mode === "in" ? "Nog geen account?" : "Heb je al een account?"}{" "}
          <button
            className="linkish"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError("");
              setNotice("");
            }}
          >
            {mode === "in" ? "Maak er een" : "Inloggen"}
          </button>
        </p>
      </div>
    </div>
  );
}

// Supabase antwoordt in het Engels; de meest voorkomende even vertalen.
function translate(msg) {
  const m = String(msg).toLowerCase();
  if (m.includes("invalid login")) return "Mailadres of wachtwoord klopt niet.";
  if (m.includes("already registered")) return "Er bestaat al een account met dit mailadres.";
  if (m.includes("email not confirmed")) return "Bevestig eerst je mailadres via de link in je mail.";
  if (m.includes("password")) return "Dit wachtwoord voldoet niet. Probeer er een van minstens 8 tekens.";
  return msg;
}
