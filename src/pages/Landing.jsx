import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const PLANS = [
  { nom: "Starter", color: "#0078d4", popular: false, prix_mois: 18000, prix_an: 15000,
    desc: "Pour les petites agences",
    features: ["50 biens", "3 utilisateurs", "Baux et contrats", "Paiements Mobile Money", "Support email"] },
  { nom: "Business", color: "#6c63ff", popular: true, prix_mois: 39000, prix_an: 32000,
    desc: "Pour les agences en croissance",
    features: ["500 biens", "10 utilisateurs", "Signature electronique", "Portail locataire mobile", "Loci IA", "Support prioritaire"] },
  { nom: "Enterprise", color: "#10b981", popular: false, prix_mois: null, prix_an: null,
    desc: "Pour les grandes organisations",
    features: ["Biens illimites", "Utilisateurs illimites", "Multi-agences", "API avancee", "Support 24/7"] },
]

const TABS = [
  { id: "biens", icon: "\u{1F3E0}", label: "Gestion des biens", color: "#0078d4",
    titre: "Gerez tous vos biens immobiliers",
    desc: "Appartements, villas, bureaux — centralisez tout depuis un tableau de bord unique.",
    points: ["Catalogue multi-types", "Photos et documents", "Suivi des travaux", "Historique complet"],
    bg: "linear-gradient(135deg,#e8f4ff,#f0f9ff)" },
  { id: "locataires", icon: "\u{1F465}", label: "Locataires et Baux", color: "#6c63ff",
    titre: "Du contrat a la signature en quelques clics",
    desc: "Creez des baux personnalises, invitez vos locataires a signer electroniquement.",
    points: ["Generation bail PDF", "Signature electronique", "Portail mobile", "Alertes renouvellement"],
    bg: "linear-gradient(135deg,#f0edff,#f8f7ff)" },
  { id: "paiements", icon: "\u{1F4B3}", label: "Paiements", color: "#10b981",
    titre: "Mobile Money — tout accepte",
    desc: "Collectez les loyers via MTN MoMo, Moov Money, Wave. Quittances automatiques.",
    points: ["MTN, Moov, Wave, Orange", "Quittances PDF auto", "Alertes de retard", "Rapports financiers"],
    bg: "linear-gradient(135deg,#e8fff6,#f0fff9)" },
  { id: "rapports", icon: "\u{1F4CA}", label: "Rapports", color: "#f59e0b",
    titre: "Toutes vos donnees en un coup d\u2019oeil",
    desc: "Taux d\u2019occupation, revenus, loyers en retard — exportez en PDF ou Excel.",
    points: ["Tableau de bord temps reel", "Export PDF et Excel", "Stats par bien", "Comparaison mensuelle"],
    bg: "linear-gradient(135deg,#fffbeb,#fefce8)" },
]

