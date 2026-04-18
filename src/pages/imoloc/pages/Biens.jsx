import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────
const TYPES = ['Appartement','Villa','Studio','Duplex','Maison','Bureau','Local commercial','Terrain','Entrepot','Parking']
const TYPE_ICONS = {
  'Appartement':'🏠','Villa':'🏡','Studio':'🛋️','Duplex':'🏘️',
  'Maison':'🏠','Bureau':'🏢','Local commercial':'🏪',
  'Terrain':'🌿','Entrepot':'🏭','Parking':'🅿️',
}
const STATUT_CFG = {
  // Valeurs de l'enum statut_bien en base de donnees
  disponible:  { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Disponible',  dot:'#00c896' },
  loue:        { color:'#0078d4', bg:'rgba(0,120,212,0.12)',  label:'Loue',        dot:'#0078d4' },
  maintenance: { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'Maintenance', dot:'#f59e0b' },
  reserve:     { color:'#6c63ff', bg:'rgba(108,99,255,0.12)', label:'Reserve',     dot:'#6c63ff' },
  indisponible:{ color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'Indisponible',dot:'#ef4444' },
  // Aliases legacy (agence/pages/Biens.jsx historique)
  libre:       { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Libre',       dot:'#00c896' },
  occupe:      { color:'#0078d4', bg:'rgba(0,120,212,0.12)',  label:'Occupe',      dot:'#0078d4' },
}

const ALL_COLS = [
  { key:'displayName',   label:'Bien',          checked:true,  disabled:true },
  { key:'adresse',       label:'Adresse',        checked:true  },
  { key:'superficie',    label:'Superficie',     checked:true  },
  { key:'loyer',         label:'Loyer mensuel',  checked:true  },
  { key:'statut',        label:'Statut',         checked:true  },
  { key:'proprietaire',  label:'Proprietaire',   checked:true  },
  { key:'nb_baux',       label:'Baux actifs',    checked:false },
  { key:'ville',         label:'Ville',          checked:false },
  { key:'created_at',    label:'Ajoute le',      checked:false },
]
const DEFAULT_COLS = ALL_COLS.filter(c=>c.checked).map(c=>c.key)

const STEPS = [
  { n:1, label:'Informations', desc:'Nom, type, statut' },
  { n:2, label:'Localisation',  desc:'Adresse et finances' },
  { n:3, label:'Proprietaire',  desc:'Associer un proprietaire' },
  { n:4, label:'Recapitulatif', desc:'Verification finale' },
]

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '—'

// ─── Composant principal ──────────────────────────────────
export default function ImolocBiens() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuthStore()

  const [agence, setAgence]         = useState(null)
  const [biens, setBiens]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [selected, setSelected]     = useState([])
  const [viewMode, setViewMode]     = useState('normal')
  const [cols, setCols]             = useState(DEFAULT_COLS)
  const [colWidths, setColWidths]   = useState({})
  const [showColsPanel, setShowColsPanel] = useState(false)
  const [showAddPanel, setShowAddPanel]   = useState(false)
  const [selectedBien, setSelectedBien]   = useState(null)
  const [detailTab, setDetailTab]   = useState('infos')
  const [step, setStep]             = useState(1)
  const [saving, setSaving]         = useState(false)

  // Pour l'etape 3
  const [proprietaires, setProprietaires] = useState([])
  const [propSearch, setPropSearch]       = useState('')
  const [selectedProp, setSelectedProp]   = useState(null)

  const [form, setForm] = useState({
    nom:'', type:'Appartement', statut:'disponible',
    adresse:'', ville:'Cotonou', quartier:'',
    superficie:'', loyer:'',
    nb_pieces:'', nb_chambres:'', nb_sdb:'',
    description:'',
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const resizingCol = useRef(null)
  const startX      = useRef(0)
  const startW      = useRef(0)

  // Lire le filtre statut depuis l'URL (/biens/libres, /biens/occupes, etc.)
  useEffect(() => {
    const seg = location.pathname.split('/').pop()
    if (['libres','occupes','maintenance'].includes(seg)) {
      const map = { libres:'libre', occupes:'occupe', maintenance:'maintenance' }
      setFilterStatut(map[seg])
    } else {
      setFilterStatut('tous')
    }
  }, [location.pathname])

  useEffect(() => { initData() }, [])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList }   = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (!ag?.id) return

      // Biens
      const { data:biensData } = await supabase
        .from('biens')
        .select('*')
        .eq('agence_id', ag.id)
        .order('created_at', { ascending: false })

      // Proprietaires lies a l'agence
      // agence_proprietaires.proprietaire_id -> proprietaires.id (table separee)
      const { data:linksData } = await supabase
        .from('agence_proprietaires')
        .select('proprietaire_id, proprietaires(id, nom, prenom, telephone, email, ville)')
        .eq('agence_id', ag.id)
        .eq('statut', 'actif')
      const propsList = (linksData||[]).map(l => l.proprietaires).filter(Boolean)
      setProprietaires(propsList)

      // Map par proprietaires.id (= biens.proprietaire_id)
      const propsMap = {}
      propsList.forEach(p => { propsMap[p.id] = p })

      // Baux actifs par bien (enum statut_bail: 'actif')
      const { data:bauxData } = await supabase
        .from('baux')
        .select('bien_id')
        .eq('agence_id', ag.id)
        .eq('statut', 'actif')
      const bauxCount = {}
      ;(bauxData||[]).forEach(b => { bauxCount[b.bien_id] = (bauxCount[b.bien_id]||0)+1 })

      setBiens((biensData||[]).map(b=>({
        ...b,
        proprietaire: propsMap[b.proprietaire_id] || null,
        nb_baux: bauxCount[b.id] || 0,
      })))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const startResize = useCallback((e, colKey) => {
    e.preventDefault()
    resizingCol.current = colKey
    startX.current = e.clientX
    startW.current = colWidths[colKey] || 160
    const onMove = (ev) => {
      const diff = ev.clientX - startX.current
      setColWidths(prev=>({...prev,[resizingCol.current]:Math.max(80,startW.current+diff)}))
    }
    const onUp = () => {
      resizingCol.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colWidths])

  const createBien = async () => {
    if (!agence?.id || !form.nom) return
    setSaving(true)
    try {
      const { error } = await supabase.from('biens').insert({
        nom:           form.nom,
        type:          form.type,
        statut:        form.statut,
        adresse:       form.adresse     || null,
        ville:         form.ville       || null,
        quartier:      form.quartier    || null,
        superficie:    form.superficie  ? Number(form.superficie)  : null,
        loyer:         form.loyer       ? Number(form.loyer)       : null,
        nombre_pieces:      form.nb_pieces   ? Number(form.nb_pieces)   : null,
        nombre_chambres:    form.nb_chambres ? Number(form.nb_chambres) : null,
        nombre_salles_bain: form.nb_sdb      ? Number(form.nb_sdb)      : null,
        description:   form.description || null,
        agence_id:     agence.id,
        proprietaire_id: selectedProp?.id || null,
      })
      if (error) throw error
      toast.success(form.nom + ' ajoute avec succes !')
      setShowAddPanel(false)
      resetForm()
      initData()
    } catch(e) { toast.error(e.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const deleteBiens = async (ids) => {
    if (!confirm('Supprimer ' + ids.length + ' bien(s) ? Cette action est irreversible.')) return
    const { error } = await supabase.from('biens').delete().in('id', ids)
    if (error) { toast.error(error.message); return }
    toast.success(ids.length + ' bien(s) supprime(s)')
    setSelected([])
    initData()
  }

  const resetForm = () => {
    setStep(1)
    setSelectedProp(null)
    setPropSearch('')
    setForm({ nom:'', type:'Appartement', statut:'disponible', adresse:'', ville:'Cotonou', quartier:'', superficie:'', loyer:'', nb_pieces:'', nb_chambres:'', nb_sdb:'', description:'' })
  }

  // Filtrages
  const filtered = biens.filter(b => {
    const matchSearch  = `${b.nom} ${b.adresse||''} ${b.ville||''} ${b.type||''}`.toLowerCase().includes(search.toLowerCase())
    const matchStatut  = filterStatut === 'tous' || b.statut === filterStatut
    return matchSearch && matchStatut
  })
  const filteredProps = proprietaires.filter(p =>
    `${p.prenom||''} ${p.nom||''} ${p.telephone||''}`.toLowerCase().includes(propSearch.toLowerCase())
  )

  const toggleSelect = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll    = () => setSelected(s=>s.length===filtered.length?[]:filtered.map(b=>b.id))
  const rowH         = viewMode==='compact' ? '40px' : '52px'

  const stats = {
    total:       biens.length,
    // Compatibilite double enum: disponible/libre = vacant, loue/occupe = occupe
    libres:      biens.filter(b=>b.statut==='disponible'||b.statut==='libre').length,
    occupes:     biens.filter(b=>b.statut==='loue'||b.statut==='occupe').length,
    maintenance: biens.filter(b=>b.statut==='maintenance').length,
    revenus:     biens.filter(b=>b.statut==='loue'||b.statut==='occupe').reduce((a,b)=>a+(b.loyer||b.loyer_mensuel||0),0),
  }

  const exportCSV = () => {
    const data = selected.length>0 ? biens.filter(b=>selected.includes(b.id)) : filtered
    const csv  = ['Nom,Type,Statut,Adresse,Ville,Superficie,Loyer'].concat(
      data.map(b=>`${b.nom},${b.type},${b.statut},${b.adresse||''},${b.ville||''},${b.superficie||''},${b.loyer||''}`)
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = 'biens.csv'; a.click()
    toast.success(data.length + ' bien(s) exporte(s)')
  }

  const StatutBadge = ({ statut, size=12 }) => {
    const cfg = STATUT_CFG[statut] || STATUT_CFG.libre
    return (
      <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 9px',borderRadius:'100px',fontSize:size,fontWeight:600,background:cfg.bg,color:cfg.color}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:cfg.dot,flexShrink:0}}/>
        {cfg.label}
      </span>
    )
  }

  return (
    <>
      <style>{`
        .pb-page{animation:pb-in 0.2s ease;min-height:100%}
        @keyframes pb-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .pb-bc{display:flex;align-items:center;gap:7px;font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .pb-bc span{cursor:pointer;transition:color 0.1s}.pb-bc span:hover{color:#4da6ff}
        .pb-title{font-size:26px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:4px}
        .pb-sub{font-size:13.5px;color:rgba(255,255,255,0.4);margin-bottom:22px}
        .pb-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
        .pb-stat{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px}
        .pb-stat-val{font-size:22px;font-weight:800;letter-spacing:-0.02em;margin-bottom:2px}
        .pb-stat-lbl{font-size:11.5px;color:rgba(255,255,255,0.35)}
        .pb-toolbar{display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .pb-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .pb-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .pb-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.pb-btn-p:hover:not(:disabled){background:#006cc1}
        .pb-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
        .pb-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
        .pb-sep{width:1px;height:22px;background:rgba(255,255,255,0.08)}
        .pb-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto;transition:border-color 0.15s}
        .pb-search:focus-within{border-color:rgba(0,120,212,0.4)}
        .pb-search input{background:none;border:none;outline:none;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;width:220px}
        .pb-search input::placeholder{color:rgba(255,255,255,0.25)}
        .pb-ftabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap}
        .pb-ftab{padding:5px 14px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;transition:all 0.15s}
        .pb-ftab.active{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .pb-selbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(0,120,212,0.07);border:1px solid rgba(0,120,212,0.18);border-radius:8px;margin-bottom:12px}
        .pb-tw{border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden}
        .pb-thead-bar{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .pb-table{width:100%;border-collapse:collapse;table-layout:fixed}
        .pb-table th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);padding:9px 14px;text-align:left;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07);white-space:nowrap;position:relative;user-select:none;overflow:hidden}
        .pb-table th:first-child{width:44px;text-align:center}
        .pb-table td{padding:0 14px;font-size:13px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pb-table td:first-child{text-align:center}
        .pb-table tr{transition:background 0.08s;height:${rowH}}
        .pb-table tr:hover td{background:rgba(255,255,255,0.025);cursor:pointer}
        .pb-table tr.sel td{background:rgba(0,120,212,0.06)}
        .pb-table tr:last-child td{border-bottom:none}
        .pb-rh{position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;background:transparent}
        .pb-rh:hover{background:rgba(0,120,212,0.4)}
        .pb-cb{width:15px;height:15px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;margin:0 auto}
        .pb-cb.on{background:#0078d4;border-color:#0078d4}
        .pb-cb.half{background:rgba(0,120,212,0.3);border-color:#0078d4}
        .pb-empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3)}
        .pb-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:rgba(255,255,255,0.3)}
        .pb-vtog{display:flex;gap:2px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:5px;padding:3px}
        .pb-vbtn{background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:3px;color:rgba(255,255,255,0.4);transition:all 0.15s;font-size:12px;font-family:Inter,sans-serif;display:flex;align-items:center;gap:4px}
        .pb-vbtn.active{background:rgba(255,255,255,0.1);color:#e6edf3}
        .pb-type-ic{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08)}

        /* ─ Overlay / Panel ─ */
        .pb-ov{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;justify-content:flex-end}
        .pb-panel{background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:pb-sl 0.22s ease;height:100%;overflow:hidden}
        @keyframes pb-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .pb-ph{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .pb-ph-title{font-size:17px;font-weight:700;color:#e6edf3}
        .pb-cls{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .pb-cls:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .pb-pb{flex:1;overflow-y:auto;padding:24px 28px}
        .pb-pb::-webkit-scrollbar{width:4px}
        .pb-pb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .pb-pf{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .pb-pfb{flex:1;padding:11px;border-radius:5px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;transition:all 0.15s}
        .pb-pfb-b{background:#0078d4;color:#fff}.pb-pfb-b:hover{background:#006cc1}.pb-pfb-b:disabled{opacity:0.4;cursor:not-allowed}
        .pb-pfb-g{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}.pb-pfb-g:hover{background:rgba(255,255,255,0.09)}

        /* ─ Add Panel ─ */
        .pb-add-panel{width:min(780px,96vw)}
        .pb-add-body{display:flex;flex:1;overflow:hidden}
        .pb-steps-v{width:190px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.07);padding:20px 0;display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,0.15)}
        .pb-step-v{display:flex;align-items:flex-start;gap:12px;padding:12px 20px;cursor:pointer;transition:background 0.15s;border-left:3px solid transparent;position:relative}
        .pb-step-v:hover{background:rgba(255,255,255,0.04)}
        .pb-step-v.active{background:rgba(0,120,212,0.07);border-left-color:#0078d4}
        .pb-step-v.done{border-left-color:#00c896}
        .pb-step-v-n{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);margin-top:1px}
        .pb-step-v-n.active{background:#0078d4;color:#fff}
        .pb-step-v-n.done{background:#00c896;color:#fff}
        .pb-step-v-lbl{font-size:13px;font-weight:600;color:rgba(255,255,255,0.5)}
        .pb-step-v.active .pb-step-v-lbl{color:#e6edf3}
        .pb-step-v.done .pb-step-v-lbl{color:rgba(255,255,255,0.6)}
        .pb-step-v-desc{font-size:11.5px;color:rgba(255,255,255,0.25);margin-top:2px}
        .pb-step-content{flex:1;overflow-y:auto;padding:28px 32px}
        .pb-step-content::-webkit-scrollbar{width:4px}
        .pb-step-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        .pb-step-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:6px}
        .pb-step-sub{font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:24px;line-height:1.65}

        /* ─ Champs ─ */
        .pb-g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .pb-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px}
        .pb-field{margin-bottom:16px}
        .pb-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
        .pb-inp{width:100%;padding:9px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .pb-inp:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .pb-sec{font-size:11.5px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.09em;margin:22px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07)}

        /* ─ Type selector ─ */
        .pb-type-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:24px}
        .pb-type-item{padding:12px 6px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.15s;text-align:center}
        .pb-type-item:hover{border-color:rgba(0,120,212,0.3);background:rgba(0,120,212,0.05)}
        .pb-type-item.on{border-color:#0078d4;background:rgba(0,120,212,0.1)}
        .pb-type-ic-lg{font-size:24px;margin-bottom:5px}
        .pb-type-lbl{font-size:11.5px;color:rgba(255,255,255,0.55);font-weight:500}
        .pb-type-item.on .pb-type-lbl{color:#e6edf3}

        /* ─ Statut pills ─ */
        .pb-statut-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
        .pb-statut-pill{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.15s;font-size:13px;font-weight:500;color:rgba(255,255,255,0.5)}
        .pb-statut-pill:hover{border-color:rgba(255,255,255,0.18)}
        .pb-statut-pill.on{font-weight:600}

        /* ─ Proprietaire search ─ */
        .pb-prop-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:9px;border:1.5px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);margin-bottom:7px;cursor:pointer;transition:all 0.15s}
        .pb-prop-item:hover{border-color:rgba(0,120,212,0.25);background:rgba(0,120,212,0.04)}
        .pb-prop-item.on{border-color:#0078d4;background:rgba(0,120,212,0.08)}

        /* ─ Detail panel ─ */
        .pb-detail-panel{width:min(600px,96vw)}
        .pb-detail-head{padding:24px 28px 0;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .pb-detail-tabs{display:flex;margin-top:18px}
        .pb-detail-tab{padding:10px 18px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap}
        .pb-detail-tab:hover{color:rgba(255,255,255,0.75)}
        .pb-detail-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .pb-blk{display:flex;flex-direction:column;gap:3px;margin-bottom:22px}
        .pb-blk-lbl{font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:4px}
        .pb-blk-val{font-size:13.5px;color:rgba(255,255,255,0.5)}
        .pb-blk-link{font-size:13px;color:#0078d4;cursor:pointer;background:none;border:none;font-family:Inter,sans-serif;padding:0;margin-top:2px;display:inline}
        .pb-blk-link:hover{text-decoration:underline}
        .pb-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 2.5rem}
        .pb-divider{height:1px;background:rgba(255,255,255,0.07);margin:20px 0}

        /* ─ Cols panel ─ */
        .pb-cols-panel{width:320px}
        .pb-col-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .pb-col-cb{width:17px;height:17px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s}
        .pb-col-cb.on{background:#0078d4;border-color:#0078d4}

        @media(max-width:960px){.pb-stats{grid-template-columns:repeat(3,1fr)}.pb-g2{grid-template-columns:1fr}.pb-g3{grid-template-columns:1fr 1fr}.pb-type-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:700px){.pb-steps-v{display:none}.pb-stats{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="pb-page">
        {/* Breadcrumb */}
        <div className="pb-bc">
          <span onClick={()=>navigate('/imoloc')}>Centre Imoloc</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Biens immobiliers</span>
        </div>

        <div className="pb-title">Biens immobiliers</div>
        <div className="pb-sub">{biens.length} bien{biens.length!==1?'s':''} enregistre{biens.length!==1?'s':''} — {agence?.nom||'votre agence'}</div>

        {/* Stats */}
        <div className="pb-stats">
          {[
            {ic:'🏢',lbl:'Total',        val:stats.total,       col:'#e6edf3'},
            {ic:'🟢',lbl:'Libres',       val:stats.libres,      col:'#00c896'},
            {ic:'🔵',lbl:'Occupes',      val:stats.occupes,     col:'#0078d4'},
            {ic:'🟡',lbl:'Maintenance',  val:stats.maintenance, col:'#f59e0b'},
            {ic:'💰',lbl:'Revenus/mois', val:fmt(stats.revenus)+' FCFA', col:'#00c896', small:true},
          ].map((s,i)=>(
            <div key={i} className="pb-stat">
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                <span style={{fontSize:16}}>{s.ic}</span>
                <span className="pb-stat-lbl">{s.lbl}</span>
              </div>
              <div className="pb-stat-val" style={{color:s.col,fontSize:s.small?16:22}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="pb-toolbar">
          <button className="pb-btn pb-btn-p" onClick={()=>{resetForm();setShowAddPanel(true)}}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Ajouter un bien
          </button>
          <button className="pb-btn" onClick={initData}>🔄</button>
          <div className="pb-sep"/>
          <button className="pb-btn pb-btn-g" onClick={exportCSV}>
            📥 Exporter{selected.length>0&&` (${selected.length})`}
          </button>
          {selected.length>0&&(
            <button className="pb-btn pb-btn-r" onClick={()=>deleteBiens(selected)}>
              🗑️ Supprimer ({selected.length})
            </button>
          )}
          <div className="pb-search">
            <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un bien..."/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>×</button>}
          </div>
        </div>

        {/* Filtres statut — aligne avec enum statut_bien */}
        <div className="pb-ftabs">
          {[
            ['tous',        'Tous'],
            ['disponible',  'Disponibles'],
            ['loue',        'Loues'],
            ['maintenance', 'Maintenance'],
            ['reserve',     'Reserves'],
            ['indisponible','Indisponibles'],
          ].map(([v,l])=>(
            <button key={v} className={`pb-ftab ${filterStatut===v?'active':''}`} onClick={()=>setFilterStatut(v)}>{l}</button>
          ))}
        </div>

        {selected.length>0&&(
          <div className="pb-selbar">
            <span style={{fontSize:13,color:'#4da6ff',fontWeight:500,flex:1}}>{selected.length} bien{selected.length>1?'s':''} selectionne{selected.length>1?'s':''}</span>
            <button onClick={()=>setSelected([])} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:20,padding:'0 4px'}}>×</button>
          </div>
        )}

        {/* Table */}
        <div className="pb-tw">
          <div className="pb-thead-bar">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{filtered.length} bien{filtered.length!==1?'s':''}</span>
              <div className="pb-vtog">
                {[['normal','Normal'],['compact','Compact']].map(([v,l])=>(
                  <button key={v} className={`pb-vbtn ${viewMode===v?'active':''}`} onClick={()=>setViewMode(v)}>{l}</button>
                ))}
              </div>
            </div>
            <button className="pb-btn" style={{padding:'5px 12px',fontSize:12}} onClick={()=>setShowColsPanel(true)}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"/></svg>
              Colonnes
            </button>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="pb-table">
              <thead>
                <tr>
                  <th style={{width:44}}>
                    <div className={`pb-cb ${selected.length===filtered.length&&filtered.length>0?'on':selected.length>0?'half':''}`} onClick={toggleAll}>
                      {selected.length===filtered.length&&filtered.length>0&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                      {selected.length>0&&selected.length<filtered.length&&<div style={{width:8,height:2,background:'#fff',borderRadius:1}}/>}
                    </div>
                  </th>
                  <th style={{width:colWidths['displayName']||260,minWidth:160}}>Bien<div className="pb-rh" onMouseDown={e=>startResize(e,'displayName')}/></th>
                  {cols.includes('adresse')&&<th style={{width:colWidths['adresse']||180}}>Adresse<div className="pb-rh" onMouseDown={e=>startResize(e,'adresse')}/></th>}
                  {cols.includes('superficie')&&<th style={{width:colWidths['superficie']||100}}>Superficie<div className="pb-rh" onMouseDown={e=>startResize(e,'superficie')}/></th>}
                  {cols.includes('loyer')&&<th style={{width:colWidths['loyer']||140}}>Loyer/mois<div className="pb-rh" onMouseDown={e=>startResize(e,'loyer')}/></th>}
                  {cols.includes('statut')&&<th style={{width:colWidths['statut']||130}}>Statut<div className="pb-rh" onMouseDown={e=>startResize(e,'statut')}/></th>}
                  {cols.includes('proprietaire')&&<th style={{width:colWidths['proprietaire']||160}}>Proprietaire<div className="pb-rh" onMouseDown={e=>startResize(e,'proprietaire')}/></th>}
                  {cols.includes('nb_baux')&&<th style={{width:colWidths['nb_baux']||90}}>Baux<div className="pb-rh" onMouseDown={e=>startResize(e,'nb_baux')}/></th>}
                  {cols.includes('ville')&&<th style={{width:colWidths['ville']||110}}>Ville<div className="pb-rh" onMouseDown={e=>startResize(e,'ville')}/></th>}
                  {cols.includes('created_at')&&<th style={{width:colWidths['created_at']||120}}>Ajoute le<div className="pb-rh" onMouseDown={e=>startResize(e,'created_at')}/></th>}
                  <th style={{width:50}}/>
                </tr>
              </thead>
              <tbody>
                {loading?(
                  <tr><td colSpan={20} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</td></tr>
                ):filtered.length===0?(
                  <tr><td colSpan={20}>
                    <div className="pb-empty">
                      <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>🏠</div>
                      <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>
                        {search?`Aucun resultat pour "${search}"`:filterStatut!=='tous'?`Aucun bien "${filterStatut}"`:' Aucun bien enregistre'}
                      </div>
                      {!search&&filterStatut==='tous'&&(
                        <button className="pb-btn pb-btn-p" style={{margin:'0 auto'}} onClick={()=>{resetForm();setShowAddPanel(true)}}>
                          + Ajouter un bien
                        </button>
                      )}
                    </div>
                  </td></tr>
                ):filtered.map((b)=>{
                  const isSel = selected.includes(b.id)
                  const ic    = TYPE_ICONS[b.type] || '🏠'
                  const avH   = viewMode==='compact' ? 26 : 32
                  return (
                    <tr key={b.id} className={isSel?'sel':''} onClick={()=>{setSelectedBien(b);setDetailTab('infos')}}>
                      <td onClick={e=>{e.stopPropagation();toggleSelect(b.id)}}>
                        <div className={`pb-cb ${isSel?'on':''}`}>
                          {isSel&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:avH,height:avH,borderRadius:7,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:viewMode==='compact'?13:17,flexShrink:0}}>
                            {ic}
                          </div>
                          <div>
                            <div style={{fontWeight:600,color:'#e6edf3',fontSize:viewMode==='compact'?12.5:13.5}}>{b.nom}</div>
                            {viewMode==='normal'&&<div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)',marginTop:1}}>{b.type}</div>}
                          </div>
                        </div>
                      </td>
                      {cols.includes('adresse')&&<td style={{fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{b.adresse||'—'}</td>}
                      {cols.includes('superficie')&&<td style={{fontSize:12.5}}>{b.superficie!=null?b.superficie+' m²':'—'}</td>}
                      {cols.includes('loyer')&&<td style={{fontSize:13,fontWeight:600,color:'#0078d4'}}>{b.loyer!=null?fmt(b.loyer)+' FCFA':'—'}</td>}
                      {cols.includes('statut')&&<td><StatutBadge statut={b.statut}/></td>}
                      {cols.includes('proprietaire')&&<td>
                        {b.proprietaire
                          ?<span style={{fontSize:12.5,color:'rgba(255,255,255,0.6)'}}>{b.proprietaire.prenom} {b.proprietaire.nom}</span>
                          :<span style={{fontSize:12,color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>Non attribue</span>}
                      </td>}
                      {cols.includes('nb_baux')&&<td style={{fontSize:12.5,fontWeight:b.nb_baux>0?600:400,color:b.nb_baux>0?'#6c63ff':'rgba(255,255,255,0.3)'}}>{b.nb_baux}</td>}
                      {cols.includes('ville')&&<td style={{fontSize:12.5,color:'rgba(255,255,255,0.45)'}}>{b.ville||'—'}</td>}
                      {cols.includes('created_at')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{b.created_at?new Date(b.created_at).toLocaleDateString('fr-FR'):'—'}</td>}
                      <td onClick={e=>e.stopPropagation()}>
                        <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',padding:'5px 7px',borderRadius:5,fontSize:15,lineHeight:1}}
                          onMouseOver={e=>e.currentTarget.style.color='#e6edf3'}
                          onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}
                          onClick={()=>{setSelectedBien(b);setDetailTab('infos')}}>···</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="pb-foot">
            <span>{filtered.length} bien{filtered.length!==1?'s':''} affiche{filtered.length!==1?'s':''}</span>
            <span>{selected.length>0&&`${selected.length} selectionne${selected.length>1?'s':''}`}</span>
          </div>
        </div>
      </div>

      {/* ══ PANEL COLONNES ══ */}
      {showColsPanel&&(
        <div className="pb-ov" onClick={e=>e.target===e.currentTarget&&setShowColsPanel(false)}>
          <div className="pb-panel pb-cols-panel">
            <div className="pb-ph">
              <span className="pb-ph-title">Choisir les colonnes</span>
              <button className="pb-cls" onClick={()=>setShowColsPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="pb-pb">
              {ALL_COLS.map(col=>(
                <div key={col.key} className="pb-col-item">
                  <span style={{fontSize:13.5,color:col.disabled?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.65)'}}>{col.label}</span>
                  <div className={`pb-col-cb ${cols.includes(col.key)?'on':''}`} style={{opacity:col.disabled?0.4:1,cursor:col.disabled?'not-allowed':'pointer'}}
                    onClick={()=>{ if(col.disabled) return; setCols(c=>c.includes(col.key)?c.filter(x=>x!==col.key):[...c,col.key]) }}>
                    {cols.includes(col.key)&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                </div>
              ))}
            </div>
            <div className="pb-pf">
              <button className="pb-pfb pb-pfb-g" onClick={()=>{setCols(DEFAULT_COLS);setColWidths({})}}>Retablir</button>
              <button className="pb-pfb pb-pfb-b" onClick={()=>setShowColsPanel(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL AJOUT ══ */}
      {showAddPanel&&(
        <div className="pb-ov" onClick={e=>e.target===e.currentTarget&&(setShowAddPanel(false)||resetForm())}>
          <div className="pb-panel pb-add-panel">
            <div className="pb-ph">
              <span className="pb-ph-title">Ajouter un bien</span>
              <button className="pb-cls" onClick={()=>{setShowAddPanel(false);resetForm()}}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="pb-add-body">
              {/* Steps */}
              <div className="pb-steps-v">
                {STEPS.map((s,i)=>(
                  <div key={s.n} className={`pb-step-v ${step===s.n?'active':''} ${step>s.n?'done':''}`}
                    onClick={()=>s.n<step&&setStep(s.n)}>
                    <div className={`pb-step-v-n ${step===s.n?'active':''} ${step>s.n?'done':''}`}>
                      {step>s.n
                        ?<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                        :s.n}
                    </div>
                    <div>
                      <div className="pb-step-v-lbl">{s.label}</div>
                      <div className="pb-step-v-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contenu steps */}
              <div className="pb-step-content">

                {/* ── Step 1 : Informations ── */}
                {step===1&&(<>
                  <div className="pb-step-title">Informations du bien</div>
                  <div className="pb-step-sub">Renseignez le nom, le type et le statut actuel du bien.</div>
                  <div className="pb-field">
                    <label className="pb-lbl">Nom du bien <span style={{color:'#ef4444'}}>*</span></label>
                    <input className="pb-inp" autoFocus value={form.nom} onChange={e=>setF('nom',e.target.value)} placeholder="Ex: Villa les Cocotiers, Appart Lot 14..."/>
                  </div>
                  <div className="pb-sec">Type de bien</div>
                  <div className="pb-type-grid">
                    {TYPES.map(t=>(
                      <div key={t} className={`pb-type-item ${form.type===t?'on':''}`} onClick={()=>setF('type',t)}>
                        <div className="pb-type-ic-lg">{TYPE_ICONS[t]||'🏠'}</div>
                        <div className="pb-type-lbl">{t}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pb-sec">Statut actuel</div>
                  <div className="pb-statut-row">
                    {[
                      ['disponible',  'Disponible'],
                      ['loue',        'Loue'],
                      ['maintenance', 'Maintenance'],
                      ['reserve',     'Reserve'],
                      ['indisponible','Indisponible'],
                    ].map(([k,lbl])=>{
                      const cfg = STATUT_CFG[k] || STATUT_CFG.disponible
                      return (
                        <div key={k} className={`pb-statut-pill ${form.statut===k?'on':''}`}
                          style={form.statut===k?{borderColor:cfg.color,background:cfg.bg,color:cfg.color}:{}}
                          onClick={()=>setF('statut',k)}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:cfg.dot,flexShrink:0}}/>
                          {lbl}
                        </div>
                      )
                    })}
                  </div>
                </>)}

                {/* ── Step 2 : Localisation & Finances ── */}
                {step===2&&(<>
                  <div className="pb-step-title">Localisation et finances</div>
                  <div className="pb-step-sub">Adresse du bien, superficie, loyer et caracteristiques.</div>
                  <div className="pb-g2">
                    <div>
                      <label className="pb-lbl">Ville</label>
                      <input className="pb-inp" value={form.ville} onChange={e=>setF('ville',e.target.value)} placeholder="Cotonou"/>
                    </div>
                    <div>
                      <label className="pb-lbl">Quartier</label>
                      <input className="pb-inp" value={form.quartier} onChange={e=>setF('quartier',e.target.value)} placeholder="Fidjrosse, Aibatin..."/>
                    </div>
                  </div>
                  <div className="pb-field">
                    <label className="pb-lbl">Adresse complete</label>
                    <input className="pb-inp" value={form.adresse} onChange={e=>setF('adresse',e.target.value)} placeholder="Rue, lot, references..."/>
                  </div>
                  <div className="pb-sec">Caracteristiques</div>
                  <div className="pb-g3">
                    <div>
                      <label className="pb-lbl">Superficie (m²)</label>
                      <input className="pb-inp" type="number" min="0" value={form.superficie} onChange={e=>setF('superficie',e.target.value)} placeholder="85"/>
                    </div>
                    <div>
                      <label className="pb-lbl">Nb pieces</label>
                      <input className="pb-inp" type="number" min="0" value={form.nb_pieces} onChange={e=>setF('nb_pieces',e.target.value)} placeholder="4"/>
                    </div>
                    <div>
                      <label className="pb-lbl">Chambres</label>
                      <input className="pb-inp" type="number" min="0" value={form.nb_chambres} onChange={e=>setF('nb_chambres',e.target.value)} placeholder="2"/>
                    </div>
                  </div>
                  <div className="pb-sec">Finances</div>
                  <div className="pb-g2">
                    <div>
                      <label className="pb-lbl">Loyer mensuel (FCFA) <span style={{color:'#ef4444'}}>*</span></label>
                      <input className="pb-inp" type="number" min="0" value={form.loyer} onChange={e=>setF('loyer',e.target.value)} placeholder="75000"/>
                    </div>
                    <div>
                      <label className="pb-lbl">Salles de bain</label>
                      <input className="pb-inp" type="number" min="0" value={form.nb_sdb} onChange={e=>setF('nb_sdb',e.target.value)} placeholder="1"/>
                    </div>
                  </div>
                  <div className="pb-field">
                    <label className="pb-lbl">Description</label>
                    <textarea className="pb-inp" rows={3} value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Description du bien, equipements, acces..." style={{resize:'vertical',minHeight:80}}/>
                  </div>
                </>)}

                {/* ── Step 3 : Proprietaire ── */}
                {step===3&&(<>
                  <div className="pb-step-title">Associer un proprietaire</div>
                  <div className="pb-step-sub">Optionnel — Selectionnez le proprietaire de ce bien parmi ceux deja associes a votre agence.</div>

                  {proprietaires.length===0?(
                    <div style={{padding:'18px 20px',borderRadius:10,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13.5,color:'rgba(255,255,255,0.5)',lineHeight:1.7}}>
                      Aucun proprietaire associe a votre agence pour le moment.
                      <span style={{color:'#4da6ff',cursor:'pointer',marginLeft:6}} onClick={()=>navigate('/imoloc/proprietaires')}>
                        Ajouter un proprietaire →
                      </span>
                    </div>
                  ):(
                    <>
                      <div className="pb-field">
                        <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px',marginBottom:14}}>
                          <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                          <input style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}}
                            value={propSearch} onChange={e=>setPropSearch(e.target.value)}
                            placeholder="Filtrer par nom ou telephone..."/>
                        </div>
                      </div>
                      {/* Option aucun */}
                      <div className={`pb-prop-item ${!selectedProp?'on':''}`} onClick={()=>setSelectedProp(null)}>
                        <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🚫</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13.5,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>Aucun proprietaire</div>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginTop:1}}>Ajouter plus tard</div>
                        </div>
                        {!selectedProp&&<span style={{color:'#00c896',fontSize:18}}>✓</span>}
                      </div>
                      {filteredProps.map((p,i)=>{
                        const cols_p = ['#0078d4','#6c63ff','#00c896','#f59e0b','#4da6ff','#a78bfa']
                        const col_p  = cols_p[i % cols_p.length]
                        const isOn   = selectedProp?.id===p.id
                        return (
                          <div key={p.id} className={`pb-prop-item ${isOn?'on':''}`} onClick={()=>setSelectedProp(p)}>
                            <div style={{width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${col_p},${col_p}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                              {((p.prenom?.[0]||'')+(p.nom?.[0]||'')).toUpperCase()||'?'}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{p.prenom} {p.nom}</div>
                              <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{p.telephone||'Pas de tel'}</div>
                            </div>
                            {isOn?<span style={{color:'#00c896',fontSize:18}}>✓</span>:<span style={{color:'rgba(255,255,255,0.15)',fontSize:18}}>○</span>}
                          </div>
                        )
                      })}
                    </>
                  )}
                </>)}

                {/* ── Step 4 : Recap ── */}
                {step===4&&(<>
                  <div className="pb-step-title">Recapitulatif</div>
                  <div className="pb-step-sub">Verifiez les informations avant de creer le bien.</div>
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
                    {[
                      ['Nom',          form.nom],
                      ['Type',         TYPE_ICONS[form.type]+' '+form.type],
                      ['Statut',       STATUT_CFG[form.statut]?.label || form.statut],
                      ['Adresse',      form.adresse?`${form.adresse}${form.quartier?', '+form.quartier:''}, ${form.ville}`:form.ville||'—'],
                      ['Superficie',   form.superficie?form.superficie+' m²':'—'],
                      ['Loyer',        form.loyer?fmt(form.loyer)+' FCFA/mois':'—'],
                      ['Pieces',       form.nb_pieces?form.nb_pieces+' pieces / '+form.nb_chambres+' chambres':'—'],
                      ['Proprietaire', selectedProp?`${selectedProp.prenom} ${selectedProp.nom}`:'Non attribue'],
                      ['Agence',       agence?.nom||'—'],
                    ].map(([k,v],i,arr)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                        <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',flexShrink:0,width:130}}>{k}</span>
                        <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </>)}
              </div>
            </div>

            {/* Footer */}
            <div className="pb-pf">
              <button className="pb-pfb pb-pfb-g" onClick={()=>{ if(step===1){setShowAddPanel(false);resetForm()} else setStep(step-1) }}>
                {step===1?'Annuler':'Precedent'}
              </button>
              {step<4?(
                <button className="pb-pfb pb-pfb-b" disabled={step===1&&!form.nom}
                  style={{opacity:step===1&&!form.nom?0.4:1}}
                  onClick={()=>setStep(step+1)}>
                  Suivant →
                </button>
              ):(
                <button className="pb-pfb pb-pfb-b" disabled={saving||!form.nom}
                  style={{opacity:saving||!form.nom?0.4:1}}
                  onClick={createBien}>
                  {saving?'Creation en cours...':'Ajouter le bien'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ DRAWER DETAIL ══ */}
      {selectedBien&&(
        <div className="pb-ov" onClick={e=>e.target===e.currentTarget&&setSelectedBien(null)}>
          <div className="pb-panel pb-detail-panel">
            <div className="pb-detail-head">
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:56,height:56,borderRadius:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>
                    {TYPE_ICONS[selectedBien.type]||'🏠'}
                  </div>
                  <div>
                    <div style={{fontSize:19,fontWeight:700,color:'#e6edf3',marginBottom:3}}>{selectedBien.nom}</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:8}}>
                      {selectedBien.type}{selectedBien.ville?' — '+selectedBien.ville:''}
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <StatutBadge statut={selectedBien.statut}/>
                      {selectedBien.loyer&&(
                        <span style={{padding:'2px 9px',borderRadius:'100px',fontSize:11,fontWeight:600,background:'rgba(0,120,212,0.12)',color:'#4da6ff'}}>
                          {fmt(selectedBien.loyer)} FCFA/mois
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="pb-cls" onClick={()=>setSelectedBien(null)}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Actions */}
              <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:18,flexWrap:'wrap'}}>
                {[
                  {ic:'📄',lbl:'Voir les baux',   action:()=>navigate('/imoloc/baux')},
                  {ic:'💰',lbl:'Paiements',        action:()=>navigate('/imoloc/paiements')},
                  {ic:'✏️',lbl:'Modifier',          action:()=>{}},
                  {ic:'🗑️',lbl:'Supprimer',         action:()=>{
                    if(!confirm('Supprimer ce bien ?')) return
                    supabase.from('biens').delete().eq('id',selectedBien.id).then(()=>{
                      toast.success('Bien supprime'); setSelectedBien(null); initData()
                    })
                  }},
                ].map((a,i)=>(
                  <span key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'rgba(255,255,255,0.55)',cursor:'pointer',transition:'color 0.15s'}}
                    onClick={a.action}
                    onMouseEnter={e=>e.currentTarget.style.color='#e6edf3'}
                    onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.55)'}>
                    {a.ic} {a.lbl}
                  </span>
                ))}
              </div>

              <div className="pb-detail-tabs">
                {[['infos','Informations'],['proprietaire','Proprietaire'],['baux','Baux'],['paiements','Paiements']].map(([k,l])=>(
                  <button key={k} className={`pb-detail-tab ${detailTab===k?'active':''}`} onClick={()=>setDetailTab(k)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="pb-pb">
              {/* Tab Informations */}
              {detailTab==='infos'&&(
                <>
                  <div className="pb-detail-grid">
                    <div>
                      {[
                        ['Type',      selectedBien.type],
                        ['Ville',     `${selectedBien.ville||'—'}${selectedBien.quartier?`, ${selectedBien.quartier}`:''}` ],
                        ['Superficie',selectedBien.superficie!=null?selectedBien.superficie+' m²':null],
                        ['Pieces',    selectedBien.nombre_pieces!=null?selectedBien.nombre_pieces+' pieces':selectedBien.nb_pieces!=null?selectedBien.nb_pieces+' pieces':null],
                      ].map(([k,v])=>(
                        <div key={k} className="pb-blk">
                          <div className="pb-blk-lbl">{k}</div>
                          {v?<div className="pb-blk-val">{v}</div>:<div style={{fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.25)'}}>Non renseigne</div>}
                        </div>
                      ))}
                    </div>
                    <div>
                      {[
                        ['Statut',    <StatutBadge key="s" statut={selectedBien.statut}/>],
                        ['Adresse',   selectedBien.adresse],
                        ['Loyer',     selectedBien.loyer!=null?fmt(selectedBien.loyer)+' FCFA/mois':null],
                        ['Chambres',  selectedBien.nb_chambres!=null?selectedBien.nb_chambres+' chambre(s)':null],
                      ].map(([k,v])=>(
                        <div key={k} className="pb-blk">
                          <div className="pb-blk-lbl">{k}</div>
                          {v?<div className="pb-blk-val">{v}</div>:<div style={{fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.25)'}}>Non renseigne</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedBien.description&&(
                    <>
                      <div className="pb-divider"/>
                      <div className="pb-blk">
                        <div className="pb-blk-lbl">Description</div>
                        <div style={{fontSize:13.5,color:'rgba(255,255,255,0.45)',lineHeight:1.7,padding:'10px 14px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid rgba(255,255,255,0.06)'}}>
                          {selectedBien.description}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="pb-divider"/>
                  <div style={{fontSize:11.5,color:'rgba(255,255,255,0.25)',fontFamily:'monospace'}}>ID: {selectedBien.id}</div>
                </>
              )}

              {/* Tab Proprietaire */}
              {detailTab==='proprietaire'&&(
                selectedBien.proprietaire?(
                  <>
                    <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 0',marginBottom:20,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                      <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#0078d4,#0078d488)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:800,color:'#fff',flexShrink:0}}>
                        {((selectedBien.proprietaire.prenom?.[0]||'')+(selectedBien.proprietaire.nom?.[0]||'')).toUpperCase()||'?'}
                      </div>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>{selectedBien.proprietaire.prenom} {selectedBien.proprietaire.nom}</div>
                        <div style={{fontSize:13,color:'rgba(255,255,255,0.35)',marginTop:2}}>{selectedBien.proprietaire.telephone||'Pas de telephone'}</div>
                      </div>
                    </div>
                    <button className="pb-btn pb-btn-p" style={{marginBottom:12}} onClick={()=>navigate('/imoloc/proprietaires')}>
                      Voir le profil complet
                    </button>
                  </>
                ):(
                  <div style={{textAlign:'center',padding:'50px 20px'}}>
                    <div style={{fontSize:36,marginBottom:12,opacity:0.35}}>👤</div>
                    <div style={{fontSize:14,color:'rgba(255,255,255,0.35)',marginBottom:18}}>Aucun proprietaire associe</div>
                    <button className="pb-btn pb-btn-p" style={{margin:'0 auto'}} onClick={()=>navigate('/imoloc/proprietaires')}>
                      Associer un proprietaire
                    </button>
                  </div>
                )
              )}

              {/* Tab Baux */}
              {detailTab==='baux'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>📄</div>
                  <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.35)',marginBottom:8}}>
                    {selectedBien.nb_baux} bail{selectedBien.nb_baux!==1?'s':''} actif{selectedBien.nb_baux!==1?'s':''}
                  </div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:18}}>Module baux en cours de developpement</div>
                  <button className="pb-btn" style={{margin:'0 auto'}} onClick={()=>navigate('/imoloc/baux')}>Voir les baux</button>
                </div>
              )}

              {/* Tab Paiements */}
              {detailTab==='paiements'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>💰</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:18}}>Module paiements en cours de developpement</div>
                  <button className="pb-btn" style={{margin:'0 auto'}} onClick={()=>navigate('/imoloc/paiements')}>Voir les paiements</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
