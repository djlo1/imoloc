import { useState, useEffect } from 'react'
import { Settings, Globe, Wallet, Bell, ListChecks, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

const CHAMP_TYPES = [
  { val:'texte', label:'Texte' },
  { val:'texte_long', label:'Texte long' },
  { val:'nombre', label:'Nombre' },
  { val:'devise', label:'Devise' },
  { val:'pourcentage', label:'Pourcentage' },
  { val:'date', label:'Date' },
  { val:'date_heure', label:'Date + heure' },
  { val:'oui_non', label:'Oui / Non' },
  { val:'liste', label:'Liste' },
  { val:'liste_multiple', label:'Liste multiple' },
]

export default function Parametres() {
  const [notifs, setNotifs] = useState({ retard:true, bail:true, paiement:true, plainte:false })
  const [devise, setDevise] = useState('FCFA')
  const [langue, setLangue] = useState('Français')
  const [penalite, setPenalite] = useState('5')
  const [delai, setDelai] = useState('5')

  // ── Champs personnalises (Point 40) ──
  const [agenceId, setAgenceId] = useState(null)
  const [typesBiens, setTypesBiens] = useState([])
  const [champs, setChamps] = useState([])
  const [showAddChamp, setShowAddChamp] = useState(false)
  const [newChamp, setNewChamp] = useState({ nom:'', type:'texte', type_bien_applicable:'', obligatoire:false, options:'' })

  useEffect(() => {
    const init = async () => {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:ag } = await supabase.from('agences').select('id').eq('profile_id', user.id).single()
      if (!ag?.id) return
      setAgenceId(ag.id)
      const [{ data:tb }, { data:cp }] = await Promise.all([
        supabase.from('types_biens').select('valeur,label').or(`agence_id.is.null,agence_id.eq.${ag.id}`).order('label'),
        supabase.from('champs_personnalises').select('*').eq('agence_id', ag.id).eq('statut','actif').order('ordre'),
      ])
      setTypesBiens(tb||[])
      setChamps(cp||[])
    }
    init()
  }, [])

  const addChamp = async () => {
    if (!newChamp.nom.trim()) { toast.error('Le nom du champ est requis'); return }
    const options = ['liste','liste_multiple'].includes(newChamp.type)
      ? newChamp.options.split(',').map(o=>o.trim()).filter(Boolean)
      : null
    const { data, error } = await supabase.from('champs_personnalises').insert({
      agence_id: agenceId, nom: newChamp.nom.trim(), type: newChamp.type,
      type_bien_applicable: newChamp.type_bien_applicable || null,
      obligatoire: newChamp.obligatoire, options,
      ordre: champs.length,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setChamps(c=>[...c, data])
    setShowAddChamp(false)
    setNewChamp({ nom:'', type:'texte', type_bien_applicable:'', obligatoire:false, options:'' })
    toast.success('Champ personnalise ajoute')
  }

  const archiveChamp = async (id) => {
    if (!confirm('Archiver ce champ personnalise ? Il ne sera plus propose sur les biens, mais les valeurs deja saisies sont conservees.')) return
    setChamps(c=>c.filter(x=>x.id!==id))
    await supabase.from('champs_personnalises').update({ statut:'archive' }).eq('id', id)
  }

  return (
    <>
      <style>{`
        .par-title{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:24px}
        .par-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:16px}
        .par-card-title{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:18px;display:flex;align-items:center;gap:8px}
        .par-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);gap:16px}
        .par-row:last-child{border-bottom:none;padding-bottom:0}
        .par-row-title{font-size:14px;font-weight:500;color:#e6edf3;margin-bottom:3px}
        .par-row-sub{font-size:12.5px;color:rgba(255,255,255,0.35)}
        .par-toggle{width:44px;height:24px;border-radius:100px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0}
        .par-toggle.on{background:#0078d4}
        .par-toggle.off{background:rgba(255,255,255,0.12)}
        .par-toggle::after{content:'';position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;transition:left 0.2s}
        .par-toggle.on::after{left:23px}
        .par-toggle.off::after{left:3px}
        .par-select{padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;outline:none;cursor:pointer;min-width:140px}
        .par-select option{background:#1c2434}
        .par-input{padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;outline:none;width:100px}
        .par-input:focus{border-color:#0078d4}
        .pg-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s;margin-top:8px}
        .pg-btn-blue{background:#0078d4;color:#fff}
        .pg-btn-blue:hover{background:#006cc1}
      `}</style>
      <div className="par-title" style={{display:'flex',alignItems:'center',gap:8}}><Settings size={18}/> Paramètres</div>
      <div className="par-card">
        <div className="par-card-title"><Globe size={16}/> Préférences générales</div>
        <div className="par-row">
          <div><div className="par-row-title">Devise</div><div className="par-row-sub">Devise utilisée pour les montants</div></div>
          <select className="par-select" value={devise} onChange={e=>setDevise(e.target.value)}>
            {['FCFA','EUR','USD','GHS','NGN'].map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="par-row">
          <div><div className="par-row-title">Langue</div><div className="par-row-sub">Langue de l'interface</div></div>
          <select className="par-select" value={langue} onChange={e=>setLangue(e.target.value)}>
            {['Français','English','Português'].map(l=><option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="par-card">
        <div className="par-card-title"><Wallet size={16}/> Règles métier</div>
        <div className="par-row">
          <div><div className="par-row-title">Pénalité de retard</div><div className="par-row-sub">Pourcentage appliqué après le délai de grâce</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input className="par-input" type="number" value={penalite} onChange={e=>setPenalite(e.target.value)} min="0" max="100"/>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>%</span>
          </div>
        </div>
        <div className="par-row">
          <div><div className="par-row-title">Délai de grâce</div><div className="par-row-sub">Jours avant application de la pénalité</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input className="par-input" type="number" value={delai} onChange={e=>setDelai(e.target.value)} min="0" max="30"/>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>jours</span>
          </div>
        </div>
      </div>
      <div className="par-card">
        <div className="par-card-title"><Bell size={16}/> Notifications</div>
        {[
          { key:'retard', title:'Loyers en retard', sub:'Alertes pour les paiements en retard' },
          { key:'bail', title:'Baux expirants', sub:'Rappels 30, 60, 90 jours avant expiration' },
          { key:'paiement', title:'Nouveaux paiements', sub:'Confirmation à chaque paiement reçu' },
          { key:'plainte', title:'Nouvelles plaintes', sub:'Notification quand un locataire soumet une plainte' },
        ].map(n => (
          <div key={n.key} className="par-row">
            <div><div className="par-row-title">{n.title}</div><div className="par-row-sub">{n.sub}</div></div>
            <button className={`par-toggle ${notifs[n.key]?'on':'off'}`} onClick={()=>setNotifs(p=>({...p,[n.key]:!p[n.key]}))}/>
          </div>
        ))}
      </div>
      <div className="par-card">
        <div className="par-card-title" style={{justifyContent:'space-between'}}>
          <span style={{display:'flex',alignItems:'center',gap:8}}><ListChecks size={16}/> Champs personnalises</span>
          <button className="pg-btn pg-btn-blue" style={{margin:0,padding:'7px 14px',fontSize:12.5}} onClick={()=>setShowAddChamp(o=>!o)}><Plus size={13}/> Ajouter un champ</button>
        </div>
        {showAddChamp&&(
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:16,marginBottom:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <div className="par-row-title" style={{marginBottom:6}}>Nom du champ</div>
                <input className="par-input" style={{width:'100%'}} value={newChamp.nom} onChange={e=>setNewChamp(f=>({...f,nom:e.target.value}))} placeholder="Ex: Numero de lot"/>
              </div>
              <div>
                <div className="par-row-title" style={{marginBottom:6}}>Type</div>
                <select className="par-select" style={{width:'100%'}} value={newChamp.type} onChange={e=>setNewChamp(f=>({...f,type:e.target.value}))}>
                  {CHAMP_TYPES.map(t=><option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <div className="par-row-title" style={{marginBottom:6}}>Type de bien concerne</div>
                <select className="par-select" style={{width:'100%'}} value={newChamp.type_bien_applicable} onChange={e=>setNewChamp(f=>({...f,type_bien_applicable:e.target.value}))}>
                  <option value="">Tous les types</option>
                  {typesBiens.map(t=><option key={t.valeur} value={t.valeur}>{t.label}</option>)}
                </select>
              </div>
              <div style={{display:'flex',alignItems:'flex-end'}}>
                <button className={`par-toggle ${newChamp.obligatoire?'on':'off'}`} onClick={()=>setNewChamp(f=>({...f,obligatoire:!f.obligatoire}))}/>
                <span style={{marginLeft:10,fontSize:13.5,color:'#e6edf3'}}>Champ obligatoire</span>
              </div>
              {['liste','liste_multiple'].includes(newChamp.type)&&(
                <div style={{gridColumn:'1/-1'}}>
                  <div className="par-row-title" style={{marginBottom:6}}>Choix possibles (separes par une virgule)</div>
                  <input className="par-input" style={{width:'100%'}} value={newChamp.options} onChange={e=>setNewChamp(f=>({...f,options:e.target.value}))} placeholder="Ex: Bloc A, Bloc B, Bloc C"/>
                </div>
              )}
            </div>
            <button className="pg-btn pg-btn-blue" onClick={addChamp}>Ajouter</button>
          </div>
        )}
        {champs.length===0?(
          <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',fontStyle:'italic',padding:'8px 0'}}>Aucun champ personnalise pour l'instant. Utile pour suivre une information specifique a votre agence, non prevue par defaut.</div>
        ):(
          champs.map(c=>(
            <div key={c.id} className="par-row">
              <div>
                <div className="par-row-title">{c.nom}{c.obligatoire&&<span style={{color:'#ef4444'}}> *</span>}</div>
                <div className="par-row-sub">{CHAMP_TYPES.find(t=>t.val===c.type)?.label||c.type}{c.type_bien_applicable?` · ${typesBiens.find(t=>t.valeur===c.type_bien_applicable)?.label||c.type_bien_applicable}`:' · Tous les types de biens'}</div>
              </div>
              <button onClick={()=>archiveChamp(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',padding:6}}><Trash2 size={15}/></button>
            </div>
          ))
        )}
      </div>
      <button className="pg-btn pg-btn-blue" onClick={()=>toast.success('Paramètres sauvegardés !')}>Sauvegarder les paramètres</button>
    </>
  )
}
