import { useState } from 'react'
import { Link } from 'react-router-dom'

const PLANS = [
  { name:'Basic', color:'#4da6ff', popular:false, price_monthly:'10 000', price_yearly:'108 000', price_orig:'120 000', features:['10 biens gérés','1 utilisateur','2 appareils','Notifications retard','Calendrier partagé','1 Go stockage'], disabled:['Version mobile','Facturation auto','Signature bail','Profil locataire'] },
  { name:'Standard', color:'#0078d4', popular:true, price_monthly:'25 000', price_yearly:'270 000', price_orig:'300 000', features:['100 biens gérés','5 utilisateurs','5 appareils','Version mobile et web','Facturation automatique','Signature de bail','Profil locataire','Rapports financiers','100 Go stockage','Protection cyber'], disabled:['API Web Service','CRM Imoloc'] },
  { name:'Premium', color:'#6c63ff', popular:false, price_monthly:'50 000', price_yearly:'540 000', price_orig:'600 000', features:['500 biens gérés','20 utilisateurs','10 appareils','Version mobile et web','Facturation automatique','Rapports avancés','API Web Service','CRM Imoloc','500 Go stockage','Backup avancé'], disabled:[] },
  { name:'Entreprise', color:'#00c896', popular:false, price_monthly:null, price_yearly:null, price_orig:null, features:['Biens illimités','50+ utilisateurs','20+ appareils','Toutes fonctionnalités','Rapports personnalisés','CRM avancé','2 To stockage','Support 24/7','API avancée','Gestion appareils distants'], disabled:[] },
]

const FEATURES = [
  { icon:'M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z', title:'Gestion des biens', desc:'Gérez appartements, villas, bureaux, terrains depuis une seule interface intuitive.', color:'#0078d4' },
  { icon:'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', title:'Gestion des locataires', desc:'Enregistrez les locataires, suivez les baux et gérez les renouvellements automatiquement.', color:'#6c63ff' },
  { icon:'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75', title:'Paiements automatisés', desc:'Mobile Money, virement, carte — suivi en temps réel avec alertes de retard.', color:'#00c896' },
  { icon:'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z', title:'Signature électronique', desc:'Signez les baux numériquement. PDF généré et archivé automatiquement.', color:'#f59e0b' },
  { icon:'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z', title:'Gestion des plaintes', desc:"Les locataires soumettent leurs plaintes via l'app mobile. Suivi en temps réel.", color:'#ef4444' },
  { icon:'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', title:'Rapports et Statistiques', desc:"Tableaux de bord, rapports financiers, taux d'occupation — toutes vos données.", color:'#0078d4' },
]

