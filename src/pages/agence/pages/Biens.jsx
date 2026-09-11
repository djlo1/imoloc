import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Building, Trees, Building2, ParkingSquare, HardHat,
  Wallet, FileText, User, Trash2, Pencil, Ban, RefreshCw, Download,
  Check, ArrowRight, Circle, Key, Tag, Plus, Layers, X, Save,
  ChevronDown, Search, Sofa, Warehouse, Store, Hotel, Landmark,
  School, FlaskConical, Hammer, Snowflake, Server, Tent, Sprout,
  TreePine, Boxes, ShieldCheck, Gauge, Receipt, AlertTriangle, Upload, History, Image,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'
import StatusDot from '../../../components/ui/StatusDot'
import ProgressBar from '../../../components/ui/ProgressBar'
import ConfirmDangerModal from '../../../components/shared/ConfirmDangerModal'
import { useBiensConfig, CATEGORIE_LABELS } from '../../../hooks/useBiensConfig'

// ─── Constants ─────────────────────────────────────────────
// Icone de repli par categorie (si une valeur precise n'a pas d'icone dediee
// dans VALEUR_ICONS ci-dessous)
const CATEGORIE_ICONS = {
  residentiel:Home, terrain:Trees, professionnel:Building2,
  collectif:Building, stationnement:ParkingSquare, specialise:HardHat, autre:HardHat,
}
// Icone dediee par valeur de type — les ~68 valeurs du catalogue types_biens
// sont chargees dynamiquement (voir useBiensConfig), mais l'icone reste
// mappee ici cote front pour eviter de stocker des noms d'icones en base
const VALEUR_ICONS = {
  appartement:Building, studio:Sofa, loft:Sofa, duplex:Building, triplex:Building, penthouse:Building,
  maison:Home, villa:Home, maison_mitoyenne:Home, maison_jumelee:Home, bungalow:Tent, chalet:Tent,
  ferme:Sprout, residence:Building, residence_etudiante:School, residence_senior:Building,
  residence_vacances:Hotel, chambre:Sofa, colocation:Sofa,
  parcelle:Trees, terrain_residentiel:Trees, terrain_agricole:Sprout, terrain_commercial:Trees,
  terrain_industriel:Trees, terrain_constructible:Trees, terrain_non_constructible:Trees,
  terrain_forestier:TreePine, terrain_mixte:Trees, terrain_avec_batiment:Trees, terrain_vacant:Trees,
  bureau:Building2, open_space:Building2, centre_affaires:Landmark, local_commercial:Store,
  boutique:Store, magasin:Store, restaurant:Store, bar:Store, hotel:Hotel, entrepot:Warehouse,
  hangar:Warehouse, atelier:Hammer, usine:Warehouse, laboratoire:FlaskConical, cabinet:Building2,
  clinique:Building2, etablissement_scolaire:School, centre_formation:School,
  immeuble_residentiel:Building, immeuble_commercial:Building, immeuble_mixte:Building,
  complexe_immobilier:Boxes, centre_commercial:Store, parc_activites:Boxes, parc_industriel:Boxes,
  parking:ParkingSquare, place_parking:ParkingSquare, garage:ParkingSquare, box:ParkingSquare, carport:ParkingSquare,
  residence_hoteliere:Hotel, maison_hotes:Hotel, exploitation_agricole:Sprout,
  entrepot_frigorifique:Snowflake, data_center:Server, local_technique:ShieldCheck,
  infrastructure_specialisee:ShieldCheck, autre:HardHat,
}
const INTENTIONS = [
  { val:'location',   label:'Location',    desc:'Gere en location', icon:Key },
  { val:'vente',       label:'Vente',        desc:'A vendre',         icon:Tag },
  { val:'les_deux',    label:'Les deux',     desc:'Location et vente possibles', icon:Building2 },
]
const OPPORTUNITE_STATUTS = [
  { valeur:'visite_prevue', label:'Visite prevue',  couleur:'#8b949e' },
  { valeur:'offre_faite',   label:'Offre faite',    couleur:'#f59e0b' },
  { valeur:'negociation',   label:'Negociation',    couleur:'#6c63ff' },
  { valeur:'accepte',       label:'Accepte',        couleur:'#00c896' },
  { valeur:'refuse',        label:'Refuse',         couleur:'#ef4444' },
  { valeur:'annule',        label:'Annule',         couleur:'#4b5563' },
]

const HISTORIQUE_ACTION_LABEL = {
  statut_change: 'Changement de statut',
  intention_change: "Changement d'intention",
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
  { n:1, label:'Type & intention',  desc:'Categorie, type, location ou vente' },
  { n:2, label:'Identification',    desc:'Nom, reference, statut' },
  { n:3, label:'Localisation',      desc:'Adresse selon le pays' },
  { n:4, label:'Caracteristiques',  desc:'Pieces, superficie, meuble' },
  { n:5, label:'Proprietaire',      desc:'Associer un proprietaire' },
  { n:6, label:'Finances',          desc:'Loyer ou prix de vente' },
  { n:7, label:'Recapitulatif',     desc:'Verification finale' },
]

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '—'

// ─── Champ personnalise (Point 40, vague 1) : rendu generique
// selon le type configure, valeur stockee dans biens.metadata ───
function CustomFieldInput({ champ, value, onChange }) {
  const opts = Array.isArray(champ.options) ? champ.options : []
  switch (champ.type) {
    case 'texte_long':
      return <textarea className="pb-inp" rows={3} value={value||''} onChange={e=>onChange(e.target.value)} style={{resize:'vertical',minHeight:70}}/>
    case 'nombre':
    case 'devise':
    case 'pourcentage':
      return <input className="pb-inp" type="number" value={value??''} onChange={e=>onChange(e.target.value)}/>
    case 'date':
      return <input className="pb-inp" type="date" value={value||''} onChange={e=>onChange(e.target.value)}/>
    case 'date_heure':
      return <input className="pb-inp" type="datetime-local" value={value||''} onChange={e=>onChange(e.target.value)}/>
    case 'oui_non':
      return (
        <div className="pb-statut-pill" style={{display:'inline-flex',borderColor:value?'#0078d4':'rgba(255,255,255,0.08)',background:value?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)',color:value?'#4da6ff':'rgba(255,255,255,0.5)'}}
          onClick={()=>onChange(!value)}>
          {value&&<Check size={14}/>} {value?'Oui':'Non'}
        </div>
      )
    case 'liste':
      return (
        <select className="pb-inp" value={value||''} onChange={e=>onChange(e.target.value)}>
          <option value="">Choisir...</option>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      )
    case 'liste_multiple': {
      const sel = Array.isArray(value) ? value : []
      return (
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {opts.map(o=>{
            const on = sel.includes(o)
            return (
              <div key={o} onClick={()=>onChange(on?sel.filter(x=>x!==o):[...sel,o])}
                style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:100,fontSize:12,cursor:'pointer',
                  border:`1px solid ${on?'#0078d4':'rgba(255,255,255,0.09)'}`,
                  background:on?'rgba(0,120,212,0.12)':'rgba(255,255,255,0.02)',
                  color:on?'#4da6ff':'rgba(255,255,255,0.45)'}}>
                {on&&<Check size={11}/>} {o}
              </div>
            )
          })}
        </div>
      )
    }
    default:
      return <input className="pb-inp" value={value||''} onChange={e=>onChange(e.target.value)}/>
  }
}
const formatCustomFieldValue = (champ, value) => {
  if (value==null || value==='' || (Array.isArray(value)&&value.length===0)) return 'Non renseigne'
  if (champ.type==='oui_non') return value ? 'Oui' : 'Non'
  if (champ.type==='liste_multiple') return Array.isArray(value) ? value.join(', ') : String(value)
  if (champ.type==='devise') return `${Number(value).toLocaleString('fr-FR')} FCFA`
  if (champ.type==='pourcentage') return `${value}%`
  if (champ.type==='date') return new Date(value).toLocaleDateString('fr-FR')
  return String(value)
}

// Reference auto-generee a partir du format de l'organisation (Centre
// d'administration > Parametres) ou du format par defaut. Jetons geres :
// {ANNEE}, {MOIS}, {SEQ}, {SEQ:04} (numero sequentiel avec zero-padding)
const DEFAULT_REFERENCE_FORMAT = 'BIEN-{ANNEE}-{SEQ:04}'
const formatReference = (format, seq) => {
  const now = new Date()
  return (format || DEFAULT_REFERENCE_FORMAT)
    .replace(/\{SEQ:(\d+)\}/g, (_, pad) => String(seq).padStart(Number(pad), '0'))
    .replace(/\{SEQ\}/g, String(seq))
    .replace(/\{ANNEE\}/g, String(now.getFullYear()))
    .replace(/\{MOIS\}/g, String(now.getMonth()+1).padStart(2,'0'))
}

// Config d'un statut a partir du catalogue dynamique (fallback neutre si
// le catalogue n'est pas encore charge ou si la valeur est inconnue)
const getStatutCfg = (statutsBiens, valeur) => {
  const row = (statutsBiens||[]).find(s=>s.valeur===valeur)
  const color = row?.couleur || '#8b949e'
  return { color, bg:`${color}1e`, label: row?.label || valeur || '—', dot: color }
}
// Type de bien a partir du catalogue dynamique
const getTypeInfo = (typesBiens, valeur) => {
  const row = (typesBiens||[]).find(t=>t.valeur===valeur)
  const icon = VALEUR_ICONS[valeur] || CATEGORIE_ICONS[row?.categorie] || Home
  return { label: row?.label || valeur || '—', icon }
}

