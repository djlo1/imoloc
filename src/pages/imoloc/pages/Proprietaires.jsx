import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

// ── Constantes ──────────────────────────────────────────
const ROLES_COLORS = { proprietaire:'#0078d4', locataire:'#6c63ff', agent:'#00c896', admin:'#f59e0b' }
const getInitials = (p) => ((p?.prenom?.[0]||'')+(p?.nom?.[0]||'')).toUpperCase() || '?'
const COLORS = ['#0078d4','#6c63ff','#00c896','#f59e0b','#4da6ff','#a78bfa']
const getColor = (i) => COLORS[i % COLORS.length]

const ALL_COLS = [
  { key:'displayName', label:'Nom du proprietaire', checked:true, disabled:true },
  { key:'telephone', label:'Telephone', checked:true },
  { key:'email', label:'Email', checked:true },
  { key:'type_proprietaire', label:'Type', checked:true },
  { key:'ville', label:'Ville', checked:false },
  { key:'statut_fiscal', label:'Statut fiscal', checked:false },
  { key:'ifu', label:'IFU', checked:false },
  { key:'nationalite', label:'Nationalite', checked:false },
  { key:'statut_compte', label:'Statut compte', checked:false },
  { key:'biens', label:'Biens', checked:true },
  { key:'created_at', label:'Depuis le', checked:false },
]
const DEFAULT_COLS = ALL_COLS.filter(c=>c.checked).map(c=>c.key)

// ── Étapes du formulaire ────────────────────────────────
const STEPS = [
  { n:1, label:'Recherche' },
  { n:2, label:'Identite' },
  { n:3, label:'Contact' },
  { n:4, label:'Pieces & Fiscal' },
  { n:5, label:'Compte' },
]

