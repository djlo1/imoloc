import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

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
  const [plan, setPlan] = useState("business")
  const [duree, setDuree] = useState("mois")
  const [freq, setFreq] = useState("mensuel")
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

  const PLANS = {
    starter:{id:"starter_o",nom:"Starter",mois:18000,an:15000,usersMax:3},
    business:{id:"business_o",nom:"Business",mois:39000,an:32400,usersMax:10},
  }
  const p = PLANS[plan]
  const pu = duree==="an"?p.an:p.mois
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

    const { error:trialErr } = await supabase.functions.invoke("create-trial", {
      body: { agence_id: agence.id, plan: p.id, prix_mensuel: p.mois, prix_annuel: p.an },
    })
    if(trialErr) console.error("Trial creation error:", trialErr)

    setLoading(false)
    setSuccess(true)
  }

  const RightPanel = () => (
    <div style={{background:"#faf9f8",padding:"32px 24px",display:"flex",flexDirection:"column",borderLeft:"1px solid "+C.sep}}>
      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>Imoloc {p.nom} &mdash; Essai</div>
      <div style={{fontSize:12,color:C.text2,marginBottom:16}}>Inscription &agrave; votre essai gratuit</div>
      <Check>Jusqu&apos;&agrave; <strong>{p.usersMax} utilisateurs</strong> inclus dans ce plan</Check>
      <Check>Toutes les fonctionnalit&eacute;s du produit payant incluses</Check>
      <Check><strong>Aucun paiement</strong> requis pour commencer</Check>
      <Check>Annulation possible avant le <strong>{trialStr}</strong></Check>
      <div style={{height:1,background:C.sep,margin:"16px 0"}}/>
      <div style={{background:C.bg,padding:12,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>R&eacute;sum&eacute; de la commande</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
          <span style={{color:C.text2}}>Imoloc {p.nom}</span>
          <span style={{fontWeight:600,color:C.text}}>{FMT(total)} FCFA</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
          <span style={{color:C.text2}}>Essai gratuit</span>
          <span style={{color:C.green,fontWeight:600}}>&minus;{FMT(total)} FCFA</span>
        </div>
        <div style={{borderTop:"1px solid "+C.sep,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}>
          <span>D&ucirc; aujourd&apos;hui</span>
          <span>0,00 FCFA</span>
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
      <style>{`*{box-sizing:border-box;margin:0;padding:0}a{color:${C.blue};text-decoration:none}a:hover{text-decoration:underline}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{background:"#fff",borderBottom:"1px solid "+C.sep,padding:"11px 32px"}}>
        <Link to="/" style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:26,height:26,background:C.blue,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>Imoloc</span>
        </Link>
      </div>

      <div style={{textAlign:"center",padding:"28px 20px 0"}}>
        <h1 style={{fontSize:26,fontWeight:600,color:C.text,marginBottom:6}}>Imoloc {p.nom} &mdash; Essai</h1>
        <p style={{fontSize:14,color:C.text2}}>Un mois gratuit &mdash; aucun paiement requis aujourd&apos;hui</p>
      </div>

      <div style={{maxWidth:1100,margin:"24px auto 48px",padding:"0 20px"}}>
        <div style={{background:"#fff",borderRadius:2,boxShadow:"0 1.6px 3.6px rgba(0,0,0,0.13),0 0.3px 0.9px rgba(0,0,0,0.11)",border:"1px solid "+C.sep,display:"grid",gridTemplateColumns:"1fr 320px",overflow:"hidden"}}>

          <div style={{padding:"36px 40px"}}>

            {/* SUCCES */}
            {success && (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <div style={{width:72,height:72,borderRadius:"50%",background:"#dff6dd",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h2 style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:10}}>Votre essai est activ&eacute; !</h2>
                <p style={{fontSize:14,color:C.text2,lineHeight:1.7,marginBottom:6}}>
                  Bienvenue <strong style={{color:C.text}}>{prenom} {nom}</strong> !
                </p>
                <p style={{fontSize:13,color:C.text2,lineHeight:1.7,marginBottom:28}}>
                  Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec <strong>{email}</strong>.<br/>
                  Essai gratuit actif jusqu&apos;au <strong>{trialStr}</strong>.
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
                <h2 style={{fontSize:22,fontWeight:600,color:C.text,marginBottom:8}}>Essayer gratuitement pendant un mois</h2>
                <p style={{fontSize:13,color:C.text2,marginBottom:28,lineHeight:1.65}}>Configurez votre abonnement.</p>

                <div style={{marginBottom:22}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Plan</div>
                  {[
                    {id:"starter",label:"Imoloc Starter",desc:"Pour les petites agences",usersMax:3},
                    {id:"business",label:"Imoloc Business",desc:"Pour les agences en croissance",rec:true,usersMax:10},
                  ].map(o=>(
                    <label key={o.id} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"8px 0",borderBottom:"1px solid "+C.sep}}>
                      <input type="radio" name="plan" checked={plan===o.id} onChange={()=>setPlan(o.id)}
                        style={{width:16,height:16,accentColor:C.blue,flexShrink:0,marginTop:2,cursor:"pointer"}}/>
                      <div>
                        <span style={{fontSize:14,color:C.text}}>{o.label}</span>
                        {o.rec&&<span style={{marginLeft:8,fontSize:11,color:C.blue,fontWeight:600,padding:"1px 6px",border:"1px solid "+C.blue,borderRadius:2}}>Recommand&eacute;</span>}
                        <div style={{fontSize:12,color:C.text2,marginTop:2}}>{o.desc} &mdash; {o.usersMax} utilisateurs inclus &mdash; {FMT(duree==="an"?(o.id==="starter"?15000:32400):(o.id==="starter"?18000:39000))} FCFA/mois</div>
                      </div>
                    </label>
                  ))}
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
                  <div style={{fontSize:12,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Fr&eacute;quence de facturation</div>
                  <div style={{position:"relative",display:"inline-block",minWidth:280}}>
                    <select value={freq} onChange={e=>setFreq(e.target.value)}
                      style={{width:"100%",padding:"7px 30px 7px 10px",border:"1px solid "+C.border,borderRadius:2,background:"#fff",fontSize:14,fontFamily:"inherit",color:C.text,outline:"none",cursor:"pointer",appearance:"none"}}>
                      <option value="mensuel">Tous les mois &mdash; {FMT(pu)} FCFA/mois</option>
                      <option value="annuel">Une fois par an &mdash; {FMT(pu*12)} FCFA/an</option>
                    </select>
                    <svg style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>

                <div style={{borderTop:"1px solid "+C.sep,paddingTop:18,marginBottom:18}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>R&eacute;sum&eacute; de la commande</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                    <span style={{color:C.text2}}>Imoloc {p.nom} &mdash; {p.usersMax} utilisateurs inclus</span>
                    <span style={{fontWeight:600}}>{FMT(total)} FCFA</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6,color:C.green}}>
                    <span>Essai gratuit (1 mois)</span>
                    <span style={{fontWeight:600}}>&minus;{FMT(total)} FCFA</span>
                  </div>
                  <div style={{borderTop:"1px solid "+C.sep,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:14}}>
                    <span>Paiement d&ucirc; aujourd&apos;hui (hors taxes)</span>
                    <span>0,00 FCFA</span>
                  </div>
                  <p style={{fontSize:11,color:C.text2,marginTop:10,lineHeight:1.6}}>
                    Une fois l&apos;essai termin&eacute;, votre abonnement devient payant sauf annulation avant le {trialStr}.{" "}
                    <a href="#" style={{fontSize:11}}>En savoir plus</a>
                  </p>
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
                    {loading?<span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTop:"2px solid #fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.75s linear infinite"}}/>Cr&eacute;ation...</span>:"Commencer mon essai gratuit"}
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
    </div>
  )
}
