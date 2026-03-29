import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const COLONNES = ['Nom du contact','E-mail','Entreprise','Téléphone (bureau)','Téléphone mobile','État de synch.']

export default function Contacts() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [agence, setAgence] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [profilOpen, setProfilOpen] = useState(true)
  const [courrierOpen, setCourrierOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    prenom:'', nom:'', display:'', email:'', masquer:false,
    entreprise:'', tel_bureau:'', tel_mobile:'', fax:'',
    titre:'', site:'', adresse:'', ville:'', departement:'',
    code_postal:'', pays:'Bénin',
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const [csvFile, setCsvFile] = useState(null)
  const [selected, setSelected] = useState([])
  const [rowMenu, setRowMenu] = useState(null)
  const [showColsPanel, setShowColsPanel] = useState(false)
  const [visibleCols, setVisibleCols] = useState(['display','email','entreprise','tel_bureau','tel_mobile','synch'])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.display || !form.email || !agence?.id) return
    setAdding(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('contacts').insert({
        agence_id: agence.id,
        created_by: user.id,
        display: form.display,
        email: form.email,
        prenom: form.prenom,
        nom: form.nom,
        entreprise: form.entreprise,
        tel_bureau: form.tel_bureau,
        tel_mobile: form.tel_mobile,
        fax: form.fax,
        titre: form.titre,
        site: form.site,
        adresse: form.adresse,
        ville: form.ville,
        departement: form.departement,
        code_postal: form.code_postal,
        pays: form.pays,
        masquer: form.masquer,
      }).select().single()

      if (error) throw error
      setContacts(prev => [data, ...prev])
      toast.success(`Contact ${form.display} ajouté !`)
      setForm({ prenom:'', nom:'', display:'', email:'', masquer:false, entreprise:'', tel_bureau:'', tel_mobile:'', fax:'', titre:'', site:'', adresse:'', ville:'', departement:'', code_postal:'', pays:'Bénin' })
      setShowAddPanel(false)
    } catch(e) {
      toast.error(e.message || "Erreur lors de l'ajout")
    } finally { setAdding(false) }
  }

  useEffect(() => { initData() }, [])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const { data:ctData } = await supabase
          .from('contacts')
          .select('*')
          .eq('agence_id', ag.id)
          .order('created_at', { ascending: false })
        setContacts(ctData || [])
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const canAdd = form.display && form.email
  const toggleSelect = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll = () => setSelected(s=>s.length===filtered.length?[]:filtered.map(c=>c.id))
  const deleteSelected = async () => {
    try {
      await supabase.from('contacts').delete().in('id', selected)
      setContacts(p=>p.filter(c=>!selected.includes(c.id)))
      toast.success(`${selected.length} contact(s) supprimé(s)`)
      setSelected([])
    } catch(e) { toast.error('Erreur lors de la suppression') }
  }

  const deleteOne = async (id) => {
    try {
      await supabase.from('contacts').delete().eq('id', id)
      setContacts(p=>p.filter(c=>c.id!==id))
      toast.success('Contact supprimé')
    } catch(e) { toast.error('Erreur') }
  }

  const ALL_COLS = [
    {key:'display',label:'Nom du contact'},
    {key:'email',label:'E-mail'},
    {key:'entreprise',label:'Entreprise'},
    {key:'tel_bureau',label:'Téléphone (bureau)'},
    {key:'tel_mobile',label:'Téléphone mobile'},
    {key:'titre',label:'Titre'},
    {key:'ville',label:'Ville'},
    {key:'pays',label:'Pays'},
    {key:'synch',label:'État de synch.'},
  ]
  const filtered = contacts.filter(c =>
    `${c.display} ${c.email} ${c.entreprise}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{`
        .ct-page{min-height:calc(100vh - 120px)}
        .ct-bc{display:flex;align-items:center;gap:7px;font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .ct-bc span{cursor:pointer;transition:color 0.1s}.ct-bc span:hover{color:#4da6ff}
        .ct-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
        .ct-title{font-size:26px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .ct-mode{display:flex;align-items:center;gap:6px;font-size:12.5px;color:rgba(255,255,255,0.4);cursor:pointer;padding:6px 10px;border-radius:5px;transition:all 0.15s}
        .ct-mode:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .ct-desc{font-size:13.5px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:22px;max-width:800px}
        .ct-toolbar{display:flex;align-items:center;gap:2px;margin-bottom:20px}
        .ct-tbtn{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;color:#e6edf3;font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap;position:relative}
        .ct-tbtn:hover{background:rgba(255,255,255,0.07)}
        .ct-tbtn svg{color:#0078d4}
        .ct-tbtn-tooltip{position:absolute;top:calc(100% + 6px);left:0;background:#000;color:#fff;font-size:12px;padding:5px 10px;border-radius:4px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:10}
        .ct-tbtn:hover .ct-tbtn-tooltip{opacity:1}
        .ct-search-wrap{display:flex;align-items:center;gap:6px;margin-left:auto}
        .ct-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:3px;padding:7px 12px;min-width:260px}
        .ct-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13px;color:#e6edf3;width:100%}
        .ct-search input::placeholder{color:rgba(255,255,255,0.3)}
        .ct-filter-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:7px;display:flex;transition:color 0.1s}
        .ct-filter-btn:hover{color:#e6edf3}

        /* Table */
        .ct-table-wrap{border-top:1px solid rgba(255,255,255,0.08)}
        .ct-table{width:100%;border-collapse:collapse}
        .ct-table th{font-size:12px;color:rgba(255,255,255,0.4);padding:9px 14px;text-align:left;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.07)}
        .ct-table td{padding:11px 14px;font-size:13.5px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04)}
        .ct-table tr:hover td{background:rgba(255,255,255,0.02)}
        .ct-empty{text-align:center;padding:80px 20px;color:rgba(255,255,255,0.3)}
        .ct-empty-title{font-size:15px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:8px}

        /* Panels */
        .ct-ov{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:400;display:flex;justify-content:flex-end}
        .ct-panel{width:920px;height:100%;background:#242424;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:ct-sl 0.2s ease;overflow:hidden}
        .ct-panel-wide{width:920px}
        @keyframes ct-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .ct-panel-head{padding:20px 22px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ct-panel-title{font-size:17px;font-weight:700;color:#e6edf3}
        .ct-panel-cls{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .ct-panel-cls:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .ct-panel-body{flex:1;overflow-y:auto;padding:20px 22px}
        .ct-panel-body::-webkit-scrollbar{width:4px}
        .ct-panel-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .ct-panel-foot{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.07);flex-shrink:0}

        /* Champs formulaire */
        .ct-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .ct-field{margin-bottom:14px}
        .ct-lbl{display:block;font-size:13px;color:rgba(255,255,255,0.65);margin-bottom:6px}
        .ct-input-wrap{position:relative}
        .ct-input{width:100%;padding:8px 32px 8px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:2px;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .ct-input:focus{border-color:#0078d4}
        .ct-req{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#ef4444;font-size:14px;font-weight:700;pointer-events:none}
        .ct-check-row{display:flex;align-items:center;gap:10px;margin-bottom:18px;cursor:pointer}
        .ct-cb{width:16px;height:16px;border-radius:2px;border:1.5px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
        .ct-cb.on{background:#0078d4;border-color:#0078d4}
        .ct-accord-head{display:flex;align-items:center;justify-content:space-between;padding:12px 0;cursor:pointer;border-top:1px solid rgba(255,255,255,0.07)}
        .ct-accord-lbl{font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.7)}
        .ct-add-btn{padding:9px 22px;border-radius:3px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s;background:#0078d4;color:#fff}
        .ct-add-btn:disabled{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);cursor:not-allowed}
        .ct-add-btn:not(:disabled):hover{background:#006cc1}

        /* Bulk panel */
        .ct-section-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:8px}
        .ct-section-desc{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:12px}
        .ct-link{color:#0078d4;text-decoration:none;font-size:13px;display:block;margin-bottom:6px;cursor:pointer}
        .ct-link:hover{text-decoration:underline}
        .ct-rules{padding-left:18px;margin-bottom:20px}
        .ct-rules li{font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8;margin-bottom:2px}
        .ct-upload-row{display:flex;gap:0;margin-top:10px}
        .ct-upload-input{flex:1;padding:'9px 12px';background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-right:none;border-radius:'2px 0 0 2px';font-family:'Inter',sans-serif;font-size:13px;color:'rgba(255,255,255,0.4)';outline:'none'}
        .ct-upload-browse{padding:'9px 20px';background:#0078d4;border:none;border-radius:'0 2px 2px 0';color:#fff;font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap}
        .ct-cb-cell{width:44px;text-align:center}
        .ct-cb2{width:15px;height:15px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;margin:0 auto;flex-shrink:0}
        .ct-cb2.on{background:#0078d4;border-color:#0078d4}
        .ct-cb2.half{background:rgba(0,120,212,0.3);border-color:#0078d4}
        .ct-selbar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,120,212,0.07);border:1px solid rgba(0,120,212,0.18);border-radius:8px;margin-bottom:12px;animation:ct-sl 0.2s ease}
        .ct-selbar-txt{font-size:13px;color:#4da6ff;font-weight:500;flex:1}
        .ct-action-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:4px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;transition:all 0.15s}
        .ct-action-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .ct-action-btn.red{border-color:rgba(239,68,68,0.22);background:rgba(239,68,68,0.07);color:#ef4444}
        .ct-action-btn.red:hover{background:rgba(239,68,68,0.15)}
        .ct-row-menu{position:relative}
        .ct-row-dd{position:absolute;right:0;top:calc(100% + 4px);background:#1c2434;border:1px solid rgba(255,255,255,0.1);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:50;min-width:180px;overflow:hidden}
        .ct-row-ddi{display:flex;align-items:center;gap:9px;padding:9px 14px;font-size:13px;color:rgba(255,255,255,0.65);cursor:pointer;transition:background 0.1s;border:none;background:none;font-family:'Inter',sans-serif;width:100%;text-align:left}
        .ct-row-ddi:hover{background:rgba(255,255,255,0.05);color:#e6edf3}
        .ct-row-ddi.red:hover{background:rgba(239,68,68,0.08);color:#ef4444}
        .ct-col-panel{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;display:flex;justify-content:flex-end}
        .ct-col-panel-inner{width:300px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:ct-sl 0.2s ease}
      `}</style>

      <div className="ct-page">
        {/* Breadcrumb */}
        <div className="ct-bc">
          <span onClick={()=>navigate('/agence')}>Accueil</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Contacts</span>
        </div>

        {/* Header */}
        <div className="ct-head">
          <div className="ct-title">Contacts</div>
          <div className="ct-mode">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
            </svg>
            Activer le mode lumineux
          </div>
        </div>

        <div className="ct-desc">
          Les contacts sont des personnes externes à votre organisation (partenaires, fournisseurs, prestataires) que vous souhaitez rendre accessibles à tous vos collaborateurs.<br/>
          Toutes les personnes répertoriées ici sont disponibles dans l'annuaire de <strong style={{color:'rgba(255,255,255,0.7)'}}>Imoloc</strong> et peuvent être associées à vos biens, baux et communications.
        </div>

        {/* Toolbar */}
        <div className="ct-toolbar">
          <button className="ct-tbtn" onClick={()=>setShowAddPanel(true)}>
            <svg width="14" height="14" fill="none" stroke="#0078d4" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Ajouter un contact
            <span className="ct-tbtn-tooltip">Ajouter un contact (Maj+A+C)</span>
          </button>
          <button className="ct-tbtn" onClick={()=>setShowBulkPanel(true)}>
            <svg width="14" height="14" fill="none" stroke="#0078d4" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197"/></svg>
            Ajouter plusieurs contacts
          </button>
          <button className="ct-tbtn" onClick={()=>{
            if (!contacts.length) return toast('Aucun contact à exporter',{icon:'ℹ️'})
            const csv = ['Nom,Email,Entreprise,Tel Bureau,Tel Mobile',...contacts.map(c=>`${c.display},${c.email},${c.entreprise||''},${c.tel_bureau||''},${c.tel_mobile||''}`)].join('\n')
            const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='contacts.csv'; a.click()
            toast.success('Contacts exportés !')
          }}>
            <svg width="14" height="14" fill="none" stroke="#0078d4" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
            Exporter des contacts
          </button>
          <button className="ct-tbtn">
            <svg width="14" height="14" fill="none" stroke="#0078d4" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
            Actualiser
          </button>

          <div className="ct-search-wrap">
            <div className="ct-search">
              <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans la liste de contacts..."/>
            </div>
            <button className="ct-filter-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"/></svg>
            </button>
          </div>
        </div>

        {/* Barre sélection */}
        {selected.length>0&&(
          <div className="ct-selbar">
            <span className="ct-selbar-txt">{selected.length} contact{selected.length>1?'s':''} sélectionné{selected.length>1?'s':''}</span>
            <button className="ct-action-btn" onClick={()=>{
              const data = contacts.filter(c=>selected.includes(c.id))
              const csv = ['NomAffichage,Email,Entreprise,TelBureau,TelMobile',...data.map(c=>`${c.display},${c.email},${c.entreprise||''},${c.tel_bureau||''},${c.tel_mobile||''}`)].join('\n')
              const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='contacts_selection.csv'; a.click()
              toast.success('Exporté !')
            }}>📥 Exporter</button>
            <button className="ct-action-btn red" onClick={deleteSelected}>🗑️ Supprimer ({selected.length})</button>
            <button onClick={()=>setSelected([])} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:20,padding:'0 4px',lineHeight:1}}>×</button>
          </div>
        )}

        {/* Table */}
        <div className="ct-table-wrap">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.02)'}}>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>
              {filtered.length} contact{filtered.length>1?'s':''}
            </span>
            <button className="ct-action-btn" style={{padding:'4px 10px',fontSize:12}} onClick={()=>setShowColsPanel(true)}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"/></svg>
              Choisir les colonnes
            </button>
          </div>
          <table className="ct-table">
            <thead>
              <tr>
                <th className="ct-cb-cell">
                  <div className={`ct-cb2 ${selected.length===filtered.length&&filtered.length>0?'on':selected.length>0?'half':''}`} onClick={toggleAll}>
                    {selected.length===filtered.length&&filtered.length>0&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    {selected.length>0&&selected.length<filtered.length&&<div style={{width:7,height:2,background:'#fff',borderRadius:1}}/>}
                  </div>
                </th>
                {ALL_COLS.filter(c=>visibleCols.includes(c.key)).map((c,i)=>(
                  <th key={i}>{c.label}</th>
                ))}
                <th/>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={ALL_COLS.length+2} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement des contacts...</td></tr>
              ) : filtered.length===0 ? (
                <tr><td colSpan={ALL_COLS.length+2}>
                  <div className="ct-empty">
                    <div className="ct-empty-title">Cette page est vide</div>
                    <div style={{fontSize:13.5}}>Ajoutez votre premier contact pour le voir dans cette liste</div>
                    <button className="ct-add-btn" style={{marginTop:16}} onClick={()=>setShowAddPanel(true)}>+ Ajouter un contact</button>
                  </div>
                </td></tr>
              ) : filtered.map((c,i)=>{
                const isSel = selected.includes(c.id)
                return (
                  <tr key={i} style={{background:isSel?'rgba(0,120,212,0.05)':'transparent'}}>
                    <td className="ct-cb-cell">
                      <div className={`ct-cb2 ${isSel?'on':''}`} onClick={()=>toggleSelect(c.id)}>
                        {isSel&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                      </div>
                    </td>
                    {visibleCols.includes('display')&&<td style={{color:'#e6edf3',fontWeight:500}}>{c.display}</td>}
                    {visibleCols.includes('email')&&<td>{c.email}</td>}
                    {visibleCols.includes('entreprise')&&<td>{c.entreprise||'—'}</td>}
                    {visibleCols.includes('tel_bureau')&&<td>{c.tel_bureau||'—'}</td>}
                    {visibleCols.includes('tel_mobile')&&<td>{c.tel_mobile||'—'}</td>}
                    {visibleCols.includes('titre')&&<td>{c.titre||'—'}</td>}
                    {visibleCols.includes('ville')&&<td>{c.ville||'—'}</td>}
                    {visibleCols.includes('pays')&&<td>{c.pays||'—'}</td>}
                    {visibleCols.includes('synch')&&(
                      <td><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12.5}}><span style={{width:7,height:7,borderRadius:'50%',background:'#00c896'}}/>Actif</span></td>
                    )}
                    <td style={{position:'relative'}}>
                      <button className="ct-action-btn" style={{padding:'4px 8px',fontSize:13}} onClick={e=>{e.stopPropagation();setRowMenu(rowMenu===c.id?null:c.id)}}>···</button>
                      {rowMenu===c.id&&(
                        <div className="ct-row-dd">
                          <button className="ct-row-ddi" onClick={()=>{setRowMenu(null);toast('Fonctionnalité à venir',{icon:'ℹ️'})}}>✏️ Modifier</button>
                          <button className="ct-row-ddi" onClick={()=>{setRowMenu(null);toast('Fonctionnalité à venir',{icon:'ℹ️'})}}>📧 Envoyer un email</button>
                          <div style={{height:'1px',background:'rgba(255,255,255,0.07)'}}/>
                          <button className="ct-row-ddi red" onClick={()=>{ deleteOne(c.id); setRowMenu(null) }}>🗑️ Supprimer</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ PANEL AJOUTER UN CONTACT ══ */}
      {showAddPanel&&(
        <div className="ct-ov" onClick={e=>e.target===e.currentTarget&&setShowAddPanel(false)}>
          <div className="ct-panel">
            <div className="ct-panel-head">
              <span className="ct-panel-title">Ajouter un contact</span>
              <button className="ct-panel-cls" onClick={()=>setShowAddPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="ct-panel-body">
              <form id="ct-add-form" onSubmit={handleAdd}>
                {/* Prénom / Nom */}
                <div className="ct-grid2">
                  <div>
                    <label className="ct-lbl">Prénom</label>
                    <input className="ct-input" value={form.prenom} onChange={e=>setF('prenom',e.target.value)} placeholder="Jean"
                      onInput={e=>{ if(!form.display) setF('display', `${e.target.value} ${form.nom}`.trim()) }}/>
                  </div>
                  <div>
                    <label className="ct-lbl">Nom</label>
                    <input className="ct-input" value={form.nom} onChange={e=>setF('nom',e.target.value)} placeholder="Dupont"
                      onInput={e=>{ if(!form.display) setF('display', `${form.prenom} ${e.target.value}`.trim()) }}/>
                  </div>
                </div>

                {/* Nom d'affichage */}
                <div className="ct-field">
                  <label className="ct-lbl">Nom d'affichage</label>
                  <div className="ct-input-wrap">
                    <input className="ct-input" required value={form.display} onChange={e=>setF('display',e.target.value)} placeholder="Jean Dupont" autoFocus/>
                    <span className="ct-req">*</span>
                  </div>
                </div>

                {/* Email */}
                <div className="ct-field">
                  <label className="ct-lbl">E-mail</label>
                  <div className="ct-input-wrap">
                    <input className="ct-input" type="email" required value={form.email} onChange={e=>setF('email',e.target.value)} placeholder="jean.dupont@exemple.com"/>
                    <span className="ct-req">*</span>
                  </div>
                </div>

                {/* Masquer */}
                <div className="ct-check-row" onClick={()=>setF('masquer',!form.masquer)}>
                  <div className={`ct-cb ${form.masquer?'on':''}`}>
                    {form.masquer&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.6)'}}>Ne pas afficher dans l'annuaire de l'organisation</span>
                </div>

                {/* Accordéon Informations de profil */}
                <div className="ct-accord-head" onClick={()=>setProfilOpen(o=>!o)}>
                  <span className="ct-accord-lbl">Informations de profil</span>
                  <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                    {profilOpen
                      ? <path strokeLinecap="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                      : <path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>}
                  </svg>
                </div>
                {profilOpen&&(
                  <>
                    <div className="ct-field" style={{marginTop:12}}>
                      <label className="ct-lbl">Entreprise</label>
                      <input className="ct-input" value={form.entreprise} onChange={e=>setF('entreprise',e.target.value)} placeholder="Nom de l'entreprise"/>
                    </div>
                    <div className="ct-grid2">
                      <div>
                        <label className="ct-lbl">Téléphone de bureau</label>
                        <input className="ct-input" value={form.tel_bureau} onChange={e=>setF('tel_bureau',e.target.value)} placeholder="+229 XX XX XX XX"/>
                      </div>
                      <div>
                        <label className="ct-lbl">Téléphone mobile</label>
                        <input className="ct-input" value={form.tel_mobile} onChange={e=>setF('tel_mobile',e.target.value)} placeholder="+229 XX XX XX XX"/>
                      </div>
                    </div>
                    {[
                      {k:'fax',l:'Numéro de télécopie',p:'Fax...'},
                      {k:'titre',l:'Titre',p:'Directeur, Manager...'},
                      {k:'site',l:'Site web',p:'https://exemple.com'},
                      {k:'adresse',l:'Adresse postale',p:'123 rue...'},
                      {k:'ville',l:'Ville',p:'Cotonou'},
                      {k:'departement',l:'Département ou région',p:'Littoral'},
                      {k:'code_postal',l:'Code postal',p:'00000'},
                    ].map(({k,l,p})=>(
                      <div key={k} className="ct-field">
                        <label className="ct-lbl">{l}</label>
                        <input className="ct-input" value={form[k]} onChange={e=>setF(k,e.target.value)} placeholder={p}/>
                      </div>
                    ))}
                    <div className="ct-field">
                      <label className="ct-lbl">Pays ou région</label>
                      <select className="ct-input" style={{colorScheme:'dark'}} value={form.pays} onChange={e=>setF('pays',e.target.value)}>
                        {['Bénin','Togo','Côte d\'Ivoire','Sénégal','Cameroun','Mali','France','Belgique'].map(p=>(
                          <option key={p} style={{background:'#242424',color:'#e6edf3'}}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Accordéon Infos courrier */}
                <div className="ct-accord-head" onClick={()=>setCourrierOpen(o=>!o)}>
                  <span className="ct-accord-lbl">Infos courrier</span>
                  <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                    {courrierOpen
                      ? <path strokeLinecap="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                      : <path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>}
                  </svg>
                </div>
                {courrierOpen&&(
                  <div style={{paddingTop:12}}>
                    <div className="ct-field">
                      <label className="ct-lbl">Adresse de courrier externe</label>
                      <input className="ct-input" placeholder="adresse@externe.com"/>
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="ct-panel-foot">
              <button form="ct-add-form" type="submit" className="ct-add-btn" disabled={!canAdd||adding}>
                {adding?'Ajout...':'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL AJOUTER PLUSIEURS CONTACTS ══ */}
      {showBulkPanel&&(
        <div className="ct-ov" onClick={e=>e.target===e.currentTarget&&setShowBulkPanel(false)}>
          <div className={`ct-panel ct-panel-wide`}>
            <div className="ct-panel-head">
              <span className="ct-panel-title">Ajouter plusieurs contacts</span>
              <button className="ct-panel-cls" onClick={()=>setShowBulkPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="ct-panel-body">
              {/* Section 1 - Téléchargement modèle */}
              <div style={{marginBottom:28}}>
                <div className="ct-section-title">Télécharger un fichier CSV avec des informations de contact</div>
                <div className="ct-section-desc">
                  Téléchargez et enregistrez l'un des fichiers ci-dessous. Ouvrez le fichier dans Excel, remplissez les informations de vos contacts, enregistrez, puis chargez-le ci-dessous.
                </div>
                <a className="ct-link" onClick={()=>{
                  const csv = 'NomAffichage,Email,Entreprise,TelBureau,TelMobile,Titre,Ville,Pays\n'
                  const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='contacts_modele_vide.csv'; a.click()
                  toast.success('Modèle téléchargé !')
                }}>Télécharger un fichier CSV comportant des en-têtes uniquement</a>
                <a className="ct-link" onClick={()=>{
                  const csv = 'NomAffichage,Email,Entreprise,TelBureau,TelMobile,Titre,Ville,Pays\nJean Dupont,jean@exemple.com,ACME Corp,+229 00 00 00 00,+229 00 00 00 01,Directeur,Cotonou,Bénin\n'
                  const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='contacts_modele_exemple.csv'; a.click()
                  toast.success('Modèle avec exemples téléchargé !')
                }}>Télécharger un fichier CSV avec des en-têtes et des exemples d'informations de contact</a>
              </div>

              {/* Section 2 - Règles */}
              <div style={{marginBottom:28}}>
                <div className="ct-section-title">Éviter les erreurs courantes</div>
                <ul className="ct-rules">
                  <li>Vous pouvez charger jusqu'à <strong style={{color:'rgba(255,255,255,0.7)'}}>40 contacts</strong> par fichier CSV.</li>
                  <li>Chaque contact doit avoir une adresse e-mail et un nom d'affichage uniques.</li>
                  <li>Les adresses e-mail ne peuvent utiliser que des lettres, des chiffres et ces caractères : ! # $ % * + - / = ? ^ _ | ~ . {'{}'}</li>
                  <li>Les adresses e-mail ne peuvent pas contenir de caractères accentués.</li>
                  <li>Les adresses e-mail ne peuvent pas commencer ou se terminer par un point (.).</li>
                  <li>La partie avant le symbole @ ne peut pas comporter plus de <strong style={{color:'rgba(255,255,255,0.7)'}}>64 caractères</strong>.</li>
                  <li>Enregistrer en tant que fichier CSV (délimité par des virgules) avec <strong style={{color:'rgba(255,255,255,0.7)'}}>8 colonnes</strong>.</li>
                </ul>
              </div>

              {/* Section 3 - Upload */}
              <div>
                <div className="ct-section-title">Télécharger un fichier CSV avec vos informations de contact</div>
                <div style={{display:'flex',gap:0,marginTop:10}}>
                  <div style={{flex:1,padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.12)',borderRight:'none',borderRadius:'2px 0 0 2px',fontSize:13,color:csvFile?'#e6edf3':'rgba(255,255,255,0.3)'}}>
                    {csvFile?csvFile.name:'Aucun fichier sélectionné'}
                  </div>
                  <label style={{padding:'9px 20px',background:'#0078d4',border:'none',borderRadius:'0 2px 2px 0',color:'#fff',fontFamily:'Inter',fontSize:13.5,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',display:'flex',alignItems:'center'}}>
                    Parcourir
                    <input type="file" accept=".csv" style={{display:'none'}} onChange={async(e)=>{
                      const file = e.target.files[0]
                      if (!file) return
                      setCsvFile(file)
                      const text = await file.text()
                      const rows = text.split('\n').slice(1).filter(r=>r.trim()).map(r=>{
                        const [display,email,entreprise,tel_bureau,tel_mobile,titre,ville,pays] = r.split(',').map(v=>v.trim())
                        return {display,email,entreprise,tel_bureau,tel_mobile,titre,ville,pays,prenom:'',nom:'',fax:'',site:'',adresse:'',departement:'',code_postal:'',masquer:false}
                      }).filter(r=>r.display&&r.email)
                      if (rows.length>40) return toast.error('Maximum 40 contacts par fichier')
                      setContacts(prev=>[...prev,...rows])
                      toast.success(`${rows.length} contact(s) importé(s) !`)
                      setShowBulkPanel(false)
                      setCsvFile(null)
                    }}/>
                  </label>
                </div>
              </div>
            </div>
            <div className="ct-panel-foot">
              <button className="ct-add-btn" disabled={!csvFile} onClick={()=>setShowBulkPanel(false)}>
                Ajouter des contacts
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Panel colonnes */}
      {showColsPanel&&(
        <div className="ct-col-panel" onClick={e=>e.target===e.currentTarget&&setShowColsPanel(false)}>
          <div className="ct-col-panel-inner">
            <div style={{padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <span style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>Choisir les colonnes</span>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:4,display:'flex'}} onClick={()=>setShowColsPanel(false)}>
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'14px 20px'}}>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16,lineHeight:1.6}}>
                Sélectionnez les colonnes à afficher dans le tableau des contacts.
              </div>
              {ALL_COLS.map(col=>(
                <div key={col.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:col.key==='display'?'not-allowed':'pointer'}}
                  onClick={()=>{
                    if(col.key==='display') return
                    setVisibleCols(c=>c.includes(col.key)?c.filter(x=>x!==col.key):[...c,col.key])
                  }}>
                  <span style={{fontSize:13.5,color:col.key==='display'?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.7)'}}>{col.label}</span>
                  <div style={{width:17,height:17,borderRadius:3,border:'1.5px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',background:visibleCols.includes(col.key)?'#0078d4':'transparent',borderColor:visibleCols.includes(col.key)?'#0078d4':'rgba(255,255,255,0.2)',opacity:col.key==='display'?0.4:1}}>
                    {visibleCols.includes(col.key)&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10}}>
              <button onClick={()=>setVisibleCols(['display','email','entreprise','tel_bureau','tel_mobile','synch'])} style={{flex:1,padding:'9px',borderRadius:5,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)',fontSize:13.5,fontWeight:600,cursor:'pointer',fontFamily:'Inter'}}>Rétablir</button>
              <button onClick={()=>setShowColsPanel(false)} style={{flex:1,padding:'9px',borderRadius:5,background:'#0078d4',border:'none',color:'#fff',fontSize:13.5,fontWeight:600,cursor:'pointer',fontFamily:'Inter'}}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
