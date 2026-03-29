import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
  return Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('')
}

export default function ResetPasswordPanel({ onClose, agenceId }) {
  const { profile, logout } = useAuthStore()
  const [step, setStep] = useState(1)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [autoPass, setAutoPass] = useState(true)
  const [forceChange, setForceChange] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [results, setResults] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [agenceId])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id)

      // Récupérer d'abord les profils de l'organisation
      let orgUsers = []

      if (agenceId) {
        // Utilisateurs associés à l'agence
        const { data: auData } = await supabase
          .from('agence_users')
          .select('user_id, role, email, nom, prenom, poste')
          .eq('agence_id', agenceId)

        if (auData && auData.length > 0) {
          orgUsers = auData.map(u => ({
            id: u.user_id,
            email: u.email,
            nom: u.nom,
            prenom: u.prenom,
            role: u.role,
            poste: u.poste,
          }))
        }
      }

      // Toujours ajouter l'utilisateur courant s'il n'est pas déjà dans la liste
      const currentInList = orgUsers.find(u => u.id === user?.id)
      if (!currentInList && user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, nom, prenom, role, telephone')
          .eq('id', user.id)
          .single()

        orgUsers.unshift({
          id: user.id,
          email: user.email,
          nom: profileData?.nom || '',
          prenom: profileData?.prenom || '',
          role: profileData?.role || 'admin',
          poste: '',
          isSelf: true,
        })
      } else if (currentInList) {
        currentInList.isSelf = true
        // S'assurer que l'email est présent
        if (!currentInList.email) currentInList.email = user?.email
      }

      // Si toujours vide, récupérer tous les profils
      if (orgUsers.length === 0) {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, nom, prenom, role')

        if (allProfiles) {
          for (const p of allProfiles) {
            let email = ''
            if (p.id === user?.id) email = user.email
            orgUsers.push({
              id: p.id,
              email,
              nom: p.nom || '',
              prenom: p.prenom || '',
              role: p.role || 'agent',
              isSelf: p.id === user?.id,
            })
          }
        }
      }

      setUsers(orgUsers)
    } catch (e) {
      console.error('Erreur chargement utilisateurs:', e)
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter(u => {
    const term = search.toLowerCase()
    const name = `${u.prenom||''} ${u.nom||''}`.toLowerCase()
    const email = (u.email||'').toLowerCase()
    return name.includes(term) || email.includes(term)
  })

  const toggleSelect = (u) => {
    setSelected(prev =>
      prev.find(s => s.id === u.id)
        ? prev.filter(s => s.id !== u.id)
        : [...prev, u]
    )
  }

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([])
    else setSelected([...filtered])
  }

  const selfSelected = selected.some(s => s.isSelf)

  const handleReset = async () => {
    setResetting(true)
    const newResults = []
    const SUPA_URL = 'https://zecyfnurrcslukxvmpca.supabase.co'

    for (const user of selected) {
      const newPass = generatePassword()
      try {
        // 1. Réinitialiser via Admin API
        if (user.id) {
          const res = await fetch(`${SUPA_URL}/functions/v1/admin-actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'reset_password',
              user_id: user.id,
              data: { password: newPass }
            })
          })
          const result = await res.json()
          if (result.error) throw new Error(result.error)
        }

        // 2. Sauvegarder dans invitations
        await supabase.from('invitations').insert({
          agence_id: agenceId,
          email: user.email,
          prenom: user.prenom,
          nom: user.nom,
          password_temp: newPass,
          force_change_password: forceChange,
          statut: 'reset_password',
        })

        // 3. Envoyer email
        if (user.email) {
          await fetch(`${SUPA_URL}/functions/v1/send-invitation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              prenom: user.prenom || 'Utilisateur',
              nom: user.nom || '',
              agenceName: 'Imoloc',
              role: user.role || 'Agent',
              password: newPass,
              force_change: forceChange,
              loginUrl: `${window.location.origin}/login`,
              isReset: true,
            }),
          })
        }

        newResults.push({ user, password: newPass, success: true })
      } catch (e) {
        console.error('Erreur reset:', e)
        newResults.push({ user, password: '', success: false, error: e.message })
      }
    }

    setResults(newResults)
    setStep(3)
    setResetting(false)

    if (selfSelected) {
      toast('Votre mot de passe a été réinitialisé. Déconnexion dans 3 secondes...', { icon: '🔐', duration: 3000 })
      setTimeout(async () => {
        await supabase.auth.signOut()
        logout()
        window.location.href = '/login'
      }, 3500)
    }
  }

  const copyPass = (pass) => {
    navigator.clipboard.writeText(pass)
    toast.success('Copié !')
  }

  const getInitials = (u) => {
    const p = u.prenom?.[0]?.toUpperCase() || ''
    const n = u.nom?.[0]?.toUpperCase() || ''
    return p + n || u.email?.[0]?.toUpperCase() || '?'
  }

  const getRoleColor = (role) => ({
    global_admin:'#ef4444', user_admin:'#f59e0b', billing_admin:'#f59e0b',
    agent:'#0078d4', comptable:'#6c63ff', lecteur:'#6c63ff', admin:'#0078d4',
  }[role] || '#0078d4')

  return (
    <>
      <style>{`
        .rp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;justify-content:flex-end}
        .rp-panel{width:420px;height:100%;background:#161b22;display:flex;flex-direction:column;animation:rp-slide 0.2s ease;border-left:1px solid rgba(255,255,255,0.07);overflow:hidden}
        @keyframes rp-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .rp-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .rp-back{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);font-size:12px;display:flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;padding:0;transition:color 0.1s}
        .rp-back:hover{color:#e6edf3}
        .rp-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:4px;border-radius:4px;display:flex;transition:all 0.1s}
        .rp-close:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .rp-title{font-size:18px;font-weight:700;color:#e6edf3;padding:18px 20px 6px;flex-shrink:0}
        .rp-sub{font-size:13px;color:rgba(255,255,255,0.4);padding:0 20px 14px;line-height:1.6;flex-shrink:0}
        .rp-body{flex:1;overflow-y:auto;padding:0 20px}
        .rp-body::-webkit-scrollbar{width:4px}
        .rp-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .rp-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:5px;padding:8px 12px;margin-bottom:12px}
        .rp-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;width:100%}
        .rp-search input::placeholder{color:rgba(255,255,255,0.25)}
        .rp-select-all{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:8px;cursor:pointer}
        .rp-checkbox{width:17px;height:17px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
        .rp-checkbox.checked{background:#0078d4;border-color:#0078d4}
        .rp-checkbox.partial{background:rgba(0,120,212,0.3);border-color:#0078d4}
        .rp-user-item{display:flex;align-items:center;gap:12px;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.1s;border-radius:6px;margin:0 -8px}
        .rp-user-item:hover{background:rgba(255,255,255,0.04)}
        .rp-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
        .rp-user-name{font-size:13.5px;font-weight:500;color:#e6edf3;margin-bottom:2px}
        .rp-user-email{font-size:12px;color:rgba(255,255,255,0.35)}
        .rp-self-badge{font-size:10px;font-weight:600;padding:1px 7px;border-radius:100px;background:rgba(0,120,212,0.12);color:#4da6ff;margin-left:6px;vertical-align:middle}
        .rp-warn-box{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:7px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:rgba(255,255,255,0.55);line-height:1.6;display:flex;gap:10px}
        .rp-option{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px solid rgba(255,255,255,0.07);border-radius:7px;margin-bottom:10px;cursor:pointer;transition:all 0.15s}
        .rp-option:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .rp-option.active{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .rp-option-lbl{font-size:13.5px;color:#e6edf3;font-weight:500;margin-bottom:3px}
        .rp-option-sub{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5}
        .rp-selected-chips{margin-bottom:16px;display:flex;flex-wrap:wrap;gap:6px}
        .rp-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:100px;background:rgba(0,120,212,0.12);border:1px solid rgba(0,120,212,0.25);font-size:12px;color:#4da6ff}
        .rp-result-item{padding:14px;border:1px solid rgba(255,255,255,0.07);border-radius:8px;margin-bottom:10px}
        .rp-result-user{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .rp-result-pass{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 12px}
        .rp-pass-val{font-family:monospace;font-size:14px;color:#00c896;font-weight:600;letter-spacing:0.05em}
        .rp-copy-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:2px;display:flex;transition:color 0.1s}
        .rp-copy-btn:hover{color:#e6edf3}
        .rp-empty{text-align:center;padding:40px 20px;color:rgba(255,255,255,0.3);font-size:13.5px}
        .rp-foot{padding:14px 20px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .rp-btn{flex:1;padding:10px;border-radius:6px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .rp-btn-blue{background:#0078d4;color:#fff}
        .rp-btn-blue:hover:not(:disabled){background:#006cc1}
        .rp-btn-blue:disabled{opacity:0.4;cursor:not-allowed}
        .rp-btn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .rp-btn-ghost:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .rp-spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:rp-s 0.6s linear infinite;display:inline-block;vertical-align:middle;margin-right:6px}
        @keyframes rp-s{to{transform:rotate(360deg)}}
        @media(max-width:500px){.rp-panel{width:100%}}
      `}</style>

      <div className="rp-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="rp-panel">

          {/* Header */}
          <div className="rp-head">
            {step > 1 ? (
              <button className="rp-back" onClick={()=>setStep(step-1)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
                </svg>
                Précédent
              </button>
            ) : <div/>}
            <button className="rp-close" onClick={onClose}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ══ ÉTAPE 1 — Sélection ══ */}
          {step === 1 && (
            <>
              <div className="rp-title">Réinitialiser le mot de passe</div>
              <div className="rp-sub">Sélectionnez les utilisateurs dont vous souhaitez réinitialiser le mot de passe.</div>
              <div className="rp-body">
                <div className="rp-search">
                  <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/>
                  </svg>
                  <input
                    placeholder="Effectuer une recherche par nom ou email"
                    value={search}
                    onChange={e=>setSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {filtered.length > 0 && (
                  <div className="rp-select-all" onClick={toggleAll}>
                    <div className={`rp-checkbox ${selected.length===filtered.length&&filtered.length>0?'checked':selected.length>0?'partial':''}`}>
                      {selected.length===filtered.length&&filtered.length>0
                        ? <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                        : selected.length>0
                        ? <div style={{width:8,height:2,background:'#4da6ff',borderRadius:1}}/>
                        : null}
                    </div>
                    <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>Sélectionner tout</span>
                  </div>
                )}

                {loading ? (
                  <div className="rp-empty">Chargement des utilisateurs...</div>
                ) : filtered.length === 0 ? (
                  <div className="rp-empty">
                    {search ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur dans cette organisation'}
                  </div>
                ) : (
                  filtered.map((u,i) => {
                    const isSelected = !!selected.find(s=>s.id===u.id)
                    const color = getRoleColor(u.role)
                    return (
                      <div key={i} className="rp-user-item" onClick={()=>toggleSelect(u)}>
                        <div className={`rp-checkbox ${isSelected?'checked':''}`}>
                          {isSelected&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                        <div className="rp-avatar" style={{background:`linear-gradient(135deg,${color},${color}88)`}}>
                          {getInitials(u)}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="rp-user-name">
                            {u.prenom} {u.nom}
                            {u.isSelf && <span className="rp-self-badge">Vous</span>}
                          </div>
                          <div className="rp-user-email">{u.email || 'Email non renseigné'}</div>
                        </div>
                        {u.role && (
                          <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:'100px',background:`${color}18`,color,flexShrink:0}}>
                            {u.role}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="rp-foot">
                <button className="rp-btn rp-btn-ghost" onClick={onClose}>Annuler</button>
                <button
                  className="rp-btn rp-btn-blue"
                  disabled={selected.length === 0}
                  onClick={()=>setStep(2)}>
                  Sélectionner ({selected.length})
                </button>
              </div>
            </>
          )}

          {/* ══ ÉTAPE 2 — Options ══ */}
          {step === 2 && (
            <>
              <div className="rp-title">Réinitialiser le mot de passe</div>
              <div className="rp-sub">{selected.length} utilisateur{selected.length>1?'s':''} sélectionné{selected.length>1?'s':''}</div>
              <div className="rp-body">
                {/* Chips */}
                <div className="rp-selected-chips">
                  {selected.map((u,i) => (
                    <span key={i} className="rp-chip">
                      {u.prenom} {u.nom}
                      {u.isSelf && ' (vous)'}
                    </span>
                  ))}
                </div>

                {/* Avertissement si l'utilisateur se réinitialise lui-même */}
                {selfSelected && (
                  <div className="rp-warn-box">
                    <span style={{fontSize:18}}>⚠️</span>
                    <div>
                      Vous avez sélectionné votre propre compte. Après la réinitialisation, <strong style={{color:'#f59e0b'}}>vous serez automatiquement déconnecté</strong> et devrez vous reconnecter avec le nouveau mot de passe envoyé sur votre email.
                    </div>
                  </div>
                )}

                <div className={`rp-option ${autoPass?'active':''}`} onClick={()=>setAutoPass(true)}>
                  <div className={`rp-checkbox ${autoPass?'checked':''}`}>
                    {autoPass&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                  <div>
                    <div className="rp-option-lbl">Créer automatiquement un mot de passe</div>
                    <div className="rp-option-sub">Un mot de passe sécurisé sera généré et envoyé par email</div>
                  </div>
                </div>

                <div className={`rp-option ${!autoPass?'active':''}`} onClick={()=>setAutoPass(false)}>
                  <div className={`rp-checkbox ${!autoPass?'checked':''}`}>
                    {!autoPass&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                  <div>
                    <div className="rp-option-lbl">Laisser les utilisateurs créer leur mot de passe</div>
                    <div className="rp-option-sub">Un lien de réinitialisation sera envoyé par email</div>
                  </div>
                </div>

                <div style={{height:'1px',background:'rgba(255,255,255,0.07)',margin:'14px 0'}}/>

                <div className={`rp-option ${forceChange?'active':''}`} onClick={()=>setForceChange(!forceChange)}>
                  <div className={`rp-checkbox ${forceChange?'checked':''}`}>
                    {forceChange&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                  <div>
                    <div className="rp-option-lbl">Demander de modifier le mot de passe à la première connexion</div>
                  </div>
                </div>
              </div>

              <div className="rp-foot">
                <button className="rp-btn rp-btn-ghost" onClick={()=>setStep(1)}>Annuler</button>
                <button
                  className="rp-btn rp-btn-blue"
                  disabled={resetting}
                  onClick={handleReset}>
                  {resetting
                    ? <><span className="rp-spin"/>Réinitialisation...</>
                    : 'Réinitialiser le mot de passe'}
                </button>
              </div>
            </>
          )}

          {/* ══ ÉTAPE 3 — Résultats ══ */}
          {step === 3 && (
            <>
              <div className="rp-title" style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(0,200,150,0.15)',border:'2px solid rgba(0,200,150,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="14" height="14" fill="none" stroke="#00c896" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                </div>
                Les mots de passe ont été réinitialisés
              </div>
              <div className="rp-sub">
                Vous avez réinitialisé le mot de passe de {results.length} utilisateur{results.length>1?'s':''}.
                {selfSelected && <span style={{color:'#f59e0b'}}> Vous allez être déconnecté dans quelques secondes...</span>}
              </div>
              <div className="rp-body">
                <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
                  <button
                    onClick={()=>{
                      const text = results.map(r=>`${r.user.prenom} ${r.user.nom} (${r.user.email}): ${r.password}`).join('\n')
                      navigator.clipboard.writeText(text)
                      toast.success('Tous les mots de passe copiés !')
                    }}
                    style={{display:'flex',alignItems:'center',gap:7,padding:'7px 14px',borderRadius:5,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.55)',fontSize:13,cursor:'pointer',fontFamily:'Inter'}}>
                    📋 Copier tout
                  </button>
                </div>

                {results.map((r,i) => (
                  <div key={i} className="rp-result-item">
                    <div className="rp-result-user">
                      <div style={{width:20,height:20,borderRadius:'50%',background:'rgba(0,200,150,0.15)',border:'1.5px solid rgba(0,200,150,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <svg width="10" height="10" fill="none" stroke="#00c896" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>
                          {r.user.prenom} {r.user.nom}
                          {r.user.isSelf && <span className="rp-self-badge">Vous</span>}
                        </div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{r.user.email}</div>
                      </div>
                    </div>
                    {r.password && (
                      <>
                        <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>
                          Nouveau mot de passe
                        </div>
                        <div className="rp-result-pass">
                          <span className="rp-pass-val">{r.password}</span>
                          <button className="rp-copy-btn" onClick={()=>copyPass(r.password)}>
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                    {forceChange && (
                      <div style={{fontSize:12,color:'rgba(245,158,11,0.7)',marginTop:8}}>
                        ⚠️ L'utilisateur devra modifier ce mot de passe à la prochaine connexion
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rp-foot">
                <button className="rp-btn rp-btn-blue" onClick={onClose}>Fermer</button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
