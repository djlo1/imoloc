import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowClockwise16Regular as RefreshCw,
  ArrowDownload16Regular as Download,
  Search16Regular as Search,
  List16Regular as List,
  ArrowSort16Regular as ArrowSort,
  ArrowSortUp16Regular as ArrowSortUp,
  ArrowSortDown16Regular as ArrowSortDown,
  ChevronDown16Regular as ChevronDown,
  Payment16Regular as CreditCard,
  Warning16Regular as AlertTriangle,
  HourglassHalf16Regular as Hourglass,
  DocumentText32Regular as FileTextLarge,
  DataBarVertical16Regular as BarChartIcon,
  Add16Regular as Plus,
  Dismiss16Regular as X,
} from '@fluentui/react-icons'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import Trend from '../../../components/ui/Trend'

const MODES = ['Mobile Money','Virement bancaire','Espèces','Chèque','Carte bancaire']
const STATUTS = ['payé','en attente','retard']
const S_CFG = {
  'payé':       { color:'#00c896', bg:'rgba(0,200,150,0.12)',  label:'Payé' },
  'en attente': { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'En attente' },
  'retard':     { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'Retard' },
}
const fmt = (n) => n!=null ? Number(n).toLocaleString('fr-FR') : '—'

// ─────────────────────────────────────────────────────────
// Systeme de table Fluent — identique a celui du Centre
// d'administration (Abonnement.jsx) et de Facturation.jsx.
// ─────────────────────────────────────────────────────────
const FLUENT_TABLE_CSS = `
.fl-row { border-left:2px solid transparent; transition:background-color 0.1s ease; cursor:default; }
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

export default function Paiements() {
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [agenceId, setAgenceId] = useState(null)
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [form, setForm] = useState({ montant:'', mode:'Mobile Money', statut:'payé', date_paiement: new Date().toISOString().split('T')[0], bien_id:'', locataire_id:'', notes:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const [selectedP, setSelectedP] = useState([])
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [vue, setVue] = useState('liste')
  const [colWidths, setColWidths] = useState({})
  const COL_DEFAULTS = { locataire:170, bien:170, montant:130, mode:150, date:130, statut:140 }
  const COLONNES = [
    { key:'locataire', label:'Locataire', field:'locataire_nom' },
    { key:'bien', label:'Bien', field:'bien_nom' },
    { key:'montant', label:'Montant', field:'montant' },
    { key:'mode', label:'Mode', field:'mode' },
    { key:'date', label:'Date', field:'date_paiement' },
    { key:'statut', label:'Statut', field:'statut' },
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

  const chargerPaiements = async (agId) => {
    const { data } = await supabase.from('paiements').select('*, biens(nom), locataires(nom,prenom)').eq('agence_id', agId).order('created_at',{ascending:false})
    setPaiements((data||[]).map((p,i) => ({ ...p, id: p.id ?? `tmp-${i}`, bien_nom: p.biens?.nom||'', locataire_nom: p.locataires ? `${p.locataires.prenom||''} ${p.locataires.nom||''}`.trim() : '' })))
  }

  useEffect(() => {
    const init = async () => {
      const { data:{user} } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('id').eq('profile_id', user.id).single()
      if (ag) {
        setAgenceId(ag.id)
        const [,{ data:b },{ data:l }] = await Promise.all([
          chargerPaiements(ag.id),
          supabase.from('biens').select('id,nom').eq('agence_id', ag.id),
          supabase.from('locataires').select('id,nom,prenom').eq('agence_id', ag.id),
        ])
        setBiens(b||[]); setLocataires(l||[])
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('paiements').insert({ ...form, agence_id: agenceId, montant: Number(form.montant) })
    if (error) { toast.error(error.message); return }
    toast.success('Paiement enregistré !')
    setShowModal(false)
    setForm({ montant:'', mode:'Mobile Money', statut:'payé', date_paiement: new Date().toISOString().split('T')[0], bien_id:'', locataire_id:'', notes:'' })
    chargerPaiements(agenceId)
  }

  const now = new Date()
  const moisPrecedent = new Date(now.getFullYear(), now.getMonth()-1)
  const totalMois = paiements.filter(p => p.statut === 'payé' && p.date_paiement && new Date(p.date_paiement).getMonth() === now.getMonth() && new Date(p.date_paiement).getFullYear() === now.getFullYear()).reduce((s,p) => s + Number(p.montant), 0)
  const totalMoisPrecedent = paiements.filter(p => p.statut === 'payé' && p.date_paiement && new Date(p.date_paiement).getMonth() === moisPrecedent.getMonth() && new Date(p.date_paiement).getFullYear() === moisPrecedent.getFullYear()).reduce((s,p) => s + Number(p.montant), 0)
  const totalMoisTrend = totalMoisPrecedent>0 ? Math.round(((totalMois-totalMoisPrecedent)/totalMoisPrecedent)*100) : (totalMois>0?100:0)

  const filtered = paiements
    .filter(p => {
      const ms = !search || `${p.bien_nom} ${p.locataire_nom}`.toLowerCase().includes(search.toLowerCase())
      const fs = filterStatut==='tous' || p.statut===filterStatut
      return ms && fs
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
      ['Locataire','Bien','Montant','Mode','Date','Statut'],
      ...list.map(p => [p.locataire_nom, p.bien_nom, `${fmt(p.montant)} FCFA`, p.mode, p.date_paiement?new Date(p.date_paiement).toLocaleDateString('fr-FR'):'', S_CFG[p.statut]?.label||p.statut]),
    ]
    const csv = lignes.map(l => l.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'paiements-agence.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parMoisChart = {}
  filtered.forEach(p => { if (p.statut==='payé' && p.date_paiement) { const d = new Date(p.date_paiement); const cle = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; parMoisChart[cle] = (parMoisChart[cle]||0) + Number(p.montant||0) } })
  const entreesChart = Object.entries(parMoisChart).sort((a,b) => { const [ma,ya]=a[0].split('/'); const [mb,yb]=b[0].split('/'); return new Date(ya,ma-1)-new Date(yb,mb-1) })

  const SBadge = ({s}) => { const c=S_CFG[s]||S_CFG['en attente']; return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 9px',borderRadius:'100px',fontSize:11,fontWeight:600,background:c.bg,color:c.color}}><span style={{width:6,height:6,borderRadius:'50%',background:c.color,flexShrink:0}}/>{c.label}</span> }

  const linkBtn = { background:'none', border:'none', color:'#4da6ff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:6 }
  const inp = { width:'100%', padding:'8px 10px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:2, fontFamily:'Inter,sans-serif', fontSize:13, color:'#e6edf3', outline:'none', colorScheme:'dark', boxSizing:'border-box' }
  const lbl = { display:'block', fontSize:13, fontWeight:400, color:'rgba(255,255,255,0.85)', marginBottom:6 }

  return (
    <>
      <style>{FLUENT_TABLE_CSS}</style>
      <style>{`
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover{background:#006cc1}
        .pg-btn-ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.08)}
        .pg-btn-ghost:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:8px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
        .modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .modal-title{font-size:16px;font-weight:700;color:#e6edf3}
        .modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex}
        .modal-close:hover{background:rgba(255,255,255,0.06)}
        .modal-body{padding:24px}
        .modal-foot{padding:16px 24px;border-top:1px solid rgba(255,255,255,0.07);display:flex;justify-content:flex-end;gap:10px}
        .form-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .form-field{margin-bottom:14px}
        .form-input option{background:#1c2434}
        @media(max-width:768px){.form-grid2{grid-template-columns:1fr}}
      `}</style>

      <div style={{minHeight:'100%'}}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:14 }}>
          Accueil <span style={{ margin:'0 4px' }}>&gt;</span> <span style={{ color:'rgba(255,255,255,0.6)' }}>Facturation</span>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:20}}>
          <div style={{fontSize:26,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:10}}><CreditCard style={{width:22,height:22}}/> Factures et paiements</div>
          <button className="pg-btn pg-btn-blue" onClick={() => setShowModal(true)}><Plus/> Enregistrer un paiement</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[
            {ic:CreditCard,l:'Encaisse ce mois', v:fmt(totalMois)+' FCFA', c:'#00c896', trend:totalMoisTrend},
            {ic:AlertTriangle,l:'Loyers en retard', v:paiements.filter(p=>p.statut==='retard').length, c:paiements.filter(p=>p.statut==='retard').length>0?'#ef4444':'rgba(255,255,255,0.3)'},
            {ic:Hourglass,l:'En attente', v:paiements.filter(p=>p.statut==='en attente').length, c:'#f59e0b'},
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

        <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:14, flexWrap:'wrap', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={()=>chargerPaiements(agenceId)} style={linkBtn}><RefreshCw/> Actualiser</button>
          <button onClick={()=>exporterCSV(selectedP.length?filtered.filter(p=>selectedP.includes(p.id)):filtered)} style={linkBtn}><Download/> Exporter vers un fichier CSV</button>
          <SearchBox value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bien, locataire..." style={{ minWidth:200 }}/>
          <div style={{ marginLeft:'auto' }}><ViewSwitcher value={vue} onChange={setVue}/></div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18, flexWrap:'wrap' }}>
          <FilterPill label="Statut" value={filterStatut} onChange={setFilterStatut}
            options={[{value:'tous',label:'Tous'}, ...STATUTS.map(s=>({value:s,label:S_CFG[s].label}))]}/>
        </div>

        {loading?(
          <div style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</div>
        ):vue==='graphique'?(
          <MontantBarChart entrees={entreesChart} fmt={fmt}/>
        ):filtered.length===0?(
          <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>
            <FileTextLarge style={{ marginBottom:12, opacity:0.3 }}/>
            <div style={{ fontSize:14 }}>Aucun paiement trouvé</div>
          </div>
        ):(
          <div style={{ overflowX:'auto', overflowY:'visible' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:850, tableLayout:'fixed' }}>
              <colgroup>
                <col style={{ width:36 }}/>
                {COLONNES.map(c => <col key={c.key} style={{ width:colWidths[c.key] ?? COL_DEFAULTS[c.key] }}/>)}
              </colgroup>
              <thead><tr>
                <th className="fl-th"><FluentCheckbox checked={filtered.length>0 && filtered.every(p=>selectedP.includes(p.id))} onChange={()=>toggleSelectAllP(filtered)}/></th>
                {COLONNES.map(c=>(
                  <th key={c.key} className="fl-th">
                    <ColHeader label={c.label} sortDir={sortField===c.field ? sortDir : null} onSort={()=>toggleSort(c.field)} onResize={delta=>resizeCol(c.key, delta)}/>
                  </th>
                ))}
              </tr></thead>
              <tbody>{filtered.map(p=>{
                const cfg = S_CFG[p.statut]||S_CFG['en attente']
                const selected = selectedP.includes(p.id)
                return (
                  <tr key={p.id} className={`fl-row${selected ? ' fl-row-selected' : ''}`}>
                    <td className="fl-td"><FluentCheckbox checked={selected} onChange={()=>toggleSelectP(p.id)}/></td>
                    <td className="fl-td" style={{ fontWeight:600 }}>{p.locataire_nom||'—'}</td>
                    <td className="fl-td">{p.bien_nom||'—'}</td>
                    <td className="fl-td" style={{fontWeight:600,color:'#00c896'}}>{fmt(p.montant)} FCFA</td>
                    <td className="fl-td" style={{color:'rgba(255,255,255,0.5)'}}>{p.mode||'—'}</td>
                    <td className="fl-td" style={{color:'rgba(255,255,255,0.5)'}}>{p.date_paiement?new Date(p.date_paiement).toLocaleDateString('fr-FR'):'—'}</td>
                    <td className="fl-td"><SBadge s={p.statut}/></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Enregistrer un paiement</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}><X/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field"><label style={lbl}>Locataire</label>
                  <select style={inp} value={form.locataire_id} onChange={e=>set('locataire_id',e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {locataires.map(l=><option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>)}
                  </select>
                </div>
                <div className="form-field"><label style={lbl}>Bien</label>
                  <select style={inp} value={form.bien_id} onChange={e=>set('bien_id',e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {biens.map(b=><option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
                <div className="form-grid2">
                  <div className="form-field"><label style={lbl}>Montant (FCFA) <span style={{color:'#ef4444'}}>*</span></label><input type="number" style={inp} value={form.montant} onChange={e=>set('montant',e.target.value)} required/></div>
                  <div className="form-field"><label style={lbl}>Date <span style={{color:'#ef4444'}}>*</span></label><input type="date" style={inp} value={form.date_paiement} onChange={e=>set('date_paiement',e.target.value)} required/></div>
                </div>
                <div className="form-grid2">
                  <div className="form-field"><label style={lbl}>Mode de paiement</label>
                    <select style={inp} value={form.mode} onChange={e=>set('mode',e.target.value)}>
                      {MODES.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-field"><label style={lbl}>Statut</label>
                    <select style={inp} value={form.statut} onChange={e=>set('statut',e.target.value)}>
                      {STATUTS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-field"><label style={lbl}>Notes</label><textarea style={{...inp,lineHeight:1.5,resize:'vertical'}} rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)}/></div>
              </div>
              <div className="modal-foot">
                <button type="button" className="pg-btn pg-btn-ghost" onClick={()=>setShowModal(false)}>Annuler</button>
                <button type="submit" className="pg-btn pg-btn-blue">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
