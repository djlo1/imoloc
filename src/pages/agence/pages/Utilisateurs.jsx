import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

const ROLES_LABELS = {
  global_admin:'Administrateur global', user_admin:'Admin utilisateurs',
  billing_admin:'Admin facturation', reports_reader:'Admin rapports',
  security_admin:'Admin sécurité', password_admin:'Admin mots de passe',
  agent:'Agent', comptable:'Comptable', lecteur:'Lecteur', invite:'Invité',
}
const ROLES_COLORS = {
  global_admin:'#ef4444', user_admin:'#f59e0b', billing_admin:'#f59e0b',
  reports_reader:'#0078d4', security_admin:'#f59e0b', password_admin:'#0078d4',
  agent:'#0078d4', comptable:'#6c63ff', lecteur:'#6c63ff', invite:'#6c63ff',
}

const getInitials = (p) => {
  const a = (p?.prenom?.[0]||'').toUpperCase()
  const b = (p?.nom?.[0]||'').toUpperCase()
  return a+b || p?.email?.[0]?.toUpperCase() || '?'
}

export default function Utilisateurs() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [agence, setAgence] = useState(null)
  const [actifs, setActifs] = useState([])
  const [invites, setInvites] = useState([])
  const [supprimes, setSupprimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email:'', prenom:'', nom:'', organisation:'', message:'' })
  const [inviting, setInviting] = useState(false)

  const tab = location.pathname.includes('/invites') ? 'invites'
    : location.pathname.includes('/supprimes') ? 'supprimes'
    : location.pathname.includes('/contacts') ? 'contacts'
    : 'actifs'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)

      if (ag?.id) {
        // Utilisateurs actifs = profiles liés à l'agence via agence_users + le propriétaire
        const [{ data:auData }, { data:supData }, { data:invData }] = await Promise.all([
          supabase.from('agence_users').select('*').eq('agence_id', ag.id),
          supabase.from('utilisateurs_supprimes').select('*').eq('agence_id', ag.id).order('date_suppression', { ascending:false }),
          supabase.from('utilisateurs_invites').select('*').eq('agence_id', ag.id).order('date_invitation', { ascending:false }),
        ])

        // Récupérer les profils des membres
        const userIds = [...new Set([ag.profile_id, ...(auData||[]).map(u=>u.user_id).filter(Boolean)])]
        const { data:profilesData } = await supabase.from('profiles').select('*').in('id', userIds)

        // Construire liste actifs
        const actifsList = (profilesData||[]).map(p => ({
          ...p,
          isOwner: p.id === ag.profile_id,
          role: p.id === ag.profile_id ? 'global_admin' : (auData?.find(a=>a.user_id===p.id)?.role || p.role || 'agent'),
          poste: auData?.find(a=>a.user_id===p.id)?.poste || '',
          departement: auData?.find(a=>a.user_id===p.id)?.departement || '',
        }))

        setActifs(actifsList)
        setInvites(invData || [])
        setSupprimes(supData || [])
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Supprimer ${user.prenom} ${user.nom} ? L'utilisateur sera déplacé dans la corbeille.`)) return
    try {
      await supabase.from('utilisateurs_supprimes').insert({
        agence_id: agence.id,
        user_id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        type_compte: user.type_compte || 'organisation',
        donnees_originales: user,
      })
      await supabase.from('agence_users').delete().eq('user_id', user.id).eq('agence_id', agence.id)
      toast.success(`${user.prenom} déplacé dans la corbeille`)
      fetchData()
    } catch(e) { toast.error('Erreur lors de la suppression') }
  }

  const handleRestore = async (sup) => {
    try {
      await supabase.from('utilisateurs_supprimes').delete().eq('id', sup.id)
      if (sup.user_id) {
        await supabase.from('agence_users').insert({
          agence_id: agence.id, user_id: sup.user_id,
          email: sup.email, nom: sup.nom, prenom: sup.prenom, role: sup.role
        })
      }
      toast.success(`${sup.prenom} restauré avec succès`)
      fetchData()
    } catch(e) { toast.error('Erreur lors de la restauration') }
  }

  const handleDeleteDefinitif = async (sup) => {
    if (!confirm(`Supprimer définitivement ${sup.prenom} ${sup.nom} ? Cette action est irréversible.`)) return
    try {
      await supabase.from('utilisateurs_supprimes').delete().eq('id', sup.id)
      toast.success('Supprimé définitivement')
      fetchData()
    } catch(e) { toast.error('Erreur') }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    try {
      await supabase.from('utilisateurs_invites').insert({
        agence_id: agence.id,
        email: inviteForm.email,
        nom: inviteForm.nom,
        prenom: inviteForm.prenom,
        organisation_externe: inviteForm.organisation,
        invite_par: profile?.id,
        statut: 'en_attente',
      })
      toast.success(`Invitation envoyée à ${inviteForm.email}`)
      setInviteForm({ email:'', prenom:'', nom:'', organisation:'', message:'' })
      setShowInvitePanel(false)
      fetchData()
    } catch(e) { toast.error('Erreur lors de l\'invitation') }
    finally { setInviting(false) }
  }

  const filtered = actifs.filter(u => {
    const term = search.toLowerCase()
    return `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(term)
  })

  const toggleSelect = (id) => setSelected(p => p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll = () => setSelected(s => s.length===filtered.length?[]:filtered.map(u=>u.id))

  return (
    <>
      <style>{`
        .us-breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:18px}
        .us-breadcrumb a{color:rgba(255,255,255,0.4);text-decoration:none;cursor:pointer}
        .us-breadcrumb a:hover{color:#4da6ff}
        .us-title{font-size:24px;font-weight:700;color:#e6edf3;margin-bottom:20px;letter-spacing:-0.02em}
        .us-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:24px}
        .us-tab{padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;display:flex;align-items:center;gap:7px}
        .us-tab:hover{color:rgba(255,255,255,0.75)}
        .us-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .us-tab-count{font-size:11px;padding:1px 7px;border-radius:100px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5)}
        .us-tab.active .us-tab-count{background:rgba(0,120,212,0.2);color:#4da6ff}

        /* Toolbar */
        .us-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .us-btn{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap}
        .us-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .us-btn-blue{background:#0078d4;border-color:#0078d4;color:#fff}
        .us-btn-blue:hover{background:#006cc1}
        .us-btn-red{background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444}
        .us-btn-red:hover{background:rgba(239,68,68,0.2)}
        .us-btn:disabled{opacity:0.4;cursor:not-allowed}
        .us-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto}
        .us-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13px;color:#e6edf3;width:220px}
        .us-search input::placeholder{color:rgba(255,255,255,0.25)}

        /* Table */
        .us-table-wrap{border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden}
        .us-table{width:100%;border-collapse:collapse}
        .us-table th{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);white-space:nowrap}
        .us-table td{padding:12px 14px;font-size:13.5px;color:rgba(255,255,255,0.7);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .us-table tr:last-child td{border-bottom:none}
        .us-table tr:hover td{background:rgba(255,255,255,0.02)}
        .us-checkbox{width:16px;height:16px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;margin:0 auto;flex-shrink:0}
        .us-checkbox.checked{background:#0078d4;border-color:#0078d4}
        .us-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
        .us-user-name{font-size:13.5px;font-weight:500;color:#e6edf3;margin-bottom:2px}
        .us-user-email{font-size:12px;color:rgba(255,255,255,0.35)}
        .us-role-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11.5px;font-weight:600}
        .us-owner-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:100px;font-size:10.5px;font-weight:700;background:rgba(0,120,212,0.12);color:#4da6ff;border:1px solid rgba(0,120,212,0.25);margin-left:6px}
        .us-statut-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
        .us-action-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:5px;border-radius:4px;font-size:13px;transition:all 0.1s;font-family:'Inter',sans-serif;display:inline-flex;align-items:center;gap:5px}
        .us-action-btn:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .us-action-btn.red:hover{background:rgba(239,68,68,0.1);color:#ef4444}
        .us-action-btn.green:hover{background:rgba(0,200,150,0.1);color:#00c896}
        .us-empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3)}
        .us-empty-icon{font-size:40px;margin-bottom:14px;opacity:0.4}
        .us-empty-title{font-size:16px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:8px}

        /* Contacts page */
        .us-contacts-wrap{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:40px;text-align:center;max-width:600px;margin:0 auto}

        /* Invite panel */
        .us-panel-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;justify-content:flex-end}
        .us-panel{width:420px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:us-slide 0.2s ease}
        @keyframes us-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .us-panel-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .us-panel-title{font-size:17px;font-weight:700;color:#e6edf3}
        .us-panel-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .us-panel-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .us-panel-body{flex:1;overflow-y:auto;padding:22px}
        .us-panel-desc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.7;margin-bottom:22px}
        .us-field{margin-bottom:16px}
        .us-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.55);margin-bottom:7px}
        .us-lbl span{color:#ef4444;margin-left:2px}
        .us-input{width:100%;padding:10px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .us-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .us-textarea{width:100%;padding:10px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;resize:vertical;min-height:80px}
        .us-textarea:focus{border-color:#0078d4}
        .us-invite-info{padding:12px 14px;border-radius:7px;background:rgba(0,120,212,0.07);border:1px solid rgba(0,120,212,0.2);font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65;margin-bottom:20px}
        .us-panel-foot{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .us-panel-btn{flex:1;padding:10px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .us-panel-btn-blue{background:#0078d4;color:#fff}
        .us-panel-btn-blue:hover:not(:disabled){background:#006cc1}
        .us-panel-btn-blue:disabled{opacity:0.4;cursor:not-allowed}
        .us-panel-btn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .us-panel-btn-ghost:hover{background:rgba(255,255,255,0.09);color:#e6edf3}

        /* Supprimés */
        .us-sup-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all 0.15s}
        .us-sup-card:hover{border-color:rgba(255,255,255,0.12)}
        .us-sup-info{flex:1;min-width:0}
        .us-sup-name{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:3px}
        .us-sup-meta{font-size:12px;color:rgba(255,255,255,0.35)}
        .us-sup-deadline{font-size:11.5px;color:#f59e0b;margin-top:3px}
        .us-sup-actions{display:flex;gap:8px;flex-shrink:0}

        @media(max-width:900px){.us-table{display:block;overflow-x:auto}.us-panel{width:100%}}
      `}</style>

      {/* Breadcrumb */}
      <div className="us-breadcrumb">
        <a onClick={()=>navigate('/agence')}>Accueil</a>
        <span>›</span>
        <span style={{color:'rgba(255,255,255,0.65)'}}>Utilisateurs</span>
      </div>

      <div className="us-title">Utilisateurs</div>

      {/* Tabs */}
      <div className="us-tabs">
        {[
          { id:'actifs', label:'Utilisateurs actifs', path:'/agence/utilisateurs', count:actifs.length },
          { id:'contacts', label:'Contacts', path:'/agence/utilisateurs/contacts', count:null },
          { id:'invites', label:'Utilisateurs invités', path:'/agence/utilisateurs/invites', count:invites.length },
          { id:'supprimes', label:'Utilisateurs supprimés', path:'/agence/utilisateurs/supprimes', count:supprimes.length },
        ].map(t => (
          <button key={t.id} className={`us-tab ${tab===t.id?'active':''}`} onClick={()=>navigate(t.path)}>
            {t.label}
            {t.count !== null && <span className="us-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ══ UTILISATEURS ACTIFS ══ */}
      {tab==='actifs' && (
        <>
          <div className="us-toolbar">
            <button className="us-btn us-btn-blue" onClick={()=>navigate('/agence', {state:{openAddUser:true}})}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Ajouter un utilisateur
            </button>
            <button className="us-btn" disabled={selected.length===0}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              Réinitialiser le mot de passe
            </button>
            <button className="us-btn" disabled={selected.length===0}>Modifier les rôles</button>
            <button className="us-btn us-btn-red" disabled={selected.length===0}>
              Supprimer ({selected.length})
            </button>
            <div className="us-search">
              <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un utilisateur"/>
            </div>
          </div>

          <div className="us-table-wrap">
            <table className="us-table">
              <thead>
                <tr>
                  <th style={{width:44,textAlign:'center'}}>
                    <div className={`us-checkbox ${selected.length===filtered.length&&filtered.length>0?'checked':''}`} onClick={toggleAll}>
                      {selected.length===filtered.length&&filtered.length>0&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    </div>
                  </th>
                  <th>Nom d'affichage</th>
                  <th>Nom d'utilisateur</th>
                  <th>Rôle</th>
                  <th>Département</th>
                  <th>Statut</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.3)'}}>Chargement...</td></tr>
                ) : filtered.length===0 ? (
                  <tr><td colSpan={7}>
                    <div className="us-empty">
                      <div className="us-empty-icon">👥</div>
                      <div className="us-empty-title">Aucun utilisateur trouvé</div>
                      <div>Ajoutez des membres à votre organisation</div>
                    </div>
                  </td></tr>
                ) : filtered.map((u,i)=>{
                  const isSelected = selected.includes(u.id)
                  const color = ROLES_COLORS[u.role] || '#0078d4'
                  return (
                    <tr key={i}>
                      <td style={{textAlign:'center'}}>
                        <div className={`us-checkbox ${isSelected?'checked':''}`} onClick={()=>toggleSelect(u.id)}>
                          {isSelected&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="us-avatar" style={{background:`linear-gradient(135deg,${color},${color}88)`}}>
                            {getInitials(u)}
                          </div>
                          <div>
                            <div className="us-user-name">
                              {u.prenom} {u.nom}
                              {u.isOwner&&<span className="us-owner-badge">👑 Propriétaire</span>}
                            </div>
                            <div className="us-user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>{u.email}</td>
                      <td>
                        <span className="us-role-badge" style={{background:`${color}18`,color}}>
                          {ROLES_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>{u.departement || '—'}</td>
                      <td>
                        <span style={{display:'inline-flex',alignItems:'center',fontSize:13}}>
                          <span className="us-statut-dot" style={{background:u.statut==='actif'||!u.statut?'#00c896':'#f59e0b'}}/>
                          {u.statut==='actif'||!u.statut?'Actif':'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="us-action-btn">✏️ Modifier</button>
                          {!u.isOwner&&(
                            <button className="us-action-btn red" onClick={()=>handleDelete(u)}>🗑️ Supprimer</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:12,fontSize:12.5,color:'rgba(255,255,255,0.3)'}}>
            {filtered.length} utilisateur{filtered.length>1?'s':''} affiché{filtered.length>1?'s':''}
            {selected.length>0&&` · ${selected.length} sélectionné${selected.length>1?'s':''}`}
          </div>
        </>
      )}

      {/* ══ CONTACTS ══ */}
      {tab==='contacts' && (
        <div style={{maxWidth:700}}>
          <div className="us-contacts-wrap">
            <div style={{fontSize:40,marginBottom:16}}>📇</div>
            <div style={{fontSize:18,fontWeight:700,color:'#e6edf3',marginBottom:12}}>Contacts</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.8}}>
              Les contacts sont des personnes externes à votre organisation que vous aimeriez que tout le monde puisse trouver. Toutes les personnes répertoriées ici sont disponibles dans <strong style={{color:'rgba(255,255,255,0.65)'}}>Outlook</strong> sous Personnes dans <strong style={{color:'rgba(255,255,255,0.65)'}}>Microsoft 365</strong>.
            </div>
            <div style={{marginTop:24,padding:'14px 20px',borderRadius:8,background:'rgba(0,120,212,0.08)',border:'1px solid rgba(0,120,212,0.2)',fontSize:13.5,color:'rgba(255,255,255,0.4)'}}>
              Cette fonctionnalité sera disponible prochainement.
            </div>
          </div>
        </div>
      )}

      {/* ══ UTILISATEURS INVITÉS ══ */}
      {tab==='invites' && (
        <>
          <div className="us-toolbar">
            <button className="us-btn us-btn-blue" onClick={()=>setShowInvitePanel(true)}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Inviter un utilisateur externe
            </button>
            <div className="us-search">
              <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
              <input placeholder="Rechercher un invité"/>
            </div>
          </div>

          {/* Info */}
          <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(0,120,212,0.06)',border:'1px solid rgba(0,120,212,0.15)',fontSize:13.5,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:20,display:'flex',gap:10}}>
            <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
            <div>
              Les utilisateurs invités sont des personnes <strong style={{color:'rgba(255,255,255,0.65)'}}>externes</strong> à votre organisation. Ils ont uniquement accès en <strong style={{color:'rgba(255,255,255,0.65)'}}>lecture seule</strong> et ne peuvent pas modifier les données de votre organisation.
            </div>
          </div>

          <div className="us-table-wrap">
            <table className="us-table">
              <thead>
                <tr>
                  <th>Nom / Email</th>
                  <th>Organisation externe</th>
                  <th>Invité par</th>
                  <th>Date d'invitation</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {invites.length===0 ? (
                  <tr><td colSpan={7}>
                    <div className="us-empty">
                      <div className="us-empty-icon">✉️</div>
                      <div className="us-empty-title">Aucun utilisateur invité</div>
                      <div>Invitez des personnes externes à accéder en lecture à votre organisation</div>
                    </div>
                  </td></tr>
                ) : invites.map((inv,i)=>{
                  const expired = new Date(inv.date_expiration) < new Date()
                  const statusColor = inv.statut==='accepte'?'#00c896':expired?'#ef4444':'#f59e0b'
                  const statusLabel = inv.statut==='accepte'?'Accepté':expired?'Expiré':'En attente'
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="us-avatar" style={{background:'rgba(108,99,255,0.2)',color:'#a78bfa',fontSize:11}}>
                            {(inv.prenom?.[0]||'').toUpperCase()}{(inv.nom?.[0]||'').toUpperCase()||inv.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="us-user-name">{inv.prenom} {inv.nom}</div>
                            <div className="us-user-email">{inv.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>{inv.organisation_externe||'—'}</td>
                      <td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>Moi</td>
                      <td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>{new Date(inv.date_invitation).toLocaleDateString('fr-FR')}</td>
                      <td style={{color:expired?'#ef4444':'rgba(255,255,255,0.5)',fontSize:13}}>{new Date(inv.date_expiration).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span style={{display:'inline-flex',alignItems:'center',fontSize:13}}>
                          <span className="us-statut-dot" style={{background:statusColor}}/>
                          <span style={{color:statusColor,fontWeight:500}}>{statusLabel}</span>
                        </span>
                      </td>
                      <td>
                        <button className="us-action-btn red" onClick={async()=>{
                          await supabase.from('utilisateurs_invites').delete().eq('id',inv.id)
                          fetchData()
                          toast.success('Invitation supprimée')
                        }}>🗑️ Supprimer</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ UTILISATEURS SUPPRIMÉS ══ */}
      {tab==='supprimes' && (
        <>
          <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',fontSize:13.5,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:20,display:'flex',gap:10}}>
            <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
            <div>
              Les utilisateurs supprimés sont conservés pendant <strong style={{color:'rgba(255,255,255,0.65)'}}>30 jours</strong> avant suppression définitive automatique. Vous pouvez les restaurer ou les supprimer définitivement à tout moment.
            </div>
          </div>

          {supprimes.length===0 ? (
            <div className="us-empty">
              <div className="us-empty-icon">🗑️</div>
              <div className="us-empty-title">Aucun utilisateur supprimé</div>
              <div>Les utilisateurs supprimés apparaissent ici pendant 30 jours</div>
            </div>
          ) : supprimes.map((sup,i)=>{
            const joursRestants = Math.max(0, Math.ceil((new Date(sup.date_suppression_definitive)-new Date())/(1000*60*60*24)))
            return (
              <div key={i} className="us-sup-card">
                <div className="us-avatar" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444',fontSize:12}}>
                  {(sup.prenom?.[0]||'').toUpperCase()}{(sup.nom?.[0]||'').toUpperCase()||'?'}
                </div>
                <div className="us-sup-info">
                  <div className="us-sup-name">{sup.prenom} {sup.nom}</div>
                  <div className="us-sup-meta">
                    {sup.email} · {ROLES_LABELS[sup.role]||sup.role} · {sup.type_compte}
                  </div>
                  <div className="us-sup-meta" style={{marginTop:2}}>
                    Supprimé le {new Date(sup.date_suppression).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="us-sup-deadline">
                    ⏱️ Suppression définitive dans {joursRestants} jour{joursRestants>1?'s':''}
                  </div>
                </div>
                <div className="us-sup-actions">
                  <button className="us-btn" style={{color:'#00c896',borderColor:'rgba(0,200,150,0.3)',background:'rgba(0,200,150,0.08)'}} onClick={()=>handleRestore(sup)}>
                    ↩️ Restaurer
                  </button>
                  <button className="us-btn us-btn-red" onClick={()=>handleDeleteDefinitif(sup)}>
                    🗑️ Supprimer définitivement
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ══ PANEL INVITER ══ */}
      {showInvitePanel && (
        <div className="us-panel-overlay" onClick={e=>e.target===e.currentTarget&&setShowInvitePanel(false)}>
          <div className="us-panel">
            <div className="us-panel-head">
              <span className="us-panel-title">Inviter un utilisateur externe</span>
              <button className="us-panel-close" onClick={()=>setShowInvitePanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="us-panel-body">
              <div className="us-invite-info">
                Les utilisateurs invités sont externes à votre organisation. Ils auront uniquement un accès en <strong style={{color:'rgba(255,255,255,0.65)'}}>lecture seule</strong>. Ils ne peuvent pas modifier les données de votre organisation.
              </div>
              <form id="invite-form" onSubmit={handleInvite}>
                <div className="us-field">
                  <label className="us-lbl">Adresse email <span>*</span></label>
                  <input className="us-input" type="email" required value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))} placeholder="email@exemple.com"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="us-field">
                    <label className="us-lbl">Prénom</label>
                    <input className="us-input" value={inviteForm.prenom} onChange={e=>setInviteForm(f=>({...f,prenom:e.target.value}))} placeholder="Jean"/>
                  </div>
                  <div className="us-field">
                    <label className="us-lbl">Nom</label>
                    <input className="us-input" value={inviteForm.nom} onChange={e=>setInviteForm(f=>({...f,nom:e.target.value}))} placeholder="Dupont"/>
                  </div>
                </div>
                <div className="us-field">
                  <label className="us-lbl">Organisation externe</label>
                  <input className="us-input" value={inviteForm.organisation} onChange={e=>setInviteForm(f=>({...f,organisation:e.target.value}))} placeholder="Nom de l'entreprise externe"/>
                </div>
                <div className="us-field">
                  <label className="us-lbl">Message personnalisé <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>(optionnel)</span></label>
                  <textarea className="us-textarea" value={inviteForm.message} onChange={e=>setInviteForm(f=>({...f,message:e.target.value}))} placeholder="Message d'invitation..."/>
                </div>
              </form>
            </div>
            <div className="us-panel-foot">
              <button className="us-panel-btn us-panel-btn-ghost" onClick={()=>setShowInvitePanel(false)}>Annuler</button>
              <button className="us-panel-btn us-panel-btn-blue" form="invite-form" type="submit" disabled={inviting}>
                {inviting?'Envoi...':'Envoyer l\'invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
