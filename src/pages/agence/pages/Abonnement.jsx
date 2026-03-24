const PLANS = [
  { name:'Basic', price:'10 000', color:'#4da6ff', features:['10 biens','1 utilisateur','1 Go stockage'] },
  { name:'Standard', price:'25 000', color:'#0078d4', features:['100 biens','5 utilisateurs','100 Go stockage'], current:true },
  { name:'Premium', price:'50 000', color:'#6c63ff', features:['500 biens','20 utilisateurs','500 Go stockage'] },
  { name:'Entreprise', price:'Sur devis', color:'#00c896', features:['Illimité','50+ utilisateurs','2 To stockage'] },
]

export default function Abonnement() {
  return (
    <>
      <style>{`
        .ab-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:8px}
        .ab-sub{font-size:14px;color:rgba(255,255,255,0.35);margin-bottom:28px}
        .ab-current{background:rgba(0,120,212,0.08);border:1px solid rgba(0,120,212,0.25);border-radius:12px;padding:22px 26px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
        .ab-current-badge{display:inline-block;background:#0078d4;color:#fff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:100px;margin-bottom:8px}
        .ab-current-name{font-size:20px;font-weight:700;color:#e6edf3;margin-bottom:4px}
        .ab-current-price{font-size:14px;color:rgba(255,255,255,0.4)}
        .ab-renew{font-size:13px;color:rgba(255,255,255,0.35)}
        .ab-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
        .ab-plan{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;transition:all 0.2s}
        .ab-plan.current{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .ab-plan:hover{transform:translateY(-2px)}
        .ab-plan-name{font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px}
        .ab-plan-price{font-size:20px;font-weight:700;color:#e6edf3;margin-bottom:4px}
        .ab-plan-period{font-size:12px;color:rgba(255,255,255,0.3);margin-bottom:14px}
        .ab-plan-feats{list-style:none;display:flex;flex-direction:column;gap:7px;margin-bottom:18px}
        .ab-plan-feats li{font-size:13px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:7px}
        .ab-plan-btn{width:100%;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .ab-plan-btn.blue{background:#0078d4;color:#fff}
        .ab-plan-btn.ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .ab-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:22px;margin-bottom:16px}
        .ab-card-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:16px}
        @media(max-width:1100px){.ab-plans{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.ab-plans{grid-template-columns:1fr}}
      `}</style>
      <div className="ab-title">💳 Abonnement Imoloc</div>
      <div className="ab-sub">Gérez votre plan et votre facturation</div>
      <div className="ab-current">
        <div>
          <div className="ab-current-badge">Plan actuel</div>
          <div className="ab-current-name">Standard</div>
          <div className="ab-current-price">25 000 FCFA / mois</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="ab-renew">Renouvellement le 1er du mois prochain</div>
          <div style={{marginTop:10,display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button style={{padding:'8px 16px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'Inter'}}>Annuler l'abonnement</button>
          </div>
        </div>
      </div>
      <div className="ab-plans">
        {PLANS.map((p,i) => (
          <div key={i} className={`ab-plan ${p.current?'current':''}`}>
            {p.current && <div style={{fontSize:11,fontWeight:700,color:'#0078d4',marginBottom:6}}>✓ Votre plan</div>}
            <div className="ab-plan-name" style={{color:p.color}}>{p.name}</div>
            <div className="ab-plan-price" style={{color:p.color}}>{p.price}{p.price!=='Sur devis'&&<span style={{fontSize:12,fontWeight:400,color:'rgba(255,255,255,0.3)'}}> FCFA</span>}</div>
            <div className="ab-plan-period">{p.price!=='Sur devis'?'par mois':'Contactez-nous'}</div>
            <ul className="ab-plan-feats">
              {p.features.map((f,j) => <li key={j}><svg width="12" height="12" fill="none" stroke="#00c896" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>{f}</li>)}
            </ul>
            <button className={`ab-plan-btn ${p.current?'ghost':'blue'}`}>{p.current?'Plan actuel':p.price==='Sur devis'?'Contacter':'Changer de plan'}</button>
          </div>
        ))}
      </div>
      <div className="ab-card">
        <div className="ab-card-title">📄 Historique des factures</div>
        <div style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.25)',fontSize:14}}>Aucune facture disponible pour le moment</div>
      </div>
    </>
  )
}
