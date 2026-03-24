const INTEGRATIONS = [
  { name:'MTN Mobile Money', desc:'Collecte automatique des loyers via MTN MoMo', icon:'📱', status:'disponible', color:'#f59e0b' },
  { name:'Moov Money', desc:'Intégration Moov Money pour le Bénin et Togo', icon:'📱', status:'disponible', color:'#0078d4' },
  { name:'Wave', desc:'Paiements Wave pour le Sénégal et Côte d\'Ivoire', icon:'💙', status:'disponible', color:'#4da6ff' },
  { name:'WhatsApp Business', desc:'Envoi automatique de notifications aux locataires', icon:'💬', status:'bientôt', color:'#00c896' },
  { name:'Google Calendar', desc:'Synchronisation des échéances et rendez-vous', icon:'📅', status:'bientôt', color:'#ef4444' },
  { name:'Signature électronique', desc:'Signature de baux en ligne via DocuSign', icon:'✍️', status:'bientôt', color:'#6c63ff' },
]

export default function Integrations() {
  return (
    <>
      <style>{`
        .int-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:8px}
        .int-sub{font-size:14px;color:rgba(255,255,255,0.35);margin-bottom:28px}
        .int-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .int-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:22px;transition:all 0.2s}
        .int-card:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-2px)}
        .int-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
        .int-icon{font-size:28px}
        .int-status{padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
        .int-status.disponible{background:rgba(0,200,150,0.1);color:#00c896}
        .int-status.bientot{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35)}
        .int-card-name{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:6px}
        .int-card-desc{font-size:12.5px;color:rgba(255,255,255,0.35);line-height:1.6;margin-bottom:18px}
        .int-btn{width:100%;padding:9px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .int-btn.blue{background:rgba(0,120,212,0.15);color:#4da6ff;border:1px solid rgba(0,120,212,0.25)}
        .int-btn.blue:hover{background:rgba(0,120,212,0.25)}
        .int-btn.disabled{background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.06);cursor:not-allowed}
        @media(max-width:900px){.int-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.int-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="int-title">🔌 Intégrations</div>
      <div className="int-sub">Connectez Imoloc à vos outils et services préférés</div>
      <div className="int-grid">
        {INTEGRATIONS.map((g,i) => (
          <div key={i} className="int-card">
            <div className="int-card-top">
              <div className="int-icon">{g.icon}</div>
              <span className={`int-status ${g.status==='disponible'?'disponible':'bientot'}`}>
                {g.status==='disponible'?'Disponible':'Bientôt'}
              </span>
            </div>
            <div className="int-card-name">{g.name}</div>
            <div className="int-card-desc">{g.desc}</div>
            <button className={`int-btn ${g.status==='disponible'?'blue':'disabled'}`} disabled={g.status!=='disponible'}>
              {g.status==='disponible'?'Connecter':'En développement'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
