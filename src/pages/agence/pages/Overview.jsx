import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const QUICK_ACTIONS = [
  { icon: '⊞', label: 'Affichage simplifié', active: true },
  { icon: '+', label: 'Ajouter un bien', path: '/agence/biens' },
  { icon: '👤', label: 'Ajouter un locataire', path: '/agence/locataires' },
  { icon: '💳', label: 'Enregistrer un paiement', path: '/agence/paiements' },
  { icon: '📄', label: 'Créer un bail', path: '/agence/baux' },
  { icon: '···', label: 'Autres actions' },
]

const RECO_CARDS = [
  {
    icon: '🏠',
    title: 'Optimisez vos loyers',
    desc: 'Analysez le marché local et ajustez vos prix. Augmentez vos revenus jusqu\'à 15%.',
    action: 'Voir l\'analyse',
    color: '#0078d4',
  },
  {
    icon: '📱',
    title: 'Activez les paiements mobiles',
    desc: 'Intégrez Mobile Money pour recevoir les loyers automatiquement via MTN ou Moov.',
    action: 'Configurer',
    color: '#00c896',
  },
  {
    icon: '✍️',
    title: 'Signature électronique',
    desc: 'Signez vos baux en ligne. Économisez du temps et sécurisez vos contrats.',
    action: 'En savoir plus',
    color: '#6c63ff',
  },
]

const ORG_TABS = ['Biens', 'Locataires', 'Paiements', 'Baux', 'Configuration']

