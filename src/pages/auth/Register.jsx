import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

const BLUE = "#0078D4"
const BG = "#f3f2f1"
const TEXT = "#1f1f1f"
const TEXT2 = "#605e5c"
const BORDER = "#d2d0ce"
const GREEN = "#107c10"

const FMT = n => n?.toLocaleString("fr-FR") || "0"

const MODULES = [
  { nom: "Biens",       bg: "#0078D4", letter: "B" },
  { nom: "Baux",        bg: "#107c10", letter: "B" },
  { nom: "Paiements",   bg: "#d83b01", letter: "P" },
  { nom: "Locataires",  bg: "#8764b8", letter: "L" },
  { nom: "Rapports",    bg: "#038387", letter: "R" },
  { nom: "Loci IA",     bg: "#0078D4", letter: "AI"},
  { nom: "Maintenance", bg: "#ca5010", letter: "M" },
  { nom: "Signatures",  bg: "#00b294", letter: "S" },
]

function StepDot({ n, active, done, label }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: active||done ? BLUE : "#e0e0e0",
        border: active ? "2px solid "+BLUE : done ? "2px solid "+BLUE : "2px solid #c8c8c8",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
        {!done && <div style={{ width:8, height:8, borderRadius:"50%", background: active ? "white" : "transparent" }}/>}
      </div>
      <span style={{ fontSize:11, color: active ? TEXT : TEXT2, fontWeight: active ? 600 : 400, textAlign:"center", maxWidth:90, lineHeight:1.3 }}>{label}</span>
    </div>
  )
}

function Check({ children }) {
  return (
    <div style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
      <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink:0, marginTop:1 }}>
        <circle cx="8" cy="8" r="8" fill="#dff6dd"/>
        <path d="M4.5 8l2.5 2.5 5-5" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
      <span style={{ fontSize:13, color:TEXT, lineHeight:1.55 }}>{children}</span>
    </div>
  )
}

