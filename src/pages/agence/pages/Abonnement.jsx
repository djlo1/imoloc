import { useState } from 'react'
import { Link } from 'react-router-dom'

const FACTURES = [
  { id:'IMO-2026-003', date:'28/03/2026', periode:'27/03/2026', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/03/2026' },
  { id:'IMO-2026-002', date:'28/02/2026', periode:'27/02/2026', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/02/2026' },
  { id:'IMO-2026-001', date:'14/02/2026', periode:'13/02/2026', profil:'Mon organisation', montant:'0', statut:'gratuit', statut_date:'Aucun paiement requis' },
  { id:'IMO-2025-012', date:'28/01/2026', periode:'27/01/2026', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/01/2026' },
  { id:'IMO-2025-011', date:'28/11/2025', periode:'27/11/2025', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/11/2025' },
  { id:'IMO-2025-010', date:'28/10/2025', periode:'27/10/2025', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/10/2025' },
]

const MODES_PAIEMENT = [
  { type:'Mobile Money', detail:'MTN MoMo · ****1234', expiration:'N/A', statut:'Actif', defaut:true },
]

const STATUT_CONFIG = {
  payé: { color:'#00c896', bg:'rgba(0,200,150,0.1)', icon:'✓' },
  gratuit: { color:'#0078d4', bg:'rgba(0,120,212,0.1)', icon:'i' },
  annulé: { color:'#ef4444', bg:'rgba(239,68,68,0.1)', icon:'×' },
  'en attente': { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', icon:'!' },
}

export default function Abonnement() {
  const [activeTab, setActiveTab] = useState('factures')
  const [selectedRows, setSelectedRows] = useState([])
  const [filterEtat, setFilterEtat] = useState('Tout')
  const [filterPeriode, setFilterPeriode] = useState('12 derniers mois')
  const [filterOpen, setFilterOpen] = useState(null)

  const totalFactures = FACTURES.length
  const totalDu = FACTURES.filter(f=>f.statut==='en attente').reduce((s,f)=>s+Number(f.montant.replace(' ','')),0)

  const toggleRow = (id) => setSelectedRows(p=>p.includes(id)?p.filter(r=>r!==id):[...p,id])
  const toggleAll = () => setSelectedRows(s=>s.length===FACTURES.length?[]:FACTURES.map(f=>f.id))

  const filtered = FACTURES.filter(f => filterEtat==='Tout' || f.statut===filterEtat.toLowerCase())

  return (
    <>
      <style>{`
        .ab2-breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .ab2-breadcrumb a{color:rgba(255,255,255,0.4);text-decoration:none}
        .ab2-breadcrumb a:hover{color:#4da6ff;text-decoration:underline}
        .ab2-breadcrumb-sep{color:rgba(255,255,255,0.2)}
        .ab2-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}
        .ab2-title{font-size:24px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .ab2-head-link{font-size:13px;color:#4da6ff;text-decoration:none;display:flex;align-items:center;gap:6px}
        .ab2-head-link:hover{text-decoration:underline}
        .ab2-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:24px}
        .ab2-tab{padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s}
        .ab2-tab:hover{color:rgba(255,255,255,0.75)}
        .ab2-tab.active{color:#e6edf3;border-bottom-color:#0078d4}

        /* Info box */
        .ab2-info-box{display:flex;gap:10px;padding:14px 16px;border-radius:6px;background:rgba(0,120,212,0.07);border:1px solid rgba(0,120,212,0.2);margin-bottom:20px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65}
        .ab2-account{margin-bottom:20px}
        .ab2-account-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:6px}
        .ab2-account-sub{font-size:13px;color:rgba(255,255,255,0.45);display:flex;align-items:center;gap:6px}
        .ab2-account-link{color:#4da6ff;text-decoration:none;font-size:13px}
        .ab2-account-link:hover{text-decoration:underline}

        /* Stats */
        .ab2-stats{display:flex;gap:32px;margin-bottom:22px;padding:16px 0;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06)}
        .ab2-stat{display:flex;flex-direction:column;gap:4px}
        .ab2-stat-lbl{font-size:12px;color:rgba(255,255,255,0.4);font-weight:500}
        .ab2-stat-val{font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}

        /* Toolbar */
        .ab2-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .ab2-tool-btn{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap}
        .ab2-tool-btn:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .ab2-tool-sep{width:1px;height:24px;background:rgba(255,255,255,0.08)}
        .ab2-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto;min-width:200px}
        .ab2-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13px;color:#e6edf3;width:100%}
        .ab2-search input::placeholder{color:rgba(255,255,255,0.25)}

        /* Filters */
        .ab2-filters{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .ab2-filter-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(0,120,212,0.3);background:rgba(0,120,212,0.1);color:#4da6ff;transition:all 0.15s}
        .ab2-filter-chip:hover{background:rgba(0,120,212,0.18)}

        /* Table */
        .ab2-table-wrap{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;overflow:hidden}
        .ab2-table{width:100%;border-collapse:collapse}
        .ab2-table th{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);padding:11px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);white-space:nowrap}
        .ab2-table th:first-child{width:44px;text-align:center}
        .ab2-table td{padding:13px 14px;font-size:13.5px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .ab2-table tr:last-child td{border-bottom:none}
        .ab2-table tr:hover td{background:rgba(255,255,255,0.02)}
        .ab2-table td:first-child{text-align:center}
        .ab2-checkbox{width:16px;height:16px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;margin:0 auto}
        .ab2-checkbox.checked{background:#0078d4;border-color:#0078d4}
        .ab2-facture-id{color:#4da6ff;text-decoration:none;font-weight:500;font-size:13.5px}
        .ab2-facture-id:hover{text-decoration:underline}
        .ab2-statut-badge{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500}
        .ab2-statut-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .ab2-download-btn{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:4px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);font-family:'Inter',sans-serif;transition:all 0.15s;text-decoration:none}
        .ab2-download-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .ab2-more-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:4px 6px;border-radius:4px;font-size:16px;transition:all 0.1s}
        .ab2-more-btn:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .ab2-sort-btn{display:inline-flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;font-family:'Inter',sans-serif;padding:0;transition:color 0.1s}
        .ab2-sort-btn:hover{color:rgba(255,255,255,0.7)}

        /* Méthodes de paiement */
        .ab2-section-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:6px;letter-spacing:-0.01em}
        .ab2-section-sub{font-size:13.5px;color:rgba(255,255,255,0.4);margin-bottom:20px;line-height:1.6}
        .ab2-pm-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .ab2-pm-table-wrap{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;overflow:hidden;margin-bottom:32px}
        .ab2-pm-empty{text-align:center;padding:40px;color:rgba(255,255,255,0.3)}
        .ab2-pm-empty-title{font-size:15px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:8px}
        .ab2-pm-empty-sub{font-size:13.5px}
        .ab2-pm-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:16px;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.04)}
        .ab2-pm-row:last-child{border-bottom:none}
        .ab2-pm-head{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:16px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .ab2-pm-head-lbl{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4)}
        .ab2-pm-icon{display:inline-flex;align-items:center;gap:8px}
        .ab2-pm-card{background:#1a73e8;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:3px}
        .ab2-badge-actif{padding:3px 10px;border-radius:100px;font-size:11.5px;font-weight:600;background:rgba(0,200,150,0.1);color:#00c896}
        .ab2-defaut-badge{padding:2px 8px;border-radius:100px;font-size:10.5px;font-weight:600;background:rgba(0,120,212,0.1);color:#4da6ff;border:1px solid rgba(0,120,212,0.2)}

        @media(max-width:1100px){.ab2-table{display:block;overflow-x:auto}}
        @media(max-width:768px){.ab2-stats{flex-direction:column;gap:16px}.ab2-toolbar{flex-direction:column;align-items:stretch}.ab2-search{margin-left:0}}
      `}</style>

      {/* Breadcrumb */}
      <div className="ab2-breadcrumb">
        <Link to="/agence" className="">Accueil</Link>
        <span className="ab2-breadcrumb-sep">›</span>
        <span style={{color:'rgba(255,255,255,0.65)'}}>Factures et paiements</span>
      </div>

      {/* Titre */}
      <div className="ab2-head">
        <div className="ab2-title">Factures et paiements</div>
        <a href="#" className="ab2-head-link">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
          Découvrez plus d'informations sur la nouvelle expérience de facturation.
        </a>
      </div>

      {/* Tabs */}
      <div className="ab2-tabs">
        <button className={`ab2-tab ${activeTab==='factures'?'active':''}`} onClick={()=>setActiveTab('factures')}>Factures</button>
        <button className={`ab2-tab ${activeTab==='modes'?'active':''}`} onClick={()=>setActiveTab('modes')}>Méthodes de paiement</button>
      </div>

      {/* ══ ONGLET FACTURES ══ */}
      {activeTab === 'factures' && (
        <>
          {/* Compte de facturation */}
          <div className="ab2-account">
            <div className="ab2-account-title">Affichage du compte de facturation</div>
            <div className="ab2-account-sub">
              Factures connectées à
              <a href="#" className="ab2-account-link" style={{margin:'0 4px'}}>Mon organisation ↗</a>
              (Imoloc)
            </div>
          </div>

          {/* Info box */}
          <div className="ab2-info-box">
            <svg width="15" height="15" fill="none" stroke="#4da6ff" strokeWidth="1.5" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:2}}>
              <path strokeLinecap="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
            </svg>
            <div>
              Imoloc met à jour son calendrier de facturation. Vos factures sont générées automatiquement à chaque renouvellement de votre abonnement.
              <a href="#" style={{color:'#4da6ff',marginLeft:4}}>En savoir plus sur ce changement.</a>
            </div>
          </div>

          {/* Stats */}
          <div className="ab2-stats">
            <div className="ab2-stat">
              <span className="ab2-stat-lbl">Total des factures</span>
              <span className="ab2-stat-val">{totalFactures}</span>
            </div>
            <div style={{width:'1px',background:'rgba(255,255,255,0.07)'}}/>
            <div className="ab2-stat">
              <span className="ab2-stat-lbl">Montant dû</span>
              <span className="ab2-stat-val">{totalDu.toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ab2-toolbar">
            <button className="ab2-tool-btn">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              Actualiser
            </button>
            <button className="ab2-tool-btn">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Exporter vers un fichier CSV
            </button>
            <button className="ab2-tool-btn" disabled style={{opacity:0.4,cursor:'not-allowed'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Télécharger
            </button>
            <div className="ab2-tool-sep"/>
            <button className="ab2-tool-btn" disabled style={{opacity:0.4,cursor:'not-allowed'}}>Gérer l'accès</button>
            <div className="ab2-search">
              <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
              <input placeholder="Rechercher"/>
            </div>
          </div>

          {/* Filtres actifs */}
          <div className="ab2-filters">
            {[
              { label:`État: ${filterEtat}` },
              { label:'Profil de facturation: Tout' },
              { label:`Durée: ${filterPeriode}` },
            ].map((f,i) => (
              <div key={i} className="ab2-filter-chip">
                {f.label}
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="ab2-table-wrap">
            <table className="ab2-table">
              <thead>
                <tr>
                  <th>
                    <div className={`ab2-checkbox ${selectedRows.length===FACTURES.length?'checked':''}`} onClick={toggleAll}>
                      {selectedRows.length===FACTURES.length&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    </div>
                  </th>
                  <th><button className="ab2-sort-btn">ID de facture <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"/></svg></button></th>
                  <th><button className="ab2-sort-btn">Date de facture <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"/></svg></button></th>
                  <th><button className="ab2-sort-btn">Période de facturation <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"/></svg></button></th>
                  <th>Profil de facturation</th>
                  <th><button className="ab2-sort-btn">Montant total <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"/></svg></button></th>
                  <th><button className="ab2-sort-btn">État <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"/></svg></button></th>
                  <th>Télécharger la facture</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f,i) => {
                  const sc = STATUT_CONFIG[f.statut] || STATUT_CONFIG['en attente']
                  const isSelected = selectedRows.includes(f.id)
                  return (
                    <tr key={i}>
                      <td>
                        <div className={`ab2-checkbox ${isSelected?'checked':''}`} onClick={()=>toggleRow(f.id)}>
                          {isSelected&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      </td>
                      <td><a href="#" className="ab2-facture-id">{f.id}</a></td>
                      <td>{f.date}</td>
                      <td>{f.periode}</td>
                      <td style={{color:'#4da6ff'}}>{f.profil}</td>
                      <td style={{fontWeight:600,color:'#e6edf3'}}>
                        {f.montant==='0' ? '0,00 FCFA' : `${f.montant} FCFA`}
                      </td>
                      <td>
                        <div className="ab2-statut-badge">
                          <div className="ab2-statut-dot" style={{background:sc.color}}/>
                          <span style={{color:sc.color,fontWeight:500}}>{f.statut_date}</span>
                        </div>
                      </td>
                      <td>
                        {f.montant !== '0' ? (
                          <a href="#" className="ab2-download-btn">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                            Télécharger
                          </a>
                        ) : <span style={{color:'rgba(255,255,255,0.2)',fontSize:12.5}}>N/A</span>}
                      </td>
                      <td>
                        <button className="ab2-more-btn">···</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ ONGLET MÉTHODES DE PAIEMENT ══ */}
      {activeTab === 'modes' && (
        <>
          <div className="ab2-account">
            <div className="ab2-account-title">Affichage du compte de facturation</div>
            <div className="ab2-account-sub">
              Modes de paiement connectés à
              <a href="#" className="ab2-account-link" style={{margin:'0 4px'}}>Mon organisation ↗</a>
              (Imoloc)
              <br/>
              <a href="#" className="ab2-account-link">Changer de compte de facturation</a>
            </div>
          </div>

          <a href="#" className="ab2-account-link" style={{display:'block',marginBottom:20}}>
            En savoir plus sur la gestion des modes de paiement.
          </a>

          {/* Vos modes de paiement */}
          <div className="ab2-section-title">Vos modes de paiement</div>
          <div className="ab2-section-sub">
            Voici les modes de paiement dont vous êtes propriétaire. Ils ne sont pas automatiquement affectés à un compte de facturation.
          </div>

          <div className="ab2-pm-toolbar">
            <button className="ab2-tool-btn" style={{borderStyle:'none',background:'none',paddingLeft:0}}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Ajouter une méthode de paiement
            </button>
            <button className="ab2-tool-btn" style={{borderStyle:'none',background:'none'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              Actualiser
            </button>
          </div>

          <div className="ab2-pm-table-wrap">
            <div className="ab2-pm-head">
              <span className="ab2-pm-head-lbl">Mode de paiement</span>
              <span className="ab2-pm-head-lbl">Date d'expiration ↓</span>
              <span className="ab2-pm-head-lbl">Statut d'expiration</span>
              <span className="ab2-pm-head-lbl">Type</span>
              <span/>
            </div>
            {MODES_PAIEMENT.length === 0 ? (
              <div className="ab2-pm-empty">
                <div className="ab2-pm-empty-title">Vous n'avez ajouté aucun mode de paiement</div>
                <div className="ab2-pm-empty-sub">Ajoutez un mode de paiement, puis vous pouvez l'afficher et le gérer ici.</div>
              </div>
            ) : MODES_PAIEMENT.map((m,i) => (
              <div key={i} className="ab2-pm-row">
                <div className="ab2-pm-icon">
                  <div style={{width:38,height:24,borderRadius:4,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>MOMO</div>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:500,color:'#e6edf3'}}>{m.detail}</div>
                    {m.defaut && <span className="ab2-defaut-badge">Par défaut</span>}
                  </div>
                </div>
                <div style={{fontSize:13.5,color:'rgba(255,255,255,0.5)'}}>{m.expiration}</div>
                <div><span className="ab2-badge-actif">{m.statut}</span></div>
                <div style={{fontSize:13.5,color:'rgba(255,255,255,0.5)'}}>Mobile Money</div>
                <button className="ab2-more-btn">···</button>
              </div>
            ))}
          </div>

          {/* Modes de paiement par défaut */}
          <div className="ab2-section-title">Modes de paiement par défaut – Mon organisation</div>
          <div className="ab2-section-sub">
            Vous pouvez remplacer les modes de paiement de ce compte de facturation en sélectionnant les points, puis en sélectionnant Remplacer.
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Filtres :</span>
            <div className="ab2-filter-chip" style={{fontSize:12}}>Profil de facturation: Tout</div>
          </div>

          <div className="ab2-pm-table-wrap">
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:16,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.02)'}}>
              {['Mode de paiement par défaut','Profil de facturation','Date d\'expiration ↓','Type',''].map((h,i)=>(
                <span key={i} style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>{h}</span>
              ))}
            </div>
            {MODES_PAIEMENT.map((m,i) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:16,padding:'14px 16px',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:38,height:24,borderRadius:4,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>MOMO</div>
                  <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500}}>{m.detail}</span>
                </div>
                <span style={{fontSize:13.5,color:'#4da6ff'}}>Mon organisation</span>
                <span style={{fontSize:13.5,color:'rgba(255,255,255,0.5)'}}>{m.expiration}</span>
                <span style={{fontSize:13.5,color:'rgba(255,255,255,0.5)'}}>Mobile Money</span>
                <button className="ab2-more-btn">···</button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
