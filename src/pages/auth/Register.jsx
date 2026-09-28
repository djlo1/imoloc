import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"
import Logo from "../../components/Logo"
import PawapayCheckoutModal from "../agence/components/PawapayCheckoutModal"

// Meme correspondance que AbonnementPlan.jsx : plans.code -> valeur enum
// plan_abonnement (abonnements.plan / pawapay_transactions.plan_id).
const CODE_TO_ENUM = { organisation_starter: "starter_o", organisation_business: "business_o" }

const C = {
  blue:"#0067b8", hover:"#005da0", error:"#a4262c",
  bg:"#f3f2f1", text:"#323130", text2:"#605e5c",
  border:"#8a8886", sep:"#e1dfdd", green:"#107c10",
}
const FMT = n => n?.toLocaleString("fr-FR") || "0"

const MODULES = [
  {nom:"Biens",bg:"#0078D4"},{nom:"Baux",bg:"#107c10"},
  {nom:"Paiements",bg:"#d83b01"},{nom:"Locataires",bg:"#8764b8"},
  {nom:"Rapports",bg:"#038387"},{nom:"Loci IA",bg:"#0067b8"},
  {nom:"Maintenance",bg:"#ca5010"},{nom:"Signatures",bg:"#00b294"},
]

function Check({children}) {
  return (
    <div style={{display:"flex",gap:8,marginBottom:9,alignItems:"flex-start"}}>
      <svg width="16" height="16" viewBox="0 0 16 16" style={{flexShrink:0,marginTop:1}}>
        <circle cx="8" cy="8" r="8" fill="#dff6dd"/>
        <path d="M4.5 8l2.5 2.5 5-5" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      </svg>
      <span style={{fontSize:13,color:C.text,lineHeight:1.5}}>{children}</span>
    </div>
  )
}

function Stepper({step}) {
  const labels = ["Abonnement","Connexion","Finalisation"]
  return (
    <div style={{display:"flex",alignItems:"flex-start",marginBottom:32}}>
      {labels.map((l,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
          {i>0 && <div style={{position:"absolute",left:"-50%",right:"50%",top:10,height:2,background:step>i+1?C.blue:C.sep}}/>}
          <div style={{
            width:22,height:22,borderRadius:"50%",zIndex:1,position:"relative",
            background:step>i+1?C.blue:"#fff",
            border:step===i+1?"3px solid "+C.blue:"2px solid "+(step>i+1?C.blue:"#c8c8c8"),
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            {step>i+1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
          </div>
          <span style={{fontSize:11,color:step===i+1?C.text:C.text2,fontWeight:step===i+1?600:400,marginTop:6,textAlign:"center",lineHeight:1.3}}>{l}</span>
        </div>
      ))}
    </div>
  )
}

function Field({label,type="text",value,onChange,error,placeholder,autoFocus,disabled,right}) {
  const [foc,setFoc]=useState(false)
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:error?C.error:C.text2,marginBottom:4}}
        dangerouslySetInnerHTML={{__html:label}}/>}
      <div style={{position:"relative"}}>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder||""} autoFocus={!!autoFocus} disabled={!!disabled}
          onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
          style={{
            width:"100%",padding:"8px 10px",paddingRight:right?72:10,
            border:error?"2px solid "+C.error:foc?"2px solid "+C.text:"1px solid "+C.border,
            borderRadius:2,fontSize:14,fontFamily:"inherit",color:C.text,
            background:disabled?"#f3f2f1":"#fff",outline:"none",boxSizing:"border-box",
          }}/>
        {right&&<div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)"}}>{right}</div>}
      </div>
      {error&&<div style={{fontSize:12,color:C.error,marginTop:3}}>{error}</div>}
    </div>
  )
}