// ─── Menu deroulant de statut, reutilise page/wizard/fiche ──
function StatutPicker({ statutsBiens, value, onChange, allowTous=false, size='normal' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const cur = value && value!=='tous' ? statutsBiens.find(s=>s.valeur===value) : null
  const placeholder = allowTous ? 'Tous' : 'Choisir un statut'
  return (
    <div ref={ref} style={{position:'relative',display:'inline-block'}}>
      <button className="pb-btn" style={size==='small'?{padding:'6px 11px',fontSize:12.5}:{}} onClick={()=>setOpen(o=>!o)}>
        {cur&&<span style={{width:7,height:7,borderRadius:'50%',background:cur.couleur||'#8b949e',flexShrink:0}}/>}
        <span>Statut : <b style={{color:cur?'#e6edf3':'rgba(255,255,255,0.4)',fontWeight:600}}>{cur?cur.label:placeholder}</b></span>
        <ChevronDown size={12}/>
      </button>
      {open&&(
        <div className="pb-dropdown">
          {allowTous&&(
            <div className={`pb-dropdown-item ${(!value||value==='tous')?'on':''}`} onClick={()=>{onChange('tous');setOpen(false)}}>Tous</div>
          )}
          {statutsBiens.map(s=>(
            <div key={s.valeur} className={`pb-dropdown-item ${value===s.valeur?'on':''}`} onClick={()=>{onChange(s.valeur);setOpen(false)}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:s.couleur||'#8b949e',flexShrink:0}}/>
              {s.label}
              {value===s.valeur&&<Check size={13} style={{marginLeft:'auto'}}/>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Liste recherchable de types, groupee par categorie ─────
function TypeSearchList({ typesParCategorie, value, onChange }) {
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  const groups = Object.entries(typesParCategorie).map(([cat,items])=>[
    cat, ql ? items.filter(t=>t.label.toLowerCase().includes(ql)) : items
  ]).filter(([,items])=>items.length>0)
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px',marginBottom:12}}>
        <Search size={13} color="rgba(255,255,255,0.3)"/>
        <input style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}}
          value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un type de bien..."/>
      </div>
      <div style={{maxHeight:320,overflowY:'auto',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8}}>
        {groups.length===0?(
          <div style={{padding:'24px 16px',textAlign:'center',fontSize:13,color:'rgba(255,255,255,0.3)'}}>Aucun type trouve</div>
        ):groups.map(([cat,items])=>(
          <div key={cat}>
            <div style={{padding:'8px 14px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em',background:'rgba(255,255,255,0.02)',position:'sticky',top:0}}>
              {CATEGORIE_LABELS[cat]||cat}
            </div>
            {items.map(t=>{
              const Icon = VALEUR_ICONS[t.valeur] || CATEGORIE_ICONS[t.categorie] || Home
              const on = value===t.valeur
              return (
                <div key={t.valeur} onClick={()=>onChange(t.valeur)}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',fontSize:13.5,
                    background:on?'rgba(0,120,212,0.1)':'transparent', color:on?'#4da6ff':'rgba(255,255,255,0.65)',
                    borderLeft:on?'2px solid #0078d4':'2px solid transparent'}}>
                  <Icon size={15}/> {t.label}
                  {on&&<Check size={14} style={{marginLeft:'auto'}}/>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Ville : recherche dans la liste connue du pays, mais accepte
// toujours une saisie libre (liste non exhaustive, ne doit jamais bloquer) ──
function VilleCombobox({ villes, value, onChange, placeholder='Cotonou' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const ql = (value||'').trim().toLowerCase()
  const matches = ql ? villes.filter(v=>v.toLowerCase().includes(ql)) : villes
  return (
    <div ref={ref} style={{position:'relative'}}>
      <input className="pb-inp" value={value} onFocus={()=>setOpen(true)}
        onChange={e=>{onChange(e.target.value);setOpen(true)}} placeholder={placeholder}/>
      {open&&matches.length>0&&(
        <div className="pb-dropdown" style={{minWidth:'100%',maxHeight:220}}>
          {matches.slice(0,50).map(v=>(
            <div key={v} className="pb-dropdown-item" onClick={()=>{onChange(v);setOpen(false)}}>{v}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────
export default function Biens() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuthStore()

  const [agence, setAgence]         = useState(null)
  const [biens, setBiens]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [specialFilter, setSpecialFilter] = useState(null) // 'immeubles' | 'a_vendre' | 'vendus' | 'opportunites'
  const [oppList, setOppList]       = useState([])
  const [oppLoading, setOppLoading] = useState(false)
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

  // Fiche du bien selectionne
  const [editMode, setEditMode]     = useState(false)
  const [editForm, setEditForm]     = useState({})
  const [conversionWarning, setConversionWarning] = useState(null) // {title,message,checkboxLabel} | null
  const [bienProps, setBienProps]   = useState([])   // biens_proprietaires + proprietaire joint
  const [bienEquip, setBienEquip]   = useState([])   // ids d'equipements coches pour ce bien
  const [bienMandat, setBienMandat] = useState(null)
  const [bienUnites, setBienUnites] = useState([])   // unites enfants si immeuble
  const [bienOpportunites, setBienOpportunites] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState([])
  const [showAddOpp, setShowAddOpp] = useState(false)

  // Phase 5 : compteurs, assurances, taxes
  const [bienCompteurs, setBienCompteurs]   = useState([])
  const [showAddCompteur, setShowAddCompteur] = useState(false)
  const [newCompteur, setNewCompteur]       = useState({ type_compteur:'', numero:'', fournisseur:'', unite:'', individuel_collectif:'individuel', souscripteur:'' })
  const [newReleve, setNewReleve]           = useState({}) // { [compteurId]: { valeur, date_releve } }
  const [bienAssurances, setBienAssurances] = useState([])
  const [showAddAssurance, setShowAddAssurance] = useState(false)
  const [newAssurance, setNewAssurance]     = useState({ assureur:'', numero_police:'', type_assurance:'', date_debut:'', date_expiration:'', prime:'', montant_couvert:'' })
  const [bienTaxes, setBienTaxes]           = useState([])
  const [showAddTaxe, setShowAddTaxe]       = useState(false)
  const [newTaxe, setNewTaxe]               = useState({ type_taxe:'', montant:'', date_echeance:'', frequence:'annuelle', statut:'a_jour' })
  const [bienSinistres, setBienSinistres]   = useState([])
  const [showAddSinistre, setShowAddSinistre] = useState(false)
  const [newSinistre, setNewSinistre]       = useState({ type_sinistre:'', date_sinistre:'', description:'', gravite:'moderee', assurance_id:'', cout:'', statut:'declare' })
  const [bienDocuments, setBienDocuments]   = useState([])
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [newDocument, setNewDocument]       = useState({ nom:'', type_document:'', categorie:'', visibilite:'interne_agence', file:null })
  const [uploadingDoc, setUploadingDoc]     = useState(false)
  const [bienHistorique, setBienHistorique] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Pour l'etape 5 (proprietaire)
  const [proprietaires, setProprietaires] = useState([])
  const [propSearch, setPropSearch]       = useState('')
  const [selectedProp, setSelectedProp]   = useState(null)
  const [multiProp, setMultiProp]         = useState(false)
  const [coProprietaires, setCoProprietaires] = useState([]) // [{proprietaire, pourcentage}]
  const [showPaysOverride, setShowPaysOverride] = useState(false)

  const [form, setForm] = useState({
    nom:'', type:'', statut:'', statut_vente:'', intention:'',
    pays:'', adresse:'', ville:'', quartier:'',
    superficie:'', loyer:'', prix_vente_demande:'',
    nb_pieces:'', nb_chambres:'', nb_sdb:'', meuble:false,
    description:'',
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  // Un bien doit avoir : type + intention (etape 1), nom + statut (etape 2).
  // Le reste (localisation, caracteristiques, proprietaire, finances) est
  // optionnel a la creation.
  const canProceedStep = (n) => {
    if (n===1) return !!form.type && !!form.intention
    if (n===2) return !!form.nom && !!form.statut
    return true
  }

  const { loading:configLoading, typesBiens, typesParCategorie, statutsBiens, statutsVente, equipements, equipementsParCategorie, adresseSchema, environnementalSchema, paysActifs, villes, champsPersonnalises } =
    useBiensConfig(agence?.id, form.pays || agence?.pays)

  const resizingCol = useRef(null)
  const startX      = useRef(0)
  const startW      = useRef(0)

  // Lire le filtre depuis l'URL (/biens/libres, /biens/immeubles, /biens/a-vendre, etc.)
  useEffect(() => {
    const seg = location.pathname.split('/').pop()
    const statutMap = { libres:'disponible', occupes:'occupe', maintenance:'maintenance', renovation:'renovation', reserves:'reserve' }
    const specialMap = { immeubles:'immeubles', 'a-vendre':'a_vendre', vendus:'vendus', opportunites:'opportunites' }
    if (statutMap[seg]) {
      setFilterStatut(statutMap[seg])
      setSpecialFilter(null)
    } else if (specialMap[seg]) {
      setFilterStatut('tous')
      setSpecialFilter(specialMap[seg])
    } else {
      setFilterStatut('tous')
      setSpecialFilter(null)
    }
  }, [location.pathname])

  // Chargement des opportunites (vue transversale, toutes les biens de l'agence)
  useEffect(() => {
    if (specialFilter!=='opportunites' || !agence?.id) return
    let cancelled = false
    const load = async () => {
      setOppLoading(true)
      const { data } = await supabase.from('opportunites_vente')
        .select('*, biens!inner(id,nom,reference,agence_id), contacts(id,display,email,tel_mobile)')
        .eq('biens.agence_id', agence.id)
        .order('created_at', { ascending:false })
      if (!cancelled) { setOppList(data||[]); setOppLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [specialFilter, agence?.id])

  // Lien profond : /agence/biens?bien=<id> ouvre directement la fiche
  // (permet aux autres pages de renvoyer vers un bien precis)
  useEffect(() => {
    if (biens.length===0) return
    const params = new URLSearchParams(location.search)
    const bienId = params.get('bien')
    if (bienId) {
      const b = biens.find(x=>x.id===bienId)
      if (b) { setSelectedBien(b); setDetailTab('infos') }
      navigate(location.pathname, { replace:true })
    }
  }, [biens])

  const updateOppListStatut = async (id, statut) => {
    setOppList(o=>o.map(x=>x.id===id?{...x,statut}:x))
    await supabase.from('opportunites_vente').update({ statut, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const openBienFromOpp = (bienId) => {
    const b = biens.find(x=>x.id===bienId)
    if (b) { setSelectedBien(b); setDetailTab('vente') }
  }

  useEffect(() => { initData() }, [])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
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
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:seq } = await supabase.rpc('next_reference_seq', { p_agence_id: agence.id })
      const reference = formatReference(agence.format_reference, seq)
      const { data:bien, error } = await supabase.from('biens').insert({
        nom:              form.nom,
        reference,
        type_bien:        form.type,           // colonne texte (catalogue types_biens)
        type:             form.type,           // colonne compat, conservee pour l'existant
        statut:           form.statut,         // colonne texte (catalogue statuts_biens)
        intention:        form.intention,
        statut_vente:     form.statut_vente     || null,
        meuble:           form.meuble,
        pays:             form.pays            || agence.pays || null,
        adresse:          form.adresse         || null,
        ville:            form.ville           || null,
        quartier:         form.quartier        || null,
        superficie:       form.superficie      ? Number(form.superficie)  : null,
        superficie_totale:form.superficie      ? Number(form.superficie)  : null,
        loyer:            form.loyer           ? Number(form.loyer)       : null,
        loyer_mensuel:    form.loyer           ? Number(form.loyer)       : null,
        prix_vente_demande: form.prix_vente_demande ? Number(form.prix_vente_demande) : null,
        nombre_pieces:    form.nb_pieces       ? Number(form.nb_pieces)   : null,
        nombre_chambres:  form.nb_chambres     ? Number(form.nb_chambres) : null,
        nombre_salles_bain: form.nb_sdb        ? Number(form.nb_sdb)      : null,
        description:      form.description     || null,
        agence_id:        agence.id,
        proprietaire_id:  selectedProp?.id     || null, // conserve pour compat, biens_proprietaires est la source de verite
        created_by:       user?.id             || null,
      }).select('id').single()
      if (error) throw error

      // Proprietaire(s) — un seul a 100% par defaut, ou plusieurs si coche
      const parts = multiProp
        ? coProprietaires.filter(c=>c.proprietaire && Number(c.pourcentage)>0)
        : (selectedProp ? [{ proprietaire:selectedProp, pourcentage:100 }] : [])
      if (parts.length>0) {
        const { error: propErr } = await supabase.from('biens_proprietaires').insert(
          parts.map(p => ({ bien_id: bien.id, proprietaire_id: p.proprietaire.id, pourcentage: Number(p.pourcentage) }))
        )
        if (propErr) console.error('biens_proprietaires', propErr)
      }

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

  // ─── Chargement de la fiche detaillee (propriete, equipements, mandat, unites) ───
  useEffect(() => {
    if (!selectedBien?.id) return
    setEditMode(false)
    loadBienDetail(selectedBien.id)
  }, [selectedBien?.id])

  const loadBienDetail = async (bienId) => {
    setDetailLoading(true)
    try {
      const [
        { data: props },
        { data: equip },
        { data: mandatsData },
        { data: unites },
        { data: opportunites },
        { data: compteurs },
        { data: assurances },
        { data: taxes },
        { data: sinistres },
        { data: docs },
        { data: histo },
      ] = await Promise.all([
        supabase.from('biens_proprietaires').select('*, proprietaires(id,nom,prenom,telephone,email)').eq('bien_id', bienId),
        supabase.from('biens_equipements').select('equipement_id, valeur').eq('bien_id', bienId),
        supabase.from('mandats').select('*').eq('bien_id', bienId).order('created_at', { ascending:false }).limit(1),
        supabase.from('biens').select('id,nom,type_bien,type,statut').eq('parent_bien_id', bienId),
        supabase.from('opportunites_vente').select('*, contacts(id,display,email,tel_mobile)').eq('bien_id', bienId).order('created_at', { ascending:false }),
        supabase.from('compteurs').select('*').eq('bien_id', bienId).order('created_at', { ascending:false }),
        supabase.from('assurances').select('*').eq('bien_id', bienId).order('created_at', { ascending:false }),
        supabase.from('taxes_bien').select('*').eq('bien_id', bienId).order('date_echeance', { ascending:true }),
        supabase.from('sinistres').select('*').eq('bien_id', bienId).order('date_sinistre', { ascending:false }),
        supabase.from('documents').select('*').eq('entite_type','bien').eq('entite_id', bienId).order('created_at', { ascending:false }),
        supabase.from('historique').select('*').eq('entite_type','bien').eq('entite_id', bienId).order('created_at', { ascending:false }),
      ])
      setBienProps(props||[])
      setBienEquip(equip||[])
      setBienMandat(mandatsData?.[0]||null)
      setBienUnites(unites||[])
      setBienAssurances(assurances||[])
      setBienTaxes(taxes||[])
      setBienSinistres(sinistres||[])
      setBienHistorique(histo||[])

      if ((docs||[]).length>0) {
        const withUrls = await Promise.all((docs||[]).map(async d => {
          const { data: signed } = await supabase.storage.from('documents').createSignedUrl(d.fichier_url, 3600)
          return { ...d, signed_url: signed?.signedUrl||null }
        }))
        setBienDocuments(withUrls)
      } else {
        setBienDocuments([])
      }

      const compteurIds = (compteurs||[]).map(c=>c.id)
      if (compteurIds.length>0) {
        const { data: releves } = await supabase.from('releves_compteurs')
          .select('*').in('compteur_id', compteurIds).order('date_releve', { ascending:false })
        const dernierParCompteur = {}
        for (const r of (releves||[])) { if (!dernierParCompteur[r.compteur_id]) dernierParCompteur[r.compteur_id] = r }
        setBienCompteurs((compteurs||[]).map(c=>({ ...c, dernier_releve: dernierParCompteur[c.id]||null })))
      } else {
        setBienCompteurs([])
      }
      setBienOpportunites(opportunites||[])
    } catch(e) { console.error('loadBienDetail', e) }
    finally { setDetailLoading(false) }
  }

  const startEdit = () => {
    setEditForm({
      nom: selectedBien.nom||'', reference: selectedBien.reference||'',
      statut: selectedBien.statut||'disponible', intention: selectedBien.intention||'location',
      statut_vente: selectedBien.statut_vente||'',
      adresse: selectedBien.adresse||'', ville: selectedBien.ville||'', quartier: selectedBien.quartier||'',
      description: selectedBien.description||'',
      superficie: selectedBien.superficie ?? '', nombre_pieces: selectedBien.nombre_pieces ?? '',
      nombre_chambres: selectedBien.nombre_chambres ?? '', nombre_salles_bain: selectedBien.nombre_salles_bain ?? '',
      meuble: !!selectedBien.meuble,
      loyer: selectedBien.loyer ?? '', prix_vente_demande: selectedBien.prix_vente_demande ?? '',
      animaux_autorises: !!selectedBien.animaux_autorises,
      fumeurs_autorises: !!selectedBien.fumeurs_autorises,
      sous_location_autorisee: !!selectedBien.sous_location_autorisee,
      colocation_autorisee: !!selectedBien.colocation_autorisee,
      activite_pro_autorisee: !!selectedBien.activite_pro_autorisee,
      location_courte_duree_autorisee: !!selectedBien.location_courte_duree_autorisee,
      regles: selectedBien.regles||'',
      checkin_heure: selectedBien.checkin_heure||'', checkout_heure: selectedBien.checkout_heure||'',
      tarif_nuitee: selectedBien.tarif_nuitee ?? '', nuits_minimum: selectedBien.nuits_minimum ?? '',
      environnemental: {...(selectedBien.metadata?.environnemental||{})},
      champsPerso: {...(selectedBien.metadata?.champs_personnalises||{})},
    })
    setEditMode(true)
  }
  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}))

  // Conversion Location<->Vente : detecte les transitions a risque et
  // impose un avertissement a case a cocher avant d'ecrire en base.
  const saveEdit = async () => {
    const wasVente = selectedBien.intention==='vente'||selectedBien.intention==='les_deux'
    const willVente = editForm.intention==='vente'||editForm.intention==='les_deux'

    if (!wasVente && willVente && selectedBien.nb_baux>0) {
      setConversionWarning({
        title: 'Mettre ce bien en vente',
        message: `Ce bien a ${selectedBien.nb_baux} bail${selectedBien.nb_baux>1?'s':''} actif${selectedBien.nb_baux>1?'s':''}. En activant l'intention de vente, le bien sera propose a la vente alors qu'il reste loue, sauf si le bail est resilie separement.`,
        checkboxLabel: "Je comprends que ce bien sera mis en vente occupe et je confirme vouloir continuer.",
      })
      return
    }
    if (wasVente && !willVente) {
      const opportuniteAvancee = bienOpportunites.some(o=>o.statut==='accepte')
      const venteAvancee = selectedBien.statut_vente==='compromis_signe' || selectedBien.statut_vente==='vendu'
      if (opportuniteAvancee || venteAvancee) {
        setConversionWarning({
          title: 'Retirer ce bien de la vente',
          message: "Ce bien a une opportunite de vente avancee (offre acceptee ou compromis signe). Retirer l'intention de vente n'annule pas cette opportunite — pensez a la mettre a jour si la vente n'a plus lieu.",
          checkboxLabel: "Je comprends les consequences et je confirme vouloir continuer.",
        })
        return
      }
    }
    await doSaveEdit()
  }

  const doSaveEdit = async () => {
    setSaving(true)
    try {
      const payload = {
        nom: editForm.nom, reference: editForm.reference||null,
        statut: editForm.statut, intention: editForm.intention,
        statut_vente: editForm.statut_vente||null,
        adresse: editForm.adresse||null, ville: editForm.ville||null, quartier: editForm.quartier||null,
        description: editForm.description||null,
        superficie: editForm.superficie?Number(editForm.superficie):null,
        superficie_totale: editForm.superficie?Number(editForm.superficie):null,
        nombre_pieces: editForm.nombre_pieces?Number(editForm.nombre_pieces):null,
        nombre_chambres: editForm.nombre_chambres?Number(editForm.nombre_chambres):null,
        nombre_salles_bain: editForm.nombre_salles_bain?Number(editForm.nombre_salles_bain):null,
        meuble: editForm.meuble,
        loyer: editForm.loyer?Number(editForm.loyer):null,
        loyer_mensuel: editForm.loyer?Number(editForm.loyer):null,
        prix_vente_demande: editForm.prix_vente_demande?Number(editForm.prix_vente_demande):null,
        animaux_autorises: !!editForm.animaux_autorises,
        fumeurs_autorises: !!editForm.fumeurs_autorises,
        sous_location_autorisee: !!editForm.sous_location_autorisee,
        colocation_autorisee: !!editForm.colocation_autorisee,
        activite_pro_autorisee: !!editForm.activite_pro_autorisee,
        location_courte_duree_autorisee: !!editForm.location_courte_duree_autorisee,
        regles: editForm.regles||null,
        checkin_heure: editForm.checkin_heure||null,
        checkout_heure: editForm.checkout_heure||null,
        tarif_nuitee: editForm.tarif_nuitee?Number(editForm.tarif_nuitee):null,
        nuits_minimum: editForm.nuits_minimum?Number(editForm.nuits_minimum):null,
        metadata: {
          ...(selectedBien.metadata||{}),
          environnemental: editForm.environnemental||{},
          champs_personnalises: editForm.champsPerso||{},
        },
      }
      const { data, error } = await supabase.from('biens').update(payload).eq('id', selectedBien.id).select('*').single()
      if (error) throw error
      if (selectedBien.statut !== payload.statut) {
        logHistorique('statut_change', 'statut', selectedBien.statut, payload.statut)
      }
      if (selectedBien.intention !== payload.intention) {
        logHistorique('intention_change', 'intention', selectedBien.intention, payload.intention)
      }
      toast.success('Bien mis a jour')
      setEditMode(false)
      setSelectedBien(b=>({...b, ...data}))
      initData()
    } catch(e) { toast.error(e.message||'Erreur') }
    finally { setSaving(false) }
  }

  const toggleBienEquip = async (equipementId) => {
    const has = bienEquip.some(e=>e.equipement_id===equipementId)
    if (has) {
      setBienEquip(be=>be.filter(e=>e.equipement_id!==equipementId))
      await supabase.from('biens_equipements').delete().eq('bien_id',selectedBien.id).eq('equipement_id',equipementId)
    } else {
      setBienEquip(be=>[...be,{equipement_id:equipementId, valeur:null}])
      await supabase.from('biens_equipements').insert({bien_id:selectedBien.id, equipement_id:equipementId})
    }
  }

  const removeBienProprietaire = async (id) => {
    setBienProps(bp=>bp.filter(p=>p.id!==id))
    await supabase.from('biens_proprietaires').delete().eq('id',id)
  }

  const searchContacts = async (q) => {
    setContactSearch(q)
    if (!q.trim() || !agence?.id) { setContactResults([]); return }
    const { data } = await supabase.from('contacts').select('id,display,email,tel_mobile').eq('agence_id', agence.id).ilike('display', `%${q}%`).limit(8)
    setContactResults(data||[])
  }
  const addOpportunite = async (contact) => {
    const { data, error } = await supabase.from('opportunites_vente').insert({
      bien_id: selectedBien.id, contact_id: contact.id, statut: 'visite_prevue',
    }).select('*, contacts(id,display,email,tel_mobile)').single()
    if (error) { toast.error(error.message); return }
    setBienOpportunites(o=>[data, ...o])
    setShowAddOpp(false); setContactSearch(''); setContactResults([])
  }
  const updateOpportuniteStatut = async (id, statut) => {
    setBienOpportunites(o=>o.map(x=>x.id===id?{...x,statut}:x))
    await supabase.from('opportunites_vente').update({ statut, updated_at: new Date().toISOString() }).eq('id', id)
  }
  const deleteOpportunite = async (id) => {
    setBienOpportunites(o=>o.filter(x=>x.id!==id))
    await supabase.from('opportunites_vente').delete().eq('id', id)
  }

  // ── Phase 5 : compteurs, assurances, taxes ──
  const addCompteur = async () => {
    if (!newCompteur.type_compteur) { toast.error('Type de compteur requis'); return }
    const { data, error } = await supabase.from('compteurs').insert({
      bien_id: selectedBien.id, ...newCompteur,
      numero: newCompteur.numero||null, fournisseur: newCompteur.fournisseur||null, unite: newCompteur.unite||null,
      souscripteur: newCompteur.souscripteur||null,
    }).select('*').single()
    if (error) { toast.error(error.message); return }
    setBienCompteurs(c=>[{ ...data, dernier_releve:null }, ...c])
    setShowAddCompteur(false)
    setNewCompteur({ type_compteur:'', numero:'', fournisseur:'', unite:'', individuel_collectif:'individuel', souscripteur:'' })
  }
  const deleteCompteur = async (id) => {
    setBienCompteurs(c=>c.filter(x=>x.id!==id))
    await supabase.from('compteurs').delete().eq('id', id)
  }
  const addReleve = async (compteurId) => {
    const draft = newReleve[compteurId]
    if (!draft?.valeur) { toast.error('Valeur du releve requise'); return }
    const { data, error } = await supabase.from('releves_compteurs').insert({
      compteur_id: compteurId, valeur: Number(draft.valeur), date_releve: draft.date_releve || new Date().toISOString().slice(0,10),
    }).select('*').single()
    if (error) { toast.error(error.message); return }
    setBienCompteurs(c=>c.map(x=>x.id===compteurId?{...x, dernier_releve:data}:x))
    setNewReleve(r=>({ ...r, [compteurId]: undefined }))
    toast.success('Releve enregistre')
  }

  const addAssurance = async () => {
    if (!newAssurance.assureur) { toast.error('Assureur requis'); return }
    const payload = { bien_id: selectedBien.id, ...newAssurance,
      numero_police: newAssurance.numero_police||null, type_assurance: newAssurance.type_assurance||null,
      prime: newAssurance.prime?Number(newAssurance.prime):null,
      montant_couvert: newAssurance.montant_couvert?Number(newAssurance.montant_couvert):null,
      date_debut: newAssurance.date_debut||null, date_expiration: newAssurance.date_expiration||null,
    }
    const { data, error } = await supabase.from('assurances').insert(payload).select('*').single()
    if (error) { toast.error(error.message); return }
    setBienAssurances(a=>[data, ...a])
    setShowAddAssurance(false)
    setNewAssurance({ assureur:'', numero_police:'', type_assurance:'', date_debut:'', date_expiration:'', prime:'', montant_couvert:'' })
  }
  const deleteAssurance = async (id) => {
    setBienAssurances(a=>a.filter(x=>x.id!==id))
    await supabase.from('assurances').delete().eq('id', id)
  }

  const addTaxe = async () => {
    if (!newTaxe.type_taxe) { toast.error('Type de taxe requis'); return }
    const payload = { bien_id: selectedBien.id, ...newTaxe,
      montant: newTaxe.montant?Number(newTaxe.montant):null,
      date_echeance: newTaxe.date_echeance||null,
    }
    const { data, error } = await supabase.from('taxes_bien').insert(payload).select('*').single()
    if (error) { toast.error(error.message); return }
    setBienTaxes(t=>[...t, data].sort((a,b)=>(a.date_echeance||'').localeCompare(b.date_echeance||'')))
    setShowAddTaxe(false)
    setNewTaxe({ type_taxe:'', montant:'', date_echeance:'', frequence:'annuelle', statut:'a_jour' })
  }
  const deleteTaxe = async (id) => {
    setBienTaxes(t=>t.filter(x=>x.id!==id))
    await supabase.from('taxes_bien').delete().eq('id', id)
  }

  const addSinistre = async () => {
    if (!newSinistre.type_sinistre) { toast.error('Type de sinistre requis'); return }
    const payload = { bien_id: selectedBien.id, ...newSinistre,
      assurance_id: newSinistre.assurance_id||null,
      cout: newSinistre.cout?Number(newSinistre.cout):null,
      date_sinistre: newSinistre.date_sinistre||null,
    }
    const { data, error } = await supabase.from('sinistres').insert(payload).select('*').single()
    if (error) { toast.error(error.message); return }
    setBienSinistres(s=>[data, ...s])
    setShowAddSinistre(false)
    setNewSinistre({ type_sinistre:'', date_sinistre:'', description:'', gravite:'moderee', assurance_id:'', cout:'', statut:'declare' })
  }
  const deleteSinistre = async (id) => {
    setBienSinistres(s=>s.filter(x=>x.id!==id))
    await supabase.from('sinistres').delete().eq('id', id)
  }

  // ── Phase 7 : documents (Storage) + historique ──
  const addDocument = async () => {
    if (!newDocument.file || !newDocument.nom) { toast.error('Nom et fichier requis'); return }
    setUploadingDoc(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const path = `${agence.id}/bien/${selectedBien.id}/${Date.now()}_${newDocument.file.name}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, newDocument.file)
      if (upErr) throw upErr
      const { data, error } = await supabase.from('documents').insert({
        agence_id: agence.id, entite_type:'bien', entite_id: selectedBien.id,
        type_document: newDocument.type_document||'autre', categorie: newDocument.categorie||null,
        nom: newDocument.nom, fichier_url: path, visibilite: newDocument.visibilite,
        created_by: user.id,
      }).select('*').single()
      if (error) throw error
      const { data: signed } = await supabase.storage.from('documents').createSignedUrl(path, 3600)
      setBienDocuments(d=>[{ ...data, signed_url: signed?.signedUrl||null }, ...d])
      setShowAddDocument(false)
      setNewDocument({ nom:'', type_document:'', categorie:'', visibilite:'interne_agence', file:null })
      toast.success('Document ajoute')
    } catch(e) { toast.error(e.message||'Erreur upload') }
    finally { setUploadingDoc(false) }
  }
  const deleteDocument = async (doc) => {
    setBienDocuments(d=>d.filter(x=>x.id!==doc.id))
    await supabase.storage.from('documents').remove([doc.fichier_url])
    await supabase.from('documents').delete().eq('id', doc.id)
  }

  const logHistorique = async (action, champ, ancienne, nouvelle) => {
    const { data:{ user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('historique').insert({
      agence_id: agence.id, entite_type:'bien', entite_id: selectedBien.id,
      action, champ_modifie: champ, ancienne_valeur: ancienne!=null?String(ancienne):null, nouvelle_valeur: nouvelle!=null?String(nouvelle):null,
      utilisateur_id: user.id, utilisateur_email: user.email,
    }).select('*').single()
    if (!error) setBienHistorique(h=>[data, ...h])
  }

  const resetForm = () => {
    setStep(1)
    setSelectedProp(null)
    setPropSearch('')
    setMultiProp(false)
    setCoProprietaires([])
    setShowPaysOverride(false)
    setForm({
      nom:'', type:'', statut:'', statut_vente:'', intention:'',
      pays:'', adresse:'', ville:'', quartier:'',
      superficie:'', loyer:'', prix_vente_demande:'',
      nb_pieces:'', nb_chambres:'', nb_sdb:'', meuble:false,
      description:'',
    })
  }

  // Filtrages
  const filtered = biens.filter(b => {
    const matchSearch  = `${b.nom} ${b.adresse||''} ${b.ville||''} ${b.type||''}`.toLowerCase().includes(search.toLowerCase())
    const matchStatut  = filterStatut === 'tous' || b.statut === filterStatut
    const matchSpecial =
      specialFilter==='immeubles' ? b.is_immeuble===true :
      specialFilter==='a_vendre'  ? b.statut_vente==='a_vendre' :
      specialFilter==='vendus'    ? b.statut_vente==='vendu' :
      true
    return matchSearch && matchStatut && matchSpecial
  })
  const filteredProps = proprietaires.filter(p =>
    `${p.prenom||''} ${p.nom||''} ${p.telephone||''}`.toLowerCase().includes(propSearch.toLowerCase())
  )

  const toggleSelect = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll    = () => setSelected(s=>s.length===filtered.length?[]:filtered.map(b=>b.id))
  const rowH         = viewMode==='compact' ? '40px' : '52px'

  const stats = {
    total:       biens.length,
    libres:      biens.filter(b=>b.statut==='disponible').length,
    occupes:     biens.filter(b=>b.statut==='occupe').length,
    maintenance: biens.filter(b=>b.statut==='maintenance'||b.statut==='renovation').length,
    revenus:     biens.filter(b=>b.statut==='occupe').reduce((a,b)=>a+(b.loyer_mensuel||b.loyer||0),0),
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

  const StatutBadge = ({ statut, size=12, catalogue=statutsBiens }) => {
    const cfg = getStatutCfg(catalogue, statut)
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
        .pb-dropdown{position:absolute;top:calc(100% + 6px);left:0;min-width:220px;max-height:320px;overflow-y:auto;background:#1c2128;border:1px solid rgba(255,255,255,0.1);border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,0.45);z-index:50;padding:5px}
        .pb-dropdown-item{display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:5px;font-size:13px;color:rgba(255,255,255,0.65);cursor:pointer;transition:background 0.1s;white-space:nowrap}
        .pb-dropdown-item:hover{background:rgba(255,255,255,0.06)}
        .pb-dropdown-item.on{background:rgba(0,120,212,0.1);color:#4da6ff;font-weight:600}
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
        .pb-add-panel{width:min(1180px,94vw)}
        .pb-add-body{display:flex;flex:1;overflow:hidden}
        .pb-steps-v{width:230px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.07);padding:24px 0;display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,0.15)}
        .pb-step-v{display:flex;align-items:flex-start;gap:12px;padding:13px 24px;cursor:pointer;transition:background 0.15s;border-left:3px solid transparent;position:relative}
        .pb-step-v:hover{background:rgba(255,255,255,0.04)}
        .pb-step-v.active{background:rgba(0,120,212,0.07);border-left-color:#0078d4}
        .pb-step-v.done{border-left-color:#00c896}
        .pb-step-v-n{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);margin-top:1px}
        .pb-step-v-n.active{background:#0078d4;color:#fff}
        .pb-step-v-n.done{background:#00c896;color:#fff}
        .pb-step-v-lbl{font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.5)}
        .pb-step-v.active .pb-step-v-lbl{color:#e6edf3}
        .pb-step-v.done .pb-step-v-lbl{color:rgba(255,255,255,0.6)}
        .pb-step-v-desc{font-size:11.5px;color:rgba(255,255,255,0.25);margin-top:2px}
        .pb-step-content{flex:1;overflow-y:auto;padding:40px 56px}
        .pb-step-inner{max-width:680px}
        .pb-step-title{font-size:23px;font-weight:800;color:#f5f8fb;margin-bottom:8px;letter-spacing:-0.01em}
        .pb-step-sub{font-size:13.5px;color:rgba(255,255,255,0.45);margin-bottom:28px;line-height:1.65}
        .pb-req{color:#ef4444;margin-left:3px}

        /* ─ Champs ─ */
        .pb-g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .pb-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px}
        .pb-field{margin-bottom:14px}
        .pb-lbl{display:block;font-size:13px;font-weight:400;color:rgba(255,255,255,0.85);margin-bottom:6px}
        .pb-inp{width:100%;padding:8px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.3);border-radius:2px;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .pb-inp:focus{border-color:#4da6ff}
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
        .pb-statut-pill{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.15s;font-size:13px;font-weight:500;color:rgba(255,255,255,0.5)}
        .pb-statut-pill:hover{border-color:rgba(255,255,255,0.18)}
        .pb-statut-pill.on{font-weight:600}

        /* ─ Proprietaire search ─ */
        .pb-prop-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;border:1px solid transparent;cursor:pointer;transition:all 0.1s}
        .pb-prop-item:hover{background:rgba(255,255,255,0.04)}
        .pb-prop-item.on{border-color:rgba(0,120,212,0.35);background:rgba(0,120,212,0.08)}
        .pb-prop-list{border:1px solid rgba(255,255,255,0.08);border-radius:8px;max-height:340px;overflow-y:auto;padding:4px}
        .pb-prop-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}

        /* ─ Detail panel ─ */
        .pb-detail-panel{width:min(600px,96vw)}
        .pb-detail-head{padding:24px 28px 0;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .pb-detail-tabs{display:flex;margin-top:18px;overflow-x:auto}
        .pb-detail-tab{padding:10px 18px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap;flex-shrink:0}
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
        <div className="pb-title">
          {specialFilter==='opportunites'?'Opportunites de vente':specialFilter==='immeubles'?'Immeubles':specialFilter==='a_vendre'?'Biens a vendre':specialFilter==='vendus'?'Ventes conclues':'Biens immobiliers'}
        </div>
        <div className="pb-sub">
          {specialFilter==='opportunites'
            ?`${oppList.length} opportunite${oppList.length!==1?'s':''} — ${agence?.nom||'votre agence'}`
            :`${biens.length} bien${biens.length!==1?'s':''} enregistre${biens.length!==1?'s':''} — ${agence?.nom||'votre agence'}`}
        </div>

        {specialFilter==='opportunites'?(
        <>
          {/* Table Opportunites (vue transversale) */}
          <div className="pb-tw">
            <div style={{overflowX:'auto'}}>
              <table className="pb-table">
                <thead>
                  <tr>
                    <th>Bien</th>
                    <th>Contact</th>
                    <th>Statut</th>
                    <th>Offre</th>
                    <th>Date offre</th>
                  </tr>
                </thead>
                <tbody>
                  {oppLoading?(
                    <tr><td colSpan={5} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</td></tr>
                  ):oppList.length===0?(
                    <tr><td colSpan={5}>
                      <div className="pb-empty">
                        <User size={44} style={{marginBottom:14,opacity:0.3}}/>
                        <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>Aucune opportunite de vente</div>
                      </div>
                    </td></tr>
                  ):oppList.map(o=>(
                    <tr key={o.id} onClick={()=>openBienFromOpp(o.bien_id)}>
                      <td style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{o.biens?.nom||'—'}</td>
                      <td style={{fontSize:12.5,color:'rgba(255,255,255,0.6)'}}>{o.contacts?.display||'Contact supprime'}</td>
                      <td onClick={e=>e.stopPropagation()}>
                        <StatutPicker statutsBiens={OPPORTUNITE_STATUTS} value={o.statut} onChange={v=>updateOppListStatut(o.id,v)} size="small"/>
                      </td>
                      <td style={{fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{o.montant_offre?fmt(o.montant_offre)+' FCFA':'—'}</td>
                      <td style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{o.date_offre?new Date(o.date_offre).toLocaleDateString('fr-FR'):'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
        ):(
        <>
        {/* Stats */}
        <div className="pb-stats">
          {[
            {ic:Building2, lbl:'Total',        val:stats.total,       col:'#e6edf3'},
            {dot:true,     lbl:'Libres',       val:stats.libres,      col:'#00c896'},
            {dot:true,     lbl:'Occupes',      val:stats.occupes,     col:'#0078d4'},
            {dot:true,     lbl:'Maintenance',  val:stats.maintenance, col:'#f59e0b'},
            {ic:Wallet,    lbl:'Revenus/mois', val:fmt(stats.revenus)+' FCFA', col:'#00c896', small:true},
          ].map((s,i)=>(
            <div key={i} className="pb-stat">
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                {s.dot ? <span style={{width:9,height:9,borderRadius:'50%',background:s.col,flexShrink:0}}/> : <s.ic size={16} color={s.col}/>}
                <span className="pb-stat-lbl">{s.lbl}</span>
              </div>
              <div className="pb-stat-val" style={{color:s.col,fontSize:s.small?16:22}}>{s.val}</div>
            </div>
          ))}
        </div>
        {stats.total>0 && (
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,fontSize:12,color:'rgba(255,255,255,0.4)'}}>
            <span style={{flexShrink:0}}>Taux d'occupation</span>
            <ProgressBar value={stats.occupes} max={stats.total} color="#0078d4" style={{flex:1}}/>
            <span style={{flexShrink:0,fontWeight:700,color:'#e6edf3'}}>{Math.round((stats.occupes/stats.total)*100)}%</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="pb-toolbar">
          <button className="pb-btn pb-btn-p" onClick={()=>{resetForm();setShowAddPanel(true)}}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Ajouter un bien
          </button>
          <button className="pb-btn" onClick={initData}><RefreshCw size={13}/></button>
          <div className="pb-sep"/>
          <button className="pb-btn pb-btn-g" onClick={exportCSV}>
            <Download size={13}/> Exporter{selected.length>0&&` (${selected.length})`}
          </button>
          {selected.length>0&&(
            <button className="pb-btn pb-btn-r" onClick={()=>deleteBiens(selected)}>
              <Trash2 size={13}/> Supprimer ({selected.length})
            </button>
          )}
          <div className="pb-search">
            <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un bien..."/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>×</button>}
          </div>
        </div>

        {/* Filtre statut — catalogue dynamique (Centre d'administration > Parametres) */}
        <div style={{marginBottom:16}}>
          <StatutPicker statutsBiens={statutsBiens} value={filterStatut} onChange={setFilterStatut} allowTous/>
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
                      <Home size={44} style={{marginBottom:14,opacity:0.3}}/>
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
                  const IcComp = getTypeInfo(typesBiens, b.type_bien || b.type).icon
                  const avH   = viewMode==='compact' ? 26 : 32
                  const statutColor = getStatutCfg(statutsBiens, b.statut).color
                  return (
                    <tr key={b.id} className={isSel?'sel':''} onClick={()=>{setSelectedBien(b);setDetailTab('infos')}}>
                      <td className="ind-td" style={{'--ind-c':statutColor}} onClick={e=>{e.stopPropagation();toggleSelect(b.id)}}>
                        <div className={`pb-cb ${isSel?'on':''}`}>
                          {isSel&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{position:'relative',width:avH,height:avH,borderRadius:7,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <IcComp size={viewMode==='compact'?13:17}/>
                            <StatusDot color={statutColor} size={7} ring="#161b22"/>
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
        </>
        )}
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

                {/* ── Step 1 : Type & intention ── */}
                {step===1&&(<div className="pb-step-inner">
                  <div className="pb-step-title">Type de bien et intention</div>
                  <div className="pb-step-sub">Recherchez le type precis, puis indiquez si ce bien est destine a la location, la vente, ou les deux.</div>
                  <div className="pb-sec" style={{marginTop:0,display:'flex',alignItems:'center'}}>Type de bien<span className="pb-req">*</span></div>
                  {configLoading?(
                    <div style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Chargement du catalogue...</div>
                  ):(
                    <TypeSearchList typesParCategorie={typesParCategorie} value={form.type} onChange={v=>setF('type',v)}/>
                  )}
                  <div className="pb-sec" style={{display:'flex',alignItems:'center'}}>Intention<span className="pb-req">*</span></div>
                  <div className="pb-type-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
                    {INTENTIONS.map(it=>(
                      <div key={it.val} className={`pb-type-item ${form.intention===it.val?'on':''}`} onClick={()=>setF('intention',it.val)}>
                        <div className="pb-type-ic-lg"><it.icon size={22}/></div>
                        <div className="pb-type-lbl">{it.label}</div>
                      </div>
                    ))}
                  </div>
                </div>)}

                {/* ── Step 2 : Identification ── */}
                {step===2&&(<div className="pb-step-inner">
                  <div className="pb-step-title">Identification</div>
                  <div className="pb-step-sub">Nom du bien et statut actuel. La reference interne est generee automatiquement a la creation.</div>
                  <div className="pb-field">
                    <label className="pb-lbl">Nom du bien<span className="pb-req">*</span></label>
                    <input className="pb-inp" autoFocus value={form.nom} onChange={e=>setF('nom',e.target.value)} placeholder="Ex: Villa les Cocotiers, Appart Lot 14..."/>
                  </div>
                  <div className="pb-sec" style={{display:'flex',alignItems:'center'}}>Statut actuel<span className="pb-req">*</span></div>
                  <StatutPicker statutsBiens={statutsBiens} value={form.statut} onChange={v=>setF('statut',v)}/>
                  {!form.statut&&<div style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginTop:8}}>Choisissez le statut actuel du bien pour continuer.</div>}
                  {(form.intention==='vente'||form.intention==='les_deux')&&(<>
                    <div className="pb-sec">Statut de vente</div>
                    <StatutPicker statutsBiens={statutsVente} value={form.statut_vente} onChange={v=>setF('statut_vente',v)}/>
                  </>)}
                </div>)}

                {/* ── Step 3 : Localisation ── */}
                {step===3&&(<div className="pb-step-inner">
                  <div className="pb-step-title">Localisation</div>
                  <div className="pb-step-sub">Adresse du bien{(form.pays||agence?.pays)?` — champs adaptes au ${form.pays||agence.pays}`:''}.</div>

                  {!showPaysOverride?(
                    <button className="pb-blk-link" style={{marginBottom:18}} onClick={()=>setShowPaysOverride(true)}>
                      Ce bien est dans un autre pays que {agence?.pays||'votre organisation'} ?
                    </button>
                  ):(
                    <div className="pb-field">
                      <label className="pb-lbl">Pays du bien</label>
                      <select className="pb-inp" style={{maxWidth:280}} value={form.pays||agence?.pays||''} onChange={e=>setF('pays',e.target.value)}>
                        {paysActifs.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                      {form.pays && !paysActifs.includes(form.pays) && (
                        <div style={{marginTop:8,fontSize:12.5,color:'#f59e0b'}}>
                          {profile?.role==='global_admin'
                            ? <>Ce pays n'est pas encore configure pour votre organisation. <span className="pb-blk-link" onClick={()=>navigate('/agence/organisation')}>Configurer maintenant →</span></>
                            : "Ce pays n'est pas configure pour votre organisation. Contactez votre administrateur pour l'ajouter."}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pb-g2">
                    <div>
                      <label className="pb-lbl">Ville</label>
                      <VilleCombobox villes={villes} value={form.ville} onChange={v=>setF('ville',v)}/>
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
                </div>)}

                {/* ── Step 4 : Caracteristiques essentielles ── */}
                {step===4&&(<div className="pb-step-inner">
                  <div className="pb-step-title">Caracteristiques essentielles</div>
                  <div className="pb-step-sub">Le reste (equipements, compteurs, documents...) se complete depuis la fiche du bien apres creation.</div>
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
                  <div className="pb-field">
                    <label className="pb-lbl">Salles de bain</label>
                    <input className="pb-inp" type="number" min="0" value={form.nb_sdb} onChange={e=>setF('nb_sdb',e.target.value)} placeholder="1" style={{maxWidth:160}}/>
                  </div>
                  <div className="pb-statut-pill" style={{display:'inline-flex',marginBottom:16,borderColor: form.meuble?'#0078d4':'rgba(255,255,255,0.08)', background: form.meuble?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)', color: form.meuble?'#4da6ff':'rgba(255,255,255,0.5)'}}
                    onClick={()=>setF('meuble',!form.meuble)}>
                    {form.meuble&&<Check size={14}/>} Bien meuble
                  </div>
                  <div className="pb-field">
                    <label className="pb-lbl">Description</label>
                    <textarea className="pb-inp" rows={3} value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Description du bien, equipements, acces..." style={{resize:'vertical',minHeight:80}}/>
                  </div>
                </div>)}

                {/* ── Step 5 : Proprietaire ── */}
                {step===5&&(<div className="pb-step-inner">
                  <div className="pb-step-title">Associer un proprietaire</div>
                  <div className="pb-step-sub">Optionnel — Selectionnez le proprietaire de ce bien parmi ceux deja associes a votre agence.</div>

                  {proprietaires.length>0&&(
                    <div className="pb-statut-pill" style={{display:'inline-flex',marginBottom:16,borderColor: multiProp?'#0078d4':'rgba(255,255,255,0.08)', background: multiProp?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)', color: multiProp?'#4da6ff':'rgba(255,255,255,0.5)'}}
                      onClick={()=>setMultiProp(m=>!m)}>
                      {multiProp&&<Check size={14}/>} Ce bien a plusieurs proprietaires
                    </div>
                  )}

                  {multiProp?(
                    <div>
                      {coProprietaires.map((c,i)=>(
                        <div key={i} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                          <select className="pb-inp" style={{flex:1}} value={c.proprietaire?.id||''}
                            onChange={e=>{
                              const prop = proprietaires.find(p=>p.id===e.target.value)
                              setCoProprietaires(cs=>cs.map((x,xi)=>xi===i?{...x,proprietaire:prop}:x))
                            }}>
                            <option value="">Choisir un proprietaire...</option>
                            {proprietaires.map(p=><option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                          </select>
                          <input className="pb-inp" type="number" min="0" max="100" style={{width:90}} placeholder="%"
                            value={c.pourcentage} onChange={e=>setCoProprietaires(cs=>cs.map((x,xi)=>xi===i?{...x,pourcentage:e.target.value}:x))}/>
                          <button className="pb-cls" onClick={()=>setCoProprietaires(cs=>cs.filter((_,xi)=>xi!==i))}>×</button>
                        </div>
                      ))}
                      <button className="pb-btn" style={{marginBottom:10}} onClick={()=>setCoProprietaires(cs=>[...cs,{proprietaire:null,pourcentage:''}])}>+ Ajouter un proprietaire</button>
                      <div style={{fontSize:12.5,color: (coProprietaires.reduce((s,c)=>s+(Number(c.pourcentage)||0),0)===100)?'#00c896':'#f59e0b'}}>
                        Total : {coProprietaires.reduce((s,c)=>s+(Number(c.pourcentage)||0),0)}% {coProprietaires.reduce((s,c)=>s+(Number(c.pourcentage)||0),0)!==100&&'(doit faire 100%)'}
                      </div>
                    </div>
                  ):proprietaires.length===0?(
                    <div style={{padding:'18px 20px',borderRadius:10,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13.5,color:'rgba(255,255,255,0.5)',lineHeight:1.7}}>
                      Aucun proprietaire associe a votre agence pour le moment.
                      <span style={{color:'#4da6ff',cursor:'pointer',marginLeft:6,display:'inline-flex',alignItems:'center',gap:4}} onClick={()=>navigate('/imoloc/proprietaires')}>
                        Ajouter un proprietaire <ArrowRight size={12}/>
                      </span>
                    </div>
                  ):(
                    <>
                      <label className="pb-lbl" style={{marginBottom:7}}>Ajouter, basculer, ou supprimer</label>
                      <div className="pb-field">
                        <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px'}}>
                          <Search size={13} color="rgba(255,255,255,0.3)"/>
                          <input style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}}
                            value={propSearch} onChange={e=>setPropSearch(e.target.value)}
                            placeholder="Rechercher par nom ou telephone..."/>
                        </div>
                      </div>
                      <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'12px 0 6px'}}>Resultats</div>
                      <div className="pb-prop-list">
                        <div className={`pb-prop-item ${!selectedProp?'on':''}`} onClick={()=>setSelectedProp(null)}>
                          <div className="pb-prop-avatar" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)'}}><Ban size={13} color="rgba(255,255,255,0.4)"/></div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.75)'}}>Aucun proprietaire</div>
                            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.3)'}}>Ajouter plus tard</div>
                          </div>
                          {!selectedProp&&<Check size={15} color="#00c896"/>}
                        </div>
                        {filteredProps.map((p,i)=>{
                          const cols_p = ['#0078d4','#6c63ff','#00c896','#f59e0b','#4da6ff','#a78bfa']
                          const col_p  = cols_p[i % cols_p.length]
                          const isOn   = selectedProp?.id===p.id
                          return (
                            <div key={p.id} className={`pb-prop-item ${isOn?'on':''}`} onClick={()=>setSelectedProp(p)}>
                              <div className="pb-prop-avatar" style={{background:`linear-gradient(135deg,${col_p},${col_p}88)`}}>
                                {((p.prenom?.[0]||'')+(p.nom?.[0]||'')).toUpperCase()||'?'}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{p.prenom} {p.nom}</div>
                                <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{p.telephone||'Pas de tel'}</div>
                              </div>
                              {isOn?<Check size={15} color="#00c896"/>:<Circle size={14} color="rgba(255,255,255,0.15)"/>}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>)}

                {/* ── Step 6 : Finances de base ── */}
                {step===6&&(<div className="pb-step-inner">
                  <div className="pb-step-title">Finances de base</div>
                  <div className="pb-step-sub">Le detail (charges, taxes, commission...) se complete depuis la fiche du bien.</div>
                  {(form.intention==='location'||form.intention==='les_deux')&&(
                    <div className="pb-field">
                      <label className="pb-lbl">Loyer mensuel (FCFA)</label>
                      <input className="pb-inp" type="number" min="0" value={form.loyer} onChange={e=>setF('loyer',e.target.value)} placeholder="75000"/>
                    </div>
                  )}
                  {(form.intention==='vente'||form.intention==='les_deux')&&(
                    <div className="pb-field">
                      <label className="pb-lbl">Prix de vente demande (FCFA)</label>
                      <input className="pb-inp" type="number" min="0" value={form.prix_vente_demande} onChange={e=>setF('prix_vente_demande',e.target.value)} placeholder="25000000"/>
                    </div>
                  )}
                </div>)}

                {/* ── Step 7 : Recap ── */}
                {step===7&&(<div className="pb-step-inner">
                  <div className="pb-step-title">Recapitulatif</div>
                  <div className="pb-step-sub">Verifiez les informations avant de creer le bien.</div>
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
                    {[
                      ['Nom',          form.nom],
                      ['Reference',    <span key="r" style={{fontStyle:'italic',color:'rgba(255,255,255,0.35)'}}>Generee a la creation</span>],
                      ['Type',         (()=>{const info=getTypeInfo(typesBiens,form.type);const TIcon=info.icon;return <span style={{display:'inline-flex',alignItems:'center',gap:6}}><TIcon size={14}/>{info.label}</span>})()],
                      ['Intention',    INTENTIONS.find(i=>i.val===form.intention)?.label||form.intention],
                      ['Statut',       getStatutCfg(statutsBiens,form.statut).label],
                      ...(form.intention==='vente'||form.intention==='les_deux' ? [['Statut de vente', form.statut_vente ? getStatutCfg(statutsVente,form.statut_vente).label : '—']] : []),
                      ['Adresse',      form.adresse?`${form.adresse}${form.quartier?', '+form.quartier:''}, ${form.ville}`:form.ville||'—'],
                      ['Superficie',   form.superficie?form.superficie+' m²':'—'],
                      ['Meuble',       form.meuble?'Oui':'Non'],
                      ['Loyer',        form.loyer?fmt(form.loyer)+' FCFA/mois':'—'],
                      ['Prix de vente',form.prix_vente_demande?fmt(form.prix_vente_demande)+' FCFA':'—'],
                      ['Pieces',       form.nb_pieces?form.nb_pieces+' pieces / '+form.nb_chambres+' chambres':'—'],
                      ['Proprietaire(s)', multiProp
                        ? coProprietaires.filter(c=>c.proprietaire).map(c=>`${c.proprietaire.prenom} ${c.proprietaire.nom} (${c.pourcentage}%)`).join(', ') || 'Non attribue'
                        : (selectedProp?`${selectedProp.prenom} ${selectedProp.nom}`:'Non attribue')],
                      ['Agence',       agence?.nom||'—'],
                    ].map(([k,v],i,arr)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                        <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',flexShrink:0,width:130}}>{k}</span>
                        <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>)}
              </div>
            </div>

            {/* Footer */}
            <div className="pb-pf">
              <button className="pb-pfb pb-pfb-g" onClick={()=>{ if(step===1){setShowAddPanel(false);resetForm()} else setStep(step-1) }}>
                {step===1?'Annuler':'Precedent'}
              </button>
              {step<7?(
                <button className="pb-pfb pb-pfb-b" disabled={!canProceedStep(step)}
                  style={{opacity:!canProceedStep(step)?0.4:1}}
                  onClick={()=>setStep(step+1)}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:6}}>Suivant <ArrowRight size={14}/></span>
                </button>
              ):(
                <button className="pb-pfb pb-pfb-b" disabled={saving||!canProceedStep(2)}
                  style={{opacity:saving||!canProceedStep(2)?0.4:1}}
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
                  <div style={{width:56,height:56,borderRadius:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {(()=>{const TIcon=getTypeInfo(typesBiens, selectedBien.type_bien||selectedBien.type).icon;return <TIcon size={26}/>})()}
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
                  {ic:FileText,lbl:'Voir les baux',   action:()=>navigate('/agence/baux')},
                  {ic:Wallet,  lbl:'Paiements',        action:()=>navigate('/agence/paiements')},
                  {ic:editMode?X:Pencil, lbl:editMode?'Annuler la modification':'Modifier', action:()=>editMode?setEditMode(false):startEdit()},
                  {ic:Trash2,  lbl:'Supprimer',         action:()=>{
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
                    <a.ic size={14}/> {a.lbl}
                  </span>
                ))}
              </div>

              <div className="pb-detail-tabs">
                {[
                  ['infos','Informations'],
                  ['caracteristiques','Caracteristiques'],
                  ['regles','Regles & options'],
                  ['proprietaire','Propriete & gestion'],
                  ['finances','Finances'],
                  ...(selectedBien.is_immeuble?[['unites','Unites']]:[]),
                  ...((selectedBien.intention==='vente'||selectedBien.intention==='les_deux')?[['vente','Vente']]:[]),
                  ['baux','Baux'],
                  ['paiements','Paiements'],
                  ['compteurs','Compteurs'],
                  ['assurance','Assurance'],
                  ['taxes','Taxes'],
                  ['sinistres','Sinistres'],
                  ['documents','Documents'],
                  ['historique','Historique'],
                ].map(([k,l])=>(
                  <button key={k} className={`pb-detail-tab ${detailTab===k?'active':''}`} onClick={()=>setDetailTab(k)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="pb-pb">
              {/* Tab Informations */}
              {detailTab==='infos'&&(
                editMode?(
                  <>
                    <div className="pb-field">
                      <label className="pb-lbl">Nom du bien</label>
                      <input className="pb-inp" value={editForm.nom} onChange={e=>setE('nom',e.target.value)}/>
                    </div>
                    <div className="pb-field">
                      <label className="pb-lbl">Intention</label>
                      <select className="pb-inp" style={{maxWidth:280}} value={editForm.intention} onChange={e=>setE('intention',e.target.value)}>
                        {INTENTIONS.map(it=><option key={it.val} value={it.val}>{it.label}</option>)}
                      </select>
                    </div>
                    <div className="pb-sec">Statut</div>
                    <div style={{marginBottom:16}}>
                      <StatutPicker statutsBiens={statutsBiens} value={editForm.statut} onChange={v=>setE('statut',v)}/>
                    </div>
                    {(editForm.intention==='vente'||editForm.intention==='les_deux')&&(<>
                      <div className="pb-sec">Statut de vente</div>
                      <div style={{marginBottom:16}}>
                        <StatutPicker statutsBiens={statutsVente} value={editForm.statut_vente} onChange={v=>setE('statut_vente',v)}/>
                      </div>
                    </>)}
                    <div className="pb-g2">
                      <div>
                        <label className="pb-lbl">Ville</label>
                        <input className="pb-inp" value={editForm.ville} onChange={e=>setE('ville',e.target.value)}/>
                      </div>
                      <div>
                        <label className="pb-lbl">Quartier</label>
                        <input className="pb-inp" value={editForm.quartier} onChange={e=>setE('quartier',e.target.value)}/>
                      </div>
                    </div>
                    <div className="pb-field">
                      <label className="pb-lbl">Adresse complete</label>
                      <input className="pb-inp" value={editForm.adresse} onChange={e=>setE('adresse',e.target.value)}/>
                    </div>
                    <div className="pb-field">
                      <label className="pb-lbl">Description</label>
                      <textarea className="pb-inp" rows={3} value={editForm.description} onChange={e=>setE('description',e.target.value)} style={{resize:'vertical',minHeight:70}}/>
                    </div>
                    <button className="pb-btn pb-btn-p" disabled={saving} onClick={saveEdit}>
                      <Save size={13}/> {saving?'Enregistrement...':'Enregistrer'}
                    </button>
                  </>
                ):(
                  <>
                    <div className="pb-detail-grid">
                      <div>
                        {[
                          ['Type',      getTypeInfo(typesBiens, selectedBien.type_bien||selectedBien.type).label],
                          ['Reference', selectedBien.reference],
                          ['Ville',     `${selectedBien.ville||'—'}${selectedBien.quartier?`, ${selectedBien.quartier}`:''}` ],
                          ['Superficie',selectedBien.superficie!=null?selectedBien.superficie+' m²':null],
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
                          ['Intention', INTENTIONS.find(i=>i.val===selectedBien.intention)?.label||'Location'],
                          ...(selectedBien.intention==='vente'||selectedBien.intention==='les_deux'
                            ? [['Statut de vente', selectedBien.statut_vente ? <StatutBadge key="sv" statut={selectedBien.statut_vente} catalogue={statutsVente}/> : null]]
                            : []),
                          ['Adresse',   selectedBien.adresse],
                          ['Meuble',    selectedBien.meuble?'Oui':'Non'],
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
                )
              )}

              {/* Tab Caracteristiques & equipements */}
              {detailTab==='caracteristiques'&&(
                editMode?(
                  <>
                    <div className="pb-g3">
                      <div>
                        <label className="pb-lbl">Superficie (m²)</label>
                        <input className="pb-inp" type="number" value={editForm.superficie} onChange={e=>setE('superficie',e.target.value)}/>
                      </div>
                      <div>
                        <label className="pb-lbl">Nb pieces</label>
                        <input className="pb-inp" type="number" value={editForm.nombre_pieces} onChange={e=>setE('nombre_pieces',e.target.value)}/>
                      </div>
                      <div>
                        <label className="pb-lbl">Chambres</label>
                        <input className="pb-inp" type="number" value={editForm.nombre_chambres} onChange={e=>setE('nombre_chambres',e.target.value)}/>
                      </div>
                    </div>
                    <div className="pb-field">
                      <label className="pb-lbl">Salles de bain</label>
                      <input className="pb-inp" type="number" style={{maxWidth:160}} value={editForm.nombre_salles_bain} onChange={e=>setE('nombre_salles_bain',e.target.value)}/>
                    </div>
                    <div className="pb-statut-pill" style={{display:'inline-flex',marginBottom:8,borderColor: editForm.meuble?'#0078d4':'rgba(255,255,255,0.08)', background: editForm.meuble?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)', color: editForm.meuble?'#4da6ff':'rgba(255,255,255,0.5)'}}
                      onClick={()=>setE('meuble',!editForm.meuble)}>
                      {editForm.meuble&&<Check size={14}/>} Bien meuble
                    </div>
                    <button className="pb-btn pb-btn-p" style={{display:'block',marginTop:10}} disabled={saving} onClick={saveEdit}>
                      <Save size={13}/> {saving?'Enregistrement...':'Enregistrer'}
                    </button>
                  </>
                ):(
                  <>
                    <div className="pb-detail-grid" style={{marginBottom:10}}>
                      <div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Superficie</div><div className="pb-blk-val">{selectedBien.superficie!=null?selectedBien.superficie+' m²':'Non renseigne'}</div></div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Pieces</div><div className="pb-blk-val">{selectedBien.nombre_pieces ?? 'Non renseigne'}</div></div>
                      </div>
                      <div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Chambres / SDB</div><div className="pb-blk-val">{selectedBien.nombre_chambres??'—'} / {selectedBien.nombre_salles_bain??'—'}</div></div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Meuble</div><div className="pb-blk-val">{selectedBien.meuble?'Oui':'Non'}</div></div>
                      </div>
                    </div>
                    <div className="pb-divider"/>
                    <div className="pb-sec">Equipements</div>
                    {detailLoading?(
                      <div style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Chargement...</div>
                    ):(
                      Object.entries(equipementsParCategorie).map(([cat,items])=>(
                        <div key={cat} style={{marginBottom:16}}>
                          <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{cat.replace(/_/g,' ')}</div>
                          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                            {items.map(eq=>{
                              const on = bienEquip.some(be=>be.equipement_id===eq.id)
                              return (
                                <div key={eq.id} onClick={()=>toggleBienEquip(eq.id)}
                                  style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:100,fontSize:12,cursor:'pointer',
                                    border:`1px solid ${on?'#0078d4':'rgba(255,255,255,0.09)'}`,
                                    background:on?'rgba(0,120,212,0.12)':'rgba(255,255,255,0.02)',
                                    color:on?'#4da6ff':'rgba(255,255,255,0.45)'}}>
                                  {on&&<Check size={11}/>} {eq.label}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )
              )}

              {/* Tab Regles & options (points 35-37, 39-40) */}
              {detailTab==='regles'&&(
                editMode?(
                  <>
                    <div className="pb-sec" style={{marginTop:0}}>Regles et restrictions</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
                      {[
                        ['animaux_autorises','Animaux autorises'],
                        ['fumeurs_autorises','Fumeurs autorises'],
                        ['sous_location_autorisee','Sous-location autorisee'],
                        ['colocation_autorisee','Colocation autorisee'],
                        ['activite_pro_autorisee','Activite professionnelle autorisee'],
                        ['location_courte_duree_autorisee','Location courte duree autorisee'],
                      ].map(([key,label])=>(
                        <div key={key} className="pb-statut-pill" style={{borderColor:editForm[key]?'#0078d4':'rgba(255,255,255,0.08)',background:editForm[key]?'rgba(0,120,212,0.1)':'rgba(255,255,255,0.02)',color:editForm[key]?'#4da6ff':'rgba(255,255,255,0.5)'}}
                          onClick={()=>setE(key,!editForm[key])}>
                          {editForm[key]&&<Check size={14}/>} {label}
                        </div>
                      ))}
                    </div>
                    <div className="pb-field">
                      <label className="pb-lbl">Restrictions particulieres</label>
                      <textarea className="pb-inp" rows={3} value={editForm.regles} onChange={e=>setE('regles',e.target.value)} style={{resize:'vertical',minHeight:70}} placeholder="Notes libres sur des restrictions specifiques a ce bien..."/>
                    </div>

                    {editForm.location_courte_duree_autorisee&&(<>
                      <div className="pb-divider"/>
                      <div className="pb-sec">Location courte duree</div>
                      <div className="pb-g2">
                        <div>
                          <label className="pb-lbl">Heure d'arrivee (check-in)</label>
                          <input className="pb-inp" type="time" value={editForm.checkin_heure} onChange={e=>setE('checkin_heure',e.target.value)}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Heure de depart (check-out)</label>
                          <input className="pb-inp" type="time" value={editForm.checkout_heure} onChange={e=>setE('checkout_heure',e.target.value)}/>
                        </div>
                      </div>
                      <div className="pb-g2">
                        <div>
                          <label className="pb-lbl">Tarif par nuit (FCFA)</label>
                          <input className="pb-inp" type="number" value={editForm.tarif_nuitee} onChange={e=>setE('tarif_nuitee',e.target.value)}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Nombre minimum de nuits</label>
                          <input className="pb-inp" type="number" value={editForm.nuits_minimum} onChange={e=>setE('nuits_minimum',e.target.value)}/>
                        </div>
                      </div>
                    </>)}

                    {environnementalSchema.length>0&&(<>
                      <div className="pb-divider"/>
                      <div className="pb-sec">Informations environnementales</div>
                      {environnementalSchema.map(champ=>(
                        <div key={champ.cle} className="pb-field">
                          <label className="pb-lbl">{champ.label}</label>
                          <input className="pb-inp" value={editForm.environnemental?.[champ.cle]||''}
                            onChange={e=>setE('environnemental',{...editForm.environnemental,[champ.cle]:e.target.value})}/>
                        </div>
                      ))}
                    </>)}

                    {champsPersonnalises.filter(c=>!c.type_bien_applicable||c.type_bien_applicable===selectedBien.type_bien).length>0&&(<>
                      <div className="pb-divider"/>
                      <div className="pb-sec">Champs personnalises</div>
                      {champsPersonnalises.filter(c=>!c.type_bien_applicable||c.type_bien_applicable===selectedBien.type_bien).map(champ=>(
                        <div key={champ.id} className="pb-field">
                          <label className="pb-lbl">{champ.nom}{champ.obligatoire&&<span style={{color:'#ef4444'}}> *</span>}</label>
                          <CustomFieldInput champ={champ} value={editForm.champsPerso?.[champ.id]} onChange={v=>setE('champsPerso',{...editForm.champsPerso,[champ.id]:v})}/>
                        </div>
                      ))}
                    </>)}

                    <button className="pb-btn pb-btn-p" disabled={saving} onClick={saveEdit}>
                      <Save size={13}/> {saving?'Enregistrement...':'Enregistrer'}
                    </button>
                  </>
                ):(
                  <>
                    <div className="pb-sec" style={{marginTop:0}}>Regles et restrictions</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
                      {[
                        ['animaux_autorises','Animaux autorises'],
                        ['fumeurs_autorises','Fumeurs autorises'],
                        ['sous_location_autorisee','Sous-location autorisee'],
                        ['colocation_autorisee','Colocation autorisee'],
                        ['activite_pro_autorisee','Activite professionnelle autorisee'],
                        ['location_courte_duree_autorisee','Location courte duree autorisee'],
                      ].map(([key,label])=>(
                        <div key={key} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:100,fontSize:12,
                          border:`1px solid ${selectedBien[key]?'rgba(0,200,150,0.3)':'rgba(255,255,255,0.08)'}`,
                          background:selectedBien[key]?'rgba(0,200,150,0.1)':'rgba(255,255,255,0.02)',
                          color:selectedBien[key]?'#00c896':'rgba(255,255,255,0.35)'}}>
                          {selectedBien[key]&&<Check size={11}/>} {label}
                        </div>
                      ))}
                    </div>
                    {selectedBien.regles&&(
                      <div className="pb-blk" style={{marginBottom:16}}><div className="pb-blk-lbl">Restrictions particulieres</div><div className="pb-blk-val">{selectedBien.regles}</div></div>
                    )}
                    {selectedBien.location_courte_duree_autorisee&&(<>
                      <div className="pb-divider"/>
                      <div className="pb-sec">Location courte duree</div>
                      <div className="pb-detail-grid">
                        <div>
                          <div className="pb-blk"><div className="pb-blk-lbl">Check-in / check-out</div><div className="pb-blk-val">{selectedBien.checkin_heure||'—'} / {selectedBien.checkout_heure||'—'}</div></div>
                        </div>
                        <div>
                          <div className="pb-blk"><div className="pb-blk-lbl">Tarif / nuit</div><div className="pb-blk-val">{selectedBien.tarif_nuitee!=null?fmt(selectedBien.tarif_nuitee)+' FCFA':'—'}{selectedBien.nuits_minimum?` · min. ${selectedBien.nuits_minimum} nuits`:''}</div></div>
                        </div>
                      </div>
                    </>)}
                    {environnementalSchema.length>0&&(<>
                      <div className="pb-divider"/>
                      <div className="pb-sec">Informations environnementales</div>
                      <div className="pb-detail-grid">
                        {environnementalSchema.map(champ=>(
                          <div key={champ.cle}><div className="pb-blk"><div className="pb-blk-lbl">{champ.label}</div><div className="pb-blk-val">{selectedBien.metadata?.environnemental?.[champ.cle]||'Non renseigne'}</div></div></div>
                        ))}
                      </div>
                    </>)}
                    {champsPersonnalises.filter(c=>!c.type_bien_applicable||c.type_bien_applicable===selectedBien.type_bien).length>0&&(<>
                      <div className="pb-divider"/>
                      <div className="pb-sec">Champs personnalises</div>
                      <div className="pb-detail-grid">
                        {champsPersonnalises.filter(c=>!c.type_bien_applicable||c.type_bien_applicable===selectedBien.type_bien).map(champ=>(
                          <div key={champ.id}><div className="pb-blk"><div className="pb-blk-lbl">{champ.nom}</div><div className="pb-blk-val">{formatCustomFieldValue(champ, selectedBien.metadata?.champs_personnalises?.[champ.id])}</div></div></div>
                        ))}
                      </div>
                    </>)}
                  </>
                )
              )}

              {/* Tab Propriete & gestion */}
              {detailTab==='proprietaire'&&(
                <>
                  <div className="pb-sec" style={{marginTop:0}}>Proprietaire(s)</div>
                  {detailLoading?(
                    <div style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Chargement...</div>
                  ):bienProps.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <User size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)',marginBottom:14}}>Aucun proprietaire associe</div>
                      <button className="pb-btn pb-btn-p" style={{margin:'0 auto'}} onClick={()=>navigate('/imoloc/proprietaires')}>Associer un proprietaire</button>
                    </div>
                  ):(
                    bienProps.map(bp=>(
                      <div key={bp.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#0078d4,#0078d488)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                          {((bp.proprietaires?.prenom?.[0]||'')+(bp.proprietaires?.nom?.[0]||'')).toUpperCase()||'?'}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{bp.proprietaires?.prenom} {bp.proprietaires?.nom}</div>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{bp.proprietaires?.telephone||'Pas de telephone'}</div>
                        </div>
                        <div style={{fontSize:14,fontWeight:700,color:'#4da6ff'}}>{bp.pourcentage}%</div>
                        <button className="pb-cls" onClick={()=>removeBienProprietaire(bp.id)}><X size={15}/></button>
                      </div>
                    ))
                  )}
                  <div className="pb-divider"/>
                  <div className="pb-sec">Gestion</div>
                  {bienMandat?(
                    <div className="pb-detail-grid">
                      <div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Categorie</div><div className="pb-blk-val">{bienMandat.categorie_mandat==='vente'?'Mandat de vente':'Gestion locative'}</div></div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Statut</div><div className="pb-blk-val">{bienMandat.statut}</div></div>
                      </div>
                      <div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Commission gestion</div><div className="pb-blk-val">{bienMandat.commission_gestion!=null?bienMandat.commission_gestion+'%':'—'}</div></div>
                        <div className="pb-blk"><div className="pb-blk-lbl">Echeance</div><div className="pb-blk-val">{bienMandat.date_fin?new Date(bienMandat.date_fin).toLocaleDateString('fr-FR'):'—'}</div></div>
                      </div>
                    </div>
                  ):(
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',fontStyle:'italic'}}>Aucun mandat enregistre pour ce bien.</div>
                  )}
                </>
              )}

              {/* Tab Finances */}
              {detailTab==='finances'&&(
                editMode?(
                  <>
                    {(selectedBien.intention==='location'||selectedBien.intention==='les_deux')&&(
                      <div className="pb-field">
                        <label className="pb-lbl">Loyer mensuel (FCFA)</label>
                        <input className="pb-inp" type="number" value={editForm.loyer} onChange={e=>setE('loyer',e.target.value)}/>
                      </div>
                    )}
                    {(selectedBien.intention==='vente'||selectedBien.intention==='les_deux')&&(
                      <div className="pb-field">
                        <label className="pb-lbl">Prix de vente demande (FCFA)</label>
                        <input className="pb-inp" type="number" value={editForm.prix_vente_demande} onChange={e=>setE('prix_vente_demande',e.target.value)}/>
                      </div>
                    )}
                    <button className="pb-btn pb-btn-p" disabled={saving} onClick={saveEdit}>
                      <Save size={13}/> {saving?'Enregistrement...':'Enregistrer'}
                    </button>
                  </>
                ):(
                  <div className="pb-detail-grid">
                    <div>
                      <div className="pb-blk"><div className="pb-blk-lbl">Loyer mensuel</div><div className="pb-blk-val">{selectedBien.loyer!=null?fmt(selectedBien.loyer)+' FCFA':'Non renseigne'}</div></div>
                    </div>
                    <div>
                      <div className="pb-blk"><div className="pb-blk-lbl">Prix de vente demande</div><div className="pb-blk-val">{selectedBien.prix_vente_demande!=null?fmt(selectedBien.prix_vente_demande)+' FCFA':'Non renseigne'}</div></div>
                    </div>
                  </div>
                )
              )}

              {/* Tab Unites (immeuble uniquement) */}
              {detailTab==='unites'&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>{bienUnites.length} unite{bienUnites.length!==1?'s':''}</span>
                    <button className="pb-btn pb-btn-p" onClick={()=>{
                      resetForm()
                      setF('ville', selectedBien.ville||'')
                      setF('quartier', selectedBien.quartier||'')
                      setF('adresse', selectedBien.adresse||'')
                      setSelectedBien(null)
                      setShowAddPanel(true)
                    }}><Plus size={13}/> Ajouter une unite</button>
                  </div>
                  {bienUnites.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <Layers size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucune unite rattachee a cet immeuble</div>
                    </div>
                  ):(
                    bienUnites.map(u=>{
                      const UIcon = getTypeInfo(typesBiens, u.type_bien||u.type).icon
                      return (
                        <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                          <div style={{width:32,height:32,borderRadius:7,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><UIcon size={15}/></div>
                          <div style={{flex:1,fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>{u.nom}</div>
                          <StatutBadge statut={u.statut}/>
                        </div>
                      )
                    })
                  )}
                </>
              )}

              {/* Tab Vente */}
              {detailTab==='vente'&&(
                <>
                  <div className="pb-detail-grid" style={{marginBottom:10}}>
                    <div className="pb-blk"><div className="pb-blk-lbl">Statut de vente</div>
                      <div className="pb-blk-val">{selectedBien.statut_vente?<StatutBadge statut={selectedBien.statut_vente} catalogue={statutsVente}/>:'Non renseigne'}</div>
                    </div>
                    <div className="pb-blk"><div className="pb-blk-lbl">Prix demande</div>
                      <div className="pb-blk-val">{selectedBien.prix_vente_demande!=null?fmt(selectedBien.prix_vente_demande)+' FCFA':'Non renseigne'}</div>
                    </div>
                  </div>
                  <div className="pb-divider"/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span className="pb-sec" style={{margin:0}}>Opportunites</span>
                    <button className="pb-btn pb-btn-p" onClick={()=>setShowAddOpp(o=>!o)}><Plus size={13}/> Ajouter</button>
                  </div>
                  {showAddOpp&&(
                    <div className="pb-field">
                      <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'8px 12px',marginBottom:8}}>
                        <Search size={13} color="rgba(255,255,255,0.3)"/>
                        <input style={{background:'none',border:'none',outline:'none',fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',width:'100%'}}
                          value={contactSearch} onChange={e=>searchContacts(e.target.value)} placeholder="Rechercher un contact..."/>
                      </div>
                      {contactResults.map(c=>(
                        <div key={c.id} className="pb-prop-item" onClick={()=>addOpportunite(c)}>
                          <div className="pb-prop-avatar" style={{background:'#0078d4'}}>{(c.display||'?').slice(0,2).toUpperCase()}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{c.display}</div>
                            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{c.email||c.tel_mobile||''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {bienOpportunites.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <User size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucune opportunite pour ce bien</div>
                    </div>
                  ):(
                    bienOpportunites.map(o=>(
                      <div key={o.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pb-prop-avatar" style={{background:'#6c63ff'}}>{(o.contacts?.display||'?').slice(0,2).toUpperCase()}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{o.contacts?.display||'Contact supprime'}</div>
                            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{o.montant_offre?fmt(o.montant_offre)+' FCFA':'Pas d\'offre chiffree'}</div>
                          </div>
                          <StatutPicker statutsBiens={OPPORTUNITE_STATUTS} value={o.statut} onChange={v=>updateOpportuniteStatut(o.id,v)} size="small"/>
                          <button className="pb-cls" onClick={()=>deleteOpportunite(o.id)}><X size={14}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Tab Baux */}
              {detailTab==='baux'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <FileText size={36} style={{marginBottom:12,opacity:0.3}}/>
                  <div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.35)',marginBottom:8}}>
                    {selectedBien.nb_baux} bail{selectedBien.nb_baux!==1?'s':''} actif{selectedBien.nb_baux!==1?'s':''}
                  </div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:18}}>Module baux en cours de developpement</div>
                  <button className="pb-btn" style={{margin:'0 auto'}} onClick={()=>navigate('/agence/baux')}>Voir les baux</button>
                </div>
              )}

              {/* Tab Paiements */}
              {detailTab==='paiements'&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <Wallet size={36} style={{marginBottom:12,opacity:0.3}}/>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:18}}>Module paiements en cours de developpement</div>
                  <button className="pb-btn" style={{margin:'0 auto'}} onClick={()=>navigate('/agence/paiements')}>Voir les paiements</button>
                </div>
              )}

              {/* Tab Compteurs */}
              {detailTab==='compteurs'&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span className="pb-sec" style={{margin:0}}>Compteurs</span>
                    <button className="pb-btn pb-btn-p" onClick={()=>setShowAddCompteur(o=>!o)}><Plus size={13}/> Ajouter</button>
                  </div>
                  {showAddCompteur&&(
                    <div style={{background:'rgba(255,255,255,0.03)',padding:14,borderRadius:8,marginBottom:14}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label className="pb-lbl">Type<span className="pb-req">*</span></label>
                          <select className="pb-inp" value={newCompteur.type_compteur} onChange={e=>setNewCompteur(c=>({...c,type_compteur:e.target.value}))}>
                            <option value="">Choisir...</option>
                            <option value="eau">Eau</option>
                            <option value="electricite">Electricite</option>
                            <option value="gaz">Gaz</option>
                            <option value="internet">Internet</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-lbl">Numero</label>
                          <input className="pb-inp" value={newCompteur.numero} onChange={e=>setNewCompteur(c=>({...c,numero:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Fournisseur</label>
                          <input className="pb-inp" value={newCompteur.fournisseur} onChange={e=>setNewCompteur(c=>({...c,fournisseur:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Unite</label>
                          <input className="pb-inp" placeholder="kWh, m3..." value={newCompteur.unite} onChange={e=>setNewCompteur(c=>({...c,unite:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Individuel / collectif</label>
                          <select className="pb-inp" value={newCompteur.individuel_collectif} onChange={e=>setNewCompteur(c=>({...c,individuel_collectif:e.target.value}))}>
                            <option value="individuel">Individuel</option>
                            <option value="collectif">Collectif</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-lbl">Souscripteur</label>
                          <select className="pb-inp" value={newCompteur.souscripteur} onChange={e=>setNewCompteur(c=>({...c,souscripteur:e.target.value}))}>
                            <option value="">Non precise</option>
                            <option value="proprietaire">Proprietaire</option>
                            <option value="locataire">Locataire</option>
                            <option value="agence">Agence</option>
                          </select>
                        </div>
                      </div>
                      <button className="pb-btn pb-btn-p" onClick={addCompteur}>Ajouter le compteur</button>
                    </div>
                  )}
                  {bienCompteurs.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <Gauge size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucun compteur enregistre</div>
                    </div>
                  ):(
                    bienCompteurs.map(c=>(
                      <div key={c.id} style={{padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pb-prop-avatar" style={{background:'#0078d4'}}><Gauge size={14}/></div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#e6edf3',textTransform:'capitalize'}}>{c.type_compteur}{c.numero?` — ${c.numero}`:''}</div>
                            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>
                              {c.fournisseur||'Fournisseur non renseigne'} · {c.individuel_collectif==='collectif'?'Collectif':'Individuel'}
                              {c.souscripteur&&` · Souscripteur: ${c.souscripteur}`}
                            </div>
                          </div>
                          <button className="pb-cls" onClick={()=>deleteCompteur(c.id)}><X size={14}/></button>
                        </div>
                        <div style={{marginLeft:42,marginTop:8,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                          {c.dernier_releve?(
                            <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>
                              Dernier releve : <b style={{color:'#e6edf3'}}>{c.dernier_releve.valeur}{c.unite?' '+c.unite:''}</b> le {new Date(c.dernier_releve.date_releve).toLocaleDateString('fr-FR')}
                            </span>
                          ):(
                            <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>Aucun releve</span>
                          )}
                          <input className="pb-inp" style={{width:100,padding:'5px 8px',fontSize:12}} type="number" placeholder="Valeur"
                            value={newReleve[c.id]?.valeur||''} onChange={e=>setNewReleve(r=>({...r,[c.id]:{...r[c.id],valeur:e.target.value}}))}/>
                          <button className="pb-btn" style={{padding:'5px 10px',fontSize:12}} onClick={()=>addReleve(c.id)}>+ Releve</button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Tab Assurance */}
              {detailTab==='assurance'&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span className="pb-sec" style={{margin:0}}>Assurance</span>
                    <button className="pb-btn pb-btn-p" onClick={()=>setShowAddAssurance(o=>!o)}><Plus size={13}/> Ajouter</button>
                  </div>
                  {showAddAssurance&&(
                    <div style={{background:'rgba(255,255,255,0.03)',padding:14,borderRadius:8,marginBottom:14}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label className="pb-lbl">Assureur<span className="pb-req">*</span></label>
                          <input className="pb-inp" value={newAssurance.assureur} onChange={e=>setNewAssurance(a=>({...a,assureur:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">N° police</label>
                          <input className="pb-inp" value={newAssurance.numero_police} onChange={e=>setNewAssurance(a=>({...a,numero_police:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Type</label>
                          <select className="pb-inp" value={newAssurance.type_assurance} onChange={e=>setNewAssurance(a=>({...a,type_assurance:e.target.value}))}>
                            <option value="">Choisir...</option>
                            <option value="habitation">Habitation</option>
                            <option value="multirisque">Multirisque</option>
                            <option value="responsabilite_civile">Responsabilite civile</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-lbl">Prime (FCFA)</label>
                          <input className="pb-inp" type="number" value={newAssurance.prime} onChange={e=>setNewAssurance(a=>({...a,prime:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Debut</label>
                          <input className="pb-inp" type="date" value={newAssurance.date_debut} onChange={e=>setNewAssurance(a=>({...a,date_debut:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Expiration</label>
                          <input className="pb-inp" type="date" value={newAssurance.date_expiration} onChange={e=>setNewAssurance(a=>({...a,date_expiration:e.target.value}))}/>
                        </div>
                      </div>
                      <button className="pb-btn pb-btn-p" onClick={addAssurance}>Ajouter la police</button>
                    </div>
                  )}
                  {bienAssurances.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <ShieldCheck size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucune police d'assurance</div>
                    </div>
                  ):(
                    bienAssurances.map(a=>(
                      <div key={a.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pb-prop-avatar" style={{background:'#00c896'}}><ShieldCheck size={14}/></div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{a.assureur}{a.numero_police?` — ${a.numero_police}`:''}</div>
                            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>
                              {a.type_assurance||'Type non precise'}
                              {a.date_expiration&&` · Expire le ${new Date(a.date_expiration).toLocaleDateString('fr-FR')}`}
                              {a.prime!=null&&` · ${fmt(a.prime)} FCFA`}
                            </div>
                          </div>
                          <button className="pb-cls" onClick={()=>deleteAssurance(a.id)}><X size={14}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Tab Taxes */}
              {detailTab==='taxes'&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span className="pb-sec" style={{margin:0}}>Taxes & fiscalite</span>
                    <button className="pb-btn pb-btn-p" onClick={()=>setShowAddTaxe(o=>!o)}><Plus size={13}/> Ajouter</button>
                  </div>
                  {showAddTaxe&&(
                    <div style={{background:'rgba(255,255,255,0.03)',padding:14,borderRadius:8,marginBottom:14}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label className="pb-lbl">Type de taxe<span className="pb-req">*</span></label>
                          <input className="pb-inp" placeholder="Ex: Taxe Fonciere Unique" value={newTaxe.type_taxe} onChange={e=>setNewTaxe(t=>({...t,type_taxe:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Montant (FCFA)</label>
                          <input className="pb-inp" type="number" value={newTaxe.montant} onChange={e=>setNewTaxe(t=>({...t,montant:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Echeance</label>
                          <input className="pb-inp" type="date" value={newTaxe.date_echeance} onChange={e=>setNewTaxe(t=>({...t,date_echeance:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Frequence</label>
                          <select className="pb-inp" value={newTaxe.frequence} onChange={e=>setNewTaxe(t=>({...t,frequence:e.target.value}))}>
                            <option value="annuelle">Annuelle</option>
                            <option value="trimestrielle">Trimestrielle</option>
                            <option value="mensuelle">Mensuelle</option>
                            <option value="unique">Unique</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-lbl">Statut</label>
                          <select className="pb-inp" value={newTaxe.statut} onChange={e=>setNewTaxe(t=>({...t,statut:e.target.value}))}>
                            <option value="a_jour">A jour</option>
                            <option value="en_retard">En retard</option>
                            <option value="paye">Paye</option>
                          </select>
                        </div>
                      </div>
                      <button className="pb-btn pb-btn-p" onClick={addTaxe}>Ajouter la taxe</button>
                    </div>
                  )}
                  {bienTaxes.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <Receipt size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucune taxe enregistree</div>
                    </div>
                  ):(
                    bienTaxes.map(t=>{
                      const statutColor = t.statut==='en_retard'?'#ef4444':t.statut==='paye'?'#6c63ff':'#00c896'
                      return (
                        <div key={t.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="pb-prop-avatar" style={{background:statutColor}}><Receipt size={14}/></div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{t.type_taxe}</div>
                              <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>
                                {t.montant!=null?fmt(t.montant)+' FCFA':'Montant non renseigne'}
                                {t.date_echeance&&` · Echeance ${new Date(t.date_echeance).toLocaleDateString('fr-FR')}`}
                              </div>
                            </div>
                            <span style={{fontSize:11,fontWeight:600,color:statutColor,textTransform:'uppercase',letterSpacing:'.03em'}}>{t.statut.replace('_',' ')}</span>
                            <button className="pb-cls" onClick={()=>deleteTaxe(t.id)}><X size={14}/></button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </>
              )}

              {/* Tab Sinistres */}
              {detailTab==='sinistres'&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span className="pb-sec" style={{margin:0}}>Sinistres</span>
                    <button className="pb-btn pb-btn-p" onClick={()=>setShowAddSinistre(o=>!o)}><Plus size={13}/> Ajouter</button>
                  </div>
                  {showAddSinistre&&(
                    <div style={{background:'rgba(255,255,255,0.03)',padding:14,borderRadius:8,marginBottom:14}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label className="pb-lbl">Type de sinistre<span className="pb-req">*</span></label>
                          <input className="pb-inp" placeholder="Ex: Degat des eaux" value={newSinistre.type_sinistre} onChange={e=>setNewSinistre(s=>({...s,type_sinistre:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Date</label>
                          <input className="pb-inp" type="date" value={newSinistre.date_sinistre} onChange={e=>setNewSinistre(s=>({...s,date_sinistre:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Gravite</label>
                          <select className="pb-inp" value={newSinistre.gravite} onChange={e=>setNewSinistre(s=>({...s,gravite:e.target.value}))}>
                            <option value="mineure">Mineure</option>
                            <option value="moderee">Moderee</option>
                            <option value="majeure">Majeure</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-lbl">Assurance liee</label>
                          <select className="pb-inp" value={newSinistre.assurance_id} onChange={e=>setNewSinistre(s=>({...s,assurance_id:e.target.value}))}>
                            <option value="">Aucune</option>
                            {bienAssurances.map(a=><option key={a.id} value={a.id}>{a.assureur}{a.numero_police?` — ${a.numero_police}`:''}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="pb-lbl">Cout (FCFA)</label>
                          <input className="pb-inp" type="number" value={newSinistre.cout} onChange={e=>setNewSinistre(s=>({...s,cout:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Statut</label>
                          <select className="pb-inp" value={newSinistre.statut} onChange={e=>setNewSinistre(s=>({...s,statut:e.target.value}))}>
                            <option value="declare">Declare</option>
                            <option value="en_cours">En cours</option>
                            <option value="resolu">Resolu</option>
                            <option value="clos">Clos</option>
                          </select>
                        </div>
                        <div style={{gridColumn:'1/-1'}}>
                          <label className="pb-lbl">Description</label>
                          <input className="pb-inp" value={newSinistre.description} onChange={e=>setNewSinistre(s=>({...s,description:e.target.value}))}/>
                        </div>
                      </div>
                      <button className="pb-btn pb-btn-p" onClick={addSinistre}>Ajouter le sinistre</button>
                    </div>
                  )}
                  {bienSinistres.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <AlertTriangle size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucun sinistre declare</div>
                    </div>
                  ):(
                    bienSinistres.map(s=>{
                      const statutColor = s.statut==='clos'?'#8b949e':s.statut==='resolu'?'#00c896':s.statut==='en_cours'?'#0078d4':'#f59e0b'
                      return (
                        <div key={s.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="pb-prop-avatar" style={{background:statutColor}}><AlertTriangle size={14}/></div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{s.type_sinistre}</div>
                              <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>
                                {s.date_sinistre?new Date(s.date_sinistre).toLocaleDateString('fr-FR'):'Date non renseignee'}
                                {s.cout!=null&&` · ${fmt(s.cout)} FCFA`}
                              </div>
                            </div>
                            <span style={{fontSize:11,fontWeight:600,color:statutColor,textTransform:'uppercase',letterSpacing:'.03em'}}>{s.statut}</span>
                            <button className="pb-cls" onClick={()=>deleteSinistre(s.id)}><X size={14}/></button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </>
              )}

              {/* Tab Documents */}
              {detailTab==='documents'&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span className="pb-sec" style={{margin:0}}>Documents</span>
                    <button className="pb-btn pb-btn-p" onClick={()=>setShowAddDocument(o=>!o)}><Plus size={13}/> Ajouter</button>
                  </div>
                  {showAddDocument&&(
                    <div style={{background:'rgba(255,255,255,0.03)',padding:14,borderRadius:8,marginBottom:14}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div style={{gridColumn:'1/-1'}}>
                          <label className="pb-lbl">Nom<span className="pb-req">*</span></label>
                          <input className="pb-inp" value={newDocument.nom} onChange={e=>setNewDocument(d=>({...d,nom:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="pb-lbl">Type</label>
                          <select className="pb-inp" value={newDocument.type_document} onChange={e=>setNewDocument(d=>({...d,type_document:e.target.value}))}>
                            <option value="">Choisir...</option>
                            <option value="photo">Photo</option>
                            <option value="bail">Bail</option>
                            <option value="titre_foncier">Titre foncier</option>
                            <option value="etat_des_lieux">Etat des lieux</option>
                            <option value="facture">Facture</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="pb-lbl">Categorie</label>
                          <select className="pb-inp" value={newDocument.categorie} onChange={e=>setNewDocument(d=>({...d,categorie:e.target.value}))}>
                            <option value="">Non classee</option>
                            <option value="propriete">Propriete</option>
                            <option value="technique">Technique</option>
                            <option value="administratif">Administratif</option>
                            <option value="gestion">Gestion</option>
                          </select>
                        </div>
                        <div style={{gridColumn:'1/-1'}}>
                          <label className="pb-lbl">Visibilite</label>
                          <select className="pb-inp" value={newDocument.visibilite} onChange={e=>setNewDocument(d=>({...d,visibilite:e.target.value}))}>
                            <option value="interne_agence">Interne agence</option>
                            <option value="visible_proprietaire">Visible proprietaire</option>
                            <option value="visible_locataire">Visible locataire</option>
                            <option value="public">Public</option>
                          </select>
                        </div>
                        <div style={{gridColumn:'1/-1'}}>
                          <label className="pb-lbl">Fichier<span className="pb-req">*</span></label>
                          <input type="file" onChange={e=>setNewDocument(d=>({...d,file:e.target.files?.[0]||null}))} style={{fontSize:12.5,color:'rgba(255,255,255,0.6)'}}/>
                        </div>
                      </div>
                      <button className="pb-btn pb-btn-p" disabled={uploadingDoc} onClick={addDocument}>{uploadingDoc?'Envoi...':'Ajouter le document'}</button>
                    </div>
                  )}
                  {bienDocuments.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <Upload size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucun document</div>
                    </div>
                  ):(
                    bienDocuments.map(doc=>(
                      <div key={doc.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pb-prop-avatar" style={{background:'#6c63ff'}}>{doc.type_document==='photo'?<Image size={14}/>:<FileText size={14}/>}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{doc.nom}</div>
                            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{doc.type_document}{doc.categorie&&` · ${doc.categorie}`} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</div>
                          </div>
                          {doc.signed_url&&<a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="pb-btn" style={{padding:'5px 10px',fontSize:12}}>Ouvrir</a>}
                          <button className="pb-cls" onClick={()=>deleteDocument(doc)}><X size={14}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Tab Historique */}
              {detailTab==='historique'&&(
                <>
                  <div style={{marginBottom:14}}>
                    <span className="pb-sec" style={{margin:0}}>Historique</span>
                  </div>
                  {bienHistorique.length===0?(
                    <div style={{textAlign:'center',padding:'30px 20px'}}>
                      <History size={32} style={{marginBottom:10,opacity:0.3}}/>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucun evenement enregistre</div>
                    </div>
                  ):(
                    bienHistorique.map(h=>(
                      <div key={h.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pb-prop-avatar" style={{background:'#8b949e'}}><History size={14}/></div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>
                              {HISTORIQUE_ACTION_LABEL[h.action]||h.action}
                              {h.ancienne_valeur&&h.nouvelle_valeur&&<span style={{fontWeight:400,color:'rgba(255,255,255,0.5)'}}> — {h.ancienne_valeur} → {h.nouvelle_valeur}</span>}
                            </div>
                            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{h.utilisateur_email||'—'} · {new Date(h.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDangerModal
        open={!!conversionWarning}
        title={conversionWarning?.title}
        message={conversionWarning?.message}
        checkboxLabel={conversionWarning?.checkboxLabel}
        confirmLabel="Continuer"
        cancelLabel="Annuler"
        onCancel={()=>setConversionWarning(null)}
        onConfirm={async()=>{ setConversionWarning(null); await doSaveEdit() }}
      />
    </>
  )
}
