import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const STATUT_CFG = {
  actif:       { color:'#00c896', bg:'rgba(0,200,150,0.1)',  label:'Actif'       },
  inactif:     { color:'#8b949e', bg:'rgba(139,148,158,0.1)',label:'Inactif'     },
  blackliste:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'Blackliste'  },
}

function Badge({ statut }) {
  const cfg = STATUT_CFG[statut] || STATUT_CFG.actif
  return (
    <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,
      background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}33`,whiteSpace:'nowrap'}}>
      {cfg.label}
    </span>
  )
}

function Avatar({ loc, size=36 }) {
  const initials = `${(loc.prenom||'')[0]||''}${(loc.nom||'')[0]||''}`.toUpperCase()
  const colors = ['#0078d4','#059669','#6b21a8','#c0392b','#b8860b','#1a237e']
  const col = colors[(loc.nom||'').charCodeAt(0) % colors.length]
  if (loc.photo_url) return <img src={loc.photo_url} alt="" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
  return <div style={{width:size,height:size,borderRadius:'50%',background:col,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.35,fontWeight:700,color:'#fff',flexShrink:0}}>{initials||'?'}</div>
}

export default function Locataires() {
  const [agence, setAgence]         = useState(null)
  const [locataires, setLocataires] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterBail, setFilterBail] = useState('tous')
  const [selLoc, setSelLoc]         = useState(null)
  const [detailTab, setDetailTab]   = useState('profil')
  const [showAdd, setShowAdd]       = useState(false)
  const [step, setStep]             = useState(1)
  const [saving, setSaving]         = useState(false)

  // Step 1 - recherche
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]       = useState(false)
  const [locTrouve, setLocTrouve]       = useState(null) // locataire trouve dans la base

  // Form data
  const [form, setForm] = useState({
    nom:'', prenom:'', genre:'', date_naissance:'', nationalite:'Beninoise',
    telephone:'', email:'', adresse:'', ville:'Cotonou', profession:'',
    cin:'', cin_type:'CIN', cin_expiration:'',
    garant_nom:'', garant_telephone:'', garant_relation:'', garant_cin:'', garant_email:'',
    notes_internes:'',
    creer_compte: false,
  })
  const setF = (k,v) => setForm(p=>({...p,[k]:v}))

  // Baux du locataire selectionne
  const [bauxLoc, setBauxLoc] = useState([])

  useEffect(()=>{ initData() },[])

  const initData = async () => {
    setLoading(true)
    try {
      const {data:{user}} = await supabase.auth.getUser()
      const {data:agList} = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id)||agList?.[0]
      setAgence(ag)
      if (!ag?.id) return
      await chargerLocataires(ag.id)
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  const chargerLocataires = async (agenceId) => {
    const {data} = await supabase
      .from('agence_locataires')
      .select(`*, locataires(*, baux(id, statut, biens(nom)))`)
      .eq('agence_id', agenceId)
    if (data) {
      const list = data.map(al=>({
        ...al.locataires,
        lien_id: al.id,
        notes_agence: al.notes,
        statut_agence: al.statut,
        baux_actifs: (al.locataires?.baux||[]).filter(b=>b.statut==='actif').length,
      })).filter(Boolean)
      setLocataires(list)
    }
  }

  const rechercherLocataire = async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const {data} = await supabase.from('locataires')
        .select('*')
        .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,telephone.ilike.%${q}%,email.ilike.%${q}%,cin.ilike.%${q}%`)
        .limit(10)
      setSearchResults(data||[])
    } catch(e){}
    finally{setSearching(false)}
  }

  const selectionnerLocataireTrouve = (loc) => {
    setLocTrouve(loc)
    setForm(p=>({...p,
      nom:loc.nom||'', prenom:loc.prenom||'', genre:loc.genre||'',
      date_naissance:loc.date_naissance||'', nationalite:loc.nationalite||'Beninoise',
      telephone:loc.telephone||'', email:loc.email||'', adresse:loc.adresse||'',
      ville:loc.ville||'', profession:loc.profession||'',
      cin:loc.cin||'', cin_type:loc.cin_type||'CIN', cin_expiration:loc.cin_expiration||'',
      garant_nom:loc.garant_nom||'', garant_telephone:loc.garant_telephone||'',
      garant_relation:loc.garant_relation||'', garant_cin:loc.garant_cin||'',
    }))
    setStep(2)
  }

  const ajouterLocataire = async () => {
    if (!agence?.id || !form.nom || !form.prenom) { toast.error('Nom et prenom requis'); return }
    setSaving(true)
    try {
      let locId = locTrouve?.id

      if (!locId) {
        // Creer le locataire
        const {data:newLoc, error} = await supabase.from('locataires').insert({
          nom: form.nom, prenom: form.prenom, genre: form.genre,
          date_naissance: form.date_naissance||null,
          nationalite: form.nationalite, telephone: form.telephone,
          email: form.email, adresse: form.adresse, ville: form.ville,
          profession: form.profession, cin: form.cin, cin_type: form.cin_type,
          cin_expiration: form.cin_expiration||null,
          garant_nom: form.garant_nom, garant_telephone: form.garant_telephone,
          garant_relation: form.garant_relation, garant_cin: form.garant_cin,
          garant_email: form.garant_email,
          statut_global: 'actif', agence_id: agence.id,
        }).select().single()
        if (error) throw error
        locId = newLoc.id

        // Creer compte utilisateur si demande
        if (form.creer_compte && form.email) {
          const tempPwd = Math.random().toString(36).slice(-8)
          await supabase.auth.admin?.createUser({email:form.email,password:tempPwd,email_confirm:true})
            .catch(()=>null)
        }
      }

      // Lier a l agence
      const {error:lienErr} = await supabase.from('agence_locataires').upsert({
        agence_id: agence.id, locataire_id: locId, statut:'actif',
      },{onConflict:'agence_id,locataire_id'})
      if (lienErr) throw lienErr

      toast.success('Locataire ajoute !')
      resetAdd()
      await chargerLocataires(agence.id)
    } catch(e){ toast.error(e.message) }
    finally{ setSaving(false) }
  }

  const resetAdd = () => {
    setShowAdd(false); setStep(1); setLocTrouve(null)
    setSearchQuery(''); setSearchResults([])
    setForm({nom:'',prenom:'',genre:'',date_naissance:'',nationalite:'Beninoise',
      telephone:'',email:'',adresse:'',ville:'Cotonou',profession:'',
      cin:'',cin_type:'CIN',cin_expiration:'',
      garant_nom:'',garant_telephone:'',garant_relation:'',garant_cin:'',garant_email:'',
      notes_internes:'',creer_compte:false})
  }

  const ouvrirDetail = async (loc) => {
    setSelLoc(loc)
    setDetailTab('profil')
    const {data} = await supabase.from('baux')
      .select('*, biens(nom,ville,type_bien)')
      .eq('locataire_id', loc.id)
      .order('created_at',{ascending:false})
    setBauxLoc(data||[])
  }

  const mettreAJourStatut = async (loc, newStatut, motif='') => {
    const updates = {statut_global: newStatut}
    if (newStatut==='blackliste') { updates.motif_blacklist=motif; updates.date_blacklist=new Date().toISOString() }
    await supabase.from('locataires').update(updates).eq('id',loc.id)
    setLocataires(prev=>prev.map(l=>l.id===loc.id?{...l,...updates}:l))
    setSelLoc(prev=>prev?{...prev,...updates}:prev)
    toast.success('Statut mis a jour')
  }

  const exportCSV = () => {
    const rows = [['Nom','Prenom','Telephone','Email','CIN','Statut','Baux actifs']]
    filteredList.forEach(l=>rows.push([l.nom,l.prenom,l.telephone||'',l.email||'',l.cin||'',l.statut_global||'actif',l.baux_actifs||0]))
    const csv = rows.map(r=>r.join(',')).join('\n')
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv)
    a.download='locataires.csv'; a.click()
  }

  const filteredList = locataires.filter(l=>{
    const q = search.toLowerCase()
    const matchSearch = !q || `${l.nom} ${l.prenom} ${l.telephone||''} ${l.cin||''}`.toLowerCase().includes(q)
    const matchStatut = filterStatut==='tous' || l.statut_global===filterStatut
    const matchBail = filterBail==='tous' || (filterBail==='avec'&&l.baux_actifs>0) || (filterBail==='sans'&&!l.baux_actifs)
    return matchSearch && matchStatut && matchBail
  })

  const STEPS = ['Recherche','Profil','Garant','Compte','Recapitulatif']

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>

  return (
    <>
      <style>{`
        .lc-root{min-height:100%;animation:lc-in 0.2s ease}
        @keyframes lc-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .lc-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .lc-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .lc-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.lc-btn-p:hover{background:#006cc1}
        .lc-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);color:#ef4444}
        .lc-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.25);color:#00c896}
        .lc-inp{width:100%;padding:8px 11px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark;box-sizing:border-box}
        .lc-inp:focus{border-color:#0078d4}
        .lc-select{width:100%;padding:8px 11px;background:rgba(30,36,48,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;outline:none;cursor:pointer;color-scheme:dark;box-sizing:border-box}
        .lc-lbl{display:block;font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:5px}
        .lc-table{width:100%;border-collapse:collapse}
        .lc-table th{text-align:left;padding:10px 12px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.06);white-space:nowrap}
        .lc-table td{padding:12px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px;color:#e6edf3;vertical-align:middle}
        .lc-table tr:hover td{background:rgba(255,255,255,0.02);cursor:pointer}
        .lc-ftab{padding:5px 13px;border-radius:100px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.4);font-family:Inter,sans-serif;transition:all 0.15s}
        .lc-ftab.on{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .lc-drawer{position:fixed;top:0;right:0;height:100vh;background:#0d1117;border-left:1px solid rgba(255,255,255,0.08);z-index:200;display:flex;flex-direction:column;transition:width 0.25s ease;overflow:hidden}
        .lc-dtab{padding:9px 16px;border-radius:6px;font-size:12.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.4);transition:all 0.15s;white-space:nowrap}
        .lc-dtab.on{background:rgba(255,255,255,0.08);color:#e6edf3}
        .lc-field{margin-bottom:14px}
        .lc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .lc-step-bar{display:flex;gap:0;margin-bottom:28px}
        .lc-step{flex:1;text-align:center;position:relative}
        .lc-step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin:0 auto 6px;transition:all 0.2s}
        .lc-step-line{position:absolute;top:14px;left:50%;width:100%;height:2px;z-index:-1}
        .lc-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px}
        .lc-modal{background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:14px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;padding:28px}
        .lc-search-result{padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.15s;margin-bottom:8px}
        .lc-search-result:hover{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.04)}
        .lc-warn{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px 14px;margin-bottom:14px}
      `}</style>

      <div className="lc-root">
        {/* ── TOPBAR ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:3}}>Locataires</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>{filteredList.length} locataire{filteredList.length!==1?'s':''} — {agence?.nom}</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="lc-btn" onClick={exportCSV}>Export CSV</button>
            <button className="lc-btn lc-btn-p" onClick={()=>setShowAdd(true)}>+ Ajouter un locataire</button>
          </div>
        </div>

        {/* ── FILTRES ── */}
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'6px 12px',marginRight:4,flex:'0 0 auto'}}>
            <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:180}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>×</button>}
          </div>
          {[['tous','Tous'],['actif','Actifs'],['inactif','Inactifs'],['blackliste','Blacklistes']].map(([v,l])=>(
            <button key={v} className={'lc-ftab'+(filterStatut===v?' on':'')} onClick={()=>setFilterStatut(v)}>{l}</button>
          ))}
          <div style={{width:1,height:20,background:'rgba(255,255,255,0.08)'}}/>
          {[['tous','Tous baux'],['avec','Avec bail actif'],['sans','Sans bail']].map(([v,l])=>(
            <button key={v} className={'lc-ftab'+(filterBail===v?' on':'')} onClick={()=>setFilterBail(v)}>{l}</button>
          ))}
        </div>

        {/* ── TABLE ── */}
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
          {filteredList.length===0 ? (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:36,marginBottom:12,opacity:0.2}}>👥</div>
              <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.3)',marginBottom:8}}>Aucun locataire</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.2)',marginBottom:20}}>Ajoutez votre premier locataire</div>
              <button className="lc-btn lc-btn-p" style={{margin:'0 auto'}} onClick={()=>setShowAdd(true)}>+ Ajouter un locataire</button>
            </div>
          ):(
            <table className="lc-table">
              <thead>
                <tr>
                  <th>Locataire</th>
                  <th>Contact</th>
                  <th>CIN</th>
                  <th>Profession</th>
                  <th>Baux actifs</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(loc=>(
                  <tr key={loc.id} onClick={()=>ouvrirDetail(loc)}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <Avatar loc={loc} size={36}/>
                        <div>
                          <div style={{fontWeight:600}}>{loc.prenom} {loc.nom}</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:1}}>{loc.ville||'—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{fontSize:12.5}}>{loc.telephone||'—'}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{loc.email||''}</div>
                    </td>
                    <td><span style={{fontSize:12,fontFamily:'monospace',color:'rgba(255,255,255,0.55)'}}>{loc.cin||'—'}</span></td>
                    <td><span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{loc.profession||'—'}</span></td>
                    <td>
                      <span style={{fontSize:13,fontWeight:600,color:loc.baux_actifs>0?'#00c896':'rgba(255,255,255,0.3)'}}>{loc.baux_actifs||0}</span>
                    </td>
                    <td><Badge statut={loc.statut_global||'actif'}/></td>
                    <td onClick={e=>e.stopPropagation()}>
                      <button className="lc-btn" style={{padding:'4px 10px',fontSize:11}} onClick={()=>ouvrirDetail(loc)}>Voir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── DRAWER DETAIL ── */}
      {selLoc && (
        <div className="lc-drawer" style={{width:'min(680px,96vw)'}}>
          {/* Header */}
          <div style={{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <Avatar loc={selLoc} size={48}/>
                <div>
                  <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>{selLoc.prenom} {selLoc.nom}</div>
                  <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',marginTop:2}}>{selLoc.telephone} {selLoc.email?`· ${selLoc.email}`:''}</div>
                  <div style={{marginTop:6,display:'flex',gap:6,alignItems:'center'}}>
                    <Badge statut={selLoc.statut_global||'actif'}/>
                    {selLoc.baux_actifs>0&&<span style={{fontSize:11,color:'#4da6ff'}}>{selLoc.baux_actifs} bail{selLoc.baux_actifs>1?'s':''} actif{selLoc.baux_actifs>1?'s':''}</span>}
                  </div>
                </div>
              </div>
              <button onClick={()=>setSelLoc(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22,lineHeight:1,padding:'2px 6px'}}>×</button>
            </div>
            {selLoc.statut_global==='blackliste'&&(
              <div className="lc-warn">
                <div style={{fontSize:12.5,fontWeight:600,color:'#ef4444',marginBottom:3}}>⚠ Locataire blackliste</div>
                <div style={{fontSize:12,color:'rgba(239,68,68,0.8)'}}>{selLoc.motif_blacklist||'Aucun motif specifie'}</div>
              </div>
            )}
            {/* Onglets */}
            <div style={{display:'flex',gap:2,overflowX:'auto'}}>
              {[['profil','Profil'],['baux','Baux'],['garant','Garant'],['documents','Documents'],['notes','Notes']].map(([k,l])=>(
                <button key={k} className={'lc-dtab'+(detailTab===k?' on':'')} onClick={()=>setDetailTab(k)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>

            {/* ── PROFIL ── */}
            {detailTab==='profil'&&(
              <div>
                <div className="lc-grid2">
                  {[['Nom',selLoc.nom],['Prenom',selLoc.prenom],['Genre',selLoc.genre||'—'],['Date naissance',selLoc.date_naissance?new Date(selLoc.date_naissance).toLocaleDateString('fr-FR'):'—'],['Nationalite',selLoc.nationalite||'—'],['Profession',selLoc.profession||'—'],['Telephone',selLoc.telephone||'—'],['Email',selLoc.email||'—'],['Adresse',selLoc.adresse||'—'],['Ville',selLoc.ville||'—']].map(([k,v])=>(
                    <div key={k} style={{marginBottom:14}}>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k}</div>
                      <div style={{fontSize:13.5,color:'#e6edf3'}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16,marginTop:4}}>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Piece d identite</div>
                  <div className="lc-grid2">
                    {[['Type',selLoc.cin_type||'CIN'],['Numero',selLoc.cin||'—'],['Expiration',selLoc.cin_expiration?new Date(selLoc.cin_expiration).toLocaleDateString('fr-FR'):'—']].map(([k,v])=>(
                      <div key={k}><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:3}}>{k}</div><div style={{fontSize:13,color:'#e6edf3',fontFamily:k==='Numero'?'monospace':'inherit'}}>{v}</div></div>
                    ))}
                  </div>
                </div>
                {selLoc.ancienne_agence&&(
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16,marginTop:16}}>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:6,fontWeight:600,textTransform:'uppercase'}}>Ancienne agence</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.6)'}}>{selLoc.ancienne_agence}</div>
                  </div>
                )}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16,marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}}>
                  {selLoc.statut_global!=='blackliste'&&(
                    <button className="lc-btn lc-btn-r" onClick={()=>{
                      const motif = prompt('Motif du blacklistage ?')
                      if (motif!==null) mettreAJourStatut(selLoc,'blackliste',motif)
                    }}>Blacklister</button>
                  )}
                  {selLoc.statut_global==='blackliste'&&(
                    <button className="lc-btn lc-btn-g" onClick={()=>mettreAJourStatut(selLoc,'actif')}>Retirer du blacklist</button>
                  )}
                  {selLoc.statut_global==='actif'&&(
                    <button className="lc-btn" onClick={()=>mettreAJourStatut(selLoc,'inactif')}>Desactiver</button>
                  )}
                  {selLoc.statut_global==='inactif'&&(
                    <button className="lc-btn lc-btn-g" onClick={()=>mettreAJourStatut(selLoc,'actif')}>Reactiver</button>
                  )}
                </div>
              </div>
            )}

            {/* ── BAUX ── */}
            {detailTab==='baux'&&(
              <div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16}}>{bauxLoc.length} bail{bauxLoc.length!==1?'s':''} avec cette agence</div>
                {bauxLoc.length===0?(
                  <div style={{textAlign:'center',padding:'40px 20px',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:10}}>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Aucun bail avec cette agence</div>
                  </div>
                ):bauxLoc.map(b=>(
                  <div key={b.id} style={{padding:'12px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                      <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{b.biens?.nom||'Bien inconnu'}</div>
                      <Badge statut={b.statut==='actif'?'actif':b.statut==='resilie'?'inactif':'actif'}/>
                    </div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',display:'flex',gap:12}}>
                      <span>{b.biens?.ville||''}</span>
                      <span>{b.loyer_mensuel?Number(b.loyer_mensuel).toLocaleString('fr-FR')+' FCFA/mois':''}</span>
                      <span>{b.date_debut?new Date(b.date_debut).toLocaleDateString('fr-FR'):''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── GARANT ── */}
            {detailTab==='garant'&&(
              <div>
                {selLoc.garant_nom?(
                  <div className="lc-grid2">
                    {[['Nom',selLoc.garant_nom],['Telephone',selLoc.garant_telephone||'—'],['Email',selLoc.garant_email||'—'],['Relation',selLoc.garant_relation||'—'],['CIN Garant',selLoc.garant_cin||'—']].map(([k,v])=>(
                      <div key={k} style={{marginBottom:14}}>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:3,fontWeight:600,textTransform:'uppercase'}}>{k}</div>
                        <div style={{fontSize:13.5,color:'#e6edf3'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{textAlign:'center',padding:'40px 20px',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:10}}>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Aucun garant enregistre</div>
                  </div>
                )}
              </div>
            )}

            {/* ── DOCUMENTS ── */}
            {detailTab==='documents'&&(
              <div style={{textAlign:'center',padding:'40px 20px',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:10}}>
                <div style={{fontSize:28,marginBottom:10,opacity:0.2}}>📎</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginBottom:16}}>Gestion des documents bientot disponible</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.2)'}}>CIN, justificatif domicile, contrat emploi...</div>
              </div>
            )}

            {/* ── NOTES ── */}
            {detailTab==='notes'&&(
              <div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginBottom:12}}>Notes internes — visibles uniquement par votre agence</div>
                <textarea
                  defaultValue={selLoc.notes_internes||''}
                  onBlur={async e=>{
                    await supabase.from('locataires').update({notes_internes:e.target.value}).eq('id',selLoc.id)
                    setSelLoc(p=>p?{...p,notes_internes:e.target.value}:p)
                    toast.success('Note sauvegardee')
                  }}
                  placeholder="Ajouter une note interne..."
                  style={{width:'100%',minHeight:200,padding:'12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#e6edf3',fontSize:13,lineHeight:1.7,resize:'vertical',outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box',colorScheme:'dark'}}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL AJOUT 5 STEPS ── */}
      {showAdd&&(
        <div className="lc-modal-bg" onClick={e=>e.target===e.currentTarget&&resetAdd()}>
          <div className="lc-modal">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
              <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Ajouter un locataire</div>
              <button onClick={resetAdd} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:22}}>×</button>
            </div>

            {/* Barre de progression */}
            <div className="lc-step-bar">
              {STEPS.map((s,i)=>{
                const n=i+1; const done=n<step; const active=n===step
                return (
                  <div key={s} className="lc-step">
                    {i<STEPS.length-1&&<div className="lc-step-line" style={{background:done?'#0078d4':'rgba(255,255,255,0.08)'}}/>}
                    <div className="lc-step-dot" style={{background:done?'#0078d4':active?'rgba(0,120,212,0.15)':'rgba(255,255,255,0.06)',border:`2px solid ${done||active?'#0078d4':'rgba(255,255,255,0.1)'}`,color:done?'#fff':active?'#4da6ff':'rgba(255,255,255,0.3)'}}>{done?'✓':n}</div>
                    <div style={{fontSize:10.5,color:active?'#e6edf3':'rgba(255,255,255,0.3)',fontWeight:active?600:400}}>{s}</div>
                  </div>
                )
              })}
            </div>

            {/* STEP 1 - Recherche */}
            {step===1&&(
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:6}}>Rechercher dans la base Imoloc</div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)',marginBottom:16}}>Commencez par chercher si le locataire existe deja dans le systeme</div>
                <div className="lc-field">
                  <input className="lc-inp" value={searchQuery} placeholder="Nom, telephone, email, CIN..."
                    onChange={e=>{setSearchQuery(e.target.value);rechercherLocataire(e.target.value)}}
                    style={{marginBottom:8}}/>
                </div>
                {searching&&<div style={{fontSize:13,color:'rgba(255,255,255,0.3)',textAlign:'center',padding:16}}>Recherche...</div>}
                {searchResults.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:10}}>{searchResults.length} resultat{searchResults.length>1?'s':''} trouve{searchResults.length>1?'s':''}</div>
                    {searchResults.map(loc=>(
                      <div key={loc.id} className="lc-search-result" onClick={()=>selectionnerLocataireTrouve(loc)}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <Avatar loc={loc} size={38}/>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                              <span style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{loc.prenom} {loc.nom}</span>
                              <Badge statut={loc.statut_global||'actif'}/>
                            </div>
                            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',display:'flex',gap:10}}>
                              <span>{loc.telephone||''}</span>
                              {loc.email&&<span>· {loc.email}</span>}
                              {loc.profession&&<span>· {loc.profession}</span>}
                            </div>
                            {loc.ancienne_agence&&<div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:2}}>Ancienne agence : {loc.ancienne_agence}</div>}
                            {loc.statut_global==='blackliste'&&<div style={{fontSize:11,color:'#ef4444',marginTop:4}}>⚠ {loc.motif_blacklist||'Blackliste'}</div>}
                          </div>
                          <div style={{fontSize:11,color:'#4da6ff'}}>Selectionner →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.length>1&&!searching&&searchResults.length===0&&(
                  <div style={{padding:'16px',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:8,textAlign:'center',marginBottom:16}}>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginBottom:8}}>Aucun resultat — nouveau locataire</div>
                  </div>
                )}
                <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
                  <button className="lc-btn" onClick={resetAdd}>Annuler</button>
                  <button className="lc-btn lc-btn-p" onClick={()=>setStep(2)}>
                    {searchResults.length>0?'Creer un nouveau':'Continuer →'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 - Profil */}
            {step===2&&(
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:16}}>
                  {locTrouve?`Profil de ${locTrouve.prenom} ${locTrouve.nom}`:'Informations personnelles'}
                </div>
                {locTrouve?.statut_global==='blackliste'&&(
                  <div className="lc-warn">
                    <div style={{fontSize:12.5,fontWeight:600,color:'#ef4444'}}>⚠ Ce locataire est blackliste</div>
                    <div style={{fontSize:12,color:'rgba(239,68,68,0.7)',marginTop:3}}>{locTrouve.motif_blacklist||'Aucun motif'}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:6}}>Vous pouvez tout de meme l ajouter mais cela est deconseille</div>
                  </div>
                )}
                <div className="lc-grid2">
                  <div className="lc-field"><label className="lc-lbl">Nom *</label><input className="lc-inp" value={form.nom} onChange={e=>setF('nom',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Prenom *</label><input className="lc-inp" value={form.prenom} onChange={e=>setF('prenom',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Genre</label>
                    <select className="lc-select" value={form.genre} onChange={e=>setF('genre',e.target.value)}>
                      <option value="">—</option><option value="M">Masculin</option><option value="F">Feminin</option>
                    </select>
                  </div>
                  <div className="lc-field"><label className="lc-lbl">Date de naissance</label><input type="date" className="lc-inp" value={form.date_naissance} onChange={e=>setF('date_naissance',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Nationalite</label><input className="lc-inp" value={form.nationalite} onChange={e=>setF('nationalite',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Profession</label><input className="lc-inp" value={form.profession} onChange={e=>setF('profession',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Telephone *</label><input className="lc-inp" value={form.telephone} onChange={e=>setF('telephone',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Email</label><input type="email" className="lc-inp" value={form.email} onChange={e=>setF('email',e.target.value)}/></div>
                </div>
                <div className="lc-field"><label className="lc-lbl">Adresse</label><input className="lc-inp" value={form.adresse} onChange={e=>setF('adresse',e.target.value)}/></div>
                <div className="lc-grid2">
                  <div className="lc-field"><label className="lc-lbl">Ville</label><input className="lc-inp" value={form.ville} onChange={e=>setF('ville',e.target.value)}/></div>
                </div>
                <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16,marginTop:8,marginBottom:16}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:'rgba(255,255,255,0.5)',marginBottom:12}}>Piece d identite</div>
                  <div className="lc-grid2">
                    <div className="lc-field"><label className="lc-lbl">Type</label>
                      <select className="lc-select" value={form.cin_type} onChange={e=>setF('cin_type',e.target.value)}>
                        <option>CIN</option><option>Passeport</option><option>Permis</option><option>Autre</option>
                      </select>
                    </div>
                    <div className="lc-field"><label className="lc-lbl">Numero</label><input className="lc-inp" value={form.cin} onChange={e=>setF('cin',e.target.value)}/></div>
                    <div className="lc-field"><label className="lc-lbl">Date expiration</label><input type="date" className="lc-inp" value={form.cin_expiration} onChange={e=>setF('cin_expiration',e.target.value)}/></div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'space-between'}}>
                  <button className="lc-btn" onClick={()=>setStep(1)}>← Retour</button>
                  <button className="lc-btn lc-btn-p" onClick={()=>setStep(3)}>Suivant →</button>
                </div>
              </div>
            )}

            {/* STEP 3 - Garant */}
            {step===3&&(
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:4}}>Garant (optionnel)</div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)',marginBottom:16}}>Laissez vide si pas de garant</div>
                <div className="lc-grid2">
                  <div className="lc-field"><label className="lc-lbl">Nom du garant</label><input className="lc-inp" value={form.garant_nom} onChange={e=>setF('garant_nom',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Telephone</label><input className="lc-inp" value={form.garant_telephone} onChange={e=>setF('garant_telephone',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Email</label><input className="lc-inp" value={form.garant_email} onChange={e=>setF('garant_email',e.target.value)}/></div>
                  <div className="lc-field"><label className="lc-lbl">Relation</label>
                    <select className="lc-select" value={form.garant_relation} onChange={e=>setF('garant_relation',e.target.value)}>
                      <option value="">—</option><option>Pere</option><option>Mere</option><option>Frere/Soeur</option><option>Conjoint(e)</option><option>Ami(e)</option><option>Employeur</option><option>Autre</option>
                    </select>
                  </div>
                  <div className="lc-field"><label className="lc-lbl">CIN du garant</label><input className="lc-inp" value={form.garant_cin} onChange={e=>setF('garant_cin',e.target.value)}/></div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'space-between',marginTop:16}}>
                  <button className="lc-btn" onClick={()=>setStep(2)}>← Retour</button>
                  <button className="lc-btn lc-btn-p" onClick={()=>setStep(4)}>Suivant →</button>
                </div>
              </div>
            )}

            {/* STEP 4 - Compte */}
            {step===4&&(
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:4}}>Compte utilisateur</div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)',marginBottom:20}}>Creez un compte pour que le locataire puisse acceder a ses documents en ligne</div>
                {locTrouve?.profile_id?(
                  <div style={{padding:'14px 16px',background:'rgba(0,200,150,0.06)',border:'1px solid rgba(0,200,150,0.15)',borderRadius:8,marginBottom:16}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#00c896',marginBottom:4}}>✅ Compte existant</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Ce locataire possede deja un compte Imoloc</div>
                  </div>
                ):(
                  <div style={{padding:'16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,marginBottom:16}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <input type="checkbox" id="creer_compte" checked={form.creer_compte} onChange={e=>setF('creer_compte',e.target.checked)} style={{marginTop:2,cursor:'pointer',width:16,height:16,accentColor:'#0078d4'}}/>
                      <label htmlFor="creer_compte" style={{cursor:'pointer'}}>
                        <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3',marginBottom:3}}>Creer un compte locataire</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>Un email avec les identifiants sera envoye a <strong style={{color:'rgba(255,255,255,0.6)'}}>{form.email||'l adresse email'}</strong>. Le locataire pourra voir ses baux, contrats et quittances.</div>
                      </label>
                    </div>
                    {!form.email&&form.creer_compte&&<div style={{fontSize:12,color:'#f59e0b',marginTop:10,paddingLeft:28}}>⚠ Renseignez un email a l etape 2 pour creer un compte</div>}
                  </div>
                )}
                <div style={{display:'flex',gap:8,justifyContent:'space-between',marginTop:16}}>
                  <button className="lc-btn" onClick={()=>setStep(3)}>← Retour</button>
                  <button className="lc-btn lc-btn-p" onClick={()=>setStep(5)}>Suivant →</button>
                </div>
              </div>
            )}

            {/* STEP 5 - Recapitulatif */}
            {step===5&&(
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:16}}>Recapitulatif</div>
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'16px',marginBottom:20}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(0,120,212,0.15)',border:'2px solid rgba(0,120,212,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#4da6ff'}}>
                      {form.prenom[0]||''}{form.nom[0]||''}
                    </div>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>{form.prenom} {form.nom}</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{form.profession||''} {form.ville?`· ${form.ville}`:''}</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[['Telephone',form.telephone],['Email',form.email||'—'],['CIN',form.cin||'—'],['Garant',form.garant_nom||'—'],['Compte',form.creer_compte?'Oui':'Non']].map(([k,v])=>(
                      <div key={k}><span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{k} : </span><span style={{fontSize:12.5,color:'#e6edf3'}}>{v}</span></div>
                    ))}
                  </div>
                </div>
                {locTrouve&&<div style={{padding:'10px 14px',background:'rgba(0,120,212,0.06)',border:'1px solid rgba(0,120,212,0.15)',borderRadius:8,marginBottom:16,fontSize:12.5,color:'#4da6ff'}}>Ce locataire existe deja dans Imoloc — il sera lie a votre agence</div>}
                <div style={{display:'flex',gap:8,justifyContent:'space-between'}}>
                  <button className="lc-btn" onClick={()=>setStep(4)}>← Retour</button>
                  <button className="lc-btn lc-btn-p" disabled={saving||!form.nom||!form.prenom} onClick={ajouterLocataire}>
                    {saving?'Ajout en cours...':'Confirmer et ajouter'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
