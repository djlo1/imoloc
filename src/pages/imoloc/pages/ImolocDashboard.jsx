import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

const MOIS = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']

export default function ImolocDashboard({ agence, stats, navigate }) {
  const today = new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long',year:'numeric'})
  const [baux_exp, setBauxExp] = useState([])
  const [derniers_paiements, setDerniersPaiements] = useState([])
  const [activite, setActivite] = useState([])
  const [revenus_mois, setRevenusMois] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (agence?.id) loadData() }, [agence?.id])

  const loadData = async () => {
    try {
      const now = new Date()
      const in60 = new Date(now.getTime() + 60*24*60*60*1000).toISOString().split('T')[0]
      const [bx, pm, mt, edl, paiAll] = await Promise.all([
        supabase.from('baux').select('id,date_fin,loyer_mensuel,locataires(nom,prenom),biens(nom)').eq('agence_id',agence.id).eq('statut','actif').lte('date_fin',in60).order('date_fin',{ascending:true}).limit(5),
        supabase.from('paiements').select('id,montant,statut,date_paiement,date_echeance,locataires(nom,prenom),biens(nom)').eq('agence_id',agence.id).order('created_at',{ascending:false}).limit(8),
        supabase.from('maintenances').select('id,titre,priorite,statut,created_at,biens(nom)').eq('agence_id',agence.id).order('created_at',{ascending:false}).limit(5),
        supabase.from('etats_des_lieux').select('id,type,statut,created_at,biens(nom)').order('created_at',{ascending:false}).limit(5),
        supabase.from('paiements').select('montant,date_paiement,statut').eq('agence_id',agence.id).eq('statut','paye'),
      ])
      setBauxExp(bx.data||[])
      setDerniersPaiements(pm.data||[])
      const acts = [
        ...(mt.data||[]).map(m=>({type:'maintenance',icon:'🔧',titre:`Ticket: ${m.titre}`,sub:m.biens?.nom||'',date:m.created_at,color:'#f59e0b',statut:m.statut})),
        ...(edl.data||[]).map(e=>({type:'edl',icon:'📋',titre:`EDL ${e.type==='entree'?'entree':'sortie'}`,sub:e.biens?.nom||'',date:e.created_at,color:'#8b5cf6',statut:e.statut})),
      ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6)
      setActivite(acts)
      const revParMois = MOIS.map((label,i)=>({
        label,
        value:(paiAll.data||[]).filter(x=>{const d=new Date(x.date_paiement||'');return d.getMonth()===i&&d.getFullYear()===now.getFullYear()}).reduce((s,x)=>s+Number(x.montant||0),0)
      }))
      setRevenusMois(revParMois)
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const maxRev = Math.max(...revenus_mois.map(m=>m.value),1)
  const fmt = n => Number(n||0).toLocaleString('fr-FR')

  const STATS = [
    {ic:'🏢',lbl:'Biens geres',val:stats?.biens||0,col:'#0078d4',sub:'Total du parc',path:'/imoloc/biens'},
    {ic:'👤',lbl:'Proprietaires',val:stats?.proprietaires||0,col:'#6c63ff',sub:'Enregistres',path:'/imoloc/proprietaires'},
    {ic:'👥',lbl:'Locataires',val:stats?.locataires||0,col:'#00c896',sub:'Locataires actifs',path:'/imoloc/locataires'},
    {ic:'📄',lbl:'Baux actifs',val:stats?.baux||0,col:'#f59e0b',sub:'Contrats en cours',path:'/imoloc/baux'},
    {ic:'💰',lbl:'Revenus',val:fmt(stats?.revenus)+' F',col:'#34d399',sub:'Total encaisse',path:'/imoloc/paiements'},
    {ic:'⚠️',lbl:'Retards',val:stats?.retards||0,col:stats?.retards>0?'#ef4444':'rgba(255,255,255,0.35)',sub:'Paiements en retard',path:'/imoloc/paiements'},
  ]

  const ACTIONS = [
    {ic:'🏢',lbl:'Ajouter un bien',col:'#0078d4',path:'/imoloc/biens'},
    {ic:'👥',lbl:'Nouveau locataire',col:'#6c63ff',path:'/imoloc/locataires'},
    {ic:'📄',lbl:'Creer un bail',col:'#f59e0b',path:'/imoloc/baux'},
    {ic:'💰',lbl:'Enregistrer paiement',col:'#00c896',path:'/imoloc/paiements'},
    {ic:'🔧',lbl:'Nouveau ticket',col:'#f97316',path:'/imoloc/maintenance'},
    {ic:'📋',lbl:'Etat des lieux',col:'#8b5cf6',path:'/imoloc/etats-lieux'},
  ]

  const statutPColor = {paye:'#00c896',en_attente:'#f59e0b',en_retard:'#ef4444',partiel:'#8b5cf6'}

  return (
    <>
      <style>{`
        .imd2-page{animation:imd2-in 0.22s ease}
        @keyframes imd2-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .imd2-title{font-size:26px;font-weight:800;color:#e6edf3;letter-spacing:-0.025em;margin-bottom:4px}
        .imd2-date{font-size:13px;color:rgba(255,255,255,0.35);margin-bottom:24px}
        .imd2-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
        .imd2-stat{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px 20px;cursor:pointer;transition:all 0.2s}
        .imd2-stat:hover{border-color:rgba(255,255,255,0.13);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.3)}
        .imd2-stat-head{display:flex;align-items:center;gap:8px;margin-bottom:12px}
        .imd2-stat-ic{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
        .imd2-stat-lbl{font-size:12px;color:rgba(255,255,255,0.4);font-weight:500}
        .imd2-stat-val{font-size:28px;font-weight:800;letter-spacing:-0.025em;margin-bottom:3px;line-height:1}
        .imd2-stat-sub{font-size:11.5px;color:rgba(255,255,255,0.28)}
        .imd2-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .imd2-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden}
        .imd2-card-head{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between}
        .imd2-card-title{font-size:13px;font-weight:700;color:#e6edf3}
        .imd2-card-link{font-size:12px;color:#0078d4;cursor:pointer;background:none;border:none;font-family:Inter,sans-serif}
        .imd2-card-body{padding:14px 18px}
        .imd2-empty{text-align:center;padding:24px 16px;color:rgba(255,255,255,0.25);font-size:12.5px}
        .imd2-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .imd2-action{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.18s;text-align:center}
        .imd2-action:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.04)}
        .imd2-action-ic{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:19px}
        .imd2-action-lbl{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.6);line-height:1.3}
        .imd2-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .imd2-item:last-child{border-bottom:none}
        @media(max-width:900px){.imd2-stats{grid-template-columns:repeat(2,1fr)}.imd2-row{grid-template-columns:1fr}.imd2-actions{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <div className="imd2-page">
        <div className="imd2-title">Tableau de bord</div>
        <div className="imd2-date">{today}</div>

        {/* STATS */}
        <div className="imd2-stats">
          {STATS.map(s=>(
            <div key={s.lbl} className="imd2-stat" onClick={()=>navigate(s.path)}>
              <div className="imd2-stat-head">
                <div className="imd2-stat-ic" style={{background:s.col+'22'}}>{s.ic}</div>
                <span className="imd2-stat-lbl">{s.lbl}</span>
              </div>
              <div className="imd2-stat-val" style={{color:s.col}}>{s.val}</div>
              <div className="imd2-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* GRAPHIQUE REVENUS */}
        <div className="imd2-card" style={{marginBottom:16}}>
          <div className="imd2-card-head">
            <span className="imd2-card-title">Revenus {new Date().getFullYear()}</span>
            <button className="imd2-card-link" onClick={()=>navigate('/imoloc/rapports')}>Voir rapports</button>
          </div>
          <div className="imd2-card-body">
            <div style={{display:'flex',alignItems:'flex-end',gap:4,height:80,paddingBottom:18,position:'relative'}}>
              {revenus_mois.map((m,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:'100%',borderRadius:'2px 2px 0 0',height:`${Math.max((m.value/maxRev)*60,m.value>0?3:0)}px`,background:'#0078d4',opacity:0.8,transition:'height 0.3s'}}/>
                  <div style={{fontSize:8,color:'rgba(255,255,255,0.3)',position:'absolute',bottom:0,marginTop:3}}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="imd2-row">
          {/* BAUX EXPIRANT */}
          <div className="imd2-card">
            <div className="imd2-card-head">
              <span className="imd2-card-title">Baux expirant bientot</span>
              <button className="imd2-card-link" onClick={()=>navigate('/imoloc/baux')}>Voir tous</button>
            </div>
            <div className="imd2-card-body">
              {baux_exp.length===0?(
                <div className="imd2-empty">Aucun bail n'expire dans les 60 prochains jours</div>
              ):baux_exp.map(b=>{
                const jours = Math.ceil((new Date(b.date_fin)-new Date())/(1000*60*60*24))
                return (
                  <div key={b.id} className="imd2-item">
                    <div style={{width:34,height:34,borderRadius:8,background:jours<=15?'rgba(239,68,68,0.12)':'rgba(245,158,11,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:16}}>📄</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:600,color:'#e6edf3',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.biens?.nom||'—'}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{b.locataires?.prenom} {b.locataires?.nom}</div>
                    </div>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,fontWeight:700,background:jours<=15?'rgba(239,68,68,0.12)':'rgba(245,158,11,0.12)',color:jours<=15?'#ef4444':'#f59e0b',whiteSpace:'nowrap'}}>{jours}j</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* DERNIERS PAIEMENTS */}
          <div className="imd2-card">
            <div className="imd2-card-head">
              <span className="imd2-card-title">Derniers paiements</span>
              <button className="imd2-card-link" onClick={()=>navigate('/imoloc/paiements')}>Voir tous</button>
            </div>
            <div className="imd2-card-body">
              {derniers_paiements.length===0?(
                <div className="imd2-empty">Aucun paiement enregistre</div>
              ):derniers_paiements.map(p=>(
                <div key={p.id} className="imd2-item">
                  <div style={{width:34,height:34,borderRadius:8,background:(statutPColor[p.statut]||'#4da6ff')+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:15}}>💰</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:'#e6edf3',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.biens?.nom||'—'}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{p.locataires?.prenom} {p.locataires?.nom}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:statutPColor[p.statut]||'#4da6ff'}}>{fmt(p.montant)} F</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{new Date(p.date_echeance).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="imd2-row">
          {/* ACTIVITE RECENTE */}
          <div className="imd2-card">
            <div className="imd2-card-head">
              <span className="imd2-card-title">Activite recente</span>
            </div>
            <div className="imd2-card-body">
              {activite.length===0?(
                <div className="imd2-empty">Aucune activite recente</div>
              ):activite.map((a,i)=>(
                <div key={i} className="imd2-item">
                  <div style={{width:34,height:34,borderRadius:8,background:a.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:16}}>{a.icon}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:'#e6edf3',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.titre}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{a.sub}</div>
                  </div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',flexShrink:0}}>{new Date(a.date).toLocaleDateString('fr-FR')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONS RAPIDES */}
          <div className="imd2-card">
            <div className="imd2-card-head">
              <span className="imd2-card-title">Actions rapides</span>
            </div>
            <div className="imd2-card-body">
              <div className="imd2-actions">
                {ACTIONS.map(a=>(
                  <div key={a.lbl} className="imd2-action" onClick={()=>navigate(a.path)}>
                    <div className="imd2-action-ic" style={{background:a.col+'22'}}>{a.ic}</div>
                    <span className="imd2-action-lbl">{a.lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
