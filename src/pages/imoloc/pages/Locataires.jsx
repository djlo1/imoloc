import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

export default function ImolocLocataires() {
  const navigate = useNavigate()
  const [agence, setAgence]       = useState(null)
  const [locs, setLocs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [selLoc, setSelLoc]       = useState(null)
  const [form, setForm] = useState({ nom:'', prenom:'', telephone:'', email:'', profession:'', revenu_mensuel:'', cin:'', garant_nom:'', garant_telephone:'' })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const reset = () => setForm({ nom:'', prenom:'', telephone:'', email:'', profession:'', revenu_mensuel:'', cin:'', garant_nom:'', garant_telephone:'' })

  useEffect(()=>{ initData() },[]) // eslint-disable-line

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const { data } = await supabase.from('locataires').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false})
        setLocs(data||[])
      }
    } catch(e){ console.error(e) }
    finally{ setLoading(false) }
  }

  const createLoc = async () => {
    if (!agence?.id || !form.nom) return
    setSaving(true)
    try {
      const { error } = await supabase.from('locataires').insert({
        nom: form.nom,
        prenom: form.prenom || null,
        telephone: form.telephone || null,
        email: form.email || null,
        profession: form.profession || null,
        revenu_mensuel: form.revenu_mensuel ? Number(form.revenu_mensuel) : null,
        cin: form.cin || null,
        garant_nom: form.garant_nom || null,
        garant_telephone: form.garant_telephone || null,
        agence_id: agence.id,
        statut_global: 'actif',
      })
      if (error) throw new Error(error.message + ' [' + error.code + ']')
      toast.success((form.prenom ? form.prenom + ' ' : '') + form.nom + ' ajoute !')
      setShowAdd(false); reset(); initData()
    } catch(e){ toast.error(e.message) }
    finally{ setSaving(false) }
  }

  const deleteLoc = async (id) => {
    if (!confirm('Supprimer ce locataire ?')) return
    const { error } = await supabase.from('locataires').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Locataire supprime')
    setSelLoc(null); initData()
  }

  const filtered = locs.filter(l => `${l.prenom||''} ${l.nom} ${l.telephone||''} ${l.email||''}`.toLowerCase().includes(search.toLowerCase()))
  const COLORS = ['#0078d4','#6c63ff','#00c896','#f59e0b','#4da6ff']
  const ini = (l) => ((l.prenom?.[0]||'')+(l.nom?.[0]||'')).toUpperCase()||'?'

  return (
    <>
      <style>{`
        .lc-ov{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;display:flex;justify-content:flex-end}
        .lc-panel{background:#161b22;border-left:1px solid rgba(255,255,255,0.07);width:min(480px,96vw);display:flex;flex-direction:column;animation:lc-sl 0.22s ease;height:100%}
        @keyframes lc-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .lc-inp{width:100%;padding:9px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .lc-inp:focus{border-color:#0078d4}
        .lc-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
        .lc-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .lc-fld{margin-bottom:14px}
        .lc-sec{font-size:11px;font-weight:700;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:0.09em;margin:20px 0 12px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .lc-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s}
        .lc-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .lc-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.lc-btn-p:hover{background:#006cc1}
        .lc-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
      `}</style>

      <div style={{minHeight:'100%',animation:'bx-in 0.2s ease'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,color:'rgba(255,255,255,0.4)',marginBottom:18}}>
          <span style={{cursor:'pointer'}} onClick={()=>navigate('/imoloc')}>Centre Imoloc</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Locataires</span>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:4}}>Locataires</div>
        <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)',marginBottom:22}}>{locs.length} locataire{locs.length!==1?'s':''} — {agence?.nom||'votre agence'}</div>

        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          <button className='lc-btn lc-btn-p' onClick={()=>{reset();setShowAdd(true)}}>
            <svg width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M12 4.5v15m7.5-7.5h-15'/></svg>
            Ajouter un locataire
          </button>
          <button className='lc-btn' onClick={initData}>🔄</button>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:4,padding:'7px 12px'}}>
            <svg width='13' height='13' fill='none' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z'/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Nom, telephone, email...' style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:200}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>×</button>}
          </div>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
        ) : filtered.length===0 ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>👤</div>
            <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:16}}>{search?'Aucun resultat':'Aucun locataire enregistre'}</div>
            {!search&&<button className='lc-btn lc-btn-p' style={{margin:'0 auto'}} onClick={()=>{reset();setShowAdd(true)}}>+ Ajouter un locataire</button>}
          </div>
        ) : (
          <div style={{border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden'}}>
            {filtered.map((l,i)=>(
              <div key={l.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 18px',borderBottom:i<filtered.length-1?'1px solid rgba(255,255,255,0.05)':'none',cursor:'pointer',transition:'background 0.1s'}}
                onClick={()=>setSelLoc(l)}
                onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.025)'}
                onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                <div style={{width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${COLORS[i%COLORS.length]},${COLORS[i%COLORS.length]}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{ini(l)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>{l.prenom} {l.nom}</div>
                  <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)',marginTop:2}}>{[l.telephone,l.email,l.profession].filter(Boolean).join(' · ')||'Pas de contact'}</div>
                </div>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:'100px',background:l.statut_global==='actif'?'rgba(0,200,150,0.1)':'rgba(255,255,255,0.06)',color:l.statut_global==='actif'?'#00c896':'rgba(255,255,255,0.35)'}}>{l.statut_global||'actif'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PANEL AJOUT ── */}
      {showAdd&&(
        <div className='lc-ov' onClick={e=>e.target===e.currentTarget&&(setShowAdd(false)||reset())}>
          <div className='lc-panel'>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <span style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Ajouter un locataire</span>
              <button onClick={()=>{setShowAdd(false);reset()}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:5,borderRadius:4,display:'flex'}}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
              <div className='lc-g2'>
                <div><label className='lc-lbl'>Prenom</label><input autoFocus className='lc-inp' value={form.prenom} onChange={e=>setF('prenom',e.target.value)} placeholder='Jean'/></div>
                <div><label className='lc-lbl'>Nom *</label><input className='lc-inp' value={form.nom} onChange={e=>setF('nom',e.target.value)} placeholder='Dupont'/></div>
              </div>
              <div className='lc-g2'>
                <div><label className='lc-lbl'>Telephone</label><input className='lc-inp' value={form.telephone} onChange={e=>setF('telephone',e.target.value)} placeholder='+229 XX XX XX XX'/></div>
                <div><label className='lc-lbl'>Email</label><input className='lc-inp' type='email' value={form.email} onChange={e=>setF('email',e.target.value)} placeholder='jean@exemple.com'/></div>
              </div>
              <div className='lc-g2'>
                <div><label className='lc-lbl'>Profession</label><input className='lc-inp' value={form.profession} onChange={e=>setF('profession',e.target.value)} placeholder='Informaticien...'/></div>
                <div><label className='lc-lbl'>Revenu mensuel (FCFA)</label><input className='lc-inp' type='number' value={form.revenu_mensuel} onChange={e=>setF('revenu_mensuel',e.target.value)} placeholder='150000'/></div>
              </div>
              <div className='lc-fld'><label className='lc-lbl'>CIN / Piece d identite</label><input className='lc-inp' value={form.cin} onChange={e=>setF('cin',e.target.value)} placeholder='N° CIN...'/></div>
              <div className='lc-sec'>Garant (optionnel)</div>
              <div className='lc-g2'>
                <div><label className='lc-lbl'>Nom du garant</label><input className='lc-inp' value={form.garant_nom} onChange={e=>setF('garant_nom',e.target.value)} placeholder='Nom complet'/></div>
                <div><label className='lc-lbl'>Telephone garant</label><input className='lc-inp' value={form.garant_telephone} onChange={e=>setF('garant_telephone',e.target.value)} placeholder='+229 XX XX XX XX'/></div>
              </div>
            </div>
            <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,flexShrink:0}}>
              <button onClick={()=>{setShowAdd(false);reset()}} style={{flex:1,padding:11,borderRadius:5,fontSize:14,fontWeight:600,cursor:'pointer',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.1)',fontFamily:'Inter,sans-serif'}}>Annuler</button>
              <button onClick={createLoc} disabled={saving||!form.nom} style={{flex:1,padding:11,borderRadius:5,fontSize:14,fontWeight:600,cursor:'pointer',background:'#0078d4',color:'#fff',border:'none',fontFamily:'Inter,sans-serif',opacity:saving||!form.nom?0.4:1}}>{saving?'Enregistrement...':'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DETAIL ── */}
      {selLoc&&(
        <div className='lc-ov' onClick={e=>e.target===e.currentTarget&&setSelLoc(null)}>
          <div className='lc-panel'>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <span style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>{selLoc.prenom} {selLoc.nom}</span>
              <button onClick={()=>setSelLoc(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:5,borderRadius:4,display:'flex'}}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
              {[['Telephone',selLoc.telephone],['Email',selLoc.email],['Profession',selLoc.profession],['Revenu mensuel',selLoc.revenu_mensuel?Number(selLoc.revenu_mensuel).toLocaleString('fr-FR')+' FCFA':null],['CIN',selLoc.cin],['Garant',selLoc.garant_nom?selLoc.garant_nom+(selLoc.garant_telephone?' ('+selLoc.garant_telephone+')':''):null]].map(([k,v])=>v?(
                <div key={k} style={{marginBottom:18}}><div style={{fontSize:12.5,fontWeight:600,color:'#e6edf3',marginBottom:4}}>{k}</div><div style={{fontSize:13.5,color:'rgba(255,255,255,0.5)'}}>{v}</div></div>
              ):null)}
              <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10}}>
                <button className='lc-btn' style={{flex:1}} onClick={()=>{setSelLoc(null);navigate('/imoloc/baux')}}>📄 Voir les baux</button>
                <button className='lc-btn lc-btn-r' onClick={()=>deleteLoc(selLoc.id)}>🗑️ Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}