import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

const STATUT_BAIL_CFG = {
  en_attente: { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'En attente', dot:'#f59e0b' },
  actif:      { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Actif',      dot:'#00c896' },
  expire:     { color:'#6c63ff', bg:'rgba(108,99,255,0.12)', label:'Expire',     dot:'#6c63ff' },
  resilie:    { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'Resilie',    dot:'#ef4444' },
}
const TYPES_BAIL = ['habitation','commercial','bureau','terrain','garage','autre']
const TYPE_ICONS = { habitation:'🏠', commercial:'🏪', bureau:'🏢', terrain:'🌿', garage:'🚗', autre:'📄' }
const MODES_PAI  = ['Mobile Money','Virement bancaire','Especes','Cheque']
const fmt = (n) => n!=null ? Number(n).toLocaleString('fr-FR') : '—'
const addMonths = (d,n) => { const x=new Date(d); x.setMonth(x.getMonth()+n); return x.toISOString().split('T')[0] }

export default function ImolocBaux() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [agence,setAgence]         = useState(null)
  const [baux,setBaux]             = useState([])
  const [loading,setLoading]       = useState(true)
  const [search,setSearch]         = useState('')
  const [filterStatut,setFilter]   = useState('tous')
  const [selected,setSelected]     = useState([])
  const [showAdd,setShowAdd]       = useState(false)
  const [selectedBail,setSelBail]  = useState(null)
  const [detailTab,setDetailTab]   = useState('infos')
  const [step,setStep]             = useState(1)
  const [saving,setSaving]         = useState(false)
  const [paiements,setPaiements]   = useState([])
  const [biens,setBiens]           = useState([])
  const [locs,setLocs]             = useState([])
  const [bienSearch,setBienSearch] = useState('')
  const [locSearch,setLocSearch]   = useState('')
  const [selBienF,setSelBienF]     = useState(null)
  const [selLocF,setSelLocF]       = useState(null)
  const [form,setForm] = useState({
    type_bail:'habitation', date_debut:new Date().toISOString().split('T')[0],
    duree_mois:'12', date_fin:'', type_duree:'determinee',
    delai_preavis_jours:'30', loyer_mensuel:'', devise:'FCFA',
    caution:'', taux_commission:'10', mode_commission:'mensuel',
    mode_paiement:'Mobile Money', renouvellement_auto:false, notes:'',
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(()=>{ initData() },[]) // eslint-disable-line

  useEffect(()=>{
    if(form.date_debut && form.duree_mois && form.type_duree==='determinee')
      setF('date_fin', addMonths(form.date_debut, parseInt(form.duree_mois)||0))
  },[form.date_debut,form.duree_mois,form.type_duree]) // eslint-disable-line

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList }   = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      const { data:b } = await supabase.from('baux')
        .select('*, biens(id,nom,ville,type,type_bien), locataires(id,nom,prenom,telephone), proprietaires(id,nom,prenom)')
        .eq('agence_id', ag.id).order('created_at',{ascending:false})
      setBaux(b||[])
      const { data:bi } = await supabase.from('biens').select('id,nom,ville,type,type_bien,statut,loyer,loyer_mensuel,proprietaire_id').eq('agence_id',ag.id).in('statut',['disponible','reserve'])
      setBiens(bi||[])
      const { data:lo } = await supabase.from('locataires').select('id,nom,prenom,telephone,email,statut_global').eq('agence_id',ag.id).eq('statut_global','actif')
      setLocs(lo||[])
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const loadPaiements = async (id) => {
    const { data } = await supabase.from('paiements').select('*').eq('bail_id',id).order('date_echeance',{ascending:true})
    setPaiements(data||[])
  }

  const createBail = async () => {
    if (!agence?.id || !selBienF || !selLocF || !form.loyer_mensuel) return
    setSaving(true)
    try {
      const loyer   = parseFloat(form.loyer_mensuel)||0
      const duree   = parseInt(form.duree_mois)||12
      const dateFin = form.type_duree==='determinee' ? form.date_fin : null
      const { data:nb, error:be } = await supabase.from('baux').insert({
        bien_id:selBienF.id, locataire_id:selLocF.id, agence_id:agence.id,
        proprietaire_id:selBienF.proprietaire_id||null,
        statut:'en_attente', date_debut:form.date_debut, date_fin:dateFin,
        duree_mois:duree, loyer_mensuel:loyer, devise:form.devise,
        caution:parseFloat(form.caution)||null,
        taux_commission:parseFloat(form.taux_commission)||10,
        mode_commission:form.mode_commission,
        renouvellement_auto:form.renouvellement_auto,
        delai_preavis_jours:parseInt(form.delai_preavis_jours)||30,
        notes:form.notes||null,
      }).select().single()
      if (be) throw new Error('Bail: '+be.message+' ['+be.code+']')
      const echeances = Array.from({length:duree},(_,i)=>({
        bail_id:nb.id, locataire_id:selLocF.id, bien_id:selBienF.id, agence_id:agence.id,
        montant:loyer, devise:form.devise,
        periode_mois:new Date(addMonths(form.date_debut,i)).getMonth()+1,
        periode_annee:new Date(addMonths(form.date_debut,i)).getFullYear(),
        date_echeance:addMonths(form.date_debut,i),
        statut:'en_attente', mode:form.mode_paiement,
      }))
      if (echeances.length) {
        const {error:pe} = await supabase.from('paiements').insert(echeances)
        if (pe) console.warn('[paiements]',pe.message)
      }
      await supabase.from('biens').update({statut:'occupe'}).eq('id',selBienF.id)
      toast.success('Bail cree ! '+duree+' echeances generees.')
      setShowAdd(false); resetForm(); initData()
    } catch(e){ console.error(e); toast.error(e.message||'Erreur') }
    finally{setSaving(false)}
  }

  const activerBail = async (b) => {
    const {error} = await supabase.from('baux').update({statut:'actif'}).eq('id',b.id)
    if(error){toast.error(error.message);return}
    toast.success('Bail active !'); setSelBail(x=>x?{...x,statut:'actif'}:null); initData()
  }

  const resilierBail = async (b) => {
    if(!confirm('Resilier ce bail ?')) return
    await supabase.from('baux').update({statut:'resilie'}).eq('id',b.id)
    if(b.bien_id) await supabase.from('biens').update({statut:'disponible'}).eq('id',b.bien_id)
    toast.success('Bail resilie.'); setSelBail(null); initData()
  }

  const resetForm = () => {
    setStep(1); setSelBienF(null); setSelLocF(null); setBienSearch(''); setLocSearch('')
    setForm({ type_bail:'habitation', date_debut:new Date().toISOString().split('T')[0],
      duree_mois:'12', date_fin:'', type_duree:'determinee', delai_preavis_jours:'30',
      loyer_mensuel:'', devise:'FCFA', caution:'', taux_commission:'10',
      mode_commission:'mensuel', mode_paiement:'Mobile Money', renouvellement_auto:false, notes:'',
    })
  }

  const now = new Date()
  const in30 = new Date(); in30.setDate(in30.getDate()+30)
  const filtered = baux.filter(b=>{
    const ms = `${b.biens?.nom||''} ${b.locataires?.nom||''} ${b.locataires?.prenom||''}`.toLowerCase().includes(search.toLowerCase())
    if(filterStatut==='tous') return ms
    if(filterStatut==='expiration'){const f=b.date_fin?new Date(b.date_fin):null;return ms&&b.statut==='actif'&&f&&f<=in30&&f>=now}
    return ms && b.statut===filterStatut
  })
  const filtBiens = biens.filter(b=>`${b.nom} ${b.ville||''}`.toLowerCase().includes(bienSearch.toLowerCase()))
  const filtLocs  = locs.filter(l=>`${l.prenom||''} ${l.nom} ${l.telephone||''}`.toLowerCase().includes(locSearch.toLowerCase()))
  const stats = {
    total:baux.length, actifs:baux.filter(b=>b.statut==='actif').length,
    attente:baux.filter(b=>b.statut==='en_attente').length,
    revenus:baux.filter(b=>b.statut==='actif').reduce((a,b)=>a+(b.loyer_mensuel||0),0),
  }
  const SBadge = ({s}) => { const c=STATUT_BAIL_CFG[s]||STATUT_BAIL_CFG.en_attente; return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 9px',borderRadius:'100px',fontSize:11,fontWeight:600,background:c.bg,color:c.color}}><span style={{width:6,height:6,borderRadius:'50%',background:c.dot}}/>{c.label}</span> }

  return (
    <>
      <style>{`
        .bx-page{min-height:100%;animation:bx-in 0.2s ease}
        @keyframes bx-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .bx-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .bx-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .bx-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.bx-btn-p:hover:not(:disabled){background:#006cc1}
        .bx-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
        .bx-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
        .bx-btn-y{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.22);color:#f59e0b}
        .bx-ov{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;display:flex;justify-content:flex-end}
        .bx-panel{background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:bx-sl 0.22s ease;height:100%;overflow:hidden}
        @keyframes bx-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .bx-ph{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .bx-ph-t{font-size:17px;font-weight:700;color:#e6edf3}
        .bx-cls{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex}
        .bx-cls:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .bx-sb{flex:1;overflow-y:auto;padding:24px 28px}
        .bx-sb::-webkit-scrollbar{width:4px}.bx-sb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .bx-pf{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .bx-pfb{flex:1;padding:11px;border-radius:5px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;transition:all 0.15s}
        .bx-pfb-b{background:#0078d4;color:#fff}.bx-pfb-b:hover{background:#006cc1}.bx-pfb-b:disabled{opacity:0.4;cursor:not-allowed}
        .bx-pfb-g{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .bx-inp{width:100%;padding:9px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .bx-inp:focus{border-color:#0078d4}
        .bx-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
        .bx-g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .bx-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px}
        .bx-fld{margin-bottom:16px}
        .bx-sec{font-size:11.5px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.09em;margin:22px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .bx-pick{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);margin-bottom:7px;cursor:pointer;transition:all 0.15s}
        .bx-pick:hover{border-color:rgba(0,120,212,0.25);background:rgba(0,120,212,0.04)}
        .bx-pick.on{border-color:#0078d4;background:rgba(0,120,212,0.08)}
        .bx-stv{width:175px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.07);padding:18px 0;display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,0.15)}
        .bx-si{display:flex;align-items:flex-start;gap:11px;padding:11px 18px;cursor:pointer;transition:background 0.15s;border-left:3px solid transparent}
        .bx-si:hover{background:rgba(255,255,255,0.04)}
        .bx-si.active{background:rgba(0,120,212,0.07);border-left-color:#0078d4}
        .bx-si.done{border-left-color:#00c896}
        .bx-sn{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4)}
        .bx-sn.active{background:#0078d4;color:#fff}
        .bx-sn.done{background:#00c896;color:#fff}
        .bx-sc{flex:1;overflow-y:auto;padding:28px 30px}
        .bx-sc::-webkit-scrollbar{width:4px}
        .bx-ftab{padding:5px 14px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;transition:all 0.15s}
        .bx-ftab.on{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .bx-tr{width:100%;border-collapse:collapse;table-layout:fixed}
        .bx-tr th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);padding:9px 14px;text-align:left;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07)}
        .bx-tr td{padding:12px 14px;font-size:13px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .bx-tr tr:hover td{background:rgba(255,255,255,0.025);cursor:pointer}
        .bx-tr tr:last-child td{border-bottom:none}
        .bx-dtab{padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s}
        .bx-dtab:hover{color:rgba(255,255,255,0.75)}
        .bx-dtab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .bx-blk{margin-bottom:20px}
        .bx-bl{font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:5px}
        .bx-bv{font-size:13.5px;color:rgba(255,255,255,0.5)}
        .bx-dg{display:grid;grid-template-columns:1fr 1fr;gap:0 2.5rem}
        .bx-pr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:7px;margin-bottom:5px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)}
        .bx-pr.paye{border-color:rgba(0,200,150,0.18);background:rgba(0,200,150,0.04)}
        .bx-pr.en_retard{border-color:rgba(239,68,68,0.18);background:rgba(239,68,68,0.04)}
        @media(max-width:960px){.bx-g2,.bx-g3{grid-template-columns:1fr}}
        @media(max-width:600px){.bx-stv{display:none}}
      `}</style>

      <div className='bx-page'>
        <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,color:'rgba(255,255,255,0.4)',marginBottom:18}}>
          <span style={{cursor:'pointer'}} onClick={()=>navigate('/imoloc')}>Centre Imoloc</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Baux et Contrats</span>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:4}}>Baux et Contrats</div>
        <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)',marginBottom:22}}>{baux.length} bail{baux.length!==1?'x':''} — {agence?.nom||'votre agence'}</div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[{ic:'📄',l:'Total',v:stats.total,c:'#e6edf3'},{ic:'✅',l:'Actifs',v:stats.actifs,c:'#00c896'},{ic:'⏳',l:'En attente',v:stats.attente,c:'#f59e0b'},{ic:'💰',l:'Revenus/mois',v:fmt(stats.revenus)+' FCFA',c:'#00c896',sm:true}].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}><span style={{fontSize:15}}>{s.ic}</span><span style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{s.l}</span></div>
              <div style={{fontSize:s.sm?14:20,fontWeight:800,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,flexWrap:'wrap'}}>
          <button className='bx-btn bx-btn-p' onClick={()=>{resetForm();setShowAdd(true)}}>
            <svg width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M12 4.5v15m7.5-7.5h-15'/></svg>
            Nouveau bail
          </button>
          <button className='bx-btn' onClick={initData}>🔄</button>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:4,padding:'7px 12px'}}>
            <svg width='13' height='13' fill='none' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z'/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Bien, locataire...' style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:200}}/>
          </div>
        </div>

        {/* Filtres */}
        <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
          {[['tous','Tous'],['actif','Actifs'],['en_attente','En attente'],['expiration','Expiration proche'],['expire','Expires'],['resilie','Resilies']].map(([v,l])=>(
            <button key={v} className={'bx-ftab'+(filterStatut===v?' on':'')} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>

        {/* Table */}
        <div style={{border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.02)',fontSize:12,color:'rgba(255,255,255,0.3)'}}>{filtered.length} bail{filtered.length!==1?'x':''}</div>
          <div style={{overflowX:'auto'}}>
            <table className='bx-tr'>
              <thead><tr>
                <th style={{width:220}}>Bien</th>
                <th style={{width:170}}>Locataire</th>
                <th style={{width:140}}>Loyer/mois</th>
                <th style={{width:110}}>Debut</th>
                <th style={{width:110}}>Fin</th>
                <th style={{width:130}}>Statut</th>
                <th style={{width:50}}></th>
              </tr></thead>
              <tbody>
                {loading?(
                  <tr><td colSpan={7} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</td></tr>
                ):filtered.length===0?(
                  <tr><td colSpan={7}>
                    <div style={{textAlign:'center',padding:'60px 20px'}}>
                      <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>📄</div>
                      <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:16}}>{search?'Aucun resultat':filterStatut!=='tous'?'Aucun bail dans ce filtre':'Aucun bail cree'}</div>
                      {!search&&filterStatut==='tous'&&<button className='bx-btn bx-btn-p' style={{margin:'0 auto'}} onClick={()=>{resetForm();setShowAdd(true)}}>+ Nouveau bail</button>}
                    </div>
                  </td></tr>
                ):filtered.map(b=>{
                  const fin = b.date_fin?new Date(b.date_fin):null
                  const exp = b.statut==='actif'&&fin&&fin<=in30&&fin>=now
                  return(
                    <tr key={b.id} onClick={()=>{setSelBail(b);setDetailTab('infos');loadPaiements(b.id)}}>
                      <td><div style={{display:'flex',alignItems:'center',gap:9}}><div style={{width:32,height:32,borderRadius:7,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{TYPE_ICONS[b.type_bail||'habitation']||'📄'}</div><div><div style={{fontWeight:600,color:'#e6edf3',fontSize:13.5}}>{b.biens?.nom||'—'}</div><div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)'}}>{b.biens?.ville||'—'}</div></div></div></td>
                      <td style={{fontSize:12.5}}>{b.locataires?.prenom||''} {b.locataires?.nom||'—'}</td>
                      <td style={{fontSize:13,fontWeight:600,color:'#0078d4'}}>{fmt(b.loyer_mensuel)} FCFA</td>
                      <td style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{b.date_debut?new Date(b.date_debut).toLocaleDateString('fr-FR'):'—'}</td>
                      <td><span style={{fontSize:12,color:exp?'#f59e0b':'rgba(255,255,255,0.5)'}}>{b.date_fin?new Date(b.date_fin).toLocaleDateString('fr-FR'):'Indefini'}{exp&&' ⚠️'}</span></td>
                      <td><SBadge s={b.statut}/></td>
                      <td><button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',padding:'5px 7px',fontSize:15}} onMouseOver={e=>e.currentTarget.style.color='#e6edf3'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'} onClick={e=>{e.stopPropagation();setSelBail(b);setDetailTab('infos');loadPaiements(b.id)}}>···</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'10px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',fontSize:12,color:'rgba(255,255,255,0.3)'}}>{filtered.length} bail{filtered.length!==1?'x':''} affiche{filtered.length!==1?'s':''}</div>
        </div>
      </div>

      {/* ── PANEL CREATION ── */}
      {showAdd&&(
        <div className='bx-ov' onClick={e=>e.target===e.currentTarget&&(setShowAdd(false)||resetForm())}>
          <div className='bx-panel' style={{width:'min(800px,96vw)'}}>
            <div className='bx-ph'><span className='bx-ph-t'>Nouveau bail</span>
              <button className='bx-cls' onClick={()=>{setShowAdd(false);resetForm()}}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
            </div>
            <div style={{display:'flex',flex:1,overflow:'hidden'}}>
              <div className='bx-stv'>
                {[{n:1,l:'Bien',d:'Choisir le bien'},{n:2,l:'Locataire',d:'Choisir le locataire'},{n:3,l:'Conditions',d:'Loyer et duree'},{n:4,l:'Recap',d:'Verification'}].map(s=>(
                  <div key={s.n} className={'bx-si'+(step===s.n?' active':step>s.n?' done':'')} onClick={()=>s.n<step&&setStep(s.n)}>
                    <div className={'bx-sn'+(step===s.n?' active':step>s.n?' done':'')}>
                      {step>s.n?<svg width='10' height='10' fill='none' stroke='#fff' strokeWidth='2.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M4.5 12.75l6 6 9-13.5'/></svg>:s.n}
                    </div>
                    <div><div style={{fontSize:12.5,fontWeight:600,color:step===s.n?'#e6edf3':'rgba(255,255,255,0.5)'}}>{s.l}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:2}}>{s.d}</div></div>
                  </div>
                ))}
              </div>
              <div className='bx-sc'>

                {/* Step 1 — Bien */}
                {step===1&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Choisir le bien</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20}}>Selectionnez le bien immobilier concerne par ce bail.</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px',marginBottom:12}}>
                    <svg width='13' height='13' fill='none' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z'/></svg>
                    <input autoFocus style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}} value={bienSearch} onChange={e=>setBienSearch(e.target.value)} placeholder='Filtrer les biens disponibles...'/>
                  </div>
                  {biens.length===0&&<div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13,color:'rgba(255,255,255,0.45)'}}>Aucun bien disponible. <span style={{color:'#4da6ff',cursor:'pointer'}} onClick={()=>{setShowAdd(false);navigate('/imoloc/biens')}}>Ajouter un bien →</span></div>}
                  {filtBiens.map(b=>(
                    <div key={b.id} className={'bx-pick'+(selBienF?.id===b.id?' on':'')} onClick={()=>{setSelBienF(b);setF('loyer_mensuel',String(b.loyer_mensuel||b.loyer||''))}}>
                      <div style={{width:38,height:38,borderRadius:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🏠</div>
                      <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{b.nom}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{b.ville||'—'} · {fmt(b.loyer_mensuel||b.loyer)} FCFA/mois</div></div>
                      {selBienF?.id===b.id?<span style={{color:'#00c896',fontSize:18}}>✓</span>:<span style={{color:'rgba(255,255,255,0.15)',fontSize:18}}>○</span>}
                    </div>
                  ))}
                  <div className='bx-sec'>Type de bail</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {TYPES_BAIL.map(t=>(
                      <div key={t} onClick={()=>setF('type_bail',t)} style={{padding:'7px 14px',borderRadius:7,border:'1.5px solid '+(form.type_bail===t?'#0078d4':'rgba(255,255,255,0.08)'),background:form.type_bail===t?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',fontSize:13,color:form.type_bail===t?'#e6edf3':'rgba(255,255,255,0.5)',transition:'all 0.15s',display:'flex',alignItems:'center',gap:6}}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</div>
                    ))}
                  </div>
                </>)}

                {/* Step 2 — Locataire */}
                {step===2&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Choisir le locataire</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20}}>Selectionnez le locataire pour ce bail.</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px',marginBottom:12}}>
                    <svg width='13' height='13' fill='none' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z'/></svg>
                    <input autoFocus style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}} value={locSearch} onChange={e=>setLocSearch(e.target.value)} placeholder='Nom, telephone...'/>
                  </div>
                  {locs.length===0&&<div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13,color:'rgba(255,255,255,0.45)'}}>Aucun locataire actif. <span style={{color:'#4da6ff',cursor:'pointer'}} onClick={()=>{setShowAdd(false);navigate('/imoloc/locataires')}}>Ajouter un locataire →</span></div>}
                  {filtLocs.map((l,i)=>{ const cl=['#0078d4','#6c63ff','#00c896','#f59e0b'][i%4]; return(
                    <div key={l.id} className={'bx-pick'+(selLocF?.id===l.id?' on':'')} onClick={()=>setSelLocF(l)}>
                      <div style={{width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${cl},${cl}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{((l.prenom?.[0]||'')+(l.nom?.[0]||'')).toUpperCase()||'?'}</div>
                      <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{l.prenom} {l.nom}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{l.telephone||'Pas de tel'}</div></div>
                      {selLocF?.id===l.id?<span style={{color:'#00c896',fontSize:18}}>✓</span>:<span style={{color:'rgba(255,255,255,0.15)',fontSize:18}}>○</span>}
                    </div>
                  )})}
                </>)}

                {/* Step 3 — Conditions */}
                {step===3&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Conditions financieres</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20}}>Loyer, duree, caution. Les echeances seront generees automatiquement.</div>
                  <div className='bx-sec'>Duree du bail</div>
                  <div className='bx-g2'>
                    <div><label className='bx-lbl'>Date de debut *</label><input className='bx-inp' type='date' autoFocus value={form.date_debut} onChange={e=>setF('date_debut',e.target.value)}/></div>
                    <div><label className='bx-lbl'>Type de duree</label><select className='bx-inp' value={form.type_duree} onChange={e=>setF('type_duree',e.target.value)}><option value='determinee' style={{background:'#161b22'}}>Determinee</option><option value='indeterminee' style={{background:'#161b22'}}>Indeterminee</option></select></div>
                  </div>
                  {form.type_duree==='determinee'&&<div className='bx-g2'>
                    <div><label className='bx-lbl'>Duree (mois) *</label><input className='bx-inp' type='number' min='1' value={form.duree_mois} onChange={e=>setF('duree_mois',e.target.value)}/></div>
                    <div><label className='bx-lbl'>Date de fin (auto)</label><input className='bx-inp' type='date' value={form.date_fin} onChange={e=>setF('date_fin',e.target.value)} style={{opacity:0.7}}/></div>
                  </div>}
                  <div className='bx-sec'>Finances</div>
                  <div className='bx-g2'>
                    <div><label className='bx-lbl'>Loyer mensuel (FCFA) *</label><input className='bx-inp' type='number' min='0' value={form.loyer_mensuel} onChange={e=>setF('loyer_mensuel',e.target.value)}/></div>
                    <div><label className='bx-lbl'>Caution (FCFA)</label><input className='bx-inp' type='number' min='0' value={form.caution} onChange={e=>setF('caution',e.target.value)}/></div>
                  </div>
                  <div className='bx-g3'>
                    <div><label className='bx-lbl'>Commission (%)</label><input className='bx-inp' type='number' min='0' value={form.taux_commission} onChange={e=>setF('taux_commission',e.target.value)}/></div>
                    <div><label className='bx-lbl'>Mode commission</label><select className='bx-inp' value={form.mode_commission} onChange={e=>setF('mode_commission',e.target.value)}>{['mensuel','annuel','journalier'].map(m=><option key={m} style={{background:'#161b22'}}>{m}</option>)}</select></div>
                    <div><label className='bx-lbl'>Mode de paiement</label><select className='bx-inp' value={form.mode_paiement} onChange={e=>setF('mode_paiement',e.target.value)}>{MODES_PAI.map(m=><option key={m} style={{background:'#161b22'}}>{m}</option>)}</select></div>
                  </div>
                  <div className='bx-fld'>
                    <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setF('renouvellement_auto',!form.renouvellement_auto)}>
                      <div style={{width:38,height:20,borderRadius:10,background:form.renouvellement_auto?'#0078d4':'rgba(255,255,255,0.1)',transition:'background 0.2s',position:'relative',flexShrink:0}}>
                        <div style={{position:'absolute',top:2,left:form.renouvellement_auto?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                      </div>
                      <span style={{fontSize:13,color:form.renouvellement_auto?'#e6edf3':'rgba(255,255,255,0.4)'}}>Renouvellement automatique</span>
                    </div>
                  </div>
                  <div className='bx-fld'><label className='bx-lbl'>Notes internes</label><textarea className='bx-inp' rows={2} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder='Conditions particulieres...' style={{resize:'vertical',minHeight:60}}/></div>
                </>)}

                {/* Step 4 — Recap */}
                {step===4&&(<>
                  <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:6}}>Recapitulatif</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20}}>Verifiez avant de creer le bail et les {form.duree_mois||'?'} echeances.</div>
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
                    {[['Bien',selBienF?.nom||'—'],['Locataire',(selLocF?`${selLocF.prenom||''} ${selLocF.nom}`.trim():'—')],['Type bail',form.type_bail],['Debut',form.date_debut?new Date(form.date_debut).toLocaleDateString('fr-FR'):'—'],['Fin',form.type_duree==='indeterminee'?'Indefinie':form.date_fin?new Date(form.date_fin).toLocaleDateString('fr-FR'):'—'],['Duree',form.type_duree==='indeterminee'?'Indeterminee':form.duree_mois+' mois'],['Loyer',form.loyer_mensuel?fmt(form.loyer_mensuel)+' FCFA/mois':'Non renseigne'],['Caution',form.caution?fmt(form.caution)+' FCFA':'—'],['Commission',form.taux_commission+'% / '+form.mode_commission],['Paiement',form.mode_paiement]].map(([k,v],i,a)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:i<a.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                        <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',width:130}}>{k}</span>
                        <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {form.duree_mois&&form.loyer_mensuel&&<div style={{padding:'14px 16px',borderRadius:8,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.15)',fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.8}}><strong style={{color:'#4da6ff'}}>Echeances a generer :</strong> {form.duree_mois} mensualites de {fmt(form.loyer_mensuel)} FCFA<br/>Total : {fmt(parseInt(form.duree_mois)*parseFloat(form.loyer_mensuel))} FCFA</div>}
                </>)}
              </div>
            </div>
            <div className='bx-pf'>
              <button className='bx-pfb bx-pfb-g' onClick={()=>{if(step===1){setShowAdd(false);resetForm()}else setStep(step-1)}}>{step===1?'Annuler':'Precedent'}</button>
              {step<4?(<button className='bx-pfb bx-pfb-b' disabled={(step===1&&!selBienF)||(step===2&&!selLocF)||(step===3&&!form.loyer_mensuel)} style={{opacity:(step===1&&!selBienF)||(step===2&&!selLocF)||(step===3&&!form.loyer_mensuel)?0.4:1}} onClick={()=>setStep(step+1)}>Suivant →</button>
              ):(<button className='bx-pfb bx-pfb-b' disabled={saving||!selBienF||!selLocF||!form.loyer_mensuel} style={{opacity:saving||!selBienF||!selLocF||!form.loyer_mensuel?0.4:1}} onClick={createBail}>{saving?'Creation...':'Creer le bail'}</button>)}
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DETAIL ── */}
      {selectedBail&&(
        <div className='bx-ov' onClick={e=>e.target===e.currentTarget&&setSelBail(null)}>
          <div className='bx-panel' style={{width:'min(640px,96vw)'}}>
            <div style={{padding:'24px 28px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:50,height:50,borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{TYPE_ICONS[selectedBail.type_bail||'habitation']||'📄'}</div>
                  <div>
                    <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:3}}>{selectedBail.biens?.nom||'—'}</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:8}}>{selectedBail.locataires?.prenom} {selectedBail.locataires?.nom} · {fmt(selectedBail.loyer_mensuel)} FCFA/mois</div>
                    <SBadge s={selectedBail.statut}/>
                  </div>
                </div>
                <button className='bx-cls' onClick={()=>setSelBail(null)}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                {selectedBail.statut==='en_attente'&&<button className='bx-btn bx-btn-g' onClick={()=>activerBail(selectedBail)}>✅ Activer le bail</button>}
                {selectedBail.statut==='actif'&&<button className='bx-btn bx-btn-r' onClick={()=>resilierBail(selectedBail)}>🚫 Resilier</button>}
                <button className='bx-btn' onClick={()=>toast('PDF — Phase 2')}>📄 Export PDF</button>
              </div>
              <div style={{display:'flex'}}>
                {[['infos','Informations'],['paiements','Paiements'],['edl','Etat des lieux']].map(([k,l])=>(
                  <button key={k} className={'bx-dtab'+(detailTab===k?' active':'')} onClick={()=>setDetailTab(k)}>{l}</button>
                ))}
              </div>
            </div>
            <div className='bx-sb'>
              {detailTab==='infos'&&(
                <><div className='bx-dg'>
                  <div>{[['Bien',selectedBail.biens?.nom],['Locataire',`${selectedBail.locataires?.prenom||''} ${selectedBail.locataires?.nom||''}`.trim()],['Debut',selectedBail.date_debut?new Date(selectedBail.date_debut).toLocaleDateString('fr-FR'):null],['Duree',selectedBail.duree_mois?selectedBail.duree_mois+' mois':null]].map(([k,v])=>(<div key={k} className='bx-blk'><div className='bx-bl'>{k}</div><div className='bx-bv'>{v||'—'}</div></div>))}</div>
                  <div>{[['Loyer',fmt(selectedBail.loyer_mensuel)+' FCFA/mois'],['Caution',selectedBail.caution?fmt(selectedBail.caution)+' FCFA':'—'],['Fin',selectedBail.date_fin?new Date(selectedBail.date_fin).toLocaleDateString('fr-FR'):'Indefinie'],['Commission',(selectedBail.taux_commission||10)+'% / '+(selectedBail.mode_commission||'mensuel')]].map(([k,v])=>(<div key={k} className='bx-blk'><div className='bx-bl'>{k}</div><div className='bx-bv'>{v||'—'}</div></div>))}</div>
                </div></>
              )}
              {detailTab==='paiements'&&(
                <><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#e6edf3'}}>{paiements.length} echeances</div>
                  <div style={{fontSize:12,display:'flex',gap:8}}><span style={{color:'#00c896'}}>{paiements.filter(p=>p.statut==='paye').length} payes</span><span style={{color:'#ef4444'}}>{paiements.filter(p=>p.statut==='en_retard').length} retards</span><span style={{color:'rgba(255,255,255,0.4)'}}>{paiements.filter(p=>p.statut==='en_attente').length} a venir</span></div>
                </div>
                {paiements.map(p=>{ const PC={paye:{c:'#00c896',l:'Paye'},en_retard:{c:'#ef4444',l:'Retard'},en_attente:{c:'rgba(255,255,255,0.35)',l:'A venir'},partiel:{c:'#f59e0b',l:'Partiel'},annule:{c:'rgba(255,255,255,0.2)',l:'Annule'}}; const cfg=PC[p.statut]||PC.en_attente; return(
                  <div key={p.id} className={'bx-pr '+(p.statut||'')}>
                    <div><div style={{fontSize:13,fontWeight:600,color:'#e6edf3',marginBottom:2}}>{p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}):'—'}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR'):'—'}</div></div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:13.5,fontWeight:700,color:'#e6edf3'}}>{fmt(p.montant)} FCFA</span><span style={{fontSize:11,fontWeight:600,color:cfg.c,padding:'2px 8px',borderRadius:'100px',background:cfg.c+'18'}}>{cfg.l}</span></div>
                  </div>
                )})}</>
              )}
              {detailTab==='edl'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:36,marginBottom:12,opacity:0.3}}>🔍</div><div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Etat des lieux</div><div style={{fontSize:13,color:'rgba(255,255,255,0.25)',lineHeight:1.7}}>Module etat des lieux arrive en Phase 2.</div></div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}