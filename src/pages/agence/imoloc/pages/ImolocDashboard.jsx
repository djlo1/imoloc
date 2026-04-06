import { useNavigate } from 'react-router-dom'

const MODULES = [
  { icon:'👤', label:'Proprietaires', desc:'Gerez les proprietaires et leurs mandats', path:'/agence/imoloc/proprietaires', col:'#0078d4' },
  { icon:'🏢', label:'Biens immobiliers', desc:'Ajoutez et gerez vos biens (appartements, villas, bureaux...)', path:'/agence/imoloc/biens', col:'#6c63ff' },
  { icon:'👥', label:'Locataires', desc:'Dossiers locataires, KYC et historique', path:'/agence/imoloc/locataires', col:'#00c896' },
  { icon:'📄', label:'Baux et Contrats', desc:'Creation, signature electronique et suivi des baux', path:'/agence/imoloc/baux', col:'#f59e0b' },
  { icon:'💰', label:'Paiements', desc:'Encaissements, retards et recus automatiques', path:'/agence/imoloc/paiements', col:'#4da6ff' },
  { icon:'🔧', label:'Maintenance', desc:'Plaintes locataires et suivi des interventions', path:'/agence/imoloc/maintenance', col:'#a78bfa' },
  { icon:'📋', label:'Etats des lieux', desc:'Formulaires entree/sortie avec photos et signatures', path:'/agence/imoloc/etats-lieux', col:'#fb923c' },
  { icon:'📊', label:'Rapports', desc:'Statistiques, exports PDF/Excel et rapports automatiques', path:'/agence/imoloc/rapports', col:'#34d399' },
]

export default function ImolocDashboard({ agence, stats }) {
  const navigate = useNavigate()
  return (
    <>
      <style>{`
        .imd-page{animation:imd-in 0.2s ease}
        @keyframes imd-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .imd-hero{background:linear-gradient(135deg,rgba(0,200,150,0.07),rgba(0,120,212,0.05));border:1px solid rgba(0,200,150,0.15);border-radius:14px;padding:28px 32px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .imd-hero-title{font-size:24px;font-weight:800;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:6px;display:flex;align-items:center;gap:12px}
        .imd-hero-sub{font-size:14px;color:rgba(255,255,255,0.45);line-height:1.7;max-width:500px}
        .imd-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
        .imd-stat{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:18px 20px;cursor:pointer;transition:all 0.2s}
        .imd-stat:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px)}
        .imd-stat-val{font-size:32px;font-weight:800;letter-spacing:-0.03em;margin-bottom:4px}
        .imd-stat-lbl{font-size:12px;color:rgba(255,255,255,0.35)}
        .imd-section-title{font-size:15px;font-weight:700;color:#e6edf3;margin-bottom:16px}
        .imd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
        .imd-module{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:22px;cursor:pointer;transition:all 0.2s;position:relative}
        .imd-module:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.35)}
        .imd-module-icon{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px}
        .imd-module-title{font-size:14.5px;font-weight:700;color:#e6edf3;margin-bottom:6px}
        .imd-module-desc{font-size:12.5px;color:rgba(255,255,255,0.4);line-height:1.6}
        .imd-module-arrow{position:absolute;bottom:16px;right:16px;color:rgba(255,255,255,0.2);transition:all 0.2s}
        .imd-module:hover .imd-module-arrow{color:rgba(255,255,255,0.6);transform:translateX(3px)}
        @media(max-width:900px){.imd-stats-row{grid-template-columns:1fr 1fr}}
      `}</style>
      <div className="imd-page">
        <div className="imd-hero">
          <div>
            <div className="imd-hero-title"><span>🏢</span> Centre Imoloc</div>
            <div className="imd-hero-sub">
              Bienvenue dans votre espace de gestion immobiliere. Gerez vos biens, proprietaires, locataires, baux et paiements depuis un seul endroit.
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:4}}>Organisation</div>
            <div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>{agence?.nom || '—'}</div>
            <div style={{fontSize:12,color:'rgba(0,200,150,0.8)',marginTop:4,display:'flex',alignItems:'center',gap:5,justifyContent:'flex-end'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#00c896'}}/>
              Actif
            </div>
          </div>
        </div>

        <div className="imd-stats-row">
          {[
            {ic:'🏢',lbl:'Biens geres',val:stats?.biens||0,col:'#0078d4',path:'/agence/imoloc/biens'},
            {ic:'👥',lbl:'Locataires',val:stats?.locataires||0,col:'#6c63ff',path:'/agence/imoloc/locataires'},
            {ic:'📄',lbl:'Baux actifs',val:stats?.baux||0,col:'#00c896',path:'/agence/imoloc/baux'},
            {ic:'⚠️',lbl:'Retards paiement',val:stats?.retards||0,col:stats?.retards>0?'#f59e0b':'rgba(255,255,255,0.4)',path:'/agence/imoloc/paiements/retard'},
          ].map((s,i)=>(
            <div key={i} className="imd-stat" onClick={()=>navigate(s.path)}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <span style={{fontSize:20}}>{s.ic}</span>
                <span className="imd-stat-lbl">{s.lbl}</span>
              </div>
              <div className="imd-stat-val" style={{color:s.col}}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="imd-section-title">Modules disponibles</div>
        <div className="imd-grid">
          {MODULES.map((m,i)=>(
            <div key={i} className="imd-module"
              onClick={()=>navigate(m.path)}
              onMouseEnter={e=>e.currentTarget.style.borderColor=m.col+"44"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
              <div className="imd-module-icon" style={{background:m.col+"18",border:`1px solid ${m.col}30`}}>{m.icon}</div>
              <div className="imd-module-title">{m.label}</div>
              <div className="imd-module-desc">{m.desc}</div>
              <div className="imd-module-arrow">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
