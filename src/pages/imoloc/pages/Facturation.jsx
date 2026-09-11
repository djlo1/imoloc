import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
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
  DocumentText32Regular as FileTextLarge,
  DataBarVertical16Regular as BarChartIcon,
  Add16Regular as Plus,
  Dismiss16Regular as X,
  People16Regular as PeopleMoney,
  Money16Regular as MoneyIcon,
  ReceiptMoney16Regular as ReceiptMoney,
} from '@fluentui/react-icons'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '—'

// ─────────────────────────────────────────────────────────
// Systeme de table Fluent — repris a l'identique de la page
// Facturation du Centre d'administration (Abonnement.jsx) pour que les
// deux ecrans de facturation de l'app partagent le meme design.
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

function MontantBarChart({ entrees, fmt, devise='FCFA' }) {
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
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Montant total</span>
      </div>
      <div style={{ borderLeft:'3px solid #4da6ff', paddingLeft:14, marginTop:14, paddingBottom:10 }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Montant total</div>
        <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{fmt(entrees.reduce((s,[,v])=>s+v,0))} {devise}</div>
      </div>
    </div>
  )
}

const STATUT_PAIEMENT_CFG = {
  paye:       { color:'#00c896', bg:'rgba(0,200,150,0.1)',  label:'Paye' },
  partiel:    { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'Partiel' },
  en_attente: { color:'#8b949e', bg:'rgba(139,148,158,0.1)',label:'En attente' },
  en_retard:  { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'En retard' },
  annule:     { color:'#4b5563', bg:'rgba(75,85,99,0.1)',   label:'Annule' },
}
const STATUT_FACTURE_CFG = {
  brouillon: { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Brouillon' },
  envoyee:   { color:'#0078d4', bg:'rgba(0,120,212,0.1)',   label:'Envoyee' },
  payee:     { color:'#00c896', bg:'rgba(0,200,150,0.1)',   label:'Payee' },
  en_retard: { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   label:'En retard' },
  annulee:   { color:'#4b5563', bg:'rgba(75,85,99,0.1)',    label:'Annulee' },
}
const STATUT_RELEVE_CFG = {
  brouillon: { color:'#8b949e', bg:'rgba(139,148,158,0.1)', label:'Brouillon' },
  envoye:    { color:'#0078d4', bg:'rgba(0,120,212,0.1)',   label:'Envoye' },
  verse:     { color:'#00c896', bg:'rgba(0,200,150,0.1)',   label:'Verse' },
}
const Badge = ({ val, cfg }) => {
  const c = cfg[val] || Object.values(cfg)[0]
  return <span style={{fontSize:11,padding:'2px 9px',borderRadius:100,fontWeight:600,background:c.bg,color:c.color,border:`1px solid ${c.color}33`,whiteSpace:'nowrap'}}>{c.label}</span>
}

const RefLink = ({ to, children }) => {
  const navigate = useNavigate()
  if (!children || children==='—') return <span style={{color:'rgba(255,255,255,0.3)'}}>—</span>
  return (
    <a href={to} onClick={e=>{e.preventDefault();navigate(to)}} style={{color:'#4da6ff',textDecoration:'none',cursor:'pointer'}}
      onMouseOver={e=>e.currentTarget.style.color='#6cb8ff'} onMouseOut={e=>e.currentTarget.style.color='#4da6ff'}>
      {children}
    </a>
  )
}

const inp = {width:'100%',padding:'8px 10px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:2,fontFamily:'Inter,sans-serif',fontSize:13,color:'#e6edf3',outline:'none',colorScheme:'dark',boxSizing:'border-box'}
const lbl = {display:'block',fontSize:13,fontWeight:400,color:'rgba(255,255,255,0.85)',marginBottom:6}
const btnBase = {display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:5,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontFamily:'Inter,sans-serif',transition:'all 0.15s'}
const btnP = {...btnBase,background:'#0078d4',borderColor:'#0078d4',color:'#fff'}
const linkBtn = { background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }

const VIEW_TITLES = {
  'factures-locataires':   'Factures locataires',
  'factures-diverses':     'Factures diverses',
  'releves-proprietaires': 'Releves proprietaires',
  'depenses-charges':      'Depenses & charges',
}

export default function Facturation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [agence, setAgence] = useState(null)
  const [loading, setLoading] = useState(true)

  const seg = location.pathname.split('/').pop()
  const view = VIEW_TITLES[seg] ? seg : 'factures-locataires'
  const space = location.pathname.startsWith('/agence') ? 'agence' : 'imoloc'

  // Factures locataires (paiements existants, presentes comme factures)
  const [echeances, setEcheances] = useState([])
  const [echSearch, setEchSearch] = useState('')
  const [echStatutFilter, setEchStatutFilter] = useState('tout')
  const [echProprietaireFilter, setEchProprietaireFilter] = useState('tout')
  const [echDuree, setEchDuree] = useState('12mois')
  const [selectedEch, setSelectedEch] = useState([])
  const [echSortField, setEchSortField] = useState(null)
  const [echSortDir, setEchSortDir] = useState('asc')
  const [vueEch, setVueEch] = useState('liste')
  const [echColWidths, setEchColWidths] = useState({})
  const proprietairesMap = useRef({})

  // Factures diverses
  const [facturesDiverses, setFacturesDiverses] = useState([])
  const [showAddFacture, setShowAddFacture] = useState(false)
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [newFacture, setNewFacture] = useState({ bien_id:'', locataire_id:'', montant:'', date_echeance:'', description:'' })
  // Releves proprietaires
  const [releves, setReleves] = useState([])
  const [proprietaires, setProprietaires] = useState([])
  const [showGenReleve, setShowGenReleve] = useState(false)
  const [genReleve, setGenReleve] = useState({ proprietaire_id:'', mois:new Date().toISOString().slice(0,7) })
  const [generating, setGenerating] = useState(false)
  // Depenses & charges
  const [depenses, setDepenses] = useState([])

  useEffect(() => { initAgence() }, [])
  useEffect(() => { if (agence?.id) loadView() }, [agence?.id, view])

  const initAgence = async () => {
    const { data:{ user } } = await supabase.auth.getUser()
    const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
    setAgence(ag)
  }

  const ECH_COL_DEFAULTS = { locataire:170, bien:170, proprietaire:170, periode:110, echeance:130, montant:130, statut:190 }
  const ECH_COLONNES = [
    { key:'locataire', label:'Locataire', field:'locataire_nom' },
    { key:'bien', label:'Bien', field:'bien_nom' },
    { key:'proprietaire', label:'Proprietaire', field:'proprietaire_nom' },
    { key:'periode', label:'Periode', field:'periode_annee' },
    { key:'echeance', label:'Echeance', field:'date_echeance' },
    { key:'montant', label:'Montant', field:'montant' },
    { key:'statut', label:'Etat', field:'statut' },
  ]
  const resizeEchCol = (key, delta) => setEchColWidths(w => ({ ...w, [key]: Math.max(60, (w[key] ?? ECH_COL_DEFAULTS[key] ?? 140) + delta) }))
  const toggleEchSort = (field) => {
    if (!field) return
    if (echSortField !== field) { setEchSortField(field); setEchSortDir('asc'); return }
    if (echSortDir === 'asc') { setEchSortDir('desc'); return }
    setEchSortField(null)
  }
  const toggleSelectEch = (id) => setSelectedEch(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id])
  const toggleSelectAllEch = (list) => setSelectedEch(s => (list.length>0 && list.every(f=>s.includes(f.id))) ? [] : list.map(f=>f.id))

  const exporterEchCSV = (list) => {
    const lignes = [
      ['Locataire','Bien','Proprietaire','Periode','Echeance','Montant','Etat'],
      ...list.map(e => [e.locataire_nom, e.bien_nom, e.proprietaire_nom, `${e.periode_mois}/${e.periode_annee}`, e.date_echeance?new Date(e.date_echeance).toLocaleDateString('fr-FR'):'', `${fmt(e.montant)} FCFA`, STATUT_PAIEMENT_CFG[e.statut]?.label||e.statut]),
    ]
    const csv = lignes.map(l => l.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `factures-locataires-${agence?.nom||'imoloc'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadView = async () => {
    setLoading(true)
    try {
      if (view==='factures-locataires') {
        const [{ data: paie }, { data: biensData }, { data: props }] = await Promise.all([
          supabase.from('paiements').select('*, biens(id,nom,ville,proprietaire_id), locataires(id,nom,prenom)').eq('agence_id', agence.id).order('date_echeance', { ascending:false }),
          supabase.from('biens').select('id,proprietaire_id').eq('agence_id', agence.id),
          supabase.from('proprietaires').select('id,nom,prenom'),
        ])
        const propsById = {}
        for (const p of (props||[])) propsById[p.id] = `${p.prenom||''} ${p.nom||''}`.trim()
        proprietairesMap.current = propsById
        setEcheances((paie||[]).map(e => ({
          ...e,
          locataire_nom: e.locataires ? `${e.locataires.prenom||''} ${e.locataires.nom||''}`.trim() : '',
          bien_nom: e.biens?.nom || '',
          proprietaire_id: e.biens?.proprietaire_id || null,
          proprietaire_nom: propsById[e.biens?.proprietaire_id] || '',
        })))
      } else if (view==='factures-diverses') {
        const [{ data: fd }, { data: b }, { data: l }] = await Promise.all([
          supabase.from('factures_diverses').select('*, biens(nom,ville), locataires(nom,prenom)').eq('agence_id', agence.id).order('created_at', { ascending:false }),
          supabase.from('biens').select('id,nom').eq('agence_id', agence.id),
          supabase.from('locataires').select('id,nom,prenom').eq('agence_id', agence.id),
        ])
        setFacturesDiverses(fd||[])
        setBiens(b||[])
        setLocataires(l||[])
      } else if (view==='releves-proprietaires') {
        const [{ data: r }, { data: p }] = await Promise.all([
          supabase.from('releves_proprietaires').select('*, proprietaires(nom,prenom)').eq('agence_id', agence.id).order('periode_debut', { ascending:false }),
          supabase.from('proprietaires').select('id,nom,prenom').order('nom'),
        ])
        setReleves(r||[])
        setProprietaires(p||[])
      } else if (view==='depenses-charges') {
        const bienIds = (await supabase.from('biens').select('id').eq('agence_id', agence.id)).data?.map(x=>x.id)||[]
        const [{ data: charges }, { data: taxes }, { data: assurances }, { data: tickets }, { data: b }] = await Promise.all([
          supabase.from('charges_bien').select('bien_id, montant').in('bien_id', bienIds),
          supabase.from('taxes_bien').select('bien_id, montant').in('bien_id', bienIds),
          supabase.from('assurances').select('bien_id, prime').in('bien_id', bienIds),
          supabase.from('tickets').select('bien_id, cout_estime').eq('agence_id', agence.id).neq('statut','ferme'),
          supabase.from('biens').select('id,nom').eq('agence_id', agence.id),
        ])
        const parBien = {}
        for (const bi of (b||[])) parBien[bi.id] = { id: bi.id, nom: bi.nom, charges:0, taxes:0, assurances:0, tickets:0 }
        for (const c of (charges||[])) { if (parBien[c.bien_id]) parBien[c.bien_id].charges += Number(c.montant||0) }
        for (const t of (taxes||[])) { if (parBien[t.bien_id]) parBien[t.bien_id].taxes += Number(t.montant||0) }
        for (const a of (assurances||[])) { if (parBien[a.bien_id]) parBien[a.bien_id].assurances += Number(a.prime||0) }
        for (const tk of (tickets||[])) { if (parBien[tk.bien_id]) parBien[tk.bien_id].tickets += Number(tk.cout_estime||0) }
        setDepenses(Object.values(parBien).filter(d=>d.charges||d.taxes||d.assurances||d.tickets))
      }
    } catch(e) { console.error(e); toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }

  const addFactureDiverse = async () => {
    if (!newFacture.montant || !newFacture.description) { toast.error('Montant et description requis'); return }
    const { data:{ user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('factures_diverses').insert({
      agence_id: agence.id, bien_id: newFacture.bien_id||null, locataire_id: newFacture.locataire_id||null,
      montant: Number(newFacture.montant), date_echeance: newFacture.date_echeance||null,
      description: newFacture.description, statut:'envoyee', created_by: user.id,
    }).select('*, biens(nom,ville), locataires(nom,prenom)').single()
    if (error) { toast.error(error.message); return }
    setFacturesDiverses(f=>[data, ...f])
    setShowAddFacture(false)
    setNewFacture({ bien_id:'', locataire_id:'', montant:'', date_echeance:'', description:'' })
  }
  const changerStatutFacture = async (id, statut) => {
    setFacturesDiverses(f=>f.map(x=>x.id===id?{...x,statut}:x))
    await supabase.from('factures_diverses').update({ statut }).eq('id', id)
  }
  const deleteFactureDiverse = async (id) => {
    setFacturesDiverses(f=>f.filter(x=>x.id!==id))
    await supabase.from('factures_diverses').delete().eq('id', id)
  }

  const genererReleve = async () => {
    if (!genReleve.proprietaire_id) { toast.error('Proprietaire requis'); return }
    setGenerating(true)
    try {
      const [annee, mois] = genReleve.mois.split('-').map(Number)
      const periode_debut = `${annee}-${String(mois).padStart(2,'0')}-01`
      const periode_fin = new Date(annee, mois, 0).toISOString().slice(0,10)
      const { error } = await supabase.rpc('generer_releve_proprietaire', {
        p_proprietaire_id: genReleve.proprietaire_id, p_agence_id: agence.id,
        p_periode_debut: periode_debut, p_periode_fin: periode_fin,
      })
      if (error) throw error
      toast.success('Releve genere')
      setShowGenReleve(false)
      loadView()
    } catch(e) { toast.error(e.message||'Erreur de generation') }
    finally { setGenerating(false) }
  }
  const changerStatutReleve = async (id, statut) => {
    const patch = { statut }
    if (statut==='verse') patch.date_versement = new Date().toISOString().slice(0,10)
    setReleves(r=>r.map(x=>x.id===id?{...x,...patch}:x))
    await supabase.from('releves_proprietaires').update(patch).eq('id', id)
  }

  const dureeLimite = { '3mois':3, '12mois':12, 'tout':null }[echDuree]
  const echeancesFiltrees = echeances
    .filter(e => echStatutFilter==='tout' || e.statut===echStatutFilter)
    .filter(e => echProprietaireFilter==='tout' || e.proprietaire_id===echProprietaireFilter)
    .filter(e => !echSearch || e.locataire_nom?.toLowerCase().includes(echSearch.toLowerCase()) || e.locataire_id?.toLowerCase().includes(echSearch.toLowerCase()) || e.bien_nom?.toLowerCase().includes(echSearch.toLowerCase()))
    .filter(e => !dureeLimite || (e.date_echeance && new Date(e.date_echeance) >= new Date(Date.now() - dureeLimite*30*24*60*60*1000)))
    .sort((a,b) => {
      if (!echSortField) return 0
      let va = a[echSortField], vb = b[echSortField]
      if (echSortField==='montant') { va = Number(va||0); vb = Number(vb||0) }
      else { va = va ?? ''; vb = vb ?? '' }
      const cmp = va > vb ? 1 : va < vb ? -1 : 0
      return echSortDir==='asc' ? cmp : -cmp
    })
  const montantDu = echeances.filter(e=>e.statut!=='paye').reduce((s,e)=>s+Number(e.montant||0),0)
  const parMoisChart = {}
  echeancesFiltrees.forEach(e => { const cle = `${String(e.periode_mois).padStart(2,'0')}/${e.periode_annee}`; parMoisChart[cle] = (parMoisChart[cle]||0) + Number(e.montant||0) })
  const entreesChart = Object.entries(parMoisChart).sort((a,b) => { const [ma,ya]=a[0].split('/'); const [mb,yb]=b[0].split('/'); return new Date(ya,ma-1)-new Date(yb,mb-1) })

  const uniqueProprietaires = Object.entries(proprietairesMap.current).map(([id,nom])=>({ value:id, label:nom||'—' }))

  return (
    <div style={{minHeight:'100%'}}>
      <style>{FLUENT_TABLE_CSS}</style>

      <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:14 }}>
        Accueil <span style={{ margin:'0 4px' }}>&gt;</span> <span style={{ color:'rgba(255,255,255,0.6)' }}>Facturation</span>
      </div>

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:20}}>
        <div style={{fontSize:26,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em'}}>{VIEW_TITLES[view]}</div>
        {view==='factures-diverses'&&<button style={btnP} onClick={()=>setShowAddFacture(o=>!o)}><Plus/> Nouvelle facture</button>}
        {view==='releves-proprietaires'&&<button style={btnP} onClick={()=>setShowGenReleve(o=>!o)}><Plus/> Generer un releve</button>}
      </div>

      {loading?(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
      ):(
      <>
        {view==='factures-locataires'&&(<>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:20, lineHeight:1.5 }}>
            Les factures de loyer sont generees automatiquement des la creation du bail, une par echeance. Retrouvez ici l'ensemble des factures de tous les locataires, filtrables par locataire ou par proprietaire.
          </div>

          <div style={{ display:'flex', gap:10, padding:'14px 16px', background:'rgba(0,120,212,0.06)', borderRadius:2, marginBottom:24 }}>
            <Info style={{ color:'#4da6ff', flexShrink:0, marginTop:1 }}/>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>
              Connecte a <span style={{color:'#4da6ff',fontWeight:600}}>{agence?.nom}</span> — {echeances.length} facture{echeances.length!==1?'s':''} au total.
            </div>
          </div>

          <div style={{ display:'flex', gap:32, marginBottom:20, flexWrap:'wrap' }}>
            <div style={{ borderLeft:'3px solid #d6249f', paddingLeft:14 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Total factures</div>
              <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{echeances.length}</div>
            </div>
            <div style={{ borderLeft:'3px solid #0078d4', paddingLeft:14 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Montant du</div>
              <div style={{ fontSize:22, fontWeight:700, color:'#e6edf3' }}>{fmt(montantDu)} FCFA</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:14, flexWrap:'wrap', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={loadView} style={linkBtn}><RefreshCw/> Actualiser</button>
            <button onClick={()=>exporterEchCSV(selectedEch.length?echeancesFiltrees.filter(e=>selectedEch.includes(e.id)):echeancesFiltrees)} style={linkBtn}><Download/> Exporter vers un fichier CSV</button>
            <SearchBox value={echSearch} onChange={e=>setEchSearch(e.target.value)} placeholder="Nom ou ID du locataire, bien..." style={{ minWidth:220 }}/>
            <div style={{ marginLeft:'auto' }}><ViewSwitcher value={vueEch} onChange={setVueEch}/></div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, flexWrap:'wrap' }}>
            <FilterPill label="Etat" value={echStatutFilter} onChange={setEchStatutFilter}
              options={[{value:'tout',label:'Tout'}, ...Object.entries(STATUT_PAIEMENT_CFG).map(([k,v])=>({value:k,label:v.label}))]}/>
            <FilterPill label="Proprietaire" value={echProprietaireFilter} onChange={setEchProprietaireFilter}
              options={[{value:'tout',label:'Tous'}, ...uniqueProprietaires]}/>
            <FilterPill label="Periode" value={echDuree} onChange={setEchDuree}
              options={[{value:'3mois',label:'3 derniers mois'},{value:'12mois',label:'12 derniers mois'},{value:'tout',label:'Tout'}]}/>
          </div>

          {vueEch === 'graphique' ? (
            <MontantBarChart entrees={entreesChart} fmt={fmt}/>
          ) : echeancesFiltrees.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
              <FileTextLarge style={{ marginBottom:12, opacity:0.3 }}/>
              <div style={{ fontSize:14 }}>{echeances.length===0 ? 'Aucune facture pour le moment' : 'Aucune facture ne correspond a ce filtre'}</div>
            </div>
          ) : (
            <div style={{ overflowX:'auto', overflowY:'visible' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900, tableLayout:'fixed' }}>
                <colgroup>
                  <col style={{ width:36 }}/>
                  {ECH_COLONNES.map(c => <col key={c.key} style={{ width:echColWidths[c.key] ?? ECH_COL_DEFAULTS[c.key] }}/>)}
                </colgroup>
                <thead><tr>
                  <th className="fl-th"><FluentCheckbox checked={echeancesFiltrees.length>0 && echeancesFiltrees.every(e=>selectedEch.includes(e.id))} onChange={()=>toggleSelectAllEch(echeancesFiltrees)}/></th>
                  {ECH_COLONNES.map(c=>(
                    <th key={c.key} className="fl-th">
                      <ColHeader label={c.label} sortDir={echSortField===c.field ? echSortDir : null} onSort={()=>toggleEchSort(c.field)} onResize={delta=>resizeEchCol(c.key, delta)}/>
                    </th>
                  ))}
                </tr></thead>
                <tbody>{echeancesFiltrees.map(e=>{
                  const sc = STATUT_PAIEMENT_CFG[e.statut] || STATUT_PAIEMENT_CFG.en_attente
                  const selected = selectedEch.includes(e.id)
                  return <tr key={e.id} className={`fl-row${selected ? ' fl-row-selected' : ''}`} onClick={()=>navigate(`/${space}/locataires?locataire=${e.locataire_id}`)}>
                    <td className="fl-td"><FluentCheckbox checked={selected} onChange={()=>toggleSelectEch(e.id)}/></td>
                    <td className="fl-td ind-td" style={{ '--ind-c':sc.color }} onClick={ev=>ev.stopPropagation()}>
                      <RefLink to={`/imoloc/locataires?locataire=${e.locataire_id}`}>{e.locataire_nom||'—'}</RefLink>
                    </td>
                    <td className="fl-td" onClick={ev=>ev.stopPropagation()}><RefLink to={`/${space}/biens?bien=${e.bien_id}`}>{e.bien_nom}</RefLink></td>
                    <td className="fl-td" onClick={ev=>ev.stopPropagation()}><RefLink to={`/imoloc/proprietaires?proprietaire=${e.proprietaire_id}`}>{e.proprietaire_nom}</RefLink></td>
                    <td className="fl-td">{e.periode_mois?`${String(e.periode_mois).padStart(2,'0')}/${e.periode_annee}`:'—'}</td>
                    <td className="fl-td">{e.date_echeance?new Date(e.date_echeance).toLocaleDateString('fr-FR'):'—'}</td>
                    <td className="fl-td" style={{ fontWeight:600 }}>{fmt(e.montant)} FCFA</td>
                    <td className="fl-td">
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {e.statut==='paye' && <CheckCircle2 style={{ color:'#00c896', flexShrink:0 }}/>}
                        <span style={{ fontSize:12.5, color:sc.color }}>{e.statut==='paye' ? `Paye le ${e.date_paiement?new Date(e.date_paiement).toLocaleDateString('fr-FR'):'—'}` : sc.label}</span>
                      </div>
                    </td>
                  </tr>
                })}</tbody>
              </table>
            </div>
          )}
        </>)}

        {view==='factures-diverses'&&(
          <>
            {showAddFacture&&(
              <div style={{background:'rgba(255,255,255,0.03)',padding:16,borderRadius:8,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}>Bien (optionnel)</label>
                    <select style={inp} value={newFacture.bien_id} onChange={e=>setNewFacture(f=>({...f,bien_id:e.target.value}))}>
                      <option value="">Aucun</option>{biens.map(b=><option key={b.id} value={b.id}>{b.nom}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Locataire (optionnel)</label>
                    <select style={inp} value={newFacture.locataire_id} onChange={e=>setNewFacture(f=>({...f,locataire_id:e.target.value}))}>
                      <option value="">Aucun</option>{locataires.map(l=><option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Montant (FCFA) <span style={{color:'#ef4444'}}>*</span></label><input type="number" style={inp} value={newFacture.montant} onChange={e=>setNewFacture(f=>({...f,montant:e.target.value}))}/></div>
                  <div><label style={lbl}>Echeance</label><input type="date" style={inp} value={newFacture.date_echeance} onChange={e=>setNewFacture(f=>({...f,date_echeance:e.target.value}))}/></div>
                  <div style={{gridColumn:'1/-1'}}><label style={lbl}><span>Description</span> <span style={{color:'#ef4444'}}>*</span></label><input style={inp} value={newFacture.description} onChange={e=>setNewFacture(f=>({...f,description:e.target.value}))} placeholder="Ex: Frais de dossier"/></div>
                </div>
                <button style={btnP} onClick={addFactureDiverse}>Ajouter la facture</button>
              </div>
            )}
            {facturesDiverses.length===0?(
              <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
                <ReceiptMoney style={{ marginBottom:12, opacity:0.3, width:32, height:32 }}/>
                <div style={{ fontSize:14 }}>Aucune facture diverse</div>
              </div>
            ):(
              <div style={{ overflowX:'auto' }}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Description','Bien','Locataire','Echeance','Montant','Statut',''].map(h=>(
                    <th key={h} className="fl-th">{h}</th>
                  ))}</tr></thead>
                  <tbody>{facturesDiverses.map(f=>(
                    <tr key={f.id} className="fl-row">
                      <td className="fl-td" style={{fontWeight:600}}>{f.description}</td>
                      <td className="fl-td"><RefLink to={`/${space}/biens?bien=${f.bien_id}`}>{f.biens?.nom}</RefLink></td>
                      <td className="fl-td"><RefLink to={`/imoloc/locataires?locataire=${f.locataire_id}`}>{f.locataires?`${f.locataires.prenom} ${f.locataires.nom}`:null}</RefLink></td>
                      <td className="fl-td" style={{color:'rgba(255,255,255,0.5)'}}>{f.date_echeance?new Date(f.date_echeance).toLocaleDateString('fr-FR'):'—'}</td>
                      <td className="fl-td" style={{fontWeight:600}}>{fmt(f.montant)} FCFA</td>
                      <td className="fl-td" onClick={e=>e.stopPropagation()}>
                        <select value={f.statut} onChange={e=>changerStatutFacture(f.id,e.target.value)} style={{...inp,padding:'4px 8px',fontSize:11,width:'auto'}}>
                          {Object.keys(STATUT_FACTURE_CFG).map(k=><option key={k} value={k}>{STATUT_FACTURE_CFG[k].label}</option>)}
                        </select>
                      </td>
                      <td className="fl-td" onClick={e=>e.stopPropagation()}><button onClick={()=>deleteFactureDiverse(f.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)'}}><X/></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {view==='releves-proprietaires'&&(
          <>
            {showGenReleve&&(
              <div style={{background:'rgba(255,255,255,0.03)',padding:16,borderRadius:8,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={lbl}><span>Proprietaire</span> <span style={{color:'#ef4444'}}>*</span></label>
                    <select style={inp} value={genReleve.proprietaire_id} onChange={e=>setGenReleve(g=>({...g,proprietaire_id:e.target.value}))}>
                      <option value="">Choisir...</option>{proprietaires.map(p=><option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Mois</label><input type="month" style={inp} value={genReleve.mois} onChange={e=>setGenReleve(g=>({...g,mois:e.target.value}))}/></div>
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:12 }}>Revenu brut, commission et charges sont calcules automatiquement a partir des paiements, du mandat et des charges du bien.</div>
                <button style={btnP} disabled={generating} onClick={genererReleve}>{generating?'Generation...':'Generer'}</button>
              </div>
            )}
            {releves.length===0?(
              <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
                <PeopleMoney style={{ marginBottom:12, opacity:0.3, width:32, height:32 }}/>
                <div style={{ fontSize:14 }}>Aucun releve</div>
                <div style={{ fontSize:12.5, marginTop:6, color:'rgba(255,255,255,0.25)' }}>Un brouillon est aussi genere automatiquement chaque debut de mois pour les mandats actifs</div>
              </div>
            ):(
              <div style={{ overflowX:'auto' }}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Proprietaire','Periode','Revenu brut','Commission','Charges','Net a verser','Statut'].map(h=>(
                    <th key={h} className="fl-th">{h}</th>
                  ))}</tr></thead>
                  <tbody>{releves.map(r=>(
                    <tr key={r.id} className="fl-row">
                      <td className="fl-td" style={{fontWeight:600}}><RefLink to={`/imoloc/proprietaires?proprietaire=${r.proprietaire_id}`}>{r.proprietaires?`${r.proprietaires.prenom} ${r.proprietaires.nom}`:null}</RefLink></td>
                      <td className="fl-td" style={{color:'rgba(255,255,255,0.5)'}}>{new Date(r.periode_debut).toLocaleDateString('fr-FR',{month:'short',year:'numeric'})}</td>
                      <td className="fl-td">{fmt(r.revenu_brut)} FCFA</td>
                      <td className="fl-td" style={{color:'#ef4444'}}>-{fmt(r.commission)} FCFA</td>
                      <td className="fl-td" style={{color:'#ef4444'}}>-{fmt(r.charges)} FCFA</td>
                      <td className="fl-td" style={{fontWeight:700,color:'#00c896'}}>{fmt(r.montant_net)} FCFA</td>
                      <td className="fl-td" onClick={e=>e.stopPropagation()}>
                        <select value={r.statut} onChange={e=>changerStatutReleve(r.id,e.target.value)} style={{...inp,padding:'4px 8px',fontSize:11,width:'auto'}}>
                          {Object.keys(STATUT_RELEVE_CFG).map(k=><option key={k} value={k}>{STATUT_RELEVE_CFG[k].label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {view==='depenses-charges'&&(
          depenses.length===0?(
            <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
              <MoneyIcon style={{ marginBottom:12, opacity:0.3, width:32, height:32 }}/>
              <div style={{ fontSize:14 }}>Aucune depense enregistree</div>
            </div>
          ):(
            <div style={{ overflowX:'auto' }}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['Bien','Charges','Taxes','Assurances','Tickets (couts estimes)','Total'].map(h=>(
                  <th key={h} className="fl-th">{h}</th>
                ))}</tr></thead>
                <tbody>{depenses.map((d,i)=>{
                  const total = d.charges+d.taxes+d.assurances+d.tickets
                  return (
                    <tr key={i} className="fl-row">
                      <td className="fl-td" style={{fontWeight:600}}><RefLink to={`/${space}/biens?bien=${d.id}`}>{d.nom}</RefLink></td>
                      <td className="fl-td">{fmt(d.charges)} FCFA</td>
                      <td className="fl-td">{fmt(d.taxes)} FCFA</td>
                      <td className="fl-td">{fmt(d.assurances)} FCFA</td>
                      <td className="fl-td">{fmt(d.tickets)} FCFA</td>
                      <td className="fl-td" style={{fontWeight:700,color:'#f59e0b'}}>{fmt(total)} FCFA</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          )
        )}
      </>
      )}
    </div>
  )
}
