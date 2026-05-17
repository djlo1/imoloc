import { useState, useEffect } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (params.get("demo") === "1") {
      setEmail("demo@imoloc.lt")
      setPassword("Demo1234!")
    }
  }, [])

  const handleNext = e => {
    e.preventDefault()
    setError("")
    if (!email || !email.includes("@")) {
      setError("Entrez une adresse e-mail valide.")
      return
    }
    setStep(2)
  }

  const handleLogin = async e => {
    e.preventDefault()
    setError("")
    if (!password) { setError("Le mot de passe est requis."); return }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()
      const role = prof?.role || "global_admin"
      const AGENCE = ["agence","global_admin","user_admin","billing_admin","reports_reader","security_admin","password_admin","agent","comptable","lecteur"]
      if (role === "locataire") navigate("/locataire")
      else if (role === "proprietaire") navigate("/proprietaire")
      else if (role === "super_admin") navigate("/admin")
      else if (AGENCE.includes(role)) navigate("/agence")
      else navigate("/agence")
    } catch(e) { setError(e.message); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f2f2f2",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "\"Segoe UI\", system-ui, -apple-system, sans-serif",
      padding: "20px"
    }}>
      <style>{`
        .ms-input-wrap { position: relative; margin-bottom: 8px }
        .ms-input {
          width: 100%;
          padding: 6px 0;
          border: none;
          border-bottom: 1px solid #666;
          background: transparent;
          font-size: 15px;
          font-family: inherit;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .ms-input:focus { border-bottom: 2px solid #0067b8 }
        .ms-input::placeholder { color: transparent }
        .ms-label {
          position: absolute;
          left: 0;
          top: 6px;
          font-size: 15px;
          color: #666;
          transition: all 0.15s;
          pointer-events: none;
        }
        .ms-input:focus ~ .ms-label,
        .ms-input:not(:placeholder-shown) ~ .ms-label {
          top: -14px;
          font-size: 12px;
          color: #0067b8;
        }
        .ms-btn {
          width: 100%;
          padding: 10px 20px;
          background: #0067b8;
          color: #fff;
          border: none;
          font-size: 15px;
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
          margin-top: 20px;
        }
        .ms-btn:hover { background: #005a9e }
        .ms-btn:disabled { background: #ccc; cursor: default }
        .ms-link {
          color: #0067b8;
          font-size: 13px;
          text-decoration: none;
          display: inline-block;
          margin-top: 12px;
        }
        .ms-link:hover { text-decoration: underline }
        .ms-error {
          background: #fde8e8;
          border-left: 3px solid #d93025;
          padding: 8px 12px;
          font-size: 13px;
          color: #d93025;
          margin-bottom: 16px;
          border-radius: 0 2px 2px 0;
        }
        .ms-card {
          background: #fff;
          width: 100%;
          max-width: 440px;
          padding: 44px 44px 36px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        @media(max-width: 480px) {
          .ms-card { padding: 32px 24px 28px; box-shadow: none; border: 1px solid #e0e0e0 }
        }
        .opt-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 0;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 13px;
          color: #0067b8;
          cursor: pointer;
          text-align: left;
          margin-top: 8px;
        }
        .opt-btn:hover { text-decoration: underline }
      `}</style>

      {/* CARTE */}
      <div className="ms-card">

        {/* LOGO */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ width: 28, height: 28, background: "#0067b8", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.02em" }}>Imoloc</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 400, color: "#1a1a1a", margin: 0, letterSpacing: "-0.01em" }}>
            Se connecter
          </h1>
          {step === 2 && (
            <button onClick={() => { setStep(1); setError("") }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #ccc", borderRadius: 2, padding: "5px 10px", cursor: "pointer", fontSize: 13, color: "#444", marginTop: 12, fontFamily: "inherit" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              {email}
            </button>
          )}
        </div>

        {/* ERREUR */}
        {error && <div className="ms-error">{error}</div>}

        {/* ETAPE 1 — EMAIL */}
        {step === 1 && (
          <form onSubmit={handleNext}>
            <div style={{ marginBottom: 20 }}>
              <div className="ms-input-wrap">
                <input
                  className="ms-input"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError("") }}
                  placeholder="email"
                  autoFocus
                  autoComplete="email"
                />
                <label className="ms-label">E-mail, t&#233;l&#233;phone ou Skype</label>
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                Pas de compte ?{" "}
                <Link to="/register" className="ms-link" style={{ marginTop: 0 }}>Cr&#233;ez-en un !</Link>
              </div>
            </div>
            <button type="submit" className="ms-btn">Suivant</button>
            <div style={{ marginTop: 20, borderTop: "1px solid #e8e8e8", paddingTop: 16 }}>
              <button type="button" className="opt-btn" onClick={() => navigate("/register")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Options de connexion
              </button>
            </div>
          </form>
        )}

        {/* ETAPE 2 — MOT DE PASSE */}
        {step === 2 && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <div className="ms-input-wrap" style={{ position: "relative" }}>
                <input
                  className="ms-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError("") }}
                  placeholder="password"
                  autoFocus
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <label className="ms-label">Mot de passe</label>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 18, padding: "4px" }}>
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <a href="#" className="ms-link" style={{ fontSize: 13 }}>Mot de passe oubli&#233; ?</a>
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8, lineHeight: 1.6 }}>
              En vous connectant, vous acceptez les{" "}
              <a href="#" className="ms-link" style={{ fontSize: 12, marginTop: 0 }}>conditions</a> et la{" "}
              <a href="#" className="ms-link" style={{ fontSize: 12, marginTop: 0 }}>confidentialit&#233;</a> d&#8217;Imoloc.
            </div>
            <button type="submit" className="ms-btn" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
            <div style={{ marginTop: 16 }}>
              <button type="button" className="opt-btn" onClick={() => navigate("/register")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Cr&#233;er un nouveau compte
              </button>
            </div>
          </form>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {["Conditions d’utilisation", "Confidentialité", "Aide"].map(l => (
          <a key={l} href="#" style={{ fontSize: 12, color: "#666", textDecoration: "none" }}
            onMouseOver={e => e.target.style.textDecoration = "underline"}
            onMouseOut={e => e.target.style.textDecoration = "none"}>{l}</a>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#999" }}>&#169; 2026 Imoloc</div>
    </div>
  )
}