export default function Overview() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ biens: 0, locataires: 0, paiements: 0, retards: 0 })
  const [agence, setAgence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Biens')
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [paiements, setPaiements] = useState([])

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
          setStats({
            biens: bData.length, locataires: lData.length,
            paiements: pData.filter(x => x.statut === 'payé').length,
            retards: pData.filter(x => x.statut === 'retard').length,
          })
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    init()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const nom = profile?.nom ? `${profile.prenom || ''} ${profile.nom}`.trim().toUpperCase() : 'ADMIN'

  return (
    <>
      <style>{`
        .ov2-topbar{display:flex;align-items:center;gap:4px;margin-bottom:28px;flex-wrap:wrap;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:6px 10px}
        .ov2-qa{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.5);transition:all 0.1s;text-decoration:none;white-space:nowrap}
        .ov2-qa:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .ov2-qa.active{color:#e6edf3}
        .ov2-qa-sep{width:1px;height:20px;background:rgba(255,255,255,0.08);margin:0 2px;flex-shrink:0}
        .ov2-greeting{margin-bottom:28px}
        .ov2-g-title{font-size:24px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:6px}
        .ov2-g-sub{font-size:13.5px;color:rgba(255,255,255,0.38);line-height:1.6;max-width:700px}
        .ov2-reco{margin-bottom:32px}
        .ov2-reco-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
        .ov2-reco-link{font-size:13px;color:#4da6ff;text-decoration:none;font-weight:400}
        .ov2-reco-link:hover{text-decoration:underline}
        .ov2-reco-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .ov2-reco-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:20px;position:relative;overflow:hidden;transition:all 0.2s;cursor:pointer}
        .ov2-reco-card:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-2px)}
        .ov2-reco-more{position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.25);font-size:16px;padding:0}
        .ov2-reco-icon{font-size:24px;margin-bottom:12px}
        .ov2-reco-card-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:6px}
        .ov2-reco-desc{font-size:13px;color:rgba(255,255,255,0.38);line-height:1.6;margin-bottom:16px}
        .ov2-reco-action{font-size:13px;font-weight:500;text-decoration:none;display:inline-flex;align-items:center;gap:5px}
        .ov2-reco-action:hover{text-decoration:underline}
        .ov2-org{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;overflow:hidden}
        .ov2-org-title{font-size:15px;font-weight:600;color:#e6edf3;padding:18px 20px 0}
        .ov2-org-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.07);padding:0 20px;gap:0;margin-top:14px}
        .ov2-tab{padding:10px 16px;font-size:13.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.4);transition:all 0.15s;border-bottom:2px solid transparent;margin-bottom:-1px}
        .ov2-tab:hover{color:rgba(255,255,255,0.7)}
        .ov2-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .ov2-org-content{padding:20px}
        .ov2-table{width:100%;border-collapse:collapse}
        .ov2-table th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.07em;padding:8px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06)}
        .ov2-table td{padding:12px 12px;font-size:13.5px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04)}
        .ov2-table tr:last-child td{border-bottom:none}
        .ov2-table tr:hover td{background:rgba(255,255,255,0.02)}
        .ov2-empty-table{text-align:center;padding:40px;color:rgba(255,255,255,0.25);font-size:13.5px}
        .ov2-statut{padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
        .ov2-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .ov2-stat{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px 18px}
        .ov2-stat-val{font-size:24px;font-weight:700;color:#e6edf3;margin-bottom:2px}
        .ov2-stat-lbl{font-size:12px;color:rgba(255,255,255,0.35)}
        @media(max-width:1100px){.ov2-reco-grid{grid-template-columns:1fr 1fr}.ov2-stats-row{grid-template-columns:1fr 1fr}}
        @media(max-width:768px){.ov2-reco-grid{grid-template-columns:1fr}.ov2-stats-row{grid-template-columns:1fr 1fr}.ov2-topbar{display:none}}
        @media(max-width:500px){.ov2-stats-row{grid-template-columns:1fr}}
      `}</style>

      {/* Quick action bar */}
      <div className="ov2-topbar">
        {QUICK_ACTIONS.map((a, i) => (
          <span key={i}>
            {i > 0 && i < QUICK_ACTIONS.length && <div className="ov2-qa-sep"/>}
            {a.path ? (
              <Link to={a.path} className={`ov2-qa ${a.active ? 'active' : ''}`}>{a.icon} {a.label}</Link>
            ) : (
              <button className={`ov2-qa ${a.active ? 'active' : ''}`}>{a.icon} {a.label}</button>
            )}
          </span>
        ))}
      </div>

      {/* Greeting */}
      <div className="ov2-greeting">
        <div className="ov2-g-title">{greeting}, {nom}</div>
        <div className="ov2-g-sub">
          L'affichage simplifié vous permet de vous concentrer sur les tâches les plus courantes.
          {agence?.nom && <span style={{color:'rgba(255,255,255,0.6)',fontWeight:500}}> — {agence.nom}</span>}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="ov2-stats-row">
        {[
          { val: stats.biens, lbl: 'Biens gérés', color: '#0078d4', path: '/agence/biens' },
          { val: stats.locataires, lbl: 'Locataires actifs', color: '#6c63ff', path: '/agence/locataires' },
          { val: stats.paiements, lbl: 'Paiements reçus', color: '#00c896', path: '/agence/paiements' },
          { val: stats.retards, lbl: 'Loyers en retard', color: '#ef4444', path: '/agence/paiements' },
        ].map((s, i) => (
          <Link key={i} to={s.path} style={{textDecoration:'none'}}>
            <div className="ov2-stat" style={{borderColor: i===3&&stats.retards>0?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.07)'}}>
              <div className="ov2-stat-val" style={{color:s.color}}>{s.val}</div>
              <div className="ov2-stat-lbl">{s.lbl}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recommandations */}
      <div className="ov2-reco">
        <div className="ov2-reco-title">
          Pour les organisations semblables à la vôtre
          <a href="#" className="ov2-reco-link">Afficher plus</a>
        </div>
        <div className="ov2-reco-grid">
          {RECO_CARDS.map((c, i) => (
            <div key={i} className="ov2-reco-card">
              <button className="ov2-reco-more">···</button>
              <div className="ov2-reco-icon">{c.icon}</div>
              <div className="ov2-reco-card-title">{c.title}</div>
              <div className="ov2-reco-desc">{c.desc}</div>
              <a href="#" className="ov2-reco-action" style={{color:c.color}}>
                {c.action}
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Votre organisation */}
      <div className="ov2-org">
        <div className="ov2-org-title">Votre organisation</div>
        <div className="ov2-org-tabs">
          {ORG_TABS.map(tab => (
            <button key={tab} className={`ov2-tab ${activeTab===tab?'active':''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
        <div className="ov2-org-content">
          {activeTab === 'Biens' && (
            loading ? <div className="ov2-empty-table">Chargement...</div> :
            biens.length === 0 ? (
              <div className="ov2-empty-table">
                Aucun bien ajouté.
                <Link to="/agence/biens" style={{color:'#4da6ff',marginLeft:8}}>Ajouter un bien →</Link>
              </div>
            ) : (
              <table className="ov2-table">
                <thead><tr><th>Nom</th><th>Type</th><th>Ville</th><th>Loyer</th><th>Statut</th></tr></thead>
                <tbody>
                  {biens.slice(0,6).map((b,i) => (
                    <tr key={i}>
                      <td style={{fontWeight:500,color:'#e6edf3'}}>{b.nom}</td>
                      <td>{b.type}</td>
                      <td>{b.ville || '—'}</td>
                      <td style={{color:'#0078d4',fontWeight:600}}>{Number(b.loyer||0).toLocaleString()} FCFA</td>
                      <td><span className="ov2-statut" style={{background:b.statut==='libre'?'rgba(0,200,150,0.1)':b.statut==='occupé'?'rgba(0,120,212,0.1)':'rgba(245,158,11,0.1)',color:b.statut==='libre'?'#00c896':b.statut==='occupé'?'#0078d4':'#f59e0b'}}>{b.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {activeTab === 'Locataires' && (
            loading ? <div className="ov2-empty-table">Chargement...</div> :
            locataires.length === 0 ? (
              <div className="ov2-empty-table">
                Aucun locataire.
                <Link to="/agence/locataires" style={{color:'#4da6ff',marginLeft:8}}>Ajouter un locataire →</Link>
              </div>
            ) : (
              <table className="ov2-table">
                <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Profession</th><th>Ajouté le</th></tr></thead>
                <tbody>
                  {locataires.slice(0,6).map((l,i) => (
                    <tr key={i}>
                      <td style={{fontWeight:500,color:'#e6edf3'}}>{l.prenom} {l.nom}</td>
                      <td>{l.email || '—'}</td>
                      <td>{l.telephone || '—'}</td>
                      <td>{l.profession || '—'}</td>
                      <td>{l.created_at ? new Date(l.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {activeTab === 'Paiements' && (
            loading ? <div className="ov2-empty-table">Chargement...</div> :
            paiements.length === 0 ? (
              <div className="ov2-empty-table">
                Aucun paiement.
                <Link to="/agence/paiements" style={{color:'#4da6ff',marginLeft:8}}>Enregistrer un paiement →</Link>
              </div>
            ) : (
              <table className="ov2-table">
                <thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Statut</th></tr></thead>
                <tbody>
                  {paiements.slice(0,6).map((p,i) => (
                    <tr key={i}>
                      <td>{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                      <td style={{fontWeight:600,color:'#00c896'}}>{Number(p.montant||0).toLocaleString()} FCFA</td>
                      <td>{p.mode || '—'}</td>
                      <td><span className="ov2-statut" style={{background:p.statut==='payé'?'rgba(0,200,150,0.1)':p.statut==='retard'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',color:p.statut==='payé'?'#00c896':p.statut==='retard'?'#ef4444':'#f59e0b'}}>{p.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {(activeTab === 'Baux' || activeTab === 'Configuration') && (
            <div className="ov2-empty-table">
              {activeTab === 'Baux' ? (
                <span>Aucun bail créé. <Link to="/agence/baux" style={{color:'#4da6ff'}}>Créer un bail →</Link></span>
              ) : (
                <span>Paramètres de votre organisation. <Link to="/agence/organisation" style={{color:'#4da6ff'}}>Configurer →</Link></span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
