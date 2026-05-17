import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"

/* ── LOGO ── */
const Logo = () => (
  <div style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none"}}>
    <div style={{width:32,height:32,background:"#0078d4",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,120,212,0.3)"}}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
    <div>
      <div style={{fontSize:16,fontWeight:700,color:"#1a1a1a",letterSpacing:"-0.02em",lineHeight:1}}>Imoloc</div>
      <div style={{fontSize:10,color:"#888",letterSpacing:"0.05em",lineHeight:1,marginTop:2}}>GESTION IMMOBILI&#200;RE</div>
    </div>
  </div>
)

/* ── ICONS ── */
const Chev = ({open,size=12,color="currentColor"}) => (
  <svg style={{transition:"transform 0.2s",transform:open?"rotate(180deg)":"none",flexShrink:0}} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
)
const Arrow = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
)
const Check = ({color="#0078d4"}) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
)

/* ── DATA ── */
const MEGA_PRODUITS = [
  { titre:"Pour les agences", items:[
    {label:"Centre d&#8217;administration", desc:"Tableau de bord complet", path:"/agence"},
    {label:"Gestion des utilisateurs", desc:"R&#244;les et permissions", path:"/agence/utilisateurs"},
    {label:"Rapports avanc&#233;s", desc:"Analyses et statistiques", path:"/agence/rapports"},
    {label:"Facturation", desc:"Abonnements et paiements", path:"/agence/abonnement"},
  ]},
  { titre:"Pour les propri&#233;taires", items:[
    {label:"Espace propri&#233;taire", desc:"Vos biens et revenus", path:"/proprietaire"},
    {label:"Baux et contrats", desc:"G&#233;n&#233;rez vos baux", path:"/agence/baux"},
    {label:"Suivi des paiements", desc:"Loyers et quittances", path:"/agence/paiements"},
  ]},
  { titre:"Pour les locataires", items:[
    {label:"Portail locataire", desc:"Votre espace personnel", path:"/locataire"},
    {label:"Application mobile", desc:"iOS et Android", path:"/"},
    {label:"Signalements", desc:"Suivi en temps r&#233;el", path:"/locataire"},
  ]},
  { titre:"Applications", items:[
    {label:"Loci IA", desc:"Assistant immobilier intelligent", path:"/agence"},
    {label:"Int&#233;grations", desc:"FedaPay, PawaPay, et plus", path:"/"},
    {label:"API Imoloc", desc:"Connectez vos outils", path:"/"},
  ]},
]

const FEAT_TABS = [
  {id:"gestion", label:"Gestion simplifi&#233;e"},
  {id:"mobile", label:"Application mobile"},
  {id:"integrations", label:"Applications int&#233;gr&#233;es"},
  {id:"ressources", label:"Ressources"},
]

const ACCORDIONS = [
  {titre:"Am&#233;liorez l&#8217;efficacit&#233; au quotidien",
   desc:"Acc&#233;dez &#224; une bo&#238;te &#224; outils compl&#232;te qui permet de configurer, g&#233;rer et surveiller vos biens, locataires et paiements depuis n&#8217;importe o&#249;.",
   bg:"linear-gradient(135deg,#e8f4ff,#dbeafe)", accent:"#0078d4"},
  {titre:"La gestion depuis n&#8217;importe o&#249;",
   desc:"Imoloc est con&#231;u pour fonctionner sur tous les appareils. Votre &#233;quipe peut g&#233;rer les biens depuis leur t&#233;l&#233;phone, tablette ou ordinateur.",
   bg:"linear-gradient(135deg,#f0fdf4,#dcfce7)", accent:"#10b981"},
  {titre:"S&#233;curit&#233; et conformit&#233; int&#233;gr&#233;es",
   desc:"Prot&#233;gez les donn&#233;es de vos locataires avec un chiffrement de bout en bout et des contr&#244;les d&#8217;acc&#232;s granulaires.",
   bg:"linear-gradient(135deg,#fdf4ff,#f3e8ff)", accent:"#8b5cf6"},
]

const INTEGRATIONS = [
  {nom:"MTN MoMo", color:"#f59e0b"},
  {nom:"Moov Money", color:"#0078d4"},
  {nom:"Wave", color:"#10b981"},
  {nom:"Orange Money", color:"#f97316"},
  {nom:"PawaPay", color:"#6c63ff"},
]

const RESSOURCES = [
  {cat:"Communaut&#233; technique",
   titre:"D&#233;veloppez vos comp&#233;tences",
   desc:"&#201;changez avec des experts dans notre communaut&#233; num&#233;rique gratuite.",
   btn:"Inscrivez-vous aujourd&#8217;hui",
   img:"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&q=80"},
  {cat:"Documentation technique",
   titre:"Consultez les ressources techniques",
   desc:"Ressources destin&#233;es aux d&#233;veloppeurs et administrateurs Imoloc.",
   btn:"En savoir plus",
   img:"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&q=80"},
  {cat:"Roadmap publique",
   titre:"D&#233;couvrez les derni&#232;res nouveaut&#233;s",
   desc:"Les nouvelles fonctionnalit&#233;s et mises &#224; jour de la plateforme.",
   btn:"Restez inform&#233;",
   img:"https://images.unsplash.com/photo-1560472355-536de3962603?w=500&q=80"},
  {cat:"Ressources utilisateurs",
   titre:"Aidez-vous, tirez le meilleur d&#8217;Imoloc",
   desc:"Guides pratiques, tutoriels vid&#233;o et base de connaissances.",
   btn:"Afficher les ressources",
   img:"https://images.unsplash.com/photo-1553484771-371a605b060b?w=500&q=80"},
]

const PLANS = [
  {nom:"Starter", color:"#0078d4", prix_mois:18000, prix_an:15000, desc:"Pour les petites agences",
   features:["50 biens","3 utilisateurs","Baux et contrats","Paiements Mobile Money","Support email"]},
  {nom:"Business", color:"#6c63ff", prix_mois:39000, prix_an:32000, desc:"Pour les agences en croissance", pop:true,
   features:["500 biens","10 utilisateurs","Signature &#233;lectronique","Portail locataire","Loci IA","Support prioritaire"]},
  {nom:"Enterprise", color:"#10b981", prix_mois:null, prix_an:null, desc:"Pour les grandes organisations",
   features:["Biens illimit&#233;s","Utilisateurs illimit&#233;s","Multi-agences","API avanc&#233;e","Support 24/7"]},
]