function Btn({children,onClick,disabled,outline,style={}}) {
  const [h,setH]=useState(false)
  return (
    <button onClick={onClick} disabled={!!disabled}
      onMouseOver={()=>setH(true)} onMouseOut={()=>setH(false)}
      style={{
        padding:"8px 20px",borderRadius:2,fontSize:14,fontFamily:"inherit",fontWeight:outline?400:600,
        cursor:disabled?"default":"pointer",transition:"background .15s",border:"none",
        background:outline?"#fff":(disabled?"#c8c8c8":h?C.hover:C.blue),
        color:outline?C.text:"#fff",
        ...(outline?{border:"1px solid "+C.border}:{}),
        ...style
      }}>{children}</button>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [plan, setPlan] = useState("organisation_business")
  const [duree, setDuree] = useState("mois")
  const [freq, setFreq] = useState("mensuel")
  const [mode, setMode] = useState("essai") // "essai" (1 mois gratuit) | "payer" (paiement immediat)
  const [nombreLicences, setNombreLicences] = useState(1)
  const [plansCatalogue, setPlansCatalogue] = useState([])
  const [email, setEmail] = useState("")
  const [emailErr, setEmailErr] = useState("")
  const [subStep, setSubStep] = useState(1)
  const [nomAgence, setNomAgence] = useState("")
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [pwd, setPwd] = useState("")
  const [pwd2, setPwd2] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [agenceCreee, setAgenceCreee] = useState(null)
  const [showPay, setShowPay] = useState(false)

  // Vrai catalogue (remplace l ancien objet PLANS code en dur) : prix reels
  // et nombre de licences Imoloc Manager incluses par palier (plans_licences).
  useEffect(() => {
    (async () => {
      const { data: plans } = await supabase.from("plans")
        .select("id, code, nom, prix_mensuel, prix_mensuel_annuel, cout_utilisateur_supplementaire, quota_biens, quota_proprietaires, quota_stockage_go")
        .in("code", ["organisation_starter", "organisation_business"]).order("ordre_affichage")
      const { data: licenceManager } = await supabase.from("licences").select("id").eq("type", "imoloc_standard").maybeSingle()
      let inclusMap = {}
      if (licenceManager?.id && plans?.length) {
        const { data: pl } = await supabase.from("plans_licences").select("plan_id, licences_incluses")
          .eq("licence_id", licenceManager.id).in("plan_id", plans.map(x => x.id))
        ;(pl || []).forEach(r => { inclusMap[r.plan_id] = r.licences_incluses })
      }
      setPlansCatalogue((plans || []).map(x => ({ ...x, licences_incluses_manager: inclusMap[x.id] ?? 1 })))
    })()
  }, [])

  const p = plansCatalogue.find(x => x.code === plan) || { nom: plan === "organisation_starter" ? "Starter" : "Business", prix_mensuel: 0, prix_mensuel_annuel: 0, licences_incluses_manager: 1, cout_utilisateur_supplementaire: 0 }
  const seatsInclus = p.licences_incluses_manager || 1
  useEffect(() => { setNombreLicences(seatsInclus) }, [plan, seatsInclus])
  const extraSeats = Math.max(0, nombreLicences - seatsInclus)
  const prixBase = duree === "an" ? p.prix_mensuel_annuel : p.prix_mensuel
  const pu = Number(prixBase || 0) + extraSeats * Number(p.cout_utilisateur_supplementaire || 0)
  const total = pu
  const trial = new Date(); trial.setMonth(trial.getMonth()+1)
  const trialStr = trial.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})

  // Page publique - pas de redirect auto

  const goStep2 = () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if(!email) {setEmailErr("Cela est obligatoire");return}
    if(!re.test(email)) {setEmailErr("Adresse e-mail invalide");return}
    setEmailErr("")
    setSubStep(2)
  }

  const finaliser = async () => {
    if(!prenom.trim()||!nom.trim()){toast.error("Pr\u00e9nom et nom requis");return}
    if(!nomAgence.trim()){toast.error("Nom de l'agence requis");return}
    if(pwd.length<8){toast.error("Mot de passe : 8 caract\u00e8res minimum");return}
    if(pwd!==pwd2){toast.error("Les mots de passe ne correspondent pas");return}
    setLoading(true)
    await supabase.auth.signOut()
    const {data,error} = await supabase.auth.signUp({
      email, password:pwd,
      options:{data:{prenom:prenom.trim(),nom:nom.trim(),role:"global_admin",type_compte:"organisation"}},
    })
    if(error){
      toast.error(error.message)
      setLoading(false)
      return
    }
    if(!data?.user?.identities?.length){
      toast.error("Ce compte existe d\u00e9j\u00e0.")
      setTimeout(()=>navigate("/login"),2500)
      setLoading(false)
      return
    }

    const { data:agence, error:agErr } = await supabase.from("agences").insert({
      nom: nomAgence.trim(),
      email,
      profile_id: data.user.id,
    }).select().single()

    if(agErr){
      toast.error("Compte cr\u00e9\u00e9, mais erreur agence : "+agErr.message)
      setLoading(false)
      return
    }

    if (mode === "essai") {
      const { error:trialErr } = await supabase.functions.invoke("create-trial", {
        body: { agence_id: agence.id, plan: CODE_TO_ENUM[plan], prix_mensuel: p.prix_mensuel, prix_annuel: p.prix_mensuel_annuel, nombre_licences: nombreLicences },
      })
      if(trialErr) console.error("Trial creation error:", trialErr)
      setLoading(false)
      setSuccess(true)
    } else {
      // Paiement immediat : le succes n est declare qu une fois le paiement confirme.
      setAgenceCreee(agence)
      setLoading(false)
      setShowPay(true)
    }
  }

  const RightPanel = () => (
    <div style={{background:"#faf9f8",padding:"32px 24px",display:"flex",flexDirection:"column",borderLeft:"1px solid "+C.sep}}>
      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{p.nom} &mdash; {mode==="essai"?"Essai":"Abonnement"}</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>{mode==="essai"?"Inscription à votre essai gratuit":"Souscription immediate"}</div>
      <Check><strong>{nombreLicences} licence(s)</strong> Imoloc Manager ({seatsInclus} incluse(s) dans ce plan)</Check>
      <Check>Toutes les fonctionnalit&eacute;s du produit payant incluses</Check>
      {mode==="essai" ? (
        <>
          <Check><strong>Aucun paiement</strong> requis pour commencer</Check>
          <Check>Facturation automatique apr&egrave;s le <strong>{trialStr}</strong></Check>
        </>
      ) : (
        <Check>Paiement <strong>Mobile Money</strong> s&eacute;curis&eacute;</Check>
      )}
      <div style={{height:1,background:C.sep,margin:"16px 0"}}/>
      <div style={{background:C.bg,padding:12,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>R&eacute;sum&eacute; de la commande</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
          <span style={{color:C.text2}}>{p.nom} &mdash; {nombreLicences} licence(s)</span>
          <span style={{fontWeight:600,color:C.text}}>{FMT(total)} FCFA</span>
        </div>
        {mode==="essai" && (
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
            <span style={{color:C.text2}}>Essai gratuit</span>
            <span style={{color:C.green,fontWeight:600}}>&minus;{FMT(total)} FCFA</span>
          </div>
        )}
        <div style={{borderTop:"1px solid "+C.sep,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}>
          <span>D&ucirc; aujourd&apos;hui</span>
          <span>{mode==="essai"?"0,00":FMT(total)} FCFA</span>
        </div>
      </div>
      <div style={{height:1,background:C.sep,margin:"0 0 16px"}}/>
      <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:10}}>Points forts du produit</div>
      <Check>G&eacute;rez vos biens depuis n&apos;importe quel appareil</Check>
      <Check>Paiements <strong>Mobile Money</strong> natifs inclus</Check>
      <Check>Signatures &eacute;lectroniques et portail locataire</Check>
      <div style={{height:1,background:C.sep,margin:"16px 0"}}/>
      <div style={{fontSize:11,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Modules inclus</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {MODULES.map(m=>(
          <div key={m.nom} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:36,height:36,borderRadius:6,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{m.nom[0]}</span>
            </div>
            <span style={{fontSize:10,color:C.text2,textAlign:"center"}}>{m.nom}</span>
          </div>
        ))}
      </div>
      <div style={{marginTop:"auto",paddingTop:16,borderTop:"1px solid "+C.sep}}>
        <div style={{fontSize:12,color:C.text2}}>D&eacute;j&agrave; un compte ? <Link to="/login" style={{fontSize:12,color:C.blue}}>Se connecter</Link></div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI','Helvetica Neue',sans-serif",color:C.text}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}a{color:${C.blue};text-decoration:none}a:hover{text-decoration:underline}@keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:860px){
          .reg-grid{grid-template-columns:1fr!important}
          .reg-form-pad{padding:24px 20px!important}
          .reg-2col{grid-template-columns:1fr!important}
        }
      `}</style>

      <div style={{background:"#fff",borderBottom:"1px solid "+C.sep,padding:"11px 32px"}}>
        <Link to="/" style={{display:"flex",alignItems:"center",textDecoration:"none"}}>
          <Logo size={26} textSize={14} gap={8} />
        </Link>
      </div>

      <div style={{textAlign:"center",padding:"28px 20px 0"}}>
        <h1 style={{fontSize:26,fontWeight:600,color:C.text,marginBottom:6}}>{p.nom} &mdash; {mode==="essai"?"Essai":"Abonnement"}</h1>
        <p style={{fontSize:14,color:C.text2}}>{mode==="essai"?"Un mois gratuit — aucun paiement requis aujourd’hui":"Paiement Mobile Money — activation immediate"}</p>
      </div>

      <div style={{maxWidth:1100,margin:"24px auto 48px",padding:"0 20px"}}>
        <div className="reg-grid" style={{background:"#fff",borderRadius:2,boxShadow:"0 1.6px 3.6px rgba(0,0,0,0.13),0 0.3px 0.9px rgba(0,0,0,0.11)",border:"1px solid "+C.sep,display:"grid",gridTemplateColumns:"1fr 320px",overflow:"hidden"}}>

          <div className="reg-form-pad" style={{padding:"36px 40px"}}>

            {/* SUCCES */}
            {success && (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{width:72,height:72,borderRadius:"50%",background:"#dff6dd",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:10}}>{mode==="essai"?"Votre essai est activé !":"Votre abonnement est actif !"}</h2>
                <p style={{fontSize:14,color:C.text2,lineHeight:1.7,marginBottom:6}}>
                  Bienvenue <strong style={{color:C.text}}>{prenom} {nom}</strong> !
                </p>
                <p style={{fontSize:13,color:C.text2,lineHeight:1.7,marginBottom:28}}>
                  Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec <strong>{email}</strong>.<br/>
                  {mode==="essai" ? <>Essai gratuit actif jusqu&apos;au <strong>{trialStr}</strong>.</> : <>Abonnement {p.nom} actif avec <strong>{nombreLicences} licence(s)</strong>.</>}
                </p>
                <Btn onClick={()=>navigate("/agence")} style={{padding:"10px 32px",fontSize:15}}>
                  Acc&eacute;der &agrave; mon espace &rarr;
                </Btn>
                <div style={{marginTop:12,fontSize:12,color:C.text2}}>Un email de confirmation a &eacute;t&eacute; envoy&eacute; &agrave; {email}</div>
              </div>
            )}

            {/* STEP 1 */}
            {!success && step===1 && (
              <div>
                <Stepper step={1}/>
                <h2 style={{fontSize:22,fontWeight:600,color:C.text,marginBottom:8}}>Configurez votre abonnement</h2>
                <p style={{fontSize:13,color:C.text2,marginBottom:28,lineHeight:1.65}}>Choisissez un plan, un nombre de licences, puis un essai gratuit ou un paiement immediat.</p>

                <div style={{marginBottom:22}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Plan</div>
                  {[
                    {code:"organisation_starter",desc:"Pour les petites agences"},
                    {code:"organisation_business",desc:"Pour les agences en croissance",rec:true},
                  ].map(o=>{
                    const info = plansCatalogue.find(x=>x.code===o.code)
                    return (
                    <label key={o.code} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"8px 0",borderBottom:"1px solid "+C.sep}}>
                      <input type="radio" name="plan" checked={plan===o.code} onChange={()=>setPlan(o.code)}
                        style={{width:16,height:16,accentColor:C.blue,flexShrink:0,marginTop:2,cursor:"pointer"}}/>
                      <div>
                        <span style={{fontSize:14,color:C.text}}>{info?.nom || o.code}</span>
                        {o.rec&&<span style={{marginLeft:8,fontSize:11,color:C.blue,fontWeight:600,padding:"1px 6px",border:"1px solid "+C.blue,borderRadius:2}}>Recommand&eacute;</span>}
                        <div style={{fontSize:12,color:C.text2,marginTop:2}}>{o.desc} &mdash; {info?.licences_incluses_manager ?? 1} licence(s) incluse(s) &mdash; {FMT(duree==="an"?info?.prix_mensuel_annuel:info?.prix_mensuel)} FCFA/mois</div>
                      </div>
                    </label>
                  )})}
                </div>

                <div style={{marginBottom:22}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Nombre de licences Imoloc Manager</div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <button type="button" onClick={()=>setNombreLicences(n=>Math.max(seatsInclus,n-1))}
                      style={{width:30,height:30,border:"1px solid "+C.border,background:"#fff",borderRadius:2,cursor:"pointer",fontSize:16,color:C.text}}>&minus;</button>
                    <span style={{fontSize:16,fontWeight:600,color:C.text,minWidth:28,textAlign:"center"}}>{nombreLicences}</span>
                    <button type="button" onClick={()=>setNombreLicences(n=>n+1)}
                      style={{width:30,height:30,border:"1px solid "+C.border,background:"#fff",borderRadius:2,cursor:"pointer",fontSize:16,color:C.text}}>+</button>
                    <span style={{fontSize:12,color:C.text2}}>{seatsInclus} incluse(s), {FMT(p.cout_utilisateur_supplementaire)} FCFA/mois par licence suppl&eacute;mentaire</span>
                  </div>
                </div>

                <div style={{marginBottom:22}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Dur&eacute;e</div>
                  {[["an","1 an","&Eacute;conomisez 20%"],["mois","1 mois",""]].map(([v,l,s])=>(
                    <label key={v} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:8}}>
                      <input type="radio" name="duree" checked={duree===v} onChange={()=>{setDuree(v);setFreq(v==="an"?"annuel":"mensuel")}}
                        style={{width:16,height:16,accentColor:C.blue,cursor:"pointer"}}/>
                      <span style={{fontSize:14,color:C.text}}>{l}</span>
                      {s&&<span style={{fontSize:12,color:C.green,fontWeight:600}} dangerouslySetInnerHTML={{__html:s}}/>}
                    </label>
                  ))}
                </div>

                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Comment souhaitez-vous commencer ?</div>
                  {[["essai","Essai gratuit (1 mois)","Aucun paiement aujourd’hui, facturation automatique à la fin de l’essai"],["payer","Payer maintenant","Paiement Mobile Money, abonnement actif immédiatement"]].map(([v,l,s])=>(
                    <label key={v} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"8px 0",borderBottom:"1px solid "+C.sep}}>
                      <input type="radio" name="mode" checked={mode===v} onChange={()=>setMode(v)}
                        style={{width:16,height:16,accentColor:C.blue,flexShrink:0,marginTop:2,cursor:"pointer"}}/>
                      <div>
                        <span style={{fontSize:14,color:C.text}}>{l}</span>
                        <div style={{fontSize:12,color:C.text2,marginTop:2}}>{s}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{borderTop:"1px solid "+C.sep,paddingTop:18,marginBottom:18}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>R&eacute;sum&eacute; de la commande</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                    <span style={{color:C.text2}}>{p.nom} &mdash; {nombreLicences} licence(s)</span>
                    <span style={{fontWeight:600}}>{FMT(total)} FCFA</span>
                  </div>
                  {mode==="essai" && (
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6,color:C.green}}>
                      <span>Essai gratuit (1 mois)</span>
                      <span style={{fontWeight:600}}>&minus;{FMT(total)} FCFA</span>
                    </div>
                  )}
                  <div style={{borderTop:"1px solid "+C.sep,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}>
                    <span>Paiement d&ucirc; aujourd&apos;hui (hors taxes)</span>
                    <span>{mode==="essai"?"0,00":FMT(total)} FCFA</span>
                  </div>
                  {mode==="essai" && (
                    <p style={{fontSize:11,color:C.text2,marginTop:10,lineHeight:1.6}}>
                      Une fois l&apos;essai termin&eacute;, une demande de paiement pour {nombreLicences} licence(s) vous sera envoy&eacute;e, avec 15 jours pour r&eacute;gler avant suspension.
                    </p>
                  )}
                </div>

                <Btn onClick={()=>setStep(2)}>Suivant</Btn>
              </div>
            )}

            {/* STEP 2 */}
            {!success && step===2 && (
              <div>
                <Stepper step={2}/>

                {subStep===1 && (
                  <div>
                    <h2 style={{fontSize:22,fontWeight:600,color:C.text,marginBottom:8}}>Nous allons vous aider &agrave; d&eacute;marrer</h2>
                    <p style={{fontSize:13,color:C.text2,marginBottom:28,lineHeight:1.65}}>Entrez votre adresse e-mail pour cr&eacute;er votre compte Imoloc.</p>
                    <Field label="Adresse e-mail professionnelle *" type="email" value={email}
                      onChange={e=>{setEmail(e.target.value);setEmailErr("")}} error={emailErr} autoFocus placeholder="vous@agence.com"/>
                    <div style={{fontSize:12,color:C.text2,marginBottom:24}}>D&eacute;j&agrave; un compte ? <Link to="/login">Se connecter</Link></div>
                    <div style={{display:"flex",gap:12}}>
                      <Btn outline onClick={()=>setStep(1)}>Pr&eacute;c&eacute;dent</Btn>
                      <Btn onClick={goStep2}>Suivant</Btn>
                    </div>
                  </div>
                )}

                {subStep===2 && (
                  <div>
                    <h2 style={{fontSize:22,fontWeight:600,color:C.text,marginBottom:8}}>Nous allons vous aider &agrave; d&eacute;marrer</h2>
                    <p style={{fontSize:13,color:C.text2,marginBottom:20,lineHeight:1.65}}>
                      Continuez en tant que <strong style={{color:C.text}}>{email}</strong>
                    </p>
                    <div style={{display:"flex",gap:12}}>
                      <Btn onClick={()=>setStep(3)}>Configurer le compte</Btn>
                      <Btn outline onClick={()=>{setSubStep(1);setEmail("")}}>Modifier mon adresse e-mail</Btn>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {!success && step===3 && (
              <div>
                <Stepper step={3}/>
                <h2 style={{fontSize:22,fontWeight:600,color:C.text,marginBottom:8}}>Compl&eacute;tez votre profil</h2>
                <p style={{fontSize:13,color:C.text2,marginBottom:28}}>
                  Compte : <strong>{email}</strong>
                </p>
                <Field label="Nom de l&apos;agence *" value={nomAgence} onChange={e=>setNomAgence(e.target.value)} autoFocus placeholder="Mon agence immobili&egrave;re"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <Field label="Pr&eacute;nom *" value={prenom} onChange={e=>setPrenom(e.target.value)} placeholder="Jean"/>
                  <Field label="Nom *" value={nom} onChange={e=>setNom(e.target.value)} placeholder="Dupont"/>
                </div>
                <Field label="Mot de passe * (8 caract&egrave;res minimum)" type={showPwd?"text":"password"} value={pwd}
                  onChange={e=>setPwd(e.target.value)} placeholder="Minimum 8 caract&egrave;res"
                  right={<button type="button" onClick={()=>setShowPwd(!showPwd)}
                    style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:12,fontFamily:"inherit"}}>{showPwd?"Masquer":"Afficher"}</button>}/>
                {pwd&&(
                  <div style={{display:"flex",gap:4,marginBottom:14,alignItems:"center"}}>
                    {[pwd.length>=8,/[A-Z]/.test(pwd),/[0-9]/.test(pwd)].map((ok,i)=>(
                      <div key={i} style={{flex:1,height:3,background:ok?(i>1?C.green:C.blue):"#e0e0e0",borderRadius:2,transition:"background .25s"}}/>
                    ))}
                    <span style={{fontSize:11,color:C.text2,marginLeft:6,whiteSpace:"nowrap"}}>
                      {[pwd.length>=8,/[A-Z]/.test(pwd),/[0-9]/.test(pwd)].filter(Boolean).length>=3?"Solide":pwd.length>=8?"Moyen":"Faible"}
                    </span>
                  </div>
                )}
                <Field label="Confirmer le mot de passe *" type="password" value={pwd2}
                  onChange={e=>setPwd2(e.target.value)} placeholder="R&eacute;p&eacute;tez le mot de passe"
                  error={pwd2&&pwd2!==pwd?"Les mots de passe ne correspondent pas":""}/>
                <p style={{fontSize:11,color:C.text2,lineHeight:1.7,marginBottom:24}}>
                  En cr&eacute;ant ce compte, vous acceptez les <a href="#" style={{fontSize:11}}>conditions d&apos;utilisation</a> et la <a href="#" style={{fontSize:11}}>politique de confidentialit&eacute;</a>.
                </p>
                <div style={{display:"flex",gap:12}}>
                  <Btn outline onClick={()=>setStep(2)}>Pr&eacute;c&eacute;dent</Btn>
                  <Btn onClick={finaliser} disabled={loading} style={{padding:"9px 28px"}}>
                    {loading?<span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTop:"2px solid #fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.75s linear infinite"}}/>Cr&eacute;ation...</span>:(mode==="essai"?"Commencer mon essai gratuit":"Cr\u00e9er le compte et payer")}
                  </Btn>
                </div>
              </div>
            )}
          </div>

          <RightPanel/>
        </div>
      </div>

      <div style={{borderTop:"1px solid "+C.sep,padding:"10px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,background:C.bg}}>
        <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
          {["Confidentialit\u00e9","Conditions d\u2019utilisation","Accessibilit\u00e9"].map(l=>(
            <a key={l} href="#" style={{fontSize:11,color:C.text2}}>{l}</a>
          ))}
        </div>
        <span style={{fontSize:11,color:C.text2}}>&copy; 2026 Imoloc</span>
      </div>

      <PawapayCheckoutModal
        open={showPay}
        planNom={p.nom}
        planCode={CODE_TO_ENUM[plan]}
        montant={total}
        periode={duree==="an"?"annuel":"mensuel"}
        nombreLicences={nombreLicences}
        agenceId={agenceCreee?.id}
        onClose={()=>setShowPay(false)}
        onSuccess={()=>{ setShowPay(false); setSuccess(true) }}
      />
    </div>
  )
}
