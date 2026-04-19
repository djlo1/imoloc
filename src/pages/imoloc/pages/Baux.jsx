import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────
// statut_bail enum: en_attente, actif, expire, resilie
const STATUT_BAIL_CFG = {
  en_attente: { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'En attente', dot:'#f59e0b' },
  actif:      { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Actif',      dot:'#00c896' },
  expire:     { color:'#6c63ff', bg:'rgba(108,99,255,0.12)', label:'Expire',     dot:'#6c63ff' },
  resilie:    { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'Resilie',    dot:'#ef4444' },
}
const TYPES_BAIL = ['habitation','commercial','bureau','terrain','garage','autre']
const TYPE_BAIL_ICONS = { habitation:'🏠', commercial:'🏪', bureau:'🏢', terrain:'🌿', garage:'🚗', autre:'📄' }
const MODES_PAIEMENT = ['Mobile Money','Virement bancaire','Especes','Cheque']
const FREQUENCES = [{ val:'mensuel', label:'Mensuel' },{ val:'trimestriel', label:'Trimestriel' },{ val:'annuel', label:'Annuel' }]

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '—'

const addMonths = (dateStr, n) => {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().split('T')[0]
}

const ALL_COLS = [
  { key:'displayName', label:'Bail',          checked:true, disabled:true },
  { key:'locataire',   label:'Locataire',      checked:true  },
  { key:'loyer',       label:'Loyer mensuel',  checked:true  },
  { key:'date_debut',  label:'Debut',          checked:true  },
  { key:'date_fin',    label:'Fin',            checked:true  },
  { key:'statut',      label:'Statut',         checked:true  },
  { key:'caution',     label:'Caution',        checked:false },
  { key:'created_at',  label:'Cree le',        checked:false },
]
const DEFAULT_COLS = ALL_COLS.filter(c=>c.checked).map(c=>c.key)

const STEPS = [
  { n:1, label:'Bien',        desc:'Choisir le bien' },
  { n:2, label:'Locataire',   desc:'Choisir le locataire' },
  { n:3, label:'Conditions',  desc:'Loyer et duree' },
  { n:4, label:'Recap',       desc:'Verification finale' },
]

export default function ImolocBaux() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile } = useAuthStore()

  const [agence, setAgence]       = useState(null)
  const [baux, setBaux]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [selected, setSelected]   = useState([])
  const [viewMode, setViewMode]   = useState('normal')
  const [cols, setCols]           = useState(DEFAULT_COLS)
  const [colWidths, setColWidths] = useState({})
  const [showColsPanel, setShowColsPanel] = useState(false)
  const [showAddPanel, setShowAddPanel]   = useState(false)
  const [selectedBail, setSelectedBail]   = useState(null)
  const [detailTab, setDetailTab] = useState('infos')
  const [step, setStep]           = useState(1)
  const [saving, setSaving]       = useState(false)
  const [paiementsDetail, setPaiementsDetail] = useState([])
  const [loadingPaiements, setLoadingPaiements] = useState(false)

  // Donnees formulaire
  const [biens, setBiens]           = useState([])
  const [locataires, setLocataires] = useState([])
  const [bienSearch, setBienSearch] = useState('')
  const [locSearch, setLocSearch]   = useState('')
  const [selectedBienForm, setSelectedBienForm] = useState(null)
  const [selectedLocForm, setSelectedLocForm]   = useState(null)

  const [form, setForm] = useState({
    type_bail:'habitation',
    date_debut: new Date().toISOString().split('T')[0],
    duree_mois: '12',
    date_fin:'',
    type_duree:'determinee',
    delai_preavis_jours:'30',
    loyer_mensuel:'',
    devise:'FCFA',
    caution:'',
    depot_garantie:'',
    frais_agence_pct:'10',
    taux_commission:'10',
    mode_commission:'mensuel',
    mode_paiement:'Mobile Money',
    frequence_paiement:'mensuel',
    renouvellement_auto:false,
    notes:'',
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const resizingCol = useRef(null)
  const startX      = useRef(0)
  const startW      = useRef(0)

  useEffect(() => {
    const seg = location.pathname.split('/').pop()
    if (seg === 'expiration') setFilterStatut('expiration')
    else if (seg === 'termines') setFilterStatut('expire')
    else setFilterStatut('tous')
  }, [location.pathname])

  useEffect(() => { initData() }, [])

  // Auto-calcul date_fin
  useEffect(() => {
    if (form.date_debut && form.duree_mois && form.type_duree === 'determinee') {
      setF('date_fin', addMonths(form.date_debut, parseInt(form.duree_mois)||0))
    }
  }, [form.date_debut, form.duree_mois, form.type_duree])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList }   = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (!ag?.id) return

      // Baux avec joins
      const { data:bauxData } = await supabase
        .from('baux')
        .select(`
          *,
          biens(id, nom, ville, type, type_bien),
          locataires(id, nom, prenom, telephone, email),
          proprietaires(id, nom, prenom)
        `)
        .eq('agence_id', ag.id)
        .order('created_at', { ascending: false })

      setBaux(bauxData||[])

      // Biens disponibles ou occupes (pour creer un bail)
      const { data:biensData } = await supabase
        .from('biens')
        .select('id, nom, ville, type, type_bien, statut, loyer, loyer_mensuel, nombre_pieces, superficie, superficie_totale, proprietaire_id')
        .eq('agence_id', ag.id)
        .in('statut', ['disponible','reserve'])
      setBiens(biensData||[])

      // Locataires de l'agence
      const { data:locsData } = await supabase
        .from('locataires')
        .select('id, nom, prenom, telephone, email, statut_global')
        .eq('agence_id', ag.id)
        .eq('statut_global', 'actif')
      setLocataires(locsData||[])

    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadPaiements = async (bailId) => {
    setLoadingPaiements(true)
    try {
      const { data } = await supabase
        .from('paiements')
        .select('*')
        .eq('bail_id', bailId)
        .order('date_echeance', { ascending: true })
      setPaiementsDetail(data||[])
    } catch(e) { console.error(e) }
    finally { setLoadingPaiements(false) }
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

  const createBail = async () => {
    if (!agence?.id || !selectedBienForm || !selectedLocForm) return
    setSaving(true)
    try {
      const loyerNum    = parseFloat(form.loyer_mensuel) || 0
      const cautionNum  = parseFloat(form.caution)       || 0
      const dateDebut   = form.date_debut
      const dateFin     = form.type_duree==='determinee' ? form.date_fin : null
      const dureeNum    = parseInt(form.duree_mois)      || 12

      // Trouver le proprietaire_id du bien
      const propId = selectedBienForm.proprietaire_id || null

      // 1. Creer le bail (statut: en_attente)
      const { data:newBail, error:bailErr } = await supabase
        .from('baux')
        .insert({
          bien_id:          selectedBienForm.id,
          locataire_id:     selectedLocForm.id,
          agence_id:        agence.id,
          proprietaire_id:  propId,
          statut:           'en_attente',
          date_debut:       dateDebut,
          date_fin:         dateFin,
          duree_mois:       dureeNum,
          loyer_mensuel:    loyerNum,
          devise:           form.devise,
          caution:          cautionNum,
          taux_commission:  parseFloat(form.taux_commission)||10,
          mode_commission:  form.mode_commission,
          renouvellement_auto: form.renouvellement_auto,
          delai_preavis_jours: parseInt(form.delai_preavis_jours)||30,
          notes:            form.notes||null,
        })
        .select()
        .single()
      if (bailErr) throw new Error('Erreur bail: ' + bailErr.message + ' [' + bailErr.code + ']')

      // 2. Generer les echeances de paiement
      const echeances = []
      for (let i = 0; i < dureeNum; i++) {
        echeances.push({
          bail_id:        newBail.id,
          locataire_id:   selectedLocForm.id,
          bien_id:        selectedBienForm.id,
          agence_id:      agence.id,
          montant:        loyerNum,
          devise:         form.devise,
          periode_mois:   new Date(addMonths(dateDebut, i)).getMonth() + 1,
          periode_annee:  new Date(addMonths(dateDebut, i)).getFullYear(),
          date_echeance:  addMonths(dateDebut, i),
          statut:         'en_attente',
          mode:           form.mode_paiement,
        })
      }
      if (echeances.length > 0) {
        const { error:pErr } = await supabase.from('paiements').insert(echeances)
        if (pErr) console.warn('[paiements generation]', pErr.message)
      }

      // 3. Mettre a jour le statut du bien -> occupe
      await supabase.from('biens').update({ statut:'occupe' }).eq('id', selectedBienForm.id)

      toast.success('Bail cree ! ' + dureeNum + ' echeances generees.')
      setShowAddPanel(false)
      resetForm()
      initData()
    } catch(e) {
      console.error('[createBail]', e)
      toast.error(e.message || 'Erreur creation bail')
    }
    finally { setSaving(false) }
  }

  const activerBail = async (bail) => {
    const { error } = await supabase.from('baux').update({ statut:'actif' }).eq('id', bail.id)
    if (error) { toast.error(error.message); return }
    toast.success('Bail active !')
    setSelectedBail(b=>b ? {...b, statut:'actif'} : null)
    initData()
  }

  const resilierBail = async (bail) => {
    if (!confirm('Resilier ce bail ? Cette action est definitive.')) return
    const { error } = await supabase.from('baux').update({ statut:'resilie' }).eq('id', bail.id)
    if (error) { toast.error(error.message); return }
    // Remettre le bien disponible
    if (bail.bien_id) await supabase.from('biens').update({ statut:'disponible' }).eq('id', bail.bien_id)
    toast.success('Bail resilie. Le bien est de nouveau disponible.')
    setSelectedBail(null)
    initData()
  }

  const resetForm = () => {
    setStep(1)
    setSelectedBienForm(null)
    setSelectedLocForm(null)
    setBienSearch('')
    setLocSearch('')
    setForm({
      type_bail:'habitation',
      date_debut:new Date().toISOString().split('T')[0],
      duree_mois:'12', date_fin:'', type_duree:'determinee',
      delai_preavis_jours:'30', loyer_mensuel:'', devise:'FCFA',
      caution:'', depot_garantie:'', frais_agence_pct:'10',
      taux_commission:'10', mode_commission:'mensuel',
      mode_paiement:'Mobile Money', frequence_paiement:'mensuel',
      renouvellement_auto:false, notes:'',
    })
  }

  // Filtrage
  const now = new Date()
  const in30 = new Date(); in30.setDate(in30.getDate()+30)
  const filtered = baux.filter(b => {
    const matchSearch = `${b.biens?.nom||''} ${b.locataires?.nom||''} ${b.locataires?.prenom||''}`.toLowerCase().includes(search.toLowerCase())
    if (filterStatut==='tous') return matchSearch
    if (filterStatut==='expiration') {
      const fin = b.date_fin ? new Date(b.date_fin) : null
      return matchSearch && b.statut==='actif' && fin && fin<=in30 && fin>=now
    }
    return matchSearch && b.statut===filterStatut
  })

  const filteredBiens = biens.filter(b => `${b.nom} ${b.ville||''}`.toLowerCase().includes(bienSearch.toLowerCase()))
  const filteredLocs  = locataires.filter(l => `${l.prenom||''} ${l.nom} ${l.telephone||''}`.toLowerCase().includes(locSearch.toLowerCase()))

  const toggleSelect = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll    = () => setSelected(s=>s.length===filtered.length?[]:filtered.map(b=>b.id))
  const rowH         = viewMode==='compact' ? '40px' : '52px'

  const stats = {
    total:      baux.length,
    actifs:     baux.filter(b=>b.statut==='actif').length,
    attente:    baux.filter(b=>b.statut==='en_attente').length,
    expiration: baux.filter(b=>{ const f=b.date_fin?new Date(b.date_fin):null; return b.statut==='actif'&&f&&f<=in30&&f>=now }).length,
    revenus:    baux.filter(b=>b.statut==='actif').reduce((a,b)=>a+(b.loyer_mensuel||0),0),
  }

  const StatutBadge = ({ statut, size=11 }) => {
    const cfg = STATUT_BAIL_CFG[statut] || STATUT_BAIL_CFG.en_attente
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
        .bx-page{animation:bx-in 0.2s ease;min-height:100%}
        @keyframes bx-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .bx-bc{display:flex;align-items:center;gap:7px;font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .bx-bc span{cursor:pointer;transition:color 0.1s}.bx-bc span:hover{color:#4da6ff}
        .bx-title{font-size:26px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:4px}
        .bx-sub{font-size:13.5px;color:rgba(255,255,255,0.4);margin-bottom:22px}
        .bx-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
        .bx-stat{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px}
        .bx-stat-val{font-size:20px;font-weight:800;letter-spacing:-0.02em;margin-bottom:2px}
        .bx-stat-lbl{font-size:11.5px;color:rgba(255,255,255,0.35)}
        .bx-toolbar{display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .bx-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .bx-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .bx-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.bx-btn-p:hover:not(:disabled){background:#006cc1}
        .bx-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
        .bx-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
        .bx-btn-y{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.22);color:#f59e0b}
        .bx-sep{width:1px;height:22px;background:rgba(255,255,255,0.08)}
        .bx-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto;transition:border-color 0.15s}
        .bx-search:focus-within{border-color:rgba(0,120,212,0.4)}
        .bx-search input{background:none;border:none;outline:none;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;width:220px}
        .bx-search input::placeholder{color:rgba(255,255,255,0.25)}
        .bx-ftabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap}
        .bx-ftab{padding:5px 14px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;transition:all 0.15s}
        .bx-ftab.active{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.3);color:#4da6ff}
        .bx-tw{border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden}
        .bx-thead-bar{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .bx-table{width:100%;border-collapse:collapse;table-layout:fixed}
        .bx-table th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);padding:9px 14px;text-align:left;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07);white-space:nowrap;position:relative;user-select:none;overflow:hidden}
        .bx-table th:first-child{width:44px;text-align:center}
        .bx-table td{padding:0 14px;font-size:13px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .bx-table td:first-child{text-align:center}
        .bx-table tr{transition:background 0.08s;height:${rowH}}
        .bx-table tr:hover td{background:rgba(255,255,255,0.025);cursor:pointer}
        .bx-table tr.sel td{background:rgba(0,120,212,0.06)}
        .bx-table tr:last-child td{border-bottom:none}
        .bx-rh{position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;background:transparent}
        .bx-rh:hover{background:rgba(0,120,212,0.4)}
        .bx-cb{width:15px;height:15px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;margin:0 auto}
        .bx-cb.on{background:#0078d4;border-color:#0078d4}
        .bx-cb.half{background:rgba(0,120,212,0.3);border-color:#0078d4}
        .bx-empty{text-align:center;padding:60px 20px}
        .bx-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:rgba(255,255,255,0.3)}
        .bx-vtog{display:flex;gap:2px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:5px;padding:3px}
        .bx-vbtn{background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:3px;color:rgba(255,255,255,0.4);transition:all 0.15s;font-size:12px;font-family:Inter,sans-serif}
        .bx-vbtn.active{background:rgba(255,255,255,0.1);color:#e6edf3}

        /* Panel */
        .bx-ov{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;justify-content:flex-end}
        .bx-panel{background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:bx-sl 0.22s ease;height:100%;overflow:hidden}
        @keyframes bx-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .bx-ph{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .bx-ph-title{font-size:17px;font-weight:700;color:#e6edf3}
        .bx-cls{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .bx-cls:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .bx-pb{flex:1;overflow-y:auto;padding:24px 28px}
        .bx-pb::-webkit-scrollbar{width:4px}
        .bx-pb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .bx-pf{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .bx-pfb{flex:1;padding:11px;border-radius:5px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;transition:all 0.15s}
        .bx-pfb-b{background:#0078d4;color:#fff}.bx-pfb-b:hover{background:#006cc1}.bx-pfb-b:disabled{opacity:0.4;cursor:not-allowed}
        .bx-pfb-g{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}.bx-pfb-g:hover{background:rgba(255,255,255,0.09)}

        /* Add panel */
        .bx-add-panel{width:min(800px,96vw)}
        .bx-add-body{display:flex;flex:1;overflow:hidden}
        .bx-steps-v{width:180px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.07);padding:18px 0;display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,0.15)}
        .bx-step-v{display:flex;align-items:flex-start;gap:11px;padding:11px 18px;cursor:pointer;transition:background 0.15s;border-left:3px solid transparent}
        .bx-step-v:hover{background:rgba(255,255,255,0.04)}
        .bx-step-v.active{background:rgba(0,120,212,0.07);border-left-color:#0078d4}
        .bx-step-v.done{border-left-color:#00c896}
        .bx-step-v-n{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);margin-top:1px}
        .bx-step-v-n.active{background:#0078d4;color:#fff}
        .bx-step-v-n.done{background:#00c896;color:#fff}
        .bx-step-v-lbl{font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5)}
        .bx-step-v.active .bx-step-v-lbl{color:#e6edf3}
        .bx-step-content{flex:1;overflow-y:auto;padding:28px 30px}
        .bx-step-content::-webkit-scrollbar{width:4px}
        .bx-step-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:6px}
        .bx-step-sub{font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:22px;line-height:1.65}
        .bx-g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .bx-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px}
        .bx-field{margin-bottom:16px}
        .bx-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
        .bx-inp{width:100%;padding:9px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .bx-inp:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .bx-sec{font-size:11.5px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.09em;margin:22px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07)}

        /* Selecteur bien / locataire */
        .bx-pick-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);margin-bottom:7px;cursor:pointer;transition:all 0.15s}
        .bx-pick-item:hover{border-color:rgba(0,120,212,0.25);background:rgba(0,120,212,0.04)}
        .bx-pick-item.on{border-color:#0078d4;background:rgba(0,120,212,0.08)}

        /* Detail panel */
        .bx-detail-panel{width:min(640px,96vw)}
        .bx-detail-head{padding:24px 28px 0;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .bx-detail-tabs{display:flex;margin-top:18px}
        .bx-detail-tab{padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap}
        .bx-detail-tab:hover{color:rgba(255,255,255,0.75)}
        .bx-detail-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .bx-blk{margin-bottom:22px}
        .bx-blk-lbl{font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:5px}
        .bx-blk-val{font-size:13.5px;color:rgba(255,255,255,0.5)}
        .bx-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 2.5rem}
        .bx-divider{height:1px;background:rgba(255,255,255,0.07);margin:20px 0}

        /* Paiements liste */
        .bx-paie-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:7px;margin-bottom:5px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)}
        .bx-paie-row.paye{border-color:rgba(0,200,150,0.18);background:rgba(0,200,150,0.04)}
        .bx-paie-row.en_retard{border-color:rgba(239,68,68,0.18);background:rgba(239,68,68,0.04)}

        /* Cols panel */
        .bx-cols-panel{width:320px}
        .bx-col-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .bx-col-cb{width:17px;height:17px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s}
        .bx-col-cb.on{background:#0078d4;border-color:#0078d4}

        @media(max-width:960px){.bx-stats{grid-template-columns:repeat(3,1fr)}.bx-g2{grid-template-columns:1fr}.bx-g3{grid-template-columns:1fr 1fr}}
        @media(max-width:600px){.bx-steps-v{display:none}}
      `}</style>

      <div className="bx-page">
        <div className="bx-bc">
          <span onClick={()=>navigate('/imoloc')}>Centre Imoloc</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Baux et Contrats</span>
        </div>

        <div className="bx-title">Baux et Contrats</div>
        <div className="bx-sub">{baux.length} bail{baux.length!==1?'x':''} — {agence?.nom||'votre agence'}</div>

        {/* Stats */}
        <div className="bx-stats">
          {[
            {ic:'📄', lbl:'Total',            val:stats.total,     col:'#e6edf3'},
            {ic:'✅', lbl:'Actifs',            val:stats.actifs,    col:'#00c896'},
            {ic:'⏳', lbl:'En attente',        val:stats.attente,   col:'#f59e0b'},
            {ic:'⚠️', lbl:'Expiration <30j',   val:stats.expiration,col:stats.expiration>0?'#f59e0b':'rgba(255,255,255,0.3)'},
            {ic:'💰', lbl:'Revenus/mois',      val:fmt(stats.revenus)+' FCFA', col:'#00c896', small:true},
          ].map((s,i)=>(
            <div key={i} className="bx-stat">
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                <span style={{fontSize:15}}>{s.ic}</span>
                <span className="bx-stat-lbl">{s.lbl}</span>
              </div>
              <div className="bx-stat-val" style={{color:s.col,fontSize:s.small?15:20}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bx-toolbar">
          <button className="bx-btn bx-btn-p" onClick={()=>{resetForm();setShowAddPanel(true)}}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Nouveau bail
          </button>
          <button className="bx-btn" onClick={initData}>🔄</button>
          <div className="bx-search">
            <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bien, locataire..."/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>×</button>}
          </div>
        </div>

        {/* Filtres */}
        <div className="bx-ftabs">
          {[['tous','Tous'],['actif','Actifs'],['en_attente','En attente'],['expiration','Expiration proche'],['expire','Expires'],['resilie','Resilies']].map(([v,l])=>(
            <button key={v} className={`bx-ftab ${filterStatut===v?'active':''}`} onClick={()=>setFilterStatut(v)}>{l}</button>
          ))}
        </div>

        {/* Table */}
        <div className="bx-tw">
          <div className="bx-thead-bar">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{filtered.length} bail{filtered.length!==1?'x':''}</span>
              <div className="bx-vtog">
                {[['normal','Normal'],['compact','Compact']].map(([v,l])=>(
                  <button key={v} className={`bx-vbtn ${viewMode===v?'active':''}`} onClick={()=>setViewMode(v)}>{l}</button>
                ))}
              </div>
            </div>
            <button className="bx-btn" style={{padding:'5px 12px',fontSize:12}} onClick={()=>setShowColsPanel(true)}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"/></svg>
              Colonnes
            </button>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="bx-table">
              <thead>
                <tr>
                  <th style={{width:44}}>
                    <div className={`bx-cb ${selected.length===filtered.length&&filtered.length>0?'on':selected.length>0?'half':''}`} onClick={toggleAll}>
                      {selected.length===filtered.length&&filtered.length>0&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                      {selected.length>0&&selected.length<filtered.length&&<div style={{width:8,height:2,background:'#fff',borderRadius:1}}/>}
                    </div>
                  </th>
                  <th style={{width:colWidths['displayName']||220,minWidth:150}}>Bien<div className="bx-rh" onMouseDown={e=>startResize(e,'displayName')}/></th>
                  {cols.includes('locataire')&&<th style={{width:colWidths['locataire']||170}}>Locataire<div className="bx-rh" onMouseDown={e=>startResize(e,'locataire')}/></th>}
                  {cols.includes('loyer')&&<th style={{width:colWidths['loyer']||140}}>Loyer/mois<div className="bx-rh" onMouseDown={e=>startResize(e,'loyer')}/></th>}
                  {cols.includes('date_debut')&&<th style={{width:colWidths['date_debut']||110}}>Debut<div className="bx-rh" onMouseDown={e=>startResize(e,'date_debut')}/></th>}
                  {cols.includes('date_fin')&&<th style={{width:colWidths['date_fin']||110}}>Fin<div className="bx-rh" onMouseDown={e=>startResize(e,'date_fin')}/></th>}
                  {cols.includes('statut')&&<th style={{width:colWidths['statut']||130}}>Statut<div className="bx-rh" onMouseDown={e=>startResize(e,'statut')}/></th>}
                  {cols.includes('caution')&&<th style={{width:colWidths['caution']||120}}>Caution<div className="bx-rh" onMouseDown={e=>startResize(e,'caution')}/></th>}
                  {cols.includes('created_at')&&<th style={{width:colWidths['created_at']||110}}>Cree le<div className="bx-rh" onMouseDown={e=>startResize(e,'created_at')}/></th>}
                  <th style={{width:50}}/>
                </tr>
              </thead>
              <tbody>
                {loading?(
                  <tr><td colSpan={20} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</td></tr>
                ):filtered.length===0?(
                  <tr><td colSpan={20}>
                    <div className="bx-empty">
                      <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>📄</div>
                      <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>
                        {search?`Aucun resultat pour "${search}"`:filterStatut!=='tous'?'Aucun bail dans ce filtre':'Aucun bail cree'}
                      </div>
                      {!search&&filterStatut==='tous'&&(
                        <button className="bx-btn bx-btn-p" style={{margin:'0 auto'}} onClick={()=>{resetForm();setShowAddPanel(true)}}>+ Nouveau bail</button>
                      )}
                    </div>
                  </td></tr>
                ):filtered.map((b)=>{
                  const isSel = selected.includes(b.id)
                  const finDate = b.date_fin ? new Date(b.date_fin) : null
                  const isExpiringSoon = b.statut==='actif' && finDate && finDate<=in30 && finDate>=now
                  return (
                    <tr key={b.id} className={isSel?'sel':''} onClick={()=>{setSelectedBail(b);setDetailTab('infos');loadPaiements(b.id)}}>
                      <td onClick={e=>{e.stopPropagation();toggleSelect(b.id)}}>
                        <div className={`bx-cb ${isSel?'on':''}`}>
                          {isSel&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:9}}>
                          <div style={{width:viewMode==='compact'?26:32,height:viewMode==='compact'?26:32,borderRadius:7,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:viewMode==='compact'?12:16,flexShrink:0}}>
                            {TYPE_BAIL_ICONS[b.type_bail||'habitation']||'📄'}
                          </div>
                          <div>
                            <div style={{fontWeight:600,color:'#e6edf3',fontSize:viewMode==='compact'?12.5:13.5}}>{b.biens?.nom||'Bien inconnu'}</div>
                            {viewMode==='normal'&&<div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)',marginTop:1}}>{b.biens?.ville||'—'}</div>}
                          </div>
                        </div>
                      </td>
                      {cols.includes('locataire')&&<td style={{fontSize:12.5}}>{b.locataires?.prenom||''} {b.locataires?.nom||'—'}</td>}
                      {cols.includes('loyer')&&<td style={{fontSize:13,fontWeight:600,color:'#0078d4'}}>{fmt(b.loyer_mensuel)} FCFA</td>}
                      {cols.includes('date_debut')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{b.date_debut?new Date(b.date_debut).toLocaleDateString('fr-FR'):'—'}</td>}
                      {cols.includes('date_fin')&&<td>
                        <span style={{fontSize:12,color:isExpiringSoon?'#f59e0b':'rgba(255,255,255,0.5)'}}>
                          {b.date_fin?new Date(b.date_fin).toLocaleDateString('fr-FR'):'Indefini'}
                          {isExpiringSoon&&' ⚠️'}
                        </span>
                      </td>}
                      {cols.includes('statut')&&<td><StatutBadge statut={b.statut}/></td>}
                      {cols.includes('caution')&&<td style={{fontSize:12.5,color:'rgba(255,255,255,0.45)'}}>{b.caution?fmt(b.caution)+' FCFA':'—'}</td>}
                      {cols.includes('created_at')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{b.created_at?new Date(b.created_at).toLocaleDateString('fr-FR'):'—'}</td>}
                      <td onClick={e=>e.stopPropagation()}>
                        <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',padding:'5px 7px',borderRadius:5,fontSize:15}}
                          onMouseOver={e=>e.currentTarget.style.color='#e6edf3'}
                          onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}
                          onClick={()=>{setSelectedBail(b);setDetailTab('infos');loadPaiements(b.id)}}>···</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="bx-foot">
            <span>{filtered.length} bail{filtered.length!==1?'x':''} affiche{filtered.length!==1?'s':''}</span>
            <span>{selected.length>0&&`${selected.length} selectionne${selected.length>1?'s':''}`}</span>
          </div>
        </div>
      </div>

      {/* ══ PANEL COLONNES ══ */}
      {showColsPanel&&(
        <div className="bx-ov" onClick={e=>e.target===e.currentTarget&&setShowColsPanel(false)}>
          <div className="bx-panel bx-cols-panel">
            <div className="bx-ph"><span className="bx-ph-title">Colonnes</span>
              <button className="bx-cls" onClick={()=>setShowColsPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bx-pb">
              {ALL_COLS.map(col=>(
                <div key={col.key} className="bx-col-item">
                  <span style={{fontSize:13.5,color:'rgba(255,255,255,0.65)'}}>{col.label}</span>
                  <div className={`bx-col-cb ${cols.includes(col.key)?'on':''}`} style={{opacity:col.disabled?0.4:1,cursor:col.disabled?'not-allowed':'pointer'}}
                    onClick={()=>{ if(col.disabled) return; setCols(c=>c.includes(col.key)?c.filter(x=>x!==col.key):[...c,col.key]) }}>
                    {cols.includes(col.key)&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                </div>
              ))}
            </div>
            <div className="bx-pf">
              <button className="bx-pfb bx-pfb-g" onClick={()=>{setCols(DEFAULT_COLS);setColWidths({})}}>Retablir</button>
              <button className="bx-pfb bx-pfb-b" onClick={()=>setShowColsPanel(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL CREATION ══ */}
      {showAddPanel&&(
        <div className="bx-ov" onClick={e=>e.target===e.currentTarget&&(setShowAddPanel(false)||resetForm())}>
          <div className="bx-panel bx-add-panel">
            <div className="bx-ph">
              <span className="bx-ph-title">Nouveau bail</span>
              <button className="bx-cls" onClick={()=>{setShowAddPanel(false);resetForm()}}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bx-add-body">
              <div className="bx-steps-v">
                {STEPS.map((s)=>(
                  <div key={s.n} className={`bx-step-v ${step===s.n?'active':''} ${step>s.n?'done':''}`} onClick={()=>s.n<step&&setStep(s.n)}>
                    <div className={`bx-step-v-n ${step===s.n?'active':''} ${step>s.n?'done':''}`}>
                      {step>s.n?<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>:s.n}
                    </div>
                    <div>
                      <div className="bx-step-v-lbl">{s.label}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:2}}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bx-step-content">
                {/* Step 1 — Bien */}
                {step===1&&(<>
                  <div className="bx-step-title">Choisir le bien</div>
                  <div className="bx-step-sub">Selectionnez le bien immobilier concerne par ce bail.</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px',marginBottom:12}}>
                    <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                    <input style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}} value={bienSearch} onChange={e=>setBienSearch(e.target.value)} placeholder="Filtrer les biens disponibles..." autoFocus/>
                  </div>
                  {biens.length===0&&(
                    <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.7}}>
                      Aucun bien disponible.
                      <span style={{color:'#4da6ff',cursor:'pointer',marginLeft:6}} onClick={()=>{setShowAddPanel(false);navigate('/imoloc/biens')}}>Ajouter un bien →</span>
                    </div>
                  )}
                  {filteredBiens.map((b)=>(
                    <div key={b.id} className={`bx-pick-item ${selectedBienForm?.id===b.id?'on':''}`} onClick={()=>{setSelectedBienForm(b);setF('loyer_mensuel',String(b.loyer_mensuel||b.loyer||''))}}>
                      <div style={{width:38,height:38,borderRadius:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🏠</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{b.nom}</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{b.ville||'—'} · {fmt(b.loyer_mensuel||b.loyer)} FCFA/mois</div>
                      </div>
                      {selectedBienForm?.id===b.id?<span style={{color:'#00c896',fontSize:18}}>✓</span>:<span style={{color:'rgba(255,255,255,0.15)',fontSize:18}}>○</span>}
                    </div>
                  ))}
                  <div className="bx-sec">Type de bail</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {TYPES_BAIL.map(t=>(
                      <div key={t} onClick={()=>setF('type_bail',t)}
                        style={{padding:'7px 14px',borderRadius:7,border:'1.5px solid '+(form.type_bail===t?'#0078d4':'rgba(255,255,255,0.08)'),background:form.type_bail===t?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',fontSize:13,color:form.type_bail===t?'#e6edf3':'rgba(255,255,255,0.5)',transition:'all 0.15s',display:'flex',alignItems:'center',gap:6}}>
                        {TYPE_BAIL_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}
                      </div>
                    ))}
                  </div>
                </>)}

                {/* Step 2 — Locataire */}
                {step===2&&(<>
                  <div className="bx-step-title">Choisir le locataire</div>
                  <div className="bx-step-sub">Selectionnez le locataire pour ce bail.</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px',marginBottom:12}}>
                    <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                    <input style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}} value={locSearch} onChange={e=>setLocSearch(e.target.value)} placeholder="Nom, telephone..." autoFocus/>
                  </div>
                  {locataires.length===0&&(
                    <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.7}}>
                      Aucun locataire actif.
                      <span style={{color:'#4da6ff',cursor:'pointer',marginLeft:6}} onClick={()=>{setShowAddPanel(false);navigate('/imoloc/locataires')}}>Ajouter un locataire →</span>
                    </div>
                  )}
                  {filteredLocs.map((l,i)=>{
                    const cols2 = ['#0078d4','#6c63ff','#00c896','#f59e0b','#4da6ff']
                    const col = cols2[i%cols2.length]
                    return (
                      <div key={l.id} className={`bx-pick-item ${selectedLocForm?.id===l.id?'on':''}`} onClick={()=>setSelectedLocForm(l)}>
                        <div style={{width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${col},${col}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                          {((l.prenom?.[0]||'')+(l.nom?.[0]||'')).toUpperCase()||'?'}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{l.prenom} {l.nom}</div>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{l.telephone||'Pas de tel'}</div>
                        </div>
                        {selectedLocForm?.id===l.id?<span style={{color:'#00c896',fontSize:18}}>✓</span>:<span style={{color:'rgba(255,255,255,0.15)',fontSize:18}}>○</span>}
                      </div>
                    )
                  })}
                </>)}

                {/* Step 3 — Conditions financieres */}
                {step===3&&(<>
                  <div className="bx-step-title">Conditions financieres</div>
                  <div className="bx-step-sub">Loyer, duree, caution et mode de paiement. Les echeances seront generees automatiquement.</div>
                  <div className="bx-sec">Duree du bail</div>
                  <div className="bx-g2">
                    <div>
                      <label className="bx-lbl">Date de debut <span style={{color:'#ef4444'}}>*</span></label>
                      <input className="bx-inp" type="date" value={form.date_debut} onChange={e=>setF('date_debut',e.target.value)} autoFocus/>
                    </div>
                    <div>
                      <label className="bx-lbl">Type de duree</label>
                      <select className="bx-inp" value={form.type_duree} onChange={e=>setF('type_duree',e.target.value)}>
                        <option value="determinee" style={{background:'#161b22'}}>Determinee</option>
                        <option value="indeterminee" style={{background:'#161b22'}}>Indeterminee</option>
                      </select>
                    </div>
                  </div>
                  {form.type_duree==='determinee'&&(
                    <div className="bx-g2">
                      <div>
                        <label className="bx-lbl">Duree (mois) <span style={{color:'#ef4444'}}>*</span></label>
                        <input className="bx-inp" type="number" min="1" max="240" value={form.duree_mois} onChange={e=>setF('duree_mois',e.target.value)}/>
                      </div>
                      <div>
                        <label className="bx-lbl">Date de fin (auto-calculee)</label>
                        <input className="bx-inp" type="date" value={form.date_fin} onChange={e=>setF('date_fin',e.target.value)} style={{opacity:0.7}}/>
                      </div>
                    </div>
                  )}
                  <div className="bx-g2">
                    <div>
                      <label className="bx-lbl">Preavis (jours)</label>
                      <input className="bx-inp" type="number" min="0" value={form.delai_preavis_jours} onChange={e=>setF('delai_preavis_jours',e.target.value)}/>
                    </div>
                    <div>
                      <label className="bx-lbl">Renouvellement auto</label>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginTop:10,cursor:'pointer'}} onClick={()=>setF('renouvellement_auto',!form.renouvellement_auto)}>
                        <div style={{width:38,height:20,borderRadius:10,background:form.renouvellement_auto?'#0078d4':'rgba(255,255,255,0.1)',transition:'background 0.2s',position:'relative',flexShrink:0}}>
                          <div style={{position:'absolute',top:2,left:form.renouvellement_auto?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                        </div>
                        <span style={{fontSize:13,color:form.renouvellement_auto?'#e6edf3':'rgba(255,255,255,0.4)'}}>{form.renouvellement_auto?'Oui':'Non'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bx-sec">Finances</div>
                  <div className="bx-g2">
                    <div>
                      <label className="bx-lbl">Loyer mensuel (FCFA) <span style={{color:'#ef4444'}}>*</span></label>
                      <input className="bx-inp" type="number" min="0" value={form.loyer_mensuel} onChange={e=>setF('loyer_mensuel',e.target.value)}/>
                    </div>
                    <div>
                      <label className="bx-lbl">Caution (FCFA)</label>
                      <input className="bx-inp" type="number" min="0" value={form.caution} onChange={e=>setF('caution',e.target.value)} placeholder="Ex: 2 mois de loyer"/>
                    </div>
                  </div>
                  <div className="bx-g3">
                    <div>
                      <label className="bx-lbl">Commission (%)</label>
                      <input className="bx-inp" type="number" min="0" max="100" value={form.taux_commission} onChange={e=>setF('taux_commission',e.target.value)}/>
                    </div>
                    <div>
                      <label className="bx-lbl">Mode commission</label>
                      <select className="bx-inp" value={form.mode_commission} onChange={e=>setF('mode_commission',e.target.value)}>
                        {['mensuel','annuel','journalier'].map(m=>(<option key={m} style={{background:'#161b22'}}>{m}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="bx-lbl">Mode de paiement</label>
                      <select className="bx-inp" value={form.mode_paiement} onChange={e=>setF('mode_paiement',e.target.value)}>
                        {MODES_PAIEMENT.map(m=>(<option key={m} style={{background:'#161b22'}}>{m}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="bx-field">
                    <label className="bx-lbl">Notes internes</label>
                    <textarea className="bx-inp" rows={2} value={form.notes} onChange={e=>setF('notes',e.target.value)} placeholder="Conditions particulieres, remarques..." style={{resize:'vertical',minHeight:60}}/>
                  </div>
                </>)}

                {/* Step 4 — Recap */}
                {step===4&&(<>
                  <div className="bx-step-title">Recapitulatif</div>
                  <div className="bx-step-sub">Verifiez avant de creer le bail et les {form.duree_mois||'?'} echeances de paiement.</div>
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden',marginBottom:20}}>
                    {[
                      ['Bien',         selectedBienForm?.nom||'—'],
                      ['Locataire',    selectedLocForm?`${selectedLocForm.prenom||''} ${selectedLocForm.nom}`.trim():'—'],
                      ['Type bail',    form.type_bail],
                      ['Debut',        form.date_debut?new Date(form.date_debut).toLocaleDateString('fr-FR'):'—'],
                      ['Fin',          form.type_duree==='indeterminee'?'Indefinie':form.date_fin?new Date(form.date_fin).toLocaleDateString('fr-FR'):'—'],
                      ['Duree',        form.type_duree==='indeterminee'?'Indeterminee':form.duree_mois+' mois'],
                      ['Loyer',        form.loyer_mensuel?fmt(form.loyer_mensuel)+' FCFA/mois':'Non renseigne'],
                      ['Caution',      form.caution?fmt(form.caution)+' FCFA':'—'],
                      ['Commission',   form.taux_commission+'% / '+form.mode_commission],
                      ['Paiement',     form.mode_paiement],
                      ['Renouvellement',form.renouvellement_auto?'Automatique':'Manuel'],
                    ].map(([k,v],i,arr)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                        <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',width:140}}>{k}</span>
                        <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {form.duree_mois&&form.loyer_mensuel&&(
                    <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.15)',fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.8}}>
                      <strong style={{color:'#4da6ff'}}>Echeances a generer :</strong> {form.duree_mois} mensualites de {fmt(form.loyer_mensuel)} FCFA
                      <br/>Total bail : {fmt(parseInt(form.duree_mois)*parseFloat(form.loyer_mensuel))} FCFA
                    </div>
                  )}
                </>)}
              </div>
            </div>

            {/* Footer */}
            <div className="bx-pf">
              <button className="bx-pfb bx-pfb-g" onClick={()=>{ if(step===1){setShowAddPanel(false);resetForm()} else setStep(step-1) }}>
                {step===1?'Annuler':'Precedent'}
              </button>
              {step<4?(
                <button className="bx-pfb bx-pfb-b"
                  disabled={(step===1&&!selectedBienForm)||(step===2&&!selectedLocForm)||(step===3&&!form.loyer_mensuel)}
                  style={{opacity:(step===1&&!selectedBienForm)||(step===2&&!selectedLocForm)||(step===3&&!form.loyer_mensuel)?0.4:1}}
                  onClick={()=>setStep(step+1)}>
                  Suivant →
                </button>
              ):(
                <button className="bx-pfb bx-pfb-b" disabled={saving||!selectedBienForm||!selectedLocForm||!form.loyer_mensuel}
                  style={{opacity:saving||!selectedBienForm||!selectedLocForm||!form.loyer_mensuel?0.4:1}}
                  onClick={createBail}>
                  {saving?'Creation...':'Creer le bail'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ DRAWER DETAIL ══ */}
      {selectedBail&&(
        <div className="bx-ov" onClick={e=>e.target===e.currentTarget&&setSelectedBail(null)}>
          <div className="bx-panel bx-detail-panel">
            <div className="bx-detail-head">
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:50,height:50,borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
                    {TYPE_BAIL_ICONS[selectedBail.type_bail||'habitation']||'📄'}
                  </div>
                  <div>
                    <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:3}}>{selectedBail.biens?.nom||'Bien inconnu'}</div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:8}}>{selectedBail.locataires?.prenom} {selectedBail.locataires?.nom} · {fmt(selectedBail.loyer_mensuel)} FCFA/mois</div>
                    <StatutBadge statut={selectedBail.statut}/>
                  </div>
                </div>
                <button className="bx-cls" onClick={()=>setSelectedBail(null)}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Actions selon statut */}
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                {selectedBail.statut==='en_attente'&&(
                  <button className="bx-btn bx-btn-g" onClick={()=>activerBail(selectedBail)}>✅ Activer le bail</button>
                )}
                {selectedBail.statut==='actif'&&(
                  <button className="bx-btn bx-btn-r" onClick={()=>resilierBail(selectedBail)}>🚫 Resilier</button>
                )}
                {['actif','expire'].includes(selectedBail.statut)&&(
                  <button className="bx-btn bx-btn-y" onClick={()=>toast('Renouvellement — Phase 2')}>🔁 Renouveler</button>
                )}
                <button className="bx-btn" onClick={()=>toast('Export PDF — Phase 2')}>📄 Export PDF</button>
              </div>

              <div className="bx-detail-tabs">
                {[['infos','Informations'],['paiements','Paiements'],['edl','Etat des lieux'],['docs','Documents']].map(([k,l])=>(
                  <button key={k} className={`bx-detail-tab ${detailTab===k?'active':''}`} onClick={()=>setDetailTab(k)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="bx-pb">
              {/* Tab Informations */}
              {detailTab==='infos'&&(
                <>
                  <div className="bx-detail-grid">
                    <div>
                      {[
                        ['Bien',       selectedBail.biens?.nom],
                        ['Locataire',  `${selectedBail.locataires?.prenom||''} ${selectedBail.locataires?.nom||''}`.trim()],
                        ['Debut',      selectedBail.date_debut?new Date(selectedBail.date_debut).toLocaleDateString('fr-FR'):null],
                        ['Duree',      selectedBail.duree_mois?selectedBail.duree_mois+' mois':null],
                      ].map(([k,v])=>(
                        <div key={k} className="bx-blk">
                          <div className="bx-blk-lbl">{k}</div>
                          <div className="bx-blk-val">{v||'—'}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      {[
                        ['Loyer',      fmt(selectedBail.loyer_mensuel)+' FCFA/mois'],
                        ['Caution',    selectedBail.caution?fmt(selectedBail.caution)+' FCFA':'—'],
                        ['Fin',        selectedBail.date_fin?new Date(selectedBail.date_fin).toLocaleDateString('fr-FR'):'Indefinie'],
                        ['Commission', (selectedBail.taux_commission||10)+'% / '+(selectedBail.mode_commission||'mensuel')],
                      ].map(([k,v])=>(
                        <div key={k} className="bx-blk">
                          <div className="bx-blk-lbl">{k}</div>
                          <div className="bx-blk-val">{v||'—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedBail.notes&&(
                    <>
                      <div className="bx-divider"/>
                      <div className="bx-blk">
                        <div className="bx-blk-lbl">Notes</div>
                        <div style={{fontSize:13.5,color:'rgba(255,255,255,0.45)',lineHeight:1.7,fontStyle:'italic',padding:'10px 14px',background:'rgba(255,255,255,0.02)',borderRadius:8}}>{selectedBail.notes}</div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Tab Paiements */}
              {detailTab==='paiements'&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#e6edf3'}}>{paiementsDetail.length} echeances</div>
                    <div style={{display:'flex',gap:8,fontSize:12}}>
                      <span style={{color:'#00c896'}}>{paiementsDetail.filter(p=>p.statut==='paye').length} payes</span>
                      <span style={{color:'rgba(255,255,255,0.3)'}}>·</span>
                      <span style={{color:'#ef4444'}}>{paiementsDetail.filter(p=>p.statut==='en_retard').length} retards</span>
                      <span style={{color:'rgba(255,255,255,0.3)'}}>·</span>
                      <span style={{color:'rgba(255,255,255,0.45)'}}>{paiementsDetail.filter(p=>p.statut==='en_attente').length} a venir</span>
                    </div>
                  </div>
                  {loadingPaiements?(
                    <div style={{textAlign:'center',padding:30,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
                  ):paiementsDetail.map((p)=>{
                    const PCFG = { paye:{c:'#00c896',l:'Paye'}, en_retard:{c:'#ef4444',l:'Retard'}, en_attente:{c:'rgba(255,255,255,0.35)',l:'A venir'}, partiel:{c:'#f59e0b',l:'Partiel'}, annule:{c:'rgba(255,255,255,0.2)',l:'Annule'} }
                    const cfg = PCFG[p.statut]||PCFG.en_attente
                    return (
                      <div key={p.id} className={`bx-paie-row ${p.statut}`}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'#e6edf3',marginBottom:2}}>
                            {p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}):'—'}
                          </div>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR'):'—'}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <span style={{fontSize:13.5,fontWeight:700,color:'#e6edf3'}}>{fmt(p.montant)} FCFA</span>
                          <span style={{fontSize:11,fontWeight:600,color:cfg.c,padding:'2px 8px',borderRadius:'100px',background:cfg.c+'18'}}>{cfg.l}</span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Tab Etat des lieux */}
              {detailTab==='edl'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>🔍</div>
                  <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Etat des lieux</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:20,lineHeight:1.7}}>Module etat des lieux arrive en Phase 2.<br/>Inspection par pieces, photos, signature.</div>
                  <button className="bx-btn bx-btn-y" style={{margin:'0 auto'}} onClick={()=>toast('Phase 2 — bientot disponible')}>
                    📋 Creer l'etat des lieux
                  </button>
                </div>
              )}

              {/* Tab Documents */}
              {detailTab==='docs'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>📁</div>
                  <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Documents</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:20,lineHeight:1.7}}>Generation PDF automatique arrive en Phase 2.<br/>Contrat de bail, etat des lieux, quittances.</div>
                  <button className="bx-btn" style={{margin:'0 auto'}} onClick={()=>toast('Phase 2 — generation PDF bientot disponible')}>
                    📄 Generer le contrat PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
