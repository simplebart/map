import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");

  async function signIn(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <h1>Mijn plekken</h1>
        <p className="auth-lede">
          Je eigen kaart, op je telefoon en je laptop.
        </p>

        {state === "sent" ? (
          <div className="auth-sent">
            <p>
              Er staat een inloglink in je mail. Open die op het apparaat waar je
              wil inloggen.
            </p>
            <button className="ghost" onClick={() => setState("idle")}>
              Ander mailadres gebruiken
            </button>
          </div>
        ) : (
          <form onSubmit={signIn}>
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
            <button type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Versturen…" : "Stuur me een inloglink"}
            </button>
            <p className="auth-hint">Geen wachtwoord. Je krijgt een link per mail.</p>
            {state === "error" && <p className="auth-error">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
