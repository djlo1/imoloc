import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const TYPE_CFG = {
  plomberie:    { icon:'🔧', color:'#0078d4', label:'Plomberie' },
  electricite:  { icon:'⚡', color:'#f59e0b', label:'Electricite' },
  peinture:     { icon:'🎨', color:'#8b5cf6', label:'Peinture' },
  menuiserie:   { icon:'🪚', color:'#b45309', label:'Menuiserie' },
  climatisation:{ icon:'❄️', color:'#06b6d4', label:'Climatisation' },
  maconnerie:   { icon:'🧱', color:'#6b7280', label:'Maconnerie' },
  nettoyage:    { icon:'🧹', color:'#059669', label:'Nettoyage' },
  autre:        { icon:'🔨', color:'#6b7280', label:'Autre' },
}
const PRIO_CFG = {
  urgente: { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'Urgente' },
  haute:   { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'Haute' },
  normale: { color:'#0078d4', bg:'rgba(0,120,212,0.1)',  label:'Normale' },
  faible:  { color:'#8b949e', bg:'rgba(139,148,158,0.1)',label:'Faible' },
}
const STATUT_CFG = {
  ouvert:    { color:'#f59e0b', bg:'rgba(245,158,11,0.1)',  label:'Ouvert' },
  en_cours:  { color:'#0078d4', bg:'rgba(0,120,212,0.1)',   label:'En cours' },
  en_attente:{ color:'#8b5cf6', bg:'rgba(139,92,246,0.1)',  label:'En attente' },
  resolu:    { color:'#00c896', bg:'rgba(0,200,150,0.1)',   label:'Resolu' },
  ferme:     { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Ferme' },
}

const Badge = ({ val, cfg }) => {
  const c = cfg[val] || Object.values(cfg)[0]
  return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,background:c.bg,color:c.color,border:`1px solid ${c.color}33`,whiteSpace:'nowrap'}}>{c.label}</span>
}

