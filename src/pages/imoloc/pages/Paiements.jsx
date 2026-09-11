import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowClockwise16Regular as RefreshCw,
  ArrowDownload16Regular as Download,
  Search16Regular as Search,
  List16Regular as List,
  ArrowSort16Regular as ArrowSort,
  ArrowSortUp16Regular as ArrowSortUp,
  ArrowSortDown16Regular as ArrowSortDown,
  ChevronDown16Regular as ChevronDown,
  Info16Regular as Info,
  CheckmarkCircle16Filled as CheckCircle2,
  Wallet16Regular as Wallet,
  Warning16Regular as AlertTriangle,
  HourglassHalf16Regular as Hourglass,
  DocumentText32Regular as FileTextLarge,
  DataBarVertical16Regular as BarChartIcon,
  ArrowUndo16Regular as Undo2,
  Prohibited16Regular as Ban,
  DocumentText16Regular as FileText,
  Home16Regular as Home,
  Person16Regular as User,
} from '@fluentui/react-icons'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import Trend from '../../../components/ui/Trend'
import ProgressBar from '../../../components/ui/ProgressBar'

// statut_paiement enum: en_attente, paye, en_retard, partiel, annule
const S_CFG = {
  en_attente:{ color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'A venir' },
  paye:      { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Paye' },
  en_retard: { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'En retard' },
  partiel:   { color:'#6c63ff', bg:'rgba(108,99,255,0.12)', label:'Partiel' },
  annule:    { color:'rgba(255,255,255,0.3)', bg:'rgba(255,255,255,0.05)', label:'Annule' },
}
const MODES = ['Mobile Money','Virement bancaire','Especes','Cheque']
const MOIS  = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
const fmt   = (n) => n!=null ? Number(n).toLocaleString('fr-FR') : '—'

const RefLink = ({ to, children }) => {
  const navigate = useNavigate()
  if (!children || children==='—') return <span style={{color:'rgba(255,255,255,0.3)'}}>—</span>
  return (
    <a href={to} onClick={e=>{e.preventDefault();e.stopPropagation();navigate(to)}} style={{color:'#4da6ff',textDecoration:'none',cursor:'pointer'}}
      onMouseOver={e=>e.currentTarget.style.color='#6cb8ff'} onMouseOut={e=>e.currentTarget.style.color='#4da6ff'}>
      {children}
    </a>
  )
}

// ─────────────────────────────────────────────────────────
// Systeme de table Fluent — identique a celui du Centre
// d'administration (Abonnement.jsx) et de Facturation.jsx.
// ─────────────────────────────────────────────────────────
const FLUENT_TABLE_CSS = `
.fl-row { border-left:2px solid transparent; transition:background-color 0.1s ease; cursor:pointer; }
.fl-row:hover { background-color:#252525; }
.fl-row-selected { background-color:#292929; border-left:2px solid #0078d4; }
.fl-checkbox { width:16px; height:16px; border-radius:2px; border:1px solid rgba(255,255,255,0.35); background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:border-color 0.1s ease, background-color 0.1s ease; }
.fl-row:hover .fl-checkbox { border-color:#0078d4; }
.fl-checkbox-checked, .fl-row:hover .fl-checkbox-checked { background:#0078d4; border-color:#0078d4; }
.fl-th { position:relative; text-align:left; padding:0 12px; height:36px; font-size:11px; font-weight:600; color:rgba(255,255,255,0.5); background:rgba(255,255,255,0.035); border-bottom:1px solid #2b2b2b; white-space:nowrap; overflow:hidden; }
.fl-td { padding:0 12px; height:36px; vertical-align:middle; font-size:13px; color:#ffffff; border-bottom:1px solid #2b2b2b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
`

function FluentCheckbox({ checked, onChange }) {
  return (
    <div role="checkbox" aria-checked={checked} onClick={e=>{e.stopPropagation();onChange(!checked)}}
      className={`fl-checkbox${checked ? ' fl-checkbox-checked' : ''}`}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M2 8l4 4 8-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function ResizeHandle({ onResize }) {
  const dragging = useRef(false)
  const lastX = useRef(0)
  useEffect(() => {
    const onMove = e => { if (!dragging.current) return; const delta = e.clientX - lastX.current; lastX.current = e.clientX; onResize(delta) }
    const onUp = () => { if (!dragging.current) return; dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [onResize])
  return (
    <div onMouseDown={e => { e.preventDefault(); e.stopPropagation(); dragging.current = true; lastX.current = e.clientX; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}
      onClick={e => e.stopPropagation()}
      style={{ position:'absolute', top:0, right:-4, width:8, height:'100%', cursor:'col-resize', zIndex:5 }}/>
  )
}

function ColHeader({ label, sortable=true, sortDir=null, onSort, onResize }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top:0, left:0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onClick = e => { if (btnRef.current?.contains(e.target)) return; if (menuRef.current?.contains(e.target)) return; setOpen(false) }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => { document.removeEventListener('mousedown', onClick); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll) }
  }, [open])
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const menuWidth = 170
      const overflowsRight = r.left - 8 + menuWidth > window.innerWidth
      setPos({ top: r.bottom + 9, left: overflowsRight ? r.right - menuWidth + 8 : r.left - 8, flip: overflowsRight })
    }
    setOpen(o => !o)
  }
  const menuItemStyle = { padding:'8px 14px', fontSize:13, color:'#ffffff', cursor:'pointer', whiteSpace:'nowrap' }
  const SortIcon = sortDir === 'asc' ? ArrowSortUp : sortDir === 'desc' ? ArrowSortDown : ArrowSort
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, position:'relative' }}>
      <span style={{ textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</span>
      {sortable && <SortIcon style={{ opacity:sortDir?1:0.5, flexShrink:0, color:sortDir?'#4da6ff':undefined }}/>}
      <button ref={btnRef} onClick={e=>{e.stopPropagation();toggle()}} style={{ background:'none', border:'none', padding:0, display:'flex', cursor:'pointer', color:'inherit', flexShrink:0 }}>
        <ChevronDown style={{ opacity:0.5, flexShrink:0 }}/>
      </button>
      {onResize && <ResizeHandle onResize={onResize}/>}
      {open && createPortal(
        <div ref={menuRef} style={{ position:'fixed', top:pos.top, left:pos.left, background:'#202020', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:1000, minWidth:170, padding:'4px 0', textTransform:'none', fontWeight:400, fontFamily:'Inter,sans-serif' }}>
          <div style={{ position:'absolute', top:-5, left:pos.flip?undefined:14, right:pos.flip?14:undefined, width:10, height:10, background:'#202020', borderLeft:'1px solid rgba(255,255,255,0.12)', borderTop:'1px solid rgba(255,255,255,0.12)', transform:'rotate(45deg)' }}/>
          <div style={menuItemStyle} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseLeave={e=>e.currentTarget.style.background='none'} onClick={()=>setOpen(false)}>Redimensionner <span style={{opacity:0.4,fontSize:11}}>(glisser le bord)</span></div>
          {sortable && (
            <div style={menuItemStyle} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseLeave={e=>e.currentTarget.style.background='none'}
              onClick={()=>{onSort?.();setOpen(false)}}>Trier {sortDir==='asc' ? '(Z → A)' : sortDir==='desc' ? '(reinitialiser)' : '(A → Z)'}</div>
          )}
        </div>, document.body
      )}
    </div>
  )
}

