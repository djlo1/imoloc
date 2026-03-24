export default function Rapports() {
  const RAPPORTS = [
    { icon:'📊', title:'Rapport financier mensuel', desc:'Revenus, paiements, retards du mois en cours', color:'#0078d4' },
    { icon:'🏠', title:"Taux d'occupation", desc:'Statistiques occupation par bien et par période', color:'#6c63ff' },
    { icon:'⏰', title:'Rapport des retards', desc:'Liste des loyers en retard avec montants et durées', color:'#ef4444' },
    { icon:'📄', title:'Rapport des baux', desc:'Baux actifs, expirés et renouvellements à venir', color:'#f59e0b' },
    { icon:'👥', title:'Rapport locataires', desc:"Historique et statistiques par locataire", color:'#00c896' },
    { icon:'📈', title:'Rapport annuel', desc:'Vue globale des performances sur 12 mois', color:'#4da6ff' },
  ]

  return (
    <>
      <style>{`
        .rap-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:8px}
        .rap-sub{font-size:14px;color:rgba(255,255,255,0.35);margin-bottom:28px}
        .rap-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .rap-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;transition:all 0.2s;cursor:pointer}
        .rap-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .rap-icon{font-size:32px;margin-bottom:14px}
        .rap-card-title{font-size:15px;font-weight:600;color:#e6edf3;margin-bottom:6px}
        .rap-card-desc{font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;margin-bottom:18px}
        .rap-btns{display:flex;gap:8px}
        .rap-btn{padding:7px 14px;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .rap-btn-ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .rap-btn-ghost:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        @media(max-width:900px){.rap-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.rap-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="rap-title">📊 Rapports</div>
      <div className="rap-sub">Générez et exportez vos rapports en PDF ou Excel</div>
      <div className="rap-grid">
        {RAPPORTS.map((r,i) => (
          <div key={i} className="rap-card">
            <div className="rap-icon">{r.icon}</div>
            <div className="rap-card-title">{r.title}</div>
            <div className="rap-card-desc">{r.desc}</div>
            <div className="rap-btns">
              <button className="rap-btn rap-btn-ghost">PDF</button>
              <button className="rap-btn rap-btn-ghost">Excel</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