export default function Maintenance() {
  const [agence, setAgence]         = useState(null)
  const [tickets, setTickets]       = useState([])
  const [biens, setBiens]           = useState([])
  const [locataires, setLocataires] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [fStatut, setFStatut]       = useState('tous')
  const [fPrio, setFPrio]           = useState('tous')
  const [sel, setSel]               = useState(null)
  const [tab, setTab]               = useState('details')
  const [showAdd, setShowAdd]       = useState(false)
  const [step, setStep]             = useState(1)
  const [saving, setSaving]         = useState(false)
  const [newComment, setNewComment] = useState('')
  const [form, setForm] = useState({
    titre:'', type:'plomberie', priorite:'normale', bien_id:'',
    locataire_id:'', description:'', notes:'',
    prestataire_nom:'', prestataire_telephone:'', prestataire_email:'',
    cout_estime:'', date_debut_travaux:'', date_fin_travaux:'',
  })
  const setF = (k,v) => setForm(p=>({...p,[k]:v}))

  useEffect(()=>{ initData() },[])

  const initData = async () => {
    setLoading(true)
    try {
      const {data:{user}} = await supabase.auth.getUser()
      const {data:agList} = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const [t,b,l] = await Promise.all([
        supabase.from('maintenances').select('*,biens(nom,ville),locataires(nom,prenom)').eq('agence_id',ag.id).order('created_at',{ascending:false}),
        supabase.from('biens').select('id,nom,ville').eq('agence_id',ag.id),
        supabase.from('locataires').select('id,nom,prenom').eq('agence_id',ag.id),
      ])
      setTickets(t.data||[])
      setBiens(b.data||[])
      setLocataires(l.data||[])
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const creerTicket = async () => {
    if (!form.titre||!form.bien_id){toast.error('Titre et bien requis');return}
    setSaving(true)
    try {
      const {data:{user}} = await supabase.auth.getUser()
      const {error} = await supabase.from('maintenances').insert({
        agence_id:agence.id, titre:form.titre, type:form.type,
        priorite:form.priorite, bien_id:form.bien_id,
        locataire_id:form.locataire_id||null,
        description:form.description, notes:form.notes,
        prestataire_nom:form.prestataire_nom,
        prestataire_telephone:form.prestataire_telephone,
        prestataire_email:form.prestataire_email,
        cout_estime:form.cout_estime?parseFloat(form.cout_estime):null,
        date_debut_travaux:form.date_debut_travaux||null,
        date_fin_travaux:form.date_fin_travaux||null,
        statut:'ouvert', cree_par:user.id,
      })
      if(error) throw error
      toast.success('Ticket cree !')
      resetAdd()
      await initData()
    } catch(e){toast.error(e.message)}
    finally{setSaving(false)}
  }

  const changerStatut = async (ticket, newStatut) => {
    const {error} = await supabase.from('maintenances').update({statut:newStatut,updated_at:new Date().toISOString()}).eq('id',ticket.id)
    if(error){toast.error(error.message);return}
    setTickets(prev=>prev.map(t=>t.id===ticket.id?{...t,statut:newStatut}:t))
    setSel(prev=>prev?{...prev,statut:newStatut}:prev)
    toast.success('Statut mis a jour')
  }

  const ajouterCommentaire = async () => {
    if(!newComment.trim()||!sel) return
    const {data:{user}} = await supabase.auth.getUser()
    const commentaires = [...(sel.commentaires||[]),{
      id:Date.now(), texte:newComment, auteur:user.email,
      date:new Date().toISOString()
    }]
    const {error} = await supabase.from('maintenances').update({commentaires,updated_at:new Date().toISOString()}).eq('id',sel.id)
    if(error){toast.error(error.message);return}
    setSel(prev=>({...prev,commentaires}))
    setTickets(prev=>prev.map(t=>t.id===sel.id?{...t,commentaires}:t))
    setNewComment('')
    toast.success('Commentaire ajoute')
  }

  const resetAdd = () => {
    setShowAdd(false); setStep(1)
    setForm({titre:'',type:'plomberie',priorite:'normale',bien_id:'',
      locataire_id:'',description:'',notes:'',
      prestataire_nom:'',prestataire_telephone:'',prestataire_email:'',
      cout_estime:'',date_debut_travaux:'',date_fin_travaux:''})
  }

  const filtered = tickets.filter(t=>{
    const q=search.toLowerCase()
    const ms=!q||`${t.titre} ${t.biens?.nom||''} ${t.prestataire_nom||''} `.toLowerCase().includes(q)
    const fs=fStatut==='tous'||t.statut===fStatut
    const fp=fPrio==='tous'||t.priorite===fPrio
    return ms&&fs&&fp
  })

  const stats = {
    total:tickets.length,
    urgents:tickets.filter(t=>t.priorite==='urgente'&&t.statut!=='ferme').length,
    en_cours:tickets.filter(t=>t.statut==='en_cours').length,
    resolus_mois:tickets.filter(t=>{
      if(t.statut!=='resolu'&&t.statut!=='ferme') return false
      const d=new Date(t.updated_at); const n=new Date()
      return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()
    }).length,
  }

  const inp = {width:'100%',padding:'8px 11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',outline:'none',colorScheme:'dark',boxSizing:'border-box'}
  const sel2 = {...inp,cursor:'pointer',background:'rgba(20,27,40,0.95)'}
  const lbl = {display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:5}
  const btnBase = {display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:5,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s'}
  const btnP = {...btnBase,background:'#0078d4',borderColor:'#0078d4',color:'#fff'}

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>

  return (
    <>
      <style>{`
        .mt-row:hover td{background:rgba(255,255,255,0.02);cursor:pointer}
        .mt-tab{padding:8px 14px;border-radius:6px;font-size:12.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.4);transition:all 0.15s}
        .mt-tab.on{background:rgba(255,255,255,0.08);color:#e6edf3}
        .mt-ftab{padding:5px 12px;border-radius:100px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4);font-family:Inter,sans-serif;transition:all 0.15s}
        .mt-ftab.on{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .mt-sdot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin:0 auto 5px;transition:all 0.2s}
      `}</style>
      <div style={{minHeight:'100%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:3}}>Maintenance & Travaux</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>{filtered.length} ticket{filtered.length!==1?'s':''} — {agence?.nom}</div>
          </div>
          <button style={btnP} onClick={()=>setShowAdd(true)}>+ Nouveau ticket</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20}}>
          {[{label:'Total',val:stats.total,color:'#4da6ff'},{label:'Urgents actifs',val:stats.urgents,color:'#ef4444'},{label:'En cours',val:stats.en_cours,color:'#0078d4'},{label:'Resolus ce mois',val:stats.resolus_mois,color:'#00c896'}].map(({label,val,color})=>(
            <div key={label} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'14px 18px'}}>
              <div style={{fontSize:26,fontWeight:700,color,marginBottom:3}}>{val}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'6px 12px'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:180}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>x</button>}
          </div>
          <div style={{width:1,height:20,background:'rgba(255,255,255,0.08)'}}/>
          {[['tous','Tous'],['ouvert','Ouverts'],['en_cours','En cours'],['en_attente','En attente'],['resolu','Resolus'],['ferme','Fermes']].map(([v,l])=>(
            <button key={v} className={'mt-ftab'+(fStatut===v?' on':'')} onClick={()=>setFStatut(v)}>{l}</button>
          ))}
          <div style={{width:1,height:20,background:'rgba(255,255,255,0.08)'}}/>
          {[['tous','Toutes priorites'],['urgente','Urgente'],['haute','Haute'],['normale','Normale'],['faible','Faible']].map(([v,l])=>(
            <button key={v} className={'mt-ftab'+(fPrio===v?' on':'')} onClick={()=>setFPrio(v)}>{l}</button>
          ))}
        </div>
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
          {filtered.length===0?(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:36,marginBottom:12,opacity:0.2}}>🔧</div>
              <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.3)',marginBottom:8}}>Aucun ticket de maintenance</div>
              <button style={{...btnP,margin:'0 auto'}} onClick={()=>setShowAdd(true)}>+ Nouveau ticket</button>
            </div>
          ):(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Ticket','Bien','Type','Priorite','Statut','Prestataire','Cout',''].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
              ))}</tr></thead>
              <tbody>{filtered.map(t=>{
                const tc=TYPE_CFG[t.type]||TYPE_CFG.autre
                return (
                  <tr key={t.id} className="mt-row" onClick={()=>{setSel(t);setTab('details')}}>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{fontWeight:600,color:'#e6edf3',fontSize:13}}>{t.titre}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{new Date(t.created_at).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{fontSize:12.5}}>{t.biens?.nom||'—'}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{t.biens?.ville||''}</div>
                    </td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><span style={{fontSize:13}}>{tc.icon}</span><span style={{fontSize:11,color:tc.color,marginLeft:5,fontWeight:600}}>{tc.label}</span></td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><Badge val={t.priorite} cfg={PRIO_CFG}/></td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><Badge val={t.statut} cfg={STATUT_CFG}/></td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{t.prestataire_nom||'—'}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:t.cout_reel?'#00c896':'rgba(255,255,255,0.4)'}}>{t.cout_reel?Number(t.cout_reel).toLocaleString('fr-FR')+' F':t.cout_estime?'~'+Number(t.cout_estime).toLocaleString('fr-FR')+' F':'—'}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}} onClick={e=>e.stopPropagation()}><button style={{...btnBase,fontSize:11,padding:'4px 10px'}} onClick={()=>{setSel(t);setTab('details')}}>Voir</button></td>
                  </tr>
                )
              })}</tbody>
            </table>
          )}
        </div>
      </div>

      {sel&&(
        <div style={{position:'fixed',top:0,right:0,height:'100vh',width:'min(700px,96vw)',background:'#0d1117',borderLeft:'1px solid rgba(255,255,255,0.08)',zIndex:200,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                  <span style={{fontSize:22}}>{(TYPE_CFG[sel.type]||TYPE_CFG.autre).icon}</span>
                  <div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>{sel.titre}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
                  <Badge val={sel.priorite} cfg={PRIO_CFG}/>
                  <Badge val={sel.statut} cfg={STATUT_CFG}/>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{sel.biens?.nom}{sel.biens?.ville?` · ${sel.biens.ville}`:''}</span>
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {Object.entries(STATUT_CFG).map(([k,v])=>(
                    <button key={k} onClick={()=>changerStatut(sel,k)} style={{padding:'3px 9px',borderRadius:100,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${sel.statut===k?v.color:'rgba(255,255,255,0.1)'}`,background:sel.statut===k?v.bg:'transparent',color:sel.statut===k?v.color:'rgba(255,255,255,0.3)',transition:'all 0.15s'}}>{v.label}</button>
                  ))}
                </div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22,lineHeight:1,padding:'2px 6px'}}>x</button>
            </div>
            <div style={{display:'flex',gap:2}}>
              {[['details','Details'],['suivi','Suivi & Commentaires'],['documents','Documents']].map(([k,l])=>(
                <button key={k} className={'mt-tab'+(tab===k?' on':'')} onClick={()=>setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
            {tab==='details'&&(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
                  {[['Type',`${(TYPE_CFG[sel.type]||TYPE_CFG.autre).icon} ${(TYPE_CFG[sel.type]||TYPE_CFG.autre).label}`],['Priorite',(PRIO_CFG[sel.priorite]||PRIO_CFG.normale).label],['Bien',`${sel.biens?.nom||'—'}`],['Locataire',sel.locataires?`${sel.locataires.prenom} ${sel.locataires.nom}`:'—'],['Date signalement',new Date(sel.date_signalement||sel.created_at).toLocaleDateString('fr-FR')],['Debut travaux',sel.date_debut_travaux?new Date(sel.date_debut_travaux).toLocaleDateString('fr-FR'):'—'],['Fin prevue',sel.date_fin_travaux?new Date(sel.date_fin_travaux).toLocaleDateString('fr-FR'):'—'],['Cout estime',sel.cout_estime?Number(sel.cout_estime).toLocaleString('fr-FR')+' FCFA':'—'],['Cout reel',sel.cout_reel?Number(sel.cout_reel).toLocaleString('fr-FR')+' FCFA':'—']].map(([k,v])=>(
                    <div key={k}><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k}</div><div style={{fontSize:13.5,color:'#e6edf3'}}>{v}</div></div>
                  ))}
                </div>
                {sel.description&&<div style={{marginBottom:14}}><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:6,fontWeight:600,textTransform:'uppercase'}}>Description</div><div style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.7,background:'rgba(255,255,255,0.02)',padding:12,borderRadius:8,border:'1px solid rgba(255,255,255,0.07)'}}>{sel.description}</div></div>}
                {sel.prestataire_nom&&<div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:14,marginTop:4}}><div style={{fontSize:13,fontWeight:600,color:'#e6edf3',marginBottom:10}}>Prestataire</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{[['Nom',sel.prestataire_nom||'—'],['Telephone',sel.prestataire_telephone||'—'],['Email',sel.prestataire_email||'—']].map(([k,v])=>(<div key={k}><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,textTransform:'uppercase'}}>{k}</div><div style={{fontSize:13,color:'#e6edf3'}}>{v}</div></div>))}</div></div>}
              </div>
            )}
            {tab==='suivi'&&(
              <div>
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#e6edf3',marginBottom:10}}>Ajouter un commentaire</div>
                  <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Saisir un commentaire..." style={{...inp,minHeight:80,resize:'vertical'}}/>
                  <button style={{...btnP,marginTop:8}} onClick={ajouterCommentaire}>Ajouter</button>
                </div>
                <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#e6edf3',marginBottom:10}}>Historique ({(sel.commentaires||[]).length})</div>
                  {(sel.commentaires||[]).length===0?(<div style={{textAlign:'center',padding:30,border:'1px dashed rgba(255,255,255,0.08)',borderRadius:8}}><div style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Aucun commentaire</div></div>):[...(sel.commentaires||[])].reverse().map(cm=>(
                    <div key={cm.id} style={{padding:'12px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:12,fontWeight:600,color:'#4da6ff'}}>{cm.auteur}</span><span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{new Date(cm.date).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.6}}>{cm.texte}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab==='documents'&&(
              <div style={{textAlign:'center',padding:'40px 20px',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:10}}>
                <div style={{fontSize:28,marginBottom:10,opacity:0.2}}>📎</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Photos avant/apres, devis, factures — bientot disponible</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>e.target===e.currentTarget&&resetAdd()}>
          <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',padding:28}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
              <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Nouveau ticket de maintenance</div>
              <button onClick={resetAdd} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22}}>x</button>
            </div>
            <div style={{display:'flex',gap:0,marginBottom:26}}>
              {['Informations','Prestataire','Recap'].map((s,i)=>{
                const n=i+1,done=n<step,active=n===step
                return (<div key={s} style={{flex:1,textAlign:'center',position:'relative'}}>
                  {i<2&&<div style={{position:'absolute',top:14,left:'50%',width:'100%',height:2,background:done?'#0078d4':'rgba(255,255,255,0.08)'}}/>}
                  <div className="mt-sdot" style={{background:done?'#0078d4':active?'rgba(0,120,212,0.15)':'rgba(255,255,255,0.06)',border:`2px solid ${done||active?'#0078d4':'rgba(255,255,255,0.1)'}`,color:done?'#fff':active?'#4da6ff':'rgba(255,255,255,0.3)'}}>{done?'✓':n}</div>
                  <div style={{fontSize:10.5,color:active?'#e6edf3':'rgba(255,255,255,0.3)',fontWeight:active?600:400}}>{s}</div>
                </div>)
              })}
            </div>
            {step===1&&(<div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Titre *</label><input style={inp} value={form.titre} onChange={e=>setF('titre',e.target.value)} placeholder="Ex: Fuite robinet cuisine"/></div>
                <div><label style={lbl}>Type</label><select style={sel2} value={form.type} onChange={e=>setF('type',e.target.value)}>{Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k} style={{background:'#161b22'}}>{v.icon} {v.label}</option>)}</select></div>
                <div><label style={lbl}>Priorite</label><select style={sel2} value={form.priorite} onChange={e=>setF('priorite',e.target.value)}>{Object.entries(PRIO_CFG).map(([k,v])=><option key={k} value={k} style={{background:'#161b22'}}>{v.label}</option>)}</select></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Bien concerne *</label><select style={sel2} value={form.bien_id} onChange={e=>setF('bien_id',e.target.value)}><option value="">Selectionner un bien</option>{biens.map(b=><option key={b.id} value={b.id} style={{background:'#161b22'}}>{b.nom}{b.ville?` (${b.ville})`:''}</option>)}</select></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Locataire (optionnel)</label><select style={sel2} value={form.locataire_id} onChange={e=>setF('locataire_id',e.target.value)}><option value="">Aucun</option>{locataires.map(l=><option key={l.id} value={l.id} style={{background:'#161b22'}}>{l.prenom} {l.nom}</option>)}</select></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Description</label><textarea style={{...inp,minHeight:80,resize:'vertical'}} value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Decrivez le probleme..."/></div>
                <div><label style={lbl}>Debut travaux</label><input type="date" style={inp} value={form.date_debut_travaux} onChange={e=>setF('date_debut_travaux',e.target.value)}/></div>
                <div><label style={lbl}>Fin prevue</label><input type="date" style={inp} value={form.date_fin_travaux} onChange={e=>setF('date_fin_travaux',e.target.value)}/></div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'space-between'}}><button style={btnBase} onClick={resetAdd}>Annuler</button><button style={btnP} onClick={()=>{if(!form.titre||!form.bien_id){toast.error('Titre et bien requis');return}setStep(2)}}>Suivant</button></div>
            </div>)}
            {step===2&&(<div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:14}}>Informations prestataire (optionnel)</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Nom prestataire</label><input style={inp} value={form.prestataire_nom} onChange={e=>setF('prestataire_nom',e.target.value)}/></div>
                <div><label style={lbl}>Telephone</label><input style={inp} value={form.prestataire_telephone} onChange={e=>setF('prestataire_telephone',e.target.value)}/></div>
                <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.prestataire_email} onChange={e=>setF('prestataire_email',e.target.value)}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Cout estime (FCFA)</label><input type="number" style={inp} value={form.cout_estime} onChange={e=>setF('cout_estime',e.target.value)}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Notes internes</label><textarea style={{...inp,minHeight:70,resize:'vertical'}} value={form.notes} onChange={e=>setF('notes',e.target.value)}/></div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'space-between'}}><button style={btnBase} onClick={()=>setStep(1)}>Retour</button><button style={btnP} onClick={()=>setStep(3)}>Suivant</button></div>
            </div>)}
            {step===3&&(<div>
              <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:14}}>Recapitulatif</div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:16,marginBottom:18}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <span style={{fontSize:28}}>{(TYPE_CFG[form.type]||TYPE_CFG.autre).icon}</span>
                  <div><div style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>{form.titre}</div><div style={{display:'flex',gap:6,marginTop:4}}><Badge val={form.priorite} cfg={PRIO_CFG}/><Badge val="ouvert" cfg={STATUT_CFG}/></div></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[['Bien',biens.find(b=>b.id===form.bien_id)?.nom||'—'],['Type',(TYPE_CFG[form.type]||TYPE_CFG.autre).label],['Prestataire',form.prestataire_nom||'—'],['Cout estime',form.cout_estime?form.cout_estime+' FCFA':'—']].map(([k,v])=>(<div key={k}><span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{k}: </span><span style={{fontSize:12.5,color:'#e6edf3'}}>{v}</span></div>))}
                </div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'space-between'}}><button style={btnBase} onClick={()=>setStep(2)}>Retour</button><button style={{...btnP,opacity:saving?0.6:1}} disabled={saving} onClick={creerTicket}>{saving?'Creation...':'Creer le ticket'}</button></div>
            </div>)}
          </div>
        </div>
      )}
    </>
  )
}
