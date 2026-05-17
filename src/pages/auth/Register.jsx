import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

const PLANS = [
  { id:"starter", nom:"Starter", prix_mois:18000, prix_an:15000, desc:"Pour les petites agences", max_users:3 },
  { id:"business", nom:"Business", prix_mois:39000, prix_an:32000, desc:"Pour les agences en croissance", max_users:10, pop:true },
  { id:"enterprise", nom:"Enterprise", prix_mois:null, prix_an:null, desc:"Pour les grandes organisations", max_users:999 },
]

const TYPES = [
  { id:"organisation", label:"Agence / Organisation", desc:"G\u00e9rez un parc multi-biens avec votre \u00e9quipe" },
  { id:"particulier", label:"Particulier", desc:"Propri\u00e9taire individuel avec quelques biens" },
]

const TYPES_AUTRES = [
  { id:"proprietaire", label:"Propri\u00e9taire", path:"/register/proprietaire" },
  { id:"locataire", label:"Locataire", path:"/register/locataire" },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [plan, setPlan] = useState("business")
  const [duree, setDuree] = useState("an")
  const [users, setUsers] = useState(1)
  const [typeCompte, setTypeCompte] = useState("organisation")
  const [form, setForm] = useState({ prenom:"", nom:"", email:"", password:"", confirm:"" })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const planInfo = PLANS.find(p=>p.id===plan)
  const prix = planInfo?.prix_mois ? (duree==="mois" ? planInfo.prix_mois : planInfo.prix_an) : null
  const total = prix ? prix * users : null
  const trialEnd = new Date(); trialEnd.setMonth(trialEnd.getMonth()+1)
  const trialEndStr = trialEnd.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})

  const ROLE_MAP = { organisation:"global_admin", particulier:"agence", proprietaire:"proprietaire", locataire:"locataire" }

  const handleFinaliser = async () => {
    if (!form.prenom || !form.nom) { toast.error("Nom et pr\u00e9nom requis"); return }
    if (!form.email || !form.email.includes("@")) { toast.error("Email invalide"); return }
    if (form.password.length < 8) { toast.error("Mot de passe: 8 caract\u00e8res minimum"); return }
    if (form.password !== form.confirm) { toast.error("Mots de passe diff\u00e9rents"); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { prenom:form.prenom, nom:form.nom, role:ROLE_MAP[typeCompte], type_compte:typeCompte } }
      })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success("Compte cr\u00e9\u00e9 ! Bienvenue sur Imoloc.")
      if (typeCompte==="locataire") navigate("/locataire")
      else if (typeCompte==="proprietaire") navigate("/proprietaire")
      else navigate("/agence")
    } catch(e) { toast.error(e.message); setLoading(false) }
  }

  const STEPS = [
    { n:1, label:"D\u00e9tails de l\u2019abonnement" },
    { n:2, label:"D\u00e9tails du compte" },
    { n:3, label:"Confirmer et finaliser" },
  ]

  return (
    <div style={{minHeight:"100vh",background:"#f2f2f2",fontFamily:"\"Segoe UI\",system-ui,sans-serif"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .ms-field{width:100%;padding:10px 12px;border:1px solid #ccc;background:#fff;font-size:14px;font-family:inherit;color:#1a1a1a;outline:none;transition:border-color 0.15s;border-radius:2px}
        .ms-field:focus{border-color:#0067b8;box-shadow:0 0 0 1px #0067b8}
        .ms-label{display:block;font-size:13px;color:#333;margin-bottom:5px;font-weight:400}
        .ms-btn{padding:10px 24px;background:#0067b8;color:#fff;border:none;font-size:14px;font-family:inherit;font-weight:600;cursor:pointer;border-radius:2px;transition:background 0.15s;white-space:nowrap}
        .ms-btn:hover{background:#005a9e}
        .ms-btn:disabled{background:#b3b3b3;cursor:default}
        .ms-btn-out{padding:10px 24px;background:#fff;color:#0067b8;border:1px solid #0067b8;font-size:14px;font-family:inherit;cursor:pointer;border-radius:2px;transition:all 0.15s}
        .ms-btn-out:hover{background:#f0f7ff}
        .plan-card{border:1px solid #ccc;padding:16px;cursor:pointer;transition:all 0.15s;background:#fff;border-radius:2px;position:relative}
        .plan-card.sel{border-color:#0067b8;background:#f0f7ff;box-shadow:0 0 0 1px #0067b8}
        .plan-card:hover{border-color:#0067b8}
        .type-card{border:1px solid #ccc;padding:12px 16px;cursor:pointer;transition:all 0.15s;background:#fff;border-radius:2px;display:flex;align-items:center;gap:12px}
        .type-card.sel{border-color:#0067b8;background:#f0f7ff}
        .radio{width:18px;height:18px;border-radius:50%;border:2px solid #999;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .radio.on{border-color:#0067b8}
        .radio.on::after{content:"";width:8px;height:8px;border-radius:50%;background:#0067b8}
        .step-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
        .step-num.done{background:#0067b8;color:#fff}
        .step-num.active{background:#fff;color:#0067b8;border:2px solid #0067b8}
        .step-num.todo{background:#e0e0e0;color:#888}
        .step-link{font-size:13px;color:#0067b8;text-decoration:none;cursor:pointer;transition:color 0.1s}
        .step-link:hover{text-decoration:underline}
        .step-link.active{color:#1a1a1a;font-weight:600;cursor:default;text-decoration:none}
        .step-link.todo{color:#999;cursor:default}
        .divider{height:1px;background:#e0e0e0;margin:20px 0}
        .summary-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:14px}
        .summary-total{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:2px solid #1a1a1a;font-size:16px;font-weight:700}
        .strength-bar{height:4px;border-radius:2px;transition:all 0.3s}
      `}</style>

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #e0e0e0",padding:"12px 24px",display:"flex",alignItems:"center",gap:16}}>
        <Link to="/" style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
          <div style={{width:28,height:28,background:"#0067b8",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{fontSize:16,fontWeight:700,color:"#1a1a1a"}}>Imoloc</span>
        </Link>
        <span style={{color:"#ccc"}}>|</span>
        <span style={{fontSize:14,color:"#555"}}>{planInfo?.nom||"Business"} &#8212; Essai gratuit</span>
      </div>

      {/* PROGRESS - Fil d ariel style Microsoft */}
      <div style={{background:"#fff",borderBottom:"1px solid #e0e0e0",padding:"14px 24px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {STEPS.map((s,i) => (
            <div key={s.n} style={{display:"flex",alignItems:"center",gap:6}}>
              {i>0 && <span style={{color:"#ccc",fontSize:13}}>&#8250;</span>}
              <span
                className={"step-link"+(step===s.n?" active":step>s.n?" done":" todo")}
                onClick={()=>step>s.n&&setStep(s.n)}
                dangerouslySetInnerHTML={{__html:s.label}}
              />
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 24px",display:"grid",gridTemplateColumns:"1fr 320px",gap:32,alignItems:"flex-start"}}>

        {/* LEFT */}
        <div style={{background:"#fff",padding:"28px",border:"1px solid #e0e0e0"}}>

          {/* ── ETAPE 1 : ABONNEMENT ── */}
          {step===1 && (
            <div>
              <h2 style={{fontSize:22,fontWeight:400,color:"#1a1a1a",marginBottom:6}}>Essayer gratuitement pendant un mois</h2>
              <p style={{fontSize:14,color:"#555",marginBottom:24,lineHeight:1.6}}>Avant de commencer votre essai, configurez votre abonnement. Aucun paiement requis aujourd&#8217;hui.</p>

              <div className="divider"/>

              {/* Type de compte */}
              <div style={{marginBottom:24}}>
                <label className="ms-label" style={{marginBottom:12,fontSize:14,fontWeight:600}}>Quel est votre profil ?</label>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {TYPES.map(t => (
                    <div key={t.id} className={"type-card"+(typeCompte===t.id?" sel":"")} onClick={()=>setTypeCompte(t.id)}>
                      <div className={"radio"+(typeCompte===t.id?" on":"")}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:500,color:"#1a1a1a"}}>{t.label}</div>
                        <div style={{fontSize:12,color:"#777",marginTop:2}}>{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan */}
              {(typeCompte==="organisation"||typeCompte==="particulier") && (
                <div style={{marginBottom:24}}>
                  <label className="ms-label" style={{marginBottom:12,fontSize:14,fontWeight:600}}>Choisissez votre plan</label>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {PLANS.map(p => (
                      <div key={p.id} className={"plan-card"+(plan===p.id?" sel":"")} onClick={()=>setPlan(p.id)}>
                        {p.pop && <div style={{position:"absolute",top:8,right:8,fontSize:10,fontWeight:700,padding:"2px 8px",background:"#0067b8",color:"#fff",borderRadius:2}}>Recommand&#233;</div>}
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div className={"radio"+(plan===p.id?" on":"")}/>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                              <span style={{fontSize:15,fontWeight:600,color:"#1a1a1a"}}>Imoloc {p.nom}</span>
                              <span style={{fontSize:12,color:"#777"}}>&#8212; {p.desc}</span>
                            </div>
                            {p.prix_mois && <div style={{fontSize:13,color:"#555",marginTop:3}}>{(duree==="mois"?p.prix_mois:p.prix_an).toLocaleString("fr-FR")} FCFA/utilisateur/{duree==="mois"?"mois":"mois (factur&#233; annuellement)"}</div>}
                            {!p.prix_mois && <div style={{fontSize:13,color:"#555",marginTop:3}}>Tarif sur devis</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nombre d'utilisateurs */}
              {(typeCompte==="organisation"||typeCompte==="particulier") && planInfo?.prix_mois && (
                <div style={{marginBottom:24}}>
                  <label className="ms-label" style={{fontSize:14,fontWeight:600}}>Pour combien de personnes s&#8217;agit-il ?</label>
                  <div style={{display:"flex",alignItems:"center",gap:16,marginTop:10}}>
                    <input type="range" min="1" max={planInfo.max_users} value={users} onChange={e=>setUsers(+e.target.value)} style={{flex:1,accentColor:"#0067b8"}}/>
                    <div style={{width:60,textAlign:"center"}}>
                      <input type="number" min="1" max={planInfo.max_users} value={users} onChange={e=>setUsers(Math.min(planInfo.max_users,Math.max(1,+e.target.value)))} className="ms-field" style={{textAlign:"center",padding:"6px 8px"}}/>
                    </div>
                    <span style={{fontSize:13,color:"#555",whiteSpace:"nowrap"}}>utilisateur{users>1?"s":""} max. {planInfo.max_users}</span>
                  </div>
                </div>
              )}

              {/* Duree */}
              {(typeCompte==="organisation"||typeCompte==="particulier") && planInfo?.prix_mois && (
                <div style={{marginBottom:24}}>
                  <label className="ms-label" style={{fontSize:14,fontWeight:600}}>Choisir la dur&#233;e de votre abonnement</label>
                  <div style={{display:"flex",gap:12,marginTop:10}}>
                    {[["an","1 an (-20%)"],["mois","1 mois"]].map(([k,l]) => (
                      <div key={k} className={"plan-card"+(duree===k?" sel":"")} style={{flex:1}} onClick={()=>setDuree(k)}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div className={"radio"+(duree===k?" on":"")}/>
                          <span style={{fontSize:14,fontWeight:500}}>{l}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:8}}>
                <button className="ms-btn" onClick={()=>setStep(2)}>Suivant &#8594;</button>
              </div>
            </div>
          )}

          {/* ── ETAPE 2 : COMPTE ── */}
          {step===2 && (
            <div>
              <h2 style={{fontSize:22,fontWeight:400,color:"#1a1a1a",marginBottom:6}}>D&#233;tails de votre compte</h2>
              <p style={{fontSize:14,color:"#555",marginBottom:24}}>Ces informations seront utilis&#233;es pour cr&#233;er votre compte Imoloc.</p>
              <div className="divider"/>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <div>
                  <label className="ms-label">Pr&#233;nom *</label>
                  <input className="ms-field" placeholder="Jean" value={form.prenom} onChange={e=>set("prenom",e.target.value)}/>
                </div>
                <div>
                  <label className="ms-label">Nom *</label>
                  <input className="ms-field" placeholder="Dupont" value={form.nom} onChange={e=>set("nom",e.target.value)}/>
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label className="ms-label">Adresse e-mail professionnelle *</label>
                <input className="ms-field" type="email" placeholder="vous@exemple.com" value={form.email} onChange={e=>set("email",e.target.value)}/>
              </div>
              <div style={{marginBottom:8}}>
                <label className="ms-label">Mot de passe *</label>
                <div style={{position:"relative"}}>
                  <input className="ms-field" type={showPass?"text":"password"} placeholder="8 caract&#232;res minimum" value={form.password} onChange={e=>set("password",e.target.value)} style={{paddingRight:40}}/>
                  <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#666"}}>
                    {showPass
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {form.password && (
                  <div style={{display:"flex",gap:4,marginTop:6}}>
                    {[form.password.length>=8,/[A-Z]/.test(form.password),/[0-9]/.test(form.password)].map((ok,i)=>(
                      <div key={i} className="strength-bar" style={{flex:1,background:ok?"#0067b8":"#e0e0e0"}}/>
                    ))}
                    <span style={{fontSize:11,color:"#777",marginLeft:8}}>
                      {form.password.length>=8&&/[A-Z]/.test(form.password)&&/[0-9]/.test(form.password)?"Fort":form.password.length>=8?"Moyen":"Faible"}
                    </span>
                  </div>
                )}
              </div>
              <div style={{marginBottom:24}}>
                <label className="ms-label">Confirmer le mot de passe *</label>
                <input className="ms-field" type="password" placeholder="R&#233;p&#233;tez le mot de passe" value={form.confirm} onChange={e=>set("confirm",e.target.value)}/>
                {form.confirm && form.confirm!==form.password && <div style={{fontSize:12,color:"#d93025",marginTop:4}}>Les mots de passe ne correspondent pas</div>}
              </div>

              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <button className="ms-btn-out" onClick={()=>setStep(1)}>&#8592; Pr&#233;c&#233;dent</button>
                <button className="ms-btn" onClick={()=>setStep(3)}>Suivant &#8594;</button>
              </div>
            </div>
          )}

          {/* ── ETAPE 3 : CONFIRMER ── */}
          {step===3 && (
            <div>
              <h2 style={{fontSize:22,fontWeight:400,color:"#1a1a1a",marginBottom:6}}>Confirmer et finaliser</h2>
              <p style={{fontSize:14,color:"#555",marginBottom:24}}>V&#233;rifiez les d&#233;tails de votre abonnement avant de commencer votre essai gratuit.</p>
              <div className="divider"/>

              {/* Recap compte */}
              <div style={{background:"#f8f8f8",border:"1px solid #e0e0e0",padding:"16px 20px",marginBottom:20,borderRadius:2}}>
                <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Votre compte</div>
                {[
                  ["Type",TYPES.find(t=>t.id===typeCompte)?.label||typeCompte],
                  ["Pr&#233;nom",form.prenom||"—"],
                  ["Nom",form.nom||"—"],
                  ["E-mail",form.email||"—"],
                ].map(([l,v])=>(
                  <div key={l} style={{display:"flex",gap:16,padding:"5px 0",borderBottom:"1px solid #f0f0f0",fontSize:14}}>
                    <span style={{color:"#777",width:80,flexShrink:0}} dangerouslySetInnerHTML={{__html:l}}/>
                    <span style={{color:"#1a1a1a",fontWeight:500}} dangerouslySetInnerHTML={{__html:v}}/>
                  </div>
                ))}
              </div>

              {/* Avantages essai */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:12}}>Votre essai gratuit d&#8217;1 mois inclut :</div>
                {[
                  "Acc\u00e8s \u00e0 toutes les fonctionnalit\u00e9s du plan s\u00e9lectionn\u00e9",
                  "Ajoutez jusqu\u2019\u00e0 "+planInfo?.max_users+" utilisateurs pendant l\u2019essai",
                  "Paiements Mobile Money (MTN, Moov, Wave)",
                  "Support par e-mail inclus",
                  "Annulation possible \u00e0 tout moment avant le "+trialEndStr,
                ].map((item,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0067b8" strokeWidth="2.5" style={{flexShrink:0,marginTop:1}}><path d="M20 6L9 17l-5-5"/></svg>
                    <span style={{fontSize:13,color:"#444",lineHeight:1.5}}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{fontSize:12,color:"#777",lineHeight:1.7,marginBottom:24,padding:"12px 16px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:2}}>
                L&#8217;essai gratuit se termine le <strong>{trialEndStr}</strong>. Aucun paiement aujourd&#8217;hui. Vous pourrez ajouter un mode de paiement Mobile Money depuis votre tableau de bord apr&#232;s l&#8217;inscription.
              </div>

              <div style={{fontSize:13,color:"#555",marginBottom:20,lineHeight:1.6}}>
                En cr&#233;ant ce compte, vous acceptez les{" "}
                <a href="#" style={{color:"#0067b8",textDecoration:"none"}}>Conditions d&#8217;utilisation</a> et la{" "}
                <a href="#" style={{color:"#0067b8",textDecoration:"none"}}>Politique de confidentialit&#233;</a> d&#8217;Imoloc.
              </div>

              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <button className="ms-btn-out" onClick={()=>setStep(2)}>&#8592; Pr&#233;c&#233;dent</button>
                <button className="ms-btn" onClick={handleFinaliser} disabled={loading} style={{padding:"12px 32px",fontSize:15}}>
                  {loading?"Cr&#233;ation...":"Commencer mon essai gratuit"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — RESUME COMMANDE */}
        <div style={{position:"sticky",top:20}}>
          <div style={{background:"#fff",border:"1px solid #e0e0e0",padding:"24px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>R&#233;sum&#233; de la commande</div>

            <div style={{fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:4}}>Imoloc {planInfo?.nom}</div>
            <div style={{fontSize:12,color:"#777",marginBottom:16,lineHeight:1.5}}>
              Abonnement {duree==="an"?"1 an, factur&#233; annuellement":"mensuel"}{prix?", "+prix.toLocaleString("fr-FR")+" FCFA/utilisateur/mois":""}
            </div>

            <div className="divider" style={{margin:"12px 0"}}/>

            {prix && (
              <>
                <div className="summary-row">
                  <span style={{color:"#555"}}>{users} utilisateur{users>1?"s":""} &#215; {prix.toLocaleString("fr-FR")} FCFA</span>
                  <span style={{fontWeight:500}}>{total?.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="summary-row">
                  <span style={{color:"#555"}}>Essai gratuit (1 mois)</span>
                  <span style={{color:"#10b981",fontWeight:600}}>-{total?.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="divider" style={{margin:"12px 0"}}/>
                <div className="summary-total">
                  <span>Paiement d&#251; aujourd&#8217;hui</span>
                  <span style={{color:"#10b981"}}>0,00 FCFA</span>
                </div>
                <div style={{fontSize:12,color:"#777",marginTop:12,lineHeight:1.6}}>
                  D&#233;tails apr&#232;s la fin de l&#8217;essai le <strong>{trialEndStr}</strong>.<br/>
                  Vous serez factur&#233; {duree==="an"?"annuellement":"mensuellement"} apr&#232;s cette date.
                </div>
              </>
            )}

            {!prix && (
              <div style={{fontSize:13,color:"#555",lineHeight:1.6}}>Contactez-nous pour un devis personnalis&#233; adapt&#233; &#224; vos besoins.</div>
            )}
          </div>

          {/* Points forts */}
          <div style={{marginTop:16,padding:"20px",background:"#fff",border:"1px solid #e0e0e0"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Points forts du produit</div>
            {[
              "G\u00e9rez vos biens depuis n\u2019importe o\u00f9",
              "Paiements Mobile Money int\u00e9gr\u00e9s",
              "Signatures \u00e9lectroniques de baux",
              "Portail locataire inclus",
              "Rapports financiers automatiques",
              "Support d\u00e9di\u00e9 6j/7",
            ].map((item,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0067b8" strokeWidth="2.5" style={{flexShrink:0,marginTop:2}}><path d="M20 6L9 17l-5-5"/></svg>
                <span style={{fontSize:13,color:"#444",lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>
          {/* Deja un compte */}
          <div style={{marginTop:16,padding:"14px 16px",background:"#fff",border:"1px solid #e0e0e0",textAlign:"center"}}>
            <span style={{fontSize:13,color:"#555"}}>D&#233;j&#224; un compte ? </span>
            <Link to="/login" style={{fontSize:13,color:"#0067b8",textDecoration:"none",fontWeight:600}}>Se connecter &#8594;</Link>
          </div>
          {/* Locataire / Proprietaire */}
          <div style={{marginTop:12,padding:"14px 16px",background:"#fff8e1",border:"1px solid #fde68a"}}>
            <div style={{fontSize:12,color:"#777",marginBottom:8}}>Vous &#234;tes locataire ou propri&#233;taire ?</div>
            <div style={{display:"flex",gap:8}}>
              <Link to="/login" style={{fontSize:12,color:"#0067b8",textDecoration:"none",fontWeight:600}}>Acc&#232;s locataire &#8594;</Link>
              <span style={{color:"#ccc"}}>|</span>
              <Link to="/login" style={{fontSize:12,color:"#0067b8",textDecoration:"none",fontWeight:600}}>Acc&#232;s propri&#233;taire &#8594;</Link>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{borderTop:"1px solid #e0e0e0",padding:"16px 24px",display:"flex",justifyContent:"center",gap:24,flexWrap:"wrap",background:"#fff",marginTop:32}}>
        {["Confidentialit&#233; et cookies","Conditions d&#8217;utilisation","Marques","Accessibilit&#233;"].map(l=>(
          <a key={l} href="#" style={{fontSize:12,color:"#666",textDecoration:"none"}} dangerouslySetInnerHTML={{__html:l}}/>
        ))}
        <span style={{fontSize:12,color:"#999"}}>&#169; 2026 Imoloc</span>
      </div>
    </div>
  )
}