export default function ImolocProprietaires() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [agence, setAgence] = useState(null)
  const [proprietaires, setProprietaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [viewMode, setViewMode] = useState('normal')
  const [cols, setCols] = useState(DEFAULT_COLS)
  const [colWidths, setColWidths] = useState({})
  const [showColsPanel, setShowColsPanel] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selectedProp, setSelectedProp] = useState(null)
  const [step, setStep] = useState(1)
  const [searchExisting, setSearchExisting] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [addMode, setAddMode] = useState(null) // 'existing' | 'new'
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nom:'', prenom:'', sexe:'H', date_naissance:'', lieu_naissance:'',
    nationalite:'Beninoise', telephone:'', telephone2:'', email:'',
    adresse:'', ville:'Cotonou', quartier:'', rue:'', pays:'Benin',
    type_piece:'CIP', numero_piece:'', date_delivrance_piece:'',
    date_expiration_piece:'', pays_delivrance:'Benin',
    ifu:'', statut_fiscal:'Particulier',
    type_proprietaire:'individuel', nom_entreprise:'', registre_commerce:'',
    note_interne:'', statut_compte:'actif',
    taux_commission:'10', mode_commission:'mensuel',
    create_account: false, password:'',
  })
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const resizingCol = useRef(null)
  const startX = useRef(0)
  const startW = useRef(0)

  useEffect(() => { initData() }, [])

  const initData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const { data:links } = await supabase
          .from('agence_proprietaires')
          .select('*, profiles(*), biens(count)')
          .eq('agence_id', ag.id)
        setProprietaires((links||[]).map(l=>({
          ...l.profiles,
          link_id: l.id,
          statut_lien: l.statut,
          taux_commission: l.taux_commission,
          mode_commission: l.mode_commission,
          nb_biens: 0,
        })))
      }
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
      setColWidths(prev => ({...prev, [resizingCol.current]: Math.max(80, startW.current + diff)}))
    }
    const onUp = () => {
      resizingCol.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colWidths])

  const searchExistingUsers = async (term) => {
    if (!term || term.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const { data } = await supabase.from('profiles')
        .select('*')
        .or(`nom.ilike.%${term}%,prenom.ilike.%${term}%,email.ilike.%${term}%,telephone.ilike.%${term}%`)
        .limit(10)
      setSearchResults(data || [])
    } catch(e) { console.error(e) }
    finally { setSearching(false) }
  }

  const linkExisting = async (p) => {
    if (!agence?.id) return
    setSaving(true)
    try {
      // Mettre à jour le rôle
      await supabase.from('profiles').update({ role:'proprietaire' }).eq('id', p.id)
      // Créer le lien agence-proprietaire
      const { error } = await supabase.from('agence_proprietaires').insert({
        agence_id: agence.id,
        proprietaire_id: p.id,
        statut: 'actif',
        taux_commission: parseFloat(form.taux_commission) || 10,
        mode_commission: form.mode_commission,
      })
      if (error && error.code !== '23505') throw error
      toast.success(`${p.prenom} ${p.nom} associe comme proprietaire !`)
      setShowAddPanel(false)
      resetForm()
      initData()
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const createAndLink = async () => {
    if (!agence?.id || !form.nom || !form.prenom) return
    setSaving(true)
    try {
      let userId = null
      if (form.create_account && form.email && form.password) {
        // Créer le compte auth
        const { data:authData, error:authErr } = await supabase.auth.admin?.createUser?.({
          email: form.email,
          password: form.password,
          email_confirm: true,
        }) || { error: { message: 'Admin API non disponible' } }

        if (authErr) {
          // Fallback: créer juste le profil sans compte auth
          const { data:pData, error:pErr } = await supabase.from('profiles').insert({
            nom: form.nom, prenom: form.prenom, email: form.email,
            telephone: form.telephone, role: 'proprietaire',
            sexe: form.sexe, nationalite: form.nationalite,
            date_naissance: form.date_naissance || null,
            lieu_naissance: form.lieu_naissance,
            telephone2: form.telephone2,
            ville: form.ville, quartier: form.quartier,
            rue: form.rue, pays: form.pays,
            type_piece: form.type_piece, numero_piece: form.numero_piece,
            date_delivrance_piece: form.date_delivrance_piece || null,
            date_expiration_piece: form.date_expiration_piece || null,
            pays_delivrance: form.pays_delivrance,
            ifu: form.ifu, statut_fiscal: form.statut_fiscal,
            type_proprietaire: form.type_proprietaire,
            nom_entreprise: form.nom_entreprise,
            registre_commerce: form.registre_commerce,
            note_interne: form.note_interne,
            statut_compte: form.statut_compte,
          }).select().single()
          if (pErr) throw pErr
          userId = pData.id
        } else {
          userId = authData?.user?.id
        }
      } else {
        // Créer le profil sans compte auth
        const { data:pData, error:pErr } = await supabase.from('profiles').insert({
          nom: form.nom, prenom: form.prenom, email: form.email || null,
          telephone: form.telephone, role: 'proprietaire',
          sexe: form.sexe, nationalite: form.nationalite,
          date_naissance: form.date_naissance || null,
          lieu_naissance: form.lieu_naissance,
          telephone2: form.telephone2,
          ville: form.ville, quartier: form.quartier,
          rue: form.rue, pays: form.pays,
          type_piece: form.type_piece, numero_piece: form.numero_piece,
          date_delivrance_piece: form.date_delivrance_piece || null,
          date_expiration_piece: form.date_expiration_piece || null,
          pays_delivrance: form.pays_delivrance,
          ifu: form.ifu, statut_fiscal: form.statut_fiscal,
          type_proprietaire: form.type_proprietaire,
          nom_entreprise: form.nom_entreprise,
          registre_commerce: form.registre_commerce,
          note_interne: form.note_interne,
          statut_compte: form.statut_compte,
        }).select().single()
        if (pErr) throw pErr
        userId = pData.id
      }

      if (userId) {
        await supabase.from('agence_proprietaires').insert({
          agence_id: agence.id,
          proprietaire_id: userId,
          statut: 'actif',
          taux_commission: parseFloat(form.taux_commission) || 10,
          mode_commission: form.mode_commission,
        })
      }

      toast.success(`${form.prenom} ${form.nom} ajoute comme proprietaire !`)
      setShowAddPanel(false)
      resetForm()
      initData()
    } catch(e) {
      console.error(e)
      toast.error(e.message || "Erreur lors de l'ajout")
    } finally { setSaving(false) }
  }

  const resetForm = () => {
    setStep(1); setAddMode(null); setSearchExisting(''); setSearchResults([])
    setForm({ nom:'', prenom:'', sexe:'H', date_naissance:'', lieu_naissance:'',
      nationalite:'Beninoise', telephone:'', telephone2:'', email:'',
      adresse:'', ville:'Cotonou', quartier:'', rue:'', pays:'Benin',
      type_piece:'CIP', numero_piece:'', date_delivrance_piece:'',
      date_expiration_piece:'', pays_delivrance:'Benin',
      ifu:'', statut_fiscal:'Particulier',
      type_proprietaire:'individuel', nom_entreprise:'', registre_commerce:'',
      note_interne:'', statut_compte:'actif', taux_commission:'10',
      mode_commission:'mensuel', create_account:false, password:'' })
  }

  const filtered = proprietaires.filter(p =>
    `${p.prenom} ${p.nom} ${p.email} ${p.telephone}`.toLowerCase().includes(search.toLowerCase())
  )
  const toggleSelect = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll = () => setSelected(s=>s.length===filtered.length?[]:filtered.map(p=>p.id))
  const rowH = viewMode==='compact' ? '40px' : '56px'

  const exportCSV = () => {
    const data = selected.length>0 ? proprietaires.filter(p=>selected.includes(p.id)) : filtered
    const csv = ['Prenom,Nom,Email,Telephone,Ville,Type'].concat(
      data.map(p=>`${p.prenom},${p.nom},${p.email||''},${p.telephone||''},${p.ville||''},${p.type_proprietaire||''}`)
    ).join('\n')
    const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download='proprietaires.csv'; a.click()
    toast.success(`${data.length} proprietaire(s) exporte(s)`)
  }

  return (
    <>
      <style>{`
        .pp-page{animation:pp-in 0.2s ease;min-height:100%}
        @keyframes pp-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .pp-bc{display:flex;align-items:center;gap:7px;font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .pp-bc span{cursor:pointer;transition:color 0.1s}.pp-bc span:hover{color:#4da6ff}
        .pp-title{font-size:26px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:4px}
        .pp-sub{font-size:13.5px;color:rgba(255,255,255,0.4);margin-bottom:22px}

        .pp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .pp-stat{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 18px;transition:all 0.2s;cursor:pointer}
        .pp-stat:hover{border-color:rgba(255,255,255,0.13);transform:translateY(-1px)}
        .pp-stat-val{font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-bottom:3px}
        .pp-stat-lbl{font-size:12px;color:rgba(255,255,255,0.35)}

        .pp-toolbar{display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .pp-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:Inter,sans-serif;transition:all 0.15s;white-space:nowrap}
        .pp-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3}
        .pp-btn:disabled{opacity:0.35;cursor:not-allowed}
        .pp-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.pp-btn-p:hover:not(:disabled){background:#006cc1}
        .pp-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}.pp-btn-g:hover:not(:disabled){background:rgba(0,200,150,0.15)}
        .pp-btn-r{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}.pp-btn-r:hover:not(:disabled){background:rgba(239,68,68,0.15)}
        .pp-sep{width:1px;height:22px;background:rgba(255,255,255,0.08)}
        .pp-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto;transition:border-color 0.15s}
        .pp-search:focus-within{border-color:rgba(0,120,212,0.4)}
        .pp-search input{background:none;border:none;outline:none;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;width:220px}
        .pp-search input::placeholder{color:rgba(255,255,255,0.25)}

        .pp-selbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(0,120,212,0.07);border:1px solid rgba(0,120,212,0.18);border-radius:8px;margin-bottom:12px;animation:pp-in 0.2s ease}
        .pp-selbar-txt{font-size:13px;color:#4da6ff;font-weight:500;flex:1}

        .pp-vtog{display:flex;gap:2px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:5px;padding:3px}
        .pp-vbtn{background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:3px;color:rgba(255,255,255,0.4);transition:all 0.15s;font-size:12px;font-family:Inter,sans-serif;display:flex;align-items:center;gap:4px}
        .pp-vbtn.active{background:rgba(255,255,255,0.1);color:#e6edf3}

        .pp-tw{border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden}
        .pp-thead-bar{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .pp-table{width:100%;border-collapse:collapse;table-layout:fixed}
        .pp-table th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);padding:9px 14px;text-align:left;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07);white-space:nowrap;position:relative;user-select:none;overflow:hidden}
        .pp-table th:first-child{width:44px;text-align:center}
        .pp-table td{padding:0 14px;font-size:13px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pp-table td:first-child{text-align:center}
        .pp-table tr{transition:background 0.08s;height:${rowH}}
        .pp-table tr:hover td{background:rgba(255,255,255,0.025);cursor:pointer}
        .pp-table tr.sel td{background:rgba(0,120,212,0.06)}
        .pp-table tr:last-child td{border-bottom:none}
        .pp-rh{position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;background:transparent;z-index:1}
        .pp-rh:hover,.pp-rh:active{background:rgba(0,120,212,0.4)}
        .pp-cb{width:15px;height:15px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;margin:0 auto;flex-shrink:0}
        .pp-cb.on{background:#0078d4;border-color:#0078d4}
        .pp-cb.half{background:rgba(0,120,212,0.3);border-color:#0078d4}
        .pp-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0}
        .pp-badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:100px;font-size:11px;font-weight:600}
        .pp-empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3)}
        .pp-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:rgba(255,255,255,0.3)}

        /* Panel colonnes */
        .pp-ov{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:300;display:flex;justify-content:flex-end}
        .pp-panel{width:340px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:pp-sl 0.2s ease}
        @keyframes pp-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .pp-ph{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .pp-ph-title{font-size:16px;font-weight:700;color:#e6edf3}
        .pp-cls{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .pp-cls:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .pp-pb{flex:1;overflow-y:auto;padding:16px 22px}
        .pp-pb::-webkit-scrollbar{width:4px}
        .pp-pb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .pp-pf{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .pp-pfb{flex:1;padding:10px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;transition:all 0.15s}
        .pp-pfb-b{background:#0078d4;color:#fff}.pp-pfb-b:hover{background:#006cc1}
        .pp-pfb-g{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}.pp-pfb-g:hover{background:rgba(255,255,255,0.09)}
        .pp-col-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .pp-col-lbl{font-size:13.5px;color:rgba(255,255,255,0.65)}
        .pp-col-lbl.dis{color:rgba(255,255,255,0.3)}
        .pp-col-cb{width:17px;height:17px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s}
        .pp-col-cb.on{background:#0078d4;border-color:#0078d4}
        .pp-col-cb.dis{opacity:0.4;cursor:not-allowed}

        /* Panel ajout */
        .pp-add-panel{width:680px}
        .pp-steps{display:flex;padding:0 22px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .pp-step{display:flex;align-items:center;gap:8px;padding:12px 16px 12px 0;margin-right:16px;border-bottom:2px solid transparent;cursor:pointer;transition:all 0.15s}
        .pp-step.active{border-bottom-color:#0078d4}
        .pp-step-n{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.4)}
        .pp-step-n.active{background:#0078d4;color:#fff}
        .pp-step-n.done{background:#00c896;color:#fff}
        .pp-step-lbl{font-size:13px;font-weight:500;color:rgba(255,255,255,0.4)}
        .pp-step.active .pp-step-lbl{color:#e6edf3}
        .pp-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .pp-field{margin-bottom:14px}
        .pp-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px}
        .pp-inp{width:100%;padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:Inter,sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;color-scheme:dark}
        .pp-inp:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .pp-sec{font-size:12px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;margin:20px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .pp-choice-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
        .pp-choice{padding:20px;border-radius:10px;border:2px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.18s;text-align:center}
        .pp-choice:hover{border-color:rgba(0,120,212,0.35);background:rgba(0,120,212,0.05)}
        .pp-choice.on{border-color:#0078d4;background:rgba(0,120,212,0.08)}
        .pp-choice-ic{font-size:32px;margin-bottom:10px}
        .pp-choice-title{font-size:14.5px;font-weight:700;color:#e6edf3;margin-bottom:5px}
        .pp-choice-desc{font-size:12.5px;color:rgba(255,255,255,0.4);line-height:1.5}
        .pp-sr-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);margin-bottom:8px;cursor:pointer;transition:all 0.15s}
        .pp-sr-item:hover{border-color:rgba(0,120,212,0.35);background:rgba(0,120,212,0.05)}
        .pp-cbk{display:flex;align-items:center;gap:10px;cursor:pointer}
        .pp-cbk-box{width:17px;height:17px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
        .pp-cbk-box.on{background:#0078d4;border-color:#0078d4}

        /* Drawer détail */
        .pp-detail-panel{width:600px}
        .pp-detail-head{padding:22px 26px 0;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;background:linear-gradient(135deg,rgba(0,120,212,0.05),rgba(0,0,0,0))}
        .pp-detail-av{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0}
        .pp-detail-name{font-size:20px;font-weight:700;color:#e6edf3;margin-bottom:4px}
        .pp-detail-meta{font-size:13px;color:rgba(255,255,255,0.4)}
        .pp-detail-tabs{display:flex;margin-top:18px}
        .pp-detail-tab{padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap}
        .pp-detail-tab:hover{color:rgba(255,255,255,0.75)}
        .pp-detail-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .pp-blk{display:flex;flex-direction:column;gap:3px;margin-bottom:24px}
        .pp-blk-lbl{font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:4px}
        .pp-blk-val{font-size:13.5px;color:rgba(255,255,255,0.5);margin-bottom:4px}
        .pp-blk-link{font-size:13px;color:#0078d4;text-decoration:none;cursor:pointer;background:none;border:none;font-family:Inter,sans-serif}
        .pp-blk-link:hover{text-decoration:underline}
        .pp-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 2.5rem}
        .pp-divider{height:1px;background:rgba(255,255,255,0.07);margin:20px 0}

        @media(max-width:900px){.pp-stats{grid-template-columns:1fr 1fr}.pp-add-panel{width:100%}.pp-detail-panel{width:100%}}
      `}</style>

      <div className="pp-page">
        {/* Breadcrumb */}
        <div className="pp-bc">
          <span onClick={()=>navigate('/imoloc')}>Centre Imoloc</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Proprietaires</span>
        </div>

        <div className="pp-title">Proprietaires</div>
        <div className="pp-sub">{proprietaires.length} proprietaire{proprietaires.length!==1?'s':''} associe{proprietaires.length!==1?'s':''} a {agence?.nom||'votre agence'}</div>

        {/* Stats */}
        <div className="pp-stats">
          {[
            {ic:'👤',lbl:'Total',val:proprietaires.length,col:'#0078d4'},
            {ic:'🏢',lbl:'Individuels',val:proprietaires.filter(p=>p.type_proprietaire==='individuel').length,col:'#6c63ff'},
            {ic:'🏭',lbl:'Societes',val:proprietaires.filter(p=>p.type_proprietaire==='societe').length,col:'#f59e0b'},
            {ic:'✅',lbl:'Actifs',val:proprietaires.filter(p=>p.statut_compte==='actif').length,col:'#00c896'},
          ].map((s,i)=>(
            <div key={i} className="pp-stat">
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:18}}>{s.ic}</span>
                <span className="pp-stat-lbl">{s.lbl}</span>
              </div>
              <div className="pp-stat-val" style={{color:s.col}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="pp-toolbar">
          <button className="pp-btn pp-btn-p" onClick={()=>{resetForm();setShowAddPanel(true)}}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            Ajouter un proprietaire
          </button>
          <button className="pp-btn" onClick={initData}>🔄</button>
          <div className="pp-sep"/>
          <button className="pp-btn pp-btn-g" onClick={exportCSV}>
            📥 Exporter{selected.length>0&&` (${selected.length})`}
          </button>
          {selected.length>0&&(
            <button className="pp-btn pp-btn-r" onClick={async()=>{
              if(!confirm(`Dissocier ${selected.length} proprietaire(s) de l'agence ?`)) return
              for(const id of selected){
                await supabase.from('agence_proprietaires').delete().eq('proprietaire_id',id).eq('agence_id',agence?.id)
              }
              toast.success(`${selected.length} dissociations effectuees`)
              setSelected([]); initData()
            }}>
              🔗 Dissocier ({selected.length})
            </button>
          )}
          <div className="pp-search">
            <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un proprietaire..."/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0}}>×</button>}
          </div>
        </div>

        {/* Barre selection */}
        {selected.length>0&&(
          <div className="pp-selbar">
            <span className="pp-selbar-txt">{selected.length} proprietaire{selected.length>1?'s':''} selectionne{selected.length>1?'s':''}</span>
            <button className="pp-btn pp-btn-g" style={{padding:'5px 11px',fontSize:12}} onClick={exportCSV}>Exporter</button>
            <button onClick={()=>setSelected([])} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:20,padding:'0 4px',lineHeight:1}}>×</button>
          </div>
        )}

        {/* Table */}
        <div className="pp-tw">
          <div className="pp-thead-bar">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>
                {filtered.length} proprietaire{filtered.length!==1?'s':''}
              </span>
              <div className="pp-vtog">
                <button className={`pp-vbtn ${viewMode==='normal'?'active':''}`} onClick={()=>setViewMode('normal')}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>
                  Normal
                </button>
                <button className={`pp-vbtn ${viewMode==='compact'?'active':''}`} onClick={()=>setViewMode('compact')}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 9h16.5m-16.5 6.75h16.5"/></svg>
                  Compact
                </button>
              </div>
            </div>
            <button className="pp-btn" style={{padding:'5px 12px',fontSize:12}} onClick={()=>setShowColsPanel(true)}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"/></svg>
              Choisir les colonnes
            </button>
          </div>

          <div style={{overflowX:'auto'}}>
            <table className="pp-table">
              <thead>
                <tr>
                  <th style={{width:44}}>
                    <div className={`pp-cb ${selected.length===filtered.length&&filtered.length>0?'on':selected.length>0?'half':''}`} onClick={toggleAll}>
                      {selected.length===filtered.length&&filtered.length>0&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                      {selected.length>0&&selected.length<filtered.length&&<div style={{width:8,height:2,background:'#fff',borderRadius:1}}/>}
                    </div>
                  </th>
                  <th style={{width:colWidths['displayName']||220,minWidth:120}}>
                    Nom du proprietaire
                    <div className="pp-rh" onMouseDown={e=>startResize(e,'displayName')}/>
                  </th>
                  {cols.includes('telephone')&&<th style={{width:colWidths['telephone']||150,minWidth:100}}>Telephone<div className="pp-rh" onMouseDown={e=>startResize(e,'telephone')}/></th>}
                  {cols.includes('email')&&<th style={{width:colWidths['email']||200,minWidth:120}}>Email<div className="pp-rh" onMouseDown={e=>startResize(e,'email')}/></th>}
                  {cols.includes('type_proprietaire')&&<th style={{width:colWidths['type_proprietaire']||120,minWidth:80}}>Type<div className="pp-rh" onMouseDown={e=>startResize(e,'type_proprietaire')}/></th>}
                  {cols.includes('ville')&&<th style={{width:colWidths['ville']||120,minWidth:80}}>Ville<div className="pp-rh" onMouseDown={e=>startResize(e,'ville')}/></th>}
                  {cols.includes('statut_fiscal')&&<th style={{width:colWidths['statut_fiscal']||130,minWidth:80}}>Statut fiscal<div className="pp-rh" onMouseDown={e=>startResize(e,'statut_fiscal')}/></th>}
                  {cols.includes('ifu')&&<th style={{width:colWidths['ifu']||120,minWidth:80}}>IFU<div className="pp-rh" onMouseDown={e=>startResize(e,'ifu')}/></th>}
                  {cols.includes('nationalite')&&<th style={{width:colWidths['nationalite']||120,minWidth:80}}>Nationalite<div className="pp-rh" onMouseDown={e=>startResize(e,'nationalite')}/></th>}
                  {cols.includes('statut_compte')&&<th style={{width:colWidths['statut_compte']||120,minWidth:80}}>Statut<div className="pp-rh" onMouseDown={e=>startResize(e,'statut_compte')}/></th>}
                  {cols.includes('biens')&&<th style={{width:colWidths['biens']||80,minWidth:60}}>Biens<div className="pp-rh" onMouseDown={e=>startResize(e,'biens')}/></th>}
                  {cols.includes('created_at')&&<th style={{width:colWidths['created_at']||130,minWidth:100}}>Depuis le<div className="pp-rh" onMouseDown={e=>startResize(e,'created_at')}/></th>}
                  <th style={{width:50}}/>
                </tr>
              </thead>
              <tbody>
                {loading?(
                  <tr><td colSpan={20} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>Chargement...</td></tr>
                ):filtered.length===0?(
                  <tr><td colSpan={20}>
                    <div className="pp-empty">
                      <div style={{fontSize:44,marginBottom:14,opacity:0.3}}>👤</div>
                      <div style={{fontSize:16,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>
                        {search?`Aucun resultat pour "${search}"`:'Aucun proprietaire'}
                      </div>
                      {!search&&<button className="pp-btn pp-btn-p" style={{margin:'0 auto'}} onClick={()=>{resetForm();setShowAddPanel(true)}}>
                        + Ajouter un proprietaire
                      </button>}
                    </div>
                  </td></tr>
                ):filtered.map((p,i)=>{
                  const isSel = selected.includes(p.id)
                  const col = getColor(i)
                  const avSize = viewMode==='compact' ? 26 : 34
                  return (
                    <tr key={p.id} className={isSel?'sel':''} onClick={()=>setSelectedProp(p)}>
                      <td onClick={e=>{e.stopPropagation();toggleSelect(p.id)}}>
                        <div className={`pp-cb ${isSel?'on':''}`}>
                          {isSel&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pp-av" style={{width:avSize,height:avSize,background:`linear-gradient(135deg,${col},${col}88)`,fontSize:viewMode==='compact'?10:12}}>
                            {getInitials(p)}
                          </div>
                          <div>
                            <div style={{fontWeight:600,color:'#e6edf3',fontSize:viewMode==='compact'?12.5:13.5}}>
                              {p.prenom} {p.nom}
                            </div>
                            {viewMode==='normal'&&<div style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',marginTop:1}}>
                              {p.type_proprietaire==='societe'?p.nom_entreprise||'Societe':'Individuel'}
                            </div>}
                          </div>
                        </div>
                      </td>
                      {cols.includes('telephone')&&<td style={{fontSize:12.5}}>{p.telephone||'—'}</td>}
                      {cols.includes('email')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{p.email||'—'}</td>}
                      {cols.includes('type_proprietaire')&&(
                        <td>
                          <span className="pp-badge" style={{
                            background:p.type_proprietaire==='societe'?'rgba(245,158,11,0.12)':'rgba(0,120,212,0.12)',
                            color:p.type_proprietaire==='societe'?'#f59e0b':'#4da6ff',
                            fontSize:11
                          }}>
                            {p.type_proprietaire==='societe'?'🏭 Societe':'👤 Individuel'}
                          </span>
                        </td>
                      )}
                      {cols.includes('ville')&&<td style={{fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{p.ville||'—'}</td>}
                      {cols.includes('statut_fiscal')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{p.statut_fiscal||'—'}</td>}
                      {cols.includes('ifu')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{p.ifu||'—'}</td>}
                      {cols.includes('nationalite')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{p.nationalite||'—'}</td>}
                      {cols.includes('statut_compte')&&(
                        <td>
                          <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12}}>
                            <span style={{width:7,height:7,borderRadius:'50%',background:p.statut_compte==='actif'?'#00c896':'#f59e0b'}}/>
                            {p.statut_compte||'actif'}
                          </span>
                        </td>
                      )}
                      {cols.includes('biens')&&<td style={{fontSize:12.5,fontWeight:600,color:'#0078d4'}}>{p.nb_biens||0}</td>}
                      {cols.includes('created_at')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{p.created_at?new Date(p.created_at).toLocaleDateString('fr-FR'):'—'}</td>}
                      <td onClick={e=>e.stopPropagation()}>
                        <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',padding:'5px 7px',borderRadius:5,fontSize:15,transition:'all 0.1s',lineHeight:1}}
                          onMouseOver={e=>e.currentTarget.style.color='#e6edf3'}
                          onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}
                          onClick={()=>setSelectedProp(p)}>···</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="pp-foot">
            <span>{filtered.length} proprietaire{filtered.length!==1?'s':''} affiche{filtered.length!==1?'s':''}</span>
            <span>{selected.length>0&&`${selected.length} selectionne${selected.length>1?'s':''}`}</span>
          </div>
        </div>
      </div>

      {/* ══ PANEL COLONNES ══ */}
      {showColsPanel&&(
        <div className="pp-ov" onClick={e=>e.target===e.currentTarget&&setShowColsPanel(false)}>
          <div className="pp-panel">
            <div className="pp-ph">
              <span className="pp-ph-title">Choisir les colonnes</span>
              <button className="pp-cls" onClick={()=>setShowColsPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="pp-pb">
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16,lineHeight:1.6}}>Selectionnez les colonnes a afficher. Faites glisser les en-tetes du tableau pour les redimensionner.</div>
              {ALL_COLS.map(col=>(
                <div key={col.key} className="pp-col-item">
                  <span className={`pp-col-lbl ${col.disabled?'dis':''}`}>{col.label}</span>
                  <div className={`pp-col-cb ${cols.includes(col.key)?'on':''} ${col.disabled?'dis':''}`}
                    onClick={()=>{ if(col.disabled) return; setCols(c=>c.includes(col.key)?c.filter(x=>x!==col.key):[...c,col.key]) }}>
                    {cols.includes(col.key)&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                </div>
              ))}
            </div>
            <div className="pp-pf">
              <button className="pp-pfb pp-pfb-g" onClick={()=>{setCols(DEFAULT_COLS);setColWidths({})}}>Retablir</button>
              <button className="pp-pfb pp-pfb-b" onClick={()=>setShowColsPanel(false)}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL AJOUTER ══ */}
      {showAddPanel&&(
        <div className="pp-ov" onClick={e=>e.target===e.currentTarget&&(setShowAddPanel(false)||resetForm())}>
          <div className={`pp-panel pp-add-panel`}>
            <div className="pp-ph">
              <span className="pp-ph-title">Ajouter un proprietaire</span>
              <button className="pp-cls" onClick={()=>{setShowAddPanel(false);resetForm()}}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Steps */}
            <div className="pp-steps">
              {STEPS.map(s=>(
                <div key={s.n} className={`pp-step ${step===s.n?'active':''}`} onClick={()=>addMode&&s.n>1&&setStep(s.n)}>
                  <div className={`pp-step-n ${step===s.n?'active':step>s.n?'done':''}`}>
                    {step>s.n?<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>:s.n}
                  </div>
                  <span className="pp-step-lbl">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="pp-pb">
              {/* ── Step 1: Recherche ── */}
              {step===1&&(
                <>
                  <div style={{fontSize:15,fontWeight:600,color:'#e6edf3',marginBottom:6}}>Comment souhaitez-vous ajouter ce proprietaire ?</div>
                  <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)',marginBottom:24,lineHeight:1.7}}>
                    Si le proprietaire a deja un compte Imoloc (depuis l'app mobile ou une autre agence), vous pouvez le retrouver et l'associer directement a votre agence.
                  </div>

                  <div className="pp-choice-row">
                    <div className={`pp-choice ${addMode==='existing'?'on':''}`} onClick={()=>setAddMode('existing')}>
                      <div className="pp-choice-ic">🔍</div>
                      <div className="pp-choice-title">Proprietaire existant</div>
                      <div className="pp-choice-desc">Il a deja un compte Imoloc. Recherchez-le par nom, email ou telephone.</div>
                    </div>
                    <div className={`pp-choice ${addMode==='new'?'on':''}`} onClick={()=>{setAddMode('new');setStep(2)}}>
                      <div className="pp-choice-ic">➕</div>
                      <div className="pp-choice-title">Nouveau proprietaire</div>
                      <div className="pp-choice-desc">Il n'a pas encore de compte. Saisissez ses informations pour creer son profil.</div>
                    </div>
                  </div>

                  {addMode==='existing'&&(
                    <>
                      <div className="pp-field">
                        <label className="pp-lbl">Rechercher par nom, email ou telephone</label>
                        <input className="pp-inp" autoFocus
                          value={searchExisting}
                          onChange={e=>{setSearchExisting(e.target.value);searchExistingUsers(e.target.value)}}
                          placeholder="Ex: Jean Dupont, jean@gmail.com, +229..."/>
                      </div>
                      {searching&&<div style={{fontSize:13,color:'rgba(255,255,255,0.4)',padding:'8px 0'}}>Recherche en cours...</div>}
                      {searchResults.length===0&&searchExisting.length>=2&&!searching&&(
                        <div style={{fontSize:13.5,color:'rgba(255,255,255,0.4)',padding:'12px 0'}}>
                          Aucun resultat. <span style={{color:'#4da6ff',cursor:'pointer'}} onClick={()=>{setAddMode('new');setStep(2)}}>Creer un nouveau proprietaire →</span>
                        </div>
                      )}
                      <div style={{display:'flex',flexDirection:'column',gap:0}}>
                        {searchResults.map((u,i)=>(
                          <div key={u.id} className="pp-sr-item" onClick={()=>linkExisting(u)}>
                            <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${getColor(i)},${getColor(i)}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                              {getInitials(u)}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:2}}>{u.prenom} {u.nom}</div>
                              <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{u.email||u.telephone||'Pas de contact'} · Role actuel: {u.role||'locataire'}</div>
                            </div>
                            <button style={{padding:'6px 14px',borderRadius:5,background:'rgba(0,120,212,0.1)',border:'1px solid rgba(0,120,212,0.25)',color:'#4da6ff',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'Inter',flexShrink:0}}>
                              Associer
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Paramètres commission */}
                      {searchResults.length>0&&(
                        <>
                          <div className="pp-sec">Parametres de collaboration</div>
                          <div className="pp-g2">
                            <div>
                              <label className="pp-lbl">Taux de commission (%)</label>
                              <input className="pp-inp" type="number" min="0" max="100" step="0.5"
                                value={form.taux_commission} onChange={e=>setF('taux_commission',e.target.value)}/>
                            </div>
                            <div>
                              <label className="pp-lbl">Mode de commission</label>
                              <select className="pp-inp" value={form.mode_commission} onChange={e=>setF('mode_commission',e.target.value)}>
                                {['mensuel','annuel','journalier','custom'].map(m=>(
                                  <option key={m} style={{background:'#161b22',color:'#e6edf3'}}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Step 2: Identité ── */}
              {step===2&&(
                <>
                  <div className="pp-sec">Informations d'identite</div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Prenom <span style={{color:'#ef4444'}}>*</span></label>
                      <input className="pp-inp" required value={form.prenom} onChange={e=>setF('prenom',e.target.value)} placeholder="Jean" autoFocus/>
                    </div>
                    <div>
                      <label className="pp-lbl">Nom <span style={{color:'#ef4444'}}>*</span></label>
                      <input className="pp-inp" required value={form.nom} onChange={e=>setF('nom',e.target.value)} placeholder="Dupont"/>
                    </div>
                  </div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Sexe</label>
                      <select className="pp-inp" value={form.sexe} onChange={e=>setF('sexe',e.target.value)}>
                        {[['H','Homme'],['F','Femme'],['Autre','Autre']].map(([v,l])=>(
                          <option key={v} value={v} style={{background:'#161b22',color:'#e6edf3'}}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="pp-lbl">Date de naissance</label>
                      <input className="pp-inp" type="date" value={form.date_naissance} onChange={e=>setF('date_naissance',e.target.value)}/>
                    </div>
                  </div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Lieu de naissance</label>
                      <input className="pp-inp" value={form.lieu_naissance} onChange={e=>setF('lieu_naissance',e.target.value)} placeholder="Cotonou"/>
                    </div>
                    <div>
                      <label className="pp-lbl">Nationalite</label>
                      <input className="pp-inp" value={form.nationalite} onChange={e=>setF('nationalite',e.target.value)} placeholder="Beninoise"/>
                    </div>
                  </div>

                  <div className="pp-sec">Type de proprietaire</div>
                  <div className="pp-choice-row" style={{gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                    {[['individuel','👤','Individuel','Personne physique'],['societe','🏭','Societe','Personne morale/Entreprise']].map(([v,ic,lbl,desc])=>(
                      <div key={v} className={`pp-choice ${form.type_proprietaire===v?'on':''}`} style={{padding:14}} onClick={()=>setF('type_proprietaire',v)}>
                        <div style={{fontSize:24,marginBottom:6}}>{ic}</div>
                        <div style={{fontSize:13.5,fontWeight:700,color:'#e6edf3',marginBottom:4}}>{lbl}</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{desc}</div>
                      </div>
                    ))}
                  </div>
                  {form.type_proprietaire==='societe'&&(
                    <div className="pp-g2">
                      <div>
                        <label className="pp-lbl">Nom de l'entreprise</label>
                        <input className="pp-inp" value={form.nom_entreprise} onChange={e=>setF('nom_entreprise',e.target.value)} placeholder="ACME SARL"/>
                      </div>
                      <div>
                        <label className="pp-lbl">Registre de commerce</label>
                        <input className="pp-inp" value={form.registre_commerce} onChange={e=>setF('registre_commerce',e.target.value)} placeholder="RC..."/>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Step 3: Contact ── */}
              {step===3&&(
                <>
                  <div className="pp-sec">Coordonnees</div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Telephone principal <span style={{color:'#ef4444'}}>*</span></label>
                      <input className="pp-inp" value={form.telephone} onChange={e=>setF('telephone',e.target.value)} placeholder="+229 XX XX XX XX"/>
                    </div>
                    <div>
                      <label className="pp-lbl">Telephone secondaire</label>
                      <input className="pp-inp" value={form.telephone2} onChange={e=>setF('telephone2',e.target.value)} placeholder="+229 XX XX XX XX"/>
                    </div>
                  </div>
                  <div className="pp-field">
                    <label className="pp-lbl">Email</label>
                    <input className="pp-inp" type="email" value={form.email} onChange={e=>setF('email',e.target.value)} placeholder="jean@exemple.com"/>
                  </div>

                  <div className="pp-sec">Adresse</div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Pays</label>
                      <select className="pp-inp" value={form.pays} onChange={e=>setF('pays',e.target.value)}>
                        {["Benin","Togo","Cote d'Ivoire","Senegal","Cameroun","Mali","France","Belgique"].map(p=>(
                          <option key={p} style={{background:'#161b22',color:'#e6edf3'}}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="pp-lbl">Ville</label>
                      <input className="pp-inp" value={form.ville} onChange={e=>setF('ville',e.target.value)} placeholder="Cotonou"/>
                    </div>
                  </div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Quartier</label>
                      <input className="pp-inp" value={form.quartier} onChange={e=>setF('quartier',e.target.value)} placeholder="Fidjrosse"/>
                    </div>
                    <div>
                      <label className="pp-lbl">Rue / Precision</label>
                      <input className="pp-inp" value={form.rue} onChange={e=>setF('rue',e.target.value)} placeholder="Rue 123..."/>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 4: Pièces & Fiscal ── */}
              {step===4&&(
                <>
                  <div className="pp-sec">Piece d'identite</div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Type de piece</label>
                      <select className="pp-inp" value={form.type_piece} onChange={e=>setF('type_piece',e.target.value)}>
                        {['CIP','Passeport','Carte consulaire','Permis de conduire'].map(t=>(
                          <option key={t} style={{background:'#161b22',color:'#e6edf3'}}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="pp-lbl">Numero de piece</label>
                      <input className="pp-inp" value={form.numero_piece} onChange={e=>setF('numero_piece',e.target.value)} placeholder="N° de la piece"/>
                    </div>
                  </div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Date de delivrance</label>
                      <input className="pp-inp" type="date" value={form.date_delivrance_piece} onChange={e=>setF('date_delivrance_piece',e.target.value)}/>
                    </div>
                    <div>
                      <label className="pp-lbl">Date d'expiration</label>
                      <input className="pp-inp" type="date" value={form.date_expiration_piece} onChange={e=>setF('date_expiration_piece',e.target.value)}/>
                    </div>
                  </div>
                  <div className="pp-field">
                    <label className="pp-lbl">Pays de delivrance</label>
                    <input className="pp-inp" value={form.pays_delivrance} onChange={e=>setF('pays_delivrance',e.target.value)} placeholder="Benin"/>
                  </div>

                  <div className="pp-sec">Informations fiscales</div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">IFU (Identifiant Fiscal Unique)</label>
                      <input className="pp-inp" value={form.ifu} onChange={e=>setF('ifu',e.target.value)} placeholder="IFU..."/>
                    </div>
                    <div>
                      <label className="pp-lbl">Statut fiscal</label>
                      <select className="pp-inp" value={form.statut_fiscal} onChange={e=>setF('statut_fiscal',e.target.value)}>
                        {['Particulier','Entreprise'].map(s=>(
                          <option key={s} style={{background:'#161b22',color:'#e6edf3'}}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pp-sec">Parametres de collaboration</div>
                  <div className="pp-g2">
                    <div>
                      <label className="pp-lbl">Taux de commission (%)</label>
                      <input className="pp-inp" type="number" min="0" max="100" step="0.5" value={form.taux_commission} onChange={e=>setF('taux_commission',e.target.value)}/>
                    </div>
                    <div>
                      <label className="pp-lbl">Mode</label>
                      <select className="pp-inp" value={form.mode_commission} onChange={e=>setF('mode_commission',e.target.value)}>
                        {['mensuel','annuel','journalier','custom'].map(m=>(
                          <option key={m} style={{background:'#161b22',color:'#e6edf3'}}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pp-field">
                    <label className="pp-lbl">Note interne (visible uniquement par l'agence)</label>
                    <textarea className="pp-inp" rows={3} value={form.note_interne} onChange={e=>setF('note_interne',e.target.value)} placeholder="Notes sur ce proprietaire..." style={{resize:'vertical',minHeight:80}}/>
                  </div>
                </>
              )}

              {/* ── Step 5: Compte ── */}
              {step===5&&(
                <>
                  <div style={{padding:'16px 18px',borderRadius:10,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.18)',fontSize:13.5,color:'rgba(255,255,255,0.5)',lineHeight:1.7,marginBottom:22}}>
                    ℹ️ Un compte permet au proprietaire de se connecter sur l'app mobile Imoloc pour consulter ses biens, paiements et documents. <strong style={{color:'rgba(255,255,255,0.7)'}}>Optionnel</strong> — vous pouvez l'ajouter plus tard.
                  </div>

                  <div className="pp-cbk" style={{marginBottom:20}} onClick={()=>setF('create_account',!form.create_account)}>
                    <div className={`pp-cbk-box ${form.create_account?'on':''}`}>
                      {form.create_account&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    </div>
                    <span style={{fontSize:14,color:'rgba(255,255,255,0.7)'}}>Creer un compte de connexion pour ce proprietaire</span>
                  </div>

                  {form.create_account&&(
                    <>
                      <div className="pp-field">
                        <label className="pp-lbl">Email de connexion <span style={{color:'#ef4444'}}>*</span></label>
                        <input className="pp-inp" type="email" value={form.email} onChange={e=>setF('email',e.target.value)} placeholder="jean@exemple.com"/>
                      </div>
                      <div className="pp-field">
                        <label className="pp-lbl">Mot de passe temporaire <span style={{color:'#ef4444'}}>*</span></label>
                        <input className="pp-inp" type="password" value={form.password} onChange={e=>setF('password',e.target.value)} placeholder="Min. 8 caracteres"/>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:6}}>Le proprietaire devra changer son mot de passe a la premiere connexion.</div>
                      </div>
                    </>
                  )}

                  <div className="pp-sec">Recapitulatif</div>
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:18}}>
                    {[
                      ['Prenom et nom', `${form.prenom} ${form.nom}`],
                      ['Type', form.type_proprietaire==='societe'?`Societe — ${form.nom_entreprise}`:'Individuel'],
                      ['Telephone', form.telephone||'—'],
                      ['Email', form.email||'—'],
                      ['Ville', form.ville||'—'],
                      ['IFU', form.ifu||'—'],
                      ['Commission', `${form.taux_commission}% ${form.mode_commission}`],
                    ].map(([k,v])=>(
                      <div key={k} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                        <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',flexShrink:0,width:160}}>{k}</span>
                        <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,textAlign:'right'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="pp-pf">
              <button className="pp-pfb pp-pfb-g" onClick={()=>step>1?setStep(step-1):(setShowAddPanel(false)||resetForm())}>
                {step===1?'Annuler':'Precedent'}
              </button>
              {step<5?(
                <button className="pp-pfb pp-pfb-b"
                  disabled={step===2&&(!form.prenom||!form.nom)}
                  onClick={()=>setStep(step+1)}
                  style={{opacity:step===2&&(!form.prenom||!form.nom)?0.4:1}}>
                  Suivant
                </button>
              ):(
                <button className="pp-pfb pp-pfb-b" onClick={createAndLink} disabled={saving||!form.nom||!form.prenom}>
                  {saving?'Ajout en cours...':'Ajouter le proprietaire'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ DRAWER DÉTAIL PROPRIÉTAIRE ══ */}
      {selectedProp&&(
        <div className="pp-ov" onClick={e=>e.target===e.currentTarget&&setSelectedProp(null)}>
          <div className={`pp-panel pp-detail-panel`}>
            <div className="pp-detail-head">
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div className="pp-detail-av" style={{background:`linear-gradient(135deg,#0078d4,#0078d488)`}}>
                    {getInitials(selectedProp)}
                  </div>
                  <div>
                    <div className="pp-detail-name">{selectedProp.prenom} {selectedProp.nom}</div>
                    <div className="pp-detail-meta">{selectedProp.email||selectedProp.telephone||'Pas de contact'}</div>
                    <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                      <span className="pp-badge" style={{background:'rgba(0,120,212,0.12)',color:'#4da6ff',fontSize:11}}>
                        {selectedProp.type_proprietaire==='societe'?'🏭 Societe':'👤 Individuel'}
                      </span>
                      <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 9px',borderRadius:'100px',fontSize:11,fontWeight:600,background:selectedProp.statut_compte==='actif'?'rgba(0,200,150,0.1)':'rgba(245,158,11,0.1)',color:selectedProp.statut_compte==='actif'?'#00c896':'#f59e0b'}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:selectedProp.statut_compte==='actif'?'#00c896':'#f59e0b'}}/>
                        {selectedProp.statut_compte||'actif'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="pp-cls" onClick={()=>setSelectedProp(null)}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Actions rapides */}
              <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:20,flexWrap:'wrap'}}>
                {[
                  {ic:'🏢',lbl:"Voir les biens", action:()=>navigate('/imoloc/biens')},
                  {ic:'📄',lbl:"Voir les baux", action:()=>navigate('/imoloc/baux')},
                  {ic:'✏️',lbl:"Modifier", action:()=>{}},
                  {ic:'🔗',lbl:"Dissocier", action:async()=>{
                    if(!confirm('Dissocier ce proprietaire de votre agence ?')) return
                    await supabase.from('agence_proprietaires').delete().eq('proprietaire_id',selectedProp.id).eq('agence_id',agence?.id)
                    toast.success('Proprietaire dissocie')
                    setSelectedProp(null); initData()
                  }},
                ].map((a,i)=>(
                  <span key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:'rgba(255,255,255,0.7)',cursor:'pointer',transition:'color 0.15s'}}
                    onClick={a.action}
                    onMouseEnter={e=>e.currentTarget.style.color='#e6edf3'}
                    onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'}>
                    {a.ic} {a.lbl}
                  </span>
                ))}
              </div>

              <div className="pp-detail-tabs">
                {['Profil','Biens','Documents','Paiements'].map(t=>(
                  <button key={t} className={`pp-detail-tab ${t==='Profil'?'active':''}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="pp-pb">
              {/* Grille 2 colonnes style Microsoft */}
              <div className="pp-detail-grid" style={{marginBottom:28}}>
                <div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Nom complet</div>
                    <div className="pp-blk-val">{selectedProp.prenom} {selectedProp.nom}</div>
                  </div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Telephone</div>
                    <div className="pp-blk-val">{selectedProp.telephone||'—'}</div>
                    {selectedProp.telephone2&&<div className="pp-blk-val">{selectedProp.telephone2}</div>}
                  </div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Ville</div>
                    <div className="pp-blk-val">{selectedProp.ville||'—'}{selectedProp.quartier&&`, ${selectedProp.quartier}`}</div>
                  </div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">IFU</div>
                    <div className="pp-blk-val">{selectedProp.ifu||<span style={{fontStyle:'italic',color:'rgba(255,255,255,0.25)'}}>Non renseigne</span>}</div>
                    {!selectedProp.ifu&&<button className="pp-blk-link">Ajouter l'IFU</button>}
                  </div>
                </div>
                <div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Email</div>
                    <div className="pp-blk-val">{selectedProp.email||'—'}</div>
                  </div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Nationalite</div>
                    <div className="pp-blk-val">{selectedProp.nationalite||'—'}</div>
                  </div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Statut fiscal</div>
                    <div className="pp-blk-val">{selectedProp.statut_fiscal||'Particulier'}</div>
                  </div>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Piece d'identite</div>
                    <div className="pp-blk-val">{selectedProp.type_piece||'—'} {selectedProp.numero_piece?`— ${selectedProp.numero_piece}`:''}</div>
                    <button className="pp-blk-link">Gerer les documents</button>
                  </div>
                </div>
              </div>

              <div className="pp-divider"/>

              <div style={{marginBottom:24}}>
                <div style={{fontSize:14,fontWeight:700,color:'#e6edf3',marginBottom:16}}>Collaboration avec {agence?.nom}</div>
                <div className="pp-detail-grid">
                  <div>
                    <div className="pp-blk">
                      <div className="pp-blk-lbl">Commission</div>
                      <div className="pp-blk-val">{selectedProp.taux_commission||10}% — {selectedProp.mode_commission||'mensuel'}</div>
                      <button className="pp-blk-link">Modifier</button>
                    </div>
                  </div>
                  <div>
                    <div className="pp-blk">
                      <div className="pp-blk-lbl">Biens confies</div>
                      <div className="pp-blk-val">{selectedProp.nb_biens||0} bien{(selectedProp.nb_biens||0)!==1?'s':''}</div>
                      <button className="pp-blk-link" onClick={()=>navigate('/imoloc/biens')}>Voir les biens</button>
                    </div>
                  </div>
                </div>
              </div>

              {selectedProp.note_interne&&(
                <>
                  <div className="pp-divider"/>
                  <div className="pp-blk">
                    <div className="pp-blk-lbl">Note interne</div>
                    <div style={{fontSize:13.5,color:'rgba(255,255,255,0.5)',lineHeight:1.7,fontStyle:'italic'}}>
                      {selectedProp.note_interne}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
