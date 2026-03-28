import { useState } from 'react'
import { Link } from 'react-router-dom'

const FACTURES = [
  { id:'IMO-2026-003', date:'28/03/2026', periode:'27/03/2026', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/03/2026' },
  { id:'IMO-2026-002', date:'28/02/2026', periode:'27/02/2026', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/02/2026' },
  { id:'IMO-2026-001', date:'14/02/2026', periode:'13/02/2026', profil:'Mon organisation', montant:'0', statut:'gratuit', statut_date:'Aucun paiement requis' },
  { id:'IMO-2025-012', date:'28/01/2026', periode:'27/01/2026', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/01/2026' },
  { id:'IMO-2025-011', date:'28/11/2025', periode:'27/11/2025', profil:'Mon organisation', montant:'15 000', statut:'payé', statut_date:'Payé le 28/11/2025' },
]

const STATUT_CONFIG = {
  payé:{ color:'#00c896', bg:'rgba(0,200,150,0.1)' },
  gratuit:{ color:'#0078d4', bg:'rgba(0,120,212,0.1)' },
  annulé:{ color:'#ef4444', bg:'rgba(239,68,68,0.1)' },
  'en attente':{ color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
}

const CARD_LOGOS = [
  { name:'Visa', color:'#1a1f71', text:'VISA', textColor:'#fff' },
  { name:'Mastercard', color:'#eb001b', text:'MC', textColor:'#fff' },
  { name:'American Express', color:'#007bc1', text:'AMEX', textColor:'#fff' },
  { name:'Discover', color:'#f76F20', text:'DISC', textColor:'#fff' },
]

const MOBILE_MONEY = [
  { name:'MTN Mobile Money', pays:'Bénin, Togo, Côte d\'Ivoire, Ghana, Cameroun', icon:'📱', color:'#f59e0b' },
  { name:'Moov Money', pays:'Bénin, Togo, Côte d\'Ivoire, Niger, Burkina Faso', icon:'📱', color:'#0078d4' },
  { name:'Wave', pays:'Sénégal, Côte d\'Ivoire, Mali, Burkina Faso', icon:'📱', color:'#00c896' },
  { name:'Orange Money', pays:'Sénégal, Côte d\'Ivoire, Mali, Cameroun', icon:'📱', color:'#f97316' },
  { name:'Free Money', pays:'Sénégal', icon:'📱', color:'#6c63ff' },
]

const PAYS_LIST = ['Bénin','Togo','Côte d\'Ivoire','Sénégal','Cameroun','Ghana','Mali','Niger','Burkina Faso','Nigeria','France','Belgique','Suisse','Maroc','Tunisie']

export default function Abonnement() {
  const [activeTab, setActiveTab] = useState('factures')
  const [selectedRows, setSelectedRows] = useState([])
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [paymentType, setPaymentType] = useState('card') // 'card' | 'mobile'
  const [selectedMobile, setSelectedMobile] = useState(null)
  const [cardForm, setCardForm] = useState({
    nom:'', numero:'', mois:'', annee:'', cvv:'',
    adresse1:'', adresse2:'', ville:'', departement:'', code_postal:'', pays:'Bénin'
  })
  const setCard = (k,v) => setCardForm(f=>({...f,[k]:v}))
  const [mobileForm, setMobileForm] = useState({ numero:'', nom:'' })
  const setMob = (k,v) => setMobileForm(f=>({...f,[k]:v}))

  const totalFactures = FACTURES.length
  const totalDu = FACTURES.filter(f=>f.statut==='en attente').reduce((s,f)=>s+Number(f.montant.replace(' ','')),0)

  const toggleRow = (id) => setSelectedRows(p=>p.includes(id)?p.filter(r=>r!==id):[...p,id])
  const toggleAll = () => setSelectedRows(s=>s.length===FACTURES.length?[]:FACTURES.map(f=>f.id))

  const formatCard = (v) => v.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19)

  return (
    <>
      <style>{`
        .ab3-breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .ab3-breadcrumb a{color:rgba(255,255,255,0.4);text-decoration:none}
        .ab3-breadcrumb a:hover{color:#4da6ff;text-decoration:underline}
        .ab3-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:20px}
        .ab3-title{font-size:24px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .ab3-head-link{font-size:13px;color:#4da6ff;text-decoration:none;display:flex;align-items:center;gap:6px;flex-shrink:0;margin-top:6px}
        .ab3-head-link:hover{text-decoration:underline}
        .ab3-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:24px}
        .ab3-tab{padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s}
        .ab3-tab:hover{color:rgba(255,255,255,0.75)}
        .ab3-tab.active{color:#e6edf3;border-bottom-color:#0078d4}

        .ab3-desc{font-size:13.5px;color:rgba(255,255,255,0.45);line-height:1.75;margin-bottom:20px;max-width:900px}
        .ab3-link{color:#4da6ff;text-decoration:none}
        .ab3-link:hover{text-decoration:underline}

        .ab3-account{margin-bottom:16px}
        .ab3-account-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:6px}
        .ab3-account-sub{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.8}

        .ab3-info-box{display:flex;gap:10px;padding:14px 18px;border-radius:6px;background:rgba(0,120,212,0.07);border-left:3px solid #0078d4;margin-bottom:20px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;max-width:900px}
        .ab3-warn-box{display:flex;gap:10px;padding:14px 18px;border-radius:6px;background:rgba(0,120,212,0.04);border:1px solid rgba(0,120,212,0.15);margin-bottom:20px;font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;max-width:900px}

        .ab3-stats{display:flex;gap:0;margin-bottom:22px;border:1px solid rgba(255,255,255,0.07);border-radius:8px;overflow:hidden;max-width:400px}
        .ab3-stat{flex:1;padding:16px 22px;background:rgba(255,255,255,0.02)}
        .ab3-stat:first-child{border-right:1px solid rgba(255,255,255,0.07)}
        .ab3-stat-lbl{font-size:12px;color:rgba(255,255,255,0.4);font-weight:500;margin-bottom:6px}
        .ab3-stat-val{font-size:24px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}

        .ab3-toolbar{display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .ab3-tool-btn{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:4px;font-size:13px;font-weight:400;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap;text-decoration:none}
        .ab3-tool-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .ab3-tool-btn:disabled{opacity:0.35;cursor:not-allowed}
        .ab3-tool-sep{width:1px;height:22px;background:rgba(255,255,255,0.09)}
        .ab3-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto}
        .ab3-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13px;color:#e6edf3;width:180px}
        .ab3-search input::placeholder{color:rgba(255,255,255,0.25)}

        .ab3-filters{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .ab3-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(0,120,212,0.3);background:rgba(0,120,212,0.1);color:#4da6ff;transition:all 0.15s}
        .ab3-chip:hover{background:rgba(0,120,212,0.18)}

        .ab3-table-wrap{border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;margin-bottom:24px}
        .ab3-table{width:100%;border-collapse:collapse}
        .ab3-table th{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);white-space:nowrap}
        .ab3-table th:first-child{width:40px;text-align:center}
        .ab3-table td{padding:12px 14px;font-size:13.5px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .ab3-table tr:last-child td{border-bottom:none}
        .ab3-table tr:hover td{background:rgba(255,255,255,0.02)}
        .ab3-checkbox{width:16px;height:16px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;margin:0 auto}
        .ab3-checkbox.checked{background:#0078d4;border-color:#0078d4}
        .ab3-id{color:#4da6ff;text-decoration:none;font-weight:500}
        .ab3-id:hover{text-decoration:underline}
        .ab3-statut{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:500}
        .ab3-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .ab3-dl-btn{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:4px;font-size:12.5px;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);font-family:'Inter',sans-serif;transition:all 0.15s;text-decoration:none}
        .ab3-dl-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .ab3-more{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:4px 6px;border-radius:4px;font-size:15px;transition:all 0.1s}
        .ab3-more:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .ab3-sort{display:inline-flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;color:inherit;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;padding:0}

        /* Méthodes paiement */
        .ab3-section-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:6px}
        .ab3-section-sub{font-size:13.5px;color:rgba(255,255,255,0.4);margin-bottom:20px;line-height:1.65;max-width:800px}
        .ab3-pm-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:0;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .ab3-pm-table{border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;margin-bottom:32px}
        .ab3-pm-head{display:grid;grid-template-columns:2.5fr 1fr 1.2fr 1fr 36px;gap:12px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .ab3-pm-head-lbl{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4)}
        .ab3-pm-row{display:grid;grid-template-columns:2.5fr 1fr 1.2fr 1fr 36px;gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.04)}
        .ab3-pm-row:last-child{border-bottom:none}
        .ab3-pm-empty{text-align:center;padding:40px;color:rgba(255,255,255,0.3)}
        .ab3-badge-ok{padding:3px 10px;border-radius:100px;font-size:11.5px;font-weight:600;background:rgba(0,200,150,0.1);color:#00c896}
        .ab3-badge-def{padding:2px 8px;border-radius:100px;font-size:10.5px;font-weight:600;background:rgba(0,120,212,0.1);color:#4da6ff;border:1px solid rgba(0,120,212,0.2)}

        /* Add payment panel */
        .ap-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;justify-content:flex-end}
        .ap-panel{width:440px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:ap-slide 0.2s ease;overflow:hidden}
        @keyframes ap-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .ap-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .ap-title{font-size:17px;font-weight:700;color:#e6edf3}
        .ap-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .ap-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .ap-body{flex:1;overflow-y:auto;padding:20px 22px}
        .ap-body::-webkit-scrollbar{width:4px}
        .ap-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .ap-desc{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:20px}
        .ap-type-tabs{display:flex;gap:0;border:1px solid rgba(255,255,255,0.1);border-radius:6px;overflow:hidden;margin-bottom:22px}
        .ap-type-tab{flex:1;padding:9px 12px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.45);font-family:'Inter',sans-serif;transition:all 0.15s;text-align:center}
        .ap-type-tab:not(:last-child){border-right:1px solid rgba(255,255,255,0.1)}
        .ap-type-tab.active{background:rgba(0,120,212,0.15);color:#4da6ff}
        .ap-card-logos{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .ap-card-logo{padding:4px 10px;border-radius:4px;font-size:11px;font-weight:800;border:1px solid rgba(255,255,255,0.1)}
        .ap-sub-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:14px}
        .ap-accept{font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .ap-required{font-size:12px;color:rgba(255,255,255,0.3);margin-bottom:16px}
        .ap-field{margin-bottom:14px}
        .ap-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.55);margin-bottom:6px}
        .ap-lbl span{color:#ef4444;margin-left:2px}
        .ap-input{width:100%;padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .ap-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .ap-input option{background:#1c2434}
        .ap-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ap-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .ap-sep{height:1px;background:rgba(255,255,255,0.07);margin:18px 0}
        .ap-note{font-size:12.5px;color:rgba(255,255,255,0.35);line-height:1.6;margin-bottom:14px}
        .ap-mobile-list{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
        .ap-mobile-opt{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid rgba(255,255,255,0.08);border-radius:7px;cursor:pointer;transition:all 0.15s}
        .ap-mobile-opt:hover{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.03)}
        .ap-mobile-opt.active{border-color:rgba(0,120,212,0.5);background:rgba(0,120,212,0.07)}
        .ap-mobile-icon{font-size:22px;flex-shrink:0}
        .ap-mobile-name{font-size:13.5px;font-weight:600;color:#e6edf3;margin-bottom:2px}
        .ap-mobile-pays{font-size:12px;color:rgba(255,255,255,0.35)}
        .ap-radio{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);flex-shrink:0;margin-left:auto;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .ap-radio.on{border-color:#0078d4}
        .ap-radio.on::after{content:'';width:7px;height:7px;border-radius:50%;background:#0078d4}
        .ap-foot{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .ap-btn{flex:1;padding:10px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .ap-btn-blue{background:#0078d4;color:#fff}
        .ap-btn-blue:hover{background:#006cc1}
        .ap-btn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .ap-btn-ghost:hover{background:rgba(255,255,255,0.09);color:#e6edf3}

        @media(max-width:900px){.ab3-table{display:block;overflow-x:auto}.ab3-pm-head,.ab3-pm-row{grid-template-columns:1.5fr 1fr 1fr auto}}
        @media(max-width:600px){.ap-panel{width:100%}}
      `}</style>

      {/* Breadcrumb */}
      <div className="ab3-breadcrumb">
        <Link to="/agence">Accueil</Link>
        <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
        <span style={{color:'rgba(255,255,255,0.65)'}}>Factures et paiements</span>
      </div>

      {/* Titre */}
      <div className="ab3-head">
        <div className="ab3-title">Factures et paiements</div>
        <a href="#" className="ab3-head-link">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
          Découvrez plus d'informations sur la nouvelle expérience de facturation.
        </a>
      </div>

      {/* Tabs */}
      <div className="ab3-tabs">
        <button className={`ab3-tab ${activeTab==='factures'?'active':''}`} onClick={()=>setActiveTab('factures')}>Factures</button>
        <button className={`ab3-tab ${activeTab==='modes'?'active':''}`} onClick={()=>setActiveTab('modes')}>Méthodes de paiement</button>
      </div>

      {/* ══ ONGLET FACTURES ══ */}
      {activeTab==='factures' && (
        <>
          <p className="ab3-desc">
            Les factures fournissent un récapitulatif de vos frais et des instructions pour effectuer des paiements. Certains sont générés dans les 24 heures suivant l'achat d'un article individuel, d'autres sont générés à la fin de la période de facturation et incluent tous les éléments de cette période de facturation.{' '}
            <a href="#" className="ab3-link">En savoir plus sur les factures</a>
          </p>

          <div className="ab3-account">
            <div className="ab3-account-title">Affichage du compte de facturation</div>
            <div className="ab3-account-sub">
              Factures connectées à{' '}
              <a href="#" className="ab3-link">Mon organisation ↗</a>
              {' '}(Imoloc)
            </div>
          </div>

          <div className="ab3-warn-box">
            <svg width="15" height="15" fill="none" stroke="#4da6ff" strokeWidth="1.5" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:2}}>
              <path strokeLinecap="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
            </svg>
            <div>
              Imoloc met à jour son calendrier de facturation. Vous pouvez recevoir deux factures au cours d'un même mois en raison de la transition de la facturation en retard à la facturation initiale. Veuillez noter que la nouvelle facture aura un jour unique pour la période de facturation, qui n'est pas la période de service pour laquelle des frais sont appliqués. Pour plus d'informations sur la période de service, reportez-vous aux détails des frais sur la deuxième page de votre facture ou aux dates de la <strong style={{color:'rgba(255,255,255,0.6)'}}>période de service</strong> dans les détails de la facture ci-dessous.{' '}
              <a href="#" className="ab3-link">En savoir plus sur cette modification du calendrier de facturation.</a>
            </div>
          </div>

          <div className="ab3-stats">
            <div className="ab3-stat">
              <div className="ab3-stat-lbl">Total des factures</div>
              <div className="ab3-stat-val">{totalFactures}</div>
            </div>
            <div className="ab3-stat">
              <div className="ab3-stat-lbl">Montant dû</div>
              <div className="ab3-stat-val">{totalDu.toLocaleString()} FCFA</div>
            </div>
          </div>

          <div className="ab3-toolbar">
            <button className="ab3-tool-btn">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              Actualiser
            </button>
            <button className="ab3-tool-btn">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Exporter vers un fichier CSV
            </button>
            <button className="ab3-tool-btn" style={{opacity:0.35,cursor:'not-allowed'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Télécharger
            </button>
            <div className="ab3-tool-sep"/>
            <button className="ab3-tool-btn" style={{opacity:0.35,cursor:'not-allowed'}}>Gérer l'accès</button>
            <div className="ab3-search">
              <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
              <input placeholder="Rechercher"/>
            </div>
          </div>

          <div className="ab3-filters">
            {['État: Tout','Profil de facturation: Tout','Durée: 12 derniers mois'].map((f,i)=>(
              <div key={i} className="ab3-chip">
                {f}
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
              </div>
            ))}
          </div>

          <div className="ab3-table-wrap">
            <table className="ab3-table">
              <thead>
                <tr>
                  <th>
                    <div className={`ab3-checkbox ${selectedRows.length===FACTURES.length?'checked':''}`} onClick={toggleAll}>
                      {selectedRows.length===FACTURES.length&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    </div>
                  </th>
                  <th><button className="ab3-sort">ID de facture ↕</button></th>
                  <th><button className="ab3-sort">Date de facture ↕</button></th>
                  <th><button className="ab3-sort">Période de facturation ↕</button></th>
                  <th>Profil de facturation</th>
                  <th><button className="ab3-sort">Montant total ↕</button></th>
                  <th><button className="ab3-sort">État ↕</button></th>
                  <th>Télécharger la facture</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {FACTURES.map((f,i)=>{
                  const sc = STATUT_CONFIG[f.statut]||STATUT_CONFIG['en attente']
                  const isSelected = selectedRows.includes(f.id)
                  return (
                    <tr key={i}>
                      <td>
                        <div className={`ab3-checkbox ${isSelected?'checked':''}`} onClick={()=>toggleRow(f.id)}>
                          {isSelected&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      </td>
                      <td><a href="#" className="ab3-id">{f.id}</a></td>
                      <td>{f.date}</td>
                      <td>{f.periode}</td>
                      <td style={{color:'#4da6ff'}}>{f.profil}</td>
                      <td style={{fontWeight:600,color:'#e6edf3'}}>{f.montant==='0'?'0,00 FCFA':`${f.montant} FCFA`}</td>
                      <td>
                        <div className="ab3-statut">
                          <div className="ab3-dot" style={{background:sc.color}}/>
                          <span style={{color:sc.color,fontWeight:500}}>{f.statut_date}</span>
                        </div>
                      </td>
                      <td>{f.montant!=='0'?<a href="#" className="ab3-dl-btn"><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>Télécharger</a>:<span style={{color:'rgba(255,255,255,0.2)',fontSize:12.5}}>N/A</span>}</td>
                      <td><button className="ab3-more">···</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ ONGLET MÉTHODES DE PAIEMENT ══ */}
      {activeTab==='modes' && (
        <>
          <div className="ab3-account">
            <div className="ab3-account-title">Affichage du compte de facturation</div>
            <div className="ab3-account-sub">
              Modes de paiement connectés à{' '}
              <a href="#" className="ab3-link">Mon organisation ↗</a>
              {' '}(Imoloc)<br/>
              <a href="#" className="ab3-link">Changer de compte de facturation</a>
            </div>
          </div>
          <a href="#" className="ab3-link" style={{display:'block',marginBottom:22,fontSize:13.5}}>En savoir plus sur la gestion des modes de paiement.</a>

          {/* Vos modes de paiement */}
          <div className="ab3-section-title">Vos modes de paiement</div>
          <div className="ab3-section-sub">Voici les modes de paiement dont vous êtes propriétaire. Ils ne sont pas automatiquement affectés à un compte de facturation.</div>

          <div className="ab3-pm-toolbar" style={{marginBottom:16}}>
            <button className="ab3-tool-btn" style={{border:'none',background:'none',paddingLeft:0,color:'rgba(255,255,255,0.65)'}} onClick={()=>setShowAddPayment(true)}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Ajouter une méthode de paiement
            </button>
            <button className="ab3-tool-btn" style={{border:'none',background:'none',color:'rgba(255,255,255,0.55)'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              Actualiser
            </button>
            <div style={{marginLeft:'auto'}}>
              <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
            </div>
          </div>

          <div className="ab3-pm-table">
            <div className="ab3-pm-head">
              <span className="ab3-pm-head-lbl">Mode de paiement</span>
              <span className="ab3-pm-head-lbl">Date d'expiration ↓</span>
              <span className="ab3-pm-head-lbl">Statut d'expiration</span>
              <span className="ab3-pm-head-lbl">Type</span>
              <span/>
            </div>
            <div className="ab3-pm-empty">
              <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.45)',marginBottom:8}}>Vous n'avez ajouté aucun mode de paiement</div>
              <div style={{fontSize:13.5}}>Ajoutez un mode de paiement, puis vous pouvez l'afficher et le gérer ici.</div>
            </div>
          </div>

          {/* Modes par défaut */}
          <div className="ab3-section-title">Modes de paiement par défaut – Mon organisation</div>
          <div className="ab3-section-sub">Vous pouvez remplacer les modes de paiement de ce compte de facturation en sélectionnant les points, puis en sélectionnant Remplacer.</div>

          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Filtres :</span>
            <div className="ab3-chip" style={{fontSize:12}}>Profil de facturation: Tout</div>
          </div>

          <div className="ab3-pm-table">
            <div className="ab3-pm-head">
              {['Mode de paiement par défaut','Profil de facturation','Date d\'expiration ↓','Type',''].map((h,i)=>(
                <span key={i} className="ab3-pm-head-lbl">{h}</span>
              ))}
            </div>
            <div className="ab3-pm-empty">
              <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.35)',marginBottom:6}}>Aucun mode de paiement par défaut</div>
              <div style={{fontSize:13}}>Ajoutez un mode de paiement pour le définir par défaut.</div>
            </div>
          </div>
        </>
      )}

      {/* ══ PANEL AJOUTER MÉTHODE DE PAIEMENT ══ */}
      {showAddPayment && (
        <div className="ap-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddPayment(false)}>
          <div className="ap-panel">
            <div className="ap-head">
              <span className="ap-title">Ajouter une méthode de paiement</span>
              <button className="ap-close" onClick={()=>setShowAddPayment(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="ap-body">
              <p className="ap-desc">
                Les nouveaux modes de paiement ne payent pas automatiquement votre <a href="#" className="ab3-link">profil de facturation</a>. Une fois que vous avez ajouté un nouvel élément, attribuez-le au <a href="#" className="ab3-link">profil de facturation</a> que vous souhaitez qu'il paie.{' '}
                <a href="#" className="ab3-link">En savoir plus sur l'ajout de modes de paiement.</a>
              </p>

              {/* Tabs type */}
              <div className="ap-type-tabs">
                <button className={`ap-type-tab ${paymentType==='card'?'active':''}`} onClick={()=>setPaymentType('card')}>
                  💳 Carte bancaire
                </button>
                <button className={`ap-type-tab ${paymentType==='mobile'?'active':''}`} onClick={()=>setPaymentType('mobile')}>
                  📱 Mobile Money
                </button>
              </div>

              {/* ── Carte bancaire ── */}
              {paymentType==='card' && (
                <>
                  {/* Logos cartes */}
                  <div className="ap-card-logos">
                    {[
                      {name:'VISA',bg:'#1a1f71',color:'#fff'},
                      {name:'MC',bg:'#eb001b',color:'#fff'},
                      {name:'AMEX',bg:'#007bc1',color:'#fff'},
                      {name:'DISC',bg:'#f76F20',color:'#fff'},
                      {name:'PP',bg:'#003087',color:'#fff'},
                    ].map((c,i)=>(
                      <div key={i} className="ap-card-logo" style={{background:c.bg,color:c.color}}>{c.name}</div>
                    ))}
                  </div>

                  <div className="ap-sub-title">Ajouter une carte de crédit ou de débit</div>
                  <div className="ap-accept">Nous acceptons les cartes suivantes</div>
                  <div className="ap-required">* Obligatoire</div>

                  <div className="ap-field">
                    <label className="ap-lbl">Nom du titulaire de la carte <span>*</span></label>
                    <input className="ap-input" value={cardForm.nom} onChange={e=>setCard('nom',e.target.value)} placeholder="Jean Dupont"/>
                  </div>

                  <div className="ap-field">
                    <label className="ap-lbl">Numéro de carte <span>*</span></label>
                    <input className="ap-input" value={cardForm.numero} onChange={e=>setCard('numero',formatCard(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19}/>
                  </div>

                  <div className="ap-grid3" style={{marginBottom:14}}>
                    <div>
                      <label className="ap-lbl">Mois d'exp. <span>*</span></label>
                      <select className="ap-input" value={cardForm.mois} onChange={e=>setCard('mois',e.target.value)}>
                        <option value="">MM</option>
                        {Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1).padStart(2,'0')}>{String(i+1).padStart(2,'0')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ap-lbl">Année d'exp. <span>*</span></label>
                      <select className="ap-input" value={cardForm.annee} onChange={e=>setCard('annee',e.target.value)}>
                        <option value="">AAAA</option>
                        {Array.from({length:10},(_,i)=><option key={i} value={2026+i}>{2026+i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ap-lbl">CVV <span>*</span></label>
                      <input className="ap-input" value={cardForm.cvv} onChange={e=>setCard('cvv',e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="000" maxLength={4}/>
                    </div>
                  </div>

                  <div className="ap-sep"/>

                  <div className="ap-field">
                    <label className="ap-lbl">Ligne d'adresse 1 <span>*</span></label>
                    <input className="ap-input" value={cardForm.adresse1} onChange={e=>setCard('adresse1',e.target.value)} placeholder="123 Rue Principale"/>
                  </div>
                  <div className="ap-field">
                    <label className="ap-lbl">Ligne d'adresse 2 <span style={{color:'rgba(255,255,255,0.3)'}}>en option</span></label>
                    <input className="ap-input" value={cardForm.adresse2} onChange={e=>setCard('adresse2',e.target.value)} placeholder="Appartement, suite, etc."/>
                  </div>
                  <div className="ap-grid2" style={{marginBottom:14}}>
                    <div>
                      <label className="ap-lbl">Ville <span>*</span></label>
                      <input className="ap-input" value={cardForm.ville} onChange={e=>setCard('ville',e.target.value)} placeholder="Cotonou"/>
                    </div>
                    <div>
                      <label className="ap-lbl">Département</label>
                      <input className="ap-input" value={cardForm.departement} onChange={e=>setCard('departement',e.target.value)} placeholder="Littoral"/>
                    </div>
                  </div>
                  <div className="ap-grid2" style={{marginBottom:14}}>
                    <div>
                      <label className="ap-lbl">Code postal</label>
                      <input className="ap-input" value={cardForm.code_postal} onChange={e=>setCard('code_postal',e.target.value)} placeholder="00000"/>
                    </div>
                    <div>
                      <label className="ap-lbl">Pays/région <span>*</span></label>
                      <select className="ap-input" value={cardForm.pays} onChange={e=>setCard('pays',e.target.value)}>
                        {PAYS_LIST.map(p=><option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <p className="ap-note">
                    Cette option de paiement sera enregistrée sur votre compte. Imoloc respecte votre vie privée. Consultez notre{' '}
                    <a href="#" className="ab3-link">déclaration de confidentialité</a>.
                  </p>

                  <div style={{padding:'12px 14px',borderRadius:6,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',fontSize:12.5,color:'rgba(255,255,255,0.4)',marginBottom:14}}>
                    <div style={{marginBottom:6,fontWeight:600}}>Nous acceptons les cartes suivantes</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {['VISA','Mastercard','American Express','Discover Network'].map((c,i)=>(
                        <span key={i} style={{padding:'2px 8px',borderRadius:3,background:'rgba(255,255,255,0.06)',fontSize:11,fontWeight:600}}>{c}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Mobile Money ── */}
              {paymentType==='mobile' && (
                <>
                  <div className="ap-sub-title">Choisissez votre opérateur Mobile Money</div>
                  <div className="ap-accept">Disponible en Afrique de l'Ouest et Centrale</div>

                  <div className="ap-mobile-list">
                    {MOBILE_MONEY.map((m,i)=>(
                      <div key={i}
                        className={`ap-mobile-opt ${selectedMobile?.name===m.name?'active':''}`}
                        onClick={()=>setSelectedMobile(m)}>
                        <span className="ap-mobile-icon">{m.icon}</span>
                        <div style={{flex:1}}>
                          <div className="ap-mobile-name">{m.name}</div>
                          <div className="ap-mobile-pays">{m.pays}</div>
                        </div>
                        <div className={`ap-radio ${selectedMobile?.name===m.name?'on':''}`}/>
                      </div>
                    ))}
                  </div>

                  {selectedMobile && (
                    <>
                      <div className="ap-sep"/>
                      <div className="ap-sub-title">Informations {selectedMobile.name}</div>
                      <div className="ap-field">
                        <label className="ap-lbl">Nom du titulaire <span>*</span></label>
                        <input className="ap-input" value={mobileForm.nom} onChange={e=>setMob('nom',e.target.value)} placeholder="Jean Dupont"/>
                      </div>
                      <div className="ap-field">
                        <label className="ap-lbl">Numéro de téléphone <span>*</span></label>
                        <input className="ap-input" value={mobileForm.numero} onChange={e=>setMob('numero',e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="+229 XX XX XX XX"/>
                      </div>
                      <p className="ap-note">
                        Ce numéro sera utilisé pour les transactions Mobile Money. Imoloc respecte votre vie privée.{' '}
                        <a href="#" className="ab3-link">Déclaration de confidentialité</a>.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="ap-foot">
              <button className="ap-btn ap-btn-ghost" onClick={()=>setShowAddPayment(false)}>Retour</button>
              <button className="ap-btn ap-btn-blue">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
