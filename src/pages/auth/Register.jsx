import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

const FMT = n => n?.toLocaleString("fr-FR") || "0"

const MODULES = [
  { nom: "Biens", color: "#0078d4" },
  { nom: "Baux", color: "#107c10" },
  { nom: "Paiements", color: "#d83b01" },
  { nom: "Locataires", color: "#8764b8" },
  { nom: "Rapports", color: "#038387" },
  { nom: "Loci IA", color: "#0067b8" },
  { nom: "Maintenance", color: "#ca5010" },
  { nom: "Signatures", color: "#00b294" },
]

function Stepper({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {[1, 2, 3].map((n, i) => (
        <div key={n} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: step >= n ? "#0067b8" : "#d6d6d6", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}>
            {step > n
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              : <span style={{ fontSize: 12, fontWeight: 600, color: step === n ? "#fff" : "#aaa" }}>{n}</span>}
          </div>
          {i < 2 && <div style={{ width: 64, height: 2, background: step > n ? "#0067b8" : "#d6d6d6", margin: "0 4px", transition: "background 0.3s" }}/>}
        </div>
      ))}
    </div>
  )
}

function Check({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 9, alignItems: "flex-start" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="11" fill="#dff6dd"/>
        <path d="M7 12l3 3 7-7" stroke="#107c10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{children}</span>
    </div>
  )
}