function FilterPill({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const current = options.find(o => o.value === value)
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'#252525', border:'1px solid rgba(255,255,255,0.1)', borderRadius:4, color:'#ffffff', fontSize:12, fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer' }}
        onMouseEnter={e=>e.currentTarget.style.background='#2f2f2f'} onMouseLeave={e=>e.currentTarget.style.background='#252525'}>
        <span>{label} : {current?.label ?? value}</span>
        <ChevronDown style={{ opacity:0.6, flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, background:'#202020', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:30, minWidth:190, padding:'4px 0', maxHeight:280, overflowY:'auto' }}>
          {options.map(o => (
            <div key={o.value} onClick={()=>{onChange(o.value);setOpen(false)}}
              style={{ padding:'8px 14px', fontSize:13, color:'#ffffff', cursor:'pointer', whiteSpace:'nowrap' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchBox({ value, onChange, placeholder='Rechercher', style={} }) {
  return (
    <div style={{ position:'relative', ...style }}>
      <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}/>
      <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', padding:'7px 12px 7px 30px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:2, color:'#e6edf3', fontSize:12.5, fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box' }}/>
    </div>
  )
}

const VUES = [ { id:'liste', label:'Liste', Icon:List }, { id:'graphique', label:'Graphique', Icon:BarChartIcon } ]
function ViewSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const courant = VUES.find(v => v.id === value) || VUES[0]
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:2, color:'#e6edf3', fontSize:12.5, fontFamily:'Inter,sans-serif', cursor:'pointer', minWidth:110 }}>
        <courant.Icon/><span style={{ flex:1, textAlign:'left' }}>{courant.label}</span><ChevronDown style={{ opacity:0.5, flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', right:0, marginTop:4, background:'#1f1f1f', border:'1px solid rgba(255,255,255,0.12)', borderRadius:2, boxShadow:'0 8px 24px rgba(0,0,0,0.4)', zIndex:30, minWidth:130, padding:'4px 0' }}>
          {VUES.map(v => (
            <div key={v.id} onClick={()=>{onChange(v.id);setOpen(false)}}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', fontSize:13, color:'#e6edf3', cursor:'pointer', background:v.id===value?'rgba(0,120,212,0.12)':'none' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'} onMouseLeave={e=>e.currentTarget.style.background=v.id===value?'rgba(0,120,212,0.12)':'none'}>
              <v.Icon/><span>{v.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MontantBarChart({ entrees, fmt }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  if (entrees.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
        <BarChartIcon style={{ marginBottom:12, opacity:0.3, width:32, height:32 }}/>
        <div style={{ fontSize:14 }}>Aucune donnee a afficher</div>
      </div>
    )
  }
  const maxVal = Math.max(...entrees.map(([,v])=>v), 1)
  const paliers = 4
  const step = Math.ceil(maxVal/paliers/100)*100 || 1
  const plafond = step*paliers
  return (
    <div style={{ padding:'24px 24px 8px', background:'rgba(255,255,255,0.02)', borderRadius:2 }}>
      <div style={{ display:'flex' }}>
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', height:240, marginRight:12, fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'right' }}>
          {Array.from({length:paliers+1},(_,i)=>plafond-i*step).map(v => <div key={v}>{v>=1000 ? `${(v/1000).toFixed(v%1000===0?0:1)}k` : v}</div>)}
        </div>
        <div style={{ flex:1, position:'relative' }}>
          {Array.from({length:paliers+1},(_,i)=>i).map(i => (
            <div key={i} style={{ position:'absolute', left:0, right:0, top:`${(i/paliers)*100}%`, borderTop:'1px solid rgba(255,255,255,0.06)' }}/>
          ))}
          <div style={{ display:'flex', alignItems:'flex-end', height:240, gap:Math.max(4, 32-entrees.length), position:'relative' }}>
            {entrees.map(([label,val], i) => (
              <div key={label} onMouseEnter={()=>setHoverIdx(i)} onMouseLeave={()=>setHoverIdx(null)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%', cursor:'pointer' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginBottom:4 }}>{val>0 ? fmt(val) : ''}</div>
                <div style={{ width:'60%', maxWidth:36, height:`${Math.max((val/plafond)*100, val>0?2:0)}%`, background:hoverIdx===i?'#6cb6ff':'#4da6ff', borderRadius:'2px 2px 0 0', transition:'background-color 0.1s ease' }}/>
              </div>
            ))}
          </div>
          {hoverIdx !== null && (
            <div style={{ position:'absolute', left:`${(hoverIdx+0.5)/entrees.length*100}%`, bottom:`calc(${Math.max((entrees[hoverIdx][1]/plafond)*100, entrees[hoverIdx][1]>0?2:0)}% + 14px)`,
              transform:'translateX(-50%)', background:'#1f1f1f', border:'1px solid rgba(255,255,255,0.12)', borderLeft:'3px solid #4da6ff',
              borderRadius:2, padding:'10px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:10, pointerEvents:'none', whiteSpace:'nowrap' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:8 }}>{entrees[hoverIdx][0]}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:2 }}>Montant total</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#4da6ff' }}>{fmt(entrees[hoverIdx][1])}</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex', marginLeft:44 }}>
        {entrees.map(([label]) => <div key={label} style={{ flex:1, textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:8 }}>{label}</div>)}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:20, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ width:10, height:10, background:'#4da6ff', borderRadius:1, flexShrink:0 }}/>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Montant encaisse</span>
      </div>
      <div style={{ borderLeft:'3px solid #4da6ff', paddingLeft:14, marginTop:14, paddingBottom:10 }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Montant total</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{fmt(entrees.reduce((s,[,v])=>s+v,0))} FCFA</div>
      </div>
    </div>
  )
}

export default function ImolocPaiements() {
  const navigate   = useNavigate()
  const [agence, setAgence]       = useState(null)
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatut, setFilter] = useState('tous')
  const [filterMois, setFilterMois]   = useState('tous')
  const [filterAnnee, setFilterAnnee] = useState('tous')
  const [filterProprietaire, setFilterProprietaire] = useState('tous')
  const proprietairesMap = useRef({})
  const [selPaie, setSelPaie]     = useState(null)
  const [showPay, setShowPay]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [payForm, setPayForm]     = useState({ mode:'Mobile Money', operateur:'', reference:'', date_paiement:'', montant_paye:'', notes:'' })
  const setPF = (k,v) => setPayForm(f=>({...f,[k]:v}))

  const [selectedP, setSelectedP] = useState([])
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [vue, setVue] = useState('liste')
  const [colWidths, setColWidths] = useState({})
  const COL_DEFAULTS = { periode:130, bien:170, locataire:170, proprietaire:170, echeance:130, montant:130, statut:160 }
  const COLONNES = [
    { key:'periode', label:'Periode', field:'periode_annee' },
    { key:'bien', label:'Bien', field:'bien_nom' },
    { key:'locataire', label:'Locataire', field:'locataire_nom' },
    { key:'proprietaire', label:'Proprietaire', field:'proprietaire_nom' },
    { key:'echeance', label:'Echeance', field:'date_echeance' },
    { key:'montant', label:'Montant', field:'montant' },
    { key:'statut', label:'Etat', field:'statut' },
  ]
  const resizeCol = (key, delta) => setColWidths(w => ({ ...w, [key]: Math.max(60, (w[key] ?? COL_DEFAULTS[key] ?? 140) + delta) }))
  const toggleSort = (field) => {
    if (!field) return
    if (sortField !== field) { setSortField(field); setSortDir('asc'); return }
    if (sortDir === 'asc') { setSortDir('desc'); return }
    setSortField(null)
  }
  const toggleSelectP = (id) => setSelectedP(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id])
  const toggleSelectAllP = (list) => setSelectedP(s => (list.length>0 && list.every(p=>s.includes(p.id))) ? [] : list.map(p=>p.id))

  useEffect(()=>{ initData() },[]) // eslint-disable-line

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
      setAgence(ag)
      if (!ag?.id) return
      const [{ data }, { data: props }] = await Promise.all([
        supabase
          .from('paiements')
          .select('*, biens(nom,ville,proprietaire_id), locataires(nom,prenom), baux(date_debut,date_fin,loyer_mensuel)')
          .eq('agence_id', ag.id)
          .order('date_echeance', {ascending:true}),
        supabase.from('proprietaires').select('id,nom,prenom'),
      ])
      const propsById = {}
      for (const p of (props||[])) propsById[p.id] = `${p.prenom||''} ${p.nom||''}`.trim()
      proprietairesMap.current = propsById
      // Mettre a jour automatiquement en_retard
      const today = new Date()
      const toUpdate = (data||[]).filter(p => p.statut==='en_attente' && p.date_echeance && new Date(p.date_echeance) < today)
      if (toUpdate.length > 0) {
        await supabase.from('paiements').update({ statut:'en_retard' }).in('id', toUpdate.map(p=>p.id))
        toUpdate.forEach(p=>{ p.statut='en_retard' })
      }
      setPaiements((data||[]).map(p => ({
        ...p,
        bien_nom: p.biens?.nom||'',
        locataire_nom: `${p.locataires?.prenom||''} ${p.locataires?.nom||''}`.trim(),
        proprietaire_id: p.biens?.proprietaire_id || null,
        proprietaire_nom: propsById[p.biens?.proprietaire_id] || '',
      })))
    } catch(e){ console.error(e) }
    finally{ setLoading(false) }
  }

  const marquerPaye = async () => {
    if (!selPaie) return
    setSaving(true)
    try {
      const montantPaye = parseFloat(payForm.montant_paye) || selPaie.montant
      const isPartiel   = montantPaye < selPaie.montant
      const { error } = await supabase.from('paiements').update({
        statut:              isPartiel ? 'partiel' : 'paye',
        date_paiement:       payForm.date_paiement || new Date().toISOString(),
        mode_paiement:       payForm.mode,
        operateur:           payForm.operateur || null,
        reference_transaction: payForm.reference || null,
        notes:               payForm.notes || null,
      }).eq('id', selPaie.id)
      if (error) throw new Error(error.message + ' [' + error.code + ']')
      toast.success(isPartiel ? 'Paiement partiel enregistre !' : 'Paiement enregistre !')
      setShowPay(false)
      setSelPaie(null)
      setPayForm({ mode:'Mobile Money', operateur:'', reference:'', date_paiement:'', montant_paye:'', notes:'' })
      initData()
    } catch(e){ toast.error(e.message) }
    finally{ setSaving(false) }
  }

  const annulerPaiement = async (p) => {
    if (!confirm('Annuler ce paiement ?')) return
    const { error } = await supabase.from('paiements').update({ statut:'annule' }).eq('id', p.id)
    if (error) { toast.error(error.message); return }
    toast.success('Paiement annule'); setSelPaie(null); initData()
  }

  const remettreEnAttente = async (p) => {
    if (!confirm('Remettre en attente ?')) return
    const { error } = await supabase.from('paiements').update({ statut:'en_attente', date_paiement:null, reference_transaction:null }).eq('id', p.id)
    if (error) { toast.error(error.message); return }
    toast.success('Remis en attente'); setSelPaie(x=>x?{...x,statut:'en_attente'}:null); initData()
  }

  const annees = [...new Set(paiements.map(p=>p.periode_annee).filter(Boolean))].sort((a,b)=>b-a)

  const uniqueProprietaires = Object.entries(proprietairesMap.current).map(([id,nom])=>({ value:id, label:nom||'—' }))

  const filtered = paiements
    .filter(p => {
      const ms = !search || `${p.bien_nom} ${p.locataire_nom}`.toLowerCase().includes(search.toLowerCase()) || p.locataire_id?.toLowerCase().includes(search.toLowerCase())
      const fs = filterStatut==='tous' || p.statut===filterStatut
      const fm = filterMois==='tous' || p.periode_mois===parseInt(filterMois)
      const fa = filterAnnee==='tous' || p.periode_annee===parseInt(filterAnnee)
      const fp = filterProprietaire==='tous' || p.proprietaire_id===filterProprietaire
      return ms && fs && fm && fa && fp
    })
    .sort((a,b) => {
      if (!sortField) return 0
      let va = a[sortField], vb = b[sortField]
      if (sortField==='montant') { va = Number(va||0); vb = Number(vb||0) }
      else { va = va ?? ''; vb = vb ?? '' }
      const cmp = va > vb ? 1 : va < vb ? -1 : 0
      return sortDir==='asc' ? cmp : -cmp
    })

  const exporterCSV = (list) => {
    const lignes = [
      ['Periode','Bien','Locataire','Proprietaire','Echeance','Montant','Etat'],
      ...list.map(p => [`${p.periode_mois}/${p.periode_annee}`, p.bien_nom, p.locataire_nom, p.proprietaire_nom, p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR'):'', `${fmt(p.montant)} FCFA`, S_CFG[p.statut]?.label||p.statut]),
    ]
    const csv = lignes.map(l => l.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `paiements-${agence?.nom||'imoloc'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = {
    attendu:  paiements.filter(p=>p.statut!=='annule').reduce((a,p)=>a+(p.montant||0),0),
    encaisse: paiements.filter(p=>p.statut==='paye'||p.statut==='partiel').reduce((a,p)=>a+(p.montant||0),0),
    retard:   paiements.filter(p=>p.statut==='en_retard').length,
    attente:  paiements.filter(p=>p.statut==='en_attente').length,
  }
  const now = new Date()
  const moisPrec = new Date(now.getFullYear(), now.getMonth()-1)
  const encaisseCeMois = paiements.filter(p=>p.date_paiement && (p.statut==='paye'||p.statut==='partiel') && new Date(p.date_paiement).getMonth()===now.getMonth() && new Date(p.date_paiement).getFullYear()===now.getFullYear()).reduce((a,p)=>a+(p.montant||0),0)
  const encaisseMoisPrec = paiements.filter(p=>p.date_paiement && (p.statut==='paye'||p.statut==='partiel') && new Date(p.date_paiement).getMonth()===moisPrec.getMonth() && new Date(p.date_paiement).getFullYear()===moisPrec.getFullYear()).reduce((a,p)=>a+(p.montant||0),0)
  const encaisseTrend = encaisseMoisPrec>0 ? Math.round(((encaisseCeMois-encaisseMoisPrec)/encaisseMoisPrec)*100) : (encaisseCeMois>0?100:0)
  const tauxRecouvrement = stats.attendu>0 ? Math.round((stats.encaisse/stats.attendu)*100) : 0

  const parMoisChart = {}
  filtered.forEach(p => { if (p.statut==='paye'||p.statut==='partiel') { const cle = `${String(p.periode_mois).padStart(2,'0')}/${p.periode_annee}`; parMoisChart[cle] = (parMoisChart[cle]||0) + Number(p.montant||0) } })
  const entreesChart = Object.entries(parMoisChart).sort((a,b) => { const [ma,ya]=a[0].split('/'); const [mb,yb]=b[0].split('/'); return new Date(ya,ma-1)-new Date(yb,mb-1) })

  const SBadge = ({s}) => { const c=S_CFG[s]||S_CFG.en_attente; return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 9px',borderRadius:'100px',fontSize:11,fontWeight:600,background:c.bg,color:c.color}}><span style={{width:6,height:6,borderRadius:'50%',background:c.color,flexShrink:0}}/>{c.label}</span> }

  const linkBtn = { background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }

  return (
    <>
      <style>{FLUENT_TABLE_CSS}</style>
      <style>{`
        .px-ov{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;display:flex;justify-content:flex-end}
        .px-panel{background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:px-sl 0.22s ease;height:100%;overflow:hidden}
        @keyframes px-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .px-inp{width:100%;padding:9px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .px-inp:focus{border-color:#0078d4}
        .px-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
        .px-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .px-fld{margin-bottom:14px}
        .px-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .px-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .px-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}
        .px-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}
        .px-btn-y{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.22);color:#f59e0b}
        @media(max-width:700px){.px-g2{grid-template-columns:1fr}}
      `}</style>

      <div style={{minHeight:'100%'}}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:14 }}>
          Accueil <span style={{ margin:'0 4px' }}>&gt;</span> <span style={{ color:'rgba(255,255,255,0.6)' }}>Facturation</span>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:20}}>Factures et paiements</div>

        <div style={{ display:'flex', gap:10, padding:'14px 16px', background:'rgba(0,120,212,0.06)', borderRadius:2, marginBottom:24 }}>
          <Info style={{ color:'#4da6ff', flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>
            Connecte a <span style={{color:'#4da6ff',fontWeight:600}}>{agence?.nom}</span> — {paiements.length} echeance{paiements.length!==1?'s':''} au total.
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {ic:Wallet,l:'Total attendu', v:fmt(stats.attendu)+' FCFA', c:'#e6edf3'},
            {ic:CheckCircle2,l:'Encaisse', v:fmt(stats.encaisse)+' FCFA', c:'#00c896', trend:encaisseTrend},
            {ic:AlertTriangle,l:'En retard', v:stats.retard, c:stats.retard>0?'#ef4444':'rgba(255,255,255,0.3)'},
            {ic:Hourglass,l:'A venir', v:stats.attente, c:'#f59e0b'},
          ].map((s,i)=>(
            <div key={i} style={{borderLeft:`3px solid ${s.c}`,paddingLeft:14}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}><s.ic style={{color:s.c}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{s.l}</span></div>
              <div style={{display:'flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>
                <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
                {s.trend!==undefined && <Trend value={s.trend}/>}
              </div>
            </div>
          ))}
        </div>

        <div style={{marginBottom:20,padding:'12px 16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Taux de recouvrement</span>
            <span style={{fontSize:13,fontWeight:700,color:tauxRecouvrement>=80?'#00c896':tauxRecouvrement>=50?'#f59e0b':'#ef4444'}}>{tauxRecouvrement}%</span>
          </div>
          <ProgressBar value={tauxRecouvrement}/>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:14, flexWrap:'wrap', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={initData} style={linkBtn}><RefreshCw/> Actualiser</button>
          <button onClick={()=>exporterCSV(selectedP.length?filtered.filter(p=>selectedP.includes(p.id)):filtered)} style={linkBtn}><Download/> Exporter vers un fichier CSV</button>
          <SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bien, locataire..." style={{ minWidth:200 }}/>
          <div style={{ marginLeft:'auto' }}><ViewSwitcher value={vue} onChange={setVue}/></div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, flexWrap:'wrap' }}>
          <FilterPill label="Etat" value={filterStatut} onChange={setFilter}
            options={[{value:'tous',label:'Tous'}, ...Object.entries(S_CFG).map(([k,v])=>({value:k,label:v.label}))]}/>
          <FilterPill label="Annee" value={filterAnnee} onChange={setFilterAnnee}
            options={[{value:'tous',label:'Toutes'}, ...annees.map(a=>({value:String(a),label:String(a)}))]}/>
          <FilterPill label="Mois" value={filterMois} onChange={setFilterMois}
            options={[{value:'tous',label:'Tous'}, ...MOIS.map((m,i)=>({value:String(i+1),label:m}))]}/>
          <FilterPill label="Proprietaire" value={filterProprietaire} onChange={setFilterProprietaire}
            options={[{value:'tous',label:'Tous'}, ...uniqueProprietaires]}/>
        </div>

        {loading?(
          <div style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
        ):vue==='graphique'?(
          <MontantBarChart entrees={entreesChart} fmt={fmt}/>
        ):filtered.length===0?(
          <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
            <FileTextLarge style={{ marginBottom:12, opacity:0.3 }}/>
            <div style={{ fontSize:14 }}>Aucun paiement dans ce filtre</div>
          </div>
        ):(
          <div style={{ overflowX:'auto', overflowY:'visible' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900, tableLayout:'fixed' }}>
              <colgroup>
                <col style={{ width:36 }}/>
                {COLONNES.map(c => <col key={c.key} style={{ width:colWidths[c.key] ?? COL_DEFAULTS[c.key] }}/>)}
                <col style={{ width:120 }}/>
              </colgroup>
              <thead><tr>
                <th className="fl-th"><FluentCheckbox checked={filtered.length>0 && filtered.every(p=>selectedP.includes(p.id))} onChange={()=>toggleSelectAllP(filtered)}/></th>
                {COLONNES.map(c=>(
                  <th key={c.key} className="fl-th">
                    <ColHeader label={c.label} sortDir={sortField===c.field ? sortDir : null} onSort={()=>toggleSort(c.field)} onResize={delta=>resizeCol(c.key, delta)}/>
                  </th>
                ))}
                <th className="fl-th"></th>
              </tr></thead>
              <tbody>{filtered.map(p=>{
                const cfg = S_CFG[p.statut]||S_CFG.en_attente
                const selected = selectedP.includes(p.id)
                const moisLabel = p.periode_mois ? MOIS[p.periode_mois-1] : '—'
                return (
                  <tr key={p.id} className={`fl-row${selected ? ' fl-row-selected' : ''}`} onClick={()=>setSelPaie(p)}>
                    <td className="fl-td"><FluentCheckbox checked={selected} onChange={()=>toggleSelectP(p.id)}/></td>
                    <td className="fl-td ind-td" style={{ fontWeight:600, '--ind-c':cfg.color }}>{moisLabel} {p.periode_annee}</td>
                    <td className="fl-td" onClick={ev=>ev.stopPropagation()}><RefLink to={`/imoloc/biens?bien=${p.bien_id}`}>{p.bien_nom||'—'}</RefLink></td>
                    <td className="fl-td" onClick={ev=>ev.stopPropagation()}><RefLink to={`/imoloc/locataires?locataire=${p.locataire_id}`}>{p.locataire_nom||'—'}</RefLink></td>
                    <td className="fl-td" onClick={ev=>ev.stopPropagation()}><RefLink to={`/imoloc/proprietaires?proprietaire=${p.proprietaire_id}`}>{p.proprietaire_nom||'—'}</RefLink></td>
                    <td className="fl-td" style={{color:'rgba(255,255,255,0.5)'}}>
                      {p.date_echeance?new Date(p.date_echeance).toLocaleDateString('fr-FR'):'—'}
                      {p.statut==='en_retard'&&p.date_echeance&&<span style={{color:'#ef4444'}}> · {Math.floor((new Date()-new Date(p.date_echeance))/(1000*60*60*24))}j</span>}
                    </td>
                    <td className="fl-td" style={{fontWeight:600,color:p.statut==='paye'?'#00c896':p.statut==='en_retard'?'#ef4444':'#ffffff'}}>{fmt(p.montant)} FCFA</td>
                    <td className="fl-td"><SBadge s={p.statut}/></td>
                    <td className="fl-td" onClick={e=>e.stopPropagation()}>
                      {['en_attente','en_retard','partiel'].includes(p.statut)&&(
                        <button className='px-btn px-btn-g' style={{padding:'4px 10px',fontSize:12}} onClick={()=>{setSelPaie(p);setPayForm({mode:'Mobile Money',operateur:'',reference:'',date_paiement:new Date().toISOString().split('T')[0],montant_paye:String(p.montant),notes:''});setShowPay(true)}}>Encaisser</button>
                      )}
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PANEL ENCAISSER ── */}
      {showPay&&selPaie&&(
        <div className='px-ov' onClick={e=>e.target===e.currentTarget&&setShowPay(false)}>
          <div className='px-panel' style={{width:'min(460px,96vw)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>Encaisser le paiement</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:3}}>{MOIS[(selPaie.periode_mois||1)-1]} {selPaie.periode_annee} · {fmt(selPaie.montant)} FCFA</div>
              </div>
              <button onClick={()=>setShowPay(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:5,borderRadius:4,display:'flex'}}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
              <div style={{padding:'12px 16px',borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:3}}><Home/> {selPaie.biens?.nom||'—'}</div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:13,color:'rgba(255,255,255,0.5)'}}><User/> {selPaie.locataires?.prenom||''} {selPaie.locataires?.nom||'—'}</div>
              </div>
              <div className='px-fld'>
                <label className='px-lbl'>Montant encaisse (FCFA)</label>
                <input autoFocus className='px-inp' type='number' min='0' value={payForm.montant_paye} onChange={e=>setPF('montant_paye',e.target.value)}/>
                {payForm.montant_paye && parseFloat(payForm.montant_paye) < selPaie.montant && <div style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#6c63ff',marginTop:5}}><AlertTriangle/> Montant partiel — sera marque comme Partiel</div>}
              </div>
              <div className='px-g2'>
                <div>
                  <label className='px-lbl'>Mode de paiement</label>
                  <select className='px-inp' value={payForm.mode} onChange={e=>setPF('mode',e.target.value)}>
                    {MODES.map(m=><option key={m} style={{background:'#161b22'}}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className='px-lbl'>Date de paiement</label>
                  <input className='px-inp' type='date' value={payForm.date_paiement} onChange={e=>setPF('date_paiement',e.target.value)}/>
                </div>
              </div>
              {(payForm.mode==='Mobile Money')&&(
                <div className='px-g2'>
                  <div><label className='px-lbl'>Operateur</label><input className='px-inp' value={payForm.operateur} onChange={e=>setPF('operateur',e.target.value)} placeholder='MTN / Moov...'/></div>
                  <div><label className='px-lbl'>Reference transaction</label><input className='px-inp' value={payForm.reference} onChange={e=>setPF('reference',e.target.value)} placeholder='TXN...'/></div>
                </div>
              )}
              {(payForm.mode!=='Mobile Money')&&(
                <div className='px-fld'><label className='px-lbl'>Reference</label><input className='px-inp' value={payForm.reference} onChange={e=>setPF('reference',e.target.value)} placeholder='N° cheque, virement...'/></div>
              )}
              <div className='px-fld'><label className='px-lbl'>Notes (optionnel)</label><textarea className='px-inp' rows={2} value={payForm.notes} onChange={e=>setPF('notes',e.target.value)} placeholder='Remarques...' style={{resize:'vertical',minHeight:60}}/></div>
            </div>
            <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:10,flexShrink:0}}>
              <button onClick={()=>setShowPay(false)} style={{flex:1,padding:11,borderRadius:5,fontSize:14,fontWeight:600,cursor:'pointer',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.1)',fontFamily:'Inter,sans-serif'}}>Annuler</button>
              <button onClick={marquerPaye} disabled={saving||!payForm.montant_paye} style={{flex:2,padding:11,borderRadius:5,fontSize:14,fontWeight:600,cursor:'pointer',background:'#00c896',color:'#fff',border:'none',fontFamily:'Inter,sans-serif',opacity:saving||!payForm.montant_paye?0.4:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{saving?'Enregistrement...':<><CheckCircle2/> Confirmer le paiement</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DETAIL ── */}
      {selPaie&&!showPay&&(
        <div className='px-ov' onClick={e=>e.target===e.currentTarget&&setSelPaie(null)}>
          <div className='px-panel' style={{width:'min(500px,96vw)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:'#e6edf3'}}>{MOIS[(selPaie.periode_mois||1)-1]} {selPaie.periode_annee}</div>
                <div style={{marginTop:6}}><SBadge s={selPaie.statut}/></div>
              </div>
              <button onClick={()=>setSelPaie(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:5,borderRadius:4,display:'flex'}}><svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'><path strokeLinecap='round' d='M6 18L18 6M6 6l12 12'/></svg></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
              <div style={{textAlign:'center',padding:'20px 0 28px',borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:24}}>
                <div style={{fontSize:36,fontWeight:800,color:selPaie.statut==='paye'?'#00c896':selPaie.statut==='en_retard'?'#ef4444':'#e6edf3',marginBottom:6}}>{fmt(selPaie.montant)} FCFA</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Echeance du {selPaie.date_echeance?new Date(selPaie.date_echeance).toLocaleDateString('fr-FR'):'—'}</div>
                {selPaie.statut==='en_retard'&&selPaie.date_echeance&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,fontSize:12.5,color:'#ef4444',marginTop:4}}><AlertTriangle/> Retard de {Math.floor((new Date()-new Date(selPaie.date_echeance))/(1000*60*60*24))} jours</div>}
              </div>
              {[['Bien',selPaie.biens?.nom||'—'],['Locataire',`${selPaie.locataires?.prenom||''} ${selPaie.locataires?.nom||'—'}`],['Periode',`${MOIS[(selPaie.periode_mois||1)-1]} ${selPaie.periode_annee||'—'}`],['Mode bail',selPaie.mode||'—'],['Ref. transaction',selPaie.reference_transaction||null],['Operateur',selPaie.operateur||null],['Date paiement',selPaie.date_paiement?new Date(selPaie.date_paiement).toLocaleDateString('fr-FR'):null],['Notes',selPaie.notes||null]].map(([k,v])=>v?(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',width:140}}>{k}</span>
                  <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span>
                </div>
              ):null)}
              <div style={{marginTop:24,display:'flex',flexDirection:'column',gap:8}}>
                {['en_attente','en_retard','partiel'].includes(selPaie.statut)&&(
                  <button className='px-btn px-btn-g' style={{justifyContent:'center',padding:'11px',display:'flex',alignItems:'center',gap:6}} onClick={()=>{setPayForm({mode:'Mobile Money',operateur:'',reference:'',date_paiement:new Date().toISOString().split('T')[0],montant_paye:String(selPaie.montant),notes:''});setShowPay(true)}}><CheckCircle2/> Encaisser ce paiement</button>
                )}
                {selPaie.statut==='paye'&&(
                  <button className='px-btn px-btn-y' style={{justifyContent:'center',padding:'11px',display:'flex',alignItems:'center',gap:6}} onClick={()=>remettreEnAttente(selPaie)}><Undo2/> Remettre en attente</button>
                )}
                {selPaie.statut!=='annule'&&selPaie.statut!=='paye'&&(
                  <button className='px-btn px-btn-r' style={{justifyContent:'center',padding:'11px',display:'flex',alignItems:'center',gap:6}} onClick={()=>annulerPaiement(selPaie)}><Ban/> Annuler ce paiement</button>
                )}
                <button className='px-btn' style={{justifyContent:'center',padding:'11px',display:'flex',alignItems:'center',gap:6}} onClick={()=>{setSelPaie(null);navigate('/imoloc/baux')}}><FileText/> Voir le bail associe</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