function Dropdown({ value, onChange, children, style={} }) {
  return (
    <div style={{ position:"relative", ...style }}>
      <select value={value} onChange={onChange} style={{
        width:"100%", padding:"7px 32px 7px 10px", border:"1px solid "+BORDER,
        borderRadius:2, background:"white", fontSize:14, fontFamily:"inherit",
        color:TEXT, outline:"none", cursor:"pointer", appearance:"none",
      }}
        onFocus={e=>{e.target.style.borderColor=BLUE;e.target.style.boxShadow="0 0 0 1px "+BLUE}}
        onBlur={e=>{e.target.style.borderColor=BORDER;e.target.style.boxShadow="none"}}>
        {children}
      </select>
      <svg style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [users, setUsers] = useState(1)
  const [duree, setDuree] = useState("mois")
  const [freq, setFreq] = useState("mensuel")
  const [plan, setPlan] = useState("business")
  const [form, setForm] = useState({ prenom:"", nom:"", email:"", password:"", confirm:"" })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const PLANS = {
    starter:  { nom:"Starter",  mois:18000, an:15000 },
    business: { nom:"Business", mois:39000, an:32000 },
  }
  const p = PLANS[plan]
  const prixUnit = duree==="an" ? p.an : p.mois
  const sousTotal = prixUnit * users
  const trial = new Date(); trial.setMonth(trial.getMonth()+1)
  const trialStr = trial.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})

  const STEPS = ["Details de l'abonnement et du compte", "Details de connexion", "Ajouter un paiement, confirmer et finaliser"]

  const submit = async () => {
    if (!form.prenom||!form.nom) { toast.error("Prenom et nom requis"); return }
    if (!form.email?.includes("@")) { toast.error("Email invalide"); return }
    if (form.password.length<8) { toast.error("8 caracteres minimum"); return }
    if (form.password!==form.confirm) { toast.error("Mots de passe differents"); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email:form.email, password:form.password,
      options:{ data:{ prenom:form.prenom, nom:form.nom, role:"global_admin", type_compte:"organisation" } }
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success("Compte cree ! Bienvenue.")
    navigate("/agence")
  }

  const inputStyle = {
    width:"100%", padding:"7px 10px", border:"1px solid "+BORDER,
    borderRadius:2, fontSize:14, fontFamily:"inherit", color:TEXT,
    background:"white", outline:"none",
  }
  const onFocus = e => { e.target.style.borderColor=BLUE; e.target.style.boxShadow="0 0 0 1px "+BLUE }
  const onBlur  = e => { e.target.style.borderColor=BORDER; e.target.style.boxShadow="none" }

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:'"Segoe UI",system-ui,sans-serif', color:TEXT }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        a{color:${BLUE};text-decoration:none}
        a:hover{text-decoration:underline}
        .bn{display:inline-flex;align-items:center;padding:8px 20px;background:${BLUE};color:white;border:none;border-radius:2px;font-size:14px;font-family:inherit;font-weight:600;cursor:pointer;transition:background .15s}
        .bn:hover{background:#005a9e}
        .bn:disabled{background:#c8c8c8;cursor:default}
        .bs{display:inline-flex;align-items:center;padding:8px 20px;background:white;color:${BLUE};border:1px solid ${BLUE};border-radius:2px;font-size:14px;font-family:inherit;cursor:pointer;transition:all .15s}
        .bs:hover{background:#f0f6ff}
        .radio-row{display:flex;align-items:center;gap:10px;padding:6px 0;cursor:pointer}
        .radio-row input[type=radio]{width:16px;height:16px;accent-color:${BLUE};cursor:pointer}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"white", borderBottom:"1px solid "+BORDER, padding:"14px 32px", display:"flex", alignItems:"center", gap:20 }}>
        <Link to="/" style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ width:28, height:28, background:BLUE, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:600, color:TEXT }}>Imoloc</span>
        </Link>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:600, color:TEXT }}>Imoloc {p.nom} &mdash; Essai</div>
          <div style={{ fontSize:12, color:TEXT2, marginTop:2 }}>Un mois gratuit &mdash; aucun paiement requis aujourd&apos;hui</div>
        </div>
        <div style={{ width:120 }}/>
      </div>

      {/* CARTE CENTRALE */}
      <div style={{ maxWidth:920, margin:"36px auto", padding:"0 20px 48px" }}>
        <div style={{ background:"white", borderRadius:4, boxShadow:"0 2px 12px rgba(0,0,0,0.08)", border:"1px solid "+BORDER, display:"grid", gridTemplateColumns:"1fr 320px", overflow:"hidden" }}>

          {/* ━━ COLONNE GAUCHE ━━ */}
          <div style={{ padding:"36px 40px", borderRight:"1px solid "+BORDER }}>

            {/* STEPPER */}
            <div style={{ display:"flex", alignItems:"flex-start", marginBottom:36, position:"relative" }}>
              {STEPS.map((label,i)=>(
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
                  {i>0 && <div style={{ position:"absolute", left:"-50%", right:"50%", top:11, height:1, background: step>i ? BLUE : BORDER }}/>}
                  <StepDot n={i+1} active={step===i+1} done={step>i+1} label={label}/>
                </div>
              ))}
            </div>

            {/* ETAPE 1 */}
            {step===1 && (
              <div>
                <h1 style={{ fontSize:24, fontWeight:700, color:TEXT, marginBottom:10, lineHeight:1.2 }}>Essayer gratuitement pendant un mois</h1>
                <p style={{ fontSize:13, color:TEXT2, marginBottom:28, lineHeight:1.65 }}>
                  Avant de commencer votre essai, vous devez configurer votre abonnement en ajoutant 25 utilisateurs gratuits au maximum.
                </p>

                {/* Plan */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:13, color:TEXT2, marginBottom:8 }}>Choisissez votre plan</div>
                  {[
                    {id:"starter", label:"Imoloc Starter", desc:"Pour les petites agences"},
                    {id:"business", label:"Imoloc Business", desc:"Pour les agences en croissance", rec:true},
                  ].map(o=>(
                    <label key={o.id} className="radio-row">
                      <input type="radio" name="plan" checked={plan===o.id} onChange={()=>setPlan(o.id)}/>
                      <div>
                        <span style={{ fontSize:14, color:TEXT, fontWeight:500 }}>{o.label}</span>
                        {o.rec && <span style={{ marginLeft:8, fontSize:11, color:BLUE, fontWeight:600, padding:"1px 6px", border:"1px solid "+BLUE, borderRadius:2 }}>Recommand&eacute;</span>}
                        <div style={{ fontSize:12, color:TEXT2 }}>{o.desc} &mdash; {FMT(duree==="an"?(o.id==="starter"?15000:32000):(o.id==="starter"?18000:39000))} FCFA/utilisateur/mois</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Nombre utilisateurs */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:13, color:TEXT2, marginBottom:8 }}>Pour combien de personnes s&apos;agit-il ?</div>
                  <Dropdown value={users} onChange={e=>setUsers(+e.target.value)} style={{ maxWidth:120 }}>
                    {[1,2,3,4,5,6,7,8,9,10,15,20,25].map(n=><option key={n} value={n}>{n}</option>)}
                  </Dropdown>
                </div>

                {/* Duree */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:13, color:TEXT2, marginBottom:8 }}>Choisir la dur&eacute;e de votre abonnement</div>
                  <label className="radio-row"><input type="radio" name="duree" checked={duree==="an"} onChange={()=>setDuree("an")}/><span style={{ fontSize:14, color:TEXT }}>1 an <span style={{ fontSize:12, color:GREEN, fontWeight:600, marginLeft:6 }}>Economisez 20%</span></span></label>
                  <label className="radio-row"><input type="radio" name="duree" checked={duree==="mois"} onChange={()=>setDuree("mois")}/><span style={{ fontSize:14, color:TEXT }}>1 mois</span></label>
                </div>

                {/* Frequence */}
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontSize:13, color:TEXT2, marginBottom:8 }}>&Agrave; quelle fr&eacute;quence voulez-vous &ecirc;tre factur&eacute; ?</div>
                  <Dropdown value={freq} onChange={e=>setFreq(e.target.value)} style={{ maxWidth:300 }}>
                    <option value="mensuel">Tous les mois &mdash; {FMT(prixUnit*users)} FCFA/mois</option>
                    <option value="annuel">Une fois par an &mdash; {FMT(prixUnit*users*12)} FCFA/an</option>
                  </Dropdown>
                </div>

                {/* Resume commande */}
                <div style={{ borderTop:"1px solid "+BORDER, paddingTop:20, marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:TEXT, marginBottom:4 }}>R&eacute;sum&eacute; de la commande</div>
                  <div style={{ fontSize:12, color:TEXT2, marginBottom:16 }}>D&eacute;tails de votre commande apr&egrave;s la fin de votre essai le {trialStr}.</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:TEXT }}>Imoloc {p.nom}</div>
                      <div style={{ fontSize:12, color:TEXT2, marginTop:3 }}>
                        Abonnement {duree==="an"?"1 an":"1 mois"}, paiement de {FMT(prixUnit)} FCFA utilisateur/mois pour {users} utilisateur{users>1?"s":""}
                      </div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:TEXT, whiteSpace:"nowrap", marginLeft:16 }}>{FMT(sousTotal)} FCFA</div>
                  </div>
                  <div style={{ borderTop:"1px solid "+BORDER, paddingTop:12, marginBottom:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, color:TEXT2 }}>Sous-total apr&egrave;s la version d&apos;essai (TVA non incluse)</span>
                      <span style={{ fontSize:13, fontWeight:600, color:TEXT }}>{FMT(sousTotal)} FCFA</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:8 }}>
                    <span style={{ fontSize:13, color:TEXT }}>Paiement d&ucirc; aujourd&apos;hui (hors taxes)</span>
                    <span style={{ fontSize:15, fontWeight:700, color:TEXT }}>0,00 FCFA</span>
                  </div>
                </div>

                {/* Legal */}
                <p style={{ fontSize:11, color:TEXT2, lineHeight:1.6, marginBottom:24 }}>
                  Une fois l&apos;essai termin&eacute;, il sera converti en abonnement payant. Vous ne serez pas factur&eacute; si vous l&apos;annulez avant le {trialStr}.{" "}
                  <a href="#" style={{ fontSize:11 }}>D&eacute;couvrir plus d&apos;informations sur l&apos;annulation</a>
                </p>

                <button className="bn" onClick={()=>setStep(2)}>Suivant</button>
              </div>
            )}

            {/* ETAPE 2 */}
            {step===2 && (
              <div>
                <h1 style={{ fontSize:24, fontWeight:700, color:TEXT, marginBottom:10 }}>D&eacute;tails de connexion</h1>
                <p style={{ fontSize:13, color:TEXT2, marginBottom:28 }}>Cr&eacute;ez votre compte administrateur Imoloc.</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:13, color:TEXT2, marginBottom:5 }}>Pr&eacute;nom <span style={{color:"#d83b01"}}>*</span></label>
                    <input style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.prenom} onChange={e=>set("prenom",e.target.value)} autoFocus placeholder="Jean"/>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:13, color:TEXT2, marginBottom:5 }}>Nom <span style={{color:"#d83b01"}}>*</span></label>
                    <input style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.nom} onChange={e=>set("nom",e.target.value)} placeholder="Dupont"/>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:13, color:TEXT2, marginBottom:5 }}>E-mail professionnel <span style={{color:"#d83b01"}}>*</span></label>
                  <input style={inputStyle} onFocus={onFocus} onBlur={onBlur} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="vous@agence.com"/>
                  <div style={{ fontSize:11, color:TEXT2, marginTop:4 }}>Cette adresse sera votre identifiant de connexion.</div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:13, color:TEXT2, marginBottom:5 }}>Mot de passe <span style={{color:"#d83b01"}}>*</span></label>
                  <div style={{ position:"relative" }}>
                    <input style={{...inputStyle, paddingRight:72}} onFocus={onFocus} onBlur={onBlur} type={showPass?"text":"password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="8 caracteres minimum"/>
                    <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:BLUE, fontSize:12, fontFamily:"inherit" }}>{showPass?"Masquer":"Afficher"}</button>
                  </div>
                  {form.password && (
                    <div style={{ display:"flex", gap:4, marginTop:7, alignItems:"center" }}>
                      {[form.password.length>=8, /[A-Z]/.test(form.password), /[0-9!@#$]/.test(form.password)].map((ok,i)=>(
                        <div key={i} style={{ flex:1, height:3, background:ok?(i>1?GREEN:BLUE):"#e0e0e0", borderRadius:2, transition:"background .25s" }}/>
                      ))}
                      <span style={{ fontSize:11, color:TEXT2, marginLeft:6, whiteSpace:"nowrap" }}>
                        {[form.password.length>=8,/[A-Z]/.test(form.password),/[0-9!@#$]/.test(form.password)].filter(Boolean).length>=3?"Solide":form.password.length>=8?"Moyen":"Faible"}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom:28 }}>
                  <label style={{ display:"block", fontSize:13, color:TEXT2, marginBottom:5 }}>Confirmer le mot de passe <span style={{color:"#d83b01"}}>*</span></label>
                  <input style={inputStyle} onFocus={onFocus} onBlur={onBlur} type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Repetez votre mot de passe"/>
                  {form.confirm&&form.confirm!==form.password&&<div style={{ fontSize:12, color:"#d83b01", marginTop:4 }}>Les mots de passe ne correspondent pas.</div>}
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <button className="bs" onClick={()=>setStep(1)}>Pr&eacute;c&eacute;dent</button>
                  <button className="bn" onClick={()=>setStep(3)}>Suivant</button>
                </div>
              </div>
            )}

            {/* ETAPE 3 */}
            {step===3 && (
              <div>
                <h1 style={{ fontSize:24, fontWeight:700, color:TEXT, marginBottom:10 }}>Confirmer et finaliser la commande</h1>
                <p style={{ fontSize:13, color:TEXT2, marginBottom:24 }}>V&eacute;rifiez vos informations avant de commencer votre essai.</p>
                {[
                  ["Plan", "Imoloc "+p.nom],
                  ["Durée", duree==="an"?"1 an":"1 mois"],
                  ["Facturation", freq==="annuel"?"Annuellement":"Mensuellement"],
                  ["Utilisateurs", users+" utilisateur"+(users>1?"s":"")],
                  ["Nom", form.prenom+" "+form.nom],
                  ["E-mail", form.email],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:"flex", padding:"9px 0", borderBottom:"1px solid #f3f2f1", gap:16 }}>
                    <span style={{ color:TEXT2, width:110, flexShrink:0, fontSize:13 }}>{l}</span>
                    <span style={{ color:TEXT, fontWeight:500, fontSize:13 }}>{v||"—"}</span>
                  </div>
                ))}
                <div style={{ marginTop:20, borderTop:"1px solid "+BORDER, paddingTop:16, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:13, color:TEXT2 }}>Sous-total après l’essai</span>
                    <span style={{ fontSize:13, fontWeight:600, color:TEXT }}>{FMT(sousTotal)} FCFA</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, color:TEXT }}>Paiement dû aujourd’hui (hors taxes)</span>
                    <span style={{ fontSize:15, fontWeight:700, color:TEXT }}>0,00 FCFA</span>
                  </div>
                </div>
                <p style={{ fontSize:11, color:TEXT2, lineHeight:1.7, marginBottom:24 }}>
                  L’abonnement payant commence le <strong>{trialStr}</strong>, sauf annulation avant. Vous acceptez les <a href="#">conditions d’utilisation</a> et la <a href="#">politique de confidentialité</a> d’Imoloc.
                </p>
                <div style={{ display:"flex", gap:12 }}>
                  <button className="bs" onClick={()=>setStep(2)}>Précédent</button>
                  <button className="bn" onClick={submit} disabled={loading} style={{ padding:"9px 28px" }}>{loading?"Création...":"Commencer mon essai gratuit"}</button>
                </div>
              </div>
            )}
          </div>

          {/* ━━ COLONNE DROITE ━━ */}
          <div style={{ background:"#faf9f8", padding:"36px 28px", display:"flex", flexDirection:"column", gap:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:TEXT, marginBottom:6 }}>Imoloc {p.nom} &mdash; Essai</div>
            <div style={{ fontSize:13, fontWeight:600, color:TEXT2, marginBottom:18 }}>Inscription &agrave; votre essai gratuit</div>

            <Check>Ajoutez jusqu&apos;&agrave; <strong>25 utilisateurs</strong> pendant l&apos;essai</Check>
            <Check>La version d&apos;&eacute;valuation inclut les <strong>m&ecirc;mes fonctionnalit&eacute;s</strong> que le produit payant</Check>
            <Check>Aucun paiement requis pour commencer l&apos;essai</Check>
            <Check>L&apos;abonnement payant commence &agrave; la fin de l&apos;essai, sauf annulation avant le {trialStr}</Check>

            <div style={{ height:1, background:BORDER, margin:"20px 0" }}/>

            <div style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:14 }}>Points forts du produit</div>
            <Check>G&eacute;rez vos biens depuis n&apos;importe quel appareil</Check>
            <Check>Paiements <strong>Mobile Money</strong> natifs (MTN, Moov, Wave)</Check>
            <Check>Signatures &eacute;lectroniques de baux incluses</Check>
            <Check>Portail locataire mobile inclus</Check>
            <Check>Rapports financiers automatiques</Check>

            <div style={{ height:1, background:BORDER, margin:"20px 0" }}/>

            {/* Grille modules */}
            <div style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:14 }}>Modules inclus</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {MODULES.map(m=>(
                <div key={m.nom} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                  <div style={{ width:40, height:40, borderRadius:6, background:m.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:m.letter.length>1?11:16, fontWeight:700, color:"white", letterSpacing:m.letter.length>1?"-0.5px":"0" }}>{m.letter}</span>
                  </div>
                  <span style={{ fontSize:10, color:TEXT2, textAlign:"center", lineHeight:1.3 }}>{m.nom}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop:"auto", paddingTop:24, borderTop:"1px solid "+BORDER }}>
              <div style={{ fontSize:12, color:TEXT2, marginBottom:5 }}>D&eacute;j&agrave; un compte ? <Link to="/login" style={{ fontSize:12 }}>Se connecter</Link></div>
              <div style={{ fontSize:12, color:TEXT2 }}>Locataire ou propri&eacute;taire ? <Link to="/login" style={{ fontSize:12 }}>Acc&egrave;s direct</Link></div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop:"1px solid "+BORDER, padding:"10px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", background:BG, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          {["Vos choix de confidentialité","Confidentialité et cookies","Conditions d’utilisation","Marques","Accessibilité"].map(l=>(
            <a key={l} href="#" style={{ fontSize:11, color:TEXT2 }}>{l}</a>
          ))}
        </div>
        <span style={{ fontSize:11, color:TEXT2 }}>&copy; 2026 Imoloc</span>
      </div>
    </div>
  )
}