function Mod({ nom, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{ width: 42, height: 42, borderRadius: 7, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{nom[0]}</span>
      </div>
      <span style={{ fontSize: 10, color: "#555", textAlign: "center", lineHeight: 1.2 }}>{nom}</span>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [users, setUsers] = useState(1)
  const [duree, setDuree] = useState("an")
  const [freq, setFreq] = useState("annuel")
  const [plan, setPlan] = useState("business")
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "", confirm: "" })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const PLANS = { starter: { nom: "Starter", mois: 18000, an: 15000 }, business: { nom: "Business", mois: 39000, an: 32000 } }
  const p = PLANS[plan]
  const prixUnit = freq === "annuel" ? p.an : p.mois
  const sousTotal = prixUnit * users
  const trial = new Date(); trial.setMonth(trial.getMonth() + 1)
  const trialStr = trial.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  const submit = async () => {
    if (!form.prenom || !form.nom) { toast.error("Prenom et nom requis"); return }
    if (!form.email?.includes("@")) { toast.error("Email invalide"); return }
    if (form.password.length < 8) { toast.error("8 caracteres minimum"); return }
    if (form.password !== form.confirm) { toast.error("Mots de passe differents"); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { prenom: form.prenom, nom: form.nom, role: "global_admin", type_compte: "organisation" } }
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success("Compte cree ! Bienvenue.")
    navigate("/agence")
  }

  const W = "white"
  const B = "#0067b8"
  const G = "#107c10"
  const R = "#d83b01"

  return (
    <div style={{ minHeight: "100vh", background: "#f0f0f0", fontFamily: '"Segoe UI", system-ui, sans-serif', fontSize: 14, color: "#1a1a1a", position: "relative" }}>
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 0.05, pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
        {[0,1,2,3,4,5].map(r => [0,1,2,3,4,5,6,7].map(c => (
          <g key={r+"-"+c} transform={"translate("+(c*180+(r%2)*90)+","+(r*130)+")"}>
            <rect x="10" y="10" width="120" height="85" rx="8" fill="none" stroke={B} strokeWidth="1.5"/>
            <circle cx="45" cy="38" r="14" fill="none" stroke={B} strokeWidth="1.5"/>
            <rect x="20" y="60" width="80" height="5" rx="2.5" fill={B}/>
            <rect x="30" y="71" width="60" height="4" rx="2" fill={B}/>
          </g>
        )))}
      </svg>
      <style>{\`
        *{box-sizing:border-box;margin:0;padding:0}
        a{color:#0067b8;text-decoration:none;font-size:13px}
        a:hover{text-decoration:underline}
        .f{width:100%;padding:7px 10px;border:1px solid #c8c8c8;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;background:#fff}
        .f:focus{border-color:#0067b8;box-shadow:0 0 0 1px #0067b8}
        .bn{padding:9px 24px;background:#0067b8;color:#fff;border:none;font-size:14px;font-family:inherit;font-weight:600;cursor:pointer;transition:background .15s}
        .bn:hover{background:#005a9e}
        .bn:disabled{background:#b3b3b3;cursor:default}
        .bs{padding:9px 22px;background:#fff;color:#0067b8;border:1px solid #0067b8;font-size:14px;font-family:inherit;cursor:pointer}
        .bs:hover{background:#f0f7ff}
        .db{background:#f5f5f5;border:1px solid #e0e0e0;padding:14px 18px;margin-top:18px}
        .dr{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#555}
        .dt{display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid #c8c8c8;margin-top:8px;font-size:14px;font-weight:600}
        .lbl{display:block;font-size:13px;margin-bottom:5px}
        .sec-title{font-size:12px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}
      \`}</style>

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 10, background: "#fff", borderBottom: "1px solid #d6d6d6", padding: "11px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: B, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={W} strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Imoloc</span>
        </Link>
        <span style={{ color: "#d6d6d6", fontSize: 18 }}>|</span>
        <span style={{ fontSize: 13, color: "#555" }}>Imoloc {p.nom} &mdash; Essai</span>
        <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>Un mois gratuit</span>
      </div>

      {/* CARTE CENTRALE */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 940, margin: "36px auto 40px", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 296px", background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>

          {/* GAUCHE */}
          <div style={{ padding: "32px 36px", borderRight: "1px solid #ebebeb" }}>
            <Stepper step={step}/>

            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 5 }}>Essayer gratuitement pendant un mois</h2>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 24, lineHeight: 1.6 }}>Configurez votre abonnement. Aucun paiement requis aujourd&apos;hui.</p>

                <div style={{ marginBottom: 20 }}>
                  <div className="sec-title">Plan</div>
                  {[
                    { id: "starter", label: "Imoloc Starter", prix: FMT(freq==="annuel"?15000:18000)+" FCFA/utilisateur/mois" },
                    { id: "business", label: "Imoloc Business", prix: FMT(freq==="annuel"?32000:39000)+" FCFA/utilisateur/mois", rec: true },
                  ].map(o => (
                    <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <input type="radio" name="plan" checked={plan===o.id} onChange={()=>setPlan(o.id)} style={{ width: 15, height: 15, accentColor: B, flexShrink: 0 }}/>
                      <span style={{ flex: 1, fontSize: 14 }}>{o.label}{o.rec && <span style={{ fontSize: 10, fontWeight: 700, color: B, marginLeft: 8, padding: "1px 6px", border: "1px solid "+B }}> Recommand&eacute;</span>}</span>
                      <span style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap" }}>{o.prix}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div className="sec-title">Nombre d&apos;utilisateurs</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={()=>setUsers(u=>Math.max(1,u-1))} style={{ width: 30, height: 30, border: "1px solid #c8c8c8", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&minus;</button>
                    <input type="number" min="1" max="25" value={users} onChange={e=>setUsers(Math.min(25,Math.max(1,+e.target.value)))} style={{ width: 60, textAlign: "center", padding: "5px", border: "1px solid #c8c8c8", fontSize: 16, fontWeight: 600, fontFamily: "inherit" }}/>
                    <button onClick={()=>setUsers(u=>Math.min(25,u+1))} style={{ width: 30, height: 30, border: "1px solid #c8c8c8", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    <span style={{ fontSize: 12, color: "#888" }}>25 max. pendant l&apos;essai</span>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div className="sec-title">Dur&eacute;e de l&apos;abonnement</div>
                  {[["an","1 an","Economisez 20%"],["mois","1 mois","Sans engagement"]].map(([v,l,s])=>(
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                      <input type="radio" name="duree" checked={duree===v} onChange={()=>{setDuree(v);setFreq(v==="an"?"annuel":"mensuel")}} style={{ width: 15, height: 15, accentColor: B }}/>
                      <span style={{ fontSize: 14 }}>{l}</span>
                      <span style={{ fontSize: 12, color: G, fontWeight: 600 }}>{s}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div className="sec-title">&Agrave; quelle fr&eacute;quence voulez-vous &ecirc;tre factur&eacute; ?</div>
                  <select className="f" style={{ width: "auto", minWidth: 260, cursor: "pointer" }} value={freq} onChange={e=>setFreq(e.target.value)}>
                    <option value="annuel">Annuellement &mdash; {FMT(p.an*users*12)} FCFA/an</option>
                    <option value="mensuel">Mensuellement &mdash; {FMT(p.mois*users)} FCFA/mois</option>
                  </select>
                </div>

                <div className="db">
                  <div className="dr"><span>Imoloc {p.nom} &times; {users} utilisateur{users>1?"s":""}</span><strong style={{color:"#1a1a1a"}}>{FMT(prixUnit)} FCFA/{freq==="annuel"?"an":"mois"}</strong></div>
                  <div className="dr"><span>Sous-total apr&egrave;s l&apos;essai (hors taxes)</span><strong style={{color:"#1a1a1a"}}>{FMT(sousTotal)} FCFA</strong></div>
                  <div className="dr" style={{color:G}}><span>Essai gratuit (1 mois offert)</span><strong style={{color:G}}>&minus;{FMT(sousTotal)} FCFA</strong></div>
                  <div className="dt"><span>Paiement d&ucirc; aujourd&apos;hui (hors taxes)</span><strong style={{fontSize:16}}>0,00 FCFA</strong></div>
                </div>

                <div style={{ marginTop: 24 }}><button className="bn" onClick={()=>setStep(2)}>Suivant</button></div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 5 }}>D&eacute;tails de connexion</h2>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>Cr&eacute;ez votre compte administrateur Imoloc.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div><label className="lbl">Pr&eacute;nom <span style={{color:R}}>*</span></label><input className="f" value={form.prenom} onChange={e=>set("prenom",e.target.value)} autoFocus placeholder="Jean"/></div>
                  <div><label className="lbl">Nom <span style={{color:R}}>*</span></label><input className="f" value={form.nom} onChange={e=>set("nom",e.target.value)} placeholder="Dupont"/></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="lbl">E-mail professionnel <span style={{color:R}}>*</span></label>
                  <input className="f" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="vous@agence.com"/>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Cette adresse sera votre identifiant de connexion.</div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="lbl">Mot de passe <span style={{color:R}}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input className="f" type={showPass?"text":"password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="8 caracteres minimum" style={{paddingRight:72}}/>
                    <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:B,fontSize:12,fontFamily:"inherit" }}>{showPass?"Masquer":"Afficher"}</button>
                  </div>
                  {form.password && (
                    <div style={{ display:"flex",gap:4,marginTop:7,alignItems:"center" }}>
                      {[form.password.length>=8,/[A-Z]/.test(form.password),/[0-9!@#$]/.test(form.password)].map((ok,i)=>(
                        <div key={i} style={{ flex:1,height:3,background:ok?(i>1?G:B):"#e0e0e0",borderRadius:2,transition:"background .3s" }}/>
                      ))}
                      <span style={{ fontSize:11,color:"#555",whiteSpace:"nowrap",marginLeft:6 }}>
                        {[form.password.length>=8,/[A-Z]/.test(form.password),/[0-9!@#$]/.test(form.password)].filter(Boolean).length>=3?"Solide":form.password.length>=8?"Moyen":"Faible"}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 26 }}>
                  <label className="lbl">Confirmer le mot de passe <span style={{color:R}}>*</span></label>
                  <input className="f" type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Repetez votre mot de passe"/>
                  {form.confirm&&form.confirm!==form.password&&<div style={{fontSize:12,color:R,marginTop:4}}>Les mots de passe ne correspondent pas.</div>}
                </div>
                <div style={{ display:"flex",gap:12 }}>
                  <button className="bs" onClick={()=>setStep(1)}>Pr&eacute;c&eacute;dent</button>
                  <button className="bn" onClick={()=>setStep(3)}>Suivant</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 5 }}>Confirmer et finaliser la commande</h2>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>V&eacute;rifiez vos informations avant de commencer votre essai.</p>
                {[["Plan","Imoloc "+p.nom],["Duree",duree==="an"?"1 an":"1 mois"],["Facturation",freq==="annuel"?"Annuellement":"Mensuellement"],["Utilisateurs",users+" utilisateur"+(users>1?"s":"")],["Nom",form.prenom+" "+form.nom],["E-mail",form.email]].map(([l,v])=>(
                  <div key={l} style={{ display:"flex",padding:"8px 0",borderBottom:"1px solid #f0f0f0",gap:16 }}>
                    <span style={{ color:"#777",width:110,flexShrink:0,fontSize:13 }}>{l}</span>
                    <span style={{ color:"#1a1a1a",fontWeight:500,fontSize:13 }}>{v||"&mdash;"}</span>
                  </div>
                ))}
                <div className="db">
                  <div className="dr"><span>Sous-total apr&egrave;s l&apos;essai</span><strong style={{color:"#1a1a1a"}}>{FMT(sousTotal)} FCFA</strong></div>
                  <div className="dt"><span>Paiement d&ucirc; aujourd&apos;hui</span><strong style={{color:G}}>0,00 FCFA</strong></div>
                </div>
                <p style={{ fontSize:12,color:"#555",lineHeight:1.7,margin:"18px 0" }}>
                  L&apos;abonnement payant commence le <strong>{trialStr}</strong>, sauf annulation avant. Vous acceptez les <a href="#">conditions</a> et la <a href="#">confidentialit&eacute;</a>.
                </p>
                <div style={{ display:"flex",gap:12 }}>
                  <button className="bs" onClick={()=>setStep(2)}>Pr&eacute;c&eacute;dent</button>
                  <button className="bn" onClick={submit} disabled={loading} style={{padding:"10px 28px"}}>{loading?"Creation...":"Commencer mon essai gratuit"}</button>
                </div>
              </div>
            )}
          </div>

          {/* DROITE */}
          <div style={{ padding: "32px 22px", background: "#fafafa", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Imoloc {p.nom} &mdash; Essai</div>
            <div style={{ fontSize: 12, color: "#555", fontWeight: 500, marginBottom: 16 }}>Inscription &agrave; votre essai gratuit</div>
            <Check><strong>Jusqu&apos;&agrave; 25 utilisateurs</strong> pendant l&apos;essai</Check>
            <Check>La version d&apos;&eacute;valuation inclut <strong>toutes les fonctionnalit&eacute;s</strong> du produit payant</Check>
            <Check><strong>Aucun paiement</strong> requis pour commencer</Check>
            <Check>Paiements <strong>Mobile Money natifs</strong> (MTN, Moov, Wave)</Check>
            <Check>Annulation possible avant le <strong>{trialStr}</strong></Check>
            <div style={{ height:1,background:"#e8e8e8",margin:"20px 0" }}/>
            <div style={{ fontSize:12,fontWeight:600,color:"#444",textTransform:"uppercase",letterSpacing:".05em",marginBottom:14 }}>Modules inclus</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10 }}>
              {MODULES.map(m=><Mod key={m.nom} {...m}/>)}
            </div>
            <div style={{ marginTop:"auto",paddingTop:22,borderTop:"1px solid #e8e8e8" }}>
              <div style={{ fontSize:12,color:"#555",marginBottom:6 }}>D&eacute;j&agrave; un compte ? <Link to="/login">Se connecter &rarr;</Link></div>
              <div style={{ fontSize:12,color:"#555" }}>Locataire ou propri&eacute;taire ? <Link to="/login">Acc&egrave;s direct &rarr;</Link></div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ position:"relative",zIndex:10,background:"#f0f0f0",borderTop:"1px solid #d6d6d6",padding:"10px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
        <div style={{ display:"flex",gap:18,flexWrap:"wrap" }}>
          {["Confidentialit&eacute; et cookies","Conditions d&apos;utilisation","Marques","Accessibilit&eacute;"].map(l=>(
            <a key={l} href="#" style={{ fontSize:11,color:"#666" }} dangerouslySetInnerHTML={{__html:l}}/>
          ))}
        </div>
        <span style={{ fontSize:11,color:"#999" }}>&copy; 2026 Imoloc</span>
      </div>
    </div>
  )
}
