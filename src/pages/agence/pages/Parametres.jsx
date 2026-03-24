import { useState } from 'react'
import toast from 'react-hot-toast'

export default function Parametres() {
  const [notifs, setNotifs] = useState({ retard:true, bail:true, paiement:true, plainte:false })
  const [devise, setDevise] = useState('FCFA')
  const [langue, setLangue] = useState('Français')
  const [penalite, setPenalite] = useState('5')
  const [delai, setDelai] = useState('5')

  return (
    <>
      <style>{`
        .par-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:24px}
        .par-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:16px}
        .par-card-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:18px;display:flex;align-items:center;gap:8px}
        .par-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);gap:16px}
        .par-row:last-child{border-bottom:none;padding-bottom:0}
        .par-row-title{font-size:14px;font-weight:500;color:#e6edf3;margin-bottom:3px}
        .par-row-sub{font-size:12.5px;color:rgba(255,255,255,0.35)}
        .par-toggle{width:44px;height:24px;border-radius:100px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0}
        .par-toggle.on{background:#0078d4}
        .par-toggle.off{background:rgba(255,255,255,0.12)}
        .par-toggle::after{content:'';position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;transition:left 0.2s}
        .par-toggle.on::after{left:23px}
        .par-toggle.off::after{left:3px}
        .par-select{padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;outline:none;cursor:pointer;min-width:140px}
        .par-select option{background:#1c2434}
        .par-input{padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;outline:none;width:100px}
        .par-input:focus{border-color:#0078d4}
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s;margin-top:8px}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover{background:#006cc1}
      `}</style>
      <div className="par-title">⚙️ Paramètres</div>
      <div className="par-card">
        <div className="par-card-title">🌍 Préférences générales</div>
        <div className="par-row">
          <div><div className="par-row-title">Devise</div><div className="par-row-sub">Devise utilisée pour les montants</div></div>
          <select className="par-select" value={devise} onChange={e=>setDevise(e.target.value)}>
            {['FCFA','EUR','USD','GHS','NGN'].map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="par-row">
          <div><div className="par-row-title">Langue</div><div className="par-row-sub">Langue de l'interface</div></div>
          <select className="par-select" value={langue} onChange={e=>setLangue(e.target.value)}>
            {['Français','English','Português'].map(l=><option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="par-card">
        <div className="par-card-title">💰 Règles métier</div>
        <div className="par-row">
          <div><div className="par-row-title">Pénalité de retard</div><div className="par-row-sub">Pourcentage appliqué après le délai de grâce</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input className="par-input" type="number" value={penalite} onChange={e=>setPenalite(e.target.value)} min="0" max="100"/>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>%</span>
          </div>
        </div>
        <div className="par-row">
          <div><div className="par-row-title">Délai de grâce</div><div className="par-row-sub">Jours avant application de la pénalité</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input className="par-input" type="number" value={delai} onChange={e=>setDelai(e.target.value)} min="0" max="30"/>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>jours</span>
          </div>
        </div>
      </div>
      <div className="par-card">
        <div className="par-card-title">🔔 Notifications</div>
        {[
          { key:'retard', title:'Loyers en retard', sub:'Alertes pour les paiements en retard' },
          { key:'bail', title:'Baux expirants', sub:'Rappels 30, 60, 90 jours avant expiration' },
          { key:'paiement', title:'Nouveaux paiements', sub:'Confirmation à chaque paiement reçu' },
          { key:'plainte', title:'Nouvelles plaintes', sub:'Notification quand un locataire soumet une plainte' },
        ].map(n => (
          <div key={n.key} className="par-row">
            <div><div className="par-row-title">{n.title}</div><div className="par-row-sub">{n.sub}</div></div>
            <button className={`par-toggle ${notifs[n.key]?'on':'off'}`} onClick={()=>setNotifs(p=>({...p,[n.key]:!p[n.key]}))}/>
          </div>
        ))}
      </div>
      <button className="pg-btn pg-btn-blue" onClick={()=>toast.success('Paramètres sauvegardés !')}>Sauvegarder les paramètres</button>
    </>
  )
}