export default function Landing() {
  const [billing, setBilling] = useState('monthly')
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .lp{width:100vw;min-height:100vh;background:#0d1117;color:#e6edf3;font-family:'Inter',sans-serif;overflow-x:hidden}
        .lp-nav{position:fixed;top:0;left:0;right:0;z-index:200;height:62px;display:flex;align-items:center;justify-content:space-between;padding:0 5%;background:rgba(13,17,23,0.9);border-bottom:1px solid rgba(0,120,212,0.15);backdrop-filter:blur(24px)}
        .lp-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .lp-logo-icon{width:36px;height:36px;border-radius:9px;background:linear-gradient(145deg,#0d1f35,#0a1628);border:1px solid rgba(0,120,212,0.45);display:flex;align-items:center;justify-content:center;color:#4da6ff}
        .lp-logo-name{font-size:19px;font-weight:700;letter-spacing:-0.025em;background:linear-gradient(135deg,#4da6ff,#0078d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-nav-links{display:flex;align-items:center;gap:4px}
        .lp-nav-link{padding:7px 15px;border-radius:7px;font-size:14px;font-weight:500;color:rgba(255,255,255,0.5);text-decoration:none;transition:all 0.15s}
        .lp-nav-link:hover{color:rgba(255,255,255,0.9);background:rgba(255,255,255,0.05)}
        .lp-nav-actions{display:flex;align-items:center;gap:10px}
        .lp-btn-outline{padding:8px 18px;border-radius:8px;font-size:13.5px;font-weight:500;color:rgba(255,255,255,0.6);background:transparent;border:1px solid rgba(255,255,255,0.12);text-decoration:none;transition:all 0.15s;display:inline-block}
        .lp-btn-outline:hover{color:#fff;border-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.05)}
        .lp-btn-blue{padding:8px 20px;border-radius:8px;font-size:13.5px;font-weight:600;color:#fff;background:#0078d4;border:1px solid rgba(0,120,212,0.6);text-decoration:none;transition:all 0.2s;display:inline-block;box-shadow:0 0 20px rgba(0,120,212,0.3)}
        .lp-btn-blue:hover{background:#006cc1;transform:translateY(-1px)}
        .lp-hamburger{display:none;background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;padding:4px}
        .lp-mobile-menu{display:none;position:fixed;top:62px;left:0;right:0;z-index:199;background:rgba(13,17,23,0.98);border-bottom:1px solid rgba(0,120,212,0.15);padding:12px 5% 20px;flex-direction:column;gap:4px;backdrop-filter:blur(24px)}
        .lp-mobile-menu.open{display:flex}
        .lp-mobile-btns{display:flex;gap:10px;padding:10px 0 4px}
        .lp-mobile-btns a{flex:1;text-align:center}
        .lp-hero{width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:130px 5% 80px;position:relative;overflow:hidden}
        .lp-hero-bg{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse 90% 60% at 50% -5%,rgba(0,120,212,0.18) 0%,transparent 65%),radial-gradient(ellipse 50% 40% at 85% 90%,rgba(108,99,255,0.08) 0%,transparent 55%)}
        .lp-hero-grid{position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(0,120,212,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,120,212,0.05) 1px,transparent 1px);background-size:50px 50px;mask-image:radial-gradient(ellipse 90% 90% at 50% 50%,black 5%,transparent 75%)}
        .lp-hero-inner{position:relative;z-index:1;max-width:860px;width:100%}
        .lp-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:100px;background:rgba(0,120,212,0.1);border:1px solid rgba(0,120,212,0.3);font-size:12.5px;font-weight:500;color:#4da6ff;margin-bottom:32px}
        .lp-badge-dot{width:7px;height:7px;border-radius:50%;background:#0078d4;animation:lp-pulse 2s ease-in-out infinite}
        @keyframes lp-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        .lp-h1{font-size:clamp(38px,6.5vw,68px);font-weight:700;letter-spacing:-0.035em;line-height:1.08;color:#e6edf3;margin-bottom:26px}
        .lp-h1 .blue{background:linear-gradient(135deg,#4da6ff 0%,#0078d4 45%,#6c63ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-hero-sub{font-size:clamp(15px,2.2vw,18px);font-weight:300;color:rgba(255,255,255,0.42);line-height:1.75;max-width:580px;margin:0 auto 44px}
        .lp-hero-btns{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
        .lp-hero-btn1{display:inline-flex;align-items:center;gap:9px;padding:15px 30px;border-radius:11px;font-size:15px;font-weight:600;color:#fff;background:#0078d4;border:1px solid rgba(0,120,212,0.6);text-decoration:none;transition:all 0.2s;box-shadow:0 0 32px rgba(0,120,212,0.35)}
        .lp-hero-btn1:hover{background:#006cc1;transform:translateY(-2px)}
        .lp-hero-btn2{display:inline-flex;align-items:center;gap:9px;padding:15px 30px;border-radius:11px;font-size:15px;font-weight:500;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);text-decoration:none;transition:all 0.2s}
        .lp-hero-btn2:hover{background:rgba(255,255,255,0.09);color:#fff}
        .lp-stats{display:flex;align-items:center;justify-content:center;margin-top:72px;flex-wrap:wrap}
        .lp-stat{text-align:center;padding:0 32px}
        .lp-stat-val{font-size:32px;font-weight:700;letter-spacing:-0.03em;background:linear-gradient(135deg,#4da6ff,#0078d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-stat-lbl{font-size:12px;color:rgba(255,255,255,0.28);margin-top:5px}
        .lp-stat-sep{width:1px;height:44px;background:rgba(255,255,255,0.07)}
        .lp-section{width:100%;padding:100px 5%}
        .lp-section-lbl{font-size:11.5px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#0078d4;margin-bottom:14px}
        .lp-section-title{font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:-0.03em;color:#e6edf3;line-height:1.18;margin-bottom:14px}
        .lp-section-title .blue{background:linear-gradient(135deg,#4da6ff,#0078d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-section-sub{font-size:15px;color:rgba(255,255,255,0.38);font-weight:300;line-height:1.75;max-width:500px}
        .lp-section-head{margin-bottom:60px}
        .lp-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .lp-feat-card{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px 26px;transition:all 0.22s}
        .lp-feat-card:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-3px);background:rgba(255,255,255,0.04)}
        .lp-feat-icon{width:54px;height:54px;border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;border-width:1px;border-style:solid}
        .lp-feat-title{font-size:16px;font-weight:600;color:#e6edf3;margin-bottom:10px}
        .lp-feat-desc{font-size:13.5px;color:rgba(255,255,255,0.36);line-height:1.68;font-weight:300}
        .lp-pricing-wrap{width:100%;padding:100px 5%;background:rgba(0,0,0,0.2);border-top:1px solid rgba(0,120,212,0.1);border-bottom:1px solid rgba(0,120,212,0.1)}
        .lp-billing-wrap{display:flex;justify-content:center;margin-bottom:52px}
        .lp-billing{display:inline-flex;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:100px;padding:4px}
        .lp-bill-btn{padding:9px 22px;border-radius:100px;font-size:13.5px;font-weight:500;cursor:pointer;border:none;transition:all 0.2s;display:flex;align-items:center;gap:6px;font-family:Inter,sans-serif}
        .lp-bill-btn.on{background:#0078d4;color:#fff;box-shadow:0 0 20px rgba(0,120,212,0.4)}
        .lp-bill-btn.off{background:none;color:rgba(255,255,255,0.38)}
        .lp-save{font-size:11px;color:#00c896;font-weight:600}
        .lp-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;align-items:start}
        .lp-plan{background:rgba(13,17,23,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:28px 22px;position:relative;transition:all 0.22s}
        .lp-plan.popular{border-color:rgba(0,120,212,0.45);background:rgba(0,120,212,0.06);box-shadow:0 0 48px rgba(0,120,212,0.12);transform:scale(1.03)}
        .lp-plan:hover{transform:translateY(-4px);box-shadow:0 24px 48px rgba(0,0,0,0.5)}
        .lp-plan.popular:hover{transform:scale(1.03) translateY(-4px)}
        .lp-plan-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#0078d4;color:#fff;font-size:11px;font-weight:700;padding:4px 16px;border-radius:100px;letter-spacing:0.07em;text-transform:uppercase;white-space:nowrap}
        .lp-plan-name{font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:18px}
        .lp-plan-val{font-size:30px;font-weight:700;letter-spacing:-0.03em;color:#e6edf3}
        .lp-plan-cur{font-size:13px;color:rgba(255,255,255,0.3)}
        .lp-plan-period{font-size:12px;color:rgba(255,255,255,0.28);margin-bottom:8px}
        .lp-plan-orig{font-size:12px;color:rgba(255,255,255,0.22);text-decoration:line-through}
        .lp-plan-eco{font-size:12px;color:#00c896;font-weight:600;margin-bottom:18px}
        .lp-plan-line{height:1px;background:rgba(255,255,255,0.07);margin:18px 0}
        .lp-plan-feats{display:flex;flex-direction:column;gap:9px;margin-bottom:22px}
        .lp-plan-feat{display:flex;align-items:flex-start;gap:9px;font-size:13px;line-height:1.5}
        .lp-plan-feat.yes{color:rgba(255,255,255,0.65)}
        .lp-plan-feat.no{color:rgba(255,255,255,0.2)}
        .lp-check{color:#00c896;flex-shrink:0}
        .lp-cross{color:rgba(255,255,255,0.18);flex-shrink:0}
        .lp-plan-cta{display:block;width:100%;padding:12px 16px;border-radius:9px;text-align:center;font-size:13.5px;font-weight:600;text-decoration:none;transition:all 0.18s;cursor:pointer;border:none;font-family:Inter,sans-serif}
        .lp-plan-cta.blue{background:#0078d4;color:#fff}
        .lp-plan-cta.blue:hover{background:#006cc1}
        .lp-plan-cta.ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);border:1px solid rgba(255,255,255,0.1)}
        .lp-plan-cta.ghost:hover{background:rgba(255,255,255,0.08);color:#fff}
        .lp-plan-cta.green{background:rgba(0,200,150,0.09);color:#00c896;border:1px solid rgba(0,200,150,0.25)}
        .lp-plan-cta.green:hover{background:rgba(0,200,150,0.16)}
        .lp-plan-note{font-size:11.5px;color:rgba(255,255,255,0.22);text-align:center;margin-top:9px}
        .lp-cta{width:100%;padding:110px 5%;text-align:center;background:radial-gradient(ellipse 70% 70% at 50% 50%,rgba(0,120,212,0.09) 0%,transparent 70%);border-top:1px solid rgba(0,120,212,0.08)}
        .lp-cta-h2{font-size:clamp(28px,4vw,44px);font-weight:700;letter-spacing:-0.03em;color:#e6edf3;margin-bottom:16px}
        .lp-cta-p{font-size:16px;color:rgba(255,255,255,0.38);font-weight:300;margin-bottom:44px;line-height:1.7}
        .lp-cta-btns{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
        .lp-footer{width:100%;padding:36px 5%;border-top:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .lp-footer-copy{font-size:13px;color:rgba(255,255,255,0.22)}
        .lp-footer-links{display:flex;gap:22px;flex-wrap:wrap}
        .lp-footer-link{font-size:13px;color:rgba(255,255,255,0.22);text-decoration:none;transition:color 0.15s}
        .lp-footer-link:hover{color:rgba(255,255,255,0.6)}
        @media(max-width:1100px){.lp-plans{grid-template-columns:repeat(2,1fr)}.lp-plan.popular{transform:none}}
        @media(max-width:900px){.lp-feat-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){.lp-nav-links,.lp-nav-actions{display:none}.lp-hamburger{display:flex}.lp-feat-grid{grid-template-columns:1fr}.lp-plans{grid-template-columns:1fr}.lp-hero-btns{flex-direction:column;align-items:stretch}.lp-footer{flex-direction:column}}
        @media(max-width:480px){.lp-stat-sep{display:none}.lp-stat{padding:0 12px}}
      `}</style>
      <div className="lp">
        <nav className="lp-nav">
          <Link to="/" className="lp-logo">
            <div className="lp-logo-icon">
              <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/></svg>
            </div>
            <span className="lp-logo-name">Imoloc</span>
          </Link>
          <div className="lp-nav-links">
            <a href="#fonctionnalites" className="lp-nav-link">Fonctionnalités</a>
            <a href="#tarifs" className="lp-nav-link">Tarifs</a>
            <a href="#contact" className="lp-nav-link">Contact</a>
          </div>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn-outline">Se connecter</Link>
            <Link to="/register" className="lp-btn-blue">Essai gratuit</Link>
          </div>
          <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/> : <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>}
            </svg>
          </button>
        </nav>
        <div className={`lp-mobile-menu ${menuOpen ? 'open' : ''}`}>
          <a href="#fonctionnalites" className="lp-nav-link" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
          <a href="#tarifs" className="lp-nav-link" onClick={() => setMenuOpen(false)}>Tarifs</a>
          <a href="#contact" className="lp-nav-link" onClick={() => setMenuOpen(false)}>Contact</a>
          <div className="lp-mobile-btns">
            <Link to="/login" className="lp-btn-outline" onClick={() => setMenuOpen(false)}>Se connecter</Link>
            <Link to="/register" className="lp-btn-blue" onClick={() => setMenuOpen(false)}>Essai gratuit</Link>
          </div>
        </div>
        <section className="lp-hero">
          <div className="lp-hero-bg"/><div className="lp-hero-grid"/>
          <div className="lp-hero-inner">
            <div className="lp-badge"><div className="lp-badge-dot"/>Plateforme de gestion immobilière en Afrique</div>
            <h1 className="lp-h1">Gérez vos biens<br/><span className="blue">immobiliers simplement</span></h1>
            <p className="lp-hero-sub">Imoloc connecte agences, propriétaires et locataires sur une seule plateforme. Paiements, baux, plaintes — tout en temps réel.</p>
            <div className="lp-hero-btns">
              <Link to="/register" className="lp-hero-btn1">Commencer gratuitement <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg></Link>
              <a href="#fonctionnalites" className="lp-hero-btn2">Voir les fonctionnalités</a>
            </div>
            <div className="lp-stats">
              {[{val:'4',lbl:'Plans disponibles'},null,{val:'3',lbl:'Rôles utilisateurs'},null,{val:'100%',lbl:'Web et Mobile'},null,{val:'1 mois',lbl:'Essai gratuit'}].map((item,i) =>
                item===null ? <div key={i} className="lp-stat-sep"/> : <div key={i} className="lp-stat"><div className="lp-stat-val">{item.val}</div><div className="lp-stat-lbl">{item.lbl}</div></div>
              )}
            </div>
          </div>
        </section>
        <section className="lp-section" id="fonctionnalites">
          <div className="lp-section-head">
            <div className="lp-section-lbl">Fonctionnalités</div>
            <h2 className="lp-section-title">Tout ce dont vous avez<br/><span className="blue">besoin pour gérer</span></h2>
            <p className="lp-section-sub">Une suite complète pour les agences immobilières modernes en Afrique.</p>
          </div>
          <div className="lp-feat-grid">
            {FEATURES.map((f,i) => (
              <div key={i} className="lp-feat-card">
                <div className="lp-feat-icon" style={{background:`${f.color}14`,borderColor:`${f.color}28`,color:f.color}}>
                  <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={f.icon}/></svg>
                </div>
                <div className="lp-feat-title">{f.title}</div>
                <div className="lp-feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="lp-pricing-wrap" id="tarifs">
          <div className="lp-section-head">
            <div className="lp-section-lbl">Tarifs</div>
            <h2 className="lp-section-title">Choisissez votre <span className="blue">plan</span></h2>
            <p className="lp-section-sub">1 mois essai gratuit. Aucune carte bancaire requise.</p>
          </div>
          <div className="lp-billing-wrap">
            <div className="lp-billing">
              <button className={`lp-bill-btn ${billing==='monthly'?'on':'off'}`} onClick={() => setBilling('monthly')}>Mensuel</button>
              <button className={`lp-bill-btn ${billing==='yearly'?'on':'off'}`} onClick={() => setBilling('yearly')}>Annuel <span className="lp-save">-10%</span></button>
            </div>
          </div>
          <div className="lp-plans">
            {PLANS.map((plan,i) => (
              <div key={i} className={`lp-plan ${plan.popular?'popular':''}`}>
                {plan.popular && <div className="lp-plan-badge">Populaire</div>}
                <div className="lp-plan-name" style={{color:plan.color}}>{plan.name}</div>
                {plan.price_monthly ? (
                  <>
                    <div><span className="lp-plan-val" style={{color:plan.color}}>{billing==='monthly'?plan.price_monthly:plan.price_yearly}</span><span className="lp-plan-cur"> FCFA</span></div>
                    <div className="lp-plan-period">{billing==='monthly'?'par mois':'par an'}</div>
                    {billing==='yearly' && <><div className="lp-plan-orig">Au lieu de {plan.price_orig} FCFA</div><div className="lp-plan-eco">Economisez 10%</div></>}
                  </>
                ) : (
                  <><div className="lp-plan-val" style={{color:plan.color,fontSize:22}}>Sur devis</div><div className="lp-plan-period" style={{marginBottom:18}}>Contactez-nous</div></>
                )}
                <div className="lp-plan-line"/>
                <div className="lp-plan-feats">
                  {plan.features.map((feat,j) => <div key={j} className="lp-plan-feat yes"><span className="lp-check"><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg></span>{feat}</div>)}
                  {plan.disabled.map((feat,j) => <div key={j} className="lp-plan-feat no"><span className="lp-cross"><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></span>{feat}</div>)}
                </div>
                <Link to="/register" className={`lp-plan-cta ${plan.name==='Entreprise'?'green':plan.popular?'blue':'ghost'}`}>
                  {plan.name==='Entreprise'?'Demander un devis':'Essai gratuit 1 mois'}
                </Link>
                {plan.name!=='Entreprise' && <div className="lp-plan-note">Aucune carte requise</div>}
              </div>
            ))}
          </div>
        </section>
        <section className="lp-cta" id="contact">
          <h2 className="lp-cta-h2">Prêt à moderniser votre<br/>gestion immobilière ?</h2>
          <p className="lp-cta-p">Rejoignez les agences qui font confiance à Imoloc pour gérer leurs biens en Afrique.</p>
          <div className="lp-cta-btns">
            <Link to="/register" className="lp-hero-btn1">Créer un compte gratuit <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg></Link>
            <Link to="/login" className="lp-hero-btn2">Se connecter</Link>
          </div>
        </section>
        <footer className="lp-footer">
          <div className="lp-footer-copy">© {new Date().getFullYear()} Imoloc — DJLOTECH Society. Tous droits réservés.</div>
          <div className="lp-footer-links">
            <a href="#" className="lp-footer-link">Confidentialité</a>
            <a href="#" className="lp-footer-link">Conditions</a>
            <a href="#" className="lp-footer-link">Support</a>
          </div>
        </footer>
      </div>
    </>
  )
}