export default function Landing() {
  const [openMenu, setOpenMenu] = useState(null)
  const [featTab, setFeatTab] = useState("gestion")
  const [openAcc, setOpenAcc] = useState(0)
  const [billing, setBilling] = useState("mois")
  const [activeInteg, setActiveInteg] = useState(0)

  useEffect(() => {
    // Intersection Observer pour animations
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible") })
    }, {threshold:0.1})
    document.querySelectorAll(".anim").forEach(el => obs.observe(el))
    return () => { obs.disconnect() }
  }, [])

  const acc = ACCORDIONS[openAcc] || ACCORDIONS[0]

  return (
    <div style={{fontFamily:"\"Segoe UI\",system-ui,-apple-system,sans-serif",color:"#1a1a1a",background:"#fff",overflowX:"hidden"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none;color:inherit}
        /* NAV */
        .nav-btn{height:44px;padding:0 14px;border:none;border-bottom:2px solid transparent;background:none;font-size:14px;font-family:inherit;color:#1a1a1a;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all 0.15s;white-space:nowrap}
        .nav-btn:hover{border-bottom-color:#0078d4;color:#0078d4}
        /* MEGA MENU - pleine largeur */
        .drop{position:absolute;top:calc(100% + 1px);background:#fff;border:1px solid #e0e0e0;box-shadow:0 4px 20px rgba(0,0,0,0.12);z-index:500;animation:fadeDown 0.15s ease;min-width:180px}
        .drop-wide{position:absolute;top:calc(100% + 1px);left:0;background:#fff;border:1px solid #e0e0e0;box-shadow:0 4px 20px rgba(0,0,0,0.12);z-index:500;animation:fadeDown 0.15s ease;width:720px;display:grid;grid-template-columns:repeat(4,1fr)}
        .drop-col{padding:20px 16px;border-right:1px solid #f0f0f0}
        .drop-col:last-child{border-right:none}
        .drop-head{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px}
        .drop-item{display:block;padding:7px 10px;font-size:13px;color:#1a1a1a;text-decoration:none;border-radius:2px;transition:all 0.1s;white-space:nowrap}
        .drop-item:hover{background:#f0f7ff;color:#0078d4}
        .drop-simple{padding:8px}
        .drop-simple .drop-item{padding:9px 14px;display:flex;flex-direction:column;gap:2px}
        .drop-simple .drop-item span{font-size:11.5px;color:#888}
        /* BUTTONS */
        .btn-dark{padding:10px 22px;background:#1a1a1a;color:#fff;border:none;font-size:14px;font-family:inherit;font-weight:600;cursor:pointer;border-radius:2px;transition:background 0.15s;white-space:nowrap}
        .btn-dark:hover{background:#000}
        .btn-out{padding:10px 22px;background:transparent;color:#1a1a1a;border:1.5px solid #1a1a1a;font-size:14px;font-family:inherit;cursor:pointer;border-radius:2px;transition:all 0.15s;white-space:nowrap}
        .btn-out:hover{background:#f5f5f5}
        .btn-blue{padding:10px 22px;background:#0078d4;color:#fff;border:none;font-size:14px;font-family:inherit;font-weight:600;cursor:pointer;border-radius:2px;transition:background 0.15s}
        .btn-blue:hover{background:#106ebe}
        /* FEAT TABS */
        .ftab{padding:14px 22px;border:none;background:none;font-size:14px;font-family:inherit;color:#555;cursor:pointer;border-bottom:3px solid transparent;transition:all 0.15s;white-space:nowrap}
        .ftab.on{color:#1a1a1a;border-bottom-color:#1a1a1a;font-weight:600}
        .ftab:hover{color:#1a1a1a}
        /* ACCORDION */
        .acc-btn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:16px 0;border:none;background:none;font-family:inherit;font-size:15px;font-weight:500;color:#1a1a1a;cursor:pointer;border-bottom:1px solid #e5e5e5;text-align:left;gap:12px}
        .acc-btn.on{color:#0078d4}
        .acc-bar{width:3px;height:0;background:#0078d4;transition:height 0.3s;border-radius:2px}
        .acc-btn.on .acc-bar{height:24px}
        /* CARDS */
        .rcard{background:#fff;border:1px solid #e5e5e5;overflow:hidden;transition:box-shadow 0.2s,transform 0.2s}
        .rcard:hover{box-shadow:0 8px 28px rgba(0,0,0,0.1);transform:translateY(-3px)}
        .pcard{border:1px solid #e5e5e5;padding:28px;background:#fff;position:relative;transition:box-shadow 0.2s}
        .pcard:hover{box-shadow:0 6px 24px rgba(0,0,0,0.1)}
        .pcard.pop{border-color:#0078d4;border-top:3px solid #0078d4}
        .uc-card{padding:32px;border:1px solid #e5e5e5;background:#fff;transition:all 0.2s;position:relative;overflow:hidden}
        .uc-card::before{content:"";position:absolute;top:0;left:0;width:3px;height:0;background:var(--card-color,#0078d4);transition:height 0.3s}
        .uc-card:hover::before{height:100%}
        .uc-card:hover{box-shadow:0 6px 24px rgba(0,0,0,0.08);transform:translateY(-2px)}
        .fl{color:#555;font-size:13px;text-decoration:none;display:block;padding:4px 0;transition:color 0.1s}
        .fl:hover{color:#0078d4}
        .integ-tab{flex:1;padding:20px 12px;background:#fff;text-align:center;cursor:pointer;transition:all 0.2s;border-bottom:3px solid transparent}
        .integ-tab:hover{background:#f9f9f9}
        .integ-tab.on{border-bottom-color:var(--ic,#0078d4);box-shadow:inset 0 -3px 0 var(--ic,#0078d4)}
        /* ANIMATIONS */
        @keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .nav-wrap{position:relative}
        .drop-menu{position:absolute;top:calc(100% + 8px);left:0;background:#fff;border:1px solid #e0e0e0;border-top:3px solid #0078d4;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:999;animation:fadeDown 0.15s ease;min-width:200px}
        .drop-wide{width:680px;display:grid;grid-template-columns:repeat(4,1fr)}
        .drop-col{padding:20px 16px;border-right:1px solid #f0f0f0}
        .drop-col:last-child{border-right:none}
        .drop-head{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f0f0f0}
        .drop-link{display:block;padding:7px 10px;font-size:13px;color:#1a1a1a;text-decoration:none;border-radius:2px;transition:all 0.1s}
        .drop-link:hover{background:#f0f7ff;color:#0078d4;padding-left:14px}
        .drop-simple{padding:8px;min-width:240px}
        .drop-simple-item{display:block;padding:9px 16px;font-size:13.5px;color:#1a1a1a;text-decoration:none;border-radius:2px;transition:background 0.1s;white-space:nowrap}
        .drop-simple-item:hover{background:#f0f7ff;color:#0078d4}
        .drop-simple-item small{display:block;font-size:11.5px;color:#999;margin-top:1px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
        .anim{opacity:0;transform:translateY(30px);transition:opacity 0.6s ease,transform 0.6s ease}
        .anim.visible{opacity:1;transform:none}
        .anim-d1{transition-delay:0.1s}
        .anim-d2{transition-delay:0.2s}
        .anim-d3{transition-delay:0.3s}
        .anim-d4{transition-delay:0.4s}
        /* HERO FLOATING CARD */
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .float{animation:float 4s ease-in-out infinite}
        /* STAT COUNTER */
        .stat-num{font-size:28px;font-weight:700;color:#1a1a1a;font-variant-numeric:tabular-nums}
        @media(max-width:768px){.hide-mobile{display:none!important}}
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{background:"#fff",borderBottom:"1px solid #e5e5e5",position:"sticky",top:0,zIndex:300}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",height:48,padding:"0 24px",gap:0}}>
          <Link to="/"><Logo/></Link>
          <span style={{width:1,height:20,background:"#e5e5e5",margin:"0 20px",flexShrink:0}}/>
          <div style={{display:"flex",flex:1,alignItems:"center"}} className="hide-mobile">
            {/* Produits */}
            <div className="nav-wrap" onMouseLeave={()=>setOpenMenu(null)}>
              <button onMouseEnter={()=>setOpenMenu("produits")} style={{height:48,padding:"0 14px",border:"none",borderBottom:"2px solid "+(openMenu==="produits"?"#0078d4":"transparent"),background:"none",fontSize:14,color:openMenu==="produits"?"#0078d4":"#1a1a1a",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                Produits
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:openMenu==="produits"?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {openMenu==="produits" && (
                <div className="drop-menu drop-wide">
                  {[
                    {titre:"Pour les agences",items:[["Centre d&#8217;administration","/agence"],["Gestion des utilisateurs","/agence/utilisateurs"],["Rapports","/agence/rapports"],["Facturation","/agence/abonnement"]]},
                    {titre:"Pour les propri&#233;taires",items:[["Espace propri&#233;taire","/proprietaire"],["Baux et contrats","/agence/baux"],["Suivi des paiements","/agence/paiements"]]},
                    {titre:"Pour les locataires",items:[["Portail locataire","/locataire"],["Application mobile","/"],["Signalements","/locataire"]]},
                    {titre:"Applications",items:[["Loci IA","/agence"],["Int&#233;grations","/"],["API Imoloc","/"]]},
                  ].map(sec=>(
                    <div key={sec.titre} className="drop-col">
                      <div className="drop-head" dangerouslySetInnerHTML={{__html:sec.titre}}/>
                      {sec.items.map(([l,p])=><Link key={l} to={p} className="drop-link" onClick={()=>setOpenMenu(null)} dangerouslySetInnerHTML={{__html:l}}/>)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Offres & Tarifs - lien direct */}
            <a href="#tarifs" style={{height:48,padding:"0 14px",display:"inline-flex",alignItems:"center",fontSize:14,color:"#1a1a1a",textDecoration:"none",borderBottom:"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}
              onMouseOver={e=>{e.currentTarget.style.borderBottomColor="#0078d4";e.currentTarget.style.color="#0078d4"}}
              onMouseOut={e=>{e.currentTarget.style.borderBottomColor="transparent";e.currentTarget.style.color="#1a1a1a"}}>
              Offres &amp; Tarifs
            </a>

            {/* Ressources */}
            <div className="nav-wrap" onMouseLeave={()=>setOpenMenu(null)}>
              <button onMouseEnter={()=>setOpenMenu("ressources")} style={{height:48,padding:"0 14px",border:"none",borderBottom:"2px solid "+(openMenu==="ressources"?"#0078d4":"transparent"),background:"none",fontSize:14,color:openMenu==="ressources"?"#0078d4":"#1a1a1a",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                Ressources
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:openMenu==="ressources"?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {openMenu==="ressources" && (
                <div className="drop-menu drop-simple">
                  {[["Documentation","Guides et tutoriels"],["Formation","Apprenez Imoloc"],["Communaut&#233;","Forum et entraide"],["Blog","Actualit&#233;s immobili&#232;res"],["Nouveaut&#233;s","Derni&#232;res fonctionnalit&#233;s"]].map(([l,d])=>(
                    <a key={l} href="#" className="drop-simple-item" onClick={()=>setOpenMenu(null)}>
                      <span dangerouslySetInnerHTML={{__html:l}}/><small dangerouslySetInnerHTML={{__html:d}}/>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Support */}
            <div className="nav-wrap" onMouseLeave={()=>setOpenMenu(null)}>
              <button onMouseEnter={()=>setOpenMenu("support")} style={{height:48,padding:"0 14px",border:"none",borderBottom:"2px solid "+(openMenu==="support"?"#0078d4":"transparent"),background:"none",fontSize:14,color:openMenu==="support"?"#0078d4":"#1a1a1a",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                Support
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:openMenu==="support"?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {openMenu==="support" && (
                <div className="drop-menu drop-simple">
                  {[["Aide et support","FAQ et assistance"],["Support technique","R&#233;soudre un probl&#232;me"],["Nous contacter","Parlez &#224; un expert"],["Partenaires","Programme revendeur"]].map(([l,d])=>(
                    <a key={l} href="#" className="drop-simple-item" onClick={()=>setOpenMenu(null)}>
                      <span dangerouslySetInnerHTML={{__html:l}}/><small dangerouslySetInnerHTML={{__html:d}}/>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
            <Link to="/register"><button className="btn-dark" style={{fontSize:13,padding:"7px 16px"}}>Essayer gratuitement</button></Link>
            <Link to="/login"><button className="btn-out" style={{fontSize:13,padding:"7px 16px"}}>Se connecter</button></Link>
          </div>
        </div>

        {/* RESSOURCES */}

        {/* SUPPORT */}
      </nav>

      {/* ── HERO ── */}
      <section style={{background:"linear-gradient(135deg,#fdf8f5 0%,#f5f0fd 40%,#eef5ff 100%)",padding:"80px 24px 90px",overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 70% 30%,rgba(108,99,255,0.06) 0%,transparent 50%),radial-gradient(circle at 20% 70%,rgba(0,120,212,0.06) 0%,transparent 50%)",pointerEvents:"none"}}/>
        <div style={{maxWidth:1280,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"center",position:"relative",zIndex:1}}>
          <div className="anim">
            <div style={{fontSize:11,fontWeight:700,color:"#0078d4",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>GESTION IMMOBILI&#200;RE POUR L&#8217;AFRIQUE</div>
            <h1 style={{fontSize:"clamp(30px,4vw,50px)",fontWeight:300,color:"#1a1a1a",lineHeight:1.15,marginBottom:20,letterSpacing:"-0.02em"}}>
              Votre guide de la gestion<br/><strong style={{fontWeight:700,color:"#0078d4"}}>immobili&#232;re avec Imoloc</strong>
            </h1>
            <p style={{fontSize:16,color:"#444",lineHeight:1.8,marginBottom:32,maxWidth:480}}>
              G&#233;rez efficacement vos biens, locataires, paiements et utilisateurs depuis une seule plateforme. Con&#231;ue pour l&#8217;Afrique francophone.
            </p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
              <Link to="/agence"><button className="btn-dark">Se connecter en tant qu&#8217;administrateur</button></Link>
              <Link to="/register"><button className="btn-out">Essayer gratuitement</button></Link>
            </div>
            <a href="#" style={{fontSize:13,color:"#555",display:"inline-flex",alignItems:"center",gap:8,marginTop:4}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:"#1a1a1a",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </span>
              Ou essayez la version de d&#233;monstration
            </a>
          </div>
          <div style={{position:"relative"}} className="anim anim-d2">
            <div style={{borderRadius:12,overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.15)",border:"1px solid #e5e5e5"}}>
              <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&q=80" alt="Gestion immobiliere"
                style={{width:"100%",height:380,objectFit:"cover",display:"block"}}
                onError={e=>{e.target.parentElement.style.background="linear-gradient(135deg,#e8f4ff,#f0f9ff)";e.target.style.display="none"}}/>
            </div>
            {/* Floating notification card */}
            <div className="float" style={{position:"absolute",bottom:-20,left:-24,background:"#fff",border:"1px solid #e5e5e5",borderRadius:10,padding:"14px 18px",boxShadow:"0 8px 24px rgba(0,0,0,0.12)",display:"flex",alignItems:"center",gap:12,minWidth:220}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:"#d4edda",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Check color="#28a745"/>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>3 paiements re&#231;us</div>
                <div style={{fontSize:12,color:"#888",marginTop:1}}>45 000 FCFA aujourd&#8217;hui</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS + ACCES RAPIDE ── */}
      <section style={{borderBottom:"1px solid #e5e5e5",padding:"0 24px",background:"#fff"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"stretch",minHeight:64}}>
          {[["2 500+","Biens g&#233;r&#233;s"],["450+","Agences actives"],["8","Pays couverts"],["98%","Satisfaction"]].map(([v,l],i) => (
            <div key={l} style={{flex:1,padding:"16px 24px",borderLeft:i>0?"1px solid #e5e5e5":"none",display:"flex",alignItems:"center",gap:12}}>
              <div className="stat-num" dangerouslySetInnerHTML={{__html:v}}/>
              <div style={{fontSize:12,color:"#888"}} dangerouslySetInnerHTML={{__html:l}}/>
            </div>
          ))}
          <div style={{flex:2,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:10,borderLeft:"1px solid #e5e5e5",padding:"0 0 0 24px"}}>
            <Link to="/agence"><button className="btn-dark" style={{fontSize:13,padding:"8px 16px"}}>Se connecter en tant qu&#8217;admin</button></Link>
            <Link to="#tarifs"><button className="btn-out" style={{fontSize:13,padding:"8px 16px"}}>Comparer les plans</button></Link>
          </div>
        </div>
      </section>

      {/* ── FEATURE TABS (cap 5) ── */}
      <section style={{background:"#fff"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 24px"}}>
          <div style={{display:"flex",borderBottom:"1px solid #e5e5e5",overflowX:"auto"}}>
            {FEAT_TABS.map(t => (
              <button key={t.id} className={"ftab"+(featTab===t.id?" on":"")} onClick={()=>setFeatTab(t.id)} dangerouslySetInnerHTML={{__html:t.label}}/>
            ))}
          </div>
        </div>

        {/* GESTION SIMPLIFIEE - accordion + image sticky */}
        {featTab === "gestion" && (
          <div style={{maxWidth:1280,margin:"0 auto",padding:"60px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"flex-start"}}>
            <div className="anim">
              <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>FONCTIONNALIT&#201;S</div>
              <h2 style={{fontSize:"clamp(22px,3vw,34px)",fontWeight:300,color:"#1a1a1a",marginBottom:24,lineHeight:1.2}}>R&#233;pondre aux besoins uniques de votre organisation</h2>
              {ACCORDIONS.map((a,i) => (
                <div key={i}>
                  <button className={"acc-btn"+(openAcc===i?" on":"")} onClick={()=>setOpenAcc(openAcc===i?-1:i)}>
                    <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
                      <div className="acc-bar" style={{background:a.accent}}/>
                      <span dangerouslySetInnerHTML={{__html:a.titre}}/>
                    </div>
                    <Chev open={openAcc===i}/>
                  </button>
                  {openAcc===i && (
                    <div style={{padding:"16px 0 24px 15px",fontSize:14,color:"#555",lineHeight:1.8,borderLeft:"3px solid "+a.accent,marginLeft:"0",paddingLeft:20,animation:"fadeIn 0.3s ease"}}>
                      <p dangerouslySetInnerHTML={{__html:a.desc}}/>
                      <a href="#" style={{display:"inline-flex",alignItems:"center",gap:6,color:a.accent,fontSize:13,fontWeight:600,marginTop:12}}>
                        En savoir plus <Arrow size={12}/>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{position:"sticky",top:64}}>
              <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #e5e5e5",boxShadow:"0 12px 40px rgba(0,0,0,0.1)",background:acc.bg,minHeight:400,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.4s"}}>
                <img key={openAcc}
                  src={["https://images.unsplash.com/photo-1551434678-e076c223a692?w=640&q=80","https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=640&q=80","https://images.unsplash.com/photo-1563986768609-322da13575f3?w=640&q=80"][openAcc>=0?openAcc:0]}
                  alt="" style={{width:"100%",height:400,objectFit:"cover",animation:"fadeIn 0.4s ease"}}
                  onError={e=>{e.target.style.display="none"}}/>
              </div>
            </div>
          </div>
        )}

        {/* APP MOBILE (cap 6) */}
        {featTab === "mobile" && (
          <section style={{background:"linear-gradient(135deg,#0e1a35,#0d2040)",padding:"80px 24px",color:"#fff"}}>
            <div style={{maxWidth:1280,margin:"0 auto"}}>
              <div style={{textAlign:"center",marginBottom:60}}>
                <div style={{fontSize:11,fontWeight:700,color:"#4da6ff",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>APPLICATION MOBILE</div>
                <h2 style={{fontSize:"clamp(24px,3vw,42px)",fontWeight:300,color:"#fff",marginBottom:16}}>T&#233;l&#233;chargez l&#8217;application mobile Imoloc gratuitement*</h2>
                <p style={{fontSize:15,color:"rgba(255,255,255,0.65)",lineHeight:1.8,maxWidth:600,margin:"0 auto 32px"}}>
                  Acc&#233;dez aux t&#226;ches courantes en d&#233;placement et recevez des notifications concernant les paiements, renouvellements et signalements.
                </p>
                <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:32}}>
                  {[["Pour iOS","🍎"],["Pour Android","▶"]].map(([l,ic]) => (
                    <button key={l} style={{padding:"12px 28px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>{ic} {l}</button>
                  ))}
                </div>
                {/* QR CODE PLACEHOLDER */}
                <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:12}}>
                  <div style={{width:120,height:120,background:"#fff",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                      {/* Simple QR pattern */}
                      {[0,1,2,3,4,5,6].map(r=>[0,1,2,3,4,5,6].map(c=>{
                        const isCorner = (r<3&&c<3)||(r<3&&c>3)||(r>3&&c<3)
                        return <rect key={`${r}-${c}`} x={8+c*12} y={8+r*12} width={10} height={10} rx={1} fill={Math.random()>0.4?"#1a1a1a":"transparent"}/>
                      }))}
                    </svg>
                  </div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Scannez pour installer</div>
                </div>
                <div style={{marginTop:20,fontSize:12,color:"rgba(255,255,255,0.4)"}}>*La disponibilit&#233; varie selon le pays.</div>
              </div>
            </div>
          </section>
        )}

        {/* INTEGRATIONS (cap 7) */}
        {featTab === "integrations" && (
          <div style={{padding:"80px 24px",background:"#fafafa"}}>
            <div style={{maxWidth:1280,margin:"0 auto"}}>
              <div style={{textAlign:"center",marginBottom:48}}>
                <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>APPLICATIONS INT&#201;GR&#201;ES</div>
                <h2 style={{fontSize:"clamp(22px,3vw,36px)",fontWeight:300,color:"#1a1a1a",marginBottom:12}}>B&#233;n&#233;ficiez d&#8217;une int&#233;gration fluide avec vos outils</h2>
                <p style={{fontSize:14,color:"#555",maxWidth:500,margin:"0 auto"}}>Trouvez des solutions pour vos outils de paiement Mobile Money pr&#233;f&#233;r&#233;s.</p>
              </div>
              {/* Integration tabs */}
              <div style={{display:"flex",gap:1,background:"#e5e5e5",border:"1px solid #e5e5e5",marginBottom:40,overflowX:"auto"}}>
                {INTEGRATIONS.map((integ,i) => (
                  <div key={integ.nom} className={"integ-tab"+(activeInteg===i?" on":"")} style={{"--ic":integ.color}} onClick={()=>setActiveInteg(i)}>
                    <div style={{width:44,height:44,borderRadius:8,background:integ.color+"14",border:"1px solid "+integ.color+"30",margin:"0 auto 8px",display:"flex",alignItems:"center",justifyContent:"center",color:integ.color}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:activeInteg===i?integ.color:"#1a1a1a"}}>{integ.nom}</div>
                  </div>
                ))}
              </div>
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <p style={{fontSize:15,color:"#555",marginBottom:24}}>
                  <strong style={{color:INTEGRATIONS[activeInteg].color}}>{INTEGRATIONS[activeInteg].nom}</strong> — Connectez Imoloc &#224; votre op&#233;rateur Mobile Money pr&#233;f&#233;r&#233;.
                </p>
                <Link to="/register"><button className="btn-blue">Essayer gratuitement</button></Link>
              </div>
            </div>
          </div>
        )}

        {/* RESSOURCES (cap 8) */}
        {featTab === "ressources" && (
          <div style={{padding:"60px 24px",background:"#fff"}}>
            <div style={{maxWidth:1280,margin:"0 auto"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32}}>
                <h2 style={{fontSize:"clamp(20px,2.5vw,32px)",fontWeight:300,color:"#1a1a1a"}}>Tirez le meilleur de votre investissement</h2>
                <div style={{display:"flex",gap:16}}>
                  <button style={{width:36,height:36,borderRadius:"50%",border:"1px solid #e5e5e5",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <button style={{width:36,height:36,borderRadius:"50%",border:"1px solid #e5e5e5",background:"#1a1a1a",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24}}>
                {RESSOURCES.map((r,i) => (
                  <div key={i} className="rcard anim" style={{animationDelay:i*0.1+"s"}}>
                    <div style={{height:200,overflow:"hidden",background:"#f5f5f5"}}>
                      <img src={r.img} alt={r.titre} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform 0.4s"}}
                        onMouseOver={e=>e.target.style.transform="scale(1.05)"}
                        onMouseOut={e=>e.target.style.transform="scale(1)"}
                        onError={e=>{e.target.style.display="none"}}/>
                    </div>
                    <div style={{padding:"22px 22px 26px"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}} dangerouslySetInnerHTML={{__html:r.cat}}/>
                      <h3 style={{fontSize:16,fontWeight:600,color:"#1a1a1a",marginBottom:8,lineHeight:1.3}} dangerouslySetInnerHTML={{__html:r.titre}}/>
                      <p style={{fontSize:13,color:"#555",lineHeight:1.6,marginBottom:16}} dangerouslySetInnerHTML={{__html:r.desc}}/>
                      <a href="#" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#1a1a1a",color:"#fff",fontSize:13,fontWeight:600,borderRadius:2}}>
                        <span dangerouslySetInnerHTML={{__html:r.btn}}/> <Arrow size={12}/>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── POUR QUI ── */}
      <section style={{padding:"80px 24px",background:"#f9f5f2"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}} className="anim">
            <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>POUR TOUS LES ACTEURS</div>
            <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:300,color:"#1a1a1a",marginBottom:12}}>Une plateforme, trois espaces distincts</h2>
            <p style={{fontSize:15,color:"#555",maxWidth:520,margin:"0 auto"}}>Chaque type d&#8217;utilisateur dispose d&#8217;un espace adapt&#233; &#224; ses besoins sp&#233;cifiques.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:1,background:"#e5e5e5",border:"1px solid #e5e5e5"}}>
            {[
              {titre:"Agences immobili&#232;res",desc:"G&#233;rez un portefeuille multi-biens avec votre &#233;quipe. G&#233;n&#233;rez des contrats et acceptez les paiements Mobile Money.",cta:"Centre d&#8217;administration",path:"/agence",color:"#0078d4",actions:["Gestion &#233;quipe","Multi-biens","Rapports","Facturation"]},
              {titre:"Propri&#233;taires",desc:"Suivez vos biens et locataires sans effort. Recevez vos loyers sur Mobile Money et consultez vos revenus.",cta:"Espace propri&#233;taire",path:"/proprietaire",color:"#6c63ff",actions:["Suivi loyers","Documents","Paiements","Notifications"]},
              {titre:"Locataires",desc:"Payez votre loyer, t&#233;l&#233;chargez vos quittances, signalez des probl&#232;mes depuis votre t&#233;l&#233;phone.",cta:"Portail locataire",path:"/locataire",color:"#10b981",actions:["Paiement mobile","Quittances","Plaintes","Documents"]},
            ].map((uc,i) => (
              <div key={uc.path} className={"uc-card anim anim-d"+(i+1)} style={{"--card-color":uc.color,background:"#fff","animationDelay":i*0.15+"s"}}>
                <h3 style={{fontSize:20,fontWeight:600,color:"#1a1a1a",marginBottom:10}} dangerouslySetInnerHTML={{__html:uc.titre}}/>
                <p style={{fontSize:14,color:"#555",lineHeight:1.75,marginBottom:20}} dangerouslySetInnerHTML={{__html:uc.desc}}/>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:24}}>
                  {uc.actions.map(a=><span key={a} style={{fontSize:12,padding:"3px 10px",background:uc.color+"10",color:uc.color,border:"1px solid "+uc.color+"30",borderRadius:2}} dangerouslySetInnerHTML={{__html:a}}/>)}
                </div>
                <Link to={uc.path}><button style={{padding:"9px 20px",background:uc.color,color:"#fff",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",borderRadius:2,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6}}>
                  <span dangerouslySetInnerHTML={{__html:uc.cta}}/> &#8594;
                </button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESSAYEZ L'EXPERIENCE (cap 9) ── */}
      <section style={{padding:"80px 24px",background:"#fff"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}} className="anim">
            <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:300,color:"#1a1a1a"}}>Essayez l&#8217;exp&#233;rience d&#8217;administration Imoloc</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}} className="anim">
            {/* Carte principale */}
            <div style={{border:"1px solid #e5e5e5",borderRadius:8,overflow:"hidden",display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{padding:32}}>
                <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>Essayer gratuitement</div>
                <h3 style={{fontSize:22,fontWeight:300,color:"#1a1a1a",marginBottom:12,lineHeight:1.3}}>D&#233;marrez votre essai gratuit de 30 jours sans risque</h3>
                <p style={{fontSize:13,color:"#555",lineHeight:1.7,marginBottom:24}}>B&#233;n&#233;ficiez d&#8217;un acc&#232;s direct &#224; toutes les fonctionnalit&#233;s. Aucune carte bancaire requise.</p>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <Link to="/register"><button className="btn-dark" style={{justifyContent:"flex-start",gap:10}}><Arrow/> Prise en main</button></Link>
                  <button className="btn-out" style={{textAlign:"left"}}>Ou essayez une d&#233;monstration</button>
                </div>
              </div>
              <div style={{background:"#f5f5f5",overflow:"hidden"}}>
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80" alt=""
                  style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                  onError={e=>{e.target.style.display="none"}}/>
              </div>
            </div>
            {/* Deux petites cartes */}
            <div style={{display:"flex",flexDirection:"column",gap:24}}>
              {[
                {titre:"Cr&#233;ez un ticket de support technique",desc:"Obtenez une assistance pour l&#8217;installation et la configuration d&#8217;Imoloc.",btn:"D&#233;marrez un ticket",img:"https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80"},
                {titre:"Parcourez les rubriques d&#8217;aide",desc:"Prenez de l&#8217;avance sur l&#8217;installation et la gestion de votre organisation.",btn:"Acc&#233;dez aux ressources",img:"https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&q=80"},
              ].map((c,i) => (
                <div key={i} style={{border:"1px solid #e5e5e5",borderRadius:8,overflow:"hidden",display:"grid",gridTemplateColumns:"1fr auto"}}>
                  <div style={{padding:24}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Support Imoloc</div>
                    <h3 style={{fontSize:16,fontWeight:500,color:"#1a1a1a",marginBottom:8,lineHeight:1.3}} dangerouslySetInnerHTML={{__html:c.titre}}/>
                    <p style={{fontSize:13,color:"#555",lineHeight:1.6,marginBottom:16}} dangerouslySetInnerHTML={{__html:c.desc}}/>
                    <a href="#" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",background:"#1a1a1a",color:"#fff",fontSize:12,fontWeight:600,borderRadius:2}}>
                      <Arrow size={11}/> <span dangerouslySetInnerHTML={{__html:c.btn}}/>
                    </a>
                  </div>
                  <div style={{width:120,background:"#f5f5f5",overflow:"hidden"}}>
                    <img src={c.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                      onError={e=>{e.target.style.display="none"}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TARIFS ── */}
      <section id="tarifs" style={{padding:"80px 24px",background:"#f9f5f2"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:40}} className="anim">
            <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>OFFRES ET TARIFS</div>
            <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:300,color:"#1a1a1a",marginBottom:20}}>Comparez les offres et les prix</h2>
            <div style={{display:"inline-flex",background:"#ede8e3",borderRadius:4,padding:3,gap:3}}>
              {[["mois","Mensuel"],["an","Annuel (-20%)"]].map(([k,l]) => (
                <button key={k} onClick={()=>setBilling(k)} style={{padding:"7px 18px",borderRadius:2,border:"none",background:billing===k?"#fff":"transparent",fontFamily:"inherit",fontSize:13,cursor:"pointer",fontWeight:billing===k?600:400,boxShadow:billing===k?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:1,background:"#e5e5e5",border:"1px solid #e5e5e5"}}>
            {PLANS.map((plan,i) => (
              <div key={plan.nom} className={"pcard"+(plan.pop?" pop":"")+" anim anim-d"+(i+1)}>
                {plan.pop && <div style={{position:"absolute",top:12,right:12,fontSize:11,fontWeight:700,padding:"2px 10px",background:"#0078d4",color:"#fff",borderRadius:2}}>Recommand&#233;</div>}
                <div style={{fontSize:11,fontWeight:700,color:plan.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{plan.nom}</div>
                <div style={{fontSize:13,color:"#888",marginBottom:16}}>{plan.desc}</div>
                {plan.prix_mois
                  ? <div style={{marginBottom:24}}><span style={{fontSize:32,fontWeight:700,color:"#1a1a1a"}}>{(billing==="mois"?plan.prix_mois:plan.prix_an).toLocaleString("fr-FR")}</span><span style={{fontSize:13,color:"#888"}}> FCFA/mois</span></div>
                  : <div style={{fontSize:22,fontWeight:300,color:"#888",marginBottom:24}}>Sur devis</div>
                }
                <Link to="/register"><button style={{width:"100%",padding:"9px",background:plan.pop?"#0078d4":"transparent",color:plan.pop?"#fff":plan.color,border:"1px solid "+(plan.pop?"#0078d4":plan.color),fontSize:13,fontWeight:600,cursor:"pointer",borderRadius:2,fontFamily:"inherit",marginBottom:20}}>{plan.prix_mois?"Commencer":"Nous contacter"}</button></Link>
                <div style={{height:1,background:"#e5e5e5",marginBottom:16}}/>
                {plan.features.map(f => (
                  <div key={f} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:13,color:"#333"}}>
                    <Check color={plan.color}/><span dangerouslySetInnerHTML={{__html:f}}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── COMMENT CA MARCHE ── */}
      <section style={{padding:"80px 24px",background:"#fff"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}} className="anim">
            <div style={{fontSize:11,fontWeight:700,color:"#0078d4",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12}}>D&#201;MARRAGE RAPIDE</div>
            <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:300,color:"#1a1a1a",marginBottom:12}}>Op&#233;rationnel en moins de 10 minutes</h2>
            <p style={{fontSize:15,color:"#555",maxWidth:520,margin:"0 auto"}}>Pas de formation complexe. Imoloc est con&#231;u pour &#234;tre simple et intuitif d&#232;s le premier jour.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"#e5e5e5",border:"1px solid #e5e5e5"}}>
            {[
              {num:"01",titre:"Cr&#233;ez votre compte",desc:"Inscrivez-vous en 2 minutes. Choisissez votre type de compte (agence, propri&#233;taire ou locataire) et configurez votre profil.",color:"#0078d4",
               points:["Inscription gratuite 30 jours","Aucune carte bancaire","Configuration guid&#233;e pas &#224; pas"]},
              {num:"02",titre:"Ajoutez vos biens et locataires",desc:"Importez votre parc immobilier existant ou ajoutez vos biens un par un. Invitez vos locataires &#224; rejoindre leur portail.",color:"#6c63ff",
               points:["Import Excel de vos donn&#233;es","Invitation locataires par email","G&#233;n&#233;ration automatique des baux"]},
              {num:"03",titre:"G&#233;rez et encaissez",desc:"Recevez vos loyers via Mobile Money, g&#233;n&#233;rez des quittances automatiquement et suivez tout depuis votre tableau de bord.",color:"#10b981",
               points:["Paiements MTN, Moov, Wave","Quittances PDF automatiques","Notifications en temps r&#233;el"]},
            ].map((step,i) => (
              <div key={i} className="anim" style={{background:"#fff",padding:"36px 32px","animationDelay":i*0.15+"s"}}>
                <div style={{fontSize:48,fontWeight:800,color:step.color+"20",lineHeight:1,marginBottom:16}} dangerouslySetInnerHTML={{__html:step.num}}/>
                <h3 style={{fontSize:19,fontWeight:600,color:"#1a1a1a",marginBottom:12,lineHeight:1.3}} dangerouslySetInnerHTML={{__html:step.titre}}/>
                <p style={{fontSize:14,color:"#555",lineHeight:1.75,marginBottom:20}} dangerouslySetInnerHTML={{__html:step.desc}}/>
                <div style={{borderTop:"1px solid #f0f0f0",paddingTop:16}}>
                  {step.points.map(p => (
                    <div key={p} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:step.color+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                      <span style={{fontSize:13,color:"#555"}} dangerouslySetInnerHTML={{__html:p}}/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:32}}>
            <Link to="/register"><button style={{padding:"12px 32px",background:"#0078d4",color:"#fff",border:"none",fontSize:15,fontWeight:600,cursor:"pointer",borderRadius:2,fontFamily:"inherit"}}>Commencer gratuitement &#8594;</button></Link>
          </div>
        </div>
      </section>

      {/* ── POURQUOI IMOLOC ── */}
      <section style={{padding:"80px 24px",background:"#f9f5f2"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"center"}}>
            <div className="anim">
              <div style={{fontSize:11,fontWeight:700,color:"#0078d4",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>POURQUOI IMOLOC</div>
              <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:300,color:"#1a1a1a",marginBottom:20,lineHeight:1.2}}>Con&#231;u sp&#233;cifiquement pour l&#8217;Afrique francophone</h2>
              <p style={{fontSize:15,color:"#444",lineHeight:1.8,marginBottom:32}}>Contrairement aux solutions europ&#233;ennes inadapt&#233;es, Imoloc int&#232;gre nativement le Mobile Money, fonctionne en zone &#224; faible connectivit&#233; et propose une interface en fran&#231;ais.</p>
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                {[
                  {titre:"Mobile Money natif",desc:"MTN, Moov, Wave, Orange Money — sans passer par une banque traditionnelle.",color:"#0078d4"},
                  {titre:"Interface 100% fran&#231;ais",desc:"Con&#231;ue pour les march&#233;s francophones d&#8217;Afrique de l&#8217;Ouest et Centrale.",color:"#10b981"},
                  {titre:"Fonctionne hors ligne",desc:"L&#8217;application continue de fonctionner m&#234;me sans connexion internet stable.",color:"#6c63ff"},
                  {titre:"Support local d&#233;di&#233;",desc:"Une &#233;quipe bas&#233;e &#224; Cotonou, B&#233;nin, disponible 6j/7.",color:"#f59e0b"},
                ].map((item,i) => (
                  <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                    <div style={{width:40,height:40,borderRadius:6,background:item.color+"12",border:"1px solid "+item.color+"25",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:"#1a1a1a",marginBottom:4}} dangerouslySetInnerHTML={{__html:item.titre}}/>
                      <div style={{fontSize:13.5,color:"#666",lineHeight:1.6}} dangerouslySetInnerHTML={{__html:item.desc}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="anim anim-d2">
              <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:32,boxShadow:"0 8px 32px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:20}}>Comparatif</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      <th style={{textAlign:"left",padding:"8px 0",fontSize:12,color:"#888",fontWeight:600,borderBottom:"1px solid #f0f0f0"}}>Fonctionnalit&#233;</th>
                      <th style={{textAlign:"center",padding:"8px",fontSize:12,color:"#0078d4",fontWeight:700,borderBottom:"1px solid #f0f0f0"}}>Imoloc</th>
                      <th style={{textAlign:"center",padding:"8px",fontSize:12,color:"#888",fontWeight:600,borderBottom:"1px solid #f0f0f0"}}>Excel</th>
                      <th style={{textAlign:"center",padding:"8px",fontSize:12,color:"#888",fontWeight:600,borderBottom:"1px solid #f0f0f0"}}>Autres SaaS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Mobile Money natif","✅","❌","❌"],
                      ["Interface en fran&#231;ais","✅","⚠️","⚠️"],
                      ["Portail locataire","✅","❌","✅"],
                      ["Baux &#233;lectroniques","✅","❌","⚠️"],
                      ["Prix adapt&#233; Afrique","✅","✅","❌"],
                      ["Support local","✅","❌","❌"],
                    ].map(([feat,...vals],i) => (
                      <tr key={i} style={{borderBottom:"1px solid #f8f8f8",background:i%2===0?"#fafafa":"#fff"}}>
                        <td style={{padding:"10px 0",fontSize:13,color:"#333"}} dangerouslySetInnerHTML={{__html:feat}}/>
                        {vals.map((v,j) => <td key={j} style={{textAlign:"center",padding:"10px 8px",fontSize:16}}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEMOIGNAGES ── */}
      <section style={{padding:"80px 24px",background:"#fff"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}} className="anim">
            <div style={{fontSize:11,fontWeight:700,color:"#0078d4",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12}}>T&#201;MOIGNAGES CLIENTS</div>
            <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:300,color:"#1a1a1a"}}>Ils font confiance &#224; Imoloc</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24}}>
            {[
              {nom:"Kossi Agbodjan",role:"Directeur",entreprise:"Agence Immovie, Lom&#233;",avis:"Depuis qu&#8217;on utilise Imoloc, nos locataires paient via MTN Money sans qu&#8217;on ait &#224; relancer. Les quittances sont g&#233;n&#233;r&#233;es automatiquement. Un gain de temps immense.",initiales:"KA",color:"#0078d4"},
              {nom:"Adjoua Koffi",role:"Propri&#233;taire",entreprise:"12 appartements &#224; Abidjan",avis:"Je suis propri&#233;taire et je vis en France. Gr&#226;ce &#224; Imoloc je suis mes loyers en temps r&#233;el et mon gestionnaire peut tout faire depuis son t&#233;l&#233;phone. Parfait.",initiales:"AK",color:"#10b981"},
              {nom:"Moussa Diallo",role:"G&#233;rant",entreprise:"Immobilier Sahel, Ouagadougou",avis:"La partie signature &#233;lectronique des baux est r&#233;volutionnaire pour notre march&#233;. On g&#233;n&#232;re et signe les contrats sans imprimante. Nos clients adorent.",initiales:"MD",color:"#6c63ff"},
            ].map((t,i) => (
              <div key={i} className="anim" style={{background:"#fff",border:"1px solid #e5e5e5",padding:"28px",borderRadius:4,position:"relative","animationDelay":i*0.15+"s"}}>
                <div style={{fontSize:40,color:"#0078d4",lineHeight:1,marginBottom:16,opacity:0.15,fontFamily:"Georgia,serif",position:"absolute",top:16,right:20}}>&#8220;</div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:t.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0}}>{t.initiales}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#1a1a1a"}} dangerouslySetInnerHTML={{__html:t.nom}}/>
                    <div style={{fontSize:12,color:"#888",marginTop:1}} dangerouslySetInnerHTML={{__html:t.role+" — "+t.entreprise}}/>
                  </div>
                </div>
                <p style={{fontSize:14,color:"#444",lineHeight:1.8,fontStyle:"italic"}} dangerouslySetInnerHTML={{__html:"&laquo;&nbsp;"+t.avis+"&nbsp;&raquo;"}}/>
                <div style={{display:"flex",gap:3,marginTop:16}}>
                  {[0,1,2,3,4].map(s=><svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BANDE DE CONFIANCE ── */}
      <section style={{padding:"40px 24px",background:"#f3f3f3",borderTop:"1px solid #e5e5e5",borderBottom:"1px solid #e5e5e5"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap",justifyContent:"space-between"}}>
            <div style={{fontSize:13,color:"#888",fontWeight:500,marginRight:32,whiteSpace:"nowrap"}}>Paiements accept&#233;s via</div>
            {[["MTN MoMo","#f59e0b"],["Moov Money","#0078d4"],["Wave","#10b981"],["Orange Money","#f97316"],["PawaPay","#6c63ff"]].map(([nom,color])=>(
              <div key={nom} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"#fff",border:"1px solid #e5e5e5",borderRadius:4,margin:"4px"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:color}}/>
                <span style={{fontSize:13,fontWeight:600,color:"#333"}}>{nom}</span>
              </div>
            ))}
            <div style={{marginLeft:"auto",fontSize:13,color:"#888",paddingLeft:24}}>
              <strong style={{color:"#1a1a1a",fontSize:16}}>450+</strong> agences actives dans <strong style={{color:"#1a1a1a"}}>8 pays</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER (cap 10) ── */}
      <footer style={{background:"#f3f3f3",borderTop:"1px solid #e5e5e5"}}>
        {/* CTA bande */}
        <div style={{background:"#0078d4",padding:"40px 24px",textAlign:"center"}}>
          <h2 style={{fontSize:"clamp(20px,3vw,34px)",fontWeight:300,color:"#fff",marginBottom:12}}>Suivez Imoloc</h2>
          <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:12}}>
            {["LinkedIn","Twitter/X","Facebook","YouTube"].map(s => (
              <a key={s} href="#" style={{color:"rgba(255,255,255,0.8)",fontSize:13,textDecoration:"none",fontWeight:500}}>{s}</a>
            ))}
          </div>
        </div>
        {/* Links */}
        <div style={{maxWidth:1280,margin:"0 auto",padding:"48px 24px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr repeat(5,1fr)",gap:32,marginBottom:40}}>
            <div>
              <Link to="/"><Logo/></Link>
              <p style={{fontSize:13,color:"#555",lineHeight:1.7,maxWidth:220,marginTop:14}}>La plateforme de gestion immobili&#232;re pour l&#8217;Afrique francophone.</p>
            </div>
            {[
              ["Nouveaut&#233;s",["Plan Starter","Plan Business","Plan Enterprise","App mobile","Loci IA"]],
              ["Produits",["Centre admin","Portail locataire","Espace propri&#233;taire","API Imoloc","Int&#233;grations"]],
              ["Ressources",["Documentation","Formation","Blog","Communaut&#233;","Statut du service"]],
              ["Support",["Centre d&#8217;aide","Contact","Support technique","Partenaires","D&#233;veloppeurs"]],
              ["Soci&#233;t&#233;",["&#192; propos","&#201;quipe","Carri&#232;res","Presse","Investisseurs"]],
            ].map(([section,links]) => (
              <div key={section}>
                <div style={{fontSize:12,fontWeight:700,color:"#1a1a1a",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}} dangerouslySetInnerHTML={{__html:section}}/>
                {links.map(link=><a key={link} href="#" className="fl" dangerouslySetInnerHTML={{__html:link}}/>)}
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px solid #e5e5e5",padding:"16px 0 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              {["Mentions l&#233;gales","Confidentialit&#233;","Cookies","Accessibilit&#233;","Plan du site"].map(l=>(
                <a key={l} href="#" style={{fontSize:12,color:"#888",textDecoration:"none"}} dangerouslySetInnerHTML={{__html:l}}/>
              ))}
            </div>
            <div style={{fontSize:12,color:"#aaa"}}>&#169; 2026 Imoloc &#8212; Abomey-Calavi, B&#233;nin &#127463;&#127471;</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
