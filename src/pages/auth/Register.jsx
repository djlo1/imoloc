import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

// ── DESIGN TOKENS FLUENT UI ──
const C = {
  blue:    "#0067b8",
  hover:   "#005da0",
  error:   "#a4262c",
  bg:      "#f3f2f1",
  surface: "#ffffff",
  text:    "#323130",
  text2:   "#605e5c",
  border:  "#8a8886",
  border2: "#d2d0ce",
  green:   "#107c10",
  sep:     "#e1dfdd",
}

const FMT = n => n?.toLocaleString("fr-FR") || "0"

const MODULES = [
  {nom:"Biens",      bg:"#0078D4", l:"B"},
  {nom:"Baux",       bg:"#107c10", l:"B"},
  {nom:"Paiements",  bg:"#d83b01", l:"P"},
  {nom:"Locataires", bg:"#8764b8", l:"L"},
  {nom:"Rapports",   bg:"#038387", l:"R"},
  {nom:"Loci IA",    bg:"#0067b8", l:"AI"},
  {nom:"Maintenance",bg:"#ca5010", l:"M"},
  {nom:"Signatures", bg:"#00b294", l:"S"},
]

// ── COMPOSANTS ──
function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 0"}}>
      <div style={{width:40,height:40,border:"3px solid #e0e0e0",borderTop:"3px solid "+C.blue,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  )
}

function Check({children}) {
  return (
    <div style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
      <svg width="16" height="16" viewBox="0 0 16 16" style={{flexShrink:0,marginTop:1}}>
        <circle cx="8" cy="8" r="8" fill="#dff6dd"/>
        <path d="M4.5 8l2.5 2.5 5-5" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
      <span style={{fontSize:13,color:C.text,lineHeight:1.55}}>{children}</span>
    </div>
  )
}

