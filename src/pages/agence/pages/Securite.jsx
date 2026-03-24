export default function Securite() {
  return (
    <>
      <style>{`
        .sec-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:24px}
        .sec-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:16px}
        .sec-card-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .sec-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .sec-row:last-child{border-bottom:none;padding-bottom:0}
        .sec-row-info{}
        .sec-row-title{font-size:14px;font-weight:500;color:#e6edf3;margin-bottom:3px}
        .sec-row-sub{font-size:12.5px;color:rgba(255,255,255,0.35)}
        .sec-btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;transition:all 0.15s}
        .sec-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .sec-btn-blue{border-color:rgba(0,120,212,0.3);background:rgba(0,120,212,0.1);color:#4da6ff}
        .sec-btn-blue:hover{background:rgba(0,120,212,0.18)}
        .sec-toggle{width:44px;height:24px;border-radius:100px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0}
        .sec-toggle.on{background:#0078d4}
        .sec-toggle.off{background:rgba(255,255,255,0.12)}
        .sec-toggle::after{content:'';position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;transition:left 0.2s}
        .sec-toggle.on::after{left:23px}
        .sec-toggle.off::after{left:3px}
        .sec-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
        .sec-badge.ok{background:rgba(0,200,150,0.1);color:#00c896}
        .sec-badge.warn{background:rgba(245,158,11,0.1);color:#f59e0b}
      `}</style>
      <div className="sec-title">🔐 Sécurité</div>
      <div className="sec-card">
        <div className="sec-card-title">🔑 Mot de passe</div>
        <div className="sec-row">
          <div className="sec-row-info">
            <div className="sec-row-title">Mot de passe du compte</div>
            <div className="sec-row-sub">Dernière modification : il y a 30 jours</div>
          </div>
          <button className="sec-btn">Modifier</button>
        </div>
      </div>
      <div className="sec-card">
        <div className="sec-card-title">📱 Double authentification (MFA)</div>
        <div className="sec-row">
          <div className="sec-row-info">
            <div className="sec-row-title">Authentification par SMS</div>
            <div className="sec-row-sub">Recevoir un code par SMS à chaque connexion</div>
          </div>
          <button className="sec-toggle off"/>
        </div>
        <div className="sec-row">
          <div className="sec-row-info">
            <div className="sec-row-title">Application Authenticator</div>
            <div className="sec-row-sub">Google Authenticator, Authy, etc.</div>
          </div>
          <button className="sec-toggle off"/>
        </div>
      </div>
      <div className="sec-card">
        <div className="sec-card-title">🖥️ Sessions actives</div>
        {[
          { device:'Chrome — Windows 11', location:'Cotonou, Bénin', time:'Maintenant', current:true },
          { device:'Firefox — Android', location:'Cotonou, Bénin', time:'Il y a 2h', current:false },
        ].map((s,i) => (
          <div key={i} className="sec-row">
            <div className="sec-row-info">
              <div className="sec-row-title" style={{display:'flex',alignItems:'center',gap:8}}>{s.device}{s.current&&<span className="sec-badge ok">Cette session</span>}</div>
              <div className="sec-row-sub">{s.location} · {s.time}</div>
            </div>
            {!s.current && <button className="sec-btn" style={{color:'#ef4444',borderColor:'rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)'}}>Révoquer</button>}
          </div>
        ))}
      </div>
      <div className="sec-card">
        <div className="sec-card-title">📋 Journal d'activité</div>
        {[
          { action:'Connexion réussie', info:'Chrome · Cotonou', time:'Il y a 5 min', type:'ok' },
          { action:'Modification profil', info:'Nom mis à jour', time:'Il y a 2 jours', type:'ok' },
          { action:'Tentative de connexion échouée', info:'Mot de passe incorrect', time:'Il y a 5 jours', type:'warn' },
        ].map((a,i) => (
          <div key={i} className="sec-row">
            <div className="sec-row-info">
              <div className="sec-row-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <span className={`sec-badge ${a.type}`}>{a.type==='ok'?'✓':'⚠'}</span>{a.action}
              </div>
              <div className="sec-row-sub">{a.info} · {a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
