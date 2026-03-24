import { useState } from 'react'

const ROLES = [
  { name:'Administrateur', desc:'Accès complet à tout le système', color:'#0078d4' },
  { name:'Gestionnaire', desc:'Gestion biens, locataires, paiements', color:'#6c63ff' },
  { name:'Agent', desc:'Consultation et ajout de données', color:'#00c896' },
  { name:'Comptable', desc:'Accès aux paiements et rapports', color:'#f59e0b' },
]

export default function Utilisateurs() {
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Agent')

  return (
    <>
      <style>{`
        .usr-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .pg-title{font-size:18px;font-weight:700;color:#e6edf3}
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover{background:#006cc1}
        .pg-btn-ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .usr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:28px}
        .usr-role-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;display:flex;align-items:center;gap:14px}
        .usr-role-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
        .usr-role-name{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:3px}
        .usr-role-desc{font-size:12px;color:rgba(255,255,255,0.35)}
        .pg-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px}
        .pg-card-title{font-size:15px;font-weight:600;color:#e6edf3;margin-bottom:18px}
        .usr-empty{display:flex;flex-direction:column;align-items:center;padding:40px;text-align:center;color:rgba(255,255,255,0.3);gap:10px}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}
        .modal{background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:16px;width:100%;max-width:440px}
        .modal-head{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .modal-title{font-size:16px;font-weight:700;color:#e6edf3}
        .modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:4px;border-radius:6px;display:flex}
        .modal-body{padding:24px}
        .modal-foot{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:flex-end;gap:10px}
        .form-field{margin-bottom:16px}
        .form-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:7px;text-transform:uppercase;letter-spacing:0.06em}
        .form-input{width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .form-input:focus{border-color:#0078d4}
        .form-input option{background:#1c2434}
        @media(max-width:768px){.usr-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="usr-head">
        <div className="pg-title">👤 Utilisateurs & Rôles</div>
        <button className="pg-btn pg-btn-blue" onClick={()=>setShowInvite(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Inviter un utilisateur
        </button>
      </div>
      <div className="usr-grid">
        {ROLES.map((r,i) => (
          <div key={i} className="usr-role-card">
            <div className="usr-role-dot" style={{background:r.color}}/>
            <div><div className="usr-role-name">{r.name}</div><div className="usr-role-desc">{r.desc}</div></div>
          </div>
        ))}
      </div>
      <div className="pg-card">
        <div className="pg-card-title">Membres de l'équipe</div>
        <div className="usr-empty">
          <div style={{fontSize:36,opacity:0.3}}>👥</div>
          <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>Aucun membre invité</div>
          <div style={{fontSize:13}}>Invitez des membres pour collaborer sur la gestion des biens</div>
          <button className="pg-btn pg-btn-blue" onClick={()=>setShowInvite(true)}>Inviter maintenant</button>
        </div>
      </div>
      {showInvite && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowInvite(false)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Inviter un utilisateur</div>
              <button className="modal-close" onClick={()=>setShowInvite(false)}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-field"><label className="form-lbl">Email *</label><input type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemple.com"/></div>
              <div className="form-field"><label className="form-lbl">Rôle</label>
                <select className="form-input" value={role} onChange={e=>setRole(e.target.value)}>
                  {ROLES.map(r=><option key={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div style={{padding:'12px 14px',borderRadius:8,background:'rgba(0,120,212,0.08)',border:'1px solid rgba(0,120,212,0.2)',fontSize:13,color:'rgba(255,255,255,0.5)'}}>
                Un email d'invitation sera envoyé à l'adresse indiquée.
              </div>
            </div>
            <div className="modal-foot">
              <button className="pg-btn pg-btn-ghost" onClick={()=>setShowInvite(false)}>Annuler</button>
              <button className="pg-btn pg-btn-blue">Envoyer l'invitation</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
