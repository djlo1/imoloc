import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const STEPS = [
  { id:1, label:'Informations de base' },
  { id:2, label:'Propriétaires' },
  { id:3, label:'Membres' },
  { id:4, label:'Paramètres' },
  { id:5, label:'Terminer' },
]

export default function AddTeamModal({ onClose, agenceId, agenceName='Mon organisation' }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [agences, setAgences] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  const [form, setForm] = useState({
    nom: '',
    description: '',
    proprietaires: [],
    membres: [],
    agence_id: agenceId || '',
    confidentialite: 'public',
  })

  const [propSearch, setPropSearch] = useState('')
  const [memSearch, setMemSearch] = useState('')
  const [propOpen, setPropOpen] = useState(false)
  const [memOpen, setMemOpen] = useState(false)
  const propRef = useRef(null)
  const memRef = useRef(null)

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    const init = async () => {
      // Récupérer l'utilisateur courant
      const { data:{ user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Récupérer les utilisateurs de l'organisation
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nom, prenom, role, telephone')

      // Récupérer les agences
      const { data: agencesData } = await supabase
        .from('agences')
        .select('id, nom')

      if (agencesData) setAgences(agencesData)

      // Récupérer les emails depuis agence_users
      const { data: auData } = await supabase
        .from('agence_users')
        .select('user_id, email, nom, prenom, role')

      // Fusionner profils + emails
      const merged = (profilesData || []).map(p => {
        const au = auData?.find(a => a.user_id === p.id)
        return {
          ...p,
          email: au?.email || (p.id === user?.id ? user?.email : ''),
          isSelf: p.id === user?.id,
        }
      })

      // Ajouter l'utilisateur courant s'il n'est pas dans les profils
      if (user && !merged.find(u => u.id === user.id)) {
        merged.unshift({ id: user.id, email: user.email, nom: '', prenom: 'Moi', role: 'admin', isSelf: true })
      }

      setUsers(merged)

      // Se définir comme propriétaire par défaut
      const selfUser = merged.find(u => u.id === user?.id)
      if (selfUser) {
        setForm(f => ({ ...f, proprietaires: [selfUser] }))
      }

      // Agence par défaut
      if (agencesData?.length === 1) {
        setForm(f => ({ ...f, agence_id: agencesData[0].id }))
      } else if (agenceId) {
        setForm(f => ({ ...f, agence_id: agenceId }))
      }
    }
    init()
  }, [])

  // Fermer les dropdowns si clic extérieur
  useEffect(() => {
    const handle = (e) => {
      if (propRef.current && !propRef.current.contains(e.target)) setPropOpen(false)
      if (memRef.current && !memRef.current.contains(e.target)) setMemOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const toggleProp = (u) => {
    const already = form.proprietaires.find(p => p.id === u.id)
    if (already) {
      // Ne pas retirer si c'est le seul propriétaire
      if (form.proprietaires.length === 1) {
        toast.error('Une équipe doit avoir au moins un propriétaire')
        return
      }
      set('proprietaires', form.proprietaires.filter(p => p.id !== u.id))
    } else {
      set('proprietaires', [...form.proprietaires, u])
      // Retirer des membres si présent
      set('membres', form.membres.filter(m => m.id !== u.id))
    }
  }

  const toggleMem = (u) => {
    // Ne pas ajouter si déjà propriétaire
    if (form.proprietaires.find(p => p.id === u.id)) {
      toast('Cet utilisateur est déjà propriétaire', { icon: 'ℹ️' })
      return
    }
    const already = form.membres.find(m => m.id === u.id)
    if (already) set('membres', form.membres.filter(m => m.id !== u.id))
    else set('membres', [...form.membres, u])
  }

  const removeProp = (id) => {
    if (form.proprietaires.length === 1) { toast.error('Au moins un propriétaire requis'); return }
    set('proprietaires', form.proprietaires.filter(p => p.id !== id))
  }
  const removeMem = (id) => set('membres', form.membres.filter(m => m.id !== id))

  const getInitials = (u) => {
    const p = u.prenom?.[0]?.toUpperCase() || ''
    const n = u.nom?.[0]?.toUpperCase() || ''
    return p + n || u.email?.[0]?.toUpperCase() || '?'
  }

  const getRoleColor = (role) => ({
    global_admin:'#ef4444', user_admin:'#f59e0b', agent:'#0078d4',
    admin:'#0078d4', comptable:'#6c63ff', lecteur:'#6c63ff',
  }[role] || '#0078d4')

  const filteredProp = users.filter(u => {
    const term = propSearch.toLowerCase()
    return `${u.prenom||''} ${u.nom||''} ${u.email||''}`.toLowerCase().includes(term)
  })

  const filteredMem = users.filter(u => {
    const term = memSearch.toLowerCase()
    return `${u.prenom||''} ${u.nom||''} ${u.email||''}`.toLowerCase().includes(term)
  })

  const canNext = () => {
    if (step === 1) return form.nom.trim().length > 0
    if (step === 2) return form.proprietaires.length > 0
    if (step === 4) return !!form.agence_id
    return true
  }

  const selectedAgence = agences.find(a => a.id === form.agence_id)

  const handleFinish = async () => {
    setSaving(true)
    try {
      // Créer l'équipe
      const { data: equipe, error: eqErr } = await supabase
        .from('equipes')
        .insert({
          agence_id: form.agence_id || null,
          nom: form.nom,
          description: form.description,
          confidentialite: form.confidentialite,
          created_by: currentUser?.id,
        })
        .select()
        .single()

      if (eqErr) throw eqErr

      // Ajouter les propriétaires
      for (const p of form.proprietaires) {
        await supabase.from('equipe_membres').insert({
          equipe_id: equipe.id,
          user_id: p.id,
          role: 'proprietaire',
        })
      }

      // Ajouter les membres
      for (const m of form.membres) {
        await supabase.from('equipe_membres').insert({
          equipe_id: equipe.id,
          user_id: m.id,
          role: 'membre',
        })
      }

      toast.success(`✅ Équipe "${form.nom}" créée avec succès !`)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  const UserChip = ({ u, onRemove }) => (
    <span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:'100px',background:'rgba(0,120,212,0.12)',border:'1px solid rgba(0,120,212,0.25)',fontSize:12.5,color:'#4da6ff',margin:'0 4px 5px 0'}}>
      {u.prenom} {u.nom || u.email?.split('@')[0]}
      {onRemove && !u.isSelf && (
        <button onClick={()=>onRemove(u.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(77,166,255,0.6)',padding:0,display:'flex',lineHeight:1,fontSize:14}}>×</button>
      )}
    </span>
  )

  const UserSearchDropdown = ({ users: list, selected, onToggle, search, setSearch, dropRef, open, setOpen, placeholder }) => (
    <div ref={dropRef} style={{position:'relative'}}>
      <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:'8px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,minHeight:42,cursor:'text'}}
        onClick={()=>setOpen(true)}>
        {selected.map((u,i) => (
          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 10px',borderRadius:'100px',background:'rgba(0,120,212,0.15)',border:'1px solid rgba(0,120,212,0.3)',fontSize:12.5,color:'#4da6ff'}}>
            {u.prenom} {u.nom || u.email?.split('@')[0]}
            <button onClick={(e)=>{e.stopPropagation();onToggle(u)}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(77,166,255,0.6)',padding:0,fontSize:14,lineHeight:1}}>×</button>
          </span>
        ))}
        <input
          value={search}
          onChange={e=>{setSearch(e.target.value);setOpen(true)}}
          onFocus={()=>setOpen(true)}
          placeholder={selected.length===0?placeholder:''}
          style={{background:'none',border:'none',outline:'none',fontFamily:'Inter',fontSize:13.5,color:'#e6edf3',minWidth:160,flex:1}}
        />
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#1c2434',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',zIndex:10,maxHeight:220,overflowY:'auto'}}>
          {list.length === 0 ? (
            <div style={{padding:'14px 16px',fontSize:13,color:'rgba(255,255,255,0.3)',textAlign:'center'}}>Aucun résultat</div>
          ) : list.map((u,i) => {
            const isSelected = !!selected.find(s=>s.id===u.id)
            const color = getRoleColor(u.role)
            return (
              <div key={i}
                onClick={()=>onToggle(u)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',background:isSelected?'rgba(0,120,212,0.08)':'transparent',transition:'background 0.1s'}}
                onMouseOver={e=>!isSelected&&(e.currentTarget.style.background='rgba(255,255,255,0.04)')}
                onMouseOut={e=>!isSelected&&(e.currentTarget.style.background='transparent')}>
                <div style={{width:30,height:30,borderRadius:'50%',background:`linear-gradient(135deg,${color},${color}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>
                  {getInitials(u)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:500,color:'#e6edf3'}}>{u.prenom} {u.nom}{u.isSelf&&<span style={{fontSize:10,marginLeft:6,padding:'1px 6px',borderRadius:'100px',background:'rgba(0,120,212,0.12)',color:'#4da6ff'}}>Vous</span>}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{u.email||'—'}</div>
                </div>
                {isSelected && (
                  <svg width="14" height="14" fill="none" stroke="#4da6ff" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        .at-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:500;display:flex;align-items:stretch;justify-content:flex-end;backdrop-filter:blur(6px)}
        .at-panel{width:100%;max-width:920px;background:#161b22;display:flex;flex-direction:column;animation:at-slide 0.25s ease;overflow:hidden;border-left:1px solid rgba(255,255,255,0.07)}
        @keyframes at-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .at-head{display:flex;align-items:center;justify-content:space-between;padding:16px 32px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .at-head-title{font-size:15px;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:0.02em}
        .at-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:6px;border-radius:5px;display:flex;transition:all 0.1s}
        .at-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .at-body{display:flex;flex:1;overflow:hidden}
        .at-steps{width:200px;border-right:1px solid rgba(255,255,255,0.07);padding:32px 0;flex-shrink:0;display:flex;flex-direction:column}
        .at-step{display:flex;align-items:center;gap:14px;padding:11px 24px;position:relative;cursor:pointer}
        .at-step:hover .at-step-lbl{color:rgba(255,255,255,0.65)}
        .at-step-circle{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;transition:all 0.2s;border:2px solid rgba(255,255,255,0.12)}
        .at-step-circle.done{background:#0078d4;border-color:#0078d4;color:#fff}
        .at-step-circle.done.error{background:#ef4444;border-color:#ef4444}
        .at-step-circle.active{background:#0078d4;border-color:#0078d4;color:#fff;box-shadow:0 0 12px rgba(0,120,212,0.4)}
        .at-step-circle.pending{background:transparent;border-color:rgba(255,255,255,0.12);color:rgba(255,255,255,0.3)}
        .at-step-lbl{font-size:13px;color:rgba(255,255,255,0.4);transition:color 0.1s}
        .at-step-lbl.active{color:#e6edf3;font-weight:600}
        .at-step-lbl.done{color:rgba(255,255,255,0.55)}
        .at-step-line{position:absolute;left:36px;top:37px;width:2px;height:calc(100% - 11px);background:rgba(255,255,255,0.07)}
        .at-step-line.done{background:rgba(0,120,212,0.4)}
        .at-content{flex:1;overflow-y:auto;padding:36px 40px}
        .at-content::-webkit-scrollbar{width:4px}
        .at-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .at-content-title{font-size:24px;font-weight:700;color:#e6edf3;margin-bottom:12px;letter-spacing:-0.02em}
        .at-content-sub{font-size:14px;color:rgba(255,255,255,0.4);margin-bottom:28px;line-height:1.7;max-width:620px}
        .at-lbl{display:block;font-size:13px;font-weight:600;color:#e6edf3;margin-bottom:8px}
        .at-lbl span{color:#ef4444;margin-left:2px}
        .at-lbl-sub{font-size:12px;color:rgba(255,255,255,0.35);font-weight:400;margin-left:6px}
        .at-input{width:100%;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;margin-bottom:20px}
        .at-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .at-textarea{width:100%;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;resize:vertical;min-height:100px;transition:border-color 0.15s;margin-bottom:6px}
        .at-textarea:focus{border-color:#0078d4}
        .at-info-box{display:flex;gap:10px;padding:12px 14px;border-radius:6px;background:rgba(0,120,212,0.08);border:1px solid rgba(0,120,212,0.2);margin-bottom:22px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.55}
        .at-warn-box{display:flex;gap:10px;padding:12px 14px;border-radius:6px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);margin-bottom:22px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.55}
        .at-radio{display:flex;gap:12px;margin-bottom:22px}
        .at-radio-opt{flex:1;display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1.5px solid rgba(255,255,255,0.08);border-radius:8px;cursor:pointer;transition:all 0.15s}
        .at-radio-opt:hover{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.03)}
        .at-radio-opt.active{border-color:rgba(0,120,212,0.5);background:rgba(0,120,212,0.07)}
        .at-radio-dot{width:17px;height:17px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .at-radio-dot.on{border-color:#0078d4}
        .at-radio-dot.on::after{content:'';width:7px;height:7px;border-radius:50%;background:#0078d4}
        .at-agence-select{display:flex;flex-direction:column;gap:8px;margin-bottom:22px}
        .at-agence-opt{display:flex;align-items:center;gap:12px;padding:12px 16px;border:1.5px solid rgba(255,255,255,0.08);border-radius:8px;cursor:pointer;transition:all 0.15s}
        .at-agence-opt:hover{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.03)}
        .at-agence-opt.active{border-color:rgba(0,120,212,0.5);background:rgba(0,120,212,0.07)}
        .at-agence-add{display:flex;align-items:center;gap:10px;padding:11px 16px;border:1.5px dashed rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-size:13.5px;color:rgba(255,255,255,0.4);transition:all 0.15s}
        .at-agence-add:hover{border-color:rgba(0,120,212,0.4);color:#4da6ff;background:rgba(0,120,212,0.05)}
        .at-summary-section{margin-bottom:20px}
        .at-summary-head{font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
        .at-summary-edit{font-size:12px;color:#4da6ff;cursor:pointer;background:none;border:none;font-family:'Inter',sans-serif}
        .at-summary-edit:hover{text-decoration:underline}
        .at-summary-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px 16px}
        .at-summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13.5px}
        .at-summary-row:last-child{border-bottom:none}
        .at-summary-key{color:rgba(255,255,255,0.4)}
        .at-summary-val{color:#e6edf3;font-weight:500;text-align:right;max-width:60%}
        .at-error-card{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:10px 14px;font-size:13px;color:rgba(239,68,68,0.8);display:flex;align-items:center;gap:8px;margin-bottom:10px}
        .at-foot{padding:18px 32px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#161b22}
        .at-foot-left{font-size:13px;color:rgba(255,255,255,0.3)}
        .at-foot-btns{display:flex;gap:10px}
        .at-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 22px;border-radius:4px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .at-btn-blue{background:#0078d4;color:#fff}
        .at-btn-blue:hover:not(:disabled){background:#006cc1}
        .at-btn-blue:disabled{opacity:0.4;cursor:not-allowed}
        .at-btn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .at-btn-ghost:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .at-spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:at-s 0.6s linear infinite}
        @keyframes at-s{to{transform:rotate(360deg)}}
        @media(max-width:768px){.at-panel{max-width:100%}.at-steps{display:none}.at-content{padding:24px 20px}.at-radio{flex-direction:column}}
      `}</style>

      <div className="at-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="at-panel">

          {/* Header */}
          <div className="at-head">
            <span className="at-head-title">Ajouter une équipe</span>
            <button className="at-close" onClick={onClose}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="at-body">
            {/* Sidebar steps */}
            <div className="at-steps">
              {STEPS.map((s,i) => (
                <div key={s.id} style={{position:'relative'}}>
                  <div className="at-step" onClick={()=>step>s.id&&setStep(s.id)}>
                    <div className={`at-step-circle ${step>s.id?'done':step===s.id?'active':'pending'}`}>
                      {step>s.id
                        ? <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                        : s.id}
                    </div>
                    <span className={`at-step-lbl ${step===s.id?'active':step>s.id?'done':''}`}>{s.label}</span>
                  </div>
                  {i<STEPS.length-1 && <div className={`at-step-line ${step>s.id?'done':''}`}/>}
                </div>
              ))}
            </div>

            {/* Contenu */}
            <div className="at-content">

              {/* ══ ÉTAPE 1 — Informations de base ══ */}
              {step===1 && (
                <>
                  <div className="at-content-title">Configurer les informations de base</div>
                  <div className="at-content-sub">
                    Une équipe permet de regrouper des membres de votre organisation par fonction, projet ou département. Pour commencer, renseignez les informations de base de cette nouvelle équipe.
                  </div>
                  <label className="at-lbl">Nom de l'équipe <span>*</span></label>
                  <input
                    className="at-input"
                    value={form.nom}
                    onChange={e=>set('nom',e.target.value)}
                    placeholder="Exemple : Équipe commerciale, Support client..."
                    autoFocus
                  />
                  <label className="at-lbl">Décrire cette équipe <span className="at-lbl-sub">(facultatif)</span></label>
                  <textarea
                    className="at-textarea"
                    value={form.description}
                    onChange={e=>set('description',e.target.value)}
                    placeholder="Entrez la description de votre nouvelle équipe"
                  />
                  <div style={{fontSize:12.5,color:'rgba(255,255,255,0.3)',marginBottom:8}}>
                    {form.description.length} / 500 caractères
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 2 — Propriétaires ══ */}
              {step===2 && (
                <>
                  <div className="at-content-title">Ajouter des propriétaires</div>
                  <div className="at-content-sub">
                    Les propriétaires d'équipe peuvent ajouter ou supprimer des membres, modifier les détails de l'équipe et gérer les accès. Nous vous recommandons d'ajouter au moins deux propriétaires.
                  </div>
                  <div className="at-info-box">
                    <svg width="15" height="15" fill="none" stroke="#4da6ff" strokeWidth="1.5" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:1}}><path strokeLinecap="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                    Vous êtes automatiquement ajouté comme propriétaire en tant que créateur de l'équipe. Vous pouvez ajouter d'autres propriétaires.
                  </div>
                  <label className="at-lbl">Propriétaires <span>*</span></label>
                  <UserSearchDropdown
                    users={filteredProp}
                    selected={form.proprietaires}
                    onToggle={toggleProp}
                    search={propSearch}
                    setSearch={setPropSearch}
                    dropRef={propRef}
                    open={propOpen}
                    setOpen={setPropOpen}
                    placeholder="Entrez un nom ou une adresse e-mail"
                  />
                </>
              )}

              {/* ══ ÉTAPE 3 — Membres ══ */}
              {step===3 && (
                <>
                  <div className="at-content-title">Ajouter des membres</div>
                  <div className="at-content-sub">
                    Les membres ont accès aux ressources de l'équipe selon les permissions définies. Ils peuvent participer aux activités mais ne peuvent pas modifier la configuration de l'équipe.
                  </div>
                  <label className="at-lbl">Membres <span className="at-lbl-sub">(facultatif)</span></label>
                  <UserSearchDropdown
                    users={filteredMem.filter(u => !form.proprietaires.find(p=>p.id===u.id))}
                    selected={form.membres}
                    onToggle={toggleMem}
                    search={memSearch}
                    setSearch={setMemSearch}
                    dropRef={memRef}
                    open={memOpen}
                    setOpen={setMemOpen}
                    placeholder="Entrez un nom ou une adresse e-mail"
                  />
                  {form.membres.length === 0 && (
                    <div style={{padding:'20px',textAlign:'center',color:'rgba(255,255,255,0.25)',fontSize:13.5,background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px dashed rgba(255,255,255,0.07)'}}>
                      Aucun membre ajouté pour le moment. Vous pouvez en ajouter ultérieurement.
                    </div>
                  )}
                </>
              )}

              {/* ══ ÉTAPE 4 — Paramètres ══ */}
              {step===4 && (
                <>
                  <div className="at-content-title">Modifier les paramètres</div>
                  <div className="at-content-sub">
                    Sélectionnez l'agence à laquelle cette équipe sera rattachée et définissez les paramètres de confidentialité.
                  </div>

                  {/* Sélection agence */}
                  <label className="at-lbl">Agence <span>*</span></label>
                  <div className="at-agence-select">
                    {agences.length === 0 ? (
                      <div style={{padding:'14px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13.5,background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px dashed rgba(255,255,255,0.07)'}}>
                        Aucune agence disponible
                      </div>
                    ) : agences.map((ag,i) => (
                      <div key={i}
                        className={`at-agence-opt ${form.agence_id===ag.id?'active':''}`}
                        onClick={()=>set('agence_id',ag.id)}>
                        <div style={{width:36,height:36,borderRadius:8,background:'rgba(0,120,212,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🏢</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>{ag.nom}</div>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>Agence · {agenceName}</div>
                        </div>
                        {form.agence_id===ag.id && (
                          <svg width="16" height="16" fill="none" stroke="#4da6ff" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/>
                          </svg>
                        )}
                      </div>
                    ))}
                    <div className="at-agence-add" onClick={()=>toast('Fonctionnalité de création d\'agence à venir',{icon:'🏗️'})}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/>
                      </svg>
                      Ajouter une agence
                    </div>
                  </div>

                  {/* Confidentialité */}
                  <label className="at-lbl">Confidentialité</label>
                  <div className="at-radio">
                    <div className={`at-radio-opt ${form.confidentialite==='public'?'active':''}`} onClick={()=>set('confidentialite','public')}>
                      <div className={`at-radio-dot ${form.confidentialite==='public'?'on':''}`}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:4}}>🌐 Public</div>
                        <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>Les personnes de l'organisation peuvent rejoindre l'équipe et accéder à son contenu sans approbation préalable.</div>
                      </div>
                    </div>
                    <div className={`at-radio-opt ${form.confidentialite==='prive'?'active':''}`} onClick={()=>set('confidentialite','prive')}>
                      <div className={`at-radio-dot ${form.confidentialite==='prive'?'on':''}`}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:4}}>🔒 Privé</div>
                        <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>Seuls les membres invités par un propriétaire peuvent accéder à cette équipe et à son contenu.</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 5 — Résumé / Terminer ══ */}
              {step===5 && (
                <>
                  <div className="at-content-title">Vérifier et finaliser l'ajout d'équipe</div>
                  <div className="at-content-sub">
                    Vous avez presque terminé. Vérifiez que tout est correct avant de créer votre nouvelle équipe.
                  </div>

                  {/* Vérifications */}
                  {!form.nom && (
                    <div className="at-error-card">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
                      Entrez un nom d'équipe
                    </div>
                  )}
                  {!form.agence_id && (
                    <div className="at-error-card">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
                      Sélectionnez une agence
                    </div>
                  )}

                  {/* Résumé */}
                  <div className="at-summary-section">
                    <div className="at-summary-head">
                      Informations de base
                      <button className="at-summary-edit" onClick={()=>setStep(1)}>Modifier</button>
                    </div>
                    <div className="at-summary-card">
                      <div className="at-summary-row">
                        <span className="at-summary-key">Nom de l'équipe</span>
                        <span className="at-summary-val">{form.nom || <span style={{color:'#ef4444'}}>Non renseigné</span>}</span>
                      </div>
                      <div className="at-summary-row">
                        <span className="at-summary-key">Description</span>
                        <span className="at-summary-val">{form.description || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="at-summary-section">
                    <div className="at-summary-head">
                      Propriétaires
                      <button className="at-summary-edit" onClick={()=>setStep(2)}>Modifier</button>
                    </div>
                    <div className="at-summary-card">
                      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                        {form.proprietaires.map((u,i) => (
                          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:'100px',background:'rgba(0,120,212,0.12)',border:'1px solid rgba(0,120,212,0.25)',fontSize:13,color:'#4da6ff'}}>
                            {u.prenom} {u.nom || u.email?.split('@')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="at-summary-section">
                    <div className="at-summary-head">
                      Membres
                      <button className="at-summary-edit" onClick={()=>setStep(3)}>Modifier</button>
                    </div>
                    <div className="at-summary-card">
                      {form.membres.length === 0 ? (
                        <span style={{fontSize:13.5,color:'rgba(255,255,255,0.35)'}}>Aucun membre ajouté pour le moment</span>
                      ) : (
                        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                          {form.membres.map((u,i) => (
                            <span key={i} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:'100px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',fontSize:13,color:'rgba(255,255,255,0.6)'}}>
                              {u.prenom} {u.nom || u.email?.split('@')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="at-summary-section">
                    <div className="at-summary-head">
                      Paramètres
                      <button className="at-summary-edit" onClick={()=>setStep(4)}>Modifier</button>
                    </div>
                    <div className="at-summary-card">
                      <div className="at-summary-row">
                        <span className="at-summary-key">Agence</span>
                        <span className="at-summary-val">{selectedAgence?.nom || <span style={{color:'#ef4444'}}>Non sélectionné</span>}</span>
                      </div>
                      <div className="at-summary-row">
                        <span className="at-summary-key">Confidentialité</span>
                        <span className="at-summary-val">{form.confidentialite === 'public' ? '🌐 Public' : '🔒 Privé'}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="at-foot">
            <div className="at-foot-left">Étape {step} sur {STEPS.length}</div>
            <div className="at-foot-btns">
              <button className="at-btn at-btn-ghost" onClick={()=>step>1?setStep(step-1):onClose()}>
                {step===1?'Annuler':'Précédent'}
              </button>
              {step < STEPS.length ? (
                <button
                  className="at-btn at-btn-blue"
                  disabled={!canNext()}
                  onClick={()=>setStep(step+1)}>
                  Suivant
                </button>
              ) : (
                <button
                  className="at-btn at-btn-blue"
                  disabled={saving || !form.nom || !form.agence_id}
                  onClick={handleFinish}>
                  {saving ? <><span className="at-spin"/> Création...</> : 'Ajouter l\'équipe'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
