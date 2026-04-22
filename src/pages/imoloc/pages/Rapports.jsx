import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

const MOIS = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'16px 20px'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontWeight:500}}>{label}</div>
        {icon&&<span style={{fontSize:20,opacity:0.6}}>{icon}</span>}
      </div>
      <div style={{fontSize:28,fontWeight:700,color:color||'#4da6ff',marginBottom:4}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{sub}</div>}
    </div>
  )
}

function BarChart({ data, color, height }) {
  const max = Math.max(...data.map(d=>d.value),1)
  const h = height||140
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:h,paddingBottom:20,position:'relative'}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginBottom:2}}>
            {d.value>0?(d.value>=1000000?(d.value/1000000).toFixed(1)+'M':d.value>=1000?(d.value/1000).toFixed(0)+'k':d.value):''}
          </div>
          <div style={{width:'100%',borderRadius:'3px 3px 0 0',height:`${Math.max((d.value/max)*(h-30),d.value>0?4:0)}px`,background:color||'#0078d4',opacity:0.85}}/>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',position:'absolute',bottom:0}}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function Rapports() {
  const [agence,setAgence] = useState(null)
  const [loading,setLoading] = useState(true)
  const [annee,setAnnee] = useState(new Date().getFullYear())
  const [activeTab,setActiveTab] = useState('financier')
  const [stats,setStats] = useState({revenus_total:0,revenus_mois:0,paiements_en_attente:0,retards_total:0,biens_total:0,biens_occupes:0,biens_libres:0,taux_occupation:0,locataires_total:0,locataires_actifs:0,baux_actifs:0,baux_expires:0,maintenances_ouvertes:0,maintenances_resolues:0})
  const [revenus_mois,setRevenusMois] = useState([])
  const [paiements_statut,setPaiementsStatut] = useState([])
  const [top_biens,setTopBiens] = useState([])
  const [retards_list,setRetardsList] = useState([])

  useEffect(()=>{ initData() },[annee])

  const initData = async () => {
    setLoading(true)
    try {
      const {data:{user}} = await supabase.auth.getUser()
      const {data:agList} = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const [biens,locataires,baux,paiements,maintenances] = await Promise.all([
        supabase.from('biens').select('id,nom,statut,loyer_mensuel').eq('agence_id',ag.id),
        supabase.from('locataires').select('id,statut_global').eq('agence_id',ag.id),
        supabase.from('baux').select('id,statut,loyer_mensuel').eq('agence_id',ag.id),
        supabase.from('paiements').select('id,montant,statut,date_echeance,date_paiement,retard_jours,bail_id,biens(nom)').eq('agence_id',ag.id),
        supabase.from('maintenances').select('id,statut').eq('agence_id',ag.id),
      ])
      const b=biens.data||[], l=locataires.data||[], bx=baux.data||[], p=paiements.data||[], m=maintenances.data||[]
      const occupes=b.filter(x=>x.statut==='occupe').length
      const payes=p.filter(x=>x.statut==='paye')
      const enAttente=p.filter(x=>x.statut==='en_attente')
      const retards=p.filter(x=>x.statut==='en_retard')
      const revTotal=payes.reduce((s,x)=>s+Number(x.montant||0),0)
      const now=new Date()
      const revMois=payes.filter(x=>{const d=new Date(x.date_paiement||x.date_echeance);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).reduce((s,x)=>s+Number(x.montant||0),0)
      setStats({revenus_total:revTotal,revenus_mois:revMois,paiements_en_attente:enAttente.reduce((s,x)=>s+Number(x.montant||0),0),retards_total:retards.length,biens_total:b.length,biens_occupes:occupes,biens_libres:b.filter(x=>x.statut==='disponible').length,taux_occupation:b.length>0?Math.round((occupes/b.length)*100):0,locataires_total:l.length,locataires_actifs:l.filter(x=>x.statut_global==='actif'||!x.statut_global).length,baux_actifs:bx.filter(x=>x.statut==='actif').length,baux_expires:bx.filter(x=>x.statut==='expire').length,maintenances_ouvertes:m.filter(x=>x.statut==='ouvert'||x.statut==='en_cours').length,maintenances_resolues:m.filter(x=>x.statut==='resolu'||x.statut==='ferme').length})
      setRevenusMois(MOIS.map((label,i)=>({label,value:payes.filter(x=>{const d=new Date(x.date_paiement||x.date_echeance);return d.getMonth()===i&&d.getFullYear()===annee}).reduce((s,x)=>s+Number(x.montant||0),0)})))
      const total=p.length||1
      setPaiementsStatut([{label:'Payes',value:payes.length,color:'#00c896'},{label:'En attente',value:enAttente.length,color:'#f59e0b'},{label:'En retard',value:retards.length,color:'#ef4444'},{label:'Partiels',value:p.filter(x=>x.statut==='partiel').length,color:'#8b5cf6'}])
      const bienRevs={}
      payes.forEach(x=>{const nom=x.biens?.nom||'Autre';bienRevs[nom]=(bienRevs[nom]||0)+Number(x.montant||0)})
      setTopBiens(Object.entries(bienRevs).sort((a,b)=>b[1]-a[1]).slice(0,5))
      setRetardsList(retards.slice(0,10))
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const fmt = n => Number(n).toLocaleString('fr-FR')
  const exportCSV = () => {
    const rows=[['Mois','Revenus (FCFA)'],...revenus_mois.map(m=>[m.label,m.value])]
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n'));a.download=`rapports_${annee}.csv`;a.click()
  }

  const btnBase={display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:5,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s'}
  const maxBien=top_biens[0]?.[1]||1

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>

  return (
    <>
      <style>{`.rp-tab{padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.4);transition:all 0.15s}.rp-tab.on{background:rgba(255,255,255,0.08);color:#e6edf3}`}</style>
      <div style={{minHeight:'100%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:3}}>Rapports et Analytiques</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>{agence?.nom} — {annee}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <select value={annee} onChange={e=>setAnnee(Number(e.target.value))} style={{padding:'7px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:'#e6edf3',fontFamily:'Inter,sans-serif',fontSize:13,cursor:'pointer',colorScheme:'dark'}}>
              {[2024,2025,2026,2027].map(y=><option key={y} value={y} style={{background:'#161b22'}}>{y}</option>)}
            </select>
            <button style={{...btnBase,color:'#00c896',borderColor:'rgba(0,200,150,0.25)',background:'rgba(0,200,150,0.06)'}} onClick={exportCSV}>Export CSV</button>
          </div>
        </div>
        <div style={{display:'flex',gap:2,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:3,width:'fit-content',marginBottom:20}}>
          {[['financier','Financier'],['occupation','Occupation'],['locataires','Locataires'],['maintenance','Maintenance']].map(([k,l])=>(
            <button key={k} className={'rp-tab'+(activeTab===k?' on':'')} onClick={()=>setActiveTab(k)}>{l}</button>
          ))}
        </div>

        {activeTab==='financier'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
              <StatCard label="Revenus totaux" value={fmt(stats.revenus_total)+' F'} sub="Tous paiements recus" color="#00c896" icon="💰"/>
              <StatCard label="Revenus ce mois" value={fmt(stats.revenus_mois)+' F'} sub={new Date().toLocaleString('fr-FR',{month:'long',year:'numeric'})} color="#4da6ff" icon="📅"/>
              <StatCard label="En attente" value={fmt(stats.paiements_en_attente)+' F'} sub="Paiements non encaisses" color="#f59e0b" icon="⏳"/>
              <StatCard label="Retards" value={stats.retards_total} sub="Paiements en retard" color="#ef4444" icon="⚠️"/>
            </div>
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:16}}>Revenus mensuels {annee}</div>
              <BarChart data={revenus_mois} color="#0078d4"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:16}}>Top biens par revenus</div>
                {top_biens.length===0?<div style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.25)',fontSize:13}}>Aucune donnee</div>:top_biens.map(([nom,val],i)=>(
                  <div key={i} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:12.5,color:'#e6edf3',fontWeight:500}}>{nom}</span><span style={{fontSize:12,color:'#00c896',fontWeight:600}}>{fmt(val)} F</span></div>
                    <div style={{height:5,background:'rgba(255,255,255,0.06)',borderRadius:3}}><div style={{height:'100%',width:`${(val/maxBien)*100}%`,background:'#0078d4',borderRadius:3}}/></div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:16}}>Repartition paiements</div>
                {paiements_statut.map(({label,value,color},i)=>{
                  const total=paiements_statut.reduce((s,x)=>s+x.value,0)||1
                  return (<div key={i} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:12.5,color:'#e6edf3'}}>{label}</span><span style={{fontSize:12,color,fontWeight:600}}>{value} ({Math.round((value/total)*100)}%)</span></div>
                    <div style={{height:5,background:'rgba(255,255,255,0.06)',borderRadius:3}}><div style={{height:'100%',width:`${(value/total)*100}%`,background:color,borderRadius:3}}/></div>
                  </div>)
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab==='occupation'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
              <StatCard label="Total biens" value={stats.biens_total} sub="Dans le portefeuille" color="#4da6ff" icon="🏠"/>
              <StatCard label="Occupes" value={stats.biens_occupes} sub={stats.taux_occupation+'% du portefeuille'} color="#00c896" icon="✅"/>
              <StatCard label="Disponibles" value={stats.biens_libres} sub="Prets a louer" color="#f59e0b" icon="🔑"/>
              <StatCard label="Taux occupation" value={stats.taux_occupation+'%'} sub="Portefeuille global" color={stats.taux_occupation>=80?'#00c896':stats.taux_occupation>=60?'#f59e0b':'#ef4444'} icon="📊"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:20}}>Repartition du parc</div>
                {[{label:'Occupes',val:stats.biens_occupes,color:'#00c896'},{label:'Disponibles',val:stats.biens_libres,color:'#f59e0b'},{label:'Autres',val:stats.biens_total-stats.biens_occupes-stats.biens_libres,color:'#8b949e'}].map(({label,val,color})=>(
                  <div key={label} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:'#e6edf3'}}>{label}</span><span style={{fontSize:13,fontWeight:600,color}}>{val} bien{val!==1?'s':''}</span></div>
                    <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:4}}><div style={{height:'100%',width:`${stats.biens_total>0?(val/stats.biens_total)*100:0}%`,background:color,borderRadius:4}}/></div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px 24px'}}>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:20}}>Baux</div>
                {[{label:'Baux actifs',val:stats.baux_actifs,color:'#00c896'},{label:'Baux expires',val:stats.baux_expires,color:'#ef4444'}].map(({label,val,color})=>(
                  <div key={label} style={{marginBottom:14,padding:'14px',background:color+'0f',border:`1px solid ${color}33`,borderRadius:8}}>
                    <div style={{fontSize:28,fontWeight:700,color,marginBottom:4}}>{val}</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab==='locataires'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
              <StatCard label="Total locataires" value={stats.locataires_total} sub="Dans la base" color="#4da6ff" icon="👥"/>
              <StatCard label="Locataires actifs" value={stats.locataires_actifs} sub="Avec bail en cours" color="#00c896" icon="✅"/>
              <StatCard label="Retards de paiement" value={stats.retards_total} sub="Paiements en retard" color="#ef4444" icon="⚠️"/>
            </div>
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px 24px'}}>
              <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:16}}>Paiements en retard</div>
              {retards_list.length===0?(
                <div style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.25)',fontSize:13}}>
                  <div style={{fontSize:28,marginBottom:8,opacity:0.4}}>✅</div>Aucun retard de paiement
                </div>
              ):(
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Bail','Montant','Echeance','Retard'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{retards_list.map((r,i)=>(
                    <tr key={i}>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,color:'#e6edf3'}}>{r.bail_id?.slice(0,8)}...</td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,color:'#ef4444',fontWeight:600}}>{fmt(r.montant)} F</td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{new Date(r.date_echeance).toLocaleDateString('fr-FR')}</td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12,color:'#f59e0b'}}>{r.retard_jours||'—'} j</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab==='maintenance'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
              <StatCard label="Tickets ouverts" value={stats.maintenances_ouvertes} sub="En attente ou en cours" color="#f59e0b" icon="🔧"/>
              <StatCard label="Tickets resolus" value={stats.maintenances_resolues} sub="Resolus ou fermes" color="#00c896" icon="✅"/>
              <StatCard label="Total tickets" value={stats.maintenances_ouvertes+stats.maintenances_resolues} sub="Depuis le debut" color="#4da6ff" icon="📋"/>
              <StatCard label="Taux resolution" value={stats.maintenances_ouvertes+stats.maintenances_resolues>0?Math.round((stats.maintenances_resolues/(stats.maintenances_ouvertes+stats.maintenances_resolues))*100)+'%':'—'} sub="Tickets resolus / total" color="#8b5cf6" icon="📊"/>
            </div>
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px 24px'}}>
              <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:20}}>Suivi des tickets</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {[{label:'Ouverts / En cours',val:stats.maintenances_ouvertes,color:'#f59e0b',icon:'🔧'},{label:'Resolus / Fermes',val:stats.maintenances_resolues,color:'#00c896',icon:'✅'}].map(({label,val,color,icon})=>(
                  <div key={label} style={{padding:'20px',background:color+'0f',border:`1px solid ${color}33`,borderRadius:10,textAlign:'center'}}>
                    <div style={{fontSize:36,marginBottom:8}}>{icon}</div>
                    <div style={{fontSize:32,fontWeight:700,color,marginBottom:6}}>{val}</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
