import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const TYPE_CFG = {
  entree: { color:'#00c896', bg:'rgba(0,200,150,0.1)',  label:'Entree',  icon:'🔑' },
  sortie: { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'Sortie',  icon:'🚪' },
}
const ETAT_CFG = {
  bon:    { color:'#00c896', label:'Bon etat' },
  moyen:  { color:'#f59e0b', label:'Moyen' },
  mauvais:{ color:'#ef4444', label:'Mauvais' },
  neuf:   { color:'#0078d4', label:'Neuf' },
}
const STATUT_CFG = {
  en_cours:  { color:'#f59e0b', bg:'rgba(245,158,11,0.1)',  label:'En cours' },
  complete:  { color:'#0078d4', bg:'rgba(0,120,212,0.1)',   label:'Complete' },
  signe:     { color:'#00c896', bg:'rgba(0,200,150,0.1)',   label:'Signe' },
}
const PIECES_DEFAUT = [
  'Entree','Salon','Cuisine','Chambre 1','Chambre 2',
  'Salle de bain','Toilettes','Balcon','Garage','Cave',
]

const Badge = ({ val, cfg }) => {
  const c = cfg[val] || Object.values(cfg)[0]
  return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,background:c.bg||c.color+'22',color:c.color,border:`1px solid ${c.color}33`,whiteSpace:'nowrap'}}>{c.label}</span>
}