export default function Landing() {
  const [openMenu, setOpenMenu] = useState(null)
  const [activeTab, setActiveTab] = useState("biens")
  const [billing, setBilling] = useState("mois")
  const [mobileMenu, setMobileMenu] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null) }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [])

  const tab = TABS.find(t => t.id === activeTab)

  return (
    <div style={{ fontFamily: '"Segoe UI", system-ui, sans-serif', color: "#323130", background: "#fff", overflowX: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0 }
        .nav-btn { height: 48px; padding: 0 14px; border: none; border-bottom: 2px solid transparent; background: none; font-size: 14px; font-family: inherit; color: #323130; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.15s; white-space: nowrap }
        .nav-btn:hover { color: #0078d4; border-bottom-color: #0078d4 }
        .mega { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border-top: 1px solid #edebe9; box-shadow: 0 8px 24px rgba(0,0,0,0.1); z-index: 100; padding: 28px 40px }
        .mini { position: absolute; top: 100%; background: #fff; border: 1px solid #edebe9; border-radius: 2px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); z-index: 100; padding: 12px; min-width: 240px }
        .mitem { display: flex; align-items: flex-start; gap: 12px; padding: 9px 12px; border-radius: 3px; cursor: pointer; text-decoration: none; color: inherit; transition: background 0.1s }
        .mitem:hover { background: #f0f6ff }
        .btn-p { padding: 8px 20px; background: #0078d4; color: #fff; border: none; font-size: 14px; font-family: inherit; font-weight: 600; cursor: pointer; border-radius: 2px; transition: background 0.15s }
        .btn-p:hover { background: #106ebe }
        .btn-o { padding: 8px 20px; background: transparent; color: #323130; border: 1px solid #8a8886; font-size: 14px; font-family: inherit; cursor: pointer; border-radius: 2px; transition: all 0.15s }
        .btn-o:hover { background: #f3f2f1 }
        .ftab { padding: 10px 20px; border: none; background: none; font-size: 14px; font-family: inherit; color: #605e5c; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap }
        .ftab.on { color: #0078d4; border-bottom-color: #0078d4; font-weight: 600 }
        .ftab:hover { color: #0078d4 }
        .ucard { background: #fff; border: 1px solid #edebe9; padding: 32px; transition: all 0.2s }
        .ucard:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-2px) }
        .pcard { border: 1px solid #edebe9; padding: 28px; background: #fff; position: relative; transition: all 0.2s }
        .pcard:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1) }
        .pcard.pop { border-color: #0078d4; box-shadow: 0 0 0 1px #0078d4 }
        .fl { color: #605e5c; font-size: 13px; text-decoration: none; display: block; padding: 3px 0 }
        .fl:hover { color: #0078d4 }
        .rcard { background: #fff; border: 1px solid #edebe9; padding: 24px; transition: all 0.2s; cursor: pointer }
        .rcard:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px) }
      `}</style>

      {/* BANNIERE */}
      <div style={{ background: "#0078d4", color: "#fff", textAlign: "center", padding: "7px 20px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <span>&#127881; Nouveau &#8212; Portail mobile locataire disponible</span>
        <Link to="/register" style={{ color: "#fff", fontWeight: 600, textDecoration: "underline", marginLeft: 4 }}>Essayer gratuitement</Link>
      </div>

      {/* NAVBAR */}
      <nav ref={navRef} style={{ background: "#fff", borderBottom: "1px solid #edebe9", position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", height: 48, padding: "0 24px" }}>

          {/* LOGO */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 24, textDecoration: "none", flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, background: "#0078d4", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 600, color: "#323130" }}>Imoloc</span>
          </Link>

          {/* NAV ITEMS */}
          <div style={{ display: "flex", flex: 1, alignItems: "center", position: "relative" }}>
            {[["produits","Produits",true],["tarifs","Tarifs",false],["ressources","Ressources",true],["support","Support",true]].map(([key,label,chevron]) => (
              <button key={key} className="nav-btn"
                onMouseEnter={() => setOpenMenu(key)}
                onClick={() => setOpenMenu(openMenu === key ? null : key)}>
                {label}
                {chevron && <svg style={{ marginLeft: 3, transition: "transform 0.15s", transform: openMenu===key?"rotate(180deg)":"none" }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>}
              </button>
            ))}

            {/* MEGA MENU PRODUITS */}
            {openMenu === "produits" && (
              <div className="mega" onMouseLeave={() => setOpenMenu(null)}>
                <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32 }}>
                  {[
                    { titre: "Pour les agences", items: [
                      { icon: "\u{1F3E2}", label: "Centre d\u2019administration", desc: "Gerez votre parc immobilier", path: "/agence" },
                      { icon: "\u{1F465}", label: "Gestion des utilisateurs", desc: "Collaborateurs et permissions", path: "/agence/utilisateurs" },
                      { icon: "\u{1F4CA}", label: "Rapports", desc: "Tableaux de bord financiers", path: "/agence/rapports" },
                    ]},
                    { titre: "Pour les proprietaires", items: [
                      { icon: "\u{1F511}", label: "Espace proprietaire", desc: "Vos biens et revenus", path: "/proprietaire" },
                      { icon: "\u{1F4C4}", label: "Baux et contrats", desc: "Generez vos baux", path: "/agence/baux" },
                      { icon: "\u{1F4B0}", label: "Paiements", desc: "Loyers et quittances", path: "/agence/paiements" },
                    ]},
                    { titre: "Pour les locataires", items: [
                      { icon: "\u{1F3E0}", label: "Portail locataire", desc: "Votre espace personnel", path: "/locataire" },
                      { icon: "\u{1F4F1}", label: "Application mobile", desc: "iOS et Android", path: "/" },
                      { icon: "\u{1F4E2}", label: "Signalements", desc: "Suivi en temps reel", path: "/locataire" },
                    ]},
                    { titre: "Applications", items: [
                      { icon: "\u2728", label: "Loci IA", desc: "Assistant immobilier IA", path: "/agence" },
                      { icon: "\u{1F517}", label: "Integrations", desc: "FedaPay, PawaPay, plus", path: "/" },
                      { icon: "\u{1F4F2}", label: "API Imoloc", desc: "Connectez vos outils", path: "/" },
                    ]},
                  ].map(sec => (
                    <div key={sec.titre}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#a19f9d", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{sec.titre}</div>
                      {sec.items.map(item => (
                        <Link key={item.label} to={item.path} className="mitem" onClick={() => setOpenMenu(null)}>
                          <span style={{ fontSize: 20 }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: "#323130" }}>{item.label}</div>
                            <div style={{ fontSize: 12, color: "#605e5c" }}>{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MINI MENU RESSOURCES */}
            {openMenu === "ressources" && (
              <div className="mini" style={{ left: 155 }} onMouseLeave={() => setOpenMenu(null)}>
                {[["\u{1F4D6}","Documentation","Guides et tutoriels"],["\u{1F393}","Formation","Apprenez Imoloc"],["\u{1F4AC}","Communaute","Forum et entraide"],["\u{1F4DD}","Blog","Actualites immobilieres"],["\u{1F504}","Nouveautes","Dernieres fonctionnalites"]].map(([ic,lb,dc]) => (
                  <a key={lb} href="#" className="mitem">
                    <span style={{ fontSize: 18 }}>{ic}</span>
                    <div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{lb}</div><div style={{ fontSize: 12, color: "#605e5c" }}>{dc}</div></div>
                  </a>
                ))}
              </div>
            )}

            {/* MINI MENU SUPPORT */}
            {openMenu === "support" && (
              <div className="mini" style={{ left: 250 }} onMouseLeave={() => setOpenMenu(null)}>
                {[["\u{1F3AF}","Aide et support","FAQ et assistance"],["\u{1F527}","Support technique","Resoudre un probleme"],["\u{1F4DE}","Nous contacter","Parlez a un expert"],["\u{1F91D}","Partenaires","Programme revendeur"]].map(([ic,lb,dc]) => (
                  <a key={lb} href="#" className="mitem">
                    <span style={{ fontSize: 18 }}>{ic}</span>
                    <div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{lb}</div><div style={{ fontSize: 12, color: "#605e5c" }}>{dc}</div></div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* CTA DROITE */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <Link to="/register"><button className="btn-p">Essayer gratuitement</button></Link>
            <Link to="/login"><button className="btn-o">Se connecter</button></Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: "linear-gradient(135deg,#0e1a2b 0%,#1a2d4a 40%,#0e2238 100%)", padding: "80px 24px 100px", position: "relative", overflow: "hidden", minHeight: 520 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(0,120,212,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(108,99,255,0.1) 0%, transparent 40%)", pointerEvents: "none" }}/>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }}/>
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,120,212,0.2)", border: "1px solid rgba(0,120,212,0.4)", borderRadius: 100, padding: "5px 14px", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }}/>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Nouveau &#8212; Portail mobile locataire disponible</span>
            </div>
            <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 300, color: "#fff", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em" }}>
              La plateforme de gestion<br/>
              <span style={{ fontWeight: 700, background: "linear-gradient(90deg,#4da6ff,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>immobili&#232;re pour l&#8217;Afrique</span>
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 32, maxWidth: 540 }}>
              G&#233;rez vos biens, locataires, baux et paiements depuis une seule plateforme. Mobile Money int&#233;gr&#233;, portail locataire, rapports avanc&#233;s.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
              <Link to="/register">
                <button className="btn-p" style={{ padding: "12px 28px", fontSize: 15 }}>D&#233;marrer gratuitement &#8594;</button>
              </Link>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                style={{ padding: "12px 28px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer", borderRadius: 2, fontFamily: "inherit" }}>
                Voir les fonctionnalit&#233;s
              </button>
            </div>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              {[["2 500+","Biens g&#233;r&#233;s"],["450+","Agences actives"],["8","Pays couverts"],["98%","Satisfaction client"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }} dangerouslySetInnerHTML={{__html:v}}/>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }} dangerouslySetInnerHTML={{__html:l}}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ACCES DIRECT */}
      <section style={{ background: "#f3f2f1", borderBottom: "1px solid #edebe9", padding: "12px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#605e5c", flexShrink: 0 }}>Acc&#232;s direct :</span>
          {[["Centre d&#8217;administration","\u{1F3E2}","/agence","#0078d4"],["Espace propri&#233;taire","\u{1F511}","/proprietaire","#6c63ff"],["Portail locataire","\u{1F3E0}","/locataire","#10b981"]].map(([label,icon,path,color]) => (
            <Link key={path} to={path}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#fff", border: `1px solid ${color}33`, borderRadius: 2, textDecoration: "none", fontSize: 13, color: color, fontWeight: 500 }}
              dangerouslySetInnerHTML={undefined}>
              <span>{icon}</span>
              <span dangerouslySetInnerHTML={{ __html: label }}/>
            </Link>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#a19f9d" }}>
            Pas encore de compte ? <Link to="/register" style={{ color: "#0078d4", textDecoration: "none", fontWeight: 600 }}>Cr&#233;er un compte gratuit</Link>
          </div>
        </div>
      </section>

      {/* POUR QUI */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0078d4", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>POUR TOUS LES ACTEURS IMMOBILIERS</div>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, color: "#323130" }}>Une plateforme, trois espaces distincts</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 1, background: "#edebe9", border: "1px solid #edebe9" }}>
            {[
              { icon: "\u{1F3E2}", titre: "Agences immobili&#232;res", desc: "G&#233;rez un portefeuille multi-biens avec votre &#233;quipe, g&#233;n&#233;rez des contrats professionnels et acceptez les paiements Mobile Money.", cta: "Centre d&#8217;administration", path: "/agence", color: "#0078d4", actions: ["Gestion &#233;quipe","Multi-biens","Rapports","Facturation"] },
              { icon: "\u{1F511}", titre: "Propri&#233;taires", desc: "Suivez vos biens et locataires sans effort. Recevez vos loyers directement sur Mobile Money et consultez vos revenus.", cta: "Espace propri&#233;taire", path: "/proprietaire", color: "#6c63ff", actions: ["Suivi loyers","Documents","Paiements","Notifications"] },
              { icon: "\u{1F3E0}", titre: "Locataires", desc: "Payez votre loyer, t&#233;l&#233;chargez vos quittances, signalez des probl&#232;mes et restez en contact avec votre agence.", cta: "Portail locataire", path: "/locataire", color: "#10b981", actions: ["Paiement mobile","Quittances","Plaintes","Documents"] },
            ].map(uc => (
              <div key={uc.path} className="ucard">
                <div style={{ width: 52, height: 52, background: uc.color + "12", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 20 }}>{uc.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: "#323130", marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: uc.titre }}/>
                <p style={{ fontSize: 14, color: "#605e5c", lineHeight: 1.7, marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: uc.desc }}/>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
                  {uc.actions.map(a => (
                    <span key={a} style={{ fontSize: 12, padding: "3px 10px", background: uc.color + "10", color: uc.color, border: `1px solid ${uc.color}30`, borderRadius: 2 }} dangerouslySetInnerHTML={{ __html: a }}/>
                  ))}
                </div>
                <Link to={uc.path}>
                  <button style={{ padding: "9px 20px", background: uc.color, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 2, fontFamily: "inherit" }}>
                    <span dangerouslySetInnerHTML={{ __html: uc.cta }}/> &#8594;
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FONCTIONNALITES */}
      <section id="features" style={{ padding: "80px 24px", background: "#faf9f8" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0078d4", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>FONCTIONNALIT&#201;S</div>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, color: "#323130" }}>R&#233;pondre aux besoins de votre organisation</h2>
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid #edebe9", marginBottom: 40, overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} className={"ftab" + (activeTab === t.id ? " on" : "")} onClick={() => setActiveTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {tab && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "clamp(20px,2.5vw,30px)", fontWeight: 300, color: "#323130", marginBottom: 16, lineHeight: 1.3 }}>{tab.titre}</h3>
                <p style={{ fontSize: 15, color: "#605e5c", lineHeight: 1.8, marginBottom: 28 }}>{tab.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {tab.points.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: tab.color + "18", border: "1px solid " + tab.color + "40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={tab.color} strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                      <span style={{ fontSize: 14, color: "#323130" }}>{p}</span>
                    </div>
                  ))}
                </div>
                <Link to="/register"><button className="btn-p">Essayer gratuitement</button></Link>
              </div>
              <div style={{ background: tab.bg, borderRadius: 8, padding: 32, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, border: "1px solid " + tab.color + "20" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 72, marginBottom: 12 }}>{tab.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: tab.color }}>{tab.titre}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TARIFS */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0078d4", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>OFFRES ET TARIFS</div>
            <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, color: "#323130", marginBottom: 20 }}>Comparez les offres et les prix</h2>
            <div style={{ display: "inline-flex", background: "#f3f2f1", borderRadius: 4, padding: 4, gap: 4 }}>
              {[["mois","Mensuel"],["an","Annuel (-20%)"]].map(([k,l]) => (
                <button key={k} onClick={() => setBilling(k)}
                  style={{ padding: "7px 20px", borderRadius: 2, border: "none", background: billing===k?"#fff":"transparent", fontFamily: "inherit", fontSize: 13, cursor: "pointer", fontWeight: billing===k?600:400, boxShadow: billing===k?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 1, background: "#edebe9", border: "1px solid #edebe9" }}>
            {PLANS.map(plan => (
              <div key={plan.nom} className={"pcard" + (plan.popular ? " pop" : "")}>
                {plan.popular && <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 3, background: "#0078d4" }}/>}
                {plan.popular && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: "2px 10px", background: "#0078d4", color: "#fff", borderRadius: 2 }}>Recommand&#233;</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: plan.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{plan.nom}</div>
                <div style={{ fontSize: 13, color: "#605e5c", marginBottom: 16 }}>{plan.desc}</div>
                {plan.prix_mois
                  ? <div style={{ marginBottom: 24 }}><span style={{ fontSize: 32, fontWeight: 700, color: "#323130" }}>{(billing==="mois"?plan.prix_mois:plan.prix_an).toLocaleString("fr-FR")}</span><span style={{ fontSize: 13, color: "#605e5c" }}> FCFA/mois</span></div>
                  : <div style={{ fontSize: 22, fontWeight: 300, color: "#605e5c", marginBottom: 24 }}>Sur devis</div>
                }
                <Link to="/register">
                  <button style={{ width: "100%", padding: "9px", background: plan.popular ? plan.color : "transparent", color: plan.popular ? "#fff" : plan.color, border: "1px solid " + plan.color, fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 2, fontFamily: "inherit", marginBottom: 20 }}>
                    {plan.prix_mois ? "Commencer" : "Nous contacter"}
                  </button>
                </Link>
                <div style={{ height: 1, background: "#edebe9", marginBottom: 16 }}/>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "#323130" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    {f}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESSOURCES */}
      <section style={{ padding: "80px 24px", background: "#faf9f8" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0078d4", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>RESSOURCES</div>
              <h2 style={{ fontSize: "clamp(20px,2.5vw,30px)", fontWeight: 300, color: "#323130" }}>Tirez le meilleur d&#8217;Imoloc</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {[
              { cat: "Guide", titre: "D&#233;marrer avec Imoloc", desc: "Configurez votre organisation en 5 &#233;tapes.", icon: "\u{1F680}", color: "#0078d4" },
              { cat: "Tutoriel", titre: "Cr&#233;er un bail &#233;lectronique", desc: "G&#233;n&#233;rez et envoyez un contrat en quelques minutes.", icon: "\u{1F4C4}", color: "#6c63ff" },
              { cat: "Formation", titre: "Paiements Mobile Money", desc: "MTN, Moov, Wave &#8212; int&#233;grez tous les op&#233;rateurs.", icon: "\u{1F4B3}", color: "#10b981" },
              { cat: "Webinaire", titre: "Rapports financiers", desc: "Analysez vos revenus et pr&#233;voyez votre croissance.", icon: "\u{1F4CA}", color: "#f59e0b" },
            ].map(r => (
              <div key={r.titre} className="rcard">
                <div style={{ fontSize: 36, marginBottom: 12 }}>{r.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{r.cat}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#323130", marginBottom: 8, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: r.titre }}/>
                <p style={{ fontSize: 13, color: "#605e5c", lineHeight: 1.6, marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: r.desc }}/>
                <a href="#" style={{ fontSize: 13, color: r.color, textDecoration: "none", fontWeight: 600 }}>En savoir plus &#8594;</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#0078d4", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,3vw,36px)", fontWeight: 300, color: "#fff", marginBottom: 12 }}>D&#233;marrez votre essai gratuit de 30 jours</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", marginBottom: 28 }}>Aucune carte bancaire requise. Annulez &#224; tout moment.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register"><button style={{ padding: "12px 28px", background: "#fff", color: "#0078d4", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", borderRadius: 2, fontFamily: "inherit" }}>Cr&#233;er un compte gratuit</button></Link>
            <Link to="/login"><button style={{ padding: "12px 28px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.6)", fontSize: 15, cursor: "pointer", borderRadius: 2, fontFamily: "inherit" }}>Se connecter</button></Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#f3f2f1", borderTop: "1px solid #edebe9", padding: "48px 24px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,1fr)", gap: 32, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, background: "#0078d4", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#323130" }}>Imoloc</span>
              </div>
              <p style={{ fontSize: 13, color: "#605e5c", lineHeight: 1.7, marginBottom: 16, maxWidth: 220 }}>La plateforme de gestion immobili&#232;re pour l&#8217;Afrique francophone.</p>
            </div>
            {[
              ["Produits", ["Centre admin","Portail locataire","Espace propri&#233;taire","Loci IA","App mobile"]],
              ["Tarifs", ["Plan Starter","Plan Business","Plan Enterprise","Comparer les plans"]],
              ["Ressources", ["Documentation","Formation","Blog","Nouveaut&#233;s"]],
              ["Support", ["Centre d&#8217;aide","Contact","Support technique","Partenaires"]],
            ].map(([section, links]) => (
              <div key={section}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#323130", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{section}</div>
                {links.map(link => <a key={link} href="#" className="fl" dangerouslySetInnerHTML={{ __html: link }}/>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #edebe9", padding: "16px 0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 20 }}>
              {["Mentions l&#233;gales","Confidentialit&#233;","Cookies"].map(l => <a key={l} href="#" style={{ fontSize: 12, color: "#605e5c", textDecoration: "none" }} dangerouslySetInnerHTML={{ __html: l }}/>)}
            </div>
            <div style={{ fontSize: 12, color: "#a19f9d" }}>&#169; 2026 Imoloc &#8212; Abomey-Calavi, B&#233;nin &#127463;&#127471;</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
