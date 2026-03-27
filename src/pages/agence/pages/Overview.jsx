import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

export default function Overview() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ biens: 0, locataires: 0, revenus: 0, retards: 0 })
  const [agence, setAgence] = useState(null)
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [recTab, setRecTab] = useState('recommandes')
  const [viewMode, setViewMode] = useState('simplifie')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
        setAgence(ag)
        if (ag?.id) {
          const [{ data: b }, { data: l }, { data: p }] = await Promise.all([
            supabase.from('biens').select('*').eq('agence_id', ag.id).order('created_at', { ascending: false }),
            supabase.from('locataires').select('*').eq('agence_id', ag.id).order('created_at', { ascending: false }),
            supabase.from('paiements').select('*').eq('agence_id', ag.id).order('created_at', { ascending: false }),
          ])
          const bData = b || []; const lData = l || []; const pData = p || []
          setBiens(bData); setLocataires(lData); setPaiements(pData)
          const revenusMois = pData.filter(x => x.statut === 'payé' && new Date(x.date_paiement).getMonth() === new Date().getMonth()).reduce((s, x) => s + Number(x.montant || 0), 0)
          setStats({ biens: bData.length, locataires: lData.length, revenus: revenusMois, retards: pData.filter(x => x.statut === 'retard').length })
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    init()
  }, [])

  const nom = profile?.nom ? `${profile.prenom || ''} ${profile.nom}`.trim() : 'Admin'
  const bienLibres = biens.filter(b => b.statut === 'libre').length
  const bienOccupes = biens.filter(b => b.statut === 'occupé').length
  const tauxOcc = biens.length > 0 ? Math.round((bienOccupes / biens.length) * 100) : 0

  return (
    <>
      <style>{`
        /* ── Top action bar ── */
        .ms-bar{display:flex;align-items:center;gap:0;margin-bottom:0;background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:5px 10px;margin-bottom:24px;flex-wrap:wrap}
        .ms-bar-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.55);transition:all 0.1s;text-decoration:none;white-space:nowrap}
        .ms-bar-btn:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .ms-bar-sep{width:1px;height:20px;background:rgba(255,255,255,0.08);margin:0 2px;flex-shrink:0}
        .ms-bar-right{margin-left:auto;font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);padding:8px 14px}

        /* ── Recommended tabs ── */
        .ms-rec-tabs{display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px}
        .ms-rec-tab{padding:10px 20px;font-size:13.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.4);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;display:flex;align-items:center;gap:8px}
        .ms-rec-tab:hover{color:rgba(255,255,255,0.7)}
        .ms-rec-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .ms-rec-tab-more{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:10px 8px;font-size:16px;margin-left:4px}

        /* ── Hero recommendation card ── */
        .ms-rec-hero{display:grid;grid-template-columns:1fr 380px;gap:20px;margin-bottom:32px}
        .ms-rec-main{background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:28px 32px;position:relative}
        .ms-rec-main-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px}
        .ms-rec-main-tag{font-size:12px;font-weight:600;color:#4da6ff;text-transform:uppercase;letter-spacing:0.06em}
        .ms-rec-main-more{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.25);font-size:18px;padding:0;line-height:1}
        .ms-rec-main-title{font-size:22px;font-weight:700;color:#e6edf3;line-height:1.3;margin-bottom:14px;letter-spacing:-0.02em}
        .ms-rec-main-desc{font-size:14px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:22px;max-width:500px}
        .ms-rec-main-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:6px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;background:#0078d4;color:#fff;text-decoration:none;transition:all 0.15s}
        .ms-rec-main-btn:hover{background:#006cc1}
        .ms-rec-side{background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:22px;display:flex;flex-direction:column;gap:14px}
        .ms-rec-side-title{font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}
        .ms-rec-side-item{display:flex;align-items:flex-start;gap:12px;padding:10px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:all 0.15s;text-decoration:none}
        .ms-rec-side-item:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.05)}
        .ms-rec-side-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .ms-rec-side-name{font-size:13.5px;font-weight:600;color:#e6edf3;margin-bottom:2px}
        .ms-rec-side-desc{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5}

        /* ── Section title ── */
        .ms-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:14px;text-transform:uppercase;letter-spacing:0.06em}

        /* ── Main feature cards (3 columns like Microsoft) ── */
        .ms-feat-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px}

        /* Card 1 — Big left card like Teams */
        .ms-feat-card{background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:22px;position:relative;display:flex;flex-direction:column}
        .ms-feat-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
        .ms-feat-card-name{font-size:13px;font-weight:600;color:rgba(255,255,255,0.5)}
        .ms-feat-card-more{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.25);font-size:16px;padding:0}
        .ms-feat-card-title{font-size:20px;font-weight:700;color:#e6edf3;line-height:1.3;margin-bottom:12px;letter-spacing:-0.02em}
        .ms-feat-card-desc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.65;margin-bottom:16px;flex:1}
        .ms-feat-status-list{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
        .ms-feat-status-item{display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(255,255,255,0.55)}
        .ms-feat-status-dot{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:700}
        .ms-feat-status-dot.ok{background:rgba(0,200,150,0.2);color:#00c896}
        .ms-feat-status-dot.warn{background:rgba(245,158,11,0.2);color:#f59e0b}
        .ms-feat-status-dot.info{background:rgba(0,120,212,0.2);color:#4da6ff}
        .ms-feat-btns{display:flex;gap:8px;flex-wrap:wrap}
        .ms-feat-btn{padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
        .ms-feat-btn.primary{background:rgba(0,120,212,0.15);color:#4da6ff;border:1px solid rgba(0,120,212,0.25)}
        .ms-feat-btn.primary:hover{background:rgba(0,120,212,0.25)}
        .ms-feat-btn.ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .ms-feat-btn.ghost:hover{background:rgba(255,255,255,0.08);color:#e6edf3}

        /* Card 2 — Middle card */
        .ms-feat-card-mid-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:10px;letter-spacing:-0.02em}
        .ms-feat-card-mid-desc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.65;margin-bottom:16px;flex:1}

        /* Card 3 — Right data card */
        .ms-data-row{margin-bottom:14px}
        .ms-data-lbl{font-size:12px;color:rgba(255,255,255,0.35);margin-bottom:4px}
        .ms-data-val{font-size:20px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .ms-data-sub{font-size:12px;color:rgba(255,255,255,0.3);margin-top:2px}
        .ms-data-link{font-size:13px;color:#4da6ff;text-decoration:none;display:inline-flex;align-items:center;gap:5px;margin-top:8px}
        .ms-data-link:hover{text-decoration:underline}
        .ms-bar-chart{display:flex;gap:3px;height:6px;border-radius:100px;overflow:hidden;margin-top:8px}
        .ms-bar-seg{height:100%;border-radius:100px}

        /* Second row cards */
        .ms-feat-grid2{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}
        .ms-small-card{background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px}
        .ms-small-card-title{font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
        .ms-small-card-more{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.25);font-size:16px;padding:0}
        .ms-small-list{display:flex;flex-direction:column;gap:10px}
        .ms-small-item{display:flex;align-items:center;gap:12px;padding:8px;border-radius:6px;background:rgba(255,255,255,0.02);cursor:pointer;transition:background 0.1s;text-decoration:none}
        .ms-small-item:hover{background:rgba(255,255,255,0.05)}
        .ms-small-item-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .ms-small-item-title{font-size:13.5px;font-weight:500;color:#e6edf3;margin-bottom:1px}
        .ms-small-item-sub{font-size:12px;color:rgba(255,255,255,0.3)}
        .ms-progress{height:6px;background:rgba(255,255,255,0.06);border-radius:100px;overflow:hidden;margin-top:6px}
        .ms-progress-fill{height:100%;border-radius:100px;transition:width 0.6s ease}

        @media(max-width:1100px){.ms-feat-grid,.ms-feat-grid2{grid-template-columns:1fr 1fr}.ms-rec-hero{grid-template-columns:1fr}}
        @media(max-width:768px){.ms-feat-grid,.ms-feat-grid2{grid-template-columns:1fr}.ms-bar{display:none}}
        @media(max-width:500px){.ms-rec-hero{grid-template-columns:1fr}}
      `}</style>

      {/* ── Barre d'actions rapides (comme Microsoft) ── */}
      <div className="ms-bar">
        <button className="ms-bar-btn" style={{color:'#e6edf3'}}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
          Affichage du tableau de bord
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
        </button>
        <div className="ms-bar-sep"/>
        <Link to="/agence/biens" className="ms-bar-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Ajouter un bien
        </Link>
        <div className="ms-bar-sep"/>
        <Link to="/agence/locataires" className="ms-bar-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>
          Ajouter un locataire
        </Link>
        <div className="ms-bar-sep"/>
        <Link to="/agence/paiements" className="ms-bar-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>
          Enregistrer un paiement
        </Link>
        <div className="ms-bar-sep"/>
        <Link to="/agence/baux" className="ms-bar-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
          Créer un bail
        </Link>
        <div className="ms-bar-sep"/>
        <button className="ms-bar-btn">··· Autres actions</button>
        <div className="ms-bar-right">{agence?.nom || 'Mon agence'}</div>
      </div>

      {/* ── Tabs recommandations ── */}
      <div className="ms-rec-tabs">
        <button className={`ms-rec-tab ${recTab==='recommandes'?'active':''}`} onClick={()=>setRecTab('recommandes')}>
          Recommandés pour vous
        </button>
        <button className={`ms-rec-tab ${recTab==='avis'?'active':''}`} onClick={()=>setRecTab('avis')}>
          Donnez votre avis
        </button>
        <button className="ms-rec-tab-more">···</button>
      </div>

      {/* ── Hero card ── */}
      <div className="ms-rec-hero">
        <div className="ms-rec-main">
          <div className="ms-rec-main-top">
            <div className="ms-rec-main-tag">Recommandé pour vous</div>
            <button className="ms-rec-main-more">···</button>
          </div>
          <div className="ms-rec-main-title">
            Activez les paiements automatiques<br/>pour vos locataires
          </div>
          <div className="ms-rec-main-desc">
            Connectez Mobile Money (MTN MoMo, Moov Money, Wave) pour recevoir les loyers automatiquement chaque mois. Réduisez les retards de paiement de 70% et gagnez du temps sur la relance.
          </div>
          <Link to="/agence/integrations" className="ms-rec-main-btn">
            Afficher la recommandation
          </Link>
        </div>
        <div className="ms-rec-side">
          <div className="ms-rec-side-title">Accès rapides</div>
          {[
            { icon:'🏠', color:'rgba(0,120,212,0.15)', name:'Gestion des biens', desc:'Ajoutez et gérez vos propriétés', path:'/agence/biens' },
            { icon:'👥', color:'rgba(108,99,255,0.15)', name:'Locataires', desc:'Profils et historiques complets', path:'/agence/locataires' },
            { icon:'📊', color:'rgba(0,200,150,0.15)', name:'Rapports & Analyses', desc:'Revenus, occupation, performance', path:'/agence/rapports' },
          ].map((item,i) => (
            <Link key={i} to={item.path} className="ms-rec-side-item">
              <div className="ms-rec-side-icon" style={{background:item.color}}>{item.icon}</div>
              <div>
                <div className="ms-rec-side-name">{item.name}</div>
                <div className="ms-rec-side-desc">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Fonctions principales (3 colonnes comme Microsoft) ── */}
      <div className="ms-section-title">Fonctions principales</div>
      <div className="ms-feat-grid">

        {/* Card 1 — Gestion des biens (comme Teams) */}
        <div className="ms-feat-card">
          <div className="ms-feat-card-top">
            <span className="ms-feat-card-name">Gestion des biens</span>
            <button className="ms-feat-card-more">···</button>
          </div>
          <div className="ms-feat-card-title">
            Gérez tout votre patrimoine immobilier en un seul endroit
          </div>
          <div className="ms-feat-card-desc">
            Ajoutez vos biens, suivez leur statut en temps réel et optimisez votre taux d'occupation.
          </div>
          <div className="ms-feat-status-list">
            <div className="ms-feat-status-item">
              <div className={`ms-feat-status-dot ${biens.length > 0 ? 'ok' : 'info'}`}>{biens.length > 0 ? '✓' : 'i'}</div>
              <span>{biens.length > 0 ? `${biens.length} bien${biens.length > 1 ? 's' : ''} enregistré${biens.length > 1 ? 's' : ''}` : 'Aucun bien ajouté pour le moment'}</span>
            </div>
            <div className="ms-feat-status-item">
              <div className={`ms-feat-status-dot ${bienOccupes > 0 ? 'ok' : 'warn'}`}>{bienOccupes > 0 ? '✓' : '!'}</div>
              <span>{bienOccupes} bien{bienOccupes > 1 ? 's' : ''} occupé{bienOccupes > 1 ? 's' : ''} — Taux d'occupation : {tauxOcc}%</span>
            </div>
            <div className="ms-feat-status-item">
              <div className={`ms-feat-status-dot ${bienLibres > 0 ? 'info' : 'ok'}`}>{bienLibres > 0 ? 'i' : '✓'}</div>
              <span>{bienLibres} bien{bienLibres > 1 ? 's' : ''} libre{bienLibres > 1 ? 's' : ''} — {bienLibres > 0 ? 'À louer' : 'Tout est occupé'}</span>
            </div>
          </div>
          <div className="ms-feat-btns">
            <Link to="/agence/biens" className="ms-feat-btn primary">Gérer les biens</Link>
            <Link to="/agence/biens" className="ms-feat-btn ghost">Ajouter un bien</Link>
          </div>
        </div>

        {/* Card 2 — Gestion des locataires (comme Gestion utilisateurs) */}
        <div className="ms-feat-card">
          <div className="ms-feat-card-top">
            <span className="ms-feat-card-name">Gestion des locataires</span>
            <button className="ms-feat-card-more">···</button>
          </div>
          <div className="ms-feat-card-mid-title">Gestion des locataires</div>
          <div className="ms-feat-card-mid-desc">
            Ajoutez, modifiez et gérez les dossiers de vos locataires. Suivez leur historique de paiements et leurs baux en cours.
          </div>
          <div className="ms-feat-status-list">
            <div className="ms-feat-status-item">
              <div className={`ms-feat-status-dot ${locataires.length > 0 ? 'ok' : 'info'}`}>{locataires.length > 0 ? '✓' : 'i'}</div>
              <span>{locataires.length} locataire{locataires.length > 1 ? 's' : ''} enregistré{locataires.length > 1 ? 's' : ''}</span>
            </div>
            <div className="ms-feat-status-item">
              <div className={`ms-feat-status-dot ${stats.retards === 0 ? 'ok' : 'warn'}`}>{stats.retards === 0 ? '✓' : '!'}</div>
              <span>{stats.retards === 0 ? 'Aucun loyer en retard' : `${stats.retards} loyer${stats.retards > 1 ? 's' : ''} en retard`}</span>
            </div>
          </div>
          <div className="ms-feat-btns">
            <Link to="/agence/locataires" className="ms-feat-btn primary">Voir les locataires</Link>
            <Link to="/agence/locataires" className="ms-feat-btn ghost">Ajouter un locataire</Link>
          </div>
        </div>

        {/* Card 3 — Facturation (comme Facturation Microsoft) */}
        <div className="ms-feat-card">
          <div className="ms-feat-card-top">
            <span className="ms-feat-card-name">Facturation & Paiements</span>
            <button className="ms-feat-card-more">···</button>
          </div>
          <div className="ms-data-row">
            <div className="ms-data-lbl">Revenus encaissés ce mois</div>
            <div className="ms-data-val" style={{color:'#00c896'}}>{stats.revenus.toLocaleString()} FCFA</div>
            <div className="ms-data-sub">Abonnement actif : Plan Standard</div>
          </div>
          <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'14px 0'}}/>
          <div className="ms-data-row">
            <div className="ms-data-lbl">Loyers en attente ce mois</div>
            <div className="ms-data-val" style={{color: stats.retards > 0 ? '#ef4444' : '#e6edf3', fontSize:16}}>{stats.retards} loyer{stats.retards > 1 ? 's' : ''} en retard</div>
          </div>
          <div className="ms-bar-chart" style={{marginBottom:14}}>
            <div className="ms-bar-seg" style={{width:`${tauxOcc}%`,background:'#0078d4'}}/>
            <div className="ms-bar-seg" style={{flex:1,background:'rgba(255,255,255,0.06)'}}/>
          </div>
          <div className="ms-feat-btns">
            <Link to="/agence/paiements" className="ms-feat-btn primary">Voir les paiements</Link>
            <Link to="/agence/abonnement" className="ms-feat-btn ghost">Mon abonnement</Link>
          </div>
        </div>
      </div>

      {/* ── 2e ligne — Formation, guides et rapports ── */}
      <div className="ms-feat-grid2">

        {/* Formation & guides */}
        <div className="ms-small-card">
          <div className="ms-small-card-title">
            Formation, guides et assistance
            <button className="ms-small-card-more">···</button>
          </div>
          <div className="ms-small-list">
            {[
              { icon:'📹', color:'rgba(0,120,212,0.15)', title:"Guide de démarrage rapide", sub:"Configurez votre agence en 5 étapes" },
              { icon:'📘', color:'rgba(108,99,255,0.15)', title:"Guides d'administration avancés", sub:"Gestion multi-biens, rapports, exports" },
              { icon:'🎓', color:'rgba(0,200,150,0.15)', title:"Formation pour les agents", sub:"Utilisez Imoloc efficacement au quotidien" },
            ].map((item,i) => (
              <div key={i} className="ms-small-item">
                <div className="ms-small-item-icon" style={{background:item.color}}>{item.icon}</div>
                <div>
                  <div className="ms-small-item-title">{item.title}</div>
                  <div className="ms-small-item-sub">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Applications Imoloc */}
        <div className="ms-small-card">
          <div className="ms-small-card-title">
            Applications Imoloc
            <button className="ms-small-card-more">···</button>
          </div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:14}}>Modules actifs sur votre plan Standard</div>
          {[
            { name:'Gestion des biens', active:true, pct:100 },
            { name:'Gestion des locataires', active:true, pct:100 },
            { name:'Paiements & Loyers', active:true, pct:100 },
            { name:'Signature électronique', active:false, pct:0 },
            { name:'Application mobile locataires', active:false, pct:0 },
          ].map((app,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,gap:12}}>
              <span style={{fontSize:13,color: app.active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'}}>{app.name}</span>
              <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:'100px',background: app.active ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.05)',color: app.active ? '#00c896' : 'rgba(255,255,255,0.25)',flexShrink:0}}>{app.active ? 'Actif' : 'Upgrade'}</span>
            </div>
          ))}
          <Link to="/agence/abonnement" className="ms-data-link" style={{marginTop:12}}>
            Voir mon abonnement →
          </Link>
        </div>

        {/* Statistiques rapides */}
        <div className="ms-small-card">
          <div className="ms-small-card-title">
            Statistiques de l'organisation
            <button className="ms-small-card-more">···</button>
          </div>
          {[
            { lbl:'Biens gérés', val:stats.biens, max:100, color:'#0078d4' },
            { lbl:'Locataires actifs', val:stats.locataires, max:100, color:'#6c63ff' },
            { lbl:"Taux d'occupation", val:tauxOcc, max:100, color:'#00c896', suffix:'%' },
            { lbl:'Loyers en retard', val:stats.retards, max:10, color:'#ef4444' },
          ].map((s,i) => (
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:12.5,color:'rgba(255,255,255,0.45)'}}>{s.lbl}</span>
                <span style={{fontSize:13,fontWeight:700,color:s.color}}>{s.val}{s.suffix||''}</span>
              </div>
              <div className="ms-progress">
                <div className="ms-progress-fill" style={{width:`${Math.min((s.val/s.max)*100,100)}%`,background:s.color}}/>
              </div>
            </div>
          ))}
          <Link to="/agence/rapports" className="ms-data-link">
            Voir tous les rapports →
          </Link>
        </div>
      </div>
    </>
  )
}