export default function EtatsDesLieux() {
  const [agence, setAgence]       = useState(null)
  const [edls, setEdls]           = useState([])
  const [baux, setBaux]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [fType, setFType]         = useState('tous')
  const [fStatut, setFStatut]     = useState('tous')
  const [sel, setSel]             = useState(null)
  const [tab, setTab]             = useState('pieces')
  const [showAdd, setShowAdd]     = useState(false)
  const [step, setStep]           = useState(1)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    type:'entree', bail_id:'', bien_id:'', locataire_id:'',
    date_visite:'', notes:'',
  })
  const [pieces, setPieces] = useState(
    PIECES_DEFAUT.map(nom=>({nom,etat:'bon',observations:'',present:true}))
  )
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
      const [e,b] = await Promise.all([
        supabase.from('etats_des_lieux')
          .select('*,biens(nom,ville),locataires(nom,prenom),baux(loyer_mensuel)')
          .eq('bail_id', supabase.from('baux').select('id').eq('agence_id',ag.id))
          .order('created_at',{ascending:false}),
        supabase.from('baux')
          .select('id,loyer_mensuel,biens(id,nom,ville),locataires(id,nom,prenom)')
          .eq('agence_id',ag.id)
          .eq('statut','actif'),
      ])
      // Fallback si la subquery ne marche pas
      if (e.error) {
        const {data:edlData} = await supabase.from('etats_des_lieux')
          .select('*,biens(nom,ville),locataires(nom,prenom)')
          .order('created_at',{ascending:false})
        setEdls(edlData||[])
      } else {
        setEdls(e.data||[])
      }
      setBaux(b.data||[])
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const loadEdls = async (agId) => {
    // Recuperer tous les baux de l agence puis les EDL
    const {data:bauxIds} = await supabase.from('baux').select('id').eq('agence_id',agId)
    if (!bauxIds?.length) { setEdls([]); return }
    const ids = bauxIds.map(b=>b.id)
    const {data} = await supabase.from('etats_des_lieux')
      .select('*,biens(nom,ville),locataires(nom,prenom)')
      .in('bail_id',ids)
      .order('created_at',{ascending:false})
    setEdls(data||[])
  }

  const creerEdl = async () => {
    if (!form.bail_id||!form.date_visite){toast.error('Bail et date requis');return}
    setSaving(true)
    try {
      const bail = baux.find(b=>b.id===form.bail_id)
      const {error} = await supabase.from('etats_des_lieux').insert({
        bail_id:form.bail_id,
        bien_id:bail?.biens?.id||null,
        locataire_id:bail?.locataires?.id||null,
        type:form.type,
        date_visite:form.date_visite,
        notes:form.notes,
        pieces:pieces.filter(p=>p.present),
        statut:'en_cours',
        signe_proprietaire:false,
        signe_locataire:false,
      })
      if(error) throw error
      toast.success('Etat des lieux cree !')
      resetAdd()
      await loadEdls(agence.id)
    } catch(e){toast.error(e.message)}
    finally{setSaving(false)}
  }

  const signerEdl = async (edl, qui) => {
    const updates = qui==='proprietaire'
      ? {signe_proprietaire:true,date_signature_proprietaire:new Date().toISOString()}
      : {signe_locataire:true,date_signature_locataire:new Date().toISOString()}
    const edlUpdated = {...edl,...updates}
    if (edlUpdated.signe_proprietaire && edlUpdated.signe_locataire) {
      updates.statut = 'signe'
    } else if (!edl.statut || edl.statut==='en_cours') {
      updates.statut = 'complete'
    }
    const {error} = await supabase.from('etats_des_lieux').update({...updates,updated_at:new Date().toISOString()}).eq('id',edl.id)
    if(error){toast.error(error.message);return}
    setSel(prev=>prev?{...prev,...updates}:prev)
    setEdls(prev=>prev.map(e=>e.id===edl.id?{...e,...updates}:e))
    toast.success(qui==='proprietaire'?'Signature proprietaire enregistree':'Signature locataire enregistree')
  }

  const updatePiece = (idx,k,v) => setPieces(prev=>prev.map((p,i)=>i===idx?{...p,[k]:v}:p))

  const resetAdd = () => {
    setShowAdd(false); setStep(1)
    setForm({type:'entree',bail_id:'',bien_id:'',locataire_id:'',date_visite:'',notes:''})
    setPieces(PIECES_DEFAUT.map(nom=>({nom,etat:'bon',observations:'',present:true})))
  }

  const filtered = edls.filter(e=>{
    const q=search.toLowerCase()
    const ms=!q||`${e.biens?.nom||''} ${e.locataires?.nom||''} `.toLowerCase().includes(q)
    const ft=fType==='tous'||e.type===fType
    const fs=fStatut==='tous'||e.statut===fStatut
    return ms&&ft&&fs
  })

  const stats = {
    total:edls.length,
    entrees:edls.filter(e=>e.type==='entree').length,
    sorties:edls.filter(e=>e.type==='sortie').length,
    signes:edls.filter(e=>e.statut==='signe').length,
  }

  const inp = {width:'100%',padding:'8px 11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',outline:'none',colorScheme:'dark',boxSizing:'border-box'}
  const sel2 = {...inp,cursor:'pointer',background:'rgba(20,27,40,0.95)'}
  const lbl = {display:'block',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:5}
  const btnBase = {display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:5,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s'}
  const btnP = {...btnBase,background:'#0078d4',borderColor:'#0078d4',color:'#fff'}
  const btnG = {...btnBase,background:'rgba(0,200,150,0.08)',borderColor:'rgba(0,200,150,0.25)',color:'#00c896'}

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>

  return (
    <>
      <style>{`
        .edl-row:hover td{background:rgba(255,255,255,0.02);cursor:pointer}
        .edl-tab{padding:8px 14px;border-radius:6px;font-size:12.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.4);transition:all 0.15s}
        .edl-tab.on{background:rgba(255,255,255,0.08);color:#e6edf3}
        .edl-ftab{padding:5px 12px;border-radius:100px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4);font-family:Inter,sans-serif;transition:all 0.15s}
        .edl-ftab.on{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .edl-sdot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin:0 auto 5px;transition:all 0.2s}
        .piece-row{display:grid;grid-template-columns:auto 1fr auto 1fr auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
      `}</style>

      <div style={{minHeight:'100%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:3}}>Etats des Lieux</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>{filtered.length} etat{filtered.length!==1?'s':''} des lieux — {agence?.nom}</div>
          </div>
          <button style={btnP} onClick={()=>setShowAdd(true)}>+ Nouvel etat des lieux</button>
        </div>

        {/* OVERVIEW */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20}}>
          {[{label:'Total',val:stats.total,color:'#4da6ff'},{label:'Entrees',val:stats.entrees,color:'#00c896'},{label:'Sorties',val:stats.sorties,color:'#ef4444'},{label:'Signes',val:stats.signes,color:'#f59e0b'}].map(({label,val,color})=>(
            <div key={label} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'14px 18px'}}>
              <div style={{fontSize:26,fontWeight:700,color,marginBottom:3}}>{val}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* FILTRES */}
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'6px 12px'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:180}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>x</button>}
          </div>
          <div style={{width:1,height:20,background:'rgba(255,255,255,0.08)'}}/>
          {[['tous','Tous'],['entree','Entrees'],['sortie','Sorties']].map(([v,l])=>(
            <button key={v} className={'edl-ftab'+(fType===v?' on':'')} onClick={()=>setFType(v)}>{l}</button>
          ))}
          <div style={{width:1,height:20,background:'rgba(255,255,255,0.08)'}}/>
          {[['tous','Tous statuts'],['en_cours','En cours'],['complete','Complete'],['signe','Signe']].map(([v,l])=>(
            <button key={v} className={'edl-ftab'+(fStatut===v?' on':'')} onClick={()=>setFStatut(v)}>{l}</button>
          ))}
        </div>

        {/* TABLE */}
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
          {filtered.length===0?(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:36,marginBottom:12,opacity:0.2}}>📋</div>
              <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.3)',marginBottom:8}}>Aucun etat des lieux</div>
              <button style={{...btnP,margin:'0 auto'}} onClick={()=>setShowAdd(true)}>+ Nouvel etat des lieux</button>
            </div>
          ):(
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Type','Bien','Locataire','Date visite','Pieces','Statut','Signatures',''].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
              ))}</tr></thead>
              <tbody>{filtered.map(e=>{
                const tc=TYPE_CFG[e.type]||TYPE_CFG.entree
                const nbPieces=(e.pieces||[]).length
                return (
                  <tr key={e.id} className="edl-row" onClick={()=>{setSel(e);setTab('pieces')}}>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <span style={{fontSize:16,marginRight:6}}>{tc.icon}</span>
                      <span style={{fontSize:12,fontWeight:600,color:tc.color}}>{tc.label}</span>
                    </td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{fontSize:13,color:'#e6edf3'}}>{e.biens?.nom||'—'}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{e.biens?.ville||''}</div>
                    </td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:13,color:'rgba(255,255,255,0.7)'}}>{e.locataires?`${e.locataires.prenom} ${e.locataires.nom}`:'—'}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'rgba(255,255,255,0.6)'}}>{e.date_visite?new Date(e.date_visite).toLocaleDateString('fr-FR'):new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12.5,color:'#4da6ff'}}>{nbPieces} piece{nbPieces!==1?'s':''}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><Badge val={e.statut||'en_cours'} cfg={STATUT_CFG}/></td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex',gap:4'}}>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:100,background:e.signe_proprietaire?'rgba(0,200,150,0.1)':'rgba(255,255,255,0.05)',color:e.signe_proprietaire?'#00c896':'rgba(255,255,255,0.3)',border:`1px solid ${e.signe_proprietaire?'rgba(0,200,150,0.25)':'rgba(255,255,255,0.08)'}`}}>Proprio</span>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:100,background:e.signe_locataire?'rgba(0,200,150,0.1)':'rgba(255,255,255,0.05)',color:e.signe_locataire?'#00c896':'rgba(255,255,255,0.3)',border:`1px solid ${e.signe_locataire?'rgba(0,200,150,0.25)':'rgba(255,255,255,0.08)'}`}}>Locataire</span>
                      </div>
                    </td>
                    <td style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.04)'}} onClick={ev=>ev.stopPropagation()}><button style={{...btnBase,fontSize:11,padding:'4px 10px'}} onClick={()=>{setSel(e);setTab('pieces')}}>Voir</button></td>
                  </tr>
                )
              })}</tbody>
            </table>
          )}
        </div>
      </div>

      {/* DRAWER */}
      {sel&&(
        <div style={{position:'fixed',top:0,right:0,height:'100vh',width:'min(720px,96vw)',background:'#0d1117',borderLeft:'1px solid rgba(255,255,255,0.08)',zIndex:200,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                  <span style={{fontSize:22}}>{(TYPE_CFG[sel.type]||TYPE_CFG.entree).icon}</span>
                  <div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>Etat des lieux d\'{(TYPE_CFG[sel.type]||TYPE_CFG.entree).label.toLowerCase()}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <Badge val={sel.statut||'en_cours'} cfg={STATUT_CFG}/>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{sel.biens?.nom}{sel.biens?.ville?` · ${sel.biens.ville}`:''}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>• {sel.locataires?`${sel.locataires.prenom} ${sel.locataires.nom}`:'—'}</span>
                </div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22,lineHeight:1,padding:'2px 6px'}}>x</button>
            </div>
            <div style={{display:'flex',gap:2}}>
              {[['pieces','Pieces'],['signatures','Signatures'],['documents','Documents']].map(([k,l])=>(
                <button key={k} className={'edl-tab'+(tab===k?' on':'')} onClick={()=>setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>

            {/* PIECES */}
            {tab==='pieces'&&(
              <div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16}}>{(sel.pieces||[]).length} piece{(sel.pieces||[]).length!==1?'s':''} inspectee{(sel.pieces||[]).length!==1?'s':''}</div>
                {(sel.pieces||[]).length===0?(
                  <div style={{textAlign:'center',padding:'40px 20px',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:8}}><div style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Aucune piece enregistree</div></div>
                ):(sel.pieces||[]).map((p,i)=>(
                  <div key={i} style={{padding:'14px 16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:p.observations?8:0}}>
                      <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{p.nom}</div>
                      <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,background:(ETAT_CFG[p.etat]||ETAT_CFG.bon).color+'22',color:(ETAT_CFG[p.etat]||ETAT_CFG.bon).color,border:`1px solid ${(ETAT_CFG[p.etat]||ETAT_CFG.bon).color}44`}}>{(ETAT_CFG[p.etat]||ETAT_CFG.bon).label}</span>
                    </div>
                    {p.observations&&<div style={{fontSize:12.5,color:'rgba(255,255,255,0.5)',lineHeight:1.5}}>{p.observations}</div>}
                  </div>
                ))}
                {sel.notes&&<div style={{marginTop:16,padding:'12px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8}}><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:6,fontWeight:600,textTransform:'uppercase'}}>Notes</div><div style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.6}}>{sel.notes}</div></div>}
              </div>
            )}

            {/* SIGNATURES */}
            {tab==='signatures'&&(
              <div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20}}>Signature numerique — cliquez pour confirmer la signature</div>
                {[{key:'proprietaire',label:'Proprietaire / Bailleur',signed:sel.signe_proprietaire,date:sel.date_signature_proprietaire},{key:'locataire',label:'Locataire',signed:sel.signe_locataire,date:sel.date_signature_locataire}].map(({key,label,signed,date})=>(
                  <div key={key} style={{padding:'20px',background:signed?'rgba(0,200,150,0.04)':'rgba(255,255,255,0.02)',border:`1px solid ${signed?'rgba(0,200,150,0.2)':'rgba(255,255,255,0.08)'}`,borderRadius:10,marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:signed?10:0}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:3}}>{label}</div>
                        {signed&&date&&<div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Signe le {new Date(date).toLocaleString('fr-FR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>}
                      </div>
                      {signed?(
                        <span style={{fontSize:12,padding:'5px 14px',borderRadius:100,background:'rgba(0,200,150,0.1)',color:'#00c896',border:'1px solid rgba(0,200,150,0.25)',fontWeight:600}}>Signe</span>
                      ):(
                        <button style={btnG} onClick={()=>{if(confirm(`Confirmer la signature de l etat des lieux pour ${label} ?`))signerEdl(sel,key)}}>Signer</button>
                      )}
                    </div>
                    {!signed&&<div style={{fontSize:12,color:'rgba(255,255,255,0.25)',marginTop:8}}>En attente de signature</div>}
                  </div>
                ))}
                {sel.signe_proprietaire&&sel.signe_locataire&&(
                  <div style={{padding:'14px 16px',background:'rgba(0,200,150,0.06)',border:'1px solid rgba(0,200,150,0.15)',borderRadius:8,marginTop:8,textAlign:'center'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#00c896'}}>Etat des lieux entierement signe</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:3}}>Toutes les parties ont signe</div>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS */}
            {tab==='documents'&&(
              <div style={{textAlign:'center',padding:'40px 20px',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:10}}>
                <div style={{fontSize:28,marginBottom:10,opacity:0.2}}>📄</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginBottom:8}}>Generation PDF</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.2)'}}>Export PDF de l etat des lieux complet — bientot disponible</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CREATION */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>e.target===e.currentTarget&&resetAdd()}>
          <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,width:'100%',maxWidth:640,maxHeight:'92vh',overflowY:'auto',padding:28}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
              <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Nouvel etat des lieux</div>
              <button onClick={resetAdd} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22}}>x</button>
            </div>
            <div style={{display:'flex',gap:0,marginBottom:26}}>
              {['Informations','Pieces','Recap'].map((s,i)=>{
                const n=i+1,done=n<step,active=n===step
                return (<div key={s} style={{flex:1,textAlign:'center',position:'relative'}}>
                  {i<2&&<div style={{position:'absolute',top:14,left:'50%',width:'100%',height:2,background:done?'#0078d4':'rgba(255,255,255,0.08)'}}/>}
                  <div className="edl-sdot" style={{background:done?'#0078d4':active?'rgba(0,120,212,0.15)':'rgba(255,255,255,0.06)',border:`2px solid ${done||active?'#0078d4':'rgba(255,255,255,0.1)'}`,color:done?'#fff':active?'#4da6ff':'rgba(255,255,255,0.3)'}}>{done?'✓':n}</div>
                  <div style={{fontSize:10.5,color:active?'#e6edf3':'rgba(255,255,255,0.3)',fontWeight:active?600:400}}>{s}</div>
                </div>)
              })}
            </div>

            {step===1&&(<div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Type *</label>
                  <div style={{display:'flex',gap:8}}>
                    {Object.entries(TYPE_CFG).map(([k,v])=>(
                      <button key={k} onClick={()=>setF('type',k)} style={{flex:1,padding:'12px',borderRadius:8,cursor:'pointer',border:`2px solid ${form.type===k?v.color:'rgba(255,255,255,0.1)'}`,background:form.type===k?v.color+'18':'rgba(255,255,255,0.02)',color:form.type===k?v.color:'rgba(255,255,255,0.4)',fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:13,textAlign:'center',transition:'all 0.15s'}}>
                        <div style={{fontSize:22,marginBottom:4}}>{v.icon}</div>{v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Bail concerne *</label>
                  <select style={sel2} value={form.bail_id} onChange={e=>setF('bail_id',e.target.value)}>
                    <option value="">Selectionner un bail actif</option>
                    {baux.map(b=><option key={b.id} value={b.id} style={{background:'#161b22'}}>{b.biens?.nom} — {b.locataires?.prenom} {b.locataires?.nom} ({Number(b.loyer_mensuel).toLocaleString('fr-FR')} FCFA)</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Date de visite *</label><input type="date" style={inp} value={form.date_visite} onChange={e=>setF('date_visite',e.target.value)}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Notes generales</label><textarea style={{...inp,minHeight:70,resize:'vertical'}} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Observations generales..."/></div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'space-between'}}><button style={btnBase} onClick={resetAdd}>Annuler</button><button style={btnP} onClick={()=>{if(!form.bail_id||!form.date_visite){toast.error('Bail et date requis');return}setStep(2)}}>Suivant</button></div>
            </div>)}

            {step===2&&(<div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>Etat des pieces ({pieces.filter(p=>p.present).length} selectionnees)</div>
                <button style={{...btnBase,fontSize:11,padding:'4px 10px'}} onClick={()=>setPieces(PIECES_DEFAUT.map(nom=>({nom,etat:'bon',observations:'',present:true})))}>Reset</button>
              </div>
              <div style={{maxHeight:420,overflowY:'auto',paddingRight:4}}>
                {pieces.map((p,i)=>(
                  <div key={i} style={{padding:'12px',background:p.present?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.01)',border:`1px solid ${p.present?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.03)'}`,borderRadius:8,marginBottom:8,opacity:p.present?1:0.5}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:p.present?10:0}}>
                      <input type="checkbox" checked={p.present} onChange={e=>updatePiece(i,'present',e.target.checked)} style={{cursor:'pointer',width:16,height:16,accentColor:'#0078d4'}}/>
                      <span style={{fontSize:13.5,fontWeight:600,color:'#e6edf3',flex:1}}>{p.nom}</span>
                      {p.present&&(
                        <div style={{display:'flex',gap:4'}}>
                          {Object.entries(ETAT_CFG).map(([k,v])=>(
                            <button key={k} onClick={()=>updatePiece(i,'etat',k)} style={{padding:'3px 8px',borderRadius:100,fontSize:10.5,fontWeight:600,cursor:'pointer',border:`1px solid ${p.etat===k?v.color:'rgba(255,255,255,0.1)'}`,background:p.etat===k?v.color+'22':'transparent',color:p.etat===k?v.color:'rgba(255,255,255,0.3)',transition:'all 0.1s'}}>{v.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {p.present&&<input style={{...inp,fontSize:12}} value={p.observations} onChange={e=>updatePiece(i,'observations',e.target.value)} placeholder="Observations pour cette piece..."/>}
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'space-between',marginTop:14}}><button style={btnBase} onClick={()=>setStep(1)}>Retour</button><button style={btnP} onClick={()=>setStep(3)}>Suivant</button></div>
            </div>)}

            {step===3&&(<div>
              <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:14}}>Recapitulatif</div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:16,marginBottom:18}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <span style={{fontSize:28}}>{(TYPE_CFG[form.type]||TYPE_CFG.entree).icon}</span>
                  <div><div style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>Etat des lieux d\'{(TYPE_CFG[form.type]||TYPE_CFG.entree).label.toLowerCase()}</div><Badge val="en_cours" cfg={STATUT_CFG}/></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                  {[
                    ['Bail',baux.find(b=>b.id===form.bail_id)?`${baux.find(b=>b.id===form.bail_id)?.biens?.nom}`:'—'],
                    ['Locataire',baux.find(b=>b.id===form.bail_id)?`${baux.find(b=>b.id===form.bail_id)?.locataires?.prenom} ${baux.find(b=>b.id===form.bail_id)?.locataires?.nom}`:'—'],
                    ['Date visite',form.date_visite?new Date(form.date_visite).toLocaleDateString('fr-FR'):'—'],
                    ['Pieces',`${pieces.filter(p=>p.present).length} pieces`],
                    ['Bon etat',`${pieces.filter(p=>p.present&&p.etat==='bon').length}`],
                    ['A surveiller',`${pieces.filter(p=>p.present&&(p.etat==='moyen'||p.etat==='mauvais')).length}`],
                  ].map(([k,v])=>(<div key={k}><span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{k}: </span><span style={{fontSize:12.5,color:'#e6edf3'}}>{v}</span></div>))}
                </div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'space-between'}}><button style={btnBase} onClick={()=>setStep(2)}>Retour</button><button style={{...btnP,opacity:saving?0.6:1}} disabled={saving} onClick={creerEdl}>{saving?'Creation...':'Creer l etat des lieux'}</button></div>
            </div>)}
          </div>
        </div>
      )}
    </>
  )
}
