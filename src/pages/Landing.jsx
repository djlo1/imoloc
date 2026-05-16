import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

const UNSPLASH = {
  hero: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&q=80",
  features1: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=640&q=80",
  features2: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=640&q=80",
  features3: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=640&q=80",
  mobile: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80",
  res1: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80",
  res2: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
  res3: "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&q=80",
  res4: "https://images.unsplash.com/photo-1553484771-371a605b060b?w=400&q=80",
}

const IconHome = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
const IconCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const IconChart = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const IconDoc = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const IconPhone = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
const IconCheck = ({color}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color||"#0078d4"} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
const IconChev = ({open}) => <svg style={{transition:"transform 0.2s",transform:open?"rotate(180deg)":"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
const IconArrow = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>

const FEAT_TABS = ["Fonctionnalit\u00e9s", "Application mobile", "Applications int\u00e9gr\u00e9es", "Ressources"]

const ACCORDIONS = [
  { titre: "Am\u00e9liorez l\u2019efficacit\u00e9 au quotidien", img: UNSPLASH.features1,
    desc: "Acc\u00e9dez \u00e0 une bo\u00eete \u00e0 outils compl\u00e8te qui permet de configurer, g\u00e9rer et surveiller vos biens, locataires et paiements depuis n\u2019importe o\u00f9." },
  { titre: "La gestion depuis n\u2019importe o\u00f9", img: UNSPLASH.features2,
    desc: "Imoloc est con\u00e7u pour fonctionner sur tous les appareils. Votre \u00e9quipe peut g\u00e9rer les biens et locataires depuis leur t\u00e9l\u00e9phone, tablette ou ordinateur." },
  { titre: "S\u00e9curit\u00e9 et conformit\u00e9 int\u00e9gr\u00e9es", img: UNSPLASH.features3,
    desc: "Prot\u00e9gez les donn\u00e9es de vos locataires et propri\u00e9taires avec un chiffrement de bout en bout et des contr\u00f4les d\u2019acc\u00e8s granulaires." },
]

export default function Landing() {
  const [openMenu, setOpenMenu] = useState(null)
  const [featTab, setFeatTab] = useState(0)
  const [openAcc, setOpenAcc] = useState(0)
  const [billing, setBilling] = useState("mois")
  const navRef = useRef(null)

  useEffect(() => {
    const h = e => { if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [])

  return (
    <div style={{ fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif', color: "#1a1a1a", background: "#fff", overflowX: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0 }
        a { text-decoration: none; color: inherit }
        .nav-lnk { height: 44px; padding: 0 12px; border: none; border-bottom: 2px solid transparent; background: none; font-size: 14px; font-family: inherit; color: #1a1a1a; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: border-color 0.15s; white-space: nowrap }
        .nav-lnk:hover { border-bottom-color: #0078d4 }
        .mega { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border-top: 1px solid #e5e5e5; box-shadow: 0 8px 32px rgba(0,0,0,0.12); z-index: 200; padding: 32px 48px }
        .mini { position: absolute; top: 100%; background: #fff; border: 1px solid #e5e5e5; box-shadow: 0 4px 16px rgba(0,0,0,0.1); z-index: 200; padding: 8px; min-width: 220px; left: 0 }
        .mitem { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; font-size: 13.5px; color: #1a1a1a; border-radius: 2px; transition: background 0.1s }
        .mitem:hover { background: #f5f5f5; color: #0078d4 }
        .btn-dark { padding: 9px 20px; background: #1a1a1a; color: #fff; border: none; font-size: 14px; font-family: inherit; font-weight: 600; cursor: pointer; border-radius: 2px; transition: background 0.15s; display: inline-flex; align-items: center; gap: 6px }
        .btn-dark:hover { background: #000 }
        .btn-out { padding: 9px 20px; background: transparent; color: #1a1a1a; border: 1px solid #1a1a1a; font-size: 14px; font-family: inherit; font-weight: 400; cursor: pointer; border-radius: 2px; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px }
        .btn-out:hover { background: #f5f5f5 }
        .btn-blue { padding: 9px 20px; background: #0078d4; color: #fff; border: none; font-size: 14px; font-family: inherit; font-weight: 600; cursor: pointer; border-radius: 2px; display: inline-flex; align-items: center; gap: 6px }
        .btn-blue:hover { background: #106ebe }
        .feat-tab { padding: 14px 20px; border: none; background: none; font-size: 14px; font-family: inherit; color: #555; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.15s; white-space: nowrap }
        .feat-tab.on { color: #1a1a1a; border-bottom-color: #1a1a1a; font-weight: 600 }
        .feat-tab:hover { color: #1a1a1a }
        .acc-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 18px 0; border: none; background: none; font-family: inherit; font-size: 15px; font-weight: 500; color: #1a1a1a; cursor: pointer; border-bottom: 1px solid #e5e5e5; text-align: left }
        .acc-btn.on { color: #0078d4 }
        .pcard { border: 1px solid #e5e5e5; padding: 28px; background: #fff; position: relative; transition: box-shadow 0.2s }
        .pcard:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.1) }
        .pcard.pop { border-color: #0078d4; border-top: 3px solid #0078d4 }
        .rcard { background: #fff; border: 1px solid #e5e5e5; cursor: pointer; transition: box-shadow 0.2s; overflow: hidden }
        .rcard:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1) }
        .fl { color: #555; font-size: 13px; text-decoration: none; display: block; padding: 4px 0; transition: color 0.1s }
        .fl:hover { color: #0078d4 }
        .uc { padding: 28px; border-left: 3px solid transparent; transition: all 0.2s; cursor: default }
        .uc:hover { border-left-color: #0078d4; background: #f8fbff }
        @media(max-width:768px) { .desktop-only{display:none!important} }
      `}</style>

      {/* NAVBAR */}
      <nav ref={navRef} style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", position: "sticky", top: 0, zIndex: 300 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", height: 44, padding: "0 24px" }}>
          {/* LOGO */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 20, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 23 23"><rect width="11" height="11" fill="#f25022"/><rect x="12" width="11" height="11" fill="#7fba00"/><rect y="12" width="11" height="11" fill="#00a4ef"/><rect x="12" y="12" width="11" height="11" fill="#ffb900"/></svg>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>Imoloc</span>
            <span style={{ width: 1, height: 18, background: "#ccc", margin: "0 4px" }}/>
            <span style={{ fontSize: 13, color: "#555" }}>Gestion immobili&#232;re</span>
          </Link>

          <div style={{ display: "flex", flex: 1, alignItems: "center", position: "relative" }} className="desktop-only">
            {[["produits","Produits"],["tarifs","Tarifs"],["ressources","Ressources"],["support","Support"]].map(([k,l]) => (
              <button key={k} className="nav-lnk" onMouseEnter={() => setOpenMenu(k)} onClick={() => setOpenMenu(openMenu===k?null:k)}>
                {l} {k!=="tarifs" && <IconChev open={openMenu===k}/>}
              </button>
            ))}

            {/* MEGA MENU PRODUITS */}
            {openMenu === "produits" && (
              <div className="mega" onMouseLeave={() => setOpenMenu(null)}>
                <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 40 }}>
                  {[
                    ["Pour les agences", [
                      ["Centre d&#8217;administration","Tableau de bord complet","/agence"],
                      ["Gestion des utilisateurs","R&#244;les et permissions","/agence/utilisateurs"],
                      ["Rapports avanc&#233;s","Analyses et statistiques","/agence/rapports"],
                      ["Facturation","Abonnements et paiements","/agence/abonnement"],
                    ]],
                    ["Pour les propri&#233;taires", [
                      ["Espace propri&#233;taire","Vos biens et revenus","/proprietaire"],
                      ["Baux et contrats","G&#233;n&#233;rez vos baux","/agence/baux"],
                      ["Suivi des paiements","Loyers et quittances","/agence/paiements"],
                    ]],
                    ["Pour les locataires", [
                      ["Portail locataire","Votre espace personnel","/locataire"],
                      ["Application mobile","iOS et Android","/"],
                      ["Signalements","Suivi en temps r&#233;el","/locataire"],
                    ]],
                    ["Applications", [
                      ["Loci IA","Assistant immobilier intelligent","/agence"],
                      ["Int&#233;grations","FedaPay, PawaPay, et plus","/"],
                      ["API Imoloc","Connectez vos outils","/"],
                    ]],
                  ].map(([titre, items]) => (
                    <div key={titre}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }} dangerouslySetInnerHTML={{ __html: titre }}/>
                      {items.map(([label, desc, path]) => (
                        <Link key={label} to={path} className="mitem" onClick={() => setOpenMenu(null)}>
                          <div>
                            <div style={{ fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: label }}/>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 1 }} dangerouslySetInnerHTML={{ __html: desc }}/>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MINI RESSOURCES */}
            {openMenu === "ressources" && (
              <div className="mini" style={{ left: 145 }} onMouseLeave={() => setOpenMenu(null)}>
                {[["Documentation","Guides et tutoriels"],["Formation","Apprenez Imoloc"],["Communaut&#233;","Forum et entraide"],["Blog","Actualit&#233;s immobili&#232;res"],["Nouveaut&#233;s","Derni&#232;res fonctionnalit&#233;s"]].map(([l,d]) => (
                  <a key={l} href="#" className="mitem"><div><div dangerouslySetInnerHTML={{ __html: l }}/><div style={{ fontSize:11.5,color:"#888" }} dangerouslySetInnerHTML={{ __html: d }}/></div></a>
                ))}
              </div>
            )}

            {/* MINI SUPPORT */}
            {openMenu === "support" && (
              <div className="mini" style={{ left: 230 }} onMouseLeave={() => setOpenMenu(null)}>
                {[["Aide et support","FAQ et assistance"],["Support technique","R&#233;soudre un probl&#232;me"],["Nous contacter","Parlez &#224; un expert"],["Partenaires","Programme revendeur"]].map(([l,d]) => (
                  <a key={l} href="#" className="mitem"><div><div dangerouslySetInnerHTML={{ __html: l }}/><div style={{ fontSize:11.5,color:"#888" }} dangerouslySetInnerHTML={{ __html: d }}/></div></a>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#555", display: "flex" }}><IconSearch/></button>
            <Link to="/register"><button className="btn-dark">Essayer gratuitement</button></Link>
            <Link to="/login"><button className="btn-out">Se connecter</button></Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: "linear-gradient(135deg, #fdf6f0 0%, #f5f0f8 50%, #eef5ff 100%)", padding: "80px 24px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0078d4", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>GESTION IMMOBILI&#200;RE</div>
            <h1 style={{ fontSize: "clamp(32px,4vw,48px)", fontWeight: 300, color: "#1a1a1a", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em" }}>
              Votre guide de la gestion<br/><strong style={{ fontWeight: 700 }}>immobili&#232;re avec Imoloc</strong>
            </h1>
            <p style={{ fontSize: 16, color: "#444", lineHeight: 1.75, marginBottom: 32, maxWidth: 480 }}>
              G&#233;rez efficacement vos biens, locataires, paiements et utilisateurs depuis une seule plateforme con&#231;ue pour l&#8217;Afrique.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <Link to="/agence"><button className="btn-dark">Se connecter en tant qu&#8217;administrateur</button></Link>
              <Link to="/register"><button className="btn-out">Essayer gratuitement</button></Link>
            </div>
            <a href="#" style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a1a1a", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </span>
              Ou essayez une version de d&#233;monstration
            </a>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", border: "1px solid #e5e5e5" }}>
              <img src={UNSPLASH.hero} alt="Gestion immobiliere" style={{ width: "100%", height: 380, objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.display="none"; e.target.parentElement.style.background="linear-gradient(135deg,#e8f4ff,#f0f9ff)"; e.target.parentElement.style.height="380px"; e.target.parentElement.innerHTML += "<div style=\"display:flex;align-items:center;justify-content:center;height:380px;font-size:48px;\">\u{1F3E2}</div>" }}/>
            </div>
            <div style={{ position: "absolute", bottom: -16, left: -16, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: "14px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#d4edda", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>3 paiements re&#231;us</div>
                <div style={{ fontSize: 12, color: "#888" }}>45 000 FCFA aujourd&#8217;hui</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ borderBottom: "1px solid #e5e5e5", padding: "20px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 0 }}>
          {[["2 500+","Biens g&#233;r&#233;s"],["450+","Agences actives"],["8","Pays couverts"],["98%","Satisfaction client"]].map(([v,l],i) => (
            <div key={l} style={{ flex: 1, padding: "8px 24px", borderLeft: i>0?"1px solid #e5e5e5":"none", textAlign: i===0?"left":"center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a1a" }} dangerouslySetInnerHTML={{ __html: v }}/>
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }} dangerouslySetInnerHTML={{ __html: l }}/>
            </div>
          ))}
          <div style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <Link to="/agence"><button className="btn-dark" style={{ fontSize: 13 }}>Se connecter en tant qu&#8217;admin</button></Link>
            <Link to="/register"><button className="btn-out" style={{ fontSize: 13 }}>Comparer les plans</button></Link>
          </div>
        </div>
      </section>

      {/* FEATURE TABS */}
      <section style={{ background: "#fff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e5e5e5", overflowX: "auto" }}>
            {FEAT_TABS.map((t,i) => (
              <button key={t} className={"feat-tab"+(featTab===i?" on":"")} onClick={() => setFeatTab(i)} dangerouslySetInnerHTML={{ __html: t }}/>
            ))}
          </div>
        </div>

        {/* TAB 0 - FONCTIONNALITES */}
        {featTab === 0 && (
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "60px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>FONCTIONNALIT&#201;S</div>
              <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, color: "#1a1a1a", marginBottom: 16, lineHeight: 1.2 }}>
                R&#233;pondre aux besoins uniques de votre organisation
              </h2>
              <div style={{ marginTop: 24 }}>
                {ACCORDIONS.map((a,i) => (
                  <div key={i}>
                    <button className={"acc-btn"+(openAcc===i?" on":"")} onClick={() => setOpenAcc(openAcc===i?-1:i)}>
                      <span dangerouslySetInnerHTML={{ __html: a.titre }}/>
                      <IconChev open={openAcc===i}/>
                    </button>
                    {openAcc===i && (
                      <div style={{ padding: "16px 0 24px", fontSize: 14, color: "#555", lineHeight: 1.8 }}>
                        <p dangerouslySetInnerHTML={{ __html: a.desc }}/>
                        <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#0078d4", fontSize: 13, fontWeight: 600, marginTop: 12 }}>
                          En savoir plus <IconArrow/>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: "sticky", top: 80 }}>
              <div style={{ borderRadius: 4, overflow: "hidden", border: "1px solid #e5e5e5", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
                {openAcc >= 0 && openAcc < ACCORDIONS.length && (
                  <img src={ACCORDIONS[openAcc].img} alt="" style={{ width: "100%", height: 420, objectFit: "cover", display: "block" }}
                    onError={e => { e.target.style.background="#f5f5f5"; e.target.style.height="420px" }}/>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1 - APP MOBILE */}
        {featTab === 1 && (
          <div style={{ background: "linear-gradient(135deg,#0e1a35,#1a2d4a)", padding: "80px 24px", color: "#fff" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4da6ff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>APPLICATION MOBILE</div>
                <h2 style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 300, color: "#fff", marginBottom: 16, lineHeight: 1.2 }}>
                  T&#233;l&#233;chargez l&#8217;application mobile Imoloc gratuitement
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, marginBottom: 32, maxWidth: 460 }}>
                  Acc&#233;dez aux t&#226;ches courantes en d&#233;placement. Recevez des notifications pour les paiements, les renouvellements de bail et les signalements.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  <button style={{ padding: "10px 20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    <div style={{ textAlign: "left" }}><div style={{ fontSize: 10, opacity: 0.7 }}>Disponible sur</div><div style={{ fontWeight: 600 }}>App Store</div></div>
                  </button>
                  <button style={{ padding: "10px 20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.33.19.7.24 1.05.14l.06-.04L13 15l-3.17-3.17-6.65 11.93zm.77-22.65c-.45.25-.74.73-.74 1.31V21.6c0 .58.29 1.06.74 1.31L12 15 3.95 1.11zM21.54 10.27L19.13 9l-2.41-1.35L13.5 11l3.22 3.22 2.41-1.36 2.41-1.35c.69-.39.69-1.46 0-1.85zM4.23.38L13 8.97l-3.17 3.17-5.6-11.76Z"/></svg>
                    <div style={{ textAlign: "left" }}><div style={{ fontSize: 10, opacity: 0.7 }}>Disponible sur</div><div style={{ fontWeight: 600 }}>Google Play</div></div>
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 260, borderRadius: 28, overflow: "hidden", border: "6px solid rgba(255,255,255,0.15)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
                  <img src={UNSPLASH.mobile} alt="App mobile" style={{ width: "100%", height: 460, objectFit: "cover", display: "block" }}
                    onError={e => { e.target.style.background="#1a2d4a"; e.target.style.height="460px" }}/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 - INTEGRATIONS */}
        {featTab === 2 && (
          <div style={{ padding: "80px 24px" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>APPLICATIONS INT&#201;GR&#201;ES</div>
                <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, color: "#1a1a1a" }}>B&#233;n&#233;ficiez d&#8217;une int&#233;gration fluide avec vos outils</h2>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 1, background: "#e5e5e5", border: "1px solid #e5e5e5", marginBottom: 40, maxWidth: 700, margin: "0 auto 40px" }}>
                {[["MTN MoMo","#f59e0b"],["Moov Money","#0078d4"],["Wave","#10b981"],["Orange Money","#f97316"],["PawaPay","#6c63ff"]].map(([name,color]) => (
                  <div key={name} style={{ flex: 1, background: "#fff", padding: "20px 12px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseOver={e => { e.currentTarget.style.boxShadow="inset 0 -3px 0 "+color; e.currentTarget.style.background="#f9f9f9" }}
                    onMouseOut={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.background="#fff" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: color+"18", border: "1px solid "+color+"30", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IconCard/>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1a1a" }}>{name}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>Connectez Imoloc &#224; tous vos outils de paiement Mobile Money en Afrique.</p>
                <Link to="/register"><button className="btn-blue">Essayer gratuitement</button></Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 - RESSOURCES */}
        {featTab === 3 && (
          <div style={{ padding: "60px 24px", background: "#fafafa" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24 }}>
                {[
                  { cat: "D&#233;marrage rapide", titre: "Guide de d&#233;but", desc: "Configurez votre organisation en 5 &#233;tapes simples.", img: UNSPLASH.res1, btn: "Inscrivez-vous aujourd&#8217;hui" },
                  { cat: "Documentation", titre: "Documentation technique", desc: "Ressources techniques pour les d&#233;veloppeurs et administrateurs.", img: UNSPLASH.res2, btn: "En savoir plus" },
                  { cat: "Roadmap", titre: "Derni&#232;res nouveaut&#233;s", desc: "D&#233;couvrez les nouvelles fonctionnalit&#233;s et mises &#224; jour.", img: UNSPLASH.res3, btn: "Restez inform&#233;" },
                  { cat: "Communaut&#233;", titre: "Forum Imoloc", desc: "Connectez-vous avec d&#8217;autres administrateurs immobiliers.", img: UNSPLASH.res4, btn: "Rejoindre" },
                ].map(r => (
                  <div key={r.titre} className="rcard">
                    <div style={{ height: 180, overflow: "hidden" }}>
                      <img src={r.img} alt={r.titre} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", display: "block" }}
                        onMouseOver={e => e.target.style.transform="scale(1.03)"}
                        onMouseOut={e => e.target.style.transform="scale(1)"}
                        onError={e => { e.target.style.background="#f5f5f5"; e.target.style.height="180px" }}/>
                    </div>
                    <div style={{ padding: "20px 20px 24px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: r.cat }}/>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: r.titre }}/>
                      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: r.desc }}/>
                      <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 2 }}>
                        <span dangerouslySetInnerHTML={{ __html: r.btn }}/> <IconArrow/>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* POUR QUI */}
      <section style={{ padding: "80px 24px", background: "#f9f5f2" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>POUR TOUS LES ACTEURS</div>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, color: "#1a1a1a", marginBottom: 12 }}>Une plateforme, trois espaces distincts</h2>
            <p style={{ fontSize: 15, color: "#555", maxWidth: 560, margin: "0 auto" }}>Chaque type d&#8217;utilisateur dispose d&#8217;un espace adapt&#233; &#224; ses besoins sp&#233;cifiques.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
            {[
              { titre: "Agences immobili&#232;res", desc: "G&#233;rez un portefeuille multi-biens avec votre &#233;quipe. G&#233;n&#233;rez des contrats professionnels et acceptez les paiements Mobile Money.", cta: "Centre d&#8217;administration", path: "/agence", color: "#0078d4", icon: <IconHome/>, actions: ["Gestion &#233;quipe","Multi-biens","Rapports","Facturation"] },
              { titre: "Propri&#233;taires", desc: "Suivez vos biens et locataires sans effort. Recevez vos loyers sur Mobile Money et consultez vos revenus &#224; tout moment.", cta: "Espace propri&#233;taire", path: "/proprietaire", color: "#6c63ff", icon: <IconDoc/>, actions: ["Suivi loyers","Documents","Paiements","Notifications"] },
              { titre: "Locataires", desc: "Payez votre loyer, t&#233;l&#233;chargez vos quittances, signalez des probl&#232;mes depuis votre t&#233;l&#233;phone.", cta: "Portail locataire", path: "/locataire", color: "#10b981", icon: <IconPhone/>, actions: ["Paiement mobile","Quittances","Plaintes","Documents"] },
            ].map(uc => (
              <div key={uc.path} className="uc" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
                <div style={{ width: 48, height: 48, background: uc.color+"12", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: uc.color }}>{uc.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: uc.titre }}/>
                <p style={{ fontSize: 14, color: "#555", lineHeight: 1.75, marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: uc.desc }}/>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
                  {uc.actions.map(a => <span key={a} style={{ fontSize: 12, padding: "3px 10px", background: uc.color+"10", color: uc.color, border: "1px solid "+uc.color+"30", borderRadius: 2 }} dangerouslySetInnerHTML={{ __html: a }}/>)}
                </div>
                <Link to={uc.path}><button style={{ padding: "9px 20px", background: uc.color, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 2, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><span dangerouslySetInnerHTML={{ __html: uc.cta }}/> &#8594;</button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>OFFRES ET TARIFS</div>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, color: "#1a1a1a", marginBottom: 20 }}>Comparez les offres et les prix</h2>
            <div style={{ display: "inline-flex", background: "#f3f2f1", borderRadius: 4, padding: 3, gap: 3 }}>
              {[["mois","Mensuel"],["an","Annuel (-20%)"]].map(([k,l]) => (
                <button key={k} onClick={() => setBilling(k)} style={{ padding: "7px 18px", borderRadius: 2, border: "none", background: billing===k?"#fff":"transparent", fontFamily: "inherit", fontSize: 13, cursor: "pointer", fontWeight: billing===k?600:400, boxShadow: billing===k?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24 }}>
            {[
              { nom: "Starter", color: "#0078d4", popular: false, prix_mois: 18000, prix_an: 15000, desc: "Pour les petites agences", features: ["50 biens","3 utilisateurs","Baux et contrats","Paiements Mobile Money","Support email"] },
              { nom: "Business", color: "#6c63ff", popular: true, prix_mois: 39000, prix_an: 32000, desc: "Pour les agences en croissance", features: ["500 biens","10 utilisateurs","Signature &#233;lectronique","Portail locataire mobile","Loci IA","Support prioritaire"] },
              { nom: "Enterprise", color: "#10b981", popular: false, prix_mois: null, prix_an: null, desc: "Pour les grandes organisations", features: ["Biens illimit&#233;s","Utilisateurs illimit&#233;s","Multi-agences","API avanc&#233;e","Support 24/7"] },
            ].map(plan => (
              <div key={plan.nom} className={"pcard"+(plan.popular?" pop":"")}>
                {plan.popular && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: "2px 10px", background: "#0078d4", color: "#fff", borderRadius: 2 }}>Recommand&#233;</div>}
                <div style={{ fontSize: 11, fontWeight: 700, color: plan.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{plan.nom}</div>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>{plan.desc}</div>
                {plan.prix_mois
                  ? <div style={{ marginBottom: 24 }}><span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>{(billing==="mois"?plan.prix_mois:plan.prix_an).toLocaleString("fr-FR")}</span><span style={{ fontSize: 13, color: "#888" }}> FCFA/mois</span></div>
                  : <div style={{ fontSize: 22, fontWeight: 300, color: "#888", marginBottom: 24 }}>Sur devis</div>
                }
                <Link to="/register"><button style={{ width: "100%", padding: "9px", background: plan.popular?"#0078d4":"transparent", color: plan.popular?"#fff":plan.color, border: "1px solid "+(plan.popular?"#0078d4":plan.color), fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 2, fontFamily: "inherit", marginBottom: 20 }}>{plan.prix_mois?"Commencer":"Nous contacter"}</button></Link>
                <div style={{ height: 1, background: "#e5e5e5", marginBottom: 16 }}/>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "#333" }}>
                    <IconCheck color={plan.color}/>
                    <span dangerouslySetInnerHTML={{ __html: f }}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESSAI GRATUIT */}
      <section style={{ background: "linear-gradient(135deg,#0e1a35,#1a2d4a)", padding: "80px 24px", color: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4da6ff", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>ESSAYER GRATUITEMENT</div>
            <h2 style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 300, color: "#fff", marginBottom: 16, lineHeight: 1.2 }}>
              D&#233;marrez votre essai gratuit<br/>de 30 jours sans risque
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, marginBottom: 32, maxWidth: 460 }}>
              B&#233;n&#233;ficiez d&#8217;un acc&#232;s direct &#224; toutes les fonctionnalit&#233;s d&#8217;Imoloc. Aucune carte bancaire requise.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/register"><button className="btn-dark" style={{ background: "#fff", color: "#1a1a1a" }}>Prise en main</button></Link>
              <button className="btn-out" style={{ border: "1px solid rgba(255,255,255,0.4)", color: "#fff" }}>Ou essayez une d&#233;monstration</button>
            </div>
          </div>
          <div>
            <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
              <img src={UNSPLASH.features2} alt="Essai gratuit" style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.background="rgba(255,255,255,0.05)"; e.target.style.height="340px" }}/>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#f5f5f5", borderTop: "1px solid #e5e5e5", padding: "48px 24px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,1fr)", gap: 32, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <svg width="22" height="22" viewBox="0 0 23 23"><rect width="11" height="11" fill="#f25022"/><rect x="12" width="11" height="11" fill="#7fba00"/><rect y="12" width="11" height="11" fill="#00a4ef"/><rect x="12" y="12" width="11" height="11" fill="#ffb900"/></svg>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>Imoloc</span>
              </div>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, maxWidth: 220 }}>La plateforme de gestion immobili&#232;re pour l&#8217;Afrique francophone.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {["LinkedIn","Twitter","Facebook","YouTube"].map(s => (
                  <a key={s} href="#" style={{ width: 32, height: 32, background: "#e5e5e5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#555", fontWeight: 700 }}>{s[0]}</a>
                ))}
              </div>
            </div>
            {[
              ["Produits", ["Centre admin","Portail locataire","Espace propri&#233;taire","Loci IA","App mobile"]],
              ["Tarifs", ["Plan Starter","Plan Business","Plan Enterprise","Comparer les plans"]],
              ["Ressources", ["Documentation","Formation","Blog","Nouveaut&#233;s"]],
              ["Support", ["Centre d&#8217;aide","Contact","Support technique","Partenaires"]],
            ].map(([section, links]) => (
              <div key={section}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>{section}</div>
                {links.map(link => <a key={link} href="#" className="fl" dangerouslySetInnerHTML={{ __html: link }}/>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #e5e5e5", padding: "16px 0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 20 }}>
              {["Mentions l&#233;gales","Confidentialit&#233;","Cookies","Accessibilit&#233;"].map(l => (
                <a key={l} href="#" style={{ fontSize: 12, color: "#888", textDecoration: "none" }} dangerouslySetInnerHTML={{ __html: l }}/>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#aaa" }}>&#169; 2026 Imoloc &#8212; Abomey-Calavi, B&#233;nin &#127463;&#127471;</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