function StepIndicator({step}) {
  const LABELS = ["Abonnement et compte","Connexion","Paiement et confirmation"]
  return (
    <div style={{display:"flex",alignItems:"flex-start",marginBottom:32,position:"relative"}}>
      {LABELS.map((label,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
          {i>0 && <div style={{position:"absolute",left:"-50%",right:"50%",top:10,height:2,background:step>i+1?C.blue:"#edebe9"}}/>}
          <div style={{
            width:20,height:20,borderRadius:"50%",position:"relative",zIndex:1,
            border: step===i+1 ? "3px solid "+C.blue : step>i+1 ? "none" : "2px solid #c8c8c8",
            background: step>i+1 ? C.blue : "#fff",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            {step>i+1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
          </div>
          <span style={{fontSize:11,color:step===i+1?C.text:C.text2,fontWeight:step===i+1?600:400,textAlign:"center",marginTop:6,lineHeight:1.3,maxWidth:96}}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function MsInput({label,type="text",value,onChange,error,placeholder,autoFocus,disabled,style={},rightEl}) {
  const [focused,setFocused]=useState(false)
  return (
    <div style={{marginBottom:16}}>
      {label && <label style={{display:"block",fontSize:12,fontWeight:600,color:error?C.error:C.text2,marginBottom:4}}>{label}</label>}
      <div style={{position:"relative"}}>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder||""} autoFocus={autoFocus} disabled={disabled}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{
            width:"100%",padding:"8px 10px",paddingRight:rightEl?44:10,
            border: error ? "2px solid "+C.error : focused ? "2px solid "+C.text : "1px solid "+C.border,
            borderRadius:2,fontSize:14,fontFamily:"inherit",color:C.text,
            background:disabled?"#f3f2f1":"#fff",outline:"none",
            boxSizing:"border-box",...style
          }}/>
        {rightEl && <div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)"}}>{rightEl}</div>}
      </div>
      {error && <div style={{fontSize:12,color:C.error,marginTop:4}}>{error}</div>}
    </div>
  )
}

function BtnPrimary({children,onClick,disabled,style={}}) {
  const [hov,setHov]=useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)}
      style={{padding:"8px 20px",background:disabled?"#c8c8c8":hov?C.hover:C.blue,color:"#fff",border:"none",borderRadius:2,fontSize:14,fontFamily:"inherit",fontWeight:600,cursor:disabled?"default":"pointer",transition:"background .15s",...style}}>
      {children}
    </button>
  )
}

function BtnSecondary({children,onClick,style={}}) {
  const [hov,setHov]=useState(false)
  return (
    <button onClick={onClick}
      onMouseOver={()=>setHov(true)} onMouseOut={()=>setHov(false)}
      style={{padding:"8px 20px",background:hov?"#f3f2f1":"#fff",color:C.text,border:"1px solid "+C.border,borderRadius:2,fontSize:14,fontFamily:"inherit",cursor:"pointer",transition:"background .15s",...style}}>
      {children}
    </button>
  )
}

// ── COMPOSANT PRINCIPAL ──
export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  // STEP 1 STATE
  const [users, setUsers] = useState(1)
  const [duree, setDuree] = useState("mois")
  const [freq, setFreq] = useState("mensuel")
  const [plan, setPlan] = useState("business")

  // STEP 2 STATE - 4 sous-etats
  const [s2, setS2] = useState(1) // 1=email, 2=loading, 3=confirm, 4=otp
  const [email, setEmail] = useState("")
  const [emailErr, setEmailErr] = useState("")
  const [otp, setOtp] = useState("")
  const [otpErr, setOtpErr] = useState("")
  const [timer, setTimer] = useState(60)
  const timerRef = useRef(null)

  // STEP 3 STATE
  const [form, setForm] = useState({prenom:"",nom:"",password:"",confirm:""})
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const set3 = (k,v) => setForm(f=>({...f,[k]:v}))

  const PLANS = {
    starter:  {nom:"Starter",  mois:18000, an:15000},
    business: {nom:"Business", mois:39000, an:32000},
  }
  const p = PLANS[plan]
  const prixUnit = duree==="an" ? p.an : p.mois
  const sousTotal = prixUnit * users
  const trial = new Date(); trial.setMonth(trial.getMonth()+1)
  const trialStr = trial.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})

  // Timer OTP
  useEffect(() => {
    if (s2===4) {
      setTimer(60)
      timerRef.current = setInterval(()=>setTimer(t=>t>0?t-1:0),1000)
    }
    return ()=>clearInterval(timerRef.current)
  },[s2])

  // ── STEP 2 ACTIONS ──
  const handleEmailNext = async () => {
    if (!email || !email.includes("@")) { setEmailErr("Cela est obligatoire"); return }
    setEmailErr("")
    setS2(2)
    // Simuler chargement + envoyer OTP
    try {
      await supabase.auth.signInWithOtp({ email, options:{ shouldCreateUser:true } })
    } catch(e) {}
    setTimeout(()=>setS2(3), 1800)
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length<4) { setOtpErr("Entrez le code recu par email"); return }
    setOtpErr("")
    setS2(2)
    const {error} = await supabase.auth.verifyOtp({email, token:otp, type:"email"})
    if (error) { setOtpErr(error.message); setS2(4); return }
    setStep(3)
  }

  // ── STEP 3 SUBMIT ──
  const submit = async () => {
    if (!form.prenom||!form.nom) { toast.error("Prenom et nom requis"); return }
    if (form.password.length<8) { toast.error("8 caracteres minimum"); return }
    if (form.password!==form.confirm) { toast.error("Mots de passe differents"); return }
    setLoading(true)
    const {error} = await supabase.auth.updateUser({
      password: form.password,
      data: { prenom:form.prenom, nom:form.nom, role:"global_admin", type_compte:"organisation" }
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success("Compte configure ! Bienvenue.")
    navigate("/agence")
  }

  // ── COLONNE DROITE (fixe) ──
  const RightCol = () => (
    <div style={{background:"#faf9f8",padding:"32px 28px",display:"flex",flexDirection:"column",gap:0,borderLeft:"1px solid "+C.sep}}>
      <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>Imoloc {p.nom} &mdash; Essai</div>
      <div style={{fontSize:12,color:C.text2,fontWeight:500,marginBottom:18}}>Inscription &agrave; votre essai gratuit</div>

      <Check>Ajoutez jusqu&apos;&agrave; <strong>25 utilisateurs</strong> pendant l&apos;essai</Check>
      <Check>La version d&apos;&eacute;valuation inclut les <strong>m&ecirc;mes fonctionnalit&eacute;s</strong> que le produit payant</Check>
      <Check><strong>Aucun paiement</strong> requis pour commencer</Check>
      <Check>L&apos;abonnement payant commence &agrave; la fin de l&apos;essai, sauf annulation avant le {trialStr}</Check>

      <div style={{height:1,background:C.sep,margin:"16px 0"}}/>

      {/* Resume commande */}
      <div style={{background:C.bg,padding:14,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>R&eacute;sum&eacute; de la commande</div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:C.text}}>Imoloc {p.nom}</div>
            <div style={{fontSize:11,color:C.text2,marginTop:2}}>Abonnement {duree==="an"?"1 an":"1 mois"}, {FMT(prixUnit)} FCFA/utilisateur/{duree==="an"?"an":"mois"} pour {users} utilisateur{users>1?"s":""}</div>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",marginLeft:8}}>{FMT(sousTotal)} FCFA</div>
        </div>
        <div style={{borderTop:"1px solid "+C.sep,paddingTop:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.text2,marginBottom:4}}>
            <span>Sous-total apr&egrave;s l&apos;essai (TVA non incluse)</span>
            <span style={{fontWeight:600,color:C.text}}>{FMT(sousTotal)} FCFA</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700}}>
            <span style={{color:C.text}}>Paiement d&ucirc; aujourd&apos;hui (hors taxes)</span>
            <span style={{color:C.text}}>0,00 FCFA</span>
          </div>
        </div>
      </div>

      <div style={{height:1,background:C.sep,margin:"4px 0 16px"}}/>

      <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Points forts du produit</div>
      <Check>G&eacute;rez vos biens depuis n&apos;importe quel appareil</Check>
      <Check>Paiements <strong>Mobile Money</strong> natifs (MTN, Moov, Wave)</Check>
      <Check>Signatures &eacute;lectroniques et portail locataire inclus</Check>
      <Check>Support d&eacute;di&eacute; inclus</Check>

      <div style={{height:1,background:C.sep,margin:"16px 0"}}/>

      <div style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:12,textTransform:"uppercase",letterSpacing:".04em"}}>Modules inclus</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {MODULES.map(m=>(
          <div key={m.nom} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:38,height:38,borderRadius:6,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:m.l.length>1?10:15,fontWeight:700,color:"white"}}>{m.l}</span>
            </div>
            <span style={{fontSize:10,color:C.text2,textAlign:"center",lineHeight:1.2}}>{m.nom}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:"auto",paddingTop:20,borderTop:"1px solid "+C.sep}}>
        <div style={{fontSize:12,color:C.text2,marginBottom:4}}>D&eacute;j&agrave; un compte ? <Link to="/login" style={{fontSize:12,color:C.blue}}>Se connecter</Link></div>
        <div style={{fontSize:12,color:C.text2}}>Locataire ou propri&eacute;taire ? <Link to="/login" style={{fontSize:12,color:C.blue}}>Acc&egrave;s direct</Link></div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI','Helvetica Neue',sans-serif",color:C.text}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        a{color:${C.blue};text-decoration:none}
        a:hover{text-decoration:underline}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid "+C.sep,padding:"12px 32px"}}>
        <Link to="/" style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:26,height:26,background:C.blue,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>Imoloc</span>
        </Link>
      </div>

      {/* TITRE PAGE */}
      <div style={{textAlign:"center",padding:"32px 20px 0"}}>
        <h1 style={{fontSize:28,fontWeight:600,color:C.text,marginBottom:6,letterSpacing:"-0.02em"}}>Imoloc {p.nom} &mdash; Essai</h1>
        <p style={{fontSize:15,color:C.text2}}>Un mois gratuit avec moyen de paiement requis</p>
      </div>

      {/* CARTE CENTRALE */}
      <div style={{maxWidth:1100,margin:"28px auto 48px",padding:"0 20px"}}>
        <div style={{background:"#fff",borderRadius:2,boxShadow:"0 1.6px 3.6px 0 rgba(0,0,0,0.132),0 0.3px 0.9px 0 rgba(0,0,0,0.108)",border:"1px solid "+C.sep,display:"grid",gridTemplateColumns:"1fr 340px",overflow:"hidden"}}>

          {/* ━━ COLONNE GAUCHE ━━ */}
          <div style={{padding:"36px 40px",position:"relative"}}>
            <StepIndicator step={step}/>

            {/* ── ETAPE 1 : ABONNEMENT ── */}
            {step===1 && (
              <div>
                <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:8}}>Essayer gratuitement pendant un mois</h2>
                <p style={{fontSize:13,color:C.text2,marginBottom:28,lineHeight:1.65}}>
                  Avant de commencer votre essai, configurez votre abonnement. Ajoutez jusqu&apos;&agrave; 25 utilisateurs gratuitement.
                </p>

                {/* Plan */}
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>Plan</div>
                  {[
                    {id:"starter",  label:"Imoloc Starter",  desc:"Pour les petites agences"},
                    {id:"business", label:"Imoloc Business", desc:"Pour les agences en croissance", rec:true},
                  ].map(o=>(
                    <label key={o.id} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"8px 0",borderBottom:"1px solid "+C.sep}}>
                      <input type="radio" name="plan" checked={plan===o.id} onChange={()=>setPlan(o.id)}
                        style={{width:16,height:16,accentColor:C.blue,flexShrink:0,marginTop:2}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:500,color:C.text}}>
                          {o.label}
                          {o.rec && <span style={{marginLeft:8,fontSize:11,color:C.blue,fontWeight:600,padding:"1px 6px",border:"1px solid "+C.blue,borderRadius:2}}>Recommand&eacute;</span>}
                        </div>
                        <div style={{fontSize:12,color:C.text2,marginTop:2}}>
                          {o.desc} &mdash; {FMT(duree==="an"?(o.id==="starter"?15000:32000):(o.id==="starter"?18000:39000))} FCFA/utilisateur/mois
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Nombre utilisateurs - style Microsoft (input numerique propre) */}
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>Pour combien de personnes s&apos;agit-il ?</div>
                  <div style={{display:"flex",alignItems:"stretch",width:"fit-content",border:"1px solid "+C.border,borderRadius:2,overflow:"hidden"}}>
                    <button onClick={()=>setUsers(u=>Math.max(1,u-1))}
                      style={{width:36,background:"#f3f2f1",border:"none",borderRight:"1px solid "+C.border2,fontSize:20,cursor:"pointer",color:C.text,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,padding:0}}>
                      &minus;
                    </button>
                    <input type="number" min="1" max="25" value={users} onChange={e=>setUsers(Math.min(25,Math.max(1,+e.target.value)))}
                      style={{width:64,textAlign:"center",border:"none",fontSize:16,fontWeight:600,fontFamily:"inherit",color:C.text,outline:"none",padding:"6px 0"}}/>
                    <button onClick={()=>setUsers(u=>Math.min(25,u+1))}
                      style={{width:36,background:"#f3f2f1",border:"none",borderLeft:"1px solid "+C.border2,fontSize:20,cursor:"pointer",color:C.text,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,padding:0}}>
                      +
                    </button>
                  </div>
                  <div style={{fontSize:11,color:C.text2,marginTop:6}}>25 utilisateurs maximum pendant l&apos;essai</div>
                </div>

                {/* Duree */}
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>Choisir la dur&eacute;e de votre abonnement</div>
                  {[["an","1 an","Economisez 20%"],["mois","1 mois",""]].map(([v,l,s])=>(
                    <label key={v} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:10}}>
                      <input type="radio" name="duree" checked={duree===v} onChange={()=>{setDuree(v);setFreq(v==="an"?"annuel":"mensuel")}}
                        style={{width:16,height:16,accentColor:C.blue}}/>
                      <span style={{fontSize:14,color:C.text}}>{l}</span>
                      {s && <span style={{fontSize:12,color:C.green,fontWeight:600}}>{s}</span>}
                    </label>
                  ))}
                </div>

                {/* Frequence */}
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:10,textTransform:"uppercase",letterSpacing:".04em"}}>&Agrave; quelle fr&eacute;quence voulez-vous &ecirc;tre factur&eacute; ?</div>
                  <div style={{position:"relative",display:"inline-block",minWidth:300}}>
                    <select value={freq} onChange={e=>setFreq(e.target.value)}
                      style={{width:"100%",padding:"7px 32px 7px 10px",border:"1px solid "+C.border,borderRadius:2,background:"#fff",fontSize:14,fontFamily:"inherit",color:C.text,outline:"none",cursor:"pointer",appearance:"none"}}>
                      <option value="mensuel">Tous les mois &mdash; {FMT(prixUnit*users)} FCFA/mois</option>
                      <option value="annuel">Une fois par an &mdash; {FMT(prixUnit*users*12)} FCFA/an</option>
                    </select>
                    <svg style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>

                {/* Resume commande inline */}
                <div style={{borderTop:"1px solid "+C.sep,paddingTop:20,marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>R&eacute;sum&eacute; de la commande</div>
                  <div style={{fontSize:12,color:C.text2,marginBottom:14,lineHeight:1.5}}>D&eacute;tails de votre commande apr&egrave;s la fin de votre essai le {trialStr}.</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:500,color:C.text}}>Imoloc {p.nom}</div>
                      <div style={{fontSize:12,color:C.text2,marginTop:3}}>Abonnement {duree==="an"?"1 an":"1 mois"}, paiement de {FMT(prixUnit)} FCFA utilisateur/{duree==="an"?"an":"mois"} pour {users} utilisateur{users>1?"s":""}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",marginLeft:16}}>{FMT(sousTotal)} FCFA</div>
                  </div>
                  <div style={{borderTop:"1px solid "+C.sep,paddingTop:10,marginBottom:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.text2,marginBottom:6}}>
                      <span>Sous-total apr&egrave;s la version d&apos;essai (TVA non incluse)</span>
                      <span style={{fontWeight:600,color:C.text}}>{FMT(sousTotal)} FCFA</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700}}>
                      <span>Paiement d&ucirc; aujourd&apos;hui (hors taxes)</span>
                      <span>0,00 FCFA</span>
                    </div>
                  </div>
                </div>

                <p style={{fontSize:11,color:C.text2,lineHeight:1.65,marginBottom:24}}>
                  Une fois l&apos;essai termin&eacute;, il sera converti en abonnement payant. Vous ne serez pas factur&eacute; si vous l&apos;annulez avant le {trialStr}.{" "}
                  <a href="#" style={{fontSize:11,color:C.blue}}>D&eacute;couvrir plus d&apos;informations sur l&apos;annulation</a>
                </p>

                <BtnPrimary onClick={()=>setStep(2)}>Suivant</BtnPrimary>
              </div>
            )}

            {/* ── ETAPE 2 : CONNEXION (4 sous-etats) ── */}
            {step===2 && (
              <div style={{position:"relative"}}>
                {/* Overlay spinner */}
                {s2===2 && (
                  <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,0.82)",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:2}}>
                    <div style={{width:44,height:44,border:"4px solid #e0e0e0",borderTop:"4px solid "+C.blue,borderRadius:"50%",animation:"spin 0.75s linear infinite"}}/>
                  </div>
                )}

                {/* Sous-etat 1 : Saisie email */}
                {s2===1 && (
                  <div>
                    <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:8}}>Nous allons vous aider &agrave; d&eacute;marrer</h2>
                    <p style={{fontSize:13,color:C.text2,marginBottom:28,lineHeight:1.65}}>Entrez votre adresse e-mail professionnelle pour cr&eacute;er votre compte Imoloc.</p>
                    <MsInput label="Adresse e-mail professionnelle *" type="email" value={email}
                      onChange={e=>{setEmail(e.target.value);setEmailErr("")}} error={emailErr} autoFocus/>
                    <div style={{fontSize:12,color:C.text2,marginBottom:24}}>
                      D&eacute;j&agrave; un compte ? <Link to="/login" style={{fontSize:12}}>Se connecter</Link>
                    </div>
                    <div style={{display:"flex",gap:12}}>
                      <BtnSecondary onClick={()=>setStep(1)}>Pr&eacute;c&eacute;dent</BtnSecondary>
                      <BtnPrimary onClick={handleEmailNext}>Suivant</BtnPrimary>
                    </div>
                  </div>
                )}

                {/* Sous-etat 2 : Chargement (affiche quand meme le titre) */}
                {s2===2 && (
                  <div style={{opacity:0.4}}>
                    <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:8}}>Nous allons vous aider &agrave; d&eacute;marrer</h2>
                    <MsInput label="Adresse e-mail" value={email} disabled/>
                    <BtnPrimary disabled>Suivant</BtnPrimary>
                  </div>
                )}

                {/* Sous-etat 3 : Confirmation email */}
                {s2===3 && (
                  <div>
                    <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:8}}>Nous allons vous aider &agrave; d&eacute;marrer</h2>
                    <p style={{fontSize:13,color:C.text2,marginBottom:20,lineHeight:1.65}}>
                      Il semble que vous devez cr&eacute;er un nouveau compte. Commencez !<br/>
                      Continuez en tant que <strong style={{color:C.text}}>{email}</strong>
                    </p>
                    <div style={{display:"flex",gap:12,marginBottom:24}}>
                      <BtnPrimary onClick={()=>setS2(4)}>Configurer le compte</BtnPrimary>
                      <BtnSecondary onClick={()=>{setS2(1);setEmail("")}}>Modifier mon adresse e-mail</BtnSecondary>
                    </div>
                  </div>
                )}

                {/* Sous-etat 4 : Code OTP */}
                {s2===4 && (
                  <div>
                    <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:8}}>Nous souhaitons mieux vous conna&icirc;tre</h2>
                    <p style={{fontSize:13,color:C.text2,marginBottom:24,lineHeight:1.65}}>
                      Nous avons envoy&eacute; un code de v&eacute;rification &agrave; <strong style={{color:C.text}}>{email}</strong>. Entrez le code pour terminer l&apos;inscription.
                    </p>
                    <MsInput label="Code de v&eacute;rification *" value={otp}
                      onChange={e=>{setOtp(e.target.value.replace(/\D/g,""));setOtpErr("")}}
                      error={otpErr} autoFocus style={{maxWidth:200}} placeholder="000000"/>
                    <div style={{fontSize:12,color:C.text2,marginBottom:24}}>
                      Vous ne l&apos;avez pas encore ?{" "}
                      {timer>0
                        ? <span style={{color:"#c8c8c8"}}>R&eacute;essayer ({timer}s)</span>
                        : <a href="#" style={{fontSize:12}} onClick={e=>{e.preventDefault();handleEmailNext()}}>R&eacute;essayer</a>
                      }
                    </div>
                    <div style={{display:"flex",gap:12}}>
                      <BtnSecondary onClick={()=>setS2(3)}>Pr&eacute;c&eacute;dent</BtnSecondary>
                      <BtnPrimary onClick={handleVerifyOtp}>V&eacute;rifier</BtnPrimary>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ETAPE 3 : FINALISATION ── */}
            {step===3 && (
              <div>
                <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:8}}>Compl&eacute;tez votre profil</h2>
                <p style={{fontSize:13,color:C.text2,marginBottom:28}}>
                  Votre email <strong style={{color:C.text}}>{email}</strong> a &eacute;t&eacute; v&eacute;rifi&eacute;. Renseignez les derniers d&eacute;tails.
                </p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:4}}>
                  <MsInput label="Pr&eacute;nom *" value={form.prenom} onChange={e=>set3("prenom",e.target.value)} autoFocus placeholder="Jean"/>
                  <MsInput label="Nom *" value={form.nom} onChange={e=>set3("nom",e.target.value)} placeholder="Dupont"/>
                </div>
                <MsInput label="Mot de passe *" type={showPass?"text":"password"} value={form.password}
                  onChange={e=>set3("password",e.target.value)} placeholder="8 caract&egrave;res minimum"
                  rightEl={<button type="button" onClick={()=>setShowPass(!showPass)} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>{showPass?"Masquer":"Afficher"}</button>}/>
                {form.password && (
                  <div style={{display:"flex",gap:4,marginBottom:16,alignItems:"center"}}>
                    {[form.password.length>=8,/[A-Z]/.test(form.password),/[0-9!@#$]/.test(form.password)].map((ok,i)=>(
                      <div key={i} style={{flex:1,height:3,background:ok?(i>1?C.green:C.blue):"#e0e0e0",borderRadius:2,transition:"background .25s"}}/>
                    ))}
                    <span style={{fontSize:11,color:C.text2,marginLeft:6,whiteSpace:"nowrap"}}>
                      {[form.password.length>=8,/[A-Z]/.test(form.password),/[0-9!@#$]/.test(form.password)].filter(Boolean).length>=3?"Solide":form.password.length>=8?"Moyen":"Faible"}
                    </span>
                  </div>
                )}
                <MsInput label="Confirmer le mot de passe *" type="password" value={form.confirm}
                  onChange={e=>set3("confirm",e.target.value)} placeholder="R&eacute;p&eacute;tez votre mot de passe"
                  error={form.confirm&&form.confirm!==form.password?"Les mots de passe ne correspondent pas":""} />
                <p style={{fontSize:11,color:C.text2,lineHeight:1.7,marginBottom:24}}>
                  En cr&eacute;ant ce compte, vous acceptez les <a href="#" style={{fontSize:11}}>conditions d&apos;utilisation</a> et la <a href="#" style={{fontSize:11}}>politique de confidentialit&eacute;</a> d&apos;Imoloc.
                </p>
                <BtnPrimary onClick={submit} disabled={loading} style={{padding:"9px 28px"}}>
                  {loading?"Cr&eacute;ation...":"Commencer mon essai gratuit"}
                </BtnPrimary>
              </div>
            )}
          </div>

          {/* COLONNE DROITE */}
          <RightCol/>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{borderTop:"1px solid "+C.sep,padding:"10px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {["Vos choix de confidentialit\u00e9","Confidentialit\u00e9 et cookies","Conditions d\u2019utilisation","Marques","Accessibilit\u00e9"].map(l=>(
            <a key={l} href="#" style={{fontSize:11,color:C.text2}}>{l}</a>
          ))}
        </div>
        <span style={{fontSize:11,color:C.text2}}>&copy; 2026 Imoloc</span>
      </div>
    </div>
  )
}
