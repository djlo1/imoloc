export default function ImolocDashboard({ agence, stats, navigate }) {
  const today = new Date().toLocaleDateString("fr-FR", {weekday:"long",day:"numeric",month:"long",year:"numeric"})

  const STATS = [
    {ic:"🏢", lbl:"Biens geres", val:stats?.biens||0, col:"#0078d4", sub:"Total du parc immobilier", path:"/imoloc/biens"},
    {ic:"👤", lbl:"Proprietaires", val:stats?.proprietaires||0, col:"#6c63ff", sub:"Proprietaires enregistres", path:"/imoloc/proprietaires"},
    {ic:"👥", lbl:"Locataires", val:stats?.locataires||0, col:"#00c896", sub:"Locataires actifs", path:"/imoloc/locataires"},
    {ic:"📄", lbl:"Baux actifs", val:stats?.baux||0, col:"#f59e0b", sub:"Contrats en cours", path:"/imoloc/baux"},
    {ic:"💰", lbl:"Revenus", val:(stats?.revenus||0).toLocaleString()+" FCFA", col:"#34d399", sub:"Total encaisse", path:"/imoloc/paiements"},
    {ic:"⚠️", lbl:"Retards", val:stats?.retards||0, col:stats?.retards>0?"#ef4444":"rgba(255,255,255,0.35)", sub:"Paiements en retard", path:"/imoloc/paiements/retard"},
  ]

  const ACTIONS = [
    {ic:"🏢", lbl:"Ajouter un bien", col:"#0078d4", path:"/imoloc/biens"},
    {ic:"👥", lbl:"Nouveau locataire", col:"#6c63ff", path:"/imoloc/locataires"},
    {ic:"📄", lbl:"Creer un bail", col:"#f59e0b", path:"/imoloc/baux"},
    {ic:"💰", lbl:"Enregistrer un paiement", col:"#00c896", path:"/imoloc/paiements"},
    {ic:"✨", lbl:"Demander a Loci", col:"#a78bfa", path:"/imoloc/loci"},
    {ic:"📋", lbl:"Etat des lieux", col:"#fb923c", path:"/imoloc/etats-lieux"},
  ]

  return (
    <>
      <style>{`
        .imd2-page{animation:imd2-in 0.22s ease}
        @keyframes imd2-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .imd2-bc{font-size:12.5px;color:rgba(255,255,255,0.35);margin-bottom:20px}
        .imd2-hero{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:20px}
        .imd2-title{font-size:26px;font-weight:800;color:#e6edf3;letter-spacing:-0.025em;margin-bottom:4px}
        .imd2-date{font-size:13px;color:rgba(255,255,255,0.35)}
        .imd2-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
        .imd2-stat{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 22px;cursor:pointer;transition:all 0.2s}
        .imd2-stat:hover{border-color:rgba(255,255,255,0.13);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.3)}
        .imd2-stat-head{display:flex;align-items:center;gap:8px;margin-bottom:14px}
        .imd2-stat-ic{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .imd2-stat-lbl{font-size:12.5px;color:rgba(255,255,255,0.4);font-weight:500}
        .imd2-stat-val{font-size:30px;font-weight:800;letter-spacing:-0.025em;margin-bottom:4px;line-height:1}
        .imd2-stat-sub{font-size:12px;color:rgba(255,255,255,0.28)}
        .imd2-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
        .imd2-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
        .imd2-card-head{padding:16px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between}
        .imd2-card-title{font-size:13.5px;font-weight:700;color:#e6edf3}
        .imd2-card-link{font-size:12.5px;color:#0078d4;cursor:pointer;background:none;border:none;font-family:Inter,sans-serif}
        .imd2-card-body{padding:14px 18px}
        .imd2-empty{text-align:center;padding:28px 16px;color:rgba(255,255,255,0.25);font-size:13px}
        .imd2-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .imd2-action{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.18s;text-align:center}
        .imd2-action:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.04)}
        .imd2-action-ic{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
        .imd2-action-lbl{font-size:12px;font-weight:600;color:rgba(255,255,255,0.6);line-height:1.3}
        .imd2-loci{background:linear-gradient(135deg,rgba(108,99,255,0.08),rgba(0,200,150,0.06));border:1px solid rgba(108,99,255,0.2);border-radius:12px;padding:20px 22px;display:flex;align-items:center;gap:18px;cursor:pointer;transition:all 0.2s;margin-bottom:28px}
        .imd2-loci:hover{border-color:rgba(108,99,255,0.35);transform:translateY(-1px)}
        .imd2-loci-ic{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.15));display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
        .imd2-loci-title{font-size:15px;font-weight:700;color:#c4b5fd;margin-bottom:4px}
        .imd2-loci-desc{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6}
        @media(max-width:1100px){.imd2-stats{grid-template-columns:repeat(2,1fr)}.imd2-row{grid-template-columns:1fr}}
      `}</style>

      <div className="imd2-page">
        <div className="imd2-bc">Centre Imoloc › Tableau de bord</div>

        <div className="imd2-hero">
          <div>
            <div className="imd2-title">Tableau de bord</div>
            <div className="imd2-date">{today.charAt(0).toUpperCase()+today.slice(1)}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}>Organisation :</span>
            <span style={{fontSize:13,fontWeight:600,color:"#e6edf3"}}>{agence?.nom||"—"}</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:"100px",background:"rgba(0,200,150,0.1)",border:"1px solid rgba(0,200,150,0.2)",fontSize:12,color:"#00c896",fontWeight:600}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#00c896"}}/>Actif
            </span>
          </div>
        </div>

        <div className="imd2-loci" onClick={()=>navigate("/imoloc/loci")}>
          <div className="imd2-loci-ic">✨</div>
          <div style={{flex:1}}>
            <div className="imd2-loci-title">Loci IA — Votre assistant immobilier</div>
            <div className="imd2-loci-desc">Posez vos questions sur vos biens, locataires ou finances. Loci analyse vos donnees en temps reel et vous guide.</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,color:"#a78bfa",fontSize:13,fontWeight:600,flexShrink:0}}>
            Ouvrir Loci
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </div>
        </div>

        <div className="imd2-stats">
          {STATS.map((s,i)=>(
            <div key={i} className="imd2-stat" onClick={()=>navigate(s.path)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=s.col+"33"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}}>
              <div className="imd2-stat-head">
                <div className="imd2-stat-ic" style={{background:s.col+"15",border:`1px solid ${s.col}25`}}>{s.ic}</div>
                <span className="imd2-stat-lbl">{s.lbl}</span>
              </div>
              <div className="imd2-stat-val" style={{color:s.col}}>{s.val}</div>
              <div className="imd2-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="imd2-row">
          <div className="imd2-card">
            <div className="imd2-card-head">
              <span className="imd2-card-title">Actions rapides</span>
            </div>
            <div className="imd2-card-body">
              <div className="imd2-actions">
                {ACTIONS.map((a,i)=>(
                  <div key={i} className="imd2-action" onClick={()=>navigate(a.path)}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=a.col+"44"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
                    <div className="imd2-action-ic" style={{background:a.col+"18",border:`1px solid ${a.col}28`}}>{a.ic}</div>
                    <span className="imd2-action-lbl">{a.lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="imd2-card">
            <div className="imd2-card-head">
              <span className="imd2-card-title">Alertes</span>
              <button className="imd2-card-link" onClick={()=>navigate("/imoloc/paiements/retard")}>Voir tout</button>
            </div>
            <div className="imd2-card-body">
              {stats?.retards > 0 ? (
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",cursor:"pointer"}} onClick={()=>navigate("/imoloc/paiements/retard")}>
                  <span style={{fontSize:22}}>⚠️</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13.5,fontWeight:600,color:"#e6edf3",marginBottom:2}}>{stats.retards} paiement{stats.retards>1?"s":""} en retard</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Des locataires ont des loyers impayes</div>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:"rgba(0,200,150,0.06)",border:"1px solid rgba(0,200,150,0.15)"}}>
                  <span style={{fontSize:18}}>✅</span>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.55)"}}>Aucun retard de paiement</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="imd2-card">
          <div className="imd2-card-head">
            <span className="imd2-card-title">Activite recente</span>
          </div>
          <div className="imd2-card-body">
            <div className="imd2-empty">Aucune activite recente. Les actions sur vos biens, baux et paiements apparaitront ici.</div>
          </div>
        </div>
      </div>
    </>
  )
}
